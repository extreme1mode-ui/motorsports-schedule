// '한 바퀴' 기록 읽기: 유령(0.1초마다 저장한 위치)으로 어느 거리에 몇 초에 닿았는지, 코너 사이 구간마다 얼마나 늦고 빨랐는지.
// 시각은 신호등이 꺼진 때부터다(출발 반응 포함). DOM 없음.
import { step, newRun } from './engine.js';
import { boardOf } from './board.js';
import { lapConfig } from './config.js';
import { lapRecords } from './store.js';

export const GHOST_EVERY = 0.1;

// 유령 기록에서 거리 s에 닿은 시각(초). 못 닿았으면 null
export function timeAt(ghost, s) {
  if (!ghost || ghost.length < 2) return null;
  let lo = 0, hi = ghost.length - 1;
  if (s > ghost[hi]) return null;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ghost[mid] <= s) lo = mid; else hi = mid; }
  const a = ghost[lo], b = ghost[hi]; const f = b > a ? (s - a) / (b - a) : 0;
  return (lo + Math.max(0, Math.min(1, f))) * GHOST_EVERY;
}

// 유령 기록에서 시각 t(초)의 거리
export function posAt(ghost, t) {
  if (!ghost || ghost.length < 2) return null;
  const f = t / GHOST_EVERY; const k = Math.floor(f);
  if (k >= ghost.length - 1) return null;
  return ghost[k] + (ghost[k + 1] - ghost[k]) * (f - k);
}

// 같은 길을 다른 시간에: 움직임(0.1초마다 위치)을 시간만 늘이거나 줄여 거리 L에 total초에 닿게
export function fitGhost(ghost, L, total) {
  const t0 = timeAt(ghost, L); if (t0 == null || !(total > 0) || Math.abs(t0 / total - 1) < 1e-4) return ghost;
  const k = t0 / total; const out = [];
  for (let t = 0; out.length < 20000; t += GHOST_EVERY) { const p = posAt(ghost, t * k); if (p == null) { out.push(ghost[ghost.length - 1]); break; } out.push(p); if (p >= L) break; }
  return out;
}

// 가장 빠르게 달린 차의 움직임(이상 속도를 넘으면 뗀다, 출발 반응 0.2초). 서킷(준비된 트랙)마다 한 번
const idealCache = new WeakMap();
export function idealGhost(tk, react = 0.2, dt = 1 / 120) {
  if (idealCache.has(tk)) return idealCache.get(tk);
  const run = newRun(); const ghost = []; let next = 0; let guard = 0;
  while (react >= next) { ghost.push(0); next += GHOST_EVERY; }
  while (!run.done && guard < 120 * 900) { const i = Math.floor(run.s / tk.ds) % tk.n; step(run, tk, run.v <= tk.ideal[i], dt); guard += 1; while (react + run.t >= next) { ghost.push(run.s); next += GHOST_EVERY; } }
  idealCache.set(tk, ghost);
  return ghost;
}

// 구간: 출발 → 코너 1 → … → 마지막 코너 → 결승선. 구간마다 [from 코너 번호 | null, to 코너 번호 | null, s0, s1]
export function sectorsOf(tk) {
  const pts = [{ n: null, s: 0 }, ...tk.turns.map((t) => ({ n: t.n, s: t.s })), { n: null, s: tk.L }];
  const out = [];
  for (let i = 1; i < pts.length; i += 1) out.push({ from: pts[i - 1].n, to: pts[i].n, s0: pts[i - 1].s, s1: pts[i].s });
  return out;
}

// 이번 기록(cur)과 이전 최고 기록(best)을 구간마다 비교. 가장 많이 늦은 구간과 가장 많이 줄인 구간
export function compareSectors(tk, cur, best, totalCur, totalBest) {
  if (!best || best.length < 2) return null;
  const at = (g, s, total) => (s >= tk.L - 0.01 ? total : timeAt(g, s));
  let lost = null, gained = null;
  for (const sec of sectorsOf(tk)) {
    const c0 = sec.s0 <= 0 ? 0 : at(cur, sec.s0, totalCur), c1 = at(cur, sec.s1, totalCur);
    const b0 = sec.s0 <= 0 ? 0 : at(best, sec.s0, totalBest), b1 = at(best, sec.s1, totalBest);
    if ([c0, c1, b0, b1].some((v) => v == null)) continue;
    const d = (c1 - c0) - (b1 - b0);
    if (!lost || d > lost.d) lost = { ...sec, d };
    if (!gained || d < gained.d) gained = { ...sec, d };
  }
  return { lost: lost && lost.d > 0.05 ? lost : null, gained: gained && gained.d < -0.05 ? gained : null };
}

