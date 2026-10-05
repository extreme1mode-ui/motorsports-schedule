// 라이브 서킷 맵 — 한 경기의 전체 화면 모드. 탭이 아니다.
//   진입: 경기 상세의 '현장 · ON SITE' 카드, 홈 히어로 아래 현장 줄('현장에 가요'를 켠 경기, 주말 동안만).
//   나가기: 뒤로 버튼(모바일 캡슐 왼쪽 / 데스크톱 패널 맨 위) · Esc(지도 안 레이어가 없을 때) · 브라우저 뒤로.
//   나오면 들어오기 직전 화면 그대로(상세·스크롤 유지), 포커스는 누른 버튼으로.
// 시계·테마는 앱 것 하나를 같이 쓴다. 지도 상태는 storage.circuitMap(레지스트리)에만 저장한다.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './circuit-map.css';
import './entry.css';
import './basemap.css';
import { GantryMap } from './map-core.js';
import { MAP_MARKUP } from './map-markup.js';
import BASE from './base.json';
import { storage } from '../storage/index.js';
import { demoClock } from '../demo/clock.js';
import { useT } from '../i18n/index.js';
import { useFormat } from '../use-format.js';
import { track } from '../analytics.js';

// 지금 지도가 있는 경기: 2026 싱가포르 GP 하나.
export function hasMap(race) {
  if (!race || race.series !== 'F1') return false;
  if (!String(race.raceDateKst || race.weekendStart || '').startsWith('2026')) return false;
  return /Marina Bay|마리나 베이|Singapore/i.test([race.circuit, race.circuitKo, race.city].join(' '));
}

// 지도 코어가 쓰는 저장소. 레지스트리의 한 레코드(JSON 객체) 안에 키별로 둔다.
const mapStore = {
  get(k, d) { const o = storage.circuitMap.read(); return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : d; },
  set(k, v) { const o = storage.circuitMap.read(); o[k] = v; storage.circuitMap.write(o); },
  del(k) { const o = storage.circuitMap.read(); delete o[k]; storage.circuitMap.write(o); },
};

const Ctx = createContext(null);
export const useCircuitMap = () => useContext(Ctx);

export function CircuitMapProvider({ setTheme, children }) {
  const [open, setOpen] = useState(null);            // { raceId, from: 'detail' | 'home' } | null
  const [attend, setAttend] = useState(() => storage.attend.read());
  const [ticket, setTicket] = useState(() => mapStore.get('ticketInfo', null));
  const openerRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => { storage.attend.write(attend); }, [attend]);

  const openMap = useCallback((race, from) => {
    openerRef.current = document.activeElement;
    track('circuit_map_opened', { race_id: race.id, source: from });
    setOpen({ raceId: race.id, from });
    // 지도는 히스토리 한 칸: 브라우저/OS 뒤로 = 나가기.
    try { history.pushState({ ...(history.state || {}), gantryMap: race.id }, ''); pushedRef.current = true; } catch { pushedRef.current = false; }
  }, []);
  const closeMap = useCallback(() => {
    if (pushedRef.current && history.state?.gantryMap) { history.back(); return; }   // popstate가 닫는다
    pushedRef.current = false;
    setOpen(null);
  }, []);
  useEffect(() => {
    const onPop = () => { if (!history.state?.gantryMap) { pushedRef.current = false; setOpen(null); } };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const toggleAttend = useCallback((race) => {
    setAttend((prev) => {
      const next = new Set(prev);
      if (next.has(race.id)) next.delete(race.id); else next.add(race.id);
      track(next.has(race.id) ? 'attend_on' : 'attend_off', { race_id: race.id });
      return next;
    });
  }, []);

  const onTicket = useCallback((info) => { mapStore.set('ticketInfo', info); setTicket(info); }, []);

  const value = useMemo(() => ({ open, openMap, closeMap, attend, toggleAttend, ticket, onTicket, openerRef, setTheme }),
    [open, openMap, closeMap, attend, toggleAttend, ticket, onTicket, setTheme]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <CircuitMapLayer />
    </Ctx.Provider>
  );
}

// ---------- 전체 화면 레이어 (body에 포털, 한 번 만들면 계속 재사용) ----------
function CircuitMapLayer() {
  const ctx = useCircuitMap();
  const tr = useT();
  const elRef = useRef(null);
  const apiRef = useRef(null);
  const live = useRef({});
  live.current = { ctx, tr };
  const isOpen = !!ctx.open;
  const [phase, setPhase] = useState('closed');       // 'in' | 'open' | 'out' | 'closed'
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) { setPrevOpen(isOpen); setPhase(isOpen ? 'in' : (phase === 'closed' ? 'closed' : 'out')); }

  const HOST = useMemo(() => ({
    CK: { get demo() { return demoClock.active; }, get speed() { return demoClock.speed; } },
    setClock: (t, speed) => demoClock.set(t, speed ?? 1),
    setReal: () => demoClock.real(),
    onClock: (fn) => demoClock.subscribe(fn),
    active: () => !!live.current.ctx.open,
    exit: () => live.current.ctx.closeMap(),
    exitLabel: () => live.current.tr(live.current.ctx.open?.from === 'home' ? 'cm.back.home' : 'cm.back.detail'),
    exitAria: () => { const { tr: t, ctx: c } = live.current; return t('cm.backAria', { to: t(c.open?.from === 'home' ? 'cm.back.home' : 'cm.back.detail') }); },
    setTheme: (v) => live.current.ctx.setTheme?.(v),
    onTicket: (info) => live.current.ctx.onTicket(info),
    store: mapStore,
  }), []);

  // 열기: 레이어를 보이게 → (처음 한 번) 마크업·코어 생성 → enter → 포커스
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el || !isOpen) return;
    el.hidden = false;
    if (!apiRef.current) { el.innerHTML = MAP_MARKUP; apiRef.current = GantryMap(HOST, BASE); }
    apiRef.current.enter();
    document.documentElement.classList.add('cm-open');
    const root = document.getElementById('root'); if (root) root.inert = true;
    const b = window.matchMedia('(min-width:900px)').matches ? el.querySelector('#b-exit-d') : el.querySelector('#b-exit');
    b?.focus({ preventScroll: true });
  }, [isOpen, HOST]);

  // 닫기: 지도 안 오버레이 정리 → 퇴장 애니메이션 → 숨김 → 포커스를 누른 버튼으로
  useEffect(() => {
    if (isOpen) return;
    apiRef.current?.closeOverlays();
    const root = document.getElementById('root'); if (root) root.inert = false;
    document.documentElement.classList.remove('cm-open');
    const op = ctx.openerRef.current;
    if (op && op.isConnected && typeof op.focus === 'function') op.focus({ preventScroll: true });
    ctx.openerRef.current = null;
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'out') return undefined;
    const t = setTimeout(() => setPhase('closed'), 600);   // animationend가 안 오는 환경 폴백
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => { if (phase === 'closed' && elRef.current) elRef.current.hidden = true; }, [phase]);

  const onAnimationEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (phase === 'in') setPhase('open');
    else if (phase === 'out') setPhase('closed');
  };

  return createPortal(
    <div id="cm" ref={elRef} hidden role="dialog" aria-modal="true" aria-label={tr('cm.title')}
      className={phase === 'in' ? 'cm-in' : phase === 'out' ? 'cm-out' : undefined} onAnimationEnd={onAnimationEnd} />,
    document.body,
  );
}

