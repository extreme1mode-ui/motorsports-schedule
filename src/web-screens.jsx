// 데스크톱 화면: 일정 · 시리즈 · 즐겨찾기 · 경기 상세 드로어.
// AI 티 정리(2026-10-29): 영문 머리말(CALENDAR · ROUND LIST · PINNED RACES …), 0 채운 숫자, 줄마다 카드, 시리즈 색 막대·면·빛,
// 라벨-값 칸 격자를 걷어 냈다. 구성·순서·기능·계측은 그대로. 공용 계산은 list-parts.jsx. (경기 상세 서랍은 UX v2 screens2/Detail.jsx)
import { useMemo, useRef } from 'react';
import { getRaceStartUtc } from './schedule/index.js';
import { SeriesTag } from './primitives.jsx';
import { ScreenTitle, SectionHead, Group } from './ui.jsx';
import { SeriesDot } from './list-parts.jsx';
import { byStart, viewerParts, raceStatus, seriesRound, getRoundDisplay } from './list-utils.js';
import { useFormat } from './use-format.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { prefetchHandlers, useVisiblePrefetch } from './photo-prefetch.js';
import { useRecommendationShown } from './use-analytics.js';

const onKeyActivate = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

export function WebFavorites({ races, myRaces, favorites, onOpenRace, toggleFav, tier }) {
  const tr = useT();
  const favList = useMemo(() => races.filter(r => favorites.has(r.id)).sort(byStart), [races, favorites]);
  const favRef = useRef(null);
  useVisiblePrefetch(favRef, favList);
  // 빈 상태 추천: 다가오는 관심 경기 3개 (프로토타입 저장 화면과 같은 규칙)
  const recs = (Array.isArray(myRaces) ? myRaces : races).filter(r => r.status === 'upcoming' || r.status === 'live').slice(0, 3);
  useRecommendationShown(favList.length === 0 ? recs : []);
  const cols = tier === 'ultra' ? 3 : 2;

  return (
    <div>
      <ScreenTitle title={tr('fav.title')}
        sub={`${tr('fav.subtitle', { n: favList.length })}${favList.length > 0 ? tr('fav.sortNote') : ''}`} style={{ marginBottom: 24 }} />

      {favList.length === 0 ? (
        <Group style={{ padding: '64px 40px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 999, margin: '0 auto 18px', background: 'var(--surface2)', display: 'grid', placeItems: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{tr('fav.emptyTitle')}</div>
          <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>{tr('fav.emptyBody')}</div>
          {recs.length > 0 && (
            <div style={{ marginTop: 32, textAlign: 'left', maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
              <SectionHead title={tr('fav.suggest')} size={17} />
              <div className="g-group" style={{ background: 'var(--surface2)', '--g-inset': '36px' }}>
                {recs.map((r, i) => <WebRecommendRow key={r.id} race={r} onOpen={() => { track('recommendation_clicked', { series: r.series, position: i }); onOpenRace(r, 'recommendation'); }} onSave={() => toggleFav(r.id)} />)}
              </div>
            </div>
          )}
        </Group>
      ) : (
        <div ref={favRef} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
          {favList.map((r, i) => <FavCard key={r.id} race={r} idx={i} onOpen={() => onOpenRace(r)} toggleFav={toggleFav} />)}
        </div>
      )}
    </div>
  );
}

// 즐겨찾기 빈 상태 추천 줄: 열기 + 바로 저장. 색 막대 대신 시리즈 점.
function WebRecommendRow({ race, onOpen, onSave }) {
  const fmt = useFormat();
  const tr = useT();
  const L = fmt.race(race);
  const start = getRaceStartUtc(race);
  return (
    <div className="g-row">
      <SeriesDot series={race.series} />
      <button className="press-row" onClick={onOpen} style={{ flex: 1, minWidth: 0, background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>
        <span style={{ display: 'block', fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{L.shortName}</span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{[seriesRound(race), L.circuit].filter(Boolean).join(' · ')}</span>
      </button>
      <span style={{ textAlign: 'right', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--text2)' }}>{fmt.shortDate(start || race.primaryStartUtc)}</span>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: start ? 'var(--text)' : 'var(--text3)', marginTop: 2 }}>{start ? fmt.time(start) : tr('time.tba')}</span>
      </span>
      <button type="button" onClick={onSave} style={{ flex: 'none', minHeight: 44, padding: 0, border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ display: 'inline-grid', placeItems: 'center', height: 36, padding: '0 16px', borderRadius: 10, background: 'var(--fill)', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{tr('fav.save')}</span>
      </button>
    </div>
  );
}

// 즐겨찾기 카드. 위쪽 색 띠·RACE DAY/LIGHTS OUT 머리말·안쪽 구분선 없음. 날짜·시각은 사람이 읽는 순서로 한 줄.
// (입장권 시안 fav-ticket이 확정되면 이 카드를 대신한다 — K1.)
function FavCard({ race, idx, onOpen, toggleFav }) {
  const fmt = useFormat();
  const tr = useT();
  const L = fmt.race(race);
  const start = getRaceStartUtc(race);
  const status = raceStatus(race);
  const cancelled = status === 'cancelled';
  const v = start || race.primaryStartUtc;
  const p = viewerParts(fmt, race);
  return (
    <div className="press-row" role="button" tabIndex={0} data-prefetch-index={idx} {...prefetchHandlers(race)}
      onClick={onOpen} onKeyDown={onKeyActivate(onOpen)} style={{
        padding: '16px 18px 18px', borderRadius: 'var(--r-card)', cursor: 'pointer', background: 'var(--surface)', position: 'relative',
        opacity: cancelled || status === 'completed' ? 'var(--dim)' : 1,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 32 }}>
        <SeriesTag series={race.series} round={getRoundDisplay(race)} />
        {status && status !== 'cancelled' && status !== 'completed' && <RowStatus status={status} />}
        <button onClick={e => { e.stopPropagation(); toggleFav(race.id); }} aria-label={tr('aria.save')} aria-pressed className="press-icon" style={{
          width: 44, height: 44, margin: '-6px -12px -6px auto', background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--text)', display: 'grid', placeItems: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.3, textDecoration: cancelled ? 'line-through' : 'none' }}>{L.name}</div>
      <div style={{ marginTop: 2, fontSize: 13, color: 'var(--text2)' }}>{[L.circuit, L.country].filter(Boolean).join(', ')}</div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{p ? tr('schedule.dayHead', { date: fmt.monthDay(v), dow: p.weekdayName }) : tr('time.tba')}</span>
        <span style={{ fontSize: 17, fontWeight: 600, color: start && !cancelled ? 'var(--text)' : 'var(--text3)' }}>{cancelled ? tr('status.cancelled') : start ? fmt.time(start) : tr('time.tba')}</span>
      </div>
    </div>
  );
}

// 카드 머리의 상태 글자(진행 중·다음 경기). 영어 알약 없음.
function RowStatus({ status }) {
  const tr = useT();
  const live = status === 'live';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
      {live && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)' }} />}
      {tr(live ? 'status.live' : 'status.next')}
    </span>
  );
}