// 구간 기록: 서킷을 같은 거리로 셋으로 나눈 구간(실제 F1 구간 경계가 아니다)마다 걸린 시간(초). 출발 반응을 첫 구간에 넣고, 끝 구간은 전체 기록으로 닫는다
export const THIRDS = [1 / 3, 2 / 3];
export function thirdsOf(tk, ghost, total) {
  const a = timeAt(ghost, tk.L * THIRDS[0]), b = timeAt(ghost, tk.L * THIRDS[1]);
  if (a == null || b == null || !(total > b)) return null;
  return [a, b - a, total - b];
}

// 코스를 벗어난 거리마다 가장 가까운 코너 번호(겹치면 하나)
export function offCorners(tk, offAt) {
  const out = [];
  for (const s of offAt || []) {
    let bestT = null, bestD = Infinity;
    for (const t of tk.turns) { let d = Math.abs(t.s - s); d = Math.min(d, tk.L - d); if (d < bestD) { bestD = d; bestT = t; } }
    if (bestT && !out.includes(bestT.n)) out.push(bestT.n);
  }
  return out;
}

// 진한 구간 목록(거리 순): { s0, s1 }
export function zonesOf(tk) {
  const out = []; const n = tk.n;
  for (let i = 0; i < n; i += 1) {
    if (tk.brake[i] && !tk.brake[(i - 1 + n) % n]) {
      let j = i; while (tk.brake[j % n] && j < i + n) j += 1;
      out.push({ s0: i * tk.ds, s1: j * tk.ds });
    }
  }
  return out;
}

// 데모 상태 바로 가기용: 계산으로 한 바퀴. late: 진한 구간에서 이만큼(m) 늦게 손을 뗀다. react: 출발 반응(초)
export function simLap(tk, { late = 0, react = 0.3, dt = 1 / 120 } = {}) {
  const run = newRun(); const ghost = []; let next = 0; let zoneAt = -1; let guard = 0;
  while (react >= next) { ghost.push(0); next += GHOST_EVERY; }
  while (!run.done && guard < 120 * 900) {
    const i = Math.floor(run.s / tk.ds) % tk.n;
    let thr = true;
    if (tk.brake[i]) { if (zoneAt < 0) zoneAt = run.s; thr = run.s - zoneAt < late ? true : run.v <= (late > 0 ? tk.ideal[i] : tk.easy[i]); } else zoneAt = -1;
    step(run, tk, thr, dt); guard += 1;
    while (react + run.t >= next) { ghost.push(run.s); next += GHOST_EVERY; }
  }
  return { run, ghost, react };
}

// 옅은 차: 이번 주 1위 기록(이번 주에 아무도 없으면 전체 1위)의 움직임. 내가 1위면 내 최고 기록의 움직임을 그 기록 시간에 맞춘 것,
// 다른 사람이면(데모의 예시 기록) 가장 빠르게 달린 차의 움직임을 그 기록 시간에 맞게 늘인 것. 아무 기록도 없으면 null.
// 실서비스: 서버가 1위 기록과 그 움직임(0.1초마다 위치)을 함께 준다(DEV-NOTES '순위표 서버'). 게임 코드에만 있다(첫 화면에 싣지 않게)
export function rivalOf(id, tk, now = Date.now(), recs = lapRecords(), board = lapConfig().board) {
  if (!tk) return null;
  for (const period of ['week', 'all']) {
    const top = boardOf(id, period, now, recs, board).top; if (!top) continue;
    if (top.me) { const rec = recs[id]; if (rec?.ghost?.length > 2) return { ghost: fitGhost(rec.ghost, tk.L, top.ms / 1000), ms: top.ms, me: true }; continue; }
    return { ghost: fitGhost(idealGhost(tk), tk.L, top.ms / 1000), ms: top.ms, me: false };
  }
  return null;
}
