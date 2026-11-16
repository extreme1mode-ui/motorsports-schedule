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
import { prepWorld, buildView, drawGround, drawTrack, drawStartMarks, drawGantry, drawBoards } from './world.js';
import { newFx, carryFx, addDebris, addMarks, breakMarks, addPuff, drawMarks, drawPuffs, drawStreaks } from './fx.js';
import { createEngine, revLeds } from './gearbox.js';
import { LapBoard } from './LapBoard.jsx';
import { LapRank, LapThirds } from './LapResult.jsx';
import { isThisWeek } from './place.js';
import { boardOf, weekOf, useBoard, rivalOf } from './board.js';
import { myPlayer, nameOf } from './player.js';
import { prep3d, camera as camera3, render3d, labels3d, rlAt, wallAtS, kerbAtS, CAR3, addSparks, STREET, groundAt } from './world3d.js';
import { createLapSound, renderLog, renderScenes, wavBytes } from './sound.js';
import { GHOST_EVERY, timeAt, posAt, compareSectors, offCorners, zonesOf, simLap, thirdsOf, THIRDS } from './analysis.js';
import { useLapConfig, lapDiff, paceOf } from './config.js';
import { demoApi } from './demo.js';
import { LAP_SAVE, lapHaptic, lapSaveImage } from './lap-platform.js';
import { lapTrackOf, preparedTrack, lapRecords, useLapRecords, saveLap, useOpenLap, closeLap, outlinePath, writeLapRecords, isFirstVisit } from './store.js';

const LIGHTS = 5;
const LIGHT_EVERY = 1000;                  // 신호등 하나가 켜지는 간격(ms). 실제 F1도 1초마다 하나씩 켜진다
const DT = 1 / 120;
const CAR_AY = 0.62;                       // 차 자리: 무대 높이의 62%. 아래쪽은 엄지가 덮어도 되는 곳
// 차 앞으로 보는 거리(m): 시속 90km까지는 170m로 두고(가까이서 빠르게 지나가는 게 보이게), 그 위로는 시속 330km에서 400m(4.3초 앞)까지 넓힌다
const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lookAhead = (v) => 170 + 230 * smooth01((v - 25) / 65);
const css = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
const wrapS = (s, L) => ((s % L) + L) % L;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const reducedMotion = (c) => c?.motion === 'reduce' || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const lerp = (a, b, f) => a + (b - a) * f;
const OVERVIEW = new Set(['ready', 'done', 'practiceDone']);
const FINISH_MS = 1500;                    // 결승선을 지난 뒤 결과 카드가 뜨기까지(차는 그동안 속도를 줄인다)
// 결과 화면: 결승한 차가 식히는 바퀴처럼 계속 달린다(m/s, 시속 150km). 코너 앞에서는 그 코너 한계 속도의 80%로. 줄인 움직임이면 멈춘다
const COOL_V = 42;
const coolV = (tk, sM) => Math.min(COOL_V, 0.8 * tk.ideal[Math.floor(wrapS(sM, tk.L) / tk.ds) % tk.n]);
const coastStep = (c, vT, gdt) => { c.t += gdt; c.v = c.v > vT ? Math.max(vT, c.v - 24 * gdt) : Math.min(vT, c.v + 5 * gdt); c.s += c.v * gdt; };
const PRESSABLE = new Set(['lights', 'wait', 'go', 'run', 'practice']);
const NOSE3 = 2.62 * CAR3;                 // 입체 화면: 차 가운데에서 코끝까지(m)
// 입체 카메라 두 개 사이(서킷 전체 ↔ 차 뒤): 높이와 초점 거리는 로그로, 방향은 짧은 쪽으로
const lerpCam3 = (a, b, e) => ({ x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)), yaw: a.yaw + angDiff(a.yaw, b.yaw) * e, pitch: lerp(a.pitch, b.pitch, e),
  F: Math.exp(lerp(Math.log(a.F), Math.log(b.F), e)), ox: lerp(a.ox, b.ox, e), oy: lerp(a.oy, b.oy, e), mix: lerp(a.mix, b.mix, e) });
// 소리 켬 · 끔(이 기기에 기억). 저장된 값이 없으면 설정의 기본값
const SOUND_KEY = 'gantry.lapSound';
const readSound = () => { try { const v = localStorage.getItem(SOUND_KEY); return v === 'on' ? true : v === 'off' ? false : null; } catch { return null; } };
// 마지막 코너를 지나 결승선까지(m). 코너가 없으면 마지막 600m
const finalStretchOf = (tk) => (tk.turns.length ? tk.turns[tk.turns.length - 1].s + 40 : tk.L - 600);
const LEDS = Array.from({ length: 15 }, (_, k) => k);
// 차이를 잴 기록: 옅은 차와 같은 1위 기록. 내 기록이 없으면 재지 않는다(첫 바퀴)
const dRef = (s) => (s.best ? s.rival || s.best : null);
const hexRgb = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec((c || '').trim()); if (!m) return '128,128,128'; const v = m[1]; return `${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)}`; };

