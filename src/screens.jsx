// 모바일 화면: 일정 · 시리즈 · 즐겨찾기 · 경기 상세.
// AI 티 정리(2026-10-29): 영문 머리말·0 채운 숫자·줄마다 카드·시리즈 색 막대·영어 상태 알약을 걷어 냈다.
// 구성·순서·기능·계측은 그대로다. 공용 계산은 list-parts.jsx, 상세 본문은 detail-parts.jsx.
import { useState, useEffect, useMemo, useRef } from 'react';
import { CATEGORIES, getVisibleSessions, getSeriesStats, getRaceStartUtc, buildRaceWeekBars } from './schedule/index.js';
import { StatusPill } from './primitives.jsx';
import { ScreenTitle, SectionHead, Group, DayHead, Chip } from './ui.jsx';
import { SeriesDot, SeriesSummary, MonthTabs } from './list-parts.jsx';
import { byStart, viewerParts, catLabel, raceStatus, seriesRound, groupByViewerDay, getRoundDisplay } from './list-utils.js';
import { DetailTagLine, DetailNotice, DetailSessions, DetailWeekend, DetailBroadcast, DetailAlarm, DetailLinks } from './detail-parts.jsx';
import { placeLine, canAddAlarm, hasDetailLinks } from './detail-utils.js';
import { useFormat } from './use-format.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { PHOTO_SCRIM } from './a11y.js';
import { usePop, useImageLoaded } from './use-motion.js';
import { photo, photoPos } from './home/photos.js';
import { prefetchHandlers, useVisiblePrefetch } from './photo-prefetch.js';
import { PhotoCredit } from './photo-credit.jsx';
import { raceShareUrl, racePathId } from './share-link.js';
import { useRecommendationShown } from './use-analytics.js';
import { CircuitMapSection } from './circuit-map/CircuitMap.jsx';
import { IS_TOSS, shareRace } from './platform.js';
import { RaceResultSection, PodiumLine, SubTabs, StandingsList } from './results/ResultsUI.jsx';

const ICON_HIT = { width: 44, height: 44, margin: -4, padding: 0, border: 0, background: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' };
const PAD_X = 18;
// 토스는 내비게이션 바가 위를 맡아 화면 제목을 20px만 내린다.
const SCREEN_TOP = { padding: `${IS_TOSS ? 20 : 64}px ${PAD_X}px 12px` };
const CHIP_ROW = { display: 'flex', gap: 8, padding: `6px ${PAD_X}px`, overflowX: 'auto', scrollbarWidth: 'none' };
const onKeyActivate = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

export function Schedule({ races, onOpenRace, now, seasonYear }) {
  const fmt = useFormat();
  const tr = useT();
  const safeSeasonYear = Number.isFinite(seasonYear) ? seasonYear : 2026;
  const [month, setMonth] = useState(() => Math.max(Number(fmt.parts(now)?.month || 1) - 1, 0));
  const [category, setCategory] = useState('ALL');
  const filtered = category === 'ALL' ? races : races.filter((race) => race.category === category);

  const byMonth = {};
  for (const r of filtered) {
    const m = Number(viewerParts(fmt, r)?.month || 1) - 1;
    (byMonth[m] = byMonth[m] || []).push(r);
  }
  const monthRaces = byMonth[month] || [];
  // 제목 아래 한 줄: '10월 8경기 · 대한민국 시간 기준' (월 칩 개수·영문 머리말 대신)
  const sub = `${tr('schedule.monthCount', { month: fmt.monthNames[month], n: monthRaces.length })} · ${tr('schedule.zoneNote', { zone: fmt.zoneLabel })}`;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 110 }}>
      <ScreenTitle title={tr('schedule.title')} sub={sub} style={SCREEN_TOP} />

      <div style={CHIP_ROW}>
        {[{ id: 'ALL', short: 'ALL' }, ...Object.values(CATEGORIES)].map((item) => (
          <Chip key={item.id} on={item.id === category} onClick={() => setCategory(item.id)}>{catLabel(tr, item)}</Chip>
        ))}
      </div>

      <MonthTabs names={fmt.monthNames} value={month} style={{ padding: `2px ${PAD_X - 8}px 0` }}
        onChange={(m) => { if (m !== month) track('schedule_month_changed', { direction: m > month ? 'next' : 'prev' }); setMonth(m); }} />

      <MonthGrid month={month} races={monthRaces} onOpen={onOpenRace} now={now} seasonYear={safeSeasonYear} />
    </div>
  );
}

