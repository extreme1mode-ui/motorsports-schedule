// '한 바퀴' — 서킷을 한 손가락으로 한 바퀴 달려 보는 전체 화면 레이어.
// 신호등 다섯 개가 1초마다 하나씩 켜졌다 모두 꺼지면 누른다(반응 시간도 기록에 들어간다). 누르고 있으면 달리고, 진하게 칠한 구간에서는 손을 뗀다.
// 그림은 캔버스 한 장, 글자는 DOM. 매 프레임 바뀌는 숫자(시간·속도)는 DOM에 바로 쓴다(리렌더 없음).
// 준비·결과·멈춤에서는 서킷 전체를 북쪽이 위로 보여 주고, 달리는 동안은 차를 따라간다(진행 방향이 위, 줄인 움직임이면 북쪽이 위).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './lap.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track as trackEvent } from '../analytics.js';
import { Icon } from '../ui2/Icon.jsx';
import { Roll } from '../ui2/parts.jsx';
import { getLayer, arrowPick } from '../ui2/hooks.js';
import { GantryLockup } from '../Brand.jsx';
import { drawShareCard } from './share-card.js';
import { HALF_W, newRun, step, poseAt, formatLap } from './engine.js';
import { drawCar, carColors, steerOf } from './car.js';
import { GHOST_EVERY, timeAt, posAt, compareSectors, offCorners, zonesOf, simLap } from './analysis.js';
import { useLapConfig, lapDiff } from './config.js';
import { demoApi } from './demo.js';
import { LAP_SAVE, lapHaptic, lapSaveImage } from './lap-platform.js';
import { lapTrackOf, preparedTrack, lapRecords, saveLap, useOpenLap, closeLap, outlinePath, writeLapRecords, isFirstVisit } from './store.js';

const LIGHTS = 5;
const LIGHT_EVERY = 1000;                  // 신호등 하나가 켜지는 간격(ms). 실제 F1도 1초마다 하나씩 켜진다
const DT = 1 / 120;
const CAR_AY = 0.62;                       // 차 자리: 무대 높이의 62%. 아래쪽은 엄지가 덮어도 되는 곳
const lookAhead = (v) => 150 + 2.6 * v;    // 차 앞으로 보는 거리(m). 시속 330km(92m/s)에서 389m, 4.2초 앞
const css = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
const wrapS = (s, L) => ((s % L) + L) % L;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const reducedMotion = (c) => c?.motion === 'reduce' || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const lerp = (a, b, f) => a + (b - a) * f;
const OVERVIEW = new Set(['ready', 'done', 'practiceDone']);
const PRESSABLE = new Set(['lights', 'wait', 'go', 'run', 'practice']);

export function LapLayer() {
  const id = useOpenLap();
  if (!id || !lapTrackOf(id)) return null;
  return createPortal(<LapGame key={id} id={id} onClose={closeLap} />, getLayer());
}

