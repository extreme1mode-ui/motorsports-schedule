import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { TOKENS, Mono, SeriesTag, FONT_DATA } from './primitives.jsx';
import { GantryLockup, GantrySymbol } from './Brand.jsx';
import { getCurrentNow, useScheduleData, filterRacesByPreferences } from './schedule/index.js';
import { Home } from './home/Home.jsx';
import { WebSchedule, WebSeries, WebFavorites, RaceDrawer } from './web-screens.jsx';
import { Settings } from './settings.jsx';
import { useFormat } from './use-format.js';
import { useT } from './i18n/index.js';
import { track } from './analytics.js';
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

export function WebApp({ theme, setTheme, ...prefs }) {
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
  const openFrom = useCallback((race, source) => { openerRef.current = document.activeElement; track('race_opened', { series: race.series, source }); setOpenRaceId(race.id); }, []);
  const onOpenRace = useCallback((race, source = 'home') => openFrom(race, source), [openFrom]);
  const openFromSchedule = useCallback((race) => openFrom(race, 'schedule'), [openFrom]);
  const openFromSeries = useCallback((race) => openFrom(race, 'series'), [openFrom]);
  const openFromSaved = useCallback((race, source = 'saved') => openFrom(race, source), [openFrom]);
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

  const t = TOKENS[theme];
  const sidebarWidth = tier === 'tablet' ? 76 : 240;
  const gutter = tier === 'ultra' ? 48 : tier === 'desktop' ? 36 : 24;
  const maxMain = tier === 'ultra' ? 1480 : tier === 'desktop' ? 1200 : 1000;

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.text,
      fontFamily: '"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif',
      display: 'grid', gridTemplateColumns: `${sidebarWidth}px 1fr`,
      position: 'relative',
    }}>
      <Sidebar theme={theme} view={view} onGo={onGo} favCount={favorites.size}
        collapsed={tier === 'tablet'} tier={tier} setTheme={setTheme} />

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
          {view === 'settings' && <Settings theme={theme} onGo={onGo} {...prefs} />}
        </div>
      </main>

      {drawer.mounted && shownRace && <RaceDrawer race={shownRace} theme={theme} onClose={() => setOpenRaceId(null)}
        favorites={favorites} toggleFav={toggleFav} tier={tier} preferences={preferences} closing={drawer.closing} onExitEnd={drawer.onExitEnd} />}

      {tweaks && <WebTweaks theme={theme} setTheme={setTheme} />}
    </div>
  );
}

