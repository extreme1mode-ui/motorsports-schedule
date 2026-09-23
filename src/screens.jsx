import { useState, useEffect, useRef } from 'react';
import { CATEGORIES, SERIES, getVisibleSessions, getSeriesStats, getRaceStartUtc } from './schedule/index.js';
import { TOKENS, Mono, SeriesTag, AccessBadge, ExternalIcon, StatusPill, EventBadge, getRoundDescriptor, getRoundDisplay } from './primitives.jsx';
import { useFormat } from './use-format.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { SR_ONLY, DETAIL_SCRIM } from './a11y.js';
import { usePop } from './use-motion.js';
import { photo, photoPos } from './home/photos.js';
import { useRecommendationShown } from './use-analytics.js';

// 정렬·그룹핑은 시작 시각(UTC)으로. 시간대와 무관하게 항상 옳다.
const startMs = (r) => { const iso = getRaceStartUtc(r) || r.primaryStartUtc; return iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER; };
const byStart = (a, b) => startMs(a) - startMs(b);
// 시청자 달력 기준 파트 (시작 시각 → 사용자 시간대). 시작 미정이면 primaryStartUtc(주말 시작)로.
const viewerParts = (fmt, r) => fmt.parts(getRaceStartUtc(r) || r.primaryStartUtc);

