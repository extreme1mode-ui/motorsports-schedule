// '한 바퀴' — 서킷을 한 손가락으로 한 바퀴 달려 보는 전체 화면 레이어.
// 신호등 다섯 개가 켜졌다 꺼지면 누른다(반응 시간도 기록에 들어간다). 누르고 있으면 달리고, 진하게 칠한 구간에서는 손을 뗀다.
// 그림은 캔버스 한 장(차를 따라가고, 진행 방향이 위), 글자는 DOM. 숫자(시간·속도)는 매 프레임 DOM에 바로 쓴다(리렌더 없음).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './lap.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track as trackEvent } from '../analytics.js';
import { Icon } from '../ui2/Icon.jsx';
import { getLayer } from '../ui2/hooks.js';
import { demoClock } from '../demo/clock.js';
import { GantryLockup } from '../Brand.jsx';
import { drawShareCard } from './share-card.js';
import { HALF_W, newRun, step, poseAt, formatLap } from './engine.js';
import { lapTrackOf, preparedTrack, lapRecords, saveLap, useOpenLap, closeLap, outlinePath } from './store.js';

const LIGHTS = 5;
const LIGHT_EVERY = 900;          // 신호등 하나가 켜지는 간격(ms)
const DT = 1 / 120;
const GHOST_EVERY = 0.1;          // 유령(내 최고 기록) 기록 간격(초)
const css = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
const lerpAngle = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * f; };

export function LapLayer() {
  const id = useOpenLap();
  if (!id || !lapTrackOf(id)) return null;
  return createPortal(<LapGame key={id} id={id} onClose={closeLap} />, getLayer());
}

