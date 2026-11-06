import { useState, useEffect, useEffectEvent, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { getCurrentNow, useScheduleData, usePreferences, filterRacesByPreferences, detectTimezone, SUPPORTED_SERIES } from './schedule/index.js';
import { TOKENS } from './primitives.jsx';
import { Home } from './home/Home.jsx';
import { FavoritesScreen } from './screens2/Favorites.jsx';
import { RaceDetailV2 } from './screens2/Detail.jsx';
import { ScheduleScreen } from './screens2/Schedule.jsx';
import { SeriesScreen } from './screens2/Series.jsx';
import { WebApp, useViewport } from './web.jsx';
import { OnboardingScreen } from './screens2/Onboarding.jsx';
import { SettingsScreen } from './screens2/Settings.jsx';
import { readTheme, systemTheme } from './preferences-options.js';
import { FormatProvider } from './format-context.jsx';
import { t, useT } from './i18n/index.js';
import { track, getDaysSinceFirstVisit, recordFirstTouch, firstTouchProps } from './analytics.js';
import { useRaceLink, hasRaceLinkInPath } from './share-link.js';
import { withViewTransition, useScrollMemory, useFocusViewTitle } from './use-motion.js';
import { ShellContext } from './shell/context.js';
import { useShellCore } from './shell/useShellCore.js';
import { useDevShellHook } from './shell/dev-hook.js';
import { ShellSheets } from './shell/ShellSheets.jsx';
import { activeElement, focusBack, prefersReducedMotion, useScrollEdges } from './shell/utils.js';
import './shell/shell.css';
import { Snackbar } from './ui2/Snackbar.jsx';
import { Icon } from './ui2/Icon.jsx';
import { storage } from './storage/index.js';
import { setAppTitle } from './document-title.js';
import { CircuitMapProvider } from './circuit-map/CircuitMap.jsx';
import { DemoClockSheet } from './demo/DemoClockSheet.jsx';

export default function Root() {
  const prefs = usePreferences();
  const { isWeb } = useViewport();
  // 테마는 여기서만 관리한다. 저장 키 gantry.theme(예전 paddock.theme에서 이어받음 — readTheme).
  // themePref = 사용자가 고른 값('system' | 'dark' | 'light', 처음에는 system), theme = 지금 그리는 값('dark' | 'light').
  const [themePref, setThemePref] = useState(readTheme);
  const [sysTheme, setSysTheme] = useState(systemTheme);
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia('(prefers-color-scheme: light)'); } catch { return undefined; }
    const on = () => setSysTheme(mq.matches ? 'light' : 'dark');
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  const theme = themePref === 'system' ? sysTheme : themePref;
  // 고른 값만 저장한다(처음 뜰 때는 쓰지 않는다). 지도·설정이 'system'/'dark'/'light'를 직접 넘긴다.
  const setTheme = useCallback((v) => { setThemePref(v); storage.theme.write(v); }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#0E1015'));
  }, [theme]);
  // index.html의 lang/title은 한국어 기본값(검색용). 앱이 뜨면 사용자 locale로 바꾼다.
  // 경기 상세가 걸려 있는 동안은 경기 제목이 이긴다(document-title.js).
  useEffect(() => {
    const locale = prefs.preferences.locale || 'ko';
    document.documentElement.lang = locale;
    setAppTitle(t(locale, 'app.title'));
  }, [prefs.preferences.locale]);

  // 방문 빈도·재방문율: 앱이 뜰 때 1회 (StrictMode의 이중 effect는 ref로 막는다).
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    const { locale, timezone, onboarded } = prefs.preferences;
    recordFirstTouch();   // 첫 유입이면 이번 주소의 utm을 한 번 저장한다
    track('app_opened', { locale, timezone, onboarded, days_since_first: getDaysSinceFirstVisit(), ...firstTouchProps() });
  }, [prefs.preferences]);

  // L14(결정 19): 앱 시작·창 포커스 때 기기 시간대가 저장값과 다르면 따라간다. 설정의 시간대 줄은 보여 주기만 한다.
  const syncTimezone = useEffectEvent(() => {
    const tz = detectTimezone();
    if (!tz || tz === prefs.preferences.timezone) return;
    prefs.setTimezone(tz);
    track('timezone_changed', { detected: true });
  });
  useEffect(() => {
    syncTimezone();
    const on = () => { if (document.visibilityState !== 'hidden') syncTimezone(); };
    window.addEventListener('focus', on);
    document.addEventListener('visibilitychange', on);
    return () => { window.removeEventListener('focus', on); document.removeEventListener('visibilitychange', on); };
  }, []);

  // 설정에서 '처음 설정 다시 하기'(SPEC 7장): 지금 설정을 기억해 두고 온보딩을 연다(onboarded는 건드리지 않는다).
  // X로 닫으면 설정은 그대로 설정 화면으로, 마치면 홈 + 스낵바 '되돌리기'(기억해 둔 보는 범위로). 셸은 entry로 그 한 번을 받는다.
  const [redo, setRedo] = useState(null);       // { prev: { F1: 'all', … } } | null
  const [entry, setEntry] = useState(null);     // { open: 'settings' } | { toast: { text, undo } } | null
  const startRedo = useCallback(() => setRedo({ prev: { ...prefs.preferences.series } }), [prefs.preferences.series]);
  const { setSeriesMode } = prefs;
  const closeRedo = useCallback(() => { setRedo(null); setEntry({ open: 'settings' }); }, []);
  const endOnboarding = useCallback(({ text } = {}) => {
    if (!redo) return;   // 처음 온보딩은 지금처럼 스플래시로 들어간다(스낵바 없음)
    const prev = redo.prev;
    setRedo(null);
    setEntry({ toast: { text, undo: () => SUPPORTED_SERIES.forEach((id) => setSeriesMode(id, prev[id] || 'off')) } });
  }, [redo, setSeriesMode]);
  const onEntryDone = useCallback(() => setEntry(null), []);

  // 공유 주소로 들어왔으면 온보딩보다 상세를 먼저 보여준다. 상세를 닫으면 평소 온보딩이 나온다.
  // (온보딩 화면 자체는 그대로다 — 여기서 순서만 바꾼다.)
  const [shareFirst, setShareFirst] = useState(hasRaceLinkInPath);
  const onShareLinkDone = useCallback(() => setShareFirst(false), []);

  // 언어·시간대·국가는 preferences에서. 바꾸면 컨텍스트가 갱신돼 즉시 반영된다.
  const shellProps = { theme, setTheme, themePref, onShareLinkDone, startRedo, entry, onEntryDone, ...prefs };
  const screen = redo
    ? <OnboardingScreen {...prefs} rerun onClose={closeRedo} onEnd={endOnboarding} />
    : !prefs.preferences.onboarded && !shareFirst
      ? <OnboardingScreen {...prefs} onEnd={endOnboarding} />
      : isWeb ? <WebApp {...shellProps} /> : <App {...shellProps} />;
  return (
    <FormatProvider locale={prefs.preferences.locale} timeZone={prefs.preferences.timezone} country={prefs.preferences.country}>
      {/* 서킷 맵 레이어는 모바일·웹 셸 바깥에 둔다 — 창 크기로 셸이 바뀌어도 지도와 상태가 유지된다. */}
      <CircuitMapProvider setTheme={setTheme}>
        {/* UX v2 토큰의 루트(tokens-v2.css). 상자를 만들지 않아(display: contents) 지금 셸 배치는 그대로다.
            body로 포털하는 새 부품(시트·스낵바)은 이 안의 레이어로 포털한다. 서킷 맵(#cm)은 바깥이라 :root 토큰 그대로. */}
        <div className="gx" style={{ display: 'contents' }}>
          {screen}
          <DemoClockSheet />
          <div id="gx-layer" className="gx-layer" />
        </div>
      </CircuitMapProvider>
    </FormatProvider>
  );
}

