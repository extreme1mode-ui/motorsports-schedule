// 모바일 화면: 즐겨찾기. (일정·시리즈·경기 상세는 UX v2 screens2/)
// AI 티 정리(2026-10-29): 영문 머리말·0 채운 숫자·줄마다 카드·시리즈 색 막대·영어 상태 알약을 걷어 냈다.
// 구성·순서·기능·계측은 그대로다. 공용 계산은 list-parts.jsx.
import { getRaceStartUtc } from './schedule/index.js';
import { StatusPill } from './primitives.jsx';
import { ScreenTitle, SectionHead, Group, DayHead } from './ui.jsx';
import { SeriesDot } from './list-parts.jsx';
import { byStart, raceStatus, seriesRound, groupByViewerDay } from './list-utils.js';
import { useFormat } from './use-format.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { prefetchHandlers } from './photo-prefetch.js';
import { useRecommendationShown } from './use-analytics.js';

const PAD_X = 18;
const SCREEN_TOP = { padding: `64px ${PAD_X}px 12px` };
const onKeyActivate = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

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

