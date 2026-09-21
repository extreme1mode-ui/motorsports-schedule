import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getCurrentNow, useScheduleData, usePreferences, filterRacesByPreferences } from './schedule/index.js';
import { TOKENS, Mono } from './primitives.jsx';
import { Home } from './home/Home.jsx';
import { Schedule, SeriesView, Favorites, RaceDetail } from './screens.jsx';
import { WebApp, useViewport } from './web.jsx';
import { Onboarding } from './onboarding.jsx';
import { Settings } from './settings.jsx';
import { readTheme } from './preferences-options.js';
import { FormatProvider } from './format-context.jsx';
import { t, useT } from './i18n/index.js';
import { track, getDaysSinceFirstVisit } from './analytics.js';

export default function Root() {
  const prefs = usePreferences();
  const { isWeb } = useViewport();
  // 테마는 여기서만 관리한다. 저장 키 paddock.theme, 초기값 readTheme()는 기존 그대로.
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    localStorage.setItem('paddock.theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  // index.html의 lang/title은 언어 중립 기본값(en). 앱이 뜨면 사용자 locale로 바꾼다.
  useEffect(() => {
    const locale = prefs.preferences.locale || 'ko';
    document.documentElement.lang = locale;
    document.title = t(locale, 'app.title');
  }, [prefs.preferences.locale]);

  // 방문 빈도·재방문율: 앱이 뜰 때 1회 (StrictMode의 이중 effect는 ref로 막는다).
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    const { locale, timezone, onboarded } = prefs.preferences;
    track('app_opened', { locale, timezone, onboarded, days_since_first: getDaysSinceFirstVisit() });
  }, [prefs.preferences]);

  // 언어·시간대·국가는 preferences에서. 바꾸면 컨텍스트가 갱신돼 즉시 반영된다.
  const screen = !prefs.preferences.onboarded
    ? <Onboarding {...prefs} />
    : isWeb
      ? <WebApp theme={theme} setTheme={setTheme} {...prefs} />
      : <App theme={theme} setTheme={setTheme} {...prefs} />;
  return (
    <FormatProvider locale={prefs.preferences.locale} timeZone={prefs.preferences.timezone} country={prefs.preferences.country}>
      {screen}
    </FormatProvider>
  );
}

function App({ theme, setTheme, ...prefs }) {
  const { preferences } = prefs;
  const [view, setView] = useState('home');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [openRaceId, setOpenRaceId] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('paddock.fav') || '[]')); }
    catch { return new Set(); }
  });
  const [now, setNow] = useState(() => getCurrentNow());
  const [tweaks, setTweaks] = useState(false);
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

  useEffect(() => { localStorage.setItem('paddock.fav', JSON.stringify([...favorites])); }, [favorites]);

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
  const openFrom = useCallback((race, source) => { track('race_opened', { series: race.series, source }); setOpenRaceId(race.id); }, []);
  const onOpenRace = useCallback((race, source = 'home') => openFrom(race, source), [openFrom]);
  const openFromSchedule = useCallback((race) => openFrom(race, 'schedule'), [openFrom]);
  const openFromSeries = useCallback((race) => openFrom(race, 'series'), [openFrom]);
  const openFromSaved = useCallback((race, source = 'saved') => openFrom(race, source), [openFrom]);
  const onGo = useCallback((v, arg) => {
    if (v === 'series') { setCategoryFilter(arg); setView('series'); }
    else setView(v);
  }, []);

  const t = TOKENS[theme];
  const mobileBottomNavSpace = 'calc(92px + env(safe-area-inset-bottom, 0px))';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100dvh',
      overflow: 'hidden',
      background: t.bg,
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* Scrollable content area — sits inside the fixed-height App shell */}
      <div style={{
        height: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: mobileBottomNavSpace,
      }}>
        {view === 'home' && <Home theme={theme} setTheme={setTheme} now={now} races={raceList} myRaces={myRaces} preferences={preferences} favorites={favorites} toggleFav={toggleFav} onOpenRace={onOpenRace} onGo={onGo} setSeriesMode={prefs.setSeriesMode} />}
        {view === 'schedule' && <Schedule theme={theme} races={raceList} onOpenRace={openFromSchedule} now={now} seasonYear={safeSeasonYear} />}
        {view === 'series' && <SeriesView theme={theme} races={raceList} onOpenRace={openFromSeries} initialCategory={categoryFilter || 'F1'} seasonYear={safeSeasonYear} />}
        {view === 'fav' && <Favorites theme={theme} races={raceList} myRaces={myRaces} favorites={favorites} onOpenRace={openFromSaved} toggleFav={toggleFav} />}
        {view === 'settings' && <Settings theme={theme} onGo={onGo} {...prefs} />}
      </div>

      {/* Overlays and chrome are outside the scroll wrapper so they stay fixed */}
      {openRace && <RaceDetail race={openRace} theme={theme} onClose={() => setOpenRaceId(null)} favorites={favorites} toggleFav={toggleFav} preferences={preferences} />}

      <TabBar theme={theme} view={view} onGo={setView} favCount={favorites.size} />

      {tweaks && <TweaksPanel theme={theme} setTheme={setTheme} onClose={() => setTweaks(false)} />}
    </div>
  );
}