// 모바일 셸(UX v2 SPEC 8장): 탭 4개 + 화면 스택(상세·시리즈 상세·설정). 탭 화면은 지금처럼 한 스크롤 상자 + 탭별 스크롤 기억.
// 스택 화면은 들어올 때 260ms 감속, 나갈 때 180ms 가속(그동안 아래 화면이 보인다). 닫히면 연 요소로 포커스를 돌려준다.
// Esc = 뒤로(시트가 열려 있으면 시트가, 서킷 맵이 열려 있으면 지도가 먼저). 지금 탭을 다시 누르면 맨 위로.
function App({ theme, setTheme, themePref, onShareLinkDone, startRedo, entry, onEntryDone, ...prefs }) {
  const { preferences } = prefs;
  const [view, setView] = useState('home');
  const [categoryFilter, setCategoryFilter] = useState(null);
  // 온보딩 다시 하기를 X로 닫고 돌아오면 설정부터(entry)
  const [stack, setStack] = useState(() => (entry?.open === 'settings' ? [{ t: 'settings' }] : []));   // [{ t: 'detail', id } | { t: 'settings' } | { t: 'series', cat }]
  const [leaving, setLeaving] = useState(false);      // 맨 위 화면이 나가는 180ms 동안
  const [favorites, setFavorites] = useState(() => storage.favorites.read());
  const [now, setNow] = useState(() => getCurrentNow());
  const [tweaks, setTweaks] = useState(false);
  const shell = useShellCore();
  const rootRef = useRef(null);
  const schedule = useScheduleData(now);
  const raceList = useMemo(() => (Array.isArray(schedule.races) ? schedule.races : []), [schedule.races]);
  const safeSeasonYear = Number.isFinite(schedule.seasonYear)
    ? schedule.seasonYear
    : Number((raceList.find((race) => race?.raceDateKst)?.raceDateKst || '').slice(0, 4)) || 2026;
  // 주소(/race/<id>)·탭 제목이 따라가는 경기: 스택에서 가장 위에 있는 상세
  const detailRoute = [...stack].reverse().find((r) => r.t === 'detail') || null;
  const openRace = detailRoute ? raceList.find((race) => race.id === detailRoute.id) || null : null;
  const myRaces = useMemo(() => filterRacesByPreferences(raceList, preferences, favorites), [raceList, preferences, favorites]);

  useEffect(() => {
    const i = setInterval(() => setNow(getCurrentNow()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => { storage.favorites.write(favorites); }, [favorites]);

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

  // ---------- 화면 스택 ----------
  const openers = useRef([]);       // 스택 화면을 연 요소들 — 닫힐 때 하나씩 포커스를 되돌린다
  const refocus = useRef(null);     // 다음 커밋 뒤 포커스 갈 곳(요소 | 'title' | 'pushed')
  const leavingRef = useRef(false);
  const push = useCallback((route) => {
    openers.current.push(activeElement());
    refocus.current = 'pushed';
    setStack((s) => [...s, route]);
  }, []);
  const back = useCallback(() => {
    if (leavingRef.current) return;
    const done = () => {
      refocus.current = openers.current.pop() || 'title';
      leavingRef.current = false;
      setLeaving(false);
      setStack((s) => s.slice(0, -1));
    };
    if (prefersReducedMotion()) { done(); return; }
    leavingRef.current = true;
    setLeaving(true);
    setTimeout(done, 180);
  }, []);
  // 스택이 바뀐 뒤: 닫혔으면 연 요소로(사라졌으면 화면 제목), 넣었으면 새 화면 제목으로(상세는 RaceDetailV2가 제목으로 직접)
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const root = rootRef.current;
    if (target === 'pushed') {
      const top = root && [...root.querySelectorAll('.gx-stack:not([hidden])')].pop();
      if (top && !top.contains(document.activeElement)) top.querySelector('[data-view-title]')?.focus({ preventScroll: true });
      return;
    }
    focusBack(target, root || document);
  }, [stack]);

  // source: 어느 화면에서 열었는지. 화면별 래퍼가 기본값을 주고, 추천 카드는 'recommendation'을 직접 넘긴다.
  const openFrom = useCallback((race, source, extra) => {
    track('race_opened', { series: race.series, source, ...extra });
    push({ t: 'detail', id: race.id });
  }, [push]);
  const onOpenRace = useCallback((race, source = 'home', extra) => openFrom(race, source, extra), [openFrom]);
  const openFromSchedule = useCallback((race) => openFrom(race, 'schedule'), [openFrom]);
  const openFromSeries = useCallback((race) => openFrom(race, 'series'), [openFrom]);
  const openFromSaved = useCallback((race, source = 'saved') => openFrom(race, source), [openFrom]);
  // 공유 주소(/race/<id>): 들어오면 그 상세를 열고, 열고 닫을 때 주소를 맞춘다.
  useRaceLink({ races: raceList, ready: !schedule.loading, openRace, openFrom, onDone: onShareLinkDone });

  // ---------- 탭 ----------
  // 탭 전환: 떠나기 전 scrollTop 저장 → View Transition(지원 시) 안에서 동기 커밋 → 복원은 useScrollMemory의 layout effect.
  const scrollRef = useRef(null);
  const saveScroll = useScrollMemory(view, scrollRef);
  useFocusViewTitle(view);
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const stackRef = useRef(stack);
  useEffect(() => { stackRef.current = stack; }, [stack]);
  const onGo = useCallback((v, arg) => {
    if (v === 'settings') { push({ t: 'settings' }); return; }
    // 지금 탭을 다시 누르면 맨 위로(스택이 없을 때)
    if (v === viewRef.current && !stackRef.current.length && v !== 'series') {
      scrollRef.current?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      return;
    }
    saveScroll(viewRef.current);
    openers.current = [];
    withViewTransition(() => {
      setStack([]);
      if (v === 'series') { setCategoryFilter(arg); setView('series'); }
      else setView(v);
    }, flushSync);
  }, [saveScroll, push]);

  // Esc = 뒤로. 시트는 자기 Esc를 먼저 잡고(stopPropagation), 서킷 맵이 열려 있으면(html.cm-open) 지도가 먼저.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || shell.sheet) return;
      if (document.documentElement.classList.contains('cm-open')) return;
      if (stackRef.current.length) back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back, shell.sheet]);

  useScrollEdges(rootRef);
  useDevShellHook(shell);
  // 온보딩 다시 하기를 마치고 돌아오면 스낵바 + 되돌리기(entry, 한 번)
  const entryRef = useRef(entry);
  useEffect(() => {
    const e = entryRef.current;
    if (!e) return;
    if (e.toast) shell.toast(e.toast.text, { label: t(preferences.locale || 'ko', 'toast.undo'), fn: e.toast.undo });
    onEntryDone?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const covered = stack.length > 0;
  const top = stack[stack.length - 1];
  const ctx = useMemo(() => ({
    push, back, openSettings: () => push({ t: 'settings' }), openSheet: shell.openSheet, toast: shell.toast, mem: shell.mem, desktop: false, go: (v, arg) => onGo(v, arg),
  }), [push, back, onGo, shell.openSheet, shell.toast, shell.mem]);
  const route = (r, isTop) => {
    if (r.t === 'detail') {
      const race = raceList.find((x) => x.id === r.id);
      return race ? <RaceDetailV2 race={race} now={now} races={raceList} onOpenRace={onOpenRace} onClose={isTop ? back : () => {}} favorites={favorites} toggleFav={toggleFav} preferences={preferences} /> : null;
    }
    if (r.t === 'settings') return <SettingsScreen preferences={preferences} themePref={themePref} onRedo={startRedo} />;
    if (r.t === 'series') return (
      <>
        <div className="gx-stack-bar"><button type="button" className="gx-iconbtn" aria-label={t(preferences.locale || 'ko', 'aria.back')} onClick={back}><Icon n="back" /></button></div>
        <SeriesScreen races={raceList} onOpenRace={openFromSeries} now={now} preferences={preferences} seasonYear={safeSeasonYear} initialCategory={r.cat || undefined} />
      </>
    );
    return null;
  };
  const mobileBottomNavSpace = 'calc(92px + env(safe-area-inset-bottom, 0px))';

  return (
    <ShellContext.Provider value={ctx}>
    <div ref={rootRef} style={{
      position: 'relative',
      width: '100%',
      height: '100dvh',
      overflow: 'hidden',
      background: 'var(--bg)',
      color: 'var(--text)',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* 탭 화면 — 스택이 덮고 있으면 inert(나가는 동안은 아래에서 미리 보인다) */}
      <div ref={scrollRef} data-scroll="" inert={covered || undefined} aria-hidden={covered || undefined} style={{
        height: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: mobileBottomNavSpace,
      }}>
        {view === 'home' && <Home theme={theme} setTheme={setTheme} now={now} races={raceList} myRaces={myRaces} preferences={preferences} favorites={favorites} toggleFav={toggleFav} onOpenRace={onOpenRace} onGo={onGo} setSeriesMode={prefs.setSeriesMode} />}
        {view === 'schedule' && <ScheduleScreen races={raceList} onOpenRace={openFromSchedule} now={now} preferences={preferences} seasonYear={safeSeasonYear} />}
        {view === 'series' && <SeriesScreen races={raceList} onOpenRace={openFromSeries} now={now} preferences={preferences} seasonYear={safeSeasonYear} initialCategory={categoryFilter || undefined} />}
        {view === 'fav' && <FavoritesScreen races={raceList} myRaces={myRaces} now={now} preferences={preferences} favorites={favorites} onOpenRace={openFromSaved} toggleFav={toggleFav} />}
      </div>

      {/* 화면 스택: 맨 위만 보이고, 나가는 동안은 바로 아래도 보인다 */}
      {stack.map((r, i) => {
        const isTop = i === stack.length - 1;
        const visible = isTop || (leaving && i === stack.length - 2);
        return (
          <div key={`${i}-${r.t}-${r.id || r.cat || ''}`} className={`gx-stack${r.t === 'detail' ? ' is-detail' : r.t === 'settings' ? ' is-own' : ''}${leaving && isTop ? ' is-out' : ''}`}
            hidden={!visible} inert={!isTop || undefined}>
            {route(r, isTop)}
          </div>
        );
      })}

      {!covered && <TabBar view={view} onGo={onGo} />}

      {tweaks && <TweaksPanel theme={theme} setTheme={setTheme} onClose={() => setTweaks(false)} />}

      <ShellSheets sheet={shell.sheet} onClose={shell.closeSheet} prefs={prefs} themePref={themePref} setTheme={setTheme} toast={shell.toast} />
      <Snackbar msg={shell.snack} onHold={shell.holdSnack} hidden={!!shell.sheet}
        placement={!covered ? 'tabbar' : top?.t === 'detail' ? 'bar' : 'bottom'} />
    </div>
    </ShellContext.Provider>
  );
}

// 떠 있는 탭 바(결정 6의 캡슐 모양은 그대로). AI 티 정리(K4·K6, 2026-10-29):
// 흐림·그라데이션 대신 불투명 면 + 옅은 그림자, 고른 탭은 흰·검 알약 대신 한 단계 밝은 면, 즐겨찾기 개수 배지 없음, 아이콘 24 · 글자 12.
function TabBar({ view, onGo }) {
  const tr = useT();
  const tabs = [
    { id: 'home', label: tr('nav.home'), icon: 'home' },
    { id: 'schedule', label: tr('nav.schedule'), icon: 'cal' },
    { id: 'series', label: tr('nav.series'), icon: 'grid' },
    { id: 'fav', label: tr('nav.fav'), icon: 'heart' },
  ];
  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70, viewTransitionName: 'nav-chrome',
      padding: '8px 14px calc(12px + env(safe-area-inset-bottom, 0px))',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 4,
        background: 'var(--tabbar)', boxShadow: 'var(--tabbar-shadow)', borderRadius: 'var(--r-sheet)', padding: 4,
        pointerEvents: 'auto',
      }}>
        {tabs.map(tab => {
          const active = view === tab.id;
          return (
            <button key={tab.id} onClick={() => onGo(tab.id)} aria-current={active ? 'page' : undefined} style={{
              background: 'transparent', color: active ? 'var(--text)' : 'var(--text3)',
              border: 0, borderRadius: 14, padding: '7px 4px 6px', minHeight: 52,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              cursor: 'pointer', fontFamily: 'inherit', position: 'relative', isolation: 'isolate',
            }}>
              {/* 선택 면만 담당하는 레이어. view-transition-name이 여기에만 붙어 아이콘·글자는 스냅샷에 안 잡힌다. */}
              {active && <span aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, borderRadius: 14, background: 'var(--tab-on)', viewTransitionName: 'nav-pill' }} />}
              {/* 아이콘·라벨은 자체 그룹으로 캡처한다. 선택 면보다 나중에 그려져 전환 중에도 위에 남는다. */}
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, viewTransitionName: `tab-${tab.id}` }}>
                <TabIcon type={tab.icon} />
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 600 }}>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TabIcon({ type }) {
  const p = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (type === 'home') return <svg {...p}><path d="M3 10l9-7 9 7v11a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V10z"/></svg>;
  if (type === 'cal') return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
  if (type === 'grid') return (
    <svg {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
  if (type === 'heart') return <svg {...p}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
  return null;
}

function TweaksPanel({ theme, setTheme, onClose }) {
  const t = TOKENS[theme];
  const tr = useT();
  return (
    <div style={{
      position: 'absolute', right: 12, bottom: 100, zIndex: 90,
      background: theme === 'dark' ? t.surface2 : t.surface,
      border: `1px solid ${t.line2}`, borderRadius: 'var(--r-sheet)',
      padding: 14, width: 220,
      boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
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
