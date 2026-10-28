import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { TOKENS } from './primitives.jsx';
import { GantryLockup, GantrySymbol } from './Brand.jsx';
import { getCurrentNow, useScheduleData, filterRacesByPreferences } from './schedule/index.js';
import { Home } from './home/Home.jsx';
import { WebSchedule, WebSeries, WebFavorites, RaceDrawer } from './web-screens.jsx';
import { Settings } from './settings.jsx';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
import { useRaceLink } from './share-link.js';
import { withViewTransition, useScrollMemory, useFocusViewTitle, usePresence } from './use-motion.js';
import { storage } from './storage/index.js';

export function useViewport() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1440);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  let tier = 'mobile';
  if (w >= 1440) tier = 'ultra';
  else if (w >= 1180) tier = 'desktop';
  else if (w >= 900) tier = 'tablet';
  return { w, tier, isWeb: w >= 900 };
}

export function WebApp({ theme, setTheme, themePref, onShareLinkDone, ...prefs }) {
  const { preferences } = prefs;
  const [view, setView] = useState('home');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [openRaceId, setOpenRaceId] = useState(null);
  const [favorites, setFavorites] = useState(() => storage.favorites.read());
  const [now, setNow] = useState(() => getCurrentNow());
  const [tweaks, setTweaks] = useState(false);
  const { tier } = useViewport();
  const schedule = useScheduleData(now);
  const raceList = useMemo(() => (Array.isArray(schedule.races) ? schedule.races : []), [schedule.races]);
  const safeSeasonYear = Number.isFinite(schedule.seasonYear)
    ? schedule.seasonYear
    : Number((raceList.find((race) => race?.raceDateKst)?.raceDateKst || '').slice(0, 4)) || 2026;
  const openRace = raceList.find((race) => race.id === openRaceId) || null;
  const myRaces = useMemo(() => filterRacesByPreferences(raceList, preferences, favorites), [raceList, preferences, favorites]);

  useEffect(() => {
    const i = setInterval(() => setNow(getCurrentNow()), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => { storage.favorites.write(favorites); }, [favorites]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaks(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaks(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // 계측용 최신값 미러 — 콜백은 참조가 고정돼 있어 state를 직접 못 읽는다.
  const favRef = useRef(favorites);
  const racesRef = useRef(raceList);
  useEffect(() => { favRef.current = favorites; racesRef.current = raceList; }, [favorites, raceList]);

  // Home은 memo로 감싸져 있어 콜백 참조가 안정적이어야 한다 (1초 setNow에 통째로 리렌더되지 않게).
  const toggleFav = useCallback((id) => {
    const series = racesRef.current.find((r) => r.id === id)?.series;
    track(favRef.current.has(id) ? 'race_unsaved' : 'race_saved', { series });
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  // source: 어느 화면에서 열었는지. 화면별 래퍼가 기본값을 주고, 추천 카드는 'recommendation'을 직접 넘긴다.
  const openerRef = useRef(null);   // 드로어를 연 요소 — 닫힐 때 포커스를 되돌린다
  const openFrom = useCallback((race, source, extra) => { openerRef.current = document.activeElement; track('race_opened', { series: race.series, source, ...extra }); setOpenRaceId(race.id); }, []);
  const onOpenRace = useCallback((race, source = 'home', extra) => openFrom(race, source, extra), [openFrom]);
  const openFromSchedule = useCallback((race) => openFrom(race, 'schedule'), [openFrom]);
  const openFromSeries = useCallback((race) => openFrom(race, 'series'), [openFrom]);
  const openFromSaved = useCallback((race, source = 'saved') => openFrom(race, source), [openFrom]);
  // 공유 주소(/race/<id>): 들어오면 그 상세를 열고, 열고 닫을 때 주소를 맞춘다.
  useRaceLink({ races: raceList, ready: !schedule.loading, openRace, openFrom, onDone: onShareLinkDone });
  // 탭 전환: 웹은 window 스크롤. 떠나기 전 scrollY 저장 → View Transition 안에서 동기 커밋 → layout effect에서 복원.
  const saveScroll = useScrollMemory(view, null);
  useFocusViewTitle(view);
  const onGo = useCallback((v, arg) => {
    saveScroll(view);
    withViewTransition(() => {
      if (v === 'series') { setCategoryFilter(arg); setView('series'); }
      else setView(v);
    }, flushSync);
  }, [view, saveScroll]);

  // 드로어: 닫힐 때 퇴장 애니메이션이 끝난 뒤 언마운트.
  const drawer = usePresence(!!openRace);
  const [lastRace, setLastRace] = useState(openRace);            // 닫히는 동안 보여줄 마지막 race (렌더 중 상태 조정)
  if (openRace && openRace !== lastRace) setLastRace(openRace);
  const shownRace = openRace ?? lastRace;
  useEffect(() => {
    if (drawer.mounted) return;
    const el = openerRef.current;
    if (el && el.isConnected && typeof el.focus === 'function' && el !== document.body) el.focus({ preventScroll: true });
    else document.querySelector('[data-view-title]')?.focus({ preventScroll: true });
    openerRef.current = null;
  }, [drawer.mounted]);

  const sidebarWidth = tier === 'tablet' ? 76 : 240;
  const gutter = tier === 'ultra' ? 48 : tier === 'desktop' ? 36 : 24;
  const maxMain = tier === 'ultra' ? 1480 : tier === 'desktop' ? 1200 : 1000;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: '"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif',
      display: 'grid', gridTemplateColumns: `${sidebarWidth}px 1fr`,
      position: 'relative',
    }}>
      <Sidebar view={view} onGo={onGo} collapsed={tier === 'tablet'} />

      <main style={{ padding: `${gutter + 8}px ${gutter}px ${gutter * 2}px`, maxWidth: '100%', minWidth: 0 }}>
        <div style={{ maxWidth: maxMain, margin: '0 auto' }}>
          {view === 'home' && <Home theme={theme} setTheme={setTheme} now={now} races={raceList} myRaces={myRaces}
            preferences={preferences} favorites={favorites} toggleFav={toggleFav} onOpenRace={onOpenRace} onGo={onGo} setSeriesMode={prefs.setSeriesMode} />}
          {view === 'schedule' && <WebSchedule theme={theme} races={raceList}
            onOpenRace={openFromSchedule} now={now} tier={tier} seasonYear={safeSeasonYear} />}
          {view === 'series' && <WebSeries theme={theme} races={raceList}
            onOpenRace={openFromSeries} initialCategory={categoryFilter || 'F1'} tier={tier} seasonYear={safeSeasonYear} />}
          {view === 'fav' && <WebFavorites theme={theme} races={raceList} myRaces={myRaces}
            favorites={favorites} onOpenRace={openFromSaved} toggleFav={toggleFav} tier={tier} />}
          {view === 'settings' && <Settings theme={theme} themePref={themePref} setTheme={setTheme} onGo={onGo} {...prefs} />}
        </div>
      </main>

      {drawer.mounted && shownRace && <RaceDrawer race={shownRace} theme={theme} onClose={() => setOpenRaceId(null)}
        favorites={favorites} toggleFav={toggleFav} tier={tier} preferences={preferences} closing={drawer.closing} onExitEnd={drawer.onExitEnd} />}

      {tweaks && <WebTweaks theme={theme} setTheme={setTheme} />}
    </div>
  );
}

// 사이드바: 아이콘 20 + 한글 15/600 한 줄. 고른 메뉴는 면 하나(왼쪽 막대 없음).
// 예전의 영문 보조 라벨(HOME·SCHEDULE…), '2026 · SEASON', 즐겨찾기 개수 배지, 'LIVE TIMING' 상자는 걷어 냈다(N1·K6).
// 테마는 설정 화면으로, 시간대는 일정 제목 아래 한 줄로 옮겼다.
function Sidebar({ view, onGo, collapsed }) {
  const tr = useT();
  const items = [
    { id: 'home',     label: tr('nav.home'),     icon: 'home' },
    { id: 'schedule', label: tr('nav.schedule'), icon: 'cal' },
    { id: 'series',   label: tr('nav.series'),   icon: 'grid' },
    { id: 'fav',      label: tr('nav.fav'),      icon: 'heart' },
  ];
  const navBtn = (it) => {
    const active = view === it.id;
    return (
      <button key={it.id} onClick={() => onGo(it.id)} title={it.label} aria-current={active ? 'page' : undefined} style={{
        display: 'flex', alignItems: 'center', minHeight: 44,
        gap: collapsed ? 0 : 12, justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px 0' : '10px 12px',
        borderRadius: 10, border: 0, cursor: 'pointer', background: 'transparent',
        color: active ? 'var(--text)' : 'var(--text2)',
        fontFamily: 'inherit', position: 'relative', isolation: 'isolate',
      }}>
        {/* 선택 면 전용 레이어 (아이콘·라벨 제외). 전환 이름은 여기에만. */}
        {active && <span aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, borderRadius: 10, background: 'var(--surface2)', viewTransitionName: 'nav-pill' }} />}
        {/* 아이콘·라벨은 자체 그룹. 면보다 나중에 그려져 전환 중에도 면 위에 남는다. */}
        <span style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12, viewTransitionName: `rail-${it.id}` }}>
          <SideIcon type={it.icon} stroke="currentColor" />
          {!collapsed && <span style={{ fontSize: 15, fontWeight: 600 }}>{it.label}</span>}
        </span>
      </button>
    );
  };

  return (
    <aside style={{
      viewTransitionName: 'nav-chrome',
      boxShadow: 'inset -1px 0 0 var(--line)',
      background: 'var(--bg)',
      position: 'sticky', top: 0, height: '100vh',
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '20px 14px' : '28px 16px',
      gap: 4, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 32, padding: collapsed ? '0' : '0 12px', marginBottom: 20, justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--text)' }}>
        {collapsed ? <GantrySymbol size={16} title="Gantry" /> : <GantryLockup height={16} />}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{items.map(navBtn)}</nav>

      <div style={{ flex: 1 }} />

      {navBtn({ id: 'settings', label: tr('nav.settings'), icon: 'gear' })}
    </aside>
  );
}

function SideIcon({ type, stroke }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'home') return <svg {...common}><path d="M3 10l9-7 9 7v11a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V10z"/></svg>;
  if (type === 'cal') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
  if (type === 'grid') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  if (type === 'heart') return <svg {...common}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
  if (type === 'gear') return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>;
  return null;
}

function WebTweaks({ theme, setTheme }) {
  const t = TOKENS[theme];
  const tr = useT();
  return (
    <div style={{
      position: 'fixed', left: 24, bottom: 24, zIndex: 90,
      background: theme === 'dark' ? t.surface2 : t.surface,
      border: `1px solid ${t.line2}`, borderRadius: 'var(--r-sheet)',
      padding: 14, width: 240,
      boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
    }}>
      <div>
        <div style={{ fontSize: 12, color: t.text2, marginBottom: 6 }}>{tr('theme.label')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['dark', 'light'].map(m => (
            <button key={m} onClick={() => setTheme(m)} style={{
              padding: '8px 0', borderRadius: 10,
              border: `1px solid ${theme === m ? t.text : t.line}`,
              background: theme === m ? t.text : 'transparent',
              color: theme === m ? t.bg : t.text2,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{m === 'dark' ? tr('theme.dark') : tr('theme.light')}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