function LapGame({ id, onClose }) {
  const tr = useT(); const fmt = useFormat(); const cfg = useLapConfig();
  const meta = lapTrackOf(id);
  const L = fmt.race(meta.race);
  const tk = preparedTrack(id, lapDiff(cfg));
  const [phase, setPhase] = useState('ready');     // ready · practice · practiceDone · lights · wait · go · run · paused · done
  const [lit, setLit] = useState(0);
  const [msgKey, setMsgKey] = useState(null);
  const [reactMs, setReactMs] = useState(0);
  const [delta, setDelta] = useState(null);        // { sec, ahead }
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(() => lapRecords()[id]?.best ?? null);
  const [firstRun, setFirstRun] = useState(() => isFirstVisit());
  const [card, setCard] = useState(null);          // { fmt, url, canvas, note }
  const lockRef = useRef(null); const primary = useRef(null); const cardRef = useRef(null);

  const root = useRef(null); const canvas = useRef(null);
  const timeEl = useRef(null); const speedEl = useRef(null); const pedalEl = useRef(null); const nextEl = useRef(null); const dotEl = useRef(null); const barEl = useRef(null);
  // 위 줄의 작은 전체 그림(84×56): 트랙 좌표 → 그림 좌표
  const mini = useMemo(() => {
    const [x0, y0, x1, y1] = tk.box; const w = 84, h = 56, pad = 5;
    const k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0));
    const ox = (w - (x1 - x0) * k) / 2, oy = (h - (y1 - y0) * k) / 2;
    return { d: outlinePath(id, w, h, pad), at: (x, y) => [(x - x0) * k + ox, (y - y0) * k + oy] };
  }, [id, tk]);
  const g = useRef(null);   // 게임 상태(리렌더와 무관)
  if (!g.current) {
    g.current = { tk, zones: zonesOf(tk), run: newRun(), phase: 'ready', down: false, t0: 0, react: 0, acc: 0, last: 0, ghost: [], ghostNext: 0,
      best: lapRecords()[id]?.ghost || null, cam: null, from: null, mode: null, colors: null, theme: null, timers: [], raf: 0, frozen: false,
      coachIdx: 0, cueUntil: 0, cue: null, reactUntil: 0, deltaUntil: 0, deltaNext: 0, marks: [], rear: null, steer: 0, yaw: 0, msgKey: null,
      practiceEnd: 0, pausedFrom: null, resultMarks: null, prevFrame: 0, cfg, firstRun };
  }
  const setP = useCallback((p) => { g.current.phase = p; setPhase(p); }, []);
  const clearTimers = () => { g.current.timers.forEach(clearTimeout); g.current.timers = []; };
  const later = (fn, ms) => { g.current.timers.push(setTimeout(fn, ms)); };
  const buzz = useCallback((kind) => { if (g.current.cfg.haptic === 'on') lapHaptic(kind); }, []);
  // 처음 배우는 사람에게 때를 알려 줄 진한 구간 두 곳(출발 직후 30m 안에서 시작하는 구간은 건너뛴다)
  const coachZones = () => g.current.zones.filter((z) => z.s0 > 30).slice(0, 2);

  const resetRun = () => {
    const s = g.current;
    s.run = newRun(); s.ghost = []; s.ghostNext = 0; s.acc = 0; s.down = false; s.react = 0; s.frozen = false;
    s.coachIdx = 0; s.cue = null; s.cueUntil = 0; s.reactUntil = 0; s.deltaUntil = 0; s.deltaNext = 0; s.marks = []; s.rear = null; s.yaw = 0; s.steer = 0; s.resultMarks = null;
    setResult(null); setDelta(null);
  };

  // 설정은 그리기 루프가 읽는다. 난이도를 바꾸면 트랙(진한 구간 · 코너 한계)이 바뀌고, 달리던 중이면 준비로 돌아간다
  useEffect(() => { g.current.cfg = cfg; g.current.firstRun = firstRun; }, [cfg, firstRun]);
  useEffect(() => { const s = g.current; if (s.tk !== tk) { s.tk = tk; s.tkChanged = true; } }, [tk]);

  // ---------- 신호등 ----------
  const startLights = useCallback(() => {
    clearTimers(); resetRun(); setLit(0); setP('lights');
    for (let i = 1; i <= LIGHTS; i += 1) later(() => setLit(i), LIGHT_EVERY * i);
    const hold = 400 + Math.random() * 1800;     // 다 켜진 뒤 꺼질 때까지: 0.4~2.2초 사이 아무 때나
    later(() => { setLit(0); g.current.t0 = performance.now(); setP('go'); }, LIGHT_EVERY * LIGHTS + hold);
  }, [setP]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 연습(배우는 방법 '연습 구간'): 시간을 재지 않고 첫 진한 구간 두 곳까지 ----------
  const startPractice = useCallback(() => {
    clearTimers(); resetRun();
    const z = coachZones(); const s = g.current;
    s.practiceEnd = z.length ? z[z.length - 1].s1 + 120 : 600;
    s.last = performance.now(); setP('practice');
  }, [setP]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(() => {
    const s = g.current; const tkk = s.tk; const run = s.run;
    const ms = Math.round(s.react + run.t * 1000);
    const prev = lapRecords()[id] || null;
    const cmp = prev?.ghost ? compareSectors(tkk, s.ghost, prev.ghost, ms / 1000, prev.best / 1000) : null;
    const offList = offCorners(tkk, run.offAt);
    const saved = saveLap(id, { ms, react: Math.round(s.react), ghost: s.ghost.map((v) => Math.round(v)) });
    if (saved.best) { s.best = s.ghost.slice(); setBest(ms); }
    s.resultMarks = { offAt: run.offAt.slice(), sector: saved.best ? cmp?.gained : cmp?.lost };
    trackEvent('lap_finished', { track: id, ms, offs: run.offCount, best: saved.best });
    buzz('finish');
    setResult({ ms, react: Math.round(s.react), vmax: Math.round(run.vmax * 3.6), offs: run.offCount, offList, cmp, isBest: saved.best, prev: saved.prev });
    setFirstRun(false); setDelta(null);
    setP('done');
  }, [id, setP, buzz]);

  // ---------- 누르기 ----------
  const press = useCallback((isDown) => {
    const s = g.current;
    if (isDown && s.phase === 'lights') {          // 부정 출발
      clearTimers(); setLit(0); trackEvent('lap_jump_start', { track: id });
      setP('wait'); later(() => startLights(), 1600);
      return;
    }
    if (isDown && s.phase === 'go') { s.react = performance.now() - s.t0; s.last = performance.now(); s.reactUntil = performance.now() + 1400; setReactMs(Math.round(s.react)); setP('run'); }
    if (isDown && s.frozen) { s.frozen = false; s.last = performance.now(); s.acc = 0; }
    s.down = isDown;
  }, [id, setP, startLights]); // eslint-disable-line react-hooks/exhaustive-deps

  // 멈춤: 창이 가려지면(다른 앱 · 탭 · 화면 꺼짐) 달리던 중이면 멈추고, 신호등 중이면 준비로 돌아간다
  const pauseNow = useCallback(() => {
    const s = g.current; s.down = false;
    if (s.phase === 'run' || s.phase === 'practice') { s.pausedFrom = s.phase; setP('paused'); }
    else if (s.phase === 'lights' || s.phase === 'go' || s.phase === 'wait') { clearTimers(); setLit(0); setP('ready'); }
  }, [setP]); // eslint-disable-line react-hooks/exhaustive-deps
  const resume = () => { const s = g.current; s.last = performance.now(); s.acc = 0; s.down = false; setP(s.pausedFrom || 'run'); };
  const restart = () => { if (g.current.pausedFrom === 'practice') startPractice(); else startLights(); };
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') pauseNow(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pauseNow]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (card) setCard(null); else onClose(); return; }
      if (e.key !== ' ' && e.key !== 'ArrowUp') return;
      if (!PRESSABLE.has(g.current.phase)) return;   // 준비 · 결과 · 멈춤에서는 버튼이 스페이스를 받는다
      e.preventDefault();
      if (e.type === 'keydown' && e.repeat) return;
      press(e.type === 'keydown');
    };
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); };
  }, [press, onClose, card]);
  useEffect(() => { trackEvent('lap_opened', { track: id }); return () => clearTimers(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // 카드가 뜨면 주 버튼으로 포커스(스페이스 · 엔터로 바로 누를 수 있게)
  useEffect(() => { if (!PRESSABLE.has(phase)) primary.current?.focus({ preventScroll: true }); }, [phase, firstRun]);

  // ---------- 데모 빌드 전용: 자동 시험과 조절 판이 상태를 읽고 바꾼다(실서비스 빌드에는 없다) ----------
  useEffect(() => {
    const api = demoApi(); if (!api) return undefined;
    const s = g.current;
    const at = (sPos, v, extra = {}) => { s.run = { ...newRun(), s: sPos, v, ...extra }; s.frozen = true; s.down = true; s.react = 280; s.reactUntil = 0; s.cam = null; };
    const fakeRecord = (late, react) => {
      const r = simLap(s.tk, { late, react }); const ms = Math.round((r.react + r.run.t) * 1000);
      return { best: ms, react: Math.round(react * 1000), runs: 3, at: new Date().toISOString(), ghost: r.ghost.map((v) => Math.round(v)) };
    };
    const finishWith = (late, react) => {
      const r = simLap(s.tk, { late, react }); clearTimers(); resetRun();
      s.run = r.run; s.ghost = r.ghost; s.react = react * 1000; s.phase = 'run'; finish();
    };
    Object.assign(api, {
      get: () => { const i = Math.floor(s.run.s / s.tk.ds) % s.tk.n; return { id, phase: s.phase, s: s.run.s, v: s.run.v, brake: s.tk.brake[i], L: s.tk.L, offs: s.run.offCount, heat: s.run.heat, offTrack: s.run.offTrack, t: s.run.t, react: s.react }; },
      press,
      // 남은 구간을 안내대로(진한 구간에서 손을 뗌) 한 번에 달린다 — 결과 화면을 바로 보려는 시험용
      auto: () => { if (s.phase !== 'run') return; while (!s.run.done) { const i = Math.floor(s.run.s / s.tk.ds) % s.tk.n; step(s.run, s.tk, !s.tk.brake[i], DT); const total = s.react / 1000 + s.run.t; while (total >= s.ghostNext) { s.ghost.push(s.run.s); s.ghostNext += GHOST_EVERY; } } },
      // 상태 바로 가기. 그림을 남기려고 멈춘 채로 둔다(누르면 이어서 달린다)
      state: (name) => {
        const z = s.zones; const ix = (sp) => Math.floor(wrapS(sp, s.tk.L) / s.tk.ds) % s.tk.n;
        setCard(null); setDelta(null);
        if (name === 'ready') { clearTimers(); resetRun(); setLit(0); setP('ready'); }
        else if (name === 'lights') { clearTimers(); resetRun(); setLit(3); setP('lights'); }
        else if (name === 'jump') { clearTimers(); resetRun(); setLit(0); setP('wait'); }
        else if (name === 'go') { clearTimers(); resetRun(); setLit(0); s.t0 = performance.now(); setP('go'); }
        else if (name === 'run' || name === 'coach') {
          clearTimers(); resetRun(); const zz = name === 'coach' ? coachZones()[0] : z[Math.min(2, z.length - 1)];
          const sp = name === 'coach' ? zz.s0 + 10 : zz.s0 - 140; at(sp, s.tk.ideal[ix(sp)] * (name === 'coach' ? 1 : 0.97));
          if (name === 'coach') { s.firstRun = true; setFirstRun(true); } else s.coachIdx = 99;
          if (s.best && name === 'run') { const tg = timeAt(s.best, sp); if (tg != null) { s.react = 0; s.run.t = tg + 0.31; setDelta({ sec: 0.31, ahead: false }); s.deltaUntil = performance.now() + 1e9; } }
          setP('run');
        } else if (name === 'slip') {
          clearTimers(); resetRun(); const t = s.tk.turns[Math.min(3, s.tk.turns.length - 1)]; const sp = t.s - 6;
          at(sp, s.tk.vlim[ix(sp)] * 1.18, { heat: 0.72, side: s.tk.k[ix(sp)] > 0 ? 1 : -1 }); s.run.off = s.run.side * 0.72 * (HALF_W - 1.5); s.coachIdx = 99; s.seedMarks = true; setP('run');
        } else if (name === 'off') {
          clearTimers(); resetRun(); const t = s.tk.turns[Math.min(3, s.tk.turns.length - 1)]; const sp = t.s + 14; const side = s.tk.k[ix(sp)] > 0 ? 1 : -1;
          at(sp, 9, { offTrack: true, offT: 0.9, offCount: 1, offAt: [sp], side, off: side * (HALF_W + 5.5) }); s.yaw = side * -0.45; s.down = false; s.coachIdx = 99; setP('run');
        } else if (name === 'practice') {
          clearTimers(); resetRun(); const zz = coachZones()[0]; const sp = zz.s0 - 40; at(sp, s.tk.ideal[ix(sp)]);
          s.practiceEnd = coachZones().slice(-1)[0].s1 + 120; s.react = 0; setP('practice');
        } else if (name === 'paused') { clearTimers(); resetRun(); at(z[1].s0 - 60, 60); s.pausedFrom = 'run'; setP('paused'); }
        else if (name === 'practiceDone') { clearTimers(); resetRun(); setP('practiceDone'); }
        else if (name === 'result-first') { const all = { ...lapRecords() }; delete all[id]; writeLapRecords(all); s.best = null; setBest(null); finishWith(30, 0.34); }
        else if (name === 'result-best' || name === 'card' || name === 'card-story') {
          const rec = fakeRecord(30, 0.41); writeLapRecords({ ...lapRecords(), [id]: rec }); s.best = rec.ghost; setBest(rec.best); finishWith(0, 0.27);
          if (name !== 'result-best') setTimeout(() => makeCardRef.current?.(name === 'card-story' ? 'story' : 'post'), 250);
        } else if (name === 'result-slower') { const rec = fakeRecord(0, 0.27); writeLapRecords({ ...lapRecords(), [id]: rec }); s.best = rec.ghost; setBest(rec.best); finishWith(30, 0.38); }
        return s.phase;
      },
    });
    return () => { for (const k of ['get', 'press', 'auto', 'state']) delete api[k]; };
  }, [id, press, finish, setP]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 그리기 ----------
  useEffect(() => {
    const s = g.current; const cv = canvas.current; const ctx = cv.getContext('2d');
    const size = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1); const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      return { dpr, w, h };
    };
    const themeKey = () => `${document.documentElement.getAttribute('data-theme')}|${document.documentElement.getAttribute('data-plat')}`;
    const readColors = () => {
      const el = root.current;
      s.colors = { bg: css(el, '--bg'), road: css(el, '--fill2'), brake: css(el, '--text4'), text: css(el, '--text'), text2: css(el, '--text2'), text3: css(el, '--text3'), line: css(el, '--line'), car: css(el, '--f1'),
        mark: css(el, '--bg').toLowerCase() === '#ffffff' ? '16,18,24' : '244,245,247', car3: carColors(css, el) };
      s.theme = themeKey();
    };
    const font = (px, wgt = 600) => `${wgt} ${px}px "Pretendard Variable", Pretendard, system-ui, sans-serif`;
    const lerpCam = (a, b, e) => ({ cx: lerp(a.cx, b.cx, e), cy: lerp(a.cy, b.cy, e), ang: a.ang + angDiff(a.ang, b.ang) * e, zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), e)), ax: lerp(a.ax, b.ax, e), ay: lerp(a.ay, b.ay, e), mix: lerp(a.mix, b.mix, e) });

    const frame = (now) => {
      s.raf = requestAnimationFrame(frame);
      const fdt = s.prevFrame ? Math.min(0.1, (now - s.prevFrame) / 1000) : 1 / 60; s.prevFrame = now;
      if (!s.colors || s.theme !== themeKey()) readColors();
      if (s.tkChanged) {
        s.tkChanged = false; s.zones = zonesOf(s.tk); s.mode = null;
        if (!OVERVIEW.has(s.phase)) { s.timers.forEach(clearTimeout); s.timers = []; s.run = newRun(); s.down = false; setP('ready'); }
      }
      const tk = s.tk; const cfgN = s.cfg; const reduced = reducedMotion(cfgN);
      // ---- 물리: 달리는 동안만, 고정 간격으로 ----
      if ((s.phase === 'run' || s.phase === 'practice') && !s.frozen) {
        s.acc += Math.min(0.05, (now - s.last) / 1000); s.last = now;
        while (s.acc >= DT && !s.run.done) {
          const wasOff = s.run.offTrack; const prevS = s.run.s;
          step(s.run, tk, s.down, DT); s.acc -= DT;
          if (s.phase === 'run') {
            const total = s.react / 1000 + s.run.t;
            while (total >= s.ghostNext) { s.ghost.push(s.run.s); s.ghostNext += GHOST_EVERY; }
            // 코너를 지날 때마다 최고 기록과의 차이
            if (cfgN.delta === 'corner' && s.best) {
              for (const t of tk.turns) if (prevS < t.s && s.run.s >= t.s) { const tb = timeAt(s.best, t.s); if (tb != null) { const d = total - tb; setDelta({ sec: Math.abs(d), ahead: d < 0 }); s.deltaUntil = now + 2400; } }
            }
          }
          if (!wasOff && s.run.offTrack) buzz('off');
        }
        if (s.phase === 'run' && cfgN.delta === 'live' && s.best && now >= s.deltaNext) {
          const tb = timeAt(s.best, s.run.s); s.deltaNext = now + 250;
          if (tb != null && s.run.s > 30) { const d = s.react / 1000 + s.run.t - tb; setDelta({ sec: Math.abs(d), ahead: d < 0 }); s.deltaUntil = now + 1e9; }
        }
        if (s.phase === 'run' && s.run.done) finish();
        if (s.phase === 'practice' && s.run.s >= s.practiceEnd) { trackEvent('lap_practice_done', { track: s.tk.id }); setP('practiceDone'); }
      }
      if (s.deltaUntil && now > s.deltaUntil) { s.deltaUntil = 0; setDelta(null); }
      const run = s.run; const C = s.colors;

      // ---- 알림 하나: 이탈 > 배우기 안내 > 미끄러짐 > 출발 반응 ----
      let want = null;
      if (s.phase === 'wait') want = 'jump';
      else if (s.phase === 'lights') want = 'lights';
      else if (s.phase === 'go') want = 'go';
      else if (s.phase === 'run' || s.phase === 'practice') {
        const coaching = s.phase === 'practice' || (cfgN.learn === 'coach' && s.firstRun);
        let cue = null;
        if (coaching) {
          const zs = coachZones(); const z = zs[s.coachIdx];
          if (z) {
            if (run.s >= z.s0 && run.s <= z.s1) cue = s.down ? 'lift' : 'liftOk';
            else if (run.s > z.s1) { s.coachIdx += 1; s.cueUntil = now + 1600; s.cue = s.coachIdx >= zs.length ? 'solo' : 'press'; }
            else if ((z.s0 - run.s) / Math.max(run.v, 8) < 1.8) cue = 'soon';
          }
          if (!cue && s.cue && now < s.cueUntil) { cue = s.cue === 'press' && s.down ? null : s.cue; if (s.cue === 'press' && s.down) s.cueUntil = 0; }
        }
        if (run.offTrack) want = 'off';
        else if (cue) want = cue;
        else if (cfgN.slip === 'marks' && run.heat > 0.55) want = 'slip';
        else if (now < s.reactUntil) want = 'react';
      }
      if (want !== s.msgKey) { s.msgKey = want; setMsgKey(want); }
      if (barEl.current) barEl.current.style.transform = `scaleX(${run.offTrack ? Math.min(1, run.offT / tk.D.offHold) : 0})`;

      // ---- 카메라 ----
      const { dpr, w, h } = size();
      const carLen = Math.max(34, Math.min(50, w * 0.105));   // 차 길이(px): 390폭에서 41
      const over = OVERVIEW.has(s.phase);
      let T;
      if (over) {
        // 카드가 덮지 않는 자리에 서킷 전체를 맞춘다: 카드가 아래에 있으면 그 위, 오른쪽에 있으면(폰을 눕혔을 때) 그 왼쪽
        const [x0, y0, x1, y1] = tk.box; const pad = 24;
        let left = 0, right = w, top = 8, bottom = h - 8;
        const card = cardRef.current;
        if (card) {
          const cr = card.getBoundingClientRect(), sr = cv.getBoundingClientRect();
          if (cr.left - sr.left > w * 0.25) right = Math.max(left + 160, cr.left - sr.left - 8);
          else bottom = Math.max(top + 140, cr.top - sr.top - 8);
        }
        const zoom = Math.min((right - left - pad * 2) / (x1 - x0), (bottom - top - pad * 2) / (y1 - y0));
        T = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, ang: 0, zoom, ax: (left + right) / 2, ay: (top + bottom) / 2, mix: 0 };
      } else {
        const c = poseAt(tk, wrapS(run.s, tk.L), 0);
        const ay = h * (h < 420 ? 0.7 : CAR_AY);
        T = { cx: c.x, cy: c.y, ang: reduced ? 0 : -c.th - Math.PI / 2, zoom: ay / (reduced ? 280 : lookAhead(run.v)), ax: w / 2, ay, mix: 1 };
      }
      const mode = over ? 'over' : 'chase';
      if (s.mode !== mode) { s.mode = mode; s.from = s.cam && !reduced ? { ...s.cam } : null; s.tt = 0; }
      let cam = T;
      if (mode === 'chase' && s.cam && !reduced) {
        cam = { ...T, ang: s.cam.ang + angDiff(s.cam.ang, T.ang) * (1 - Math.exp(-fdt / 0.13)), zoom: s.cam.zoom + (T.zoom - s.cam.zoom) * (1 - Math.exp(-fdt / 0.28)) };
      }
      if (s.from) { s.tt += fdt; const u = Math.min(1, s.tt / 0.34); cam = lerpCam(s.from, cam, 1 - (1 - u) ** 3); if (u >= 1) s.from = null; }
      s.cam = cam;
      const { ang, zoom, ax, ay, mix } = cam;
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const w2s = (x, y) => { const dx = (x - cam.cx) * zoom, dy = (y - cam.cy) * zoom; return [ax + dx * cosA - dy * sinA, ay + dx * sinA + dy * cosA]; };
      const roadPx = Math.max(2 * HALF_W * zoom, lerp(6, carLen * 1.12, mix));   // 길은 차보다 조금 넓게(실제 비율보다 굵게 그린다)
      const latPx = roadPx / (2 * HALF_W);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
      const idx = Math.floor(wrapS(run.s, tk.L) / tk.ds) % tk.n;
      const full = mix < 0.999;
      const reach = Math.hypot(w, h) / zoom;
      const i0 = full ? 0 : idx - Math.round(((h - ay) / zoom + 80) / tk.ds);
      const i1 = full ? tk.n : idx + Math.round(Math.min(tk.L * 0.9, reach) / tk.ds);
      const inWin = (sp) => { if (full) return true; let d = sp - run.s; if (d < -tk.L / 2) d += tk.L; if (d > tk.L / 2) d -= tk.L; return d > -((h - ay) / zoom + 80) && d < reach; };
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const pathOf = (from, to) => { ctx.beginPath(); for (let i = from; i <= to; i += 1) { const q = ((i % tk.n) + tk.n) % tk.n; const [X, Y] = w2s(tk.x[q], tk.y[q]); if (i === from) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } };
      const pathS = (a, b) => pathOf(Math.floor(a / tk.ds), Math.ceil(b / tk.ds));
      // 화면에서의 진행 방향(단위 벡터)과 왼쪽 법선
      const frameAt = (sp) => { const p = poseAt(tk, wrapS(sp, tk.L), 0); const [X, Y] = w2s(p.x, p.y); const a = p.th + ang; return { X, Y, tx: Math.cos(a), ty: Math.sin(a), nx: Math.sin(a), ny: -Math.cos(a), th: p.th }; };
      // 길
      ctx.lineWidth = roadPx; ctx.strokeStyle = C.road; pathOf(i0, i1); if (full) ctx.closePath(); ctx.stroke();
      // 손을 떼는 구간(진하게) + 무늬
      ctx.lineCap = 'butt';
      for (const z of s.zones) {
        if (!inWin(z.s0) && !inWin(z.s1) && !full) continue;
        ctx.strokeStyle = C.brake; ctx.lineWidth = roadPx; pathS(z.s0, z.s1); ctx.stroke();
        if (mix < 0.5 || cfgN.zone === 'shade') continue;
        ctx.strokeStyle = C.bg; ctx.lineCap = 'butt';
        if (cfgN.zone === 'bars') {
          ctx.lineWidth = Math.max(2, roadPx * 0.1);
          for (let sp = z.s0 + 7; sp < z.s1 - 3; sp += 9) { const f = frameAt(sp); const hw = roadPx * 0.4; ctx.beginPath(); ctx.moveTo(f.X - f.nx * hw, f.Y - f.ny * hw); ctx.lineTo(f.X + f.nx * hw, f.Y + f.ny * hw); ctx.stroke(); }
        } else {
          ctx.lineWidth = Math.max(2, roadPx * 0.09); ctx.lineJoin = 'miter';
          for (let sp = z.s0 + 9; sp < z.s1 - 4; sp += 14) { const f = frameAt(sp); const a = roadPx * 0.34, b = roadPx * 0.26; ctx.beginPath(); ctx.moveTo(f.X - f.nx * a + f.tx * b, f.Y - f.ny * a + f.ty * b); ctx.lineTo(f.X, f.Y); ctx.lineTo(f.X + f.nx * a + f.tx * b, f.Y + f.ny * a + f.ty * b); ctx.stroke(); }
          ctx.lineJoin = 'round';
        }
        // 손을 떼는 선: 구간이 시작하는 곳에 길 폭 그대로 한 줄
        const f = frameAt(z.s0); const hw = roadPx / 2; ctx.strokeStyle = C.text; ctx.lineWidth = Math.max(2.5, roadPx * 0.09);
        ctx.beginPath(); ctx.moveTo(f.X - f.nx * hw, f.Y - f.ny * hw); ctx.lineTo(f.X + f.nx * hw, f.Y + f.ny * hw); ctx.stroke();
      }
      // 결과: 가장 많이 늦은(또는 줄인) 구간을 진하게, 코스를 벗어난 곳에 원
      if (s.phase === 'done' && s.resultMarks) {
        const sec = s.resultMarks.sector;
        if (sec) { ctx.lineCap = 'round'; ctx.strokeStyle = C.text; ctx.lineWidth = roadPx + 3; pathS(sec.s0, sec.s1); ctx.stroke(); }
        for (const sp of s.resultMarks.offAt) { const f = frameAt(sp); ctx.fillStyle = C.bg; ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.X, f.Y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      }
      // 출발선: 체크무늬 두 줄(멀리서 볼 때는 선 하나)
      if (inWin(0) || full) {
        const f = frameAt(0);
        if (mix > 0.5) {
          const n = 6, sq = roadPx / n;
          ctx.save(); ctx.translate(f.X, f.Y); ctx.rotate(Math.atan2(f.ty, f.tx) + Math.PI / 2);
          for (let j = 0; j < n; j += 1) for (let r = 0; r < 2; r += 1) { ctx.fillStyle = (j + r) % 2 ? C.text : C.bg; ctx.fillRect(-roadPx / 2 + j * sq, -r * sq, sq + 0.3, sq + 0.3); }
          ctx.restore();
        } else { const hw = roadPx * 0.9; ctx.strokeStyle = C.text; ctx.lineWidth = 2.5; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(f.X - f.nx * hw, f.Y - f.ny * hw); ctx.lineTo(f.X + f.nx * hw, f.Y + f.ny * hw); ctx.stroke(); }
      }
      // 코너 번호: 트랙 바깥쪽에 둥근 표, 글자는 바로 세워서. 다음 코너는 채운 표
      const nextT = tk.turns.find((t) => t.s > run.s + 4) || tk.turns[0];
      const tagR = lerp(8, 12, mix);
      ctx.font = font(Math.round(lerp(10, 13, mix))); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of tk.turns) {
        if (!full && !inWin(t.s)) continue;
        const side = tk.k[t.i] > 0 ? 1 : -1;
        const p = poseAt(tk, t.s, side * (roadPx / 2 + tagR + 4) / zoom); const [X, Y] = w2s(p.x, p.y);
        if (X < -20 || X > w + 20 || Y < -20 || Y > h + 20) continue;
        const on = mix > 0.5 && nextT && t.n === nextT.n && (s.phase === 'run' || s.phase === 'practice');
        ctx.fillStyle = on ? C.text : C.bg; ctx.beginPath(); ctx.arc(X, Y, tagR, 0, Math.PI * 2); ctx.fill();
        if (!on) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.fillStyle = on ? C.bg : C.text2; ctx.fillText(String(t.n), X, Y + 0.5);
      }
      // 처음 배우는 사람: 손을 뗄 자리에 '손 떼기' 표
      const coaching = s.phase === 'practice' || ((s.phase === 'run' || s.phase === 'go' || s.phase === 'lights') && cfgN.learn === 'coach' && s.firstRun);
      if (coaching && mix > 0.5) {
        const zs = coachZones();
        for (let k = s.coachIdx; k < zs.length; k += 1) {
          if (!inWin(zs[k].s0)) continue;
          const f = frameAt(zs[k].s0 + 3); const label = tr('lap.zone.tag');
          ctx.font = font(13); const tw = ctx.measureText(label).width + 16; const th2 = 24;
          ctx.save(); ctx.translate(f.X + f.tx * 16, f.Y + f.ty * 16);
          ctx.fillStyle = C.text; ctx.beginPath(); ctx.roundRect?.(-tw / 2, -th2 / 2, tw, th2, 12); ctx.fill();
          ctx.fillStyle = C.bg; ctx.fillText(label, 0, 1); ctx.restore();
        }
      }
      // 미끄러짐 '타이어 자국': 뒷바퀴 자리를 이어 옅은 선으로, 3초 동안
      const carS = wrapS(run.s - (carLen * 0.5 * lerp(0.55, 1, mix)) / zoom, tk.L);
      const cp = poseAt(tk, carS, (run.off * latPx) / zoom);
      if (cfgN.slip === 'marks' && mix > 0.5) {
        const back = (carLen * 0.35) / zoom, side = (carLen * 0.13) / zoom;
        const bx = cp.x - Math.cos(cp.th) * back, by = cp.y - Math.sin(cp.th) * back;
        const L1 = [bx + Math.sin(cp.th) * side, by - Math.cos(cp.th) * side], R1 = [bx - Math.sin(cp.th) * side, by + Math.cos(cp.th) * side];
        if (s.phase === 'run' && run.heat > 0.18 && !run.offTrack && s.rear) s.marks.push({ a: s.rear, b: [L1, R1], k: Math.min(1, run.heat), t: now });
        if (s.seedMarks) {   // 데모 '미끄러짐' 바로 가기: 멈춘 그림에도 지나온 자국이 보이게 뒤 30m를 채운다
          s.seedMarks = false; let prev = null;
          for (let k = 20; k >= 0; k -= 1) {
            const q = poseAt(tk, wrapS(carS - k * 1.6, tk.L), (run.off * (1 - k / 24) * latPx) / zoom);
            const qx = q.x - Math.cos(q.th) * back, qy = q.y - Math.sin(q.th) * back;
            const cur = [[qx + Math.sin(q.th) * side, qy - Math.cos(q.th) * side], [qx - Math.sin(q.th) * side, qy + Math.cos(q.th) * side]];
            if (prev) s.marks.push({ a: prev, b: cur, k: run.heat * (1 - k / 22), t: now - 200 });
            prev = cur;
          }
        }
        s.rear = [L1, R1]; s.marks = s.marks.filter((m) => now - m.t < 3000).slice(-400);
        ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, carLen * 0.07);
        for (const m of s.marks) {
          ctx.strokeStyle = `rgba(${C.mark},${(0.42 * m.k * (1 - (now - m.t) / 3000)).toFixed(3)})`;
          for (const q of [0, 1]) { const [x1, y1] = w2s(...m.a[q]); const [x2, y2] = w2s(...m.b[q]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
        }
      }
      // 내 최고 기록(같은 모양의 옅은 차)
      const len = carLen * lerp(0.55, 1, mix);
      if (s.best && (s.phase === 'run' || s.phase === 'go' || s.phase === 'paused') && mix > 0.5) {
        const total = s.phase === 'go' ? (now - s.t0) / 1000 : s.react / 1000 + run.t;
        const gs = posAt(s.best, total);
        if (gs != null) {
          const gp = poseAt(tk, wrapS(gs - (len * 0.5) / zoom, tk.L), 0); const [X, Y] = w2s(gp.x, gp.y);
          if (cfgN.car === 'dot') { ctx.strokeStyle = C.text3; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, Math.max(5, len * 0.17), 0, Math.PI * 2); ctx.stroke(); }
          else drawCar(ctx, { x: X, y: Y, rot: gp.th + ang + Math.PI / 2, len, C: C.car3, ghost: true });
        }
      }
      // 차: 앞바퀴는 굽은 정도만큼 꺾이고, 미끄러지면 뒤가 바깥으로 돈다
      const kAhead = tk.k[(idx + Math.round(6 / tk.ds)) % tk.n];
      const yawT = run.offTrack ? s.yaw : (run.heat > 0 ? Math.sign(kAhead) * run.heat * 0.24 : 0);
      if (reduced) { s.steer = steerOf(kAhead); s.yaw = yawT; } else { s.steer += (steerOf(kAhead) - s.steer) * Math.min(1, fdt * 10); s.yaw += (yawT - s.yaw) * Math.min(1, fdt * 6); }
      if (!run.offTrack && run.heat <= 0 && Math.abs(s.yaw) < 0.002) s.yaw = 0;
      const [cx, cy] = w2s(cp.x, cp.y);
      if (cfgN.car === 'dot') {
        const r = Math.max(6, len * 0.2); ctx.fillStyle = C.car; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();
      } else drawCar(ctx, { x: cx, y: cy, rot: cp.th + ang + Math.PI / 2 + s.yaw, len, steer: s.steer, C: C.car3 });
      // 미끄러짐 '원': 차 둘레에 차오르는 원. 다 차면 코스 이탈
      if (cfgN.slip === 'ring' && mix > 0.5 && !run.offTrack && run.heat > 0.02) {
        const r = len * 0.66; ctx.globalAlpha = Math.min(1, run.heat * 5); ctx.lineCap = 'round';
        ctx.strokeStyle = C.line; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = C.car; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.min(1, run.heat) * Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ---- 숫자(DOM에 바로) ----
      const totalMs = s.phase === 'run' || s.phase === 'done' || s.phase === 'paused' ? s.react + run.t * 1000 : s.phase === 'go' ? now - s.t0 : 0;
      if (timeEl.current) timeEl.current.textContent = s.phase === 'practice' ? tr('lap.practice.label') : formatLap(totalMs);
      if (speedEl.current) speedEl.current.textContent = String(Math.round(run.v * 3.6));
      if (pedalEl.current) {
        const st = s.phase === 'run' || s.phase === 'practice' ? (s.down && !run.offTrack ? 'on' : 'off') : 'idle';
        if (pedalEl.current.dataset.state !== st) { pedalEl.current.dataset.state = st; pedalEl.current.textContent = tr(st === 'off' ? 'lap.pedal.off' : 'lap.pedal'); }
      }
      if (dotEl.current) { const c = poseAt(tk, wrapS(run.s, tk.L), 0); const [mx, my] = mini.at(c.x, c.y); dotEl.current.setAttribute('cx', mx.toFixed(1)); dotEl.current.setAttribute('cy', my.toFixed(1)); }
      if (nextEl.current) { const v = nextT ? String(nextT.n) : ''; if (nextEl.current.textContent !== v) nextEl.current.textContent = v; }
    };
    s.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(s.raf);
  }, [finish, tr, mini, buzz, setP]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 기록 카드 ----------
  const makeCard = useCallback(async (format = 'post') => {
    if (!result) return;
    if (!card) trackEvent('lap_card_opened', { track: id });
    const cv = await drawShareCard({
      format, track: g.current.tk, ms: result.ms, lockupEl: lockRef.current,
      text: { kicker: tr('lap.title'), circuit: L.circuit, stats: tr('lap.card.stats', { react: (result.react / 1000).toFixed(3), offs: result.offs }), site: 'gantryracing.com' },
    });
    setCard({ fmt: format, url: cv.toDataURL('image/png'), canvas: cv, note: null });
  }, [result, card, id, tr, L.circuit]);
  const makeCardRef = useRef(null);
  useEffect(() => { makeCardRef.current = makeCard; }, [makeCard]);
  const shareCard = useCallback(async () => {
    if (!card) return;
    trackEvent('lap_card_shared', { track: id });
    if (LAP_SAVE) {   // 토스: 공유 창 대신 기기에 저장
      const ok = await lapSaveImage({ dataUrl: card.url, fileName: `gantry-${id}-${card.fmt}.png` });
      setCard((c) => (c ? { ...c, note: tr(ok ? 'lap.card.saved' : 'lap.card.saveFail') } : c));
      return;
    }
    try {
      const blob = await new Promise((resolve) => card.canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `gantry-${id}-${card.fmt}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      throw new Error('no share');
    } catch (e) {
      if (e && e.name === 'AbortError') return;   // 공유 창을 그냥 닫았다
      setCard((c) => (c ? { ...c, note: tr('lap.card.fallback') } : c));
    }
  }, [card, id, tr]);

  const stage = {
    onPointerDown: (e) => { if (e.target.closest('button, a')) return; e.preventDefault(); press(true); },
    onPointerUp: () => press(false), onPointerCancel: () => press(false), onPointerLeave: () => press(false),
    onContextMenu: (e) => e.preventDefault(),
  };
  // 결과 한 줄: 세 상태 모두 기록 → 비교 → 한 가지 이야기(이탈한 곳이 있으면 그곳, 없으면 가장 많이 늦거나 줄인 구간)
  const verdict = !result ? '' : result.prev == null ? tr('lap.result.first')
    : result.isBest ? tr('lap.result.faster', { sec: (Math.abs(result.ms - result.prev) / 1000).toFixed(3) }) : tr('lap.result.slower', { sec: ((result.ms - best) / 1000).toFixed(3) });
  const insight = useMemo(() => {
    if (!result) return null;
    if (result.offList.length) return tr('lap.result.offAt', { list: result.offList.slice(0, 3).join(' · ') });
    const sec = result.prev == null ? null : result.isBest ? result.cmp?.gained : result.cmp?.lost;
    if (sec) {
      const key = `lap.result.${result.isBest ? 'gained' : 'lost'}${sec.from == null ? 'Start' : sec.to == null ? 'End' : ''}`;
      return tr(key, { a: sec.from, b: sec.to, sec: Math.abs(sec.d).toFixed(2) });
    }
    return result.prev == null ? tr('lap.result.clean') : null;
  }, [result, tr]);
  const msgText = !msgKey ? null : msgKey === 'react' ? tr('lap.msg.react', { sec: (reactMs / 1000).toFixed(3) }) : tr(`lap.msg.${msgKey}`);
  const learn = firstRun ? cfg.learn : null;
  const fmtSeg = ['post', 'story'];

  return (
    <div className="gx-lap" ref={root} role="dialog" aria-modal="true" aria-label={tr('lap.aria', { name: L.circuit })} aria-describedby="gx-lap-keys" data-phase={phase}>
      <header className="gx-lap-bar">
        <button type="button" className="gx-iconbtn" aria-label={tr('lap.close')} onClick={onClose}><Icon n="close" /></button>
        <span className="gx-lap-title gx-t17 gx-w600 gx-ell">{L.circuit}</span>
        {best != null && <span className="gx-lap-best gx-t13">{tr('lap.best', { time: formatLap(best) })}</span>}
      </header>
      <div className="gx-lap-strip">
        <div className="gx-lap-read">
          <div className="gx-lap-l1">
            <span className="gx-lap-time" ref={timeEl} aria-live="off">0:00.000</span>
            {delta && <span className="gx-lap-delta gx-t15 gx-w600" role="status"><Roll>{tr(delta.ahead ? 'lap.delta.ahead' : 'lap.delta.behind', { sec: delta.sec.toFixed(2) })}</Roll></span>}
          </div>
          <div className="gx-lap-l2 gx-t15">
            <span className="gx-lap-speed"><b ref={speedEl}>0</b>km/h</span>
            <em className="gx-lap-pedal gx-t13" ref={pedalEl} data-state="idle">{tr('lap.pedal')}</em>
            <span className="gx-lap-next">{tr('lap.next')} <b ref={nextEl} /></span>
          </div>
        </div>
        <svg className="gx-lap-mini" width="84" height="56" viewBox="0 0 84 56" aria-hidden="true"><path d={mini.d} /><circle ref={dotEl} r="3.5" cx="0" cy="0" /></svg>
      </div>
      <div className="gx-lap-stage" {...stage}>
        <canvas ref={canvas} aria-hidden="true" />
        {(phase === 'lights' || phase === 'wait' || phase === 'go') && (
          <span className="gx-lap-lights" role="img" aria-label={tr('lap.lights', { n: lit })}>
            <i className="gx-lap-beam" />
            {Array.from({ length: LIGHTS }, (_, i) => <span key={i} className={i < lit ? 'is-on' : ''}><i /><i /></span>)}
          </span>
        )}
        <p className={`gx-lap-msg gx-t15${msgKey ? '' : ' is-empty'}${msgKey === 'off' ? ' is-off' : ''}`} role="status" aria-live="polite">
          {msgText}{msgKey === 'off' && <i className="gx-lap-msg-bar" aria-hidden="true"><i ref={barEl} /></i>}
        </p>

        {phase === 'ready' && (
          <section className="gx-lap-card" ref={cardRef} aria-labelledby="gx-lap-h">
            <div><h2 className="gx-t20" id="gx-lap-h">{L.circuit}</h2><span className="gx-t15 gx-sub">{[L.country, tr('lap.turns', { n: meta.turns })].filter(Boolean).join(' · ')}</span></div>
            {learn && (
              <ul className="gx-lap-how gx-t15">
                <li><i className="is-road" />{tr('lap.how.hold')}</li>
                <li><i className={`is-brake is-${cfg.zone}`} />{tr(learn === 'coach' ? 'lap.how.coach' : 'lap.how.lift')}</li>
                {learn === 'practice' ? <li><i className="is-flag" />{tr('lap.how.practice')}</li> : <li><i className="is-light" />{tr('lap.how.lights')}</li>}
              </ul>
            )}
            {learn === 'practice'
              ? <div className="gx-lap-acts is-col"><button type="button" ref={primary} className="gx-btn is-primary is-full" onClick={startPractice}>{tr('lap.practice')}</button><button type="button" className="gx-textbtn gx-t15 gx-lap-skip" onClick={startLights}>{tr('lap.skip')}</button></div>
              : <button type="button" ref={primary} className="gx-btn is-primary is-full" onClick={startLights}>{tr('lap.start')}</button>}
            {learn && <p className="gx-t13 gx-ter">{tr('lap.note')}</p>}
          </section>
        )}
        {phase === 'practiceDone' && (
          <section className="gx-lap-card" ref={cardRef} aria-labelledby="gx-lap-p">
            <div><h2 className="gx-t20" id="gx-lap-p">{tr('lap.practice.done')}</h2><span className="gx-t15 gx-sub">{tr('lap.practice.next')}</span></div>
            <button type="button" ref={primary} className="gx-btn is-primary is-full" onClick={startLights}>{tr('lap.start')}</button>
          </section>
        )}
        {phase === 'paused' && (
          <section className="gx-lap-card" ref={cardRef} aria-labelledby="gx-lap-z">
            <div><h2 className="gx-t20" id="gx-lap-z">{tr('lap.pause.title')}</h2><span className="gx-t15 gx-sub">{tr('lap.pause.sub')}</span></div>
            <div className="gx-lap-acts is-col"><button type="button" ref={primary} className="gx-btn is-primary is-full" onClick={resume}>{tr('lap.pause.resume')}</button><button type="button" className="gx-textbtn gx-t15 gx-lap-skip" onClick={restart}>{tr('lap.pause.restart')}</button></div>
          </section>
        )}
        {phase === 'done' && result && (
          <section className="gx-lap-card" ref={cardRef} aria-labelledby="gx-lap-r">
            <div>
              <span className="gx-t13 gx-sub" id="gx-lap-r">{tr('lap.result.label', { name: L.circuit })}</span>
              <b className="gx-lap-big"><Roll>{formatLap(result.ms)}</Roll></b>
              <span className={`gx-t15 gx-lap-verdict${result.isBest && result.prev != null ? ' is-best' : ''}`}>{verdict}</span>
            </div>
            {insight && <p className="gx-lap-insight gx-t15">{insight}</p>}
            <dl className="gx-lap-stats">
              <div><dt className="gx-t13">{tr('lap.stat.react')}</dt><dd className="gx-t17 gx-w600">{tr('lap.stat.reactV', { sec: (result.react / 1000).toFixed(3) })}</dd></div>
              <div><dt className="gx-t13">{tr('lap.stat.vmax')}</dt><dd className="gx-t17 gx-w600">{result.vmax}km/h</dd></div>
              <div><dt className="gx-t13">{tr('lap.stat.offs')}</dt><dd className="gx-t17 gx-w600">{tr('lap.stat.offsV', { n: result.offs })}</dd></div>
            </dl>
            <div className="gx-lap-acts">
              <button type="button" ref={primary} className="gx-btn is-primary is-grow" onClick={startLights}>{tr('lap.again')}</button>
              <button type="button" className="gx-btn is-weak is-icon" aria-label={tr('lap.card.open')} onClick={() => makeCard('post')}><Icon n="share" s={22} /></button>
            </div>
          </section>
        )}
      </div>
      <p className="gx-vh" id="gx-lap-keys">{tr('lap.keys')}</p>
      <span className="gx-vh" ref={lockRef} aria-hidden="true"><GantryLockup height={14} /></span>
      {card && (
        <div className="gx-lap-share" role="dialog" aria-modal="true" aria-label={tr('lap.card.open')}>
          <img className={`is-${card.fmt}`} src={card.url} alt={tr('lap.card.alt', { name: L.circuit, time: formatLap(result.ms) })} />
          <div className="gx-seg" role="radiogroup" aria-label={tr('lap.card.format')}>
            {fmtSeg.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={card.fmt === f} tabIndex={card.fmt === f ? 0 : -1} className={card.fmt === f ? 'is-on' : ''}
                onClick={() => makeCard(f)} onKeyDown={(e) => arrowPick(e, fmtSeg, card.fmt, (v) => makeCard(v))}>{tr(`lap.card.${f}`)}</button>
            ))}
          </div>
          {card.note && <p className="gx-t13" role="status">{card.note}</p>}
          <div className="gx-lap-acts">
            <button type="button" className="gx-btn is-primary is-grow" onClick={shareCard}>{tr(LAP_SAVE ? 'lap.card.save' : 'lap.card.share')}</button>
            <button type="button" className="gx-btn is-weak" onClick={() => setCard(null)}>{tr('lap.done')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
