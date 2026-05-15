import { useState, useEffect } from 'react';
import { ALL_RACES, SERIES } from './data.js';
import { TOKENS, Mono } from './primitives.jsx';
import { IOSDevice } from './IOSFrame.jsx';
import { Home } from './home.jsx';
import { Schedule, SeriesView, Favorites, RaceDetail } from './screens.jsx';
import { WebApp, useViewport, getSimulatedNow } from './web.jsx';

export default function Root() {
  const { isWeb } = useViewport();
  if (isWeb) return <WebApp />;
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '28px 20px',
      background: `radial-gradient(1000px 600px at 20% -10%, rgba(255,77,95,0.08), transparent 70%),
                   radial-gradient(800px 600px at 100% 110%, rgba(46,125,255,0.08), transparent 60%),
                   #07080B`,
    }}>
      <div style={{ position: 'relative' }}>
        <IOSDevice width={402} height={874} dark={true}>
          <App />
        </IOSDevice>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('paddock.theme') || 'dark');
  const [view, setView] = useState('home');
  const [seriesFilter, setSeriesFilter] = useState(null);
  const [openRace, setOpenRace] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('paddock.fav') || '[]')); }
    catch { return new Set(); }
  });
  const [now, setNow] = useState(() => getSimulatedNow());
  const [tweaks, setTweaks] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(getSimulatedNow()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { localStorage.setItem('paddock.theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('paddock.fav', JSON.stringify([...favorites])); }, [favorites]);

  const toggleFav = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const onGo = (v, arg) => {
    if (v === 'series') { setSeriesFilter(arg); setView('series'); }
    else setView(v);
  };

  const t = TOKENS[theme];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: t.bg }}>
      {/* Scrollable content area — sits inside the fixed-height App shell */}
      <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {view === 'home' && <Home theme={theme} now={now} races={ALL_RACES} onOpenRace={setOpenRace} onGo={onGo} favorites={favorites} toggleFav={toggleFav} />}
        {view === 'schedule' && <Schedule theme={theme} races={ALL_RACES} onOpenRace={setOpenRace} now={now} />}
        {view === 'series' && <SeriesView theme={theme} races={ALL_RACES} onOpenRace={setOpenRace} initialSeries={seriesFilter || 'F1'} />}
        {view === 'fav' && <Favorites theme={theme} races={ALL_RACES} favorites={favorites} onOpenRace={setOpenRace} toggleFav={toggleFav} />}
      </div>

      {/* Overlays and chrome are outside the scroll wrapper so they stay fixed */}
      {openRace && <RaceDetail race={openRace} theme={theme} onClose={() => setOpenRace(null)} favorites={favorites} toggleFav={toggleFav} />}

      <TabBar theme={theme} view={view} onGo={setView} favCount={favorites.size} />

      {tweaks && <TweaksPanel theme={theme} setTheme={setTheme} onClose={() => setTweaks(false)} />}
    </div>
  );
}

function TabBar({ theme, view, onGo, favCount }) {
  const t = TOKENS[theme];
  const tabs = [
    { id: 'home', label: '홈', icon: 'home' },
    { id: 'schedule', label: '일정', icon: 'cal' },
    { id: 'series', label: '시리즈', icon: 'grid' },
    { id: 'fav', label: '즐겨찾기', icon: 'heart' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 70,
      padding: '10px 14px 28px',
      background: theme === 'dark'
        ? 'linear-gradient(180deg, rgba(10,11,14,0) 0%, rgba(10,11,14,0.92) 30%)'
        : 'linear-gradient(180deg, rgba(242,242,245,0) 0%, rgba(242,242,245,0.95) 30%)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 4,
        background: theme === 'dark' ? 'rgba(20,22,27,0.9)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${t.line}`, borderRadius: 20, padding: 5,
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
        <div style={{ fontSize: 12, color: t.text2, marginBottom: 6 }}>테마</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['dark', 'light'].map(m => (
            <button key={m} onClick={() => setTheme(m)} style={{
              padding: '8px 0', borderRadius: 10,
              border: `1px solid ${theme === m ? t.text : t.line}`,
              background: theme === m ? t.text : 'transparent',
              color: theme === m ? t.bg : t.text2,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{m === 'dark' ? '다크' : '라이트'}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