function TabBar({ theme, view, onGo, favCount }) {
  const t = TOKENS[theme];
  const tr = useT();
  const tabs = [
    { id: 'home', label: tr('nav.home'), icon: 'home' },
    { id: 'schedule', label: tr('nav.schedule'), icon: 'cal' },
    { id: 'series', label: tr('nav.series'), icon: 'grid' },
    { id: 'fav', label: tr('nav.fav'), icon: 'heart' },
  ];
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70,
      padding: '10px 14px calc(16px + env(safe-area-inset-bottom, 0px))',
      background: theme === 'dark'
        ? 'linear-gradient(180deg, rgba(10,11,14,0) 0%, rgba(10,11,14,0.92) 30%)'
        : 'linear-gradient(180deg, rgba(242,242,245,0) 0%, rgba(242,242,245,0.95) 30%)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 4,
        background: theme === 'dark' ? 'rgba(20,22,27,0.9)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${t.line}`, borderRadius: 20, padding: 5,
        pointerEvents: 'auto',
      }}>
        {tabs.map(tab => {
          const active = view === tab.id;
          return (
            <button key={tab.id} onClick={() => onGo(tab.id)} style={{
              background: active ? (theme === 'dark' ? '#fff' : '#111') : 'transparent',
              color: active ? (theme === 'dark' ? '#111' : '#fff') : t.text3,
              border: 0, borderRadius: 14, padding: '10px 4px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
            }}>
              <TabIcon type={tab.icon} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '-0.005em' }}>{tab.label}</span>
              {tab.id === 'fav' && favCount > 0 && !active && (
                <span style={{
                  position: 'absolute', top: 5, right: 12,
                  background: '#FF6B7A', color: '#fff', borderRadius: 999,
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', minWidth: 14, textAlign: 'center',
                  fontFamily: '"JetBrains Mono", ui-monospace',
                }}>{favCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabIcon({ type }) {
  const stroke = 'currentColor';
  if (type === 'home') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l9-7 9 7v11a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V10z"/>
    </svg>
  );
  if (type === 'cal') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>
    </svg>
  );
  if (type === 'grid') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
  if (type === 'heart') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
  return null;
}

function TweaksPanel({ theme, setTheme, onClose }) {
  const t = TOKENS[theme];
  const tr = useT();
  return (
    <div style={{
      position: 'absolute', right: 12, bottom: 100, zIndex: 90,
      background: theme === 'dark' ? '#14161B' : '#fff',
      border: `1px solid ${t.line2}`, borderRadius: 16,
      padding: 14, width: 220,
      boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
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