function LapGame({ id, onClose }) {
  const tr = useT(); const fmt = useFormat();
  const meta = lapTrackOf(id);
  const L = fmt.race(meta.race);
  const [phase, setPhase] = useState('ready');     // ready · lights · go · run · done
  const [lit, setLit] = useState(0);
  const [msg, setMsg] = useState(null);
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(() => lapRecords()[id]?.best ?? null);
  const [card, setCard] = useState(null);          // { url, canvas, note } — 기록 카드
  const lockRef = useRef(null);

  const root = useRef(null); const canvas = useRef(null);
  const timeEl = useRef(null); const speedEl = useRef(null); const pedalEl = useRef(null); const nextEl = useRef(null); const dotEl = useRef(null);
  // 위 줄의 작은 전체 그림(84×56): 트랙 좌표 → 그림 좌표
  const mini = useMemo(() => {
    const tk = preparedTrack(id); const [x0, y0, x1, y1] = tk.box; const w = 84, h = 56, pad = 5;
    const k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0));
    const ox = (w - (x1 - x0) * k) / 2, oy = (h - (y1 - y0) * k) / 2;
    return { d: outlinePath(id, w, h, pad), at: (x, y) => [(x - x0) * k + ox, (y - y0) * k + oy] };
  }, [id]);
  const g = useRef(null);   // 게임 상태(리렌더와 무관)
  if (!g.current) {
    g.current = { tk: preparedTrack(id), run: newRun(), phase: 'ready', down: false, t0: 0, react: 0, acc: 0, last: 0, ghost: [], ghostNext: 0,
      best: lapRecords()[id]?.ghost || null, cam: null, colors: null, theme: null, timers: [], offShown: 0, raf: 0 };
  }
  const setP = useCallback((p) => { g.current.phase = p; setPhase(p); }, []);
  const clearTimers = () => { g.current.timers.forEach(clearTimeout); g.current.timers = []; };
  const later = (fn, ms) => { g.current.timers.push(setTimeout(fn, ms)); };

  // ---------- 신호등 ----------
  const startLights = useCallback(() => {
    const s = g.current; clearTimers();
    s.run = newRun(); s.ghost = []; s.ghostNext = 0; s.acc = 0; s.down = false; s.react = 0;
    setResult(null); setMsg(null); setLit(0); setP('lights');
    for (let i = 1; i <= LIGHTS; i += 1) later(() => setLit(i), LIGHT_EVERY * i);
    const hold = 400 + Math.random() * 1800;     // 다 켜진 뒤 꺼질 때까지: 0.4~2.2초 사이 아무 때나
    later(() => { setLit(0); s.t0 = performance.now(); setP('go'); }, LIGHT_EVERY * LIGHTS + hold);
  }, [setP]);

  const finish = useCallback(() => {
    const s = g.current; const ms = Math.round(s.react + s.run.t * 1000);
    const saved = saveLap(id, { ms, react: Math.round(s.react), ghost: s.ghost.map((v) => Math.round(v)) });
    if (saved.best) { s.best = s.ghost.slice(); setBest(ms); }
    trackEvent('lap_finished', { track: id, ms, offs: s.run.offCount, best: saved.best });
    setResult({ ms, react: Math.round(s.react), vmax: Math.round(s.run.vmax * 3.6), offs: s.run.offCount, isBest: saved.best, prev: saved.prev });
    setP('done');
  }, [id, setP]);

  // ---------- 누르기 ----------
  const press = useCallback((isDown) => {
    const s = g.current;
    if (isDown && s.phase === 'lights') {          // 부정 출발
      clearTimers(); setLit(0); setMsg(tr('lap.msg.jump')); trackEvent('lap_jump_start', { track: id });
      setP('wait'); later(() => startLights(), 1600);
      return;
    }
    if (isDown && s.phase === 'go') { s.react = performance.now() - s.t0; s.last = performance.now(); setMsg(null); setP('run'); }
    s.down = isDown;
  }, [id, setP, startLights, tr]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== ' ' && e.key !== 'ArrowUp') return;
      if (e.target instanceof HTMLButtonElement && e.type === 'keydown' && g.current.phase !== 'run' && g.current.phase !== 'go' && g.current.phase !== 'lights') return;
      e.preventDefault();
      if (e.type === 'keydown' && e.repeat) return;
      press(e.type === 'keydown');
    };
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); };
  }, [press, onClose]);
  useEffect(() => { trackEvent('lap_opened', { track: id }); return () => clearTimers(); }, [id]);
  // 데모 빌드 전용: 자동 시험이 상태를 읽고 누를 수 있게 한다(실서비스 빌드에는 없다)
  useEffect(() => {
    if (!demoClock.enabled) return undefined;
    window.__gantryLap = { get: () => { const s = g.current; const i = Math.floor(s.run.s / s.tk.ds) % s.tk.n; return { phase: s.phase, s: s.run.s, v: s.run.v, brake: s.tk.brake[i], L: s.tk.L, offs: s.run.offCount }; }, press,
      // 남은 구간을 안내대로(진한 구간에서 손을 뗌) 한 번에 달린다 — 결과 화면을 바로 보려는 시험용
      auto: () => { const s = g.current; if (s.phase !== 'run') return; while (!s.run.done) { const i = Math.floor(s.run.s / s.tk.ds) % s.tk.n; step(s.run, s.tk, !s.tk.brake[i], DT); const total = s.react / 1000 + s.run.t; while (total >= s.ghostNext) { s.ghost.push(s.run.s); s.ghostNext += GHOST_EVERY; } } } };
    return () => { delete window.__gantryLap; };
  }, [press]);

  // ---------- 그리기 ----------
  useEffect(() => {
    const s = g.current; const cv = canvas.current; const ctx = cv.getContext('2d');
    const tk = s.tk; const miniAt = mini.at;
    const size = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1); const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      return { dpr, w, h };
    };
    const readColors = () => {
      const el = root.current;
      s.colors = { bg: css(el, '--bg'), road: css(el, '--fill2'), brake: css(el, '--text4'), text: css(el, '--text'), text2: css(el, '--text2'), text3: css(el, '--text3'), line: css(el, '--line'), car: css(el, '--f1') };
      s.theme = document.documentElement.getAttribute('data-theme');
    };
    const frame = (now) => {
      s.raf = requestAnimationFrame(frame);
      if (!s.colors || s.theme !== document.documentElement.getAttribute('data-theme')) readColors();
      // 물리: 달리는 동안만, 고정 간격으로
      if (s.phase === 'run') {
        s.acc += Math.min(0.05, (now - s.last) / 1000); s.last = now;
        while (s.acc >= DT && !s.run.done) {
          const wasOff = s.run.offTrack;
          step(s.run, tk, s.down, DT); s.acc -= DT;
          const total = s.react / 1000 + s.run.t;
          while (total >= s.ghostNext) { s.ghost.push(s.run.s); s.ghostNext += GHOST_EVERY; }
          if (!wasOff && s.run.offTrack) { s.offShown = now; setMsg(tr('lap.msg.off')); }
        }
        if (s.offShown && now - s.offShown > 1800) { s.offShown = 0; setMsg(null); }
        if (s.run.done) finish();
      }
      const run = s.run; const C = s.colors;
      const { dpr, w, h } = size();
      const idx = Math.floor(run.s / tk.ds) % tk.n;
      const center = poseAt(tk, run.s, 0); const car = poseAt(tk, run.s, run.off);
      // 카메라: 진행 방향이 위, 빠를수록 멀리 본다
      const ahead = 170 + 3.3 * run.v;
      const zoomT = ((h - 64) * 0.7) / ahead; const angT = -center.th - Math.PI / 2;
      if (!s.cam) s.cam = { ang: angT, zoom: zoomT };
      s.cam.ang = lerpAngle(s.cam.ang, angT, 0.12); s.cam.zoom += (zoomT - s.cam.zoom) * 0.06;
      const { ang, zoom } = s.cam; const ax = w / 2, ay = (h - 64) * 0.78;
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const w2s = (x, y) => { const dx = (x - center.x) * zoom, dy = (y - center.y) * zoom; return [ax + dx * cosA - dy * sinA, ay + dx * sinA + dy * cosA]; };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
      // 보이는 구간만: 뒤 140m ~ 앞으로 화면 대각선만큼
      const reach = Math.hypot(w, h) / zoom;
      const i0 = idx - Math.round(((h - ay) / zoom + 80) / tk.ds); const i1 = idx + Math.round(Math.min(tk.L * 0.9, reach) / tk.ds);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const pathOf = (from, to) => { ctx.beginPath(); for (let i = from; i <= to; i += 1) { const q = ((i % tk.n) + tk.n) % tk.n; const [X, Y] = w2s(tk.x[q], tk.y[q]); if (i === from) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); } };
      ctx.lineWidth = HALF_W * 2 * zoom; ctx.strokeStyle = C.road; pathOf(i0, i1); ctx.stroke();
      // 손을 떼는 구간(진하게)
      ctx.lineCap = 'butt'; ctx.strokeStyle = C.brake;
      let from = null;
      for (let i = i0; i <= i1 + 1; i += 1) {
        const q = ((i % tk.n) + tk.n) % tk.n; const on = i <= i1 && tk.brake[q] === 1;
        if (on && from == null) from = i;
        if (!on && from != null) { pathOf(from, i - 1); ctx.stroke(); from = null; }
      }
      // 출발선
      if (idx < Math.round(700 / tk.ds) || idx > tk.n - Math.round(700 / tk.ds)) {
        const a = poseAt(tk, 0, HALF_W), b = poseAt(tk, 0, -HALF_W); const [x1, y1] = w2s(a.x, a.y), [x2, y2] = w2s(b.x, b.y);
        ctx.strokeStyle = C.text; ctx.lineWidth = Math.max(2, 1.6 * zoom); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      // 코너 번호: 트랙 바깥쪽에, 글자는 바로 세워서
      ctx.font = '600 13px "Pretendard Variable", Pretendard, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of tk.turns) {
        let d = t.s - run.s; if (d < -tk.L / 2) d += tk.L;
        if (d < -120 || d > reach) continue;
        const side = tk.k[t.i] > 0 ? 1 : -1;
        const p = poseAt(tk, t.s, side * (HALF_W + 20 / zoom)); const [X, Y] = w2s(p.x, p.y);
        if (X < -20 || X > w + 20 || Y < -20 || Y > h + 20) continue;
        ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(X, Y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = C.text2; ctx.fillText(String(t.n), X, Y + 0.5);
      }
      // 내 최고 기록(빈 원)
      if (s.best && (s.phase === 'run' || s.phase === 'go')) {
        const total = s.phase === 'run' ? s.react / 1000 + run.t : (now - s.t0) / 1000;
        const f = total / GHOST_EVERY; const k = Math.floor(f);
        if (k < s.best.length - 1) {
          const gs = s.best[k] + (s.best[k + 1] - s.best[k]) * (f - k); const p = poseAt(tk, gs, 0); const [X, Y] = w2s(p.x, p.y);
          ctx.strokeStyle = C.text3; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, Math.max(5, 2.2 * zoom), 0, Math.PI * 2); ctx.stroke();
        }
      }
      // 차
      const [cx, cy] = w2s(car.x, car.y); const r = Math.max(6, 2.4 * zoom);
      ctx.fillStyle = C.car; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.bg; ctx.lineWidth = 2; ctx.stroke();
      // 숫자(DOM에 바로)
      const totalMs = s.phase === 'run' || s.phase === 'done' ? s.react + run.t * 1000 : s.phase === 'go' ? now - s.t0 : 0;
      if (timeEl.current) timeEl.current.textContent = formatLap(totalMs);
      if (speedEl.current) speedEl.current.textContent = String(Math.round(run.v * 3.6));
      if (pedalEl.current) pedalEl.current.dataset.on = s.phase === 'run' && s.down ? '1' : '0';
      if (dotEl.current) { const [mx, my] = miniAt(center.x, center.y); dotEl.current.setAttribute('cx', mx.toFixed(1)); dotEl.current.setAttribute('cy', my.toFixed(1)); }
      if (nextEl.current) {
        const nx = tk.turns.find((t) => t.s > run.s + 4) || tk.turns[0];
        nextEl.current.textContent = nx ? String(nx.n) : '';
      }
    };
    s.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(s.raf);
  }, [finish, tr, mini]);

  // ---------- 기록 카드 ----------
  const makeCard = useCallback(async () => {
    if (!result) return;
    trackEvent('lap_card_opened', { track: id });
    const cv = await drawShareCard({
      track: g.current.tk, ms: result.ms, lockupEl: lockRef.current,
      text: { kicker: tr('lap.title'), circuit: L.circuit, stats: tr('lap.card.stats', { react: (result.react / 1000).toFixed(3), offs: result.offs }), site: 'gantryracing.com' },
    });
    setCard({ url: cv.toDataURL('image/png'), canvas: cv, note: null });
  }, [result, id, tr, L.circuit]);
  const shareCard = useCallback(async () => {
    if (!card) return;
    trackEvent('lap_card_shared', { track: id });
    try {
      const blob = await new Promise((resolve) => card.canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], `gantry-${id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      throw new Error('no share');
    } catch (e) {
      if (e && e.name === 'AbortError') return;   // 공유 창을 그냥 닫았다
      setCard((c) => (c ? { ...c, note: tr('lap.card.fallback') } : c));
    }
  }, [card, id, tr]);

  const stage = {
    onPointerDown: (e) => { if (e.target.closest('button')) return; e.preventDefault(); press(true); },
    onPointerUp: () => press(false), onPointerCancel: () => press(false), onPointerLeave: () => press(false),
    onContextMenu: (e) => e.preventDefault(),
  };
  const delta = result && result.prev != null ? Math.abs(result.ms - result.prev) / 1000 : null;
  const verdict = !result ? '' : result.prev == null ? tr('lap.result.first')
    : result.isBest ? tr('lap.result.faster', { sec: delta.toFixed(3) }) : tr('lap.result.slower', { sec: ((result.ms - best) / 1000).toFixed(3) });

  return (
    <div className="gx-lap" ref={root} role="dialog" aria-modal="true" aria-label={tr('lap.aria', { name: L.circuit })}>
      <header className="gx-lap-bar">
        <button type="button" className="gx-iconbtn" aria-label={tr('lap.close')} onClick={onClose}><Icon n="close" /></button>
        <span className="gx-lap-title gx-t17 gx-w600 gx-ell">{L.circuit}</span>
        {best != null && <span className="gx-lap-best gx-t13">{tr('lap.best', { time: formatLap(best) })}</span>}
      </header>
      <div className="gx-lap-strip">
        <span className="gx-lap-time" ref={timeEl} aria-live="off">0:00.000</span>
        <svg className="gx-lap-mini" width="84" height="56" viewBox="0 0 84 56" aria-hidden="true"><path d={mini.d} /><circle ref={dotEl} r="3.5" cx="0" cy="0" /></svg>
      </div>
      <div className="gx-lap-stage" {...stage}>
        <canvas ref={canvas} aria-hidden="true" />
        {(phase === 'lights' || phase === 'wait' || phase === 'go') && (
          <span className="gx-lap-lights" role="img" aria-label={tr('lap.lights', { n: lit })}>{Array.from({ length: LIGHTS }, (_, i) => <i key={i} className={i < lit ? 'is-on' : ''} />)}</span>
        )}
        {(msg || phase === 'lights' || phase === 'go') && <p className="gx-lap-msg gx-t15" role="status">{msg || tr(phase === 'go' ? 'lap.msg.go' : 'lap.msg.lights')}</p>}
        <div className="gx-lap-foot">
          <div className="gx-lap-speed"><b ref={speedEl}>0</b><span className="gx-t13">km/h</span><em className="gx-t13" ref={pedalEl} data-on="0">{tr('lap.pedal')}</em></div>
          <div className="gx-lap-next"><span className="gx-t13">{tr('lap.next')}</span><b ref={nextEl} /></div>
        </div>

        {phase === 'ready' && (
          <section className="gx-lap-card" aria-labelledby="gx-lap-h">
            <div><h2 className="gx-t20" id="gx-lap-h">{L.circuit}</h2><span className="gx-t15 gx-sub">{[L.country, tr('lap.turns', { n: meta.turns })].filter(Boolean).join(' · ')}</span></div>
            <ul className="gx-lap-how gx-t15">
              <li><i className="is-road" />{tr('lap.how.hold')}</li>
              <li><i className="is-brake" />{tr('lap.how.lift')}</li>
              <li><i className="is-light" />{tr('lap.how.lights')}</li>
            </ul>
            <button type="button" className="gx-btn is-primary is-full" onClick={startLights}>{tr('lap.start')}</button>
            <p className="gx-t13 gx-ter">{tr('lap.note')}</p>
          </section>
        )}
        {phase === 'done' && result && (
          <section className="gx-lap-card" aria-labelledby="gx-lap-r">
            <div>
              <span className="gx-t13 gx-sub" id="gx-lap-r">{tr('lap.result.label', { name: L.circuit })}</span>
              <b className="gx-lap-big">{formatLap(result.ms)}</b>
              <span className="gx-t15 gx-sub">{verdict}</span>
            </div>
            <dl className="gx-lap-stats">
              <div><dt className="gx-t13">{tr('lap.stat.react')}</dt><dd className="gx-t17 gx-w600">{tr('lap.stat.reactV', { sec: (result.react / 1000).toFixed(3) })}</dd></div>
              <div><dt className="gx-t13">{tr('lap.stat.vmax')}</dt><dd className="gx-t17 gx-w600">{result.vmax}km/h</dd></div>
              <div><dt className="gx-t13">{tr('lap.stat.offs')}</dt><dd className="gx-t17 gx-w600">{tr('lap.stat.offsV', { n: result.offs })}</dd></div>
            </dl>
            <div className="gx-lap-acts">
              <button type="button" className="gx-btn is-primary is-grow" onClick={startLights}>{tr('lap.again')}</button>
              <button type="button" className="gx-btn is-weak is-icon" aria-label={tr('lap.card.open')} onClick={makeCard}><Icon n="share" s={22} /></button>
            </div>
          </section>
        )}
      </div>
      <span className="gx-vh" ref={lockRef} aria-hidden="true"><GantryLockup height={14} /></span>
      {card && (
        <div className="gx-lap-share" role="dialog" aria-modal="true" aria-label={tr('lap.card.open')}>
          <img src={card.url} alt={tr('lap.card.alt', { name: L.circuit, time: formatLap(result.ms) })} />
          {card.note && <p className="gx-t13" role="status">{card.note}</p>}
          <div className="gx-lap-acts">
            <button type="button" className="gx-btn is-primary is-grow" onClick={shareCard}>{tr('lap.card.share')}</button>
            <button type="button" className="gx-btn is-weak" onClick={() => setCard(null)}>{tr('lap.done')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