// 달력: 날짜 칸마다 테두리 상자를 그리지 않는다. 그릇 하나 안에 날짜 숫자(오늘만 채운 원)와 그날 경기 점(최대 4개, 취소는 빈 점).
function MonthGrid({ month, races, onOpen, now, seasonYear }) {
  const fmt = useFormat();
  const tr = useT();
  const year = seasonYear;
  // 화면에 보이는 앞쪽 3개만 낮은 우선순위로 미리 받아둔다 (전부 받으면 모바일에서 낭비가 크다).
  const listRef = useRef(null);
  const monthList = useMemo(() => [...races].sort(byStart), [races]);
  useVisiblePrefetch(listRef, monthList);
  // 달력 모양은 시간대와 무관한 달력 산술 (UTC로 계산해 로컬 TZ 영향 제거)
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // 경기 주말이 걸친 날짜. 세션 시각을 시청자 시간대로 옮겨 만든다 (서킷 현지 주말 날짜가 아니다).
  const { weeks } = buildRaceWeekBars(races, { parts: fmt.parts, year, month, firstDow, daysInMonth, maxLanes: 3 });

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weekRows = [];
  for (let i = 0; i < cells.length; i += 7) weekRows.push(cells.slice(i, i + 7));
  const todayStr = fmt.dateKey(now);
  const groups = groupByViewerDay(fmt, tr, monthList);
  let rowIndex = 0;

  return (
    <div style={{ padding: `8px ${PAD_X}px 0` }}>
      <Group style={{ padding: '10px 6px 6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', paddingBottom: 4 }}>
          {fmt.weekdayNames.map((d, i) => (
            <span key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 500, lineHeight: '20px', color: i === 0 ? 'var(--cal-sun)' : (i === 6 ? 'var(--cal-sat)' : 'var(--text3)') }}>{d}</span>
          ))}
        </div>
        {weekRows.map((row, w) => {
          const byDay = weeks[w]?.byDay || {};
          return (
            <div key={w} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {row.map((d, i) => {
                if (!d) return <div key={i} style={{ height: 46 }} />;
                const dayRaces = byDay[d] || [];
                const dateKey = `${seasonYear}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isToday = dateKey === todayStr;
                const color = isToday ? 'var(--bg)' : (i === 0 ? 'var(--cal-sun)' : i === 6 ? 'var(--cal-sat)' : 'var(--text)');
                return (
                  <div key={i} className={dayRaces.length ? 'press-chip' : undefined} {...(dayRaces.length ? prefetchHandlers(dayRaces[0]) : null)}
                    onClick={() => dayRaces.length && onOpen(dayRaces[0])}
                    style={{ height: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: dayRaces.length ? 'pointer' : 'default' }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
                      background: isToday ? 'var(--text)' : 'transparent', color,
                      fontSize: 15, fontWeight: isToday ? 700 : 500, fontVariantNumeric: 'tabular-nums',
                    }}>{d}</span>
                    {/* 그날 경기 점 최대 4개. 넘치면 점 3개 + '+N'(예전 막대의 '+N'과 같은 뜻). */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, height: 6 }}>
                      {dayRaces.slice(0, dayRaces.length > 4 ? 3 : 4).map((r) => <SeriesDot key={r.id} series={r.series} size={5} hollow={r.status === 'cancelled'} />)}
                      {dayRaces.length > 4 && <span style={{ fontSize: 12, lineHeight: '6px', fontWeight: 500, color: isToday ? 'var(--text2)' : 'var(--text3)' }}>+{dayRaces.length - 3}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </Group>

      {/* 날짜마다 그릇 하나. 줄 사이 구분선은 경기 이름 시작점(16 + 점 8 + 간격 12 = 36)부터. */}
      <div ref={listRef} style={{ marginTop: 4 }}>
        {groups.map((g) => (
          <section key={g.key}>
            <DayHead>{g.label}</DayHead>
            <Group inset={36}>
              {g.races.map((r) => { const idx = rowIndex++; return <ScheduleRow key={r.id} race={r} idx={idx} onOpen={() => onOpen(r)} />; })}
            </Group>
          </section>
        ))}
      </div>
    </div>
  );
}

// 일정 줄: ● 경기 이름 / 'F1 R19 · 서킷, 나라'  ……  시각 + 상태 글자.
// 예정 = 시각만, 종료 = 시각 아래 '종료' + 줄 흐림, 취소 = 취소선 + '취소', 시각 미정 = '미정'.
export function ScheduleRow({ race, idx, onOpen }) {
  const fmt = useFormat();
  const L = fmt.race(race);
  const start = getRaceStartUtc(race);
  const status = raceStatus(race);
  const cancelled = status === 'cancelled';
  const dim = cancelled || status === 'completed';
  const meta = [[seriesRound(race), race.specialBadge].filter(Boolean).join(' '), [L.circuit, L.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  return (
    <div className={`g-row g-tap press-row${dim ? ' g-dim' : ''}`} role="button" tabIndex={0} data-prefetch-index={idx} {...prefetchHandlers(race)}
      onClick={onOpen} onKeyDown={onKeyActivate(onOpen)} style={{ minHeight: 64 }}>
      <SeriesDot series={race.series} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block', fontSize: 17, lineHeight: 1.35, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: cancelled ? 'line-through' : 'none',
        }}>{L.shortName}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 13, lineHeight: 1.4, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</span>
      </span>
      <RowSide start={start} status={status} />
    </div>
  );
}

// 줄 오른쪽: 시각(17/600) + 그 아래 상태 글자(12). 취소는 시각 자리에 '미정', 그 아래 '취소'.
export function RowSide({ start, status, size = 17 }) {
  const fmt = useFormat();
  const tr = useT();
  const cancelled = status === 'cancelled';
  const known = start && !cancelled;
  return (
    <span style={{ flex: 'none', textAlign: 'right', display: 'grid', justifyItems: 'end', gap: 2 }}>
      <span style={{ fontSize: size, lineHeight: 1.35, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: known ? 'var(--text)' : 'var(--text2)' }}>
        {known ? fmt.time(start) : tr('time.tba')}
      </span>
      {status && <StatusPill status={status} />}
    </span>
  );
}

export function SeriesView({ races, onOpenRace, initialCategory, seasonYear }) {
  const tr = useT();
  const safeSeasonYear = Number.isFinite(seasonYear) ? seasonYear : 2026;
  const [sel, setSel] = useState(initialCategory || 'F1');
  useEffect(() => { if (initialCategory) setSel(initialCategory); }, [initialCategory]);
  const s = CATEGORIES[sel];
  const list = useMemo(() => races.filter(r => r.category === sel).sort(byStart), [races, sel]);
  const stats = getSeriesStats(list);
  // F1만: 라운드 | 드라이버 순위. 기본은 지금처럼 라운드 목록.
  const [view, setView] = useState('rounds');
  const showDrivers = sel === 'F1' && view === 'drivers';
  const onView = (v) => { if (v !== view) track('series_view_changed', { category: sel, view: v }); setView(v); };
  const roundsRef = useRef(null);
  useVisiblePrefetch(roundsRef, list);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 110 }}>
      <ScreenTitle title={tr('series.title')} sub={tr('series.subtitle', { n: Object.keys(CATEGORIES).length })} style={SCREEN_TOP} />

      <div style={CHIP_ROW}>
        {Object.values(CATEGORIES).map(ss => (
          <Chip key={ss.id} on={sel === ss.id} onClick={() => { if (ss.id !== sel) track('series_tab_changed', { category: ss.id }); setSel(ss.id); }}>{catLabel(tr, ss)}</Chip>
        ))}
      </div>

      <SeriesSummary cat={s} stats={stats} year={safeSeasonYear} style={{ padding: `20px ${PAD_X + 2}px 0` }} />

      {sel === 'F1' && (
        <div style={{ padding: `20px ${PAD_X}px 0` }}>
          <SubTabs size={17} value={view} onChange={onView}
            items={[{ id: 'rounds', label: tr('series.view.rounds') }, { id: 'drivers', label: tr('series.view.drivers') }]} />
        </div>
      )}

      <div style={{ padding: `16px ${PAD_X}px 0` }}>
        {showDrivers ? <StandingsList races={list} /> : (
          // 구분선은 경기 이름 시작점(16 + 라운드 칸 30 + 간격 12 = 58)부터.
          <div ref={roundsRef}>
            <Group inset={58}>
              {list.map((r, idx) => <RoundRow key={r.id} race={r} idx={idx} onOpen={() => onOpenRace(r)} />)}
            </Group>
          </div>
        )}
      </div>
    </div>
  );
}

// 라운드 줄: 'R19' | 경기 이름 / '10.03 (토) · 서킷' (+ 끝난 경기는 포디움 한 줄) …… 시각 + 상태.
// 'R9-10' 같은 묶음 라벨은 칸(30)보다 길어 이름 쪽으로 넘치지 않게 글자 폭만큼 칸이 늘어난다(flex: none + 최소 30).
function RoundRow({ race, idx, onOpen }) {
  const fmt = useFormat();
  const L = fmt.race(race);
  const status = raceStatus(race);
  const cancelled = status === 'cancelled';
  const done = status === 'completed';
  const start = getRaceStartUtc(race);
  const date = fmt.shortDate(start || race.primaryStartUtc);
  return (
    <div className={`g-row g-tap press-row${done || cancelled ? ' g-dim' : ''}`} role="button" tabIndex={0} data-prefetch-index={idx} {...prefetchHandlers(race)}
      onClick={onOpen} onKeyDown={onKeyActivate(onOpen)} style={{ minHeight: 64, alignItems: 'flex-start' }}>
      <span style={{ minWidth: 30, flex: 'none', marginTop: 2, fontSize: 13, lineHeight: '20px', fontWeight: 600, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {getRoundDisplay(race, idx + 1)}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block', fontSize: 17, lineHeight: 1.35, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: cancelled ? 'line-through' : 'none',
        }}>{L.shortName}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 13, lineHeight: 1.4, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[date, L.circuit].filter(Boolean).join(' · ')}
        </span>
        {done && <PodiumLine race={race} />}
      </span>
      <RowSide start={start} status={status} />
    </div>
  );
}

export function Favorites({ races, myRaces, favorites, onOpenRace, toggleFav }) {
  const fmt = useFormat();
  const tr = useT();
  const favList = races.filter(r => favorites.has(r.id)).sort(byStart);
  // 빈 상태 추천: 다가오는 관심 경기 3개 (프로토타입 저장 화면과 같은 규칙)
  const recs = (Array.isArray(myRaces) ? myRaces : races).filter(r => r.status === 'upcoming' || r.status === 'live').slice(0, 3);
  useRecommendationShown(favList.length === 0 ? recs : []);
  let rowIndex = 0;
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 110 }}>
      <ScreenTitle title={tr('fav.title')} style={{ ...SCREEN_TOP, paddingBottom: 8 }} />
      {favList.length === 0 ? (
        <div style={{ padding: `32px ${PAD_X}px` }}>
          <div style={{ textAlign: 'center', padding: '0 22px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, margin: '0 auto 16px', background: 'var(--surface2)', display: 'grid', placeItems: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{tr('fav.emptyTitle')}</div>
            <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.5 }}>{tr('fav.emptyBody')}</div>
          </div>
          {recs.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <SectionHead title={tr('fav.suggest')} size={17} />
              <Group inset={36}>
                {recs.map((r, i) => <RecommendRow key={r.id} race={r} onOpen={() => { track('recommendation_clicked', { series: r.series, position: i }); onOpenRace(r, 'recommendation'); }} onSave={() => toggleFav(r.id)} />)}
              </Group>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: `0 ${PAD_X}px` }}>
          {groupByViewerDay(fmt, tr, favList).map((g) => (
            <section key={g.key}>
              <DayHead>{g.label}</DayHead>
              <Group inset={36}>
                {g.races.map((r) => { const idx = rowIndex++; return <ScheduleRow key={r.id} race={r} idx={idx} onOpen={() => onOpenRace(r)} />; })}
              </Group>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function RaceDetail({ race, onClose, favorites, toggleFav, preferences, closing = false, onExitEnd }) {
  const fmt = useFormat();
  const tr = useT();
  const L = fmt.race(race);
  const sessions = getVisibleSessions(race, preferences?.series?.[race.series]);
  const faved = favorites.has(race.id);
  const [favPop, onFavPopEnd] = usePop(faved);   // 저장될 때만 되튐
  // 공유: navigator.share가 있으면 시트, 없으면 클립보드 복사 후 '링크를 복사했어요'를 2초.
  // 클립보드까지 막혔으면(권한 거부·비보안 컨텍스트) 조용히 끝내지 않고 주소를 띄워 직접 복사하게 한다.
  const [shareHint, setShareHint] = useState(null);   // { kind: 'copied' } | { kind: 'url', url }
  const onShare = async () => {
    // 토스: 토스 공유 링크 + 공유 시트(platform.shareRace). 토스 밖(일반 브라우저의 dev:toss)에서는 아래 웹 흐름.
    if (IS_TOSS && await shareRace({ id: racePathId(race), title: fmt.race(race).name })) {
      track('race_shared', { series: race.series, method: 'toss' });
      return;
    }
    const url = raceShareUrl(race);
    if (!url) return;
    const title = fmt.race(race).name;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        track('race_shared', { series: race.series, method: 'native' });
      } catch { /* 사용자가 취소했거나 공유가 막혔다 — 아무것도 하지 않는다 */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      track('race_shared', { series: race.series, method: 'copy' });
      setShareHint({ kind: 'copied' });
      setTimeout(() => setShareHint(null), 2000);
    } catch {
      setShareHint({ kind: 'url', url });
      setTimeout(() => setShareHint(null), 5000);
    }
  };
  // 열리면 포커스를 시트 안 첫 요소(뒤로 버튼, 토스는 저장 버튼)로. 닫힌 뒤 원래 요소로 되돌리는 건 App이 한다.
  const headerPhoto = photo(race, 'card');
  const headerLoaded = useImageLoaded(headerPhoto);
  const sheetRef = useRef(null);
  useEffect(() => { sheetRef.current?.querySelector('button')?.focus({ preventScroll: true }); }, []);
  const section = { padding: `28px ${PAD_X}px 0` };

  return (
    <div ref={sheetRef} className={`detail-sheet${closing ? ' closing' : ''}`} onAnimationEnd={closing ? onExitEnd : undefined} style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 80, overflow: 'auto', paddingBottom: 40 }}>
      {/* 헤더 배경 = 경기 사진 (사진 → 중립 스크림 → 콘텐츠). 높이는 padding이 정한다.
          사진이 뜨기 전 바탕은 시리즈 색이 아니라 중립 surface2 — 로딩 순간에 색이 번쩍이지 않게. */}
      <div style={{ padding: `${IS_TOSS ? 16 : 60}px ${PAD_X}px 26px`, background: 'var(--surface2)', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        {/* 사진은 <img>로 둔다. CSS 배경은 스타일 적용 뒤에야 발견돼 우선순위를 줄 수 없다. */}
        <img
          src={headerPhoto} alt="" aria-hidden="true" fetchPriority="high" decoding="async"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -3,
            objectFit: 'cover', objectPosition: photoPos(race),
            opacity: headerLoaded ? 1 : 0, transition: 'opacity var(--dur-move) var(--ease-out)',
          }}
        />
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, background: PHOTO_SCRIM }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'relative' }}>
          {/* 토스는 내비게이션 바의 뒤로가기를 쓴다. 빈 자리를 남겨 오른쪽 버튼 위치는 그대로 둔다. */}
          {IS_TOSS ? <span aria-hidden /> : <button onClick={onClose} aria-label={tr('aria.back')} className="press-icon" style={ICON_HIT}>
            <span style={PHOTO_BTN}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            </span>
          </button>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
            <button onClick={() => toggleFav(race.id)} aria-label={tr('aria.save')} aria-pressed={faved} className="press-icon" style={ICON_HIT}>
              <span className={favPop} onAnimationEnd={onFavPopEnd} style={PHOTO_BTN}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill={faved ? '#fff' : 'none'} stroke="#fff" strokeWidth="2" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </span>
            </button>
            <button onClick={onShare} aria-label={tr('aria.share')} className="press-icon" style={ICON_HIT}>
              <span style={PHOTO_BTN}><ShareIcon /></span>
            </button>
            {shareHint && (
              <span role="status" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                maxWidth: 260, padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.72)',
                color: '#fff', fontSize: 12, fontWeight: 600,
                ...(shareHint.kind === 'url'
                  ? { userSelect: 'all', wordBreak: 'break-all', fontWeight: 500, lineHeight: 1.4 }
                  : { whiteSpace: 'nowrap' }),
              }}>{shareHint.kind === 'url' ? shareHint.url : tr('detail.linkCopied')}</span>
            )}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <DetailTagLine race={race} />
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, color: '#fff', marginBottom: 6 }}>{L.name}</div>
          <div style={{ fontSize: 15, lineHeight: 1.45, color: 'rgba(255,255,255,0.80)' }}>{placeLine(L)}</div>
        </div>
        <PhotoCredit race={race} inset={10} />
      </div>

      {race.cancellationNote && <section style={{ padding: `16px ${PAD_X}px 0` }}><DetailNotice race={race} /></section>}

      {/* 결과 — 결과 데이터가 있는 F1 경기만 (results/ResultsUI.jsx) */}
      <RaceResultSection race={race} />

      {sessions.length > 0 && <section style={section}><DetailSessions sessions={sessions} /></section>}

      {/* 현장 — 서킷 맵이 있는 경기만 (CircuitMap.jsx hasMap). 토스 빌드는 지도를 쓰지 않는다. */}
      {!IS_TOSS && <CircuitMapSection race={race} />}

      <section style={section}><DetailWeekend race={race} /></section>
      <section style={section}><DetailBroadcast race={race} /></section>
      {canAddAlarm(race) && !IS_TOSS && <section style={{ ...section, paddingTop: 20 }}><DetailAlarm race={race} preferences={preferences} /></section>}
      {hasDetailLinks(race) && <section style={section}><DetailLinks race={race} /></section>}
    </div>
  );
}

// 사진 위 아이콘 버튼: 면 40 · 아이콘 24 (앱인토스 UX 가이드의 아이콘 24–40px)
const PHOTO_BTN = { width: 40, height: 40, borderRadius: 999, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center' };

// 즐겨찾기 빈 상태 추천 줄: 열기 + 바로 저장. 시리즈 색 막대 대신 점.
function RecommendRow({ race, onOpen, onSave }) {
  const fmt = useFormat();
  const tr = useT();
  const L = fmt.race(race);
  const start = getRaceStartUtc(race);
  return (
    <div className="g-row">
      <SeriesDot series={race.series} />
      <button className="press-row" onClick={onOpen} style={{ flex: 1, minWidth: 0, background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>
        <span style={{ display: 'block', fontSize: 17, lineHeight: 1.35, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{L.shortName}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'var(--text2)' }}>
          {[seriesRound(race), start ? fmt.shortDateTime(start) : `${fmt.shortDate(race.primaryStartUtc)} ${tr('time.tba')}`].join(' · ')}
        </span>
      </button>
      <button type="button" onClick={onSave} style={{ flex: 'none', minHeight: 44, padding: 0, border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ display: 'inline-grid', placeItems: 'center', height: 34, padding: '0 14px', borderRadius: 10, background: 'var(--fill)', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{tr('fav.save')}</span>
      </button>
    </div>
  );
}

// 공유 아이콘. 하트 버튼과 같은 크기 안에 들어간다.
function ShareIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v13M12 3l-4 4M12 3l4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
