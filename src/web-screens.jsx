// 데스크톱 화면: 일정 · 시리즈 · 즐겨찾기 · 경기 상세 드로어.
// AI 티 정리(2026-10-29): 영문 머리말(CALENDAR · ROUND LIST · PINNED RACES …), 0 채운 숫자, 줄마다 카드, 시리즈 색 막대·면·빛,
// 라벨-값 칸 격자를 걷어 냈다. 구성·순서·기능·계측은 그대로. 공용 계산은 list-parts.jsx, 상세 본문은 detail-parts.jsx.
import { useState, useEffect, useMemo, useRef } from 'react';
import { getVisibleSessions, getRaceStartUtc } from './schedule/index.js';
import { SeriesTag } from './primitives.jsx';
import { ScreenTitle, SectionHead, Group } from './ui.jsx';
import { SeriesDot } from './list-parts.jsx';
import { byStart, viewerParts, raceStatus, seriesRound, getRoundDisplay } from './list-utils.js';
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
import { raceShareUrl } from './share-link.js';
import { useRecommendationShown } from './use-analytics.js';
import { CircuitMapSection } from './circuit-map/CircuitMap.jsx';
import { RaceResultSection } from './results/ResultsUI.jsx';

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

export function RaceDrawer({ race, onClose, favorites, toggleFav, tier, preferences, closing = false, onExitEnd }) {
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
  const width = tier === 'ultra' ? 560 : tier === 'desktop' ? 480 : 440;
  // 열리면 포커스를 드로어 안 첫 요소(닫기 버튼)로. 닫힌 뒤 원래 요소로 되돌리는 건 WebApp이 한다.
  const headerPhoto = photo(race, 'card');
  const headerLoaded = useImageLoaded(headerPhoto);
  const panelRef = useRef(null);
  useEffect(() => { panelRef.current?.querySelector('button')?.focus({ preventScroll: true }); }, []);

  // Esc는 셸(web.jsx)이 받는다: 서킷 맵이 열려 있으면 지도가 먼저, 그다음 서랍 한 단계(UX v2).
  const block = { marginBottom: 28 };

  return (
    <div className={`drawer-root${closing ? ' closing' : ''}`} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end' }}>
      <div className="drawer-backdrop" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <aside ref={panelRef} className="drawer-panel" onAnimationEnd={closing ? onExitEnd : undefined} style={{
        position: 'relative', width, maxWidth: '100vw', height: '100vh', background: 'var(--bg)', overflow: 'auto',
      }}>
        {/* 헤더 배경 = 경기 사진 (사진 → 중립 스크림 → 콘텐츠). 높이는 padding이 정한다.
            사진이 뜨기 전 바탕은 시리즈 색이 아니라 중립 surface2 — 로딩 순간에 색이 번쩍이지 않게. */}
        <div style={{ padding: '24px 28px 30px', background: 'var(--surface2)', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, position: 'relative' }}>
            <button onClick={onClose} aria-label={tr('aria.close')} className="press-icon" style={PHOTO_BTN}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              {shareHint && (
                <span role="status" style={{
                  maxWidth: 300, padding: '6px 10px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 12, fontWeight: 600,
                  ...(shareHint.kind === 'url'
                    ? { userSelect: 'all', wordBreak: 'break-all', fontWeight: 500, lineHeight: 1.4 }
                    : { whiteSpace: 'nowrap' }),
                }}>{shareHint.kind === 'url' ? shareHint.url : tr('detail.linkCopied')}</span>
              )}
              <button onClick={() => toggleFav(race.id)} aria-label={tr('aria.save')} aria-pressed={faved} className="press-icon" style={PHOTO_BTN}>
                <svg className={favPop.trim() || undefined} onAnimationEnd={onFavPopEnd} width="20" height="20" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
              <button onClick={onShare} aria-label={tr('aria.share')} className="press-icon" style={PHOTO_BTN}>
                <ShareIcon />
              </button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <DetailTagLine race={race} />
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, color: '#fff', marginBottom: 6 }}>{L.name}</div>
            <div style={{ fontSize: 15, lineHeight: 1.45, color: 'rgba(255,255,255,0.80)' }}>{placeLine(L)}</div>
          </div>
          <PhotoCredit race={race} inset={12} />
        </div>

        <div style={{ padding: '24px 28px 40px' }}>
          {race.cancellationNote && <div style={block}><DetailNotice race={race} /></div>}

          {/* 결과 — 결과 데이터가 있는 F1 경기만 (results/ResultsUI.jsx) */}
          <RaceResultSection race={race} variant="drawer" />

          {sessions.length > 0 && <section style={block}><DetailSessions sessions={sessions} /></section>}

          {/* 현장 — 서킷 맵이 있는 경기만 (CircuitMap.jsx hasMap) */}
          <CircuitMapSection race={race} variant="drawer" />

          <section style={block}><DetailWeekend race={race} /></section>
          <section style={block}><DetailBroadcast race={race} /></section>
          {canAddAlarm(race) && <section style={block}><DetailAlarm race={race} preferences={preferences} /></section>}
          {hasDetailLinks(race) && <DetailLinks race={race} />}
        </div>
      </aside>
    </div>
  );
}

const PHOTO_BTN = { width: 40, height: 40, borderRadius: 10, border: 0, cursor: 'pointer', background: 'rgba(0,0,0,0.4)', color: '#fff', display: 'grid', placeItems: 'center' };

// 공유 아이콘. 하트 버튼과 같은 크기 안에 들어간다.
function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v13M12 3l-4 4M12 3l4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