// 기록 카드 이미지 한 장(게시물 4:5 · 스토리 9:16)
async function buildCard(format, track, r, lockupEl, text) {
  const cv = await drawShareCard({ format, track, ms: r.ms, lockupEl, text });
  return { fmt: format, url: cv.toDataURL('image/png'), canvas: cv, note: null };
}

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
  const [demoCard, setDemoCard] = useState(null);  // 데모 바로 가기 전용 { f, n }
  const [board, setBoard] = useState(null);        // 순위표: null · 'week' · 'all'
  const boardFrom = useRef(null);
  const wkBoard = useBoard(id, 'week', Date.now());
  const openBoard = (e, p = 'week') => { boardFrom.current = e?.currentTarget || null; setBoard(p); };
  const closeBoard = () => { setBoard(null); setTimeout(() => boardFrom.current?.focus?.({ preventScroll: true }), 0); };
  const lockRef = useRef(null); const primary = useRef(null); const cardRef = useRef(null);
  const resBody = useRef(null);   // 결과 카드 안 넘기는 부분: 새 결과가 나오면 맨 위로
  useEffect(() => { if (resBody.current) resBody.current.scrollTop = 0; }, [result]);

  const root = useRef(null); const canvas = useRef(null);
  const timeEl = useRef(null); const speedEl = useRef(null); const pedalEl = useRef(null); const nextEl = useRef(null); const dotEl = useRef(null); const barEl = useRef(null); const progEl = useRef(null); const progGhostEl = useRef(null);
  const gasEl = useRef(null); const [gasTip, setGasTip] = useState(false); const gasTipT = useRef(0);
  const revEl = useRef(null); const gearEl = useRef(null);
  // 소리: 레이어가 열리면 재료를 쉬는 틈에 만들고, 손이 처음 닿을 때 켠다
  const [soundOn, setSoundOn] = useState(() => readSound() ?? cfg.sound !== 'off');
  const snd = useRef(null); if (snd.current === null) snd.current = createLapSound();
  useEffect(() => { snd.current.enable(soundOn); }, [soundOn]);
  useEffect(() => () => snd.current.close(), []);
  const soundCfg = useRef(cfg.sound);
  useEffect(() => { if (soundCfg.current !== cfg.sound) { soundCfg.current = cfg.sound; setSoundOn(cfg.sound !== 'off'); } }, [cfg.sound]);   // 데모 조절 판에서 바꾸면 바로
  const toggleSound = () => { const v = !soundOn; setSoundOn(v); try { localStorage.setItem(SOUND_KEY, v ? 'on' : 'off'); } catch { /* 저장소 없음 */ } if (v) { snd.current.enable(true); snd.current.unlock(); } };
  // 위 줄의 작은 전체 그림(84×56): 트랙 좌표 → 그림 좌표
  const thirdPaths = useMemo(() => {
    const [x0, y0, x1, y1] = tk.box; const w = 44, h = 30, pad = 3;
    const k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0)); const ox = (w - (x1 - x0) * k) / 2, oy = (h - (y1 - y0) * k) / 2;
    const pt = (i) => { const q = ((i % tk.n) + tk.n) % tk.n; return `${((tk.x[q] - x0) * k + ox).toFixed(1)},${((tk.y[q] - y0) * k + oy).toFixed(1)}`; };
    const seg = (a0, a1) => { const out = []; const stp = Math.max(1, Math.floor(tk.n / 240)); for (let i = a0; i < a1; i += stp) out.push(pt(i)); out.push(pt(a1)); return `M${out.join('L')}`; };
    const cut = [0, ...THIRDS.map((f) => Math.round(f * tk.n)), tk.n];
    return { full: seg(0, tk.n), parts: [0, 1, 2].map((j) => seg(cut[j], cut[j + 1])) };
  }, [tk]);
  const mini = useMemo(() => {
    const [x0, y0, x1, y1] = tk.box; const w = 84, h = 56, pad = 5;
    const k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0));
    const ox = (w - (x1 - x0) * k) / 2, oy = (h - (y1 - y0) * k) / 2;
    return { d: outlinePath(id, w, h, pad), at: (x, y) => [(x - x0) * k + ox, (y - y0) * k + oy] };
  }, [id, tk]);
  const g = useRef(null);   // 게임 상태(리렌더와 무관)
  if (g.current === null) {
    g.current = { tk, zones: zonesOf(tk), run: newRun(), phase: 'ready', down: false, t0: 0, react: 0, acc: 0, last: 0, ghost: [], ghostNext: 0,
      best: lapRecords()[id]?.ghost || null, cam: null, from: null, mode: null, colors: null, theme: null, timers: [], raf: 0, frozen: false,
      coachIdx: 0, cueUntil: 0, cue: null, reactUntil: 0, deltaUntil: 0, deltaNext: 0, marks: [], rear: null, steer: 0, yaw: 0, msgKey: null,
      practiceEnd: 0, pausedFrom: null, prevFrame: 0, cfg, firstRun, rival: null,
      fx: newFx(), coast: null, glow: 0, aero: 0, accSm: 0, vPrev: 0, lit: 0, pacer: null, view: null, puffAt: 0,
      cam3: null, from3: null, c3: null, view3: null, rain: 0, sparkS: 0, rnd: 7 };
  }
  const setP = useCallback((p) => { g.current.phase = p; setPhase(p); }, []);
  // 이 서킷 기록이 지워지면(데모 조절 판 '기록 지우기') 화면 속 최고 기록 · 옅은 차도 비운다
  const rec = useLapRecords()[id] || null; const hasRec = !!rec;
  useEffect(() => { if (!hasRec) { g.current.best = null; setBest(null); } }, [hasRec]);
  const clearTimers = () => { g.current.timers.forEach(clearTimeout); g.current.timers = []; };
  const later = (fn, ms) => { g.current.timers.push(setTimeout(fn, ms)); };
  const buzz = useCallback((kind) => { if (g.current.cfg.haptic === 'on') lapHaptic(kind); }, []);
  // 처음 배우는 사람에게 때를 알려 줄 진한 구간 두 곳(출발 직후 30m 안에서 시작하는 구간은 건너뛴다)
  const coachZones = () => g.current.zones.filter((z) => z.s0 > 30).slice(0, 2);

  // keep: 지난 바퀴 자국 · 자갈을 남긴다(데모의 상태 바로 가기는 깨끗하게 시작한다)
  const resetRun = (keep = true) => {
    const s = g.current;
    s.run = newRun(); s.ghost = []; s.ghostNext = 0; s.acc = 0; s.down = false; s.react = 0; s.frozen = false;
    s.coachIdx = 0; s.cue = null; s.cueUntil = 0; s.reactUntil = 0; s.deltaUntil = 0; s.deltaNext = 0; s.yaw = 0; s.steer = 0;
    // 옅은 차: 이번 주 1위 기록(내가 1위면 내 최고 기록). 바퀴를 시작할 때 정해 두고 그 바퀴 동안 바꾸지 않는다. 아무 기록도 없으면 안내대로 달린 차(s.pacer)
    s.rival = rivalOf(id, s.tk)?.ghost || null;
    s.fx = keep ? carryFx(s.fx) : newFx(); s.coast = null; s.glow = 0; s.aero = 0; s.accSm = 0; s.vPrev = 0; s.rain = 0; s.sparkS = 0; s.rejoin = null; s.tv = null;
    s.ghostSign = 0; s.passAt = 0; s.passKey = null; s.passUntil = 0; s.finalOn = false; s.finalUntil = 0; s.sndS = null; s.offSurface = null;
    setResult(null); setDelta(null);
  };

  // 설정은 그리기 루프가 읽는다. 난이도를 바꾸면 트랙(진한 구간 · 코너 한계)이 바뀌고, 달리던 중이면 준비로 돌아간다
  useEffect(() => { g.current.cfg = cfg; g.current.firstRun = firstRun; }, [cfg, firstRun]);
  useEffect(() => { const s = g.current; if (s.tk !== tk) { s.tk = tk; s.tkChanged = true; } }, [tk]);
  useEffect(() => { g.current.lit = lit; }, [lit]);
  // 기록이 없으면 '안내대로 달린 차'가 옆에서 같이 달린다(첫 바퀴에도 겨룰 상대가 있게)
  useEffect(() => { g.current.pacer = cfg.pacer !== 'off' && best == null ? simLap(tk, { late: 0, react: 0.25 }).ghost : null; }, [tk, best, cfg.pacer]);

  // ---------- 신호등 ----------
  const startLights = useCallback(() => {
    snd.current.unlock(); clearTimers(); resetRun(); setLit(0); setP('lights');
    for (let i = 1; i <= LIGHTS; i += 1) later(() => { setLit(i); snd.current.event('light', { n: i }); }, LIGHT_EVERY * i);
    const hold = 400 + Math.random() * 1800;     // 다 켜진 뒤 꺼질 때까지: 0.4~2.2초 사이 아무 때나
    later(() => { setLit(0); g.current.t0 = performance.now(); setP('go'); }, LIGHT_EVERY * LIGHTS + hold);
  }, [setP]);

  // ---------- 연습(배우는 방법 '연습 구간'): 시간을 재지 않고 첫 진한 구간 두 곳까지 ----------
  const startPractice = useCallback(() => {
    snd.current.unlock(); clearTimers(); resetRun();
    const z = coachZones(); const s = g.current;
    s.practiceEnd = z.length ? z[z.length - 1].s1 + 120 : 600;
    s.last = performance.now(); setP('practice');
  }, [setP]);

  const finish = useCallback((instant = false) => {
    const s = g.current; const tkk = s.tk; const run = s.run;
    const ms = Math.round(s.react + run.t * 1000);
    const prev = lapRecords()[id] || null;
    const cmp = prev?.ghost ? compareSectors(tkk, s.ghost, prev.ghost, ms / 1000, prev.best / 1000) : null;
    const offList = offCorners(tkk, run.offAt);
    // 순위표: 처음 끝까지 달리면 이름(나)을 만들고, 이번 주 순위가 저장 전후로 어떻게 바뀌었는지
    const before = boardOf(id, 'week').me; myPlayer(true);
    const saved = saveLap(id, { ms, react: Math.round(s.react), ghost: s.ghost.map((v) => Math.round(v)), wkKey: weekOf(Date.now()).key });
    const after = boardOf(id, 'week');
    if (saved.best) { s.best = s.ghost.slice(); setBest(ms); }
    trackEvent('lap_finished', { track: id, ms, offs: run.offCount, best: saved.best });
    buzz('finish'); snd.current.event('finish', { best: !!saved.best });
    // 구간 기록: 이번 바퀴와 이전 최고 기록(있으면)을 같은 세 구간으로
    const thirds = thirdsOf(tkk, s.ghost, ms / 1000); const thirdsPrev = prev?.ghost ? thirdsOf(tkk, prev.ghost, prev.best / 1000) : null;
    setResult({ ms, react: Math.round(s.react), vmax: Math.round(run.vmax * 3.6), offs: run.offCount, offList, cmp, isBest: saved.best, prev: saved.prev, thirds, thirdsPrev,
      rank: after.me ? { n: after.me.rank, count: after.count, before: before ? before.rank : null, pid: after.me.pid, near: after.near, goals: after.goals } : null });
    setFirstRun(false); setDelta(null);
    // 결승선을 지난 뒤: 차가 속도를 줄이는 1.5초 동안 가운데 큰 기록 → 계속 달리는 차와 그 아래 결과 카드
    if (instant) { s.coast = { s: 0, v: 0, t: 0 }; setP('done'); return; }
    s.coast = { s: 0, v: run.v, t: 0 }; setP('finish');
    later(() => { if (g.current.phase === 'finish') setP('done'); }, reducedMotion(g.current.cfg) ? 900 : FINISH_MS);
  }, [id, setP, buzz]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 누르기 ----------
  const press = useCallback((isDown) => {
    const s = g.current; if (isDown) snd.current.unlock();
    if (isDown && s.phase === 'lights') {          // 부정 출발
      clearTimers(); setLit(0); trackEvent('lap_jump_start', { track: id }); snd.current.event('jump');
      setP('wait'); later(() => startLights(), 1600);
      return;
    }
    if (isDown && s.phase === 'go') { snd.current.event('launch'); s.react = performance.now() - s.t0; s.last = performance.now(); s.reactUntil = performance.now() + 1400; setReactMs(Math.round(s.react)); setP('run'); }
    if (isDown && s.frozen) { s.frozen = false; s.last = performance.now(); s.acc = 0; }
    s.down = isDown;
  }, [id, setP, startLights]);

  // 멈춤: 창이 가려지면(다른 앱 · 탭 · 화면 꺼짐) 달리던 중이면 멈추고, 신호등 중이면 준비로 돌아간다
  const pauseNow = useCallback(() => {
    const s = g.current; s.down = false; snd.current.suspend();
    if (s.phase === 'run' || s.phase === 'practice') { s.pausedFrom = s.phase; setP('paused'); }
    else if (s.phase === 'lights' || s.phase === 'go' || s.phase === 'wait') { clearTimers(); setLit(0); setP('ready'); }
  }, [setP]);
  const resume = () => { const s = g.current; s.last = performance.now(); s.acc = 0; s.down = false; snd.current.unlock(); snd.current.resume(); setP(s.pausedFrom || 'run'); };
  const restart = () => { if (g.current.pausedFrom === 'practice') startPractice(); else startLights(); };
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') pauseNow(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pauseNow]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (board) closeBoard(); else if (card) setCard(null); else onClose(); return; }
      if (e.key !== ' ' && e.key !== 'ArrowUp') return;
      if (!PRESSABLE.has(g.current.phase)) return;   // 준비 · 결과 · 멈춤에서는 버튼이 스페이스를 받는다
      e.preventDefault();
      if (e.type === 'keydown' && e.repeat) return;
      press(e.type === 'keydown');
    };
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); };
  }, [press, onClose, card, board]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { trackEvent('lap_opened', { track: id }); return () => clearTimers(); }, [id]);
  // 카드가 뜨면 주 버튼으로 포커스(스페이스 · 엔터로 바로 누를 수 있게)
  useEffect(() => { if (!PRESSABLE.has(phase)) primary.current?.focus({ preventScroll: true }); }, [phase, firstRun]);

  // ---------- 데모 빌드 전용: 자동 시험과 조절 판이 상태를 읽고 바꾼다(실서비스 빌드에는 없다) ----------
  useEffect(() => {
    const api = demoApi(); if (!api) return undefined;
    const s = g.current;
    const at = (sPos, v, extra = {}) => { s.run = { ...newRun(), s: sPos, v, ...extra }; s.frozen = true; s.down = true; s.react = 280; s.reactUntil = 0; s.cam = null; };
    const fakeRecord = (late, react) => {
      const r = simLap(s.tk, { late, react }); const ms = Math.round((r.react + r.run.t) * 1000);
      return { best: ms, react: Math.round(react * 1000), runs: 3, at: new Date().toISOString(), ghost: r.ghost.map((v) => Math.round(v)), wk: { key: weekOf(Date.now()).key, ms } };
    };
    const finishWith = (late, react) => {
      const r = simLap(s.tk, { late, react }); clearTimers(); resetRun();
      s.run = r.run; s.ghost = r.ghost; s.react = react * 1000; s.phase = 'run'; finish(true);
    };
    Object.assign(api, {
      get: () => { const i = Math.floor(s.run.s / s.tk.ds) % s.tk.n; return { id, phase: s.phase, s: s.run.s, v: s.run.v, brake: s.tk.brake[i], L: s.tk.L, offs: s.run.offCount, heat: s.run.heat, offTrack: s.run.offTrack, t: s.run.t, react: s.react, cost: s.cost, marks: s.fx.marks.length, debris: s.fx.debris.length, surface: s.offSurface }; },
      press,
      // 소리(데모 · 시험): 지금 엔진 상태 · 상태 기록 켜기 · 기록으로 소리를 다시 만들어 WAV(base64)로
      sound: () => { const m = snd.current.mixer?.m; return { ready: snd.current.ready, enabled: snd.current.enabled, state: snd.current.ctx?.state || null, rpm: m ? Math.round(m.rpm) : null, gear: m ? m.gear : null, load: m ? +m.load.toFixed(2) : null }; },
      soundLog: (on) => { snd.current.setLog(on); return true; },
      soundTest: (name) => snd.current.test(name),
      soundRender: async (fromMs, seconds, scenes) => {
        const ab = scenes ? await renderScenes(scenes) : await renderLog(snd.current.log || [], { seconds, t0: fromMs }); const bytes = wavBytes(ab); let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return window.btoa(bin);
      },
      // 깃발 그림 확인: 'blue' · 'cheq' · null(평소대로)
      flags: (v) => { s.flagTest = v || null; return s.flagTest; },
      soundEvents: () => (snd.current.log || []).filter((e) => e.k === 'e').map((e) => ({ t: e.t, name: e.name })),
      // 남은 구간을 안내대로(진한 구간에서 손을 뗌) 한 번에 달린다 — 결과 화면을 바로 보려는 시험용
      auto: () => { if (s.phase !== 'run') return; while (!s.run.done) { const i = Math.floor(s.run.s / s.tk.ds) % s.tk.n; step(s.run, s.tk, !s.tk.brake[i], DT); const total = s.react / 1000 + s.run.t; while (total >= s.ghostNext) { s.ghost.push(s.run.s); s.ghostNext += GHOST_EVERY; } } },
      // 서킷의 아무 자리(m)에 멈춘 채로 세운다 — 그림 확인용
      seek: (sp, v) => { clearTimers(); resetRun(false); const i = Math.floor(wrapS(sp, s.tk.L) / s.tk.ds) % s.tk.n; at(sp, v ?? s.tk.ideal[i], { t: 3 }); s.coachIdx = 99; setP('run'); return s.phase; },
      // 상태 바로 가기. 그림을 남기려고 멈춘 채로 둔다(누르면 이어서 달린다)
      state: (name) => {
        const z = s.zones; const ix = (sp) => Math.floor(wrapS(sp, s.tk.L) / s.tk.ds) % s.tk.n;
        setCard(null); setDelta(null); setBoard(null);
        if (name === 'ready') { clearTimers(); resetRun(false); setLit(0); setP('ready'); }
        else if (name === 'lights') { clearTimers(); resetRun(false); setLit(3); setP('lights'); }
        else if (name === 'jump') { clearTimers(); resetRun(false); setLit(0); setP('wait'); }
        else if (name === 'go') { clearTimers(); resetRun(false); setLit(0); s.t0 = performance.now(); setP('go'); }
        else if (name === 'run' || name === 'coach') {
          clearTimers(); resetRun(false); const zz = name === 'coach' ? coachZones()[0] : z[Math.min(2, z.length - 1)];
          const sp = name === 'coach' ? zz.s0 + 10 : zz.s0 - 140; at(sp, s.tk.ideal[ix(sp)] * (name === 'coach' ? 1 : 0.97));
          if (name === 'coach') { s.firstRun = true; setFirstRun(true); } else s.coachIdx = 99;
          if (dRef(s) && name === 'run') { const tg = timeAt(dRef(s), sp); if (tg != null) { s.react = 0; s.run.t = tg + 0.31; if (s.cfg.delta !== 'off') { setDelta({ sec: 0.31, ahead: false }); s.deltaUntil = performance.now() + 1e9; } } }
          setP('run');
        } else if (name === 'slip') {
          clearTimers(); resetRun(false); const t = s.tk.turns.reduce((a, b) => (s.tk.vlim[b.i] < s.tk.vlim[a.i] ? b : a)); const sp = t.s - 6;   // 가장 느린 코너에서
          at(sp, s.tk.vlim[ix(sp)] * 1.18, { heat: 0.72, side: s.tk.k[ix(sp)] > 0 ? 1 : -1 }); s.run.off = s.run.side * 0.72 * (HALF_W - 1.5); s.coachIdx = 99;
          if (s.view3) {   // 입체 화면: 세계 m, 레이싱 라인 위에서 밀려난 자국
            const W3 = prep3d(s.tk); const half = 0.76 * CAR3; breakMarks(s.fx);
            for (let k = 26; k >= 0; k -= 1) { const rs = sp - NOSE3 - 1.7 * CAR3 - k * 1.4; const o = rlAt(W3, s.tk, rs) + s.run.off * (1 - k / 30); addMarks(s.fx, rs, o + half, o - half, 0.75 * (1 - k / 28), 'slide'); }
          } else { const ln = s.view?.len || 41, lp = s.view?.latPx || 3, zm = s.view?.zoom || 1.5; const half = (ln * 0.128) / lp; breakMarks(s.fx);
            for (let k = 26; k >= 0; k -= 1) { const rs = sp - (ln * 0.85) / zm - k * 1.4; const o = s.run.off * (1 - k / 30); addMarks(s.fx, rs, o + half, o - half, 0.75 * (1 - k / 28), 'slide'); } }
          setP('run');
        } else if (name === 'off') {
          clearTimers(); resetRun(false); const t = s.tk.turns[Math.min(3, s.tk.turns.length - 1)]; const sp = t.s + 14; const side = s.tk.k[ix(sp)] > 0 ? 1 : -1;
          at(sp, 9, { offTrack: true, offT: 0.9, offCount: 1, offAt: [sp], side, off: side * (HALF_W + 5.5) }); s.yaw = side * -0.45; s.down = false; s.coachIdx = 99;
          { const nowP = performance.now(); const W3 = s.view3 ? prep3d(s.tk) : null;
            for (let k = 0; k < 8; k += 1) { const ps = sp - 6 - k * 2.5; let o = side * (HALF_W + 5.5); if (W3) { o += rlAt(W3, s.tk, ps); const lim = wallAtS(W3, s.tk, ps, side) - 1.4; o = Math.max(-lim, Math.min(lim, o)); } addPuff(s.fx, ps, o + (k % 2 ? 0.8 : -0.8), 'dust', nowP - k * 90, 1.4); } }
          setP('run');
        } else if (name === 'practice') {
          clearTimers(); resetRun(false); const zz = coachZones()[0]; const sp = zz.s0 - 40; at(sp, s.tk.ideal[ix(sp)]);
          s.practiceEnd = coachZones().slice(-1)[0].s1 + 120; s.react = 0; setP('practice');
        } else if (name === 'paused') { clearTimers(); resetRun(false); at(z[1].s0 - 60, 60); s.pausedFrom = 'run'; setP('paused'); }
        else if (name === 'practiceDone') { clearTimers(); resetRun(false); setP('practiceDone'); }
        else if (name === 'result-first') { const all = { ...lapRecords() }; delete all[id]; writeLapRecords(all); s.best = null; setBest(null); finishWith(30, 0.34); }
        else if (name === 'result-best' || name === 'card' || name === 'card-story') {
          const rec = fakeRecord(30, 0.41); writeLapRecords({ ...lapRecords(), [id]: rec }); s.best = rec.ghost; setBest(rec.best); finishWith(0, 0.27);
          if (name !== 'result-best') setDemoCard((d) => ({ f: name === 'card-story' ? 'story' : 'post', n: (d?.n || 0) + 1 }));
        } else if (name === 'board' || name === 'board-all') {   // 순위표: 이번 주 처음 올라간 결과 위에 연다
          const rec = fakeRecord(30, 0.41); writeLapRecords({ ...lapRecords(), [id]: rec }); s.best = rec.ghost; setBest(rec.best); finishWith(0, 0.27); setBoard(name === 'board' ? 'week' : 'all');
        } else if (name === 'result-slower') { const rec = fakeRecord(0, 0.27); writeLapRecords({ ...lapRecords(), [id]: rec }); s.best = rec.ghost; setBest(rec.best); finishWith(30, 0.38); }
        return s.phase;
      },
    });
    return () => { for (const k of ['get', 'press', 'auto', 'state', 'seek']) delete api[k]; };
  }, [id, press, finish, setP]);

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
      s.colors = { bg: css(el, '--bg'), text: css(el, '--text'), text2: css(el, '--text2'), text3: css(el, '--text3'), line2: css(el, '--line'), car: css(el, '--f1'), car3: carColors(css, el) };
      const t = (n) => css(el, `--lap-${n}`);
      s.stage = { ground: t('ground'), dot: t('dot'), runoff: t('runoff'), gravel: t('gravel'), gravelDot: t('gravel-dot'), barrier: t('barrier'), post: t('post'), tyre: t('tyre'),
        asphalt: t('asphalt'), grainA: t('grain-a'), grainB: t('grain-b'), line: t('line'), check: t('check'), kerbA: css(el, '--f1'), kerbB: t('kerb-b'),
        zone: t('zone'), zoneMark: t('zone-mark'), zoneLine: t('zone-line'), rubberRGB: t('rubber'), markRGB: t('mark'), smokeRGB: t('smoke'), dustRGB: t('dust'), streakRGB: t('streak'),
        gantry: t('gantry'), gantryHi: t('gantry-hi'), pod: t('pod'), red: css(el, '--f1'), shadow: t('shadow'), board: t('board'), boardEdge: t('board-edge'), boardText: t('board-text'),
        ghost: t('ghost'), speedRGB: t('speed'), ringBase: t('ring') };
      // 입체 화면: 하늘 · 안개 · 벽 · 철망 · 나무 · 건물 · 관중석 · 그림자
      const fog = t('fog'); const fogRGB = hexRgb(fog);
      Object.assign(s.stage, { skyTop: t('sky-top'), fog, fogMid: `rgba(${fogRGB},.82)`, fogFar: `rgba(${fogRGB},.45)`, fogNone: `rgba(${fogRGB},0)`, skyline: t('skyline'), dot3: t('dot3'),
        pitlane: t('pitlane'), patchRGB: t('patch'), wall: t('wall'), wallPaint: t('wall-paint'), wallTop: t('wall-top'), fence: t('fence'), fenceLine: t('fence-line'), belt: t('belt'), tyre3: t('tyre3'),
        gantrySide: t('gantry-side'), gantryTop: t('gantry-top'), redRGB: hexRgb(css(el, '--f1')), tree: t('tree'), treeHi: t('tree-hi'), trunk: t('trunk'),
        bldLit: t('bld-lit'), bldShade: t('bld-shade'), roof: t('roof'), roofEdge: t('roof-edge'), roofUnder: t('roof-under'), window: t('window'),
        standFront: t('stand-front'), stand: t('stand'), standBack: t('stand-back'), crowd: t('crowd').split(/\s+/).filter(Boolean), garage: t('garage'), glass: t('glass'),
        shadowRGB: t('shadow-rgb'), envShadowA: t('env-shadow-a'), ghostSolid: t('ghost-solid'), ghostA: Number(t('ghost-a')) || 0.4,
        marble: t('marble'), kerbLip: t('kerb-lip'), ao: t('ao'), gravelDot3: t('gravel-dot3'), guide: t('guide'), booth: t('booth'), boothShade: t('booth-shade'), panel: t('panel'),
        lamp: t('lamp'), lampHead: t('lamp-head'), lampHeadOn: t('lamp-head-on'), lampGlowRGB: t('lamp-glow'), night: Number(t('night')) === 1, hoard: t('hoard'), hoardMark: t('hoard-mark'),
        paint: t('paint'), debris: t('debris'), cloudA: Number(t('cloud-a')) || 0, marshal: t('marshal'), marshalHead: t('marshal-head'), flagPole: t('flag-pole'), flagBlue: t('flag-blue'),
        crew: t('crew').split(/\s+/).filter(Boolean), headset: t('headset') });
      s.colors.car3d = { body: css(el, '--f1'), carbon: t('carbon'), tyre: t('tyre-car'), rim: t('rim'), white: '#F4F5F7', rain: t('rain-off'), cockpit: '#0B0C0F', glass: t('mirror') };
      s.theme = themeKey();
    };
    const font = (px, wgt = 600) => `${wgt} ${px}px "Pretendard Variable", Pretendard, system-ui, sans-serif`;
    const lerpCam = (a, b, e) => ({ cx: lerp(a.cx, b.cx, e), cy: lerp(a.cy, b.cy, e), ang: a.ang + angDiff(a.ang, b.ang) * e, zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), e)), ax: lerp(a.ax, b.ax, e), ay: lerp(a.ay, b.ay, e), mix: lerp(a.mix, b.mix, e) });

    const frame = (now) => {
      s.raf = requestAnimationFrame(frame);
      const tStart = performance.now();
      const fdt = s.prevFrame ? Math.min(0.1, (now - s.prevFrame) / 1000) : 1 / 60; s.prevFrame = now;
      if (!s.colors || s.theme !== themeKey()) readColors();
      if (s.tkChanged) {
        s.tkChanged = false; s.zones = zonesOf(s.tk); s.mode = null;
        if (!OVERVIEW.has(s.phase)) { s.timers.forEach(clearTimeout); s.timers = []; s.run = newRun(); s.down = false; setP('ready'); }
      }
      const tk = s.tk; const cfgN = s.cfg; const reduced = reducedMotion(cfgN);
      const TS = paceOf(cfgN);   // 빠르기: 게임 시간이 실제 시간보다 이만큼 빨리 간다. 기록 · 속도 · 시계는 게임 시간(실제 랩 타임 같은 숫자)
      // ---- 물리: 달리는 동안만, 고정 간격으로 ----
      if ((s.phase === 'run' || s.phase === 'practice') && !s.frozen) {
        s.acc += Math.min(0.05, (now - s.last) / 1000) * TS; s.last = now;
        while (s.acc >= DT && !s.run.done) {
          const wasOff = s.run.offTrack; const prevS = s.run.s;
          step(s.run, tk, s.down, DT); s.acc -= DT;
          if (s.phase === 'run') {
            const total = s.react / 1000 + s.run.t;
            while (total >= s.ghostNext) { s.ghost.push(s.run.s); s.ghostNext += GHOST_EVERY; }
            // 코너를 지날 때마다 옅은 차(1위 기록)와의 차이. 내 기록이 생긴 뒤부터(첫 바퀴는 배우는 데 집중)
            if (cfgN.delta === 'corner' && dRef(s)) {
              for (const t of tk.turns) if (prevS < t.s && s.run.s >= t.s) { const tb = timeAt(dRef(s), t.s); if (tb != null) { const d = total - tb; setDelta({ sec: Math.abs(d), ahead: d < 0 }); s.deltaUntil = now + 2400; } }
            }
          }
          if (!wasOff && s.run.offTrack) {
            buzz('off');
            // 벗어난 곳: 시가지는 벽, 상설은 자갈밭(그 코너 바깥에 있으면) 아니면 포장 런오프
            const ri = Math.floor(wrapS(s.run.s, tk.L) / tk.ds); const side = s.run.side || 1;
            s.offSurface = STREET.has(tk.id) ? 'wall' : prepWorld(tk).gravel.some((gz) => gz.side === side && ri >= gz.i0 - 10 && ri <= gz.i1 + 10) ? 'gravel' : 'runoff';
            snd.current.event('off', { v: s.run.v, surface: s.offSurface });
          }
          if (wasOff && !s.run.offTrack && s.offSurface === 'gravel') s.rejoin = { s: s.run.s, side: s.run.side || 1 };
        }
        if (s.phase === 'run' && cfgN.delta === 'live' && dRef(s) && now >= s.deltaNext) {
          const tb = timeAt(dRef(s), s.run.s); s.deltaNext = now + 250;
          if (tb != null && s.run.s > 30) { const d = s.react / 1000 + s.run.t - tb; setDelta({ sec: Math.abs(d), ahead: d < 0 }); s.deltaUntil = now + 1e9; }
        }
        if (s.phase === 'run' && s.run.done) finish();
        if (s.phase === 'practice' && s.run.s >= s.practiceEnd) { trackEvent('lap_practice_done', { track: s.tk.id }); setP('practiceDone'); }
      }
      if (s.deltaUntil && now > s.deltaUntil) { s.deltaUntil = 0; setDelta(null); }
      const run = s.run; const C = s.colors;
      // 자국 · 자갈은 화면 종류마다 단위가 다르다(입체: 세계 m, 위에서: 보이는 m). 바뀌면 지운다
      { const kind = cfgN.view !== 'top' && !reduced ? '3d' : 'top'; if (s.fx.view !== kind) { if (s.fx.view) { s.fx.marks = []; s.fx.debris = []; s.fx.rear = null; } s.fx.view = kind; } }
      // 자갈밭에서 길로 돌아오면 바퀴가 끌고 나온 자갈이 길 가장자리에 흩어진다(입체 화면, 이 레이어를 닫을 때까지 남는다)
      if (s.rejoin) { if (s.view3) { const rnd = () => { s.rnd = (s.rnd * 16807) % 2147483647; return s.rnd / 2147483647; }; addDebris(s.fx, s.rejoin.s - NOSE3, s.rejoin.side, HALF_W, rnd); } s.rejoin = null; }
      // 결승선을 지난 뒤: 식히는 바퀴의 속도까지 줄이고(줄인 움직임이면 멈출 때까지) 결과 화면에서도 계속 달린다. 밀려난 자리는 천천히 레이싱 라인으로
      if ((s.phase === 'finish' || s.phase === 'done') && s.coast) {
        coastStep(s.coast, reduced ? 0 : coolV(tk, s.run.s + s.coast.s), fdt * TS);
        if (s.phase === 'done') { s.run.off *= Math.exp(-fdt / 1.2); s.run.heat = 0; s.run.offTrack = false; }
      }
      // ---- 차와 길의 반응: 브레이크 빛 · 날개 · 타이어 자국 · 연기 · 먼지(같은 프레임에 바로) ----
      let sndLock = 0, sndKerb = 0, sndKerbSide = 0;
      {
        const moving = (s.phase === 'run' || s.phase === 'practice') && !s.frozen;
        const accInst = moving ? (run.v - s.vPrev) / Math.max(fdt * TS, 1 / 240) : 0; s.vPrev = run.v;   // 게임 시간 기준 가속도
        s.accSm += (accInst - s.accSm) * Math.min(1, fdt / 0.35);
        const ii = Math.floor(wrapS(run.s, tk.L) / tk.ds) % tk.n;
        const glowT = moving && !s.down && accInst < -12 ? Math.min(1, -accInst / 38) : 0;
        s.glow += (glowT - s.glow) * Math.min(1, fdt / (glowT > s.glow ? 0.08 : 0.3));
        const straight = Math.abs(tk.k[(ii + 15) % tk.n]) < 1 / 450 && Math.abs(tk.k[ii]) < 1 / 450;
        const aeroT = (moving || s.phase === 'finish') && s.down && run.v > 55 && straight ? 1 : 0;
        s.aero += (aeroT - s.aero) * Math.min(1, fdt / 0.3);
        if (moving && (s.view || s.view3) && s.mode === 'chase') {
          // 뒷바퀴 · 앞바퀴 자리(거리 m)와 옆 위치. 입체 화면은 세계 m(레이싱 라인 포함), 위에서 보는 화면은 보이는 미터
          let rearS, frontS, half, latC;
          if (s.view3) { const v3 = s.view3; rearS = v3.carS - 1.7 * CAR3; frontS = v3.carS + 1.7 * CAR3; half = 0.76 * CAR3; latC = v3.lat; }
          else { const { latPx: lp, zoom: zm, len: ln } = s.view; rearS = run.s - (ln * 0.85) / zm; frontS = run.s - (ln * 0.17) / zm; half = (ln * 0.128) / lp; latC = run.off; }
          const oL = latC + half, oR = latC - half;
          const lock = !s.down && tk.brake[ii] && run.v > tk.easy[ii] + 5 ? Math.min(1, (run.v - tk.easy[ii]) / 16) : 0; sndLock = lock;
          if (run.offTrack) {
            breakMarks(s.fx);
            if (now - s.puffAt > 45 && run.v > 2) { s.puffAt = now; addPuff(s.fx, rearS, oL, 'dust', now, 1.4); addPuff(s.fx, rearS, oR, 'dust', now, 1.4); }
          } else if (s.phase === 'run' && run.t < 1.1 && s.down) {
            addMarks(s.fx, rearS, oL, oR, 1 - run.t / 1.1, 'launch');
            if (now - s.puffAt > 70) { s.puffAt = now; addPuff(s.fx, rearS, oL, 'smoke', now); addPuff(s.fx, rearS, oR, 'smoke', now); }
          } else if (run.heat > 0.15) {
            addMarks(s.fx, rearS, oL, oR, Math.min(1, run.heat), 'slide');
            if (run.heat > 0.5 && now - s.puffAt > 80) { s.puffAt = now; addPuff(s.fx, rearS, run.side > 0 ? oL : oR, 'smoke', now); }
          } else if (lock > 0.15) {
            addMarks(s.fx, frontS, oL - half * 0.1, oR + half * 0.1, lock * 0.8, 'lock');
            if (lock > 0.55 && now - s.puffAt > 90) { s.puffAt = now; addPuff(s.fx, frontS, oL, 'smoke', now, 0.8); addPuff(s.fx, frontS, oR, 'smoke', now, 0.8); }
          } else breakMarks(s.fx);
          // 연석을 타면 바퀴 뒤로 옅은 먼지(입체 화면)
          if (s.view3 && !run.offTrack) {
            const W3 = prep3d(tk); const sd = latC >= 0 ? 1 : -1;
            if (Math.abs(latC) + half > HALF_W - 0.2 && kerbAtS(W3, tk, rearS, sd)) { sndKerb = 1; sndKerbSide = sd; if (now - (s.kerbAt || 0) > 70) { s.kerbAt = now; addPuff(s.fx, rearS, latC + sd * half, 'kerb', now, 0.55); } }
          }
        }
      }

      // 불꽃(입체 화면): 시속 250km 넘게 직선의 이음매 · 진한 구간 시작을 지날 때 바닥판 뒤로 튄다. 아주 빠르면 가끔
      if (s.view3 && s.phase === 'run' && !s.frozen && !run.offTrack && !reducedMotion(cfgN)) {
        const W3 = prep3d(tk); const rnd = () => { s.rnd = (s.rnd * 16807) % 2147483647; return s.rnd / 2147483647; };
        const a = s.sparkS, b = run.s;
        if (b > a && run.v > 69) for (const bp of W3.bumps) if (bp > a && bp <= b) addSparks(s.fx, s.view3.car, run.v, now, 7 + Math.floor(rnd() * 9), rnd);
        if (run.v > 86 && rnd() < fdt * 2.5) addSparks(s.fx, s.view3.car, run.v, now, 2, rnd);
        s.sparkS = b;
      }

      // ---- 긴박감: 옅은 차와의 거리(앞지르기 알림 · 그 차의 엔진 소리) · 마지막 코너 뒤 차이를 계속 ----
      let ghostSnd = null;
      {
        const ghostLap = s.rival || s.pacer; const running = s.phase === 'run' && !s.frozen;
        if (ghostLap && (running || s.phase === 'finish')) {
          const tt = s.react / 1000 + run.t + (s.coast ? s.coast.t : 0);
          const gp = posAt(ghostLap, tt), gp0 = posAt(ghostLap, Math.max(0, tt - 0.1)), gp1 = posAt(ghostLap, Math.max(0, tt - 0.2));
          if (gp != null && gp0 != null && Number.isFinite(gp)) {
            const myS = run.s + (s.coast ? s.coast.s : 0); const myV = s.coast ? s.coast.v : run.v;
            const d = gp - myS; const gv = (gp - gp0) / 0.1; const gv0 = gp1 != null ? (gp0 - gp1) / 0.1 : gv;
            ghostSnd = { d, v: gv, down: gv >= gv0 - 0.05, dv: d > 0 ? myV - gv : gv - myV, lat: 0 };
            if (s.view3) ghostSnd.lat = rlAt(prep3d(tk), tk, gp - NOSE3) - s.view3.lat;
            // 가까이서 순서가 바뀌면 한 번: 3m 넘게 앞이던 차가 3m 넘게 뒤로(또는 반대로). 출발 3초 뒤부터, 4초에 한 번까지
            const sg = d > 3 ? 1 : d < -3 ? -1 : s.ghostSign;
            if (running && run.t > 3 && s.ghostSign && sg !== s.ghostSign && Math.abs(d) < 15 && now - s.passAt > 4000) {
              s.passAt = now; s.passKey = sg < 0 ? 'passed' : 'passedBy'; s.passUntil = now + 1600;
              if (dRef(s) && cfgN.delta !== 'off' && !s.finalOn) { const tb = timeAt(dRef(s), run.s); if (tb != null) { const dd = tt - tb; setDelta({ sec: Math.abs(dd), ahead: dd < 0 }); s.deltaUntil = now + 2400; } }   // 지난 코너의 차이가 남아 거꾸로 보이지 않게
              snd.current.event('whoosh', { gain: 0.3, rate: 0.85, pan: Math.max(-0.6, Math.min(0.6, -ghostSnd.lat / 6)) });
            }
            s.ghostSign = sg;
          }
        }
        // 마지막 코너를 지나면: 한 번 알리고, 내 기록이 있으면 결승선까지 옅은 차와의 차이를 0.1초마다
        if (running) {
          const fS = finalStretchOf(tk);
          if (!s.finalOn && run.s >= fS) { s.finalOn = true; if (tk.L - fS > 250) s.finalUntil = now + 1600; }
          if (s.finalOn && dRef(s) && cfgN.delta !== 'off' && now >= s.deltaNext) {
            const tb = timeAt(dRef(s), run.s); s.deltaNext = now + 100;
            if (tb != null) { const dd = s.react / 1000 + run.t - tb; setDelta({ sec: Math.abs(dd), ahead: dd < 0 }); s.deltaUntil = now + 1e9; }
          }
        }
      }
      // ---- 소리: 매 프레임 상태를 넘긴다(섞기는 sound.js) ----
      {
        const W3s = s.view3 ? prep3d(tk) : null; const lat3 = s.view3 ? s.view3.lat : 0; const carS3 = s.view3 ? s.view3.carS : run.s;
        let wallL = 30, wallR = 30, stand = 0, standPan = 0;
        if (W3s) {
          wallL = wallAtS(W3s, tk, carS3, 1) - lat3; wallR = wallAtS(W3s, tk, carS3, -1) + lat3;
          const st = W3s.stand; const sp = wrapS(carS3, tk.L); const away = (x) => (x < st.s0 ? st.s0 - x : x > st.s1 ? x - st.s1 : 0);
          const dS = Math.min(away(sp), away(sp - tk.L)); stand = 1 - smooth01(dS / 240); standPan = st.side > 0 ? -0.55 : 0.55;
          // 3·2·1 보드를 스칠 때 휙(가까울수록 크게)
          const a = s.sndS, b = carS3;
          if (s.phase === 'run' && !s.frozen && a != null && b > a && b - a < 40) for (const bd of W3s.boards) {
            const bs = bd.s; if (!(bs > a && bs <= b) && !(bs - tk.L > a && bs - tk.L <= b)) continue;
            const o = bd.side * Math.min(HALF_W + 3, wallAtS(W3s, tk, bs, bd.side) - 0.7); const near = Math.abs(o - lat3);
            snd.current.event('whoosh', { gain: 0.3 * Math.min(1, run.v / 70) * Math.min(1, 6 / Math.max(3, near)), rate: 0.75 + run.v / 160, pan: bd.side > 0 ? -0.5 : 0.5 });
          }
          // 광고 다리 밑을 지날 때
          if (s.phase === 'run' && !s.frozen && a != null && b > a && b - a < 40) for (const br of W3s.bridges) { const bs = br.s; if ((bs > a && bs <= b) || (bs - tk.L > a && bs - tk.L <= b)) snd.current.event('bridge', { v: run.v }); }
          s.sndS = b;
        }
        // 화면에서 차가 있는 쪽(지난 프레임의 카메라): 엔진을 그쪽으로 조금
        let carPan = 0; if (s.view3 && s.cam3 && s.cam3.project) { const pr = s.cam3.project(s.view3.car.x, s.view3.car.y, 0.5); const wv = cv.clientWidth || 1; if (pr) carPan = Math.max(-1, Math.min(1, (pr[0] - wv / 2) / (wv / 2))); }
        const inp = {
          phase: s.frozen ? 'ready' : s.phase, v: s.coast ? s.coast.v : run.v, down: s.down, off: run.offTrack, surface: s.offSurface, heat: run.heat, lock: sndLock,
          launch: s.phase === 'run' && run.t < 1.1 ? 1 - run.t / 1.1 : 0, kerb: sndKerb, kerbSide: sndKerbSide, wallL, wallR, street: STREET.has(tk.id), stand, standPan, lit: s.lit, ghost: ghostSnd,
          night: !!(s.stage && s.stage.night), carPan,
        };
        snd.current.update(inp);
        // ---- 계기: 기어 · 회전수 LED(소리와 같은 규칙. 소리를 꺼도 움직인다). 바뀔 때만 DOM에 쓴다 ----
        if (!s.eng) s.eng = createEngine();
        s.eng.update(s.frozen ? { ...inp, phase: s.phase } : inp, now / 1000);   // 데모에서 멈춰 세운 자리도 그 속도의 기어로
        if (revEl.current) {
          const nL = revLeds(s.eng); if (nL !== s.revN) { s.revN = nL; const leds = revEl.current.querySelectorAll('i'); for (let k = 0; k < leds.length; k += 1) leds[k].classList.toggle('is-on', k < nL); }
          if (gearEl.current && s.eng.gear !== s.gearShown) { s.gearShown = s.eng.gear; gearEl.current.textContent = String(s.eng.gear); }
        }
      }

      // ---- 알림 하나: 이탈 > 배우기 안내 > 앞지르기 · 마지막 코너 > 미끄러짐 > 출발 반응 ----
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
            else if ((z.s0 - run.s) / Math.max(run.v, 8) / TS < 1.8) cue = 'soon';   // 실제 1.8초 전에 알린다
          }
          if (!cue && s.cue && now < s.cueUntil) { cue = s.cue === 'press' && s.down ? null : s.cue; if (s.cue === 'press' && s.down) s.cueUntil = 0; }
        }
        if (run.offTrack) want = 'off';
        else if (cue) want = cue;
        else if (s.passKey && now < s.passUntil) want = s.passKey;
        else if (now < s.finalUntil) want = 'final';
        else if (cfgN.slip === 'marks' && run.heat > 0.55) want = 'slip';
        else if (now < s.reactUntil) want = 'react';
      }
      if (want !== s.msgKey) { s.msgKey = want; setMsgKey(want); }
      if (barEl.current) barEl.current.style.transform = `scaleX(${run.offTrack ? Math.min(1, run.offT / tk.D.offHold) : 0})`;

      // ---- 카메라 ----
      const { dpr, w, h } = size();
      const carLen = Math.max(34, Math.min(50, w * 0.105));   // 차 길이(px): 390폭에서 41
      const over = OVERVIEW.has(s.phase);
      const nextT = tk.turns.find((t) => t.s > run.s + 4) || tk.turns[0];
      const view3d = cfgN.view !== 'top' && !reduced;        // 입체(차 뒤 위에서) · 위에서 보기(v2). 줄인 움직임이면 위에서 보기
      const P = s.stage;
      const drawOverlays = (w2s, roadPx, zoom, ang, full) => {
        // 출발선(멀리서 볼 때는 선 하나)
        if (full) {
          const p2 = poseAt(tk, 0, 0); const [X, Y] = w2s(p2.x, p2.y); const a2 = p2.th + ang; const nx = Math.sin(a2), ny = -Math.cos(a2); const hw2 = roadPx * 1.1;
          ctx.strokeStyle = C.text; ctx.lineWidth = 2.5; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(X - nx * hw2, Y - ny * hw2); ctx.lineTo(X + nx * hw2, Y + ny * hw2); ctx.stroke();
        }
      };
      if (view3d) {
        // ===== 입체: 차 뒤 위에서 앞을 내려다본다. 준비 · 결과는 서킷 전체를 바로 위에서(북쪽이 위) =====
        const W3 = prep3d(tk);
        const noseS = run.s + (s.coast ? s.coast.s : 0); const vv = s.coast ? s.coast.v : run.v;
        const carS = noseS - NOSE3;
        const nIdx = Math.floor(wrapS(noseS, tk.L) / tk.ds);
        const kAhead = tk.k[(nIdx + Math.round(6 / tk.ds)) % tk.n];
        // 차의 옆 위치: 레이싱 라인(코너 앞 바깥 → 꼭짓점 안쪽 → 바깥) + 미끄러져 밀린 만큼. 벽을 넘지 않는다
        let lat = rlAt(W3, tk, carS) + run.off;
        { const lim = wallAtS(W3, tk, carS, lat >= 0 ? 1 : -1) - 1.2 * CAR3; lat = Math.max(-lim, Math.min(lim, lat)); }
        const yawT = run.offTrack ? s.yaw : (run.heat > 0 ? Math.sign(kAhead) * run.heat * 0.24 : 0);
        s.steer += (steerOf(kAhead) - s.steer) * Math.min(1, fdt * 10); s.yaw += (yawT - s.yaw) * Math.min(1, fdt * 6);
        if (!run.offTrack && run.heat <= 0 && Math.abs(s.yaw) < 0.002) s.yaw = 0;
        const moving = (s.phase === 'run' || s.phase === 'practice') && !s.frozen;
        s.rain += ((moving && !s.down ? 1 : 0) - s.rain) * Math.min(1, fdt / 0.15);
        { const ct = s.phase === 'finish' ? 1 : 0; s.cheer = (s.cheer || 0) + (ct - (s.cheer || 0)) * Math.min(1, fdt / (ct > (s.cheer || 0) ? 0.35 : 1.2)); }
        // 피트 담 팀 사람들: 결승선 마셜이 체크 깃발을 드는 때(마지막 320m)부터 담에 올라 팔을 든다
        { const ct = s.flagTest === 'cheq' || (s.phase === 'run' && tk.L - run.s < 320) || s.phase === 'finish' ? 1 : 0; s.crewUp = (s.crewUp || 0) + (ct - (s.crewUp || 0)) * Math.min(1, fdt / (ct > (s.crewUp || 0) ? 0.35 : 1.2)); }
        const kv = smooth01(vv / 94);
        const intro = s.phase === 'ready';   // 준비: 서킷 전체 대신 그리드 위 차를 도는 소개 카메라(아래 'intro')
        const parade = s.phase === 'done';   // 결과: 서킷 전체 대신 결승한 차가 계속 달리는 장면(아래 'parade')
        // 카드가 덮지 않는 자리: 카드가 아래에 있으면 그 위, 오른쪽에 있으면(폰을 눕혔을 때) 그 왼쪽
        const freeArea = (gap = 0) => {
          let left = 0, right = w, bottom = h;
          const card = cardRef.current;
          if (card) {
            const cr = card.getBoundingClientRect(), sr = cv.getBoundingClientRect();
            if (cr.left - sr.left > w * 0.25) right = Math.max(left + 160, cr.left - sr.left - gap);
            else bottom = Math.max(140, cr.top - sr.top - gap);
          }
          return { left, right, bottom };
        };
        const cg0 = poseAt(tk, wrapS(carS, tk.L), lat); const gzCar = groundAt(W3, cg0.x, cg0.y);   // 차 아래 땅 높이(고도 자료가 없는 서킷은 0)
        let T;
        if (over && !intro && !parade) {
          const [x0, y0, x1, y1] = tk.box; const pad = 24;
          const top = 8; const fa = freeArea(8); const left = fa.left, right = fa.right, bottom = Math.min(h - 8, fa.bottom);
          const zoom = Math.min((right - left - pad * 2) / (x1 - x0), (bottom - top - pad * 2) / (y1 - y0)); const ALT = 2600;
          T = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: ALT, yaw: -Math.PI / 2, pitch: Math.PI / 2, F: zoom * ALT, ox: (left + right) / 2, oy: (top + bottom) / 2, mix: 0 };
        } else {
          // 출발 전에는 낮고 가까이(그리드 · 신호등), 달리면 빠를수록 조금 멀리 · 넓게(시야가 넓어지며 속도가 붙는다). 가속하면 뒤로 조금 밀린다
          const pre = s.phase === 'lights' || s.phase === 'go' || s.phase === 'wait';
          const fov = ((56 + 10 * kv) * Math.PI) / 180;   // 빠를수록 시야가 넓어진다(56 → 66°)
          // 머리핀처럼 급한 코너에서는 카메라가 벽 너머로 나가지 않게 가까이 · 높이 올라간다
          let kBack = 0; for (let q2 = -18; q2 <= 4; q2 += 2) kBack = Math.max(kBack, Math.abs(tk.k[((nIdx + q2) % tk.n + tk.n) % tk.n]));
          const tight = smooth01((kBack - 1 / 60) / (1 / 14 - 1 / 60));
          const Dc = (pre ? 23 : 30 + 4 * kv + Math.max(-1, Math.min(1, s.accSm / 14)) * 2.4) * (1 - 0.12 * tight);
          const beta = ((pre ? 22 : 34 - 5 * kv + 16 * tight) * Math.PI) / 180;   // 빠를수록 조금 낮게: 가까운 땅이 더 빨리 흐른다
          const F = Math.max(h, w * 0.9) / 2 / Math.tan(fov / 2);
          const yawW = poseAt(tk, wrapS(carS + 10, tk.L), 0).th;
          let kSum = 0; for (let q2 = 30; q2 <= 80; q2 += 10) kSum += tk.k[(nIdx + q2) % tk.n];
          const lead = Math.max(-1, Math.min(1, (kSum / 6) * 700)) * w * 0.06;
          T = { yaw: yawW, Dc, beta, pitch: Math.max((9 * Math.PI) / 180, beta - (25 * Math.PI) / 180),   // 카메라가 높아지면 시선도 함께 숙인다(차 크기가 그대로 보이게)
             F, ox: w / 2 - lead, yCar: h * (h < 420 ? 0.74 : 0.66), mix: 1 };
        }
        // 결승선을 지나면 길가 TV 카메라 한 장면(바로 바꾼다): 차가 다가와 옆을 스쳐 지나가는 것을 따라 돌며 당겨 찍는다
        const mode = intro ? 'intro' : parade ? 'parade' : over ? 'over' : s.phase === 'finish' && cfgN.finish !== 'chase' && s.coast ? 'tv' : 'chase';
        if (s.mode !== mode) { s.mode = mode; s.from3 = mode === 'tv' ? null : s.cam3 ? lerpCam3(s.cam3, s.cam3, 0) : null; s.tt = 0; s.c3 = null; s.introT = 0; if (mode === 'tv') s.tv = null; }
        let cam;
        if (mode === 'intro') {
          // 마리오 카트의 코스 소개처럼: 처음 2.4초는 높은 곳에서 그리드로 내려오고, 그 뒤 차 둘레를 60초에 한 바퀴 천천히 돈다(흔들림 없음).
          // 차는 카드가 덮지 않는 자리 가운데에
          // 길이 방향으로 긴 타원: 옆으로는 양쪽 벽 안쪽(가까운 벽까지의 72%)만 다녀 벽 · 관중석 · 피트 안으로 들어가지 않는다
          s.introT = (s.introT || 0) + fdt;
          const cg = poseAt(tk, wrapS(carS, tk.L), lat); const u = smooth01(Math.min(1, s.introT / 2.4));
          const ph = Math.PI + 0.75 + s.introT * ((2 * Math.PI) / 60);
          const A = lerp(70, 22, u), B = Math.max(5, 0.72 * Math.min(wallAtS(W3, tk, carS, 1), wallAtS(W3, tk, carS, -1)));
          const cp0 = poseAt(tk, wrapS(carS + A * Math.cos(ph), tk.L), B * Math.sin(ph)); const cx = cp0.x, cy = cp0.y;
          const dH = Math.hypot(cg.x - cx, cg.y - cy); const Hc = lerp(38, Math.max(5.6, Math.sqrt(Math.max(0, 196 - dH * dH))), u);   // 옆을 지날 때(벽이 가까운 시가지)는 높이 올라가 차와 14m 안으로 붙지 않는다
          const { left, right, bottom } = freeArea();
          const Fi = Math.max(bottom, (right - left) * 0.9) / 2 / Math.tan((25 * Math.PI) / 180);
          const z = Math.max(gzCar + Hc, groundAt(W3, cx, cy) + 1.2);   // 높이는 차 아래 땅에서(고저차가 있어도 같은 그림)
          cam = { x: cx, y: cy, z, yaw: Math.atan2(cg.y - cy, cg.x - cx), pitch: Math.atan2(z - gzCar - 0.8, dH || 1), F: Fi, ox: (left + right) / 2, oy: bottom * 0.56, mix: 1, gz: gzCar };
        } else if (mode === 'parade') {
          // 결과(마리오 카트의 결승 뒤 장면처럼): 결승한 차가 식히는 바퀴로 계속 달리는 것을 앞에서 비춘다. 카메라는 차 앞 16m에서
          // 왼쪽 앞 54° → 바로 앞 → 오른쪽 앞 54°를 40초에 한 번 오가며 천천히 돈다(흔들림 없음). 차는 결과 카드가 덮지 않는 자리 가운데에.
          // 옆으로는 양쪽 벽 안쪽(가까운 벽까지의 72%)만 다니고 차와 13m 안으로 붙지 않는다. 급한 코너에서는 조금 가까이 · 높이(안쪽 벽이 차를 가리지 않게)
          s.introT = (s.introT || 0) + fdt;
          let kM = 0; for (let q2 = -10; q2 <= 10; q2 += 2) kM = Math.max(kM, Math.abs(tk.k[((nIdx + q2) % tk.n + tk.n) % tk.n]));
          s.paradeTight = lerp(s.paradeTight ?? 0, smooth01((kM - 1 / 80) / (1 / 20 - 1 / 80)), Math.min(1, fdt / 0.6)); const tight = s.paradeTight;
          const cg = poseAt(tk, wrapS(carS, tk.L), lat); const ph = 0.95 * Math.cos(0.9 + s.introT * ((2 * Math.PI) / 40));
          const A = 16 - 5 * tight, B = Math.max(4.5, 0.72 * Math.min(wallAtS(W3, tk, carS, 1), wallAtS(W3, tk, carS, -1)));
          const cp0 = poseAt(tk, wrapS(carS + A * Math.cos(ph), tk.L), B * Math.sin(ph)); const cx = cp0.x, cy = cp0.y;
          const dH = Math.hypot(cg.x - cx, cg.y - cy); const Hc = Math.max(2.6 + 8 * tight, Math.sqrt(Math.max(0, 169 - dH * dH)));
          const { left, right, bottom } = freeArea();
          const Fi = Math.max(bottom, (right - left) * 0.9) / 2 / Math.tan((25 * Math.PI) / 180);
          const z = Math.max(gzCar + Hc, groundAt(W3, cx, cy) + 1.2);
          cam = { x: cx, y: cy, z, yaw: Math.atan2(cg.y - cy, cg.x - cx), pitch: Math.atan2(z - gzCar - 0.7, dH || 1), F: Fi, ox: (left + right) / 2, oy: bottom * 0.56, mix: 1, gz: gzCar };
        } else if (mode === 'tv') {
          const Fb = Math.max(h, w * 0.9) / 2 / Math.tan((30 * Math.PI) / 180);
          if (!s.tv) {
            // 자리: 결승 뒤 굴러가는 시간의 55%쯤에 차가 지나가는 곳. 피트 쪽 길 가장자리 바깥 4.5m(벽이 가까우면 벽 안쪽), 높이 4m
            const tW = (FINISH_MS / 1000) * TS * 0.55; const c = { s: 0, v: Math.max(10, s.coast.v), t: 0 };
            while (c.t < tW) coastStep(c, reduced ? 0 : coolV(tk, noseS + c.s), 1 / 60);   // 위 '결승선을 지난 뒤'와 같은 규칙으로 미리
            const sd = W3.pit.side; const sC = wrapS(carS + c.s, tk.L); const p0 = poseAt(tk, sC, sd * Math.min(HALF_W + 4.5, wallAtS(W3, tk, sC, sd) - 0.8));   // 벽 안쪽
            s.tv = { x: p0.x, y: p0.y, z: 4 + groundAt(W3, p0.x, p0.y), yaw: null, F: Fb };
          }
          const tv = s.tv; const ease = (tau) => 1 - Math.exp(-fdt / tau);
          const tc = poseAt(tk, wrapS(carS, tk.L), lat); const dx = tc.x - tv.x, dy = tc.y - tv.y; const d = Math.hypot(dx, dy) || 1;
          const yawT = Math.atan2(dy, dx); tv.yaw = tv.yaw == null ? yawT : tv.yaw + angDiff(tv.yaw, yawT) * ease(0.07);   // 카메라맨이 따라 도는 만큼 조금 늦게
          const FT = Math.max(Fb * 0.8, Math.min(Fb * 6, (0.3 * w * d) / 4.2)); tv.F = lerp(tv.F, FT, ease(0.25));       // 차가 화면 폭의 30%쯤 되게 당긴다
          cam = { x: tv.x, y: tv.y, z: tv.z, yaw: tv.yaw, pitch: Math.atan2(tv.z - gzCar - 0.6, d), F: tv.F, ox: w / 2, oy: h * 0.62, mix: 1, gz: gzCar };
        } else if (mode === 'chase') {
          const ease = (tau) => 1 - Math.exp(-fdt / tau);
          const c3 = s.c3 ? { ...T, yaw: s.c3.yaw + angDiff(s.c3.yaw, T.yaw) * ease(0.22), Dc: lerp(s.c3.Dc, T.Dc, ease(0.35)), beta: lerp(s.c3.beta, T.beta, ease(0.35)), F: lerp(s.c3.F, T.F, ease(0.35)), ox: lerp(s.c3.ox, T.ox, ease(0.5)) } : T;
          s.c3 = c3;
          // 카메라는 차 옆 위치의 절반만 따라간다 → 레이싱 라인을 탈 때 차가 화면에서 좌우로 움직인다
          const cg = poseAt(tk, wrapS(carS, tk.L), lat * 0.5);
          // 오르막 · 내리막: 카메라 받침이 차와 함께 기울어진다(경사각의 80%). 차는 화면 같은 자리에 있고 세상(지평선 · 건물)이 그만큼 오르내린다
          const cI = Math.floor(wrapS(carS, tk.L) / tk.ds) % tk.n; const al = W3.hs ? Math.atan((W3.hs[(cI + 5) % tk.n] - W3.hs[(cI - 5 + tk.n) % tk.n]) / (10 * tk.ds)) * 0.8 : 0;
          const B = c3.Dc * Math.cos(c3.beta - al), H = c3.Dc * Math.sin(c3.beta - al);
          cam = { x: cg.x - Math.cos(c3.yaw) * B, y: cg.y - Math.sin(c3.yaw) * B, z: H + gzCar, yaw: c3.yaw, pitch: c3.pitch - al, F: c3.F, ox: c3.ox, oy: c3.yCar - c3.F * Math.tan(c3.beta - c3.pitch), mix: 1, gz: gzCar };
        } else cam = T;
        const gzT = cam.gz || 0;
        if (s.from3) { s.tt += fdt; const u = Math.min(1, s.tt / 0.34); cam = lerpCam3(s.from3, cam, 1 - (1 - u) ** 3); if (u >= 1) s.from3 = null; }
        cam.gz = gzT; cam.hg = W3.hg;   // 땅 높이(고도 자료가 있는 서킷): 그리는 점마다 그 자리 땅 높이를 더한다
        camera3(cam); s.cam3 = cam;
        const mix = cam.mix;
        const pxm = (cam.F * Math.max(0.05, Math.sin(cam.pitch))) / Math.max(0.5, cam.z - gzT);   // 화면 가운데 바닥의 1m(px)
        const tvOn = mode === 'tv';
        const q = tvOn ? 1 : Math.max(1, 6 / (2 * HALF_W) / pxm);                    // 멀리서 볼 때 길을 6px보다 가늘지 않게: 옆으로만 키운다
        const S3 = tvOn ? CAR3 : CAR3 * Math.max(1, (carLen * 0.55) / (5.25 * CAR3) / pxm);   // 멀리서 볼 때 차도 읽히게
        const cp = poseAt(tk, wrapS(carS, tk.L), lat * q);
        const dl = (rlAt(W3, tk, carS + 3) - rlAt(W3, tk, carS - 3)) / 6;
        const carTh = cp.th - Math.atan(dl * q) + s.yaw;
        const car = { x: cp.x, y: cp.y, th: carTh, S: S3, s: carS, steer: s.steer, brake: s.glow || 0, aero: s.aero || 0, rain: s.rain, spin: noseS, blur: smooth01((vv * TS - 6) / 26),
          roll: Math.max(-0.03, Math.min(0.03, ((vv * vv * kAhead) / 9.8) * 0.006)), pitch: s.accSm < 0 ? Math.max(-0.012, (s.accSm / 40) * 0.012) : Math.min(0.006, (s.accSm / 12) * 0.006),
          C: C.car3d, dot: cfgN.car === 'dot' };
        // 옅은 차: 1위 기록(아무 기록도 없으면 안내대로 달린 차)
        let ghost = null;
        const ghostLap = s.rival || s.pacer;
        if (ghostLap && (s.phase === 'run' || s.phase === 'go' || s.phase === 'paused' || s.phase === 'finish') && mix > 0.5) {
          const total = Math.max(0, s.phase === 'go' ? (now - s.t0) / 1000 : s.react / 1000 + run.t + (s.coast ? s.coast.t : 0));
          const gs = posAt(ghostLap, total);
          if (gs != null && Number.isFinite(gs)) {
            const gS = gs - NOSE3; const gp = poseAt(tk, wrapS(gS, tk.L), rlAt(W3, tk, gS) * q); const gdl = (rlAt(W3, tk, gS + 3) - rlAt(W3, tk, gS - 3)) / 6;
            ghost = { x: gp.x, y: gp.y, th: gp.th - Math.atan(gdl), S: S3, steer: steerOf(tk.k[(Math.floor(wrapS(gs, tk.L) / tk.ds) + 3) % tk.n]), C: C.car3d };
          }
        }
        // 미끄러짐 '원': 차 둘레 바닥에 그린 원이 차오른다. 다 차면 코스 이탈
        const under = cfgN.slip === 'ring' && mix > 0.5 && !run.offTrack && run.heat > 0.02 ? (c2) => {
          const ring = (a0, a1) => { c2.beginPath(); let pen = false; for (let k = 0; k <= 40; k += 1) { const a = a0 + ((a1 - a0) * k) / 40; const X = cp.x + Math.cos(carTh + a) * 3.7 * CAR3, Y = cp.y + Math.sin(carTh + a) * 3.7 * CAR3; const pr = cam.project(X, Y, 0.05); if (!pr) { pen = false; continue; } if (pen) c2.lineTo(pr[0], pr[1]); else { c2.moveTo(pr[0], pr[1]); pen = true; } } c2.stroke(); };
          c2.globalAlpha = Math.min(1, run.heat * 5); c2.lineCap = 'round'; c2.lineWidth = 4;
          c2.strokeStyle = P.ringBase; ring(0, Math.PI * 2);
          c2.strokeStyle = C.car; ring(-Math.PI / 2, -Math.PI / 2 + Math.min(1, run.heat) * Math.PI * 2);
          c2.globalAlpha = 1;
        } : null;
        const w2s3 = (x, y) => cam.project(x, y, 0) || [-1e4, -1e4];
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // 그리기가 무거운 기기: 달리는 동안 평균 12ms를 1.5초 넘게 넘으면 땅 점 · 관중 · 건물 층 줄 · 흐림을 끈다(이 레이어를 닫을 때까지)
        s.heavy = mix > 0.99 && s.cost > 12 ? (s.heavy || 0) + 1 : 0; if (s.heavy > 90) s.lite = true;
        const R = { w, h, dpr, canvas: cv, cam, tk, W3, P, C, detail: mix, q, zone: cfgN.zone, now, fdt: fdt * TS, fx: s.fx, lit: s.lit || 0, car, ghost, font, under, lite: !!s.lite,
          guide: cfgN.line === 'guide' && (s.phase === 'run' || s.phase === 'practice' || s.phase === 'go' || s.phase === 'lights' || s.phase === 'paused'),
          blur: mix > 0.9 && !tvOn && (s.phase === 'run' || s.phase === 'finish') ? smooth01((vv * TS - 70) / 60) : 0,   // 화면에서 흐르는 빠르기(게임 속도 × 빠르기) 기준
          // 깃발: 옅은 차가 뒤에 30m 안으로 붙으면 앞쪽 마셜이 파랑, 결승선 320m 앞부터 결승선 마셜이 체크. 관중은 결승 때 일어선다
          flags: s.flagTest ? { blue: s.flagTest === 'blue', cheq: s.flagTest === 'cheq' } : { blue: s.phase === 'run' && !!ghostSnd && ghostSnd.d < -2 && ghostSnd.d > -30, cheq: (s.phase === 'run' && tk.L - run.s < 320) || s.phase === 'finish' },
          cheer: s.cheer || 0, crewUp: s.crewUp || 0,
          far: mix > 0.5 ? 1500 : 1e9, fog: mix > 0.3 ? [230 + (1 - mix) * 4000, 1000 + (1 - mix) * 8000] : null,
          overlay: mix < 0.3 ? () => drawOverlays(w2s3, Math.max(2 * HALF_W * pxm, 6), pxm, 0, true) : null };
        render3d(ctx, R);
        // 코너 번호(다음 코너는 채운 표) · 처음 배우는 사람의 '손 떼기' 표
        const coaching = s.phase === 'practice' || ((s.phase === 'run' || s.phase === 'go' || s.phase === 'lights') && cfgN.learn === 'coach' && s.firstRun);
        const tagR = lerp(8, 12, mix);
        const turnsL = tk.turns.map((t) => ({ n: t.n, s: t.s, side: tk.k[t.i] > 0 ? 1 : -1, r: tagR, on: mix > 0.5 && nextT && t.n === nextT.n && (s.phase === 'run' || s.phase === 'practice') }));
        const coachL = coaching && mix > 0.5 ? coachZones().slice(s.coachIdx).filter((z) => z.s0 + 3 > noseS + 4).map((z) => ({ s: z.s0, label: tr('lap.zone.tag') })) : [];   // 이미 지난 표는 차 위에 겹치지 않게 뺀다
        labels3d(ctx, cam, tk, W3, { ...R, zoomOver: pxm }, { turns: turnsL, coach: coachL, font, C });
        s.view = null;
        s.view3 = { carS, lat, car: { x: cp.x, y: cp.y, th: carTh, S: S3 } };
      } else {
      s.view3 = null;
        const overview = over && s.phase !== 'done';   // 결과는 서킷 전체 대신 계속 달리는 차
        let T;
        if (overview) {
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
          const noseS = run.s + (s.coast ? s.coast.s : 0); const vv = s.coast ? s.coast.v : run.v;
          const c = poseAt(tk, wrapS(noseS, tk.L), 0);
          const ay = h * (h < 420 ? 0.7 : CAR_AY);
          // 가속하면 조금 멀리, 브레이크를 밟으면 조금 가까이(덜컥이지 않게 0.35초로 고른 가속도)
          let D = (reduced ? 280 : lookAhead(vv) * (1 + Math.max(-1, Math.min(1, s.accSm / 14)) * 0.07)) * Math.min(1.3, Math.sqrt(TS));   // 빠르기만큼 조금 더 멀리(실제 시간으로 보는 거리가 줄지 않게)
          if (s.phase === 'lights' || s.phase === 'go' || s.phase === 'wait') D = 150;   // 출발 전: 그리드에 가까이
          // 앞쪽 코너 방향으로 화면을 조금 비켜, 빠져나갈 길이 더 보이게
          const ni = Math.floor(wrapS(noseS, tk.L) / tk.ds); let kSum = 0; for (let q = 30; q <= 80; q += 10) kSum += tk.k[(ni + q) % tk.n];
          const lead = reduced ? 0 : Math.max(-1, Math.min(1, (kSum / 6) * 700)) * w * 0.08;
          T = { cx: c.x, cy: c.y, ang: reduced ? 0 : -c.th - Math.PI / 2, zoom: ay / D, ax: w / 2 - lead, ay, mix: 1 };
          if (s.phase === 'done') {   // 결과: 카드가 덮지 않는 자리 가운데에 차(앞으로 120m가 보이게)
            let right = w, bottom = h; const card = cardRef.current;
            if (card) { const cr = card.getBoundingClientRect(), sr = cv.getBoundingClientRect(); if (cr.left - sr.left > w * 0.25) right = Math.max(160, cr.left - sr.left); else bottom = Math.max(140, cr.top - sr.top); }
            T = { ...T, ax: right / 2, ay: bottom * 0.62, zoom: (bottom * 0.62) / 120 };
          }
        }
        const mode = overview ? 'over' : 'chase';
        if (s.mode !== mode) { s.mode = mode; s.from = s.cam && !reduced ? { ...s.cam } : null; s.tt = 0; }
        let cam = T;
        if (mode === 'chase' && s.cam && !reduced) {
          cam = { ...T, ang: s.cam.ang + angDiff(s.cam.ang, T.ang) * (1 - Math.exp(-fdt / 0.13)), zoom: s.cam.zoom + (T.zoom - s.cam.zoom) * (1 - Math.exp(-fdt / 0.28)), ax: s.cam.ax + (T.ax - s.cam.ax) * (1 - Math.exp(-fdt / 0.5)) };
        }
        if (s.from) { s.tt += fdt; const u = Math.min(1, s.tt / 0.34); cam = lerpCam(s.from, cam, 1 - (1 - u) ** 3); if (u >= 1) s.from = null; }
        s.cam = cam;
        const { ang, zoom, ax, ay, mix } = cam;
        const cosA = Math.cos(ang), sinA = Math.sin(ang);
        const w2s = (x, y) => { const dx = (x - cam.cx) * zoom, dy = (y - cam.cy) * zoom; return [ax + dx * cosA - dy * sinA, ay + dx * sinA + dy * cosA]; };
        const roadPx = Math.max(2 * HALF_W * zoom, lerp(6, carLen * 1.12, mix));   // 길은 차보다 조금 넓게(실제 비율보다 굵게 그린다)
        const latPx = roadPx / (2 * HALF_W);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const full = mix < 0.999;
        const reach = Math.hypot(w, h) / zoom;
        const backM = (h - ay) / zoom + 90;
        const nose = run.s + (s.coast ? s.coast.s : 0);
        const nIdx = Math.floor(wrapS(nose, tk.L) / tk.ds);
        const i0 = full ? 0 : nIdx - Math.round(backM / tk.ds);
        const i1 = full ? tk.n : nIdx + Math.round(Math.min(tk.L * 0.9, reach) / tk.ds);
        const inWin = (sp) => { if (full) return true; let d = sp - nose; if (d < -tk.L / 2) d += tk.L; if (d > tk.L / 2) d -= tk.L; return d > -backM && d < reach; };
        const W = prepWorld(tk);
        const V = buildView({ tk, w2s, ang, zoom, latPx, roadPx, i0, i1, full, step: full ? 2 : 1, detail: mix });
        const carW = carLen * 0.36;
        // 땅 · 런오프 · 자갈밭 · 방호벽 · 아스팔트 · 고무 자국 · 진한 구간 · 흰 선 · 연석
        drawGround(ctx, V, P, w, h);
        drawTrack(ctx, V, P, W, { zone: cfgN.zone });
        drawStartMarks(ctx, V, P, carLen, carW);
        drawMarks(ctx, V, P, s.fx);
        drawOverlays(w2s, roadPx, zoom, ang, full);
        // 코너 번호: 트랙 바깥쪽에 둥근 표, 글자는 바로 세워서. 다음 코너는 채운 표
        const tagR = lerp(8, 12, mix);
        ctx.font = font(Math.round(lerp(10, 13, mix))); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const t of tk.turns) {
          if (!full && !inWin(t.s)) continue;
          const side = tk.k[t.i] > 0 ? 1 : -1;
          const p2 = poseAt(tk, t.s, side * (roadPx / 2 + lerp(4, latPx * 3.2, mix) + tagR) / zoom); const [X, Y] = w2s(p2.x, p2.y);
          if (X < -20 || X > w + 20 || Y < -20 || Y > h + 20) continue;
          const on = mix > 0.5 && nextT && t.n === nextT.n && (s.phase === 'run' || s.phase === 'practice');
          ctx.fillStyle = on ? C.text : C.bg; ctx.beginPath(); ctx.arc(X, Y, tagR, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = on ? C.bg : C.line2; ctx.lineWidth = on ? 1.5 : 1; ctx.stroke();
          ctx.fillStyle = on ? C.bg : C.text2; ctx.fillText(String(t.n), X, Y + 0.5);
        }
        drawBoards(ctx, V, P, W, font);
        // 처음 배우는 사람: 손을 뗄 자리에 '손 떼기' 표
        const coaching = s.phase === 'practice' || ((s.phase === 'run' || s.phase === 'go' || s.phase === 'lights') && cfgN.learn === 'coach' && s.firstRun);
        if (coaching && mix > 0.5) {
          const zs = coachZones();
          for (let k = s.coachIdx; k < zs.length; k += 1) {
            if (!inWin(zs[k].s0)) continue;
            const p2 = poseAt(tk, wrapS(zs[k].s0 + 3, tk.L), 0); const [X, Y] = w2s(p2.x, p2.y); const a2 = p2.th + ang;
            const label = tr('lap.zone.tag');
            ctx.font = font(13); const tw = ctx.measureText(label).width + 16; const th2 = 24;
            ctx.save(); ctx.translate(X + Math.cos(a2) * 16, Y + Math.sin(a2) * 16);
            ctx.fillStyle = C.text; ctx.beginPath(); ctx.roundRect?.(-tw / 2, -th2 / 2, tw, th2, 12); ctx.fill();
            ctx.strokeStyle = C.bg; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = C.bg; ctx.fillText(label, 0, 1); ctx.restore();
          }
        }
        drawGantry(ctx, V, P, s.lit || 0, 'shadow');
        drawPuffs(ctx, V, P, s.fx, now);
        // 1위 기록(같은 모양의 옅은 차). 아무 기록도 없으면 안내대로 달린 차
        const len = carLen * lerp(0.55, 1, mix);
        const ghostLap = s.rival || s.pacer;
        if (ghostLap && (s.phase === 'run' || s.phase === 'go' || s.phase === 'paused' || s.phase === 'finish') && mix > 0.5) {
          const total = s.phase === 'go' ? (now - s.t0) / 1000 : s.react / 1000 + run.t + (s.coast ? s.coast.t : 0);
          const gs = posAt(ghostLap, total);
          if (gs != null) {
            const gp = poseAt(tk, wrapS(gs - (len * 0.5) / zoom, tk.L), 0); const [X, Y] = w2s(gp.x, gp.y);
            if (cfgN.car === 'dot') { ctx.strokeStyle = P.ghost; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, Math.max(5, len * 0.17), 0, Math.PI * 2); ctx.stroke(); }
            else drawCar(ctx, { x: X, y: Y, rot: gp.th + ang + Math.PI / 2, len, C: { ...C.car3, ghost: P.ghost }, ghost: true });
          }
        }
        // 차: 앞바퀴는 굽은 정도만큼 꺾이고, 미끄러지면 뒤가 바깥으로 돈다
        const carS = wrapS(nose - (len * 0.5) / zoom, tk.L);
        const cp = poseAt(tk, carS, (run.off * latPx) / zoom);
        const kAhead = tk.k[(nIdx + Math.round(6 / tk.ds)) % tk.n];
        const yawT = run.offTrack ? s.yaw : (run.heat > 0 ? Math.sign(kAhead) * run.heat * 0.24 : 0);
        if (reduced) { s.steer = steerOf(kAhead); s.yaw = yawT; } else { s.steer += (steerOf(kAhead) - s.steer) * Math.min(1, fdt * 10); s.yaw += (yawT - s.yaw) * Math.min(1, fdt * 6); }
        if (!run.offTrack && run.heat <= 0 && Math.abs(s.yaw) < 0.002) s.yaw = 0;
        const [cx, cy] = w2s(cp.x, cp.y);
        const carRot = cp.th + ang + Math.PI / 2 + s.yaw;
        if (mix > 0.5 && (s.phase === 'run' || s.phase === 'finish')) drawStreaks(ctx, s.fx, P, { x: cx, y: cy, rot: carRot, len }, run.v + (s.coast ? s.coast.v - run.v : 0), fdt, reduced);
        if (cfgN.car === 'dot') {
          const r = Math.max(6, len * 0.2); ctx.fillStyle = C.car; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();
        } else {
          drawCar(ctx, { x: cx, y: cy, rot: carRot, len, steer: s.steer, C: C.car3, spin: nose, spinFade: mix > 0.5 ? Math.max(0, 1 - run.v / 22) : 0, brake: s.glow || 0, aero: s.aero || 0 });
        }
        drawGantry(ctx, V, P, s.lit || 0, 'beam');
        // 미끄러짐 '원': 차 둘레에 차오르는 원. 다 차면 코스 이탈
        if (cfgN.slip === 'ring' && mix > 0.5 && !run.offTrack && run.heat > 0.02) {
          const r = len * 0.66; ctx.globalAlpha = Math.min(1, run.heat * 5); ctx.lineCap = 'round';
          ctx.strokeStyle = P.ringBase; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = C.car; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.min(1, run.heat) * Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        s.view = { latPx, zoom, len };
      }
      s.cost = (s.cost || 0) * 0.95 + (performance.now() - tStart) * 0.05;   // 그리기에 든 시간(ms, 평균) — 데모의 get()이 읽는다

      // ---- 숫자(DOM에 바로) ----
      const totalMs = s.phase === 'run' || s.phase === 'done' || s.phase === 'paused' || s.phase === 'finish' ? s.react + run.t * 1000 : s.phase === 'go' ? now - s.t0 : 0;
      if (timeEl.current) timeEl.current.textContent = s.phase === 'practice' ? tr('lap.practice.label') : formatLap(totalMs);
      if (speedEl.current) speedEl.current.textContent = String(Math.round((s.coast ? s.coast.v : run.v) * 3.6));
      if (pedalEl.current) {
        const st = s.phase === 'run' || s.phase === 'practice' ? (s.down && !run.offTrack ? 'on' : 'off') : 'idle';
        if (pedalEl.current.dataset.state !== st) { pedalEl.current.dataset.state = st; pedalEl.current.textContent = tr(st === 'off' ? 'lap.pedal.off' : 'lap.pedal'); }
      }
      // 가속 페달: 누르는 동안 눌림, 코스 이탈로 가속할 수 없는 동안 흐리게, '지금 누르세요'에는 테두리
      if (gasEl.current) {
        const st = s.phase === 'go' ? 'go' : s.phase === 'run' || s.phase === 'practice' ? (run.offTrack ? 'lock' : s.down ? 'on' : 'off') : s.down ? 'on' : 'idle';
        if (gasEl.current.dataset.state !== st) gasEl.current.dataset.state = st;
      }
      if (dotEl.current) { const c = poseAt(tk, wrapS(run.s, tk.L), 0); const [mx, my] = mini.at(c.x, c.y); dotEl.current.setAttribute('cx', mx.toFixed(1)); dotEl.current.setAttribute('cy', my.toFixed(1)); }
      if (nextEl.current) { const v = nextT ? String(nextT.n) : ''; if (nextEl.current.textContent !== v) nextEl.current.textContent = v; }
      // 한 바퀴 진행 막대: 내 차(채움)와 옅은 차(빈 원)
      if (progEl.current) progEl.current.style.transform = `scaleX(${Math.min(1, (run.s + (s.coast ? 0 : 0)) / tk.L).toFixed(4)})`;
      if (progGhostEl.current) {
        const gl = s.rival || s.pacer; const tt = s.phase === 'go' ? (now - s.t0) / 1000 : s.react / 1000 + run.t;
        const gpos = gl && (s.phase === 'run' || s.phase === 'go' || s.phase === 'paused') ? posAt(gl, tt) : null;
        progGhostEl.current.style.opacity = gpos == null ? '0' : '1';
        if (gpos != null) progGhostEl.current.style.left = `${Math.min(100, (gpos / tk.L) * 100).toFixed(2)}%`;
      }
    };
    s.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(s.raf);
  }, [finish, tr, mini, buzz, setP]);

  // ---------- 기록 카드 ----------
  const circuitName = L.circuit;
  const cardText = (r) => ({ kicker: tr('lap.title'), circuit: circuitName, stats: tr('lap.card.stats', { react: (r.react / 1000).toFixed(3), offs: r.offs }), site: 'gantryracing.com' });
  const makeCard = (format = 'post') => {
    if (!result) return;
    if (!card) trackEvent('lap_card_opened', { track: id });
    buildCard(format, g.current.tk, result, lockRef.current, cardText(result)).then(setCard);
  };
  // 데모 바로 가기 '기록 카드': 결과가 나온 뒤 한 번 그린다
  const demoDone = useRef(0);
  useEffect(() => {
    if (!demoCard || !result || demoDone.current === demoCard.n) return;
    demoDone.current = demoCard.n;
    const text = { kicker: tr('lap.title'), circuit: circuitName, stats: tr('lap.card.stats', { react: (result.react / 1000).toFixed(3), offs: result.offs }), site: 'gantryracing.com' };
    buildCard(demoCard.f, g.current.tk, result, lockRef.current, text).then(setCard);
  }, [demoCard, result, tr, circuitName]);
  const shareCard = async () => {
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
  };

  // 페달 밖을 눌렀을 때('페달만'): 달리지 않고 페달 위에 '여기를 누르고 있으면 달려요'를 1.6초
  const pointGas = () => { setGasTip(true); clearTimeout(gasTipT.current); gasTipT.current = setTimeout(() => setGasTip(false), 1600); };
  useEffect(() => () => clearTimeout(gasTipT.current), []);
  const gas = {
    onPointerDown: (e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 이미 뗐다 */ } setGasTip(false); press(true); },
    onPointerUp: () => press(false), onPointerCancel: () => press(false), onLostPointerCapture: () => press(false),
    onContextMenu: (e) => e.preventDefault(),
  };
  const showGas = cfg.pedal !== 'off' && PRESSABLE.has(phase);
  const stage = {
    onPointerDown: (e) => {
      if (e.target.closest('button, a')) return; e.preventDefault();
      if (cfg.pedal === 'only') { if (PRESSABLE.has(g.current.phase)) pointGas(); return; }
      press(true);
    },
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
        <button type="button" className="gx-iconbtn gx-lap-snd" aria-pressed={soundOn} aria-label={tr('lap.sound')} onClick={toggleSound}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
            {soundOn ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
          </svg>
        </button>
      </header>
      <div className="gx-lap-strip">
        {phase === 'ready' && (
          <div className="gx-lap-plate">
            <span className="gx-lap-plate-k gx-t13 gx-w600">{meta.race && <><i aria-hidden="true" />{[meta.race.series, meta.race.round ? tr('round.n', { n: meta.race.round }) : null].filter(Boolean).join(' · ')}</>}
              {meta.race && isThisWeek(meta.race, Date.now()) && <span className="gx-lap-tag">{tr('lap.hub.week')}</span>}</span>
            <h2 className="gx-lap-plate-t" id="gx-lap-h">{L.circuit}</h2>
            <span className="gx-t15 gx-sub gx-ell">{[L.country, tr('lap.turns', { n: meta.turns })].filter(Boolean).join(' · ')}</span>
          </div>
        )}
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
        <span className="gx-lap-prog" aria-hidden="true"><i ref={progEl} /><b ref={progGhostEl} /></span>
      </div>
      <div className="gx-lap-stage" {...stage}>
        <canvas ref={canvas} aria-hidden="true" />
        {showGas && (
          <div className="gx-lap-gaswrap">
            {(gasTip || (firstRun && (phase === 'lights' || phase === 'wait' || phase === 'go'))) && <span className="gx-lap-gas-tip gx-t13" aria-hidden="true">{tr('lap.pedal.tip')}</span>}
            <button type="button" className="gx-lap-gas" ref={gasEl} data-state="idle" aria-label={tr('lap.pedal.aria')} {...gas}>
              <span className="gx-lap-gas-plate" aria-hidden="true"><i /><b>{tr('lap.pedal')}</b></span>
            </button>
            <span className="gx-lap-gas-key" aria-hidden="true">{tr('lap.pedal.key')}</span>
          </div>
        )}
        {cfg.rev !== 'off' && (
          <div className={`gx-lap-rev${showGas && (gasTip || (firstRun && (phase === 'lights' || phase === 'wait' || phase === 'go'))) ? ' is-hidden' : ''}`} ref={revEl} aria-hidden="true">
            <span className="gx-lap-rev-gear">{tr('lap.gear')}<b ref={gearEl}>1</b></span>
            <span className="gx-lap-rev-leds">{LEDS.map((k) => <i key={k} />)}</span>
          </div>
        )}
        {(phase === 'lights' || phase === 'wait' || phase === 'go') && (
          <span className="gx-lap-lights" role="img" aria-label={tr('lap.lights', { n: lit })}>
            <i className="gx-lap-beam" />
            {Array.from({ length: LIGHTS }, (_, i) => <span key={i} className={i < lit ? 'is-on' : ''}><i /><i /></span>)}
          </span>
        )}
        <p className={`gx-lap-msg gx-t15${msgKey && msgKey !== 'react' ? '' : ' is-empty'}${msgKey === 'off' ? ' is-off' : ''}`} role="status" aria-live="polite">
          {msgKey === 'react' ? null : msgText}{msgKey === 'off' && <i className="gx-lap-msg-bar" aria-hidden="true"><i ref={barEl} /></i>}
        </p>
        {msgKey === 'react' && (
          <div className="gx-lap-big-react" role="status"><b>{(reactMs / 1000).toFixed(3)}</b><span className="gx-t13">{tr('lap.stat.react')}</span></div>
        )}
        {phase === 'finish' && result && (
          <div className="gx-lap-big-finish" role="status"><b>{formatLap(result.ms)}</b><span className="gx-t15">{verdict}</span></div>
        )}

        {phase === 'ready' && (
          <section className="gx-lap-card is-ready" ref={cardRef} aria-labelledby="gx-lap-h">
            {/* 기록 세 칸: 내 최고 · 이번 주 내 순위 · 이번 주 1위(마리오 카트 타임 어택의 기록 · 목표처럼). 누르면 순위표.
                짧은 화면에서는 위 내용만 카드 안에서 넘기고 출발 버튼은 늘 보인다(소개 장면이 위에 남게) */}
            <div className="gx-lap-scroll">
            <div className="gx-lap-tiles-h"><span className="gx-t15 gx-w600">{tr('lap.tile.title')}</span>
              <button type="button" className="gx-textbtn gx-t15 gx-lap-more" onClick={(e) => openBoard(e)}>{tr('lap.board.title')}<Icon n="chev" s={18} /></button></div>
            <dl className="gx-lap-tiles">
              <div><dt className="gx-t13">{tr('lap.tile.best')}</dt>{best != null ? <dd className="gx-lap-tile-v">{formatLap(best)}</dd> : <dd className="gx-lap-tile-v is-none">{tr('lap.tile.none')}</dd>}
                {rec?.runs > 0 && <dd className="gx-t13 gx-sub">{tr('lap.runs', { n: rec.runs })}</dd>}</div>
              <div><dt className="gx-t13">{tr('lap.tile.rank')}</dt>{wkBoard?.me ? <dd className="gx-lap-tile-v">{tr('lap.rankV', { n: wkBoard.me.rank })}</dd> : <dd className="gx-lap-tile-v is-none">{tr('lap.tile.none')}</dd>}
                {wkBoard?.me && <dd className="gx-t13 gx-sub">{tr('lap.board.of', { n: wkBoard.count.toLocaleString(fmt.locale) })}</dd>}</div>
              <div><dt className="gx-t13">{tr('lap.tile.top')}</dt>{wkBoard?.top ? <dd className="gx-lap-tile-v">{formatLap(wkBoard.top.ms)}</dd> : <dd className="gx-lap-tile-v is-none">{tr('lap.tile.none')}</dd>}
                {wkBoard?.top && <dd className="gx-t13 gx-sub gx-ell">{wkBoard.top.me ? tr('lap.board.me') : nameOf(wkBoard.top.pid, fmt.locale)}</dd>}</div>
            </dl>
            {learn && (
              <ul className="gx-lap-how gx-t15">
                {cfg.pedal === 'off' ? <li><i className="is-road" />{tr('lap.how.hold')}</li> : <li><i className="is-gas" />{tr('lap.how.pedal')}</li>}
                <li><i className={`is-brake is-${cfg.zone}`} />{tr(learn === 'coach' ? 'lap.how.coach' : 'lap.how.lift')}</li>
                {learn === 'practice' ? <li><i className="is-flag" />{tr('lap.how.practice')}</li> : <li><i className="is-light" />{tr('lap.how.lights')}</li>}
              </ul>
            )}
            {learn && <p className="gx-t13 gx-ter">{tr('lap.note')}</p>}
            </div>
            {learn === 'practice'
              ? <div className="gx-lap-acts is-col"><button type="button" ref={primary} className="gx-btn is-primary is-full" onClick={startPractice}>{tr('lap.practice')}</button><button type="button" className="gx-textbtn gx-t15 gx-lap-skip" onClick={startLights}>{tr('lap.skip')}</button></div>
              : <button type="button" ref={primary} className="gx-btn is-primary is-full" onClick={startLights}>{tr('lap.start')}</button>}
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
          <section className="gx-lap-card is-result" ref={cardRef} aria-labelledby="gx-lap-r">
            {/* 위에서부터: 기록 → 이번 주 순위(한 칸씩 올라감) · 다음 목표 → 구간 기록 → 한 줄 이야기 → 숫자 셋. 아래 버튼 줄은 늘 보인다 */}
            <div className="gx-lap-scroll gx-lap-res-body" ref={resBody}>
              <div>
                <span className="gx-t13 gx-sub gx-lap-res-k" id="gx-lap-r">{tr('lap.result.label', { name: L.circuit })}{result.isBest && result.prev != null && <em className="gx-lap-newbest gx-t13 gx-w700">{tr('lap.result.newBest')}</em>}</span>
                <b className="gx-lap-big"><Roll>{formatLap(result.ms)}</Roll></b>
                <span className={`gx-t15 gx-lap-verdict${result.isBest && result.prev != null ? ' is-best' : ''}`}>{verdict}</span>
              </div>
              {result.rank && <LapRank rank={result.rank} reduced={reducedMotion(cfg)} onOpen={(e) => openBoard(e)} />}
              {result.thirds && <LapThirds thirds={result.thirds} prev={result.thirdsPrev} paths={thirdPaths} />}
              {insight && <p className="gx-lap-insight gx-t15">{insight}</p>}
              <dl className="gx-lap-stats">
                <div><dt className="gx-t13">{tr('lap.stat.react')}</dt><dd className="gx-t17 gx-w600">{tr('lap.stat.reactV', { sec: (result.react / 1000).toFixed(3) })}</dd></div>
                <div><dt className="gx-t13">{tr('lap.stat.vmax')}</dt><dd className="gx-t17 gx-w600">{result.vmax}km/h</dd></div>
                <div><dt className="gx-t13">{tr('lap.stat.offs')}</dt><dd className="gx-t17 gx-w600">{tr('lap.stat.offsV', { n: result.offs })}</dd></div>
              </dl>
            </div>
            <div className="gx-lap-acts">
              <button type="button" ref={primary} className="gx-btn is-primary is-grow" onClick={startLights}>{tr('lap.again')}</button>
              <button type="button" className="gx-btn is-weak is-icon" aria-label={tr('lap.card.open')} onClick={() => makeCard('post')}><Icon n="share" s={22} /></button>
            </div>
          </section>
        )}
      </div>
      <p className="gx-vh" id="gx-lap-keys">{tr(cfg.pedal === 'off' ? 'lap.keys' : 'lap.keys.pedal')}</p>
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
      {board && <LapBoard key={board} id={id} circuit={L.circuit} start={board} onClose={closeBoard} />}
    </div>
  );
}