function Sidebar({ theme, view, onGo, favCount, collapsed, tier, setTheme }) {
  const t = TOKENS[theme];
  const fmt = useFormat();
  const tr = useT();
  const items = [
    { id: 'home',     label: tr('nav.home'),     sub: 'HOME',     icon: 'home' },
    { id: 'schedule', label: tr('nav.schedule'), sub: 'SCHEDULE', icon: 'cal' },
    { id: 'series',   label: tr('nav.series'),   sub: 'SERIES',   icon: 'grid' },
    { id: 'fav',      label: tr('nav.fav'),      sub: 'PINNED',   icon: 'heart' },
  ];

  return (
    <aside style={{
      viewTransitionName: 'nav-chrome',
      borderRight: `1px solid ${t.line}`,
      background: theme === 'dark' ? '#07080B' : '#FAFAFD',
      position: 'sticky', top: 0, height: '100vh',
      display: 'flex', flexDirection: 'column',
      padding: collapsed ? '20px 14px' : '22px 18px',
      gap: 4, overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '8px 4px 16px' : '6px 6px 22px',
        borderBottom: `1px solid ${t.line}`,
        marginBottom: 10, justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {collapsed ? (
          <span style={{ color: t.text, display: 'grid', placeItems: 'center', height: 32 }}>
            <GantrySymbol size={16} title="Gantry" />
          </span>
        ) : (
          <div style={{ color: t.text, display: 'flex', flexDirection: 'column', gap: 9, padding: '5px 0 0 2px' }}>
            <GantryLockup height={14} />
            <Mono size={9} color={t.text3} style={{ letterSpacing: '0.18em', display: 'block' }}>2026 · SEASON</Mono>
          </div>
        )}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map(it => {
          const active = view === it.id;
          return (
            <button key={it.id} onClick={() => onGo(it.id)} title={it.label} style={{
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 12, justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '12px 0' : '11px 12px',
              borderRadius: 12, border: 0, cursor: 'pointer',
              background: 'transparent',
              color: active ? t.text : t.text2,
              fontFamily: 'inherit', position: 'relative', isolation: 'isolate',
            }}>
              {/* 알약 배경 전용 레이어 (아이콘·라벨 제외). 이름은 여기에만. */}
              {active && <span aria-hidden style={{
                position: 'absolute', inset: 0, zIndex: -1, borderRadius: 12,
                background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                viewTransitionName: 'nav-pill',
              }} />}
              {active && <span aria-hidden style={{
                position: 'absolute', left: collapsed ? 6 : 0, top: 10, bottom: 10, width: 3,
                background: t.text, borderRadius: 2, viewTransitionName: 'nav-bar',
              }} />}
              {/* 아이콘·라벨은 자체 그룹. 알약보다 나중에 그려져 전환 중에도 알약 위에 남는다. */}
              <span style={{
                display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
                viewTransitionName: `rail-${it.id}`,
              }}>
                <SideIcon type={it.icon} stroke={active ? t.text : t.text2} />
                {!collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>{it.label}</span>
                    <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em' }}>{it.sub}</Mono>
                  </div>
                )}
              </span>
              {it.id === 'fav' && favCount > 0 && !collapsed && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#FF6B7A', color: '#fff', borderRadius: 999,
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', minWidth: 16, textAlign: 'center',
                  ...FONT_DATA,
                }}>{favCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <button onClick={() => onGo('settings')} title={tr('nav.settings')} style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 12, justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '12px 0' : '11px 12px', marginBottom: 10,
        borderRadius: 12, border: 0, cursor: 'pointer',
        background: 'transparent',
        color: view === 'settings' ? t.text : t.text2,
        fontFamily: 'inherit', position: 'relative', isolation: 'isolate',
      }}>
        {/* 알약 배경 전용 레이어 (아이콘·라벨 제외). 이름은 여기에만. */}
        {view === 'settings' && <span aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: -1, borderRadius: 12,
          background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          viewTransitionName: 'nav-pill',
        }} />}
        {view === 'settings' && <span aria-hidden style={{
          position: 'absolute', left: collapsed ? 6 : 0, top: 10, bottom: 10, width: 3,
          background: t.text, borderRadius: 2, viewTransitionName: 'nav-bar',
        }} />}
        {/* 아이콘·라벨은 자체 그룹. 알약보다 나중에 그려져 전환 중에도 알약 위에 남는다. */}
        <span style={{
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
          viewTransitionName: 'rail-settings',
        }}>
          <SideIcon type="gear" stroke={view === 'settings' ? t.text : t.text2} />
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>{tr('nav.settings')}</span>
              <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em' }}>SETTINGS</Mono>
            </div>
          )}
        </span>
      </button>

      {!collapsed ? (
        <div style={{
          padding: '12px 12px',
          background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          borderRadius: 12, border: `1px solid ${t.line}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22D77E', boxShadow: '0 0 8px #22D77E' }} />
            <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em' }}>LIVE TIMING · {fmt.zoneLabel}</Mono>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {['dark', 'light'].map(m => (
              <button key={m} onClick={() => setTheme(m)} style={{
                padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: `1px solid ${theme === m ? t.text : t.line}`,
                background: theme === m ? t.text : 'transparent',
                color: theme === m ? t.bg : t.text2,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{m === 'dark' ? tr('theme.dark') : tr('theme.light')}</button>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{
          width: 40, height: 40, borderRadius: 10, margin: '0 auto',
          border: `1px solid ${t.line}`, background: 'transparent',
          color: t.text2, cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
        </button>
      )}
    </aside>
  );
}

function SideIcon({ type, stroke }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'home') return <svg {...common}><path d="M3 10l9-7 9 7v11a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V10z"/></svg>;
  if (type === 'cal') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
  if (type === 'grid') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  if (type === 'heart') return <svg {...common}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
  if (type === 'gear') return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>;
  return null;
}

// web-home.jsx에서 그대로 옮김 (web-screens.jsx가 쓴다).
export function SectionTitle({ theme, kicker, title, inline }) {
  const t = TOKENS[theme];
  return (
    <div style={{ display: inline ? 'flex' : 'block', alignItems: 'baseline', gap: 12, marginBottom: inline ? 0 : 14 }}>
      <Mono size={11} weight={700} color={t.text3} style={{ letterSpacing: '0.18em', display: 'block' }}>{kicker}</Mono>
      <div style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', marginTop: 4 }}>{title}</div>
    </div>
  );
}

export function PageHeader({ theme, kicker, title, subtitle, right }) {
  const t = TOKENS[theme];
  return (
    <header style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
      paddingBottom: 22, marginBottom: 24, borderBottom: `1px solid ${t.line}`,
    }}>
      <div>
        <Mono size={11} color={t.text3} style={{ letterSpacing: '0.18em', display: 'block', marginBottom: 8 }}>{kicker}</Mono>
        <h1 data-view-title tabIndex={-1} style={{ margin: 0, fontSize: 38, fontWeight: 800, letterSpacing: '-0.025em', color: t.text, lineHeight: 1 }}>
          {title}
        </h1>
        {subtitle && <div style={{ marginTop: 8, fontSize: 14, color: t.text2 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ flex: 'none' }}>{right}</div>}
    </header>
  );
}

function WebTweaks({ theme, setTheme }) {
  const t = TOKENS[theme];
  const tr = useT();
  return (
    <div style={{
      position: 'fixed', left: 24, bottom: 24, zIndex: 90,
      background: theme === 'dark' ? '#14161B' : '#fff',
      border: `1px solid ${t.line2}`, borderRadius: 16,
      padding: 14, width: 240,
      boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
    }}>
      <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.14em' }}>TWEAKS</Mono>
      <div style={{ marginTop: 10 }}>
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
