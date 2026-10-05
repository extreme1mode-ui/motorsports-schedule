// 데모 시계 — 데모 빌드(VITE_DEMO_CLOCK=1)에서만 켜진다. 앱 전체의 Date를 원하는 순간으로 옮긴다.
// main.jsx가 가장 먼저 import해야 한다 (다른 모듈이 평가될 때 이미 Date가 바뀌어 있도록).
// 바꾸면 'gantry:clock' 이벤트를 쏜다 → 일정 데이터가 새 시각으로 상태(LIVE·NEXT)를 다시 계산한다.
import { storage } from '../storage/index.js';

const ENABLED = import.meta.env.VITE_DEMO_CLOCK === '1';
const RealDate = Date;
// 기본 데모 시각: 싱가포르 GP 토요일 17:40 KST (스프린트 20분 전)
const DEFAULT_AT = RealDate.UTC(2026, 9, 10, 8, 40);
const subs = new Set();
let st = null;   // { base, at, speed } | null(실제 시각)

if (ENABLED) {
  st = storage.demoClock.read();
  if (st === null) st = { base: DEFAULT_AT, at: RealDate.now(), speed: 1 };
  else if (st.real) st = null;
  class DemoDate extends RealDate {
    constructor(...args) { if (args.length === 0) super(demoClock.now()); else super(...args); }
    static now() { return demoClock.now(); }
  }
  globalThis.Date = DemoDate;
}

function emit() {
  subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  window.dispatchEvent(new Event('gantry:clock'));
}

export const demoClock = {
  enabled: ENABLED,
  get active() { return ENABLED && st !== null; },
  get speed() { return st ? st.speed : 1; },
  now() { const r = RealDate.now(); return st ? st.base + (r - st.at) * st.speed : r; },
  set(t, speed = 1) {
    if (!ENABLED) return;
    st = { base: t, at: RealDate.now(), speed };
    storage.demoClock.write(st);
    emit();
  },
  real() {
    if (!ENABLED) return;
    st = null;
    storage.demoClock.write({ real: true });
    emit();
  },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
};