// ---------- 미니 서킷 (base.json 트랙 좌표 그대로, 비율만 맞춤) ----------
const MINI = (() => {
  const pts = BASE.track.pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const w = x1 - x0, h = y1 - y0, pad = Math.max(w, h) * 0.06;
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x - x0 + pad).toFixed(0)} ${(y - y0 + pad).toFixed(0)}`).join('') + 'Z';
  return { d, vb: `0 0 ${(w + pad * 2).toFixed(0)} ${(h + pad * 2).toFixed(0)}` };
})();

function MiniCircuit() {
  return (
    <svg className="cme-mini" viewBox={MINI.vb} aria-hidden="true" focusable="false">
      <path d={MINI.d} className="cme-mini-c" />
      <path d={MINI.d} className="cme-mini-t" />
    </svg>
  );
}

// ---------- 진입점 1: 경기 상세의 '현장 · ON SITE' 카드 ----------
export function CircuitMapSection({ race, variant = 'sheet' }) {
  const ctx = useCircuitMap();
  const tr = useT();
  if (!ctx || !hasMap(race) || race.status === 'cancelled') return null;
  const going = ctx.attend.has(race.id);
  const tk = ctx.ticket;
  return (
    <section className={`cme cme--${variant}`}>
      <span className="cme-lbl">{tr('cm.section')}</span>
      <div className="cme-card">
        <div className="cme-top">
          <MiniCircuit />
          <div className="cme-tx">
            <b>{tr('cm.title')}</b>
            <span>{tk ? tr('cm.ticket', { name: tk.name, zone: tk.zl }) : tr('cm.sub')}</span>
          </div>
        </div>
        <div className="cme-act">
          <button type="button" className="cme-btn cme-btn--fill" onClick={() => ctx.openMap(race, 'detail')}>
            <MapIcon />{tr('cm.open')}
          </button>
          <button type="button" className="cme-btn cme-btn--line" aria-pressed={going} onClick={() => ctx.toggleAttend(race)}>
            {going && <CheckIcon />}{tr('cm.attend')}
          </button>
        </div>
        {going && <p className="cme-note">{tr('cm.attendNote')}</p>}
      </div>
    </section>
  );
}

// ---------- 진입점 2: 홈 히어로 아래 현장 줄 ----------
// 보이는 조건: 히어로가 지도 있는 경기 · '현장에 가요' 켬 · 주말 시작 하루 전 00:00 ~ 주말 마지막 날 23:59(사용자 시간대).
const shiftKey = (key, days) => { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

export function HeroSiteRow({ race, now }) {
  const ctx = useCircuitMap();
  const tr = useT();
  const fmt = useFormat();
  if (!ctx || !hasMap(race) || !ctx.attend.has(race.id)) return null;
  if (race.status === 'cancelled' || !race.weekendStart || !race.weekendEnd) return null;
  const at = now instanceof Date ? now : new Date();
  const today = fmt.dateKey(at);
  if (today < shiftKey(race.weekendStart, -1) || today > race.weekendEnd) return null;

  // 다음 세션 카운트다운은 히어로 이유 줄이 이미 보여준다 — 여기서는 현장 정보(내 티켓)만.
  const tk = ctx.ticket;
  const status = tk ? tr('cm.ticket', { name: tk.name, zone: tk.zl }) : tr('cm.row.preview');
  return (
    <button type="button" className="hero2-site" onClick={() => ctx.openMap(race, 'home')}>
      <span className="hs-l"><MapIcon /><span className="hs-lbl">{tr('cm.row.label')}</span></span>
      <span className="hs-st">{status}</span>
      <svg className="hs-ch" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
  );
}

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  );
}
