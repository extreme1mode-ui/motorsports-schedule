import { useState, useEffect } from 'react';
import { TOKENS, Mono, SeriesTag } from './primitives.jsx';
import { ALL_RACES } from './data.js';
import { WebHome } from './web-home.jsx';
import { WebSchedule, WebSeries, WebFavorites, RaceDrawer } from './web-screens.jsx';

export function getSimulatedNow() {
  const base = new Date('2026-03-10T14:30:00+09:00').getTime();
  if (!window.__pkStart) window.__pkStart = Date.now();
  return new Date(base + (Date.now() - window.__pkStart));
}

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

export function WebApp() {
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
  const { tier } = useViewport();

  useEffect(() => {
    const i = setInterval(() => setNow(getSimulatedNow()), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => { localStorage.setItem('paddock.theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('paddock.fav', JSON.stringify([...favorites])); }, [favorites]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaks(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaks(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const toggleFav = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const onOpenRace = (r) => setOpenRace(r);
  const onGo = (v, arg) => {
    if (v === 'series') { setSeriesFilter(arg); setView('series'); }
    else setView(v);
  };

  const t = TOKENS[theme];
  const sidebarWidth = tier === 'tablet' ? 76 : 240;
  const gutter = tier === 'ultra' ? 48 : tier === 'desktop' ? 36 : 24;
  const maxMain = tier === 'ultra' ? 1480 : tier === 'desktop' ? 1200 : 1000;

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.text,
      fontFamily: '"Pretendard", -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif',
      display: 'grid', gridTemplateColumns: `${sidebarWidth}px 1fr`,
      position: 'relative',
    }}>
      <Sidebar theme={theme} view={view} onGo={setView} favCount={favorites.size}
        collapsed={tier === 'tablet'} tier={tier} setTheme={setTheme} />

      <main style={{ padding: `${gutter + 8}px ${gutter}px ${gutter * 2}px`, maxWidth: '100%', minWidth: 0 }}>
        <div style={{ maxWidth: maxMain, margin: '0 auto' }}>
          {view === 'home' && <WebHome theme={theme} now={now} races={ALL_RACES}
            onOpenRace={onOpenRace} onGo={onGo} favorites={favorites} toggleFav={toggleFav} tier={tier} />}
          {view === 'schedule' && <WebSchedule theme={theme} races={ALL_RACES}
            onOpenRace={onOpenRace} now={now} tier={tier} />}
          {view === 'series' && <WebSeries theme={theme} races={ALL_RACES}
            onOpenRace={onOpenRace} initialSeries={seriesFilter || 'F1'} tier={tier} />}
          {view === 'fav' && <WebFavorites theme={theme} races={ALL_RACES}
            favorites={favorites} onOpenRace={onOpenRace} toggleFav={toggleFav} tier={tier} />}
        </div>
      </main>

      {openRace && <RaceDrawer race={openRace} theme={theme} onClose={() => setOpenRace(null)}
        favorites={favorites} toggleFav={toggleFav} tier={tier} />}

      {tweaks && <WebTweaks theme={theme} setTheme={setTheme} />}
    </div>
  );
}

function Sidebar({ theme, view, onGo, favCount, collapsed, tier, setTheme }) {
  const t = TOKENS[theme];
  const items = [
    { id: 'home',     label: '홈',       sub: 'HOME',     icon: 'home' },
    { id: 'schedule', label: '일정',     sub: 'SCHEDULE', icon: 'cal' },
    { id: 'series',   label: '시리즈',   sub: 'SERIES',   icon: 'grid' },
    { id: 'fav',      label: '즐겨찾기', sub: 'PINNED',   icon: 'heart' },
  ];

  return (
    <aside style={{
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
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: t.text,
          display: 'grid', placeItems: 'center', flex: 'none',
        }}>
          <svg width="18" height="18" viewBox="0 0 16 16">
            {[[0,0],[8,0],[4,4],[12,4],[0,8],[8,8],[4,12],[12,12]].map(([x,y],i) =>
              <rect key={i} width="4" height="4" x={x} y={y} fill={t.bg} />
            )}
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, letterSpacing: '-0.01em', lineHeight: 1 }}>PADDOCK</div>
            <Mono size={9} color={t.text3} style={{ letterSpacing: '0.18em', marginTop: 3, display: 'block' }}>2026 · SEASON</Mono>
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
              background: active
                ? (theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
                : 'transparent',
              color: active ? t.text : t.text2,
              fontFamily: 'inherit', position: 'relative',
              transition: 'background 0.12s',
            }}>
              {active && <span style={{
                position: 'absolute', left: collapsed ? 6 : 0, top: 10, bottom: 10, width: 3,
                background: t.text, borderRadius: 2,
              }} />}
              <SideIcon type={it.icon} stroke={active ? t.text : t.text2} />
              {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>{it.label}</span>
                  <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em' }}>{it.sub}</Mono>
                </div>
              )}
              {it.id === 'fav' && favCount > 0 && !collapsed && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#FF6B7A', color: '#fff', borderRadius: 999,
                  fontSize: 9, fontWeight: 700, padding: '2px 6px', minWidth: 16, textAlign: 'center',
                  fontFamily: '"JetBrains Mono", ui-monospace',
                }}>{favCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {!collapsed ? (
        <div style={{
          padding: '12px 12px',
          background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          borderRadius: 12, border: `1px solid ${t.line}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22D77E', boxShadow: '0 0 8px #22D77E' }} />
            <Mono size={9} color={t.text3} style={{ letterSpacing: '0.14em' }}>LIVE TIMING · KST</Mono>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {['dark', 'light'].map(m => (
              <button key={m} onClick={() => setTheme(m)} style={{
                padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: `1px solid ${theme === m ? t.text : t.line}`,
                background: theme === m ? t.text : 'transparent',
                color: theme === m ? t.bg : t.text2,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{m === 'dark' ? '다크' : '라이트'}</button>
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
  return null;
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
        <h1 style={{ margin: 0, fontSize: 38, fontWeight: 800, letterSpacing: '-0.025em', color: t.text, lineHeight: 1 }}>
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