// 터치 타깃 44px (QA R4). 버튼 상자는 투명 44px, 보이는 상자는 안쪽 span이 그린다.
const CHIP_HIT = { minHeight: 44, minWidth: 44, padding: 0, border: 0, background: 'none', cursor: 'pointer', flex: 'none', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
// 알약이 44px보다 좁은 짧은 라벨(F1)은 버튼이 넓어진 만큼 좌우 음수 마진으로 칩 간격(6px)을 유지한다.
const chipHit = (pillWidth) => (pillWidth < 44 ? { ...CHIP_HIT, margin: `0 ${(pillWidth - 44) / 2}px` } : CHIP_HIT);
const ICON_HIT = { width: 44, height: 44, margin: -4, padding: 0, border: 0, background: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' };

export function Schedule({ theme, races, onOpenRace, now, seasonYear }) {
  const t = TOKENS[theme];
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

  return (
    <div style={{ background: t.bg, minHeight: '100%', paddingBottom: 110 }}>
      <div style={{ padding: '64px 18px 12px' }}>
        <Mono size={10} color={t.text3} style={{ letterSpacing: '0.14em' }}>{safeSeasonYear} SEASON</Mono>
        <div role="heading" aria-level={1} data-view-title tabIndex={-1} style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', marginTop: 4 }}>{tr('schedule.title')}</div>
      </div>

      {/* 칩 행: 버튼은 44px 히트영역, 보이는 알약(33px)은 안쪽 span. 행 높이가 변하지 않게 컨테이너를 위·아래 5.5px씩 당긴다 (QA R4). */}
      <div style={{ display: 'flex', gap: 6, padding: '0 18px 6.5px', marginTop: -5.5, overflowX: 'auto' }}>
        {[{ id: 'ALL', short: 'ALL', accent: t.text }, ...Object.values(CATEGORIES)].map((item) => {
          const active = item.id === category;
          return (
            <button key={item.id} onClick={() => setCategory(item.id)} style={chipHit(item.short.length <= 2 ? 38 : 44)}>
              <span style={{
                display: 'inline-block', padding: '8px 12px', borderRadius: 999,
                border: `1px solid ${active ? (item.id === 'ALL' ? t.text : item.accent) : t.line}`,
                background: active ? (item.id === 'ALL' ? t.text : item.accent) : 'transparent',
                color: active ? (item.id === 'ALL' ? t.bg : '#fff') : t.text2,
                fontSize: 12, fontWeight: 700, lineHeight: 'normal',
              }}>{item.short}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 18px 4.5px', marginTop: -5.5, overflowX: 'auto' }}>
        {Array.from({length:12}, (_, i) => i).map(m => {
          const count = (byMonth[m] || []).length;
          const active = m === month;
          return (
            <button key={m} onClick={() => { if (m !== month) track('schedule_month_changed', { direction: m > month ? 'next' : 'prev' }); setMonth(m); }} style={CHIP_HIT}>
              <span style={{
                padding: '8px 12px', borderRadius: 999, border: `1px solid ${active ? t.text : t.line}`,
                background: active ? t.text : 'transparent', color: active ? t.bg : t.text2,
                fontSize: 12, fontWeight: 600, lineHeight: 'normal',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {fmt.monthNames[m]}
                <Mono size={10} color={active ? (theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)') : t.text3}>
                  {String(count).padStart(2,'0')}
                </Mono>
              </span>
            </button>
          );
        })}
      </div>

      <MonthGrid month={month} races={byMonth[month] || []} theme={theme} onOpen={onOpenRace} now={now} seasonYear={safeSeasonYear} />
    </div>
  );
}

function MonthGrid({ month, races, theme, onOpen, now, seasonYear }) {
  const t = TOKENS[theme];
  const fmt = useFormat();
  const year = seasonYear;
  // 달력 모양은 시간대와 무관한 달력 산술 (UTC로 계산해 로컬 TZ 영향 제거)
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const byDay = {};
  for (const r of races) {
    const d = Number(viewerParts(fmt, r)?.day || 0);
    (byDay[d] = byDay[d] || []).push(r);
  }

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const todayStr = fmt.dateKey(now);

  return (
    <div style={{ padding: '8px 14px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 4px 8px' }}>
        {fmt.weekdayNames.map((d, i) => (
          <Mono key={d} size={10} color={i === 0 ? '#FF6B7A' : (i === 6 ? '#6BA3FF' : t.text3)} style={{ textAlign: 'center', letterSpacing: '0.08em' }}>
            {d}
          </Mono>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ aspectRatio: '1/1.05' }} />;
          const dayRaces = byDay[d] || [];
          const dateKey = `${seasonYear}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isToday = dateKey === todayStr;
          const isSun = i % 7 === 0; const isSat = i % 7 === 6;
          return (
            <div key={i} className={dayRaces.length ? 'press-chip' : undefined} onClick={() => dayRaces.length && onOpen(dayRaces[0])} style={{
              aspectRatio: '1/1.05', borderRadius: 8,
              background: isToday ? t.text : t.surface, border: `1px solid ${t.line}`,
              padding: '5px 5px 4px', display: 'flex', flexDirection: 'column',
              cursor: dayRaces.length ? 'pointer' : 'default', overflow: 'hidden',
            }}>
              <Mono size={11} weight={isToday ? 700 : 500} color={isToday ? t.bg : (isSun ? '#FF6B7A' : isSat ? '#6BA3FF' : t.text)}>
                {d}
              </Mono>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3, flex: 1 }}>
                {dayRaces.slice(0,3).map((r, j) => (
                  <div key={j} style={{ height: 4, borderRadius: 2, background: SERIES[r.series].accent }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
        {[...races].sort(byStart).map(r => (
          <ScheduleRow key={r.id} race={r} theme={theme} onOpen={() => onOpen(r)} />
        ))}
      </div>
    </div>
  );
}

export function ScheduleRow({ race, theme, onOpen }) {
  const t = TOKENS[theme];
  const fmt = useFormat();
  const L = fmt.race(race);
  const start = getRaceStartUtc(race);
  const p = viewerParts(fmt, race);
  const dow = p?.weekdayName || '';
  return (
    <div className="press-row" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }} style={{
      display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center',
      padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 12, cursor: 'pointer', opacity: race.status === 'cancelled' ? 0.55 : 1,
    }}>
      <div style={{ textAlign: 'center', borderRight: `1px solid ${t.line}`, paddingRight: 12 }}>
        <Mono size={18} weight={700} color={t.text} style={{ display: 'block', lineHeight: 1 }}>
          {p?.day || '--'}
        </Mono>
        <Mono size={10} color={t.text3} style={{ display: 'block', marginTop: 3 }}>{dow}</Mono>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <SeriesTag series={race.series} theme={theme} variant="ghost" />
          <Mono size={10} color={t.text3}>{getRoundDisplay(race)}</Mono>
          {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
          {race.isNextRace && <StatusPill status="next" theme={theme} />}
          {race.status === 'live' && <StatusPill status="live" theme={theme} />}
          {race.status === 'cancelled' && <StatusPill status="cancelled" theme={theme} />}
          {race.status === 'completed' && <StatusPill status="completed" theme={theme} />}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.005em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textDecoration: race.status === 'cancelled' ? 'line-through' : 'none' }}>
          {L.shortName}
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{L.circuit} · {L.country}</div>
      </div>
      <Mono size={12} color={t.text2}>{start ? fmt.time(start) : 'TBA'}</Mono>
    </div>
  );
}

export function SeriesView({ theme, races, onOpenRace, initialCategory, seasonYear }) {
  const t = TOKENS[theme];
  const safeSeasonYear = Number.isFinite(seasonYear) ? seasonYear : 2026;
  const [sel, setSel] = useState(initialCategory || 'F1');
  useEffect(() => { if (initialCategory) setSel(initialCategory); }, [initialCategory]);
  const s = CATEGORIES[sel];
  const tr = useT();
  const list = races.filter(r => r.category === sel).sort(byStart);
  const stats = getSeriesStats(list);

  return (
    <div style={{ background: t.bg, minHeight: '100%', paddingBottom: 110 }}>
      <div style={{ padding: '64px 18px 12px' }}>
        <Mono size={10} color={t.text3} style={{ letterSpacing: '0.14em' }}>BY CATEGORY · {safeSeasonYear}</Mono>
        <div role="heading" aria-level={1} data-view-title tabIndex={-1} style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', marginTop: 4 }}>{tr('series.title')}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 18px 8.5px', marginTop: -5.5, overflowX: 'auto' }}>
        {Object.values(CATEGORIES).map(ss => (
          <button key={ss.id} onClick={() => { if (ss.id !== sel) track('series_tab_changed', { category: ss.id }); setSel(ss.id); }} style={chipHit(ss.short.length <= 2 ? 42 : 44)}>
            <span style={{
              display: 'inline-block', padding: '8px 14px', borderRadius: 999,
              border: `1px solid ${sel === ss.id ? ss.accent : t.line}`,
              background: sel === ss.id ? ss.accent : 'transparent',
              color: sel === ss.id ? '#fff' : t.text2,
              fontSize: 12, fontWeight: 700, letterSpacing: '-0.005em', lineHeight: 'normal',
            }}>
              {ss.short}
            </span>
          </button>
        ))}
      </div>

      <div style={{ margin: '0 18px 14px', padding: '18px', borderRadius: 16, background: theme === 'dark' ? s.dark : s.tint, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: 3, right: 0, background: s.accent }} />
        <div style={{ fontSize: 22, fontWeight: 800, color: theme === 'dark' ? '#fff' : '#111', letterSpacing: '-0.02em', marginTop: 8 }}>
          {s.name}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
          <Stat label="ROUNDS" val={String(stats.rounds).padStart(2,'0')} dark={theme === 'dark'} />
          <Stat label="DONE" val={String(stats.done).padStart(2,'0')} dark={theme === 'dark'} />
          <Stat label="UPCOMING" val={String(stats.upcoming).padStart(2,'0')} dark={theme === 'dark'} />
          {stats.cancelled > 0 && <Stat label="CANCELLED" val={String(stats.cancelled).padStart(2,'0')} dark={theme === 'dark'} />}
        </div>
      </div>

      <div style={{ padding: '0 18px', display: 'grid', gap: 8 }}>
        {list.map((r, idx) => <RoundRow key={r.id} race={r} idx={idx} theme={theme} onOpen={() => onOpenRace(r)} />)}
      </div>
    </div>
  );
}

function Stat({ label, val, dark }) {
  return (
    <div>
      <Mono size={9} color={dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} style={{ letterSpacing: '0.14em', display: 'block' }}>{label}</Mono>
      <Mono size={18} weight={700} color={dark ? '#fff' : '#111'} style={{ display: 'block', marginTop: 3 }}>{val}</Mono>
    </div>
  );
}

function RoundRow({ race, idx, theme, onOpen }) {
  const t = TOKENS[theme];
  const fmt = useFormat();
  const L = fmt.race(race);
  const done = race.status === 'completed';
  const cancelled = race.status === 'cancelled';
  const start = getRaceStartUtc(race);
  const p = viewerParts(fmt, race);
  return (
    <div className="press-row" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }} style={{
      display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'center',
      padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`,
      borderRadius: 12, cursor: 'pointer', opacity: cancelled ? 0.45 : 1,
    }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Mono size={9} color={t.text3} style={{ letterSpacing: '0.08em' }}>RND</Mono>
        <Mono size={16} weight={700} color={done ? t.text3 : t.text} style={{ lineHeight: 1, marginTop: 2, textDecoration: cancelled ? 'line-through' : 'none' }}>
          {getRoundDisplay(race, idx + 1)}
        </Mono>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
          {done && <StatusPill status="completed" theme={theme} />}
          {race.status === 'live' && <StatusPill status="live" theme={theme} />}
          {race.isNextRace && <StatusPill status="next" theme={theme} />}
          {cancelled && <StatusPill status="cancelled" theme={theme} />}
          <Mono size={10} color={t.text3}>{p ? `${fmt.monthDay(start || race.primaryStartUtc)} · ${p.weekdayName}` : ''}</Mono>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.005em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {L.shortName}
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{L.circuit}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Mono size={13} weight={600} color={t.text}>{start ? fmt.time(start) : 'TBA'}</Mono>
      </div>
    </div>
  );
}

export function Favorites({ theme, races, myRaces, favorites, onOpenRace, toggleFav }) {
  const t = TOKENS[theme];
  const tr = useT();
  const favList = races.filter(r => favorites.has(r.id)).sort(byStart);
  // 빈 상태 추천: 다가오는 관심 경기 3개 (프로토타입 저장 화면과 같은 규칙)
  const recs = (Array.isArray(myRaces) ? myRaces : races).filter(r => r.status === 'upcoming' || r.status === 'live').slice(0, 3);
  useRecommendationShown(favList.length === 0 ? recs : []);
  return (
    <div style={{ background: t.bg, minHeight: '100%', paddingBottom: 110 }}>
      <div style={{ padding: '64px 18px 20px' }}>
        <Mono size={10} color={t.text3} style={{ letterSpacing: '0.14em' }}>PINNED</Mono>
        <div role="heading" aria-level={1} data-view-title tabIndex={-1} style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', marginTop: 4 }}>{tr('fav.title')}</div>
      </div>
      {favList.length === 0 ? (
        <div style={{ padding: '40px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, margin: '0 auto 16px', background: t.surface2, display: 'grid', placeItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="1.8">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 6 }}>{tr('fav.emptyTitle')}</div>
          <div style={{ fontSize: 13, color: t.text3, lineHeight: 1.5 }}>
            {tr('fav.emptyBody')}
          </div>
          {recs.length > 0 && (
            <div style={{ marginTop: 28, textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 10 }}>{tr('fav.suggest')}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {recs.map((r, i) => <RecommendRow key={r.id} race={r} theme={theme} onOpen={() => { track('recommendation_clicked', { series: r.series, position: i }); onOpenRace(r, 'recommendation'); }} onSave={() => toggleFav(r.id)} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '0 18px', display: 'grid', gap: 8 }}>
          {favList.map(r => <ScheduleRow key={r.id} race={r} theme={theme} onOpen={() => onOpenRace(r)} />)}
        </div>
      )}
    </div>
  );
}

export function RaceDetail({ race, theme, onClose, favorites, toggleFav, preferences, closing = false, onExitEnd }) {
  const t = TOKENS[theme];
  const fmt = useFormat();
  const tr = useT();
  const L = fmt.race(race);
  const s = SERIES[race.series];
  const sessions = getVisibleSessions(race, preferences?.series?.[race.series]);
  const faved = favorites.has(race.id);
  const [notify, setNotify] = useState(false);
  const [favPop, onFavPopEnd] = usePop(faved);   // 저장될 때만 되튐
  // 열리면 포커스를 시트 안 첫 요소(뒤로 버튼)로. 닫힌 뒤 원래 요소로 되돌리는 건 App이 한다.
  const sheetRef = useRef(null);
  useEffect(() => { sheetRef.current?.querySelector('button')?.focus({ preventScroll: true }); }, []);

  return (
    <div ref={sheetRef} className={`detail-sheet${closing ? ' closing' : ''}`} onAnimationEnd={closing ? onExitEnd : undefined} style={{ position: 'absolute', inset: 0, background: t.bg, zIndex: 80, overflow: 'auto', paddingBottom: 40 }}>
      {/* 헤더 배경 = 경기 사진 (홈 .hero2와 같은 층 구성: 사진 → 시리즈 틴트 → 스크림 → 콘텐츠). 높이는 padding이 정한다. */}
      <div style={{ padding: '60px 18px 22px', background: theme === 'dark' ? s.dark : s.tint, position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -3, backgroundImage: `url(${photo(race, 800)})`, backgroundSize: 'cover', backgroundPosition: photoPos(race) }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -2, background: s.accent, opacity: 0.16 }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, background: DETAIL_SCRIM[theme] || DETAIL_SCRIM.dark }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, position: 'relative' }}>
          <button onClick={onClose} aria-label={tr('aria.back')} className="press-icon" style={ICON_HIT}>
            <span style={{ width: 36, height: 36, borderRadius: 999, background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)', display: 'grid', placeItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? '#fff' : '#111'} strokeWidth="2.4" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </span>
          </button>
          <button onClick={() => toggleFav(race.id)} aria-label={tr('aria.save')} className="press-icon" style={ICON_HIT}>
            <span className={favPop} onAnimationEnd={onFavPopEnd} style={{ width: 36, height: 36, borderRadius: 999, background: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)', display: 'grid', placeItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={faved ? s.accent : 'none'} stroke={faved ? s.accent : (theme === 'dark' ? '#fff' : '#111')} strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </span>
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <SeriesTag series={race.series} theme={theme} />
            <Mono size={10} color={theme === 'dark' ? 'rgba(255,255,255,0.6)' : s.dark} style={{ letterSpacing: '0.12em' }}>
              {getRoundDescriptor(race)}
            </Mono>
            {race.specialBadge && <EventBadge label={race.specialBadge} tone={race.specialBadgeTone} theme={theme} />}
            {race.isSprint && <span style={{ padding: '2px 6px', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', borderRadius: 3, background: 'rgba(255,255,255,0.18)', color: '#fff', fontFamily: '"JetBrains Mono", ui-monospace' }}>SPRINT</span>}
            {race.isNextRace && <StatusPill status="next" theme={theme} />}
            {race.status === 'live' && <StatusPill status="live" theme={theme} />}
            {race.status === 'cancelled' && <StatusPill status="cancelled" theme={theme} />}
            {race.status === 'completed' && <StatusPill status="completed" theme={theme} />}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: theme === 'dark' ? '#fff' : '#111', marginBottom: 6 }}>
            {L.name}
          </div>
          <div style={{ fontSize: 13, color: theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)' }}>
            {L.circuit}{L.city ? ` · ${L.city}` : ''} · {L.country}
          </div>
        </div>
      </div>

      {race.cancellationNote && (
        <div style={{ margin: '16px 18px 0', padding: 14, borderRadius: 12, background: 'rgba(255,77,95,0.08)', border: '1px solid rgba(255,77,95,0.25)', fontSize: 12, color: '#FF6B7A', lineHeight: 1.5 }}>
          <Mono size={10} weight={700} style={{ letterSpacing: '0.12em', display: 'block', marginBottom: 4 }}>NOTICE</Mono>
          {race.cancellationNote}
        </div>
      )}

      <section style={{ padding: '24px 18px 0' }}>
        <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.14em' }}>{tr('detail.sessions', { zone: fmt.zoneLabel })}</Mono>
        <div style={{ marginTop: 12, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14, overflow: 'hidden' }}>
          {sessions.map((sess, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 10, alignItems: 'center',
              padding: '14px 16px', borderBottom: i === sessions.length - 1 ? 'none' : `1px solid ${t.line}`,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px 8px', borderRadius: 4,
                background: sess.kind === 'race' ? s.accent : (theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                color: sess.kind === 'race' ? '#fff' : t.text,
                fontSize: 11, fontWeight: 700, letterSpacing: '-0.005em',
              }}>{fmt.sessionLabel(sess)}</div>
              <Mono size={13} color={t.text2}>{sess.startUtc ? fmt.dateTimeKey(sess.startUtc) : tr('detail.timeTba')}</Mono>
              <Mono size={10} color={t.text3} style={{ letterSpacing: '0.02em' }}>{sess.startUtc && sess.local && sess.local !== 'TBA' ? tr('detail.local', { time: sess.local.slice(11, 16) }) : ''}</Mono>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '20px 18px 0' }}>
        <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.14em' }}>WEEKEND</Mono>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <InfoCell label={tr('detail.start')} value={fmt.plainDateFull(race.weekendStart)} theme={theme} />
          <InfoCell label={tr('detail.end')} value={fmt.plainDateFull(race.weekendEnd)} theme={theme} />
          <InfoCell label={tr('detail.localTime')} value={race.localTime || 'TBA'} theme={theme} />
          <InfoCell label="TIMEZONE" value={race.timezone || 'TBA'} theme={theme} />
          {race.durationLabel && <InfoCell label="DURATION" value={race.durationLabel} theme={theme} />}
        </div>
      </section>

      <section style={{ padding: '20px 18px 0' }}>
        <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.14em' }}>{tr('detail.broadcast')}</Mono>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {fmt.broadcast(race.broadcast).map((b, i) => (
            // 실제 링크(<a>): 가운데 클릭·Cmd 클릭·새 탭이 되고 스크린리더가 링크로 읽는다. 시각은 기존 div와 동일.
            <a key={i} className="press-row" href={b.url ?? undefined} target="_blank" rel="noopener noreferrer"
              onClick={() => track('broadcast_clicked', { name: b.name, region: b.region, access: b.access, series: race.series, source: 'detail' })}
              style={{ padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ flex: 'none', width: 28, height: 28, borderRadius: 6, background: s.accent, display: 'grid', placeItems: 'center', color: '#fff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{b.name}</div>
                  <AccessBadge access={b.access} theme={theme} label={b.access ? tr(`detail.access.${b.access}`) : ''} />
                  <ExternalIcon color={t.text3} />
                  <span style={SR_ONLY}>{tr('aria.external')}</span>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.text3} strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
            </a>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: t.text3 }}>{tr('detail.broadcastNote')}</div>
      </section>

      <section style={{ padding: '20px 18px 0' }}>
        <div style={{ padding: '14px 16px', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{tr('detail.alertTitle')}</div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{tr('detail.alertSub')}</div>
          </div>
          <button onClick={() => setNotify(!notify)} role="switch" aria-checked={notify} aria-label={tr('detail.alertTitle')} style={{ width: 46, height: 44, margin: '-8px 0', padding: 0, border: 0, background: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <span style={{ display: 'block', width: 46, height: 28, borderRadius: 999, background: notify ? s.accent : (theme === 'dark' ? '#3A3D45' : '#D8DAE3'), position: 'relative', transition: 'background var(--dur-state) var(--ease-std)' }}>
              {/* 노브는 left 대신 transform으로 이동 (레이아웃 재계산 없음) */}
              <span style={{ position: 'absolute', top: 2, left: 2, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transform: `translateX(${notify ? 18 : 0}px)`, transition: 'transform var(--dur-state) var(--ease-std)' }} />
            </span>
          </button>
        </div>
      </section>

      <section style={{ padding: '24px 18px 0' }}>
        <button style={{ width: '100%', padding: '16px', borderRadius: 14, border: 0, background: s.accent, color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 10px 24px ${s.accent}33` }}>
          {tr('detail.tickets')}
        </button>
      </section>
    </div>
  );
}

// 즐겨찾기 빈 상태 추천 행: 열기 + 바로 저장
function RecommendRow({ race, theme, onOpen, onSave }) {
  const t = TOKENS[theme];
  const fmt = useFormat();
  const tr = useT();
  const L = fmt.race(race);
  const s = SERIES[race.series];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 12 }}>
      <div style={{ width: 3, height: 40, background: s.accent, borderRadius: 2, flex: 'none' }} />
      <button className="press-row" onClick={onOpen} style={{ flex: 1, minWidth: 0, background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <SeriesTag series={race.series} theme={theme} variant="ghost" />
          <Mono size={10} color={t.text3}>{getRoundDisplay(race)}</Mono>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: '-0.005em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{L.shortName}</div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 1 }}>{fmt.monthDay(getRaceStartUtc(race) || race.primaryStartUtc)} · {getRaceStartUtc(race) ? fmt.time(getRaceStartUtc(race)) : 'TBA'}</div>
      </button>
      <button onClick={onSave} style={{ flex: 'none', minHeight: 44, padding: '0 12px', borderRadius: 10, border: `1px solid ${t.line2}`, background: 'transparent', color: t.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tr('fav.save')}</button>
    </div>
  );
}

function InfoCell({ label, value, theme }) {
  const t = TOKENS[theme];
  return (
    <div style={{ padding: '12px 14px', background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10 }}>
      <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em', display: 'block' }}>{label}</Mono>
      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginTop: 4 }}>{value}</div>
    </div>
  );
}
