// '한 바퀴' 입체 무대: 차 뒤 위에서 앞을 내려다보는 카메라(원근)로 서킷을 그린다. 캔버스 2D만 쓴다.
// 세계 좌표는 엔진과 같다(x 오른쪽 · y 아래 = 남쪽, 단위 m, 바닥 z = 0, z는 위). 서킷 좌표와 코너 위치는 데이터 그대로다.
// 길 위의 것(아스팔트 · 연석 · 진한 구간 · 선)은 띠로, 서 있는 것(벽 · 철망 · 보드 · 갠트리 · 관중석 · 피트 건물 · 나무 · 건물 · 차 · 연기)은
// 카메라에서 먼 것부터 그린다. 주변 풍경(관중석 · 피트 · 나무 · 건물 · 먼 스카이라인)은 계산으로 만든 장식이다. 실제 서킷의 배치가 아니다.
// 흔들림 · 번쩍임은 없다. 빠를수록 소실점에서 바깥으로 땅이 흐려진다(줄인 움직임에서는 이 화면을 쓰지 않는다).
import { HALF_W } from './engine.js';
import { prepWorld } from './world.js';
import { drawCar3d, drawCarShadow } from './car3d.js';

const TAU = Math.PI * 2;
const NEAR = 0.6;
const mod = (i, n) => ((i % n) + n) % n;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const h2 = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// 시가지 서킷(벽이 길에 붙고, 둘레가 건물). 나머지는 상설 서킷(포장 런오프 · 자갈밭 · 타이어 벽 · 나무)
export const STREET = new Set(['mco26', 'sgp26', 'lvg26']);
const TALL = { lvg26: [14, 150], sgp26: [14, 110], mco26: [10, 42] };
// 빛이 나아가는 방향(북서쪽 높은 곳에서 남동쪽 아래로). 그림자는 이 방향으로 눕는다
export const SUN = (() => { const v = [0.32, 0.5, -0.8]; const l = Math.hypot(...v); return v.map((a) => a / l); })();
const SH = [SUN[0] / -SUN[2], SUN[1] / -SUN[2]];   // 높이 1m당 그림자가 바닥에서 밀리는 거리
export const CAR3 = 1.3;                             // 차를 실제보다 이만큼 크게(작은 화면에서 읽히게)
const RUNOFF = 8;                                    // 상설 서킷: 흰 선 바깥 포장 런오프 폭

// ---------- 서킷마다 한 번 ----------
const cache = new WeakMap();
export function prep3d(tk) {
  if (cache.has(tk)) return cache.get(tk);
  const base = prepWorld(tk); const n = tk.n, ds = tk.ds;
  const street = STREET.has(String(tk.id));
  const R = rng(hash(`${tk.id}|3d`));
  const gauss = (sig) => { const r = Math.ceil((3 * sig) / ds); const w = []; let sum = 0; for (let j = -r; j <= r; j += 1) { const v = Math.exp(-0.5 * ((j * ds) / sig) ** 2); w.push(v); sum += v; } return { r, w: w.map((v) => v / sum) }; };
  const conv = (arr, { r, w }) => { const out = new Float32Array(n); for (let i = 0; i < n; i += 1) { let a = 0; for (let j = -r; j <= r; j += 1) a += arr[mod(i + j, n)] * w[j + r]; out[i] = a; } return out; };
  const NX = new Float32Array(n), NY = new Float32Array(n);
  for (let i = 0; i < n; i += 1) { NX[i] = Math.sin(tk.th[i]); NY[i] = -Math.cos(tk.th[i]); }
  // 레이싱 라인: 코너 앞에서 바깥 → 꼭짓점에서 안쪽 → 빠져나가며 바깥(+ 왼쪽). 좁은 평균과 넓은 평균의 차이로 만든다
  const k1 = conv(tk.k, gauss(10)), k2 = conv(tk.k, gauss(42));
  const lim = HALF_W - 1.9;
  let rl = new Float32Array(n);
  for (let i = 0; i < n; i += 1) rl[i] = -lim * Math.tanh(260 * (k1[i] - k2[i]));
  rl = conv(rl, gauss(8));
  // 벽: 왼쪽(+) · 오른쪽(−)까지의 거리. 자갈밭이 있으면 그 뒤로 물린다
  const baseW = street ? HALF_W + 2.6 : HALF_W + RUNOFF + 5;
  const wallL = new Float32Array(n).fill(baseW), wallR = new Float32Array(n).fill(baseW);
  if (!street) for (const gz of base.gravel) { const arr = gz.side > 0 ? wallL : wallR; const need = HALF_W + 2.2 + gz.depth + 4; for (let i = gz.i0; i <= gz.i1; i += 1) { const q = mod(i, n); arr[q] = Math.max(arr[q], need); } }
  const wl = conv(wallL, gauss(8)), wr = conv(wallR, gauss(8));
  for (let i = 0; i < n; i += 1) { wl[i] = Math.max(wl[i], baseW); wr[i] = Math.max(wr[i], baseW); }
  // 코너 근처 벽은 빨강 · 흰 줄로 칠한다(연석이 있는 구간)
  const paint = new Uint8Array(n);
  for (const kb of base.kerbs) for (let i = kb.i0 - 6; i <= kb.i1 + 6; i += 1) paint[mod(i, n)] |= kb.side > 0 ? 1 : 2;
  // 안쪽(내야) 방향: 한 바퀴 동안 오른쪽으로 더 돌면 내야는 오른쪽(−)
  let turn = 0; for (let i = 0; i < n; i += 1) turn += tk.k[i] * ds;
  const infield = turn > 0 ? -1 : 1;
  // 메인 직선: 출발선 앞뒤로 곧은 만큼
  const straightAt = (sM) => Math.abs(k1[mod(Math.round(sM / ds), n)]) < 1 / 420;
  let sBack = 0; while (sBack > -260 && straightAt(sBack - 8)) sBack -= 8;
  let sFwd = 0; while (sFwd < 360 && straightAt(sFwd + 8)) sFwd += 8;
  const stand = { s0: Math.max(sBack, -150) + 10, s1: Math.min(sFwd, 230), side: -infield };
  const pit = { s0: Math.max(sBack, -200), s1: Math.min(sFwd, 300), side: infield };
  const wallAt = (i, side) => (side > 0 ? wl : wr)[mod(i, n)];
  // 거리 지도(6m 칸): 칸마다 가장 가까운 중심선 점과 거리 → 나무 · 건물 자리를 고른다
  const [bx0, by0, bx1, by1] = tk.box; const M = 300; const G = 6;
  const gx0 = bx0 - M, gy0 = by0 - M; const GW = Math.ceil((bx1 - bx0 + 2 * M) / G), GH = Math.ceil((by1 - by0 + 2 * M) / G);
  const near = new Int32Array(GW * GH).fill(-1); const dist = new Float32Array(GW * GH).fill(1e9);
  const cxy = (c) => [gx0 + ((c % GW) + 0.5) * G, gy0 + (Math.floor(c / GW) + 0.5) * G];
  for (let i = 0; i < n; i += 1) { const cx = Math.floor((tk.x[i] - gx0) / G), cy = Math.floor((tk.y[i] - gy0) / G); const c = cy * GW + cx; const [px, py] = cxy(c); const d = Math.hypot(tk.x[i] - px, tk.y[i] - py); if (d < dist[c]) { dist[c] = d; near[c] = i; } }
  const relax = (c, c2) => { const i = near[c2]; if (i < 0) return; const [px, py] = cxy(c); const d = Math.hypot(tk.x[i] - px, tk.y[i] - py); if (d < dist[c]) { dist[c] = d; near[c] = i; } };
  for (let pass = 0; pass < 2; pass += 1) {
    for (let y = 0; y < GH; y += 1) for (let x = 0; x < GW; x += 1) { const c = y * GW + x; if (x > 0) relax(c, c - 1); if (y > 0) { relax(c, c - GW); if (x > 0) relax(c, c - GW - 1); if (x < GW - 1) relax(c, c - GW + 1); } }
    for (let y = GH - 1; y >= 0; y -= 1) for (let x = GW - 1; x >= 0; x -= 1) { const c = y * GW + x; if (x < GW - 1) relax(c, c + 1); if (y < GH - 1) { relax(c, c + GW); if (x < GW - 1) relax(c, c + GW + 1); if (x > 0) relax(c, c + GW - 1); } }
  }
  const field = (x, y) => { const cx = Math.floor((x - gx0) / G), cy = Math.floor((y - gy0) / G); if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return { d: 1e9, i: -1 }; const c = cy * GW + cx; const i = near[c]; if (i < 0) return { d: 1e9, i: -1 }; return { d: Math.hypot(tk.x[i] - x, tk.y[i] - y), i }; };
  const sideOf = (x, y, i) => ((x - tk.x[i]) * NX[i] + (y - tk.y[i]) * NY[i] > 0 ? 1 : -1);
  const inBlock = (i, side, pad) => {   // 관중석 · 피트 건물 자리
    const sM = i * ds; const sw = (a, b) => { let d = sM; if (d > tk.L / 2) d -= tk.L; return d >= a - pad && d <= b + pad; };
    return (side === stand.side && sw(stand.s0, stand.s1)) || (side === pit.side && sw(pit.s0, pit.s1));
  };
  // 벽이 다른 구간의 길 위에 올라가는 자리(가까이 붙은 두 구간 · 입체 교차)는 벽을 세우지 않는다
  const okL = new Uint8Array(n).fill(1), okR = new Uint8Array(n).fill(1);
  const onOther = (i, o, pad) => { const x = tk.x[i] + NX[i] * o, y = tk.y[i] + NY[i] * o; const f = field(x, y); if (f.i < 0) return false; let di = Math.abs(f.i - i); di = Math.min(di, n - di); return di > 25 && f.d < HALF_W + pad; };
  for (let i = 0; i < n; i += 1) { if (onOther(i, wl[i], 2.5)) okL[i] = 0; if (onOther(i, -wr[i], 2.5)) okR[i] = 0; }
  // 연석 · 흰 선도 같은 까닭으로(옆 구간의 아스팔트 위에는 칠하지 않는다)
  const edgeL = new Uint8Array(n).fill(1), edgeR = new Uint8Array(n).fill(1);
  for (let i = 0; i < n; i += 1) { if (onOther(i, HALF_W + 0.6, 0.6)) edgeL[i] = 0; if (onOther(i, -(HALF_W + 0.6), 0.6)) edgeR[i] = 0; }
  // 값 잡음(숲과 빈터)
  const noise = (x, y) => { const X = Math.floor(x), Y = Math.floor(y); const u = x - X, v = y - Y; const s = (t) => t * t * (3 - 2 * t);
    const a = h2(X, Y), b = h2(X + 1, Y), c = h2(X, Y + 1), d = h2(X + 1, Y + 1); return a + (b - a) * s(u) + (c - a) * s(v) + (a - b - c + d) * s(u) * s(v); };
  const trees = []; const blds = [];
  if (!street) {
    const sp = 19;
    for (let y = by0 - 260; y < by1 + 260; y += sp) for (let x = bx0 - 260; x < bx1 + 260; x += sp) {
      const px = x + (R() - 0.5) * sp * 0.9, py = y + (R() - 0.5) * sp * 0.9;
      const { d, i } = field(px, py); if (i < 0 || d > 270) continue;
      const side = sideOf(px, py, i); const w0 = wallAt(i, side);
      if (d < w0 + 16) continue;
      if (inBlock(i, side, 40) && d < w0 + 60) continue;
      if (noise(px / 140, py / 140) < 0.5) continue;
      trees.push({ x: px, y: py, h: 7 + R() * 7, r: 2.8 + R() * 2.6 });
    }
  } else {
    const [hLo, hHi] = TALL[tk.id] || [12, 60];
    const sp = 30;
    for (let y = by0 - 230; y < by1 + 230; y += sp) for (let x = bx0 - 230; x < bx1 + 230; x += sp) {
      const px = x + (R() - 0.5) * 8, py = y + (R() - 0.5) * 8;
      const { d, i } = field(px, py); if (i < 0 || d > 240) continue;
      const side = sideOf(px, py, i); const w0 = wallAt(i, side);
      const hx = 6 + R() * 6.5, hy = 6 + R() * 6.5; const rad = Math.hypot(hx, hy);
      if (d - rad < w0 + 7) continue;
      if (inBlock(i, side, 30) && d - rad < w0 + 40) continue;
      const far = clamp01((d - rad - w0 - 7) / 110);          // 길에서 멀수록 높게(가까운 건물이 앞 코너를 가리지 않게)
      const tall = R() < 0.18 ? 1 : R() * 0.45;
      const hgt = hLo + (hHi - hLo) * tall * (0.25 + 0.75 * far);
      blds.push({ x: px, y: py, hx, hy, a: tk.th[i], h: Math.max(8, Math.min(hgt, 14 + far * 400)), lit: R() });
    }
  }
  // 먼 스카이라인: 방위 0.5°마다 높이(라디안). 시가지는 건물 실루엣, 상설은 낮은 언덕과 숲
  const SKY = new Float32Array(720);
  if (street) { let a = 0; while (a < 720) { const wdt = 2 + Math.floor(R() * 7); const e = (0.4 + R() * (R() < 0.25 ? 3.6 : 1.6)) * (Math.PI / 180); for (let k = 0; k < wdt && a < 720; k += 1, a += 1) SKY[a] = e; if (R() < 0.3) a += 1 + Math.floor(R() * 3); } }
  else { for (let a = 0; a < 720; a += 1) { const t = a / 720; SKY[a] = (0.25 + 0.55 * noise(t * 9, 3.3) + 0.35 * noise(t * 40, 7.1) ** 2) * (Math.PI / 180); } }
  // 불꽃이 튀는 자리(바닥이 노면에 닿는 곳): 직선의 이음매 몇 곳 + 진한 구간 시작
  const bumps = [];
  for (let sM = 40; sM < tk.L; sM += 70 + R() * 130) if (straightAt(sM)) bumps.push(sM);
  for (const z of base.zones) bumps.push(z.s0 + 4);
  bumps.sort((a, b) => a - b);
  // 아스팔트 보수 자국(약간 다른 회색 사각형)
  const patches = [];
  for (let sM = 30; sM < tk.L; sM += 90 + R() * 160) patches.push({ s0: sM, s1: sM + 6 + R() * 18, o0: (R() - 0.5) * HALF_W, w: 2 + R() * 4, a: 0.025 + R() * 0.035 });
  const boards = base.boards.filter((bd) => { const i = mod(Math.round(bd.s / ds), n); return !onOther(i, bd.side * (HALF_W + 3), 3); });
  const out = { base, street, rl, wl, wr, okL, okR, edgeL, edgeR, NX, NY, paint, infield, stand, pit, trees, blds, SKY, bumps, patches, boards };
  cache.set(tk, out);
  return out;
}
export const rlAt = (W3, tk, sM) => { const f = (((sM % tk.L) + tk.L) % tk.L) / tk.ds; const i = Math.floor(f) % tk.n; const j = (i + 1) % tk.n; const u = f - Math.floor(f); return W3.rl[i] + (W3.rl[j] - W3.rl[i]) * u; };
export const wallAtS = (W3, tk, sM, side) => { const i = Math.round((((sM % tk.L) + tk.L) % tk.L) / tk.ds) % tk.n; return (side > 0 ? W3.wl : W3.wr)[i]; };

// ---------- 카메라 ----------
// c: { x, y, z, yaw, pitch, F, ox, oy } — yaw: 바닥에서 보는 방향(세계 각), pitch: 아래로 숙인 각(0 수평 · π/2 바로 아래)
let PX = 0, PY = 0, PZ = 0;
export function camera(c) {
  const cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  c.rx = -syw; c.ry = cyw; c.dx = cyw * cp; c.dy = syw * cp; c.dz = -sp; c.ux = cyw * sp; c.uy = syw * sp; c.uz = cp;
  c.hy = cp > 0.02 ? c.oy - c.F * (sp / cp) : -1e9;
  c.project = (X, Y, Z = 0) => (proj(c, X, Y, Z) ? [PX, PY, PZ] : null);
  return c;
}
function proj(c, X, Y, Z) {
  const ax = X - c.x, ay = Y - c.y, az = Z - c.z;
  const zc = ax * c.dx + ay * c.dy + az * c.dz; if (zc < NEAR) return false;
  PX = c.ox + (c.F * (ax * c.rx + ay * c.ry)) / zc; PY = c.oy - (c.F * (ax * c.ux + ay * c.uy + az * c.uz)) / zc; PZ = zc;
  return true;
}

// ---------- 띠 그리기 ----------
let WX = 0, WY = 0, WCL = false;   // WCL: 안쪽으로 줄였는지(벽 · 보드는 그런 자리에 세우지 않는다)
// 펼친 번호 j(소수)의 중심선에서 옆으로 o(m, + 왼쪽). 급한 코너 안쪽은 반지름의 75%까지만 들어간다(띠가 접히거나 꼬이지 않게 — 연석 · 벽은 그 자리에서 폭이 0이 된다)
function wp(tk, W3, j, o) {
  const n = tk.n; const i = Math.floor(j); const u = j - i; const a = ((i % n) + n) % n, b = a + 1 === n ? 0 : a + 1;
  const kk = tk.k[a] + (tk.k[b] - tk.k[a]) * u;
  WCL = o * kk < 0 && Math.abs(o * kk) > 0.75; if (WCL) o = (o > 0 ? 0.75 : -0.75) / Math.abs(kk);
  WX = tk.x[a] + (tk.x[b] - tk.x[a]) * u + (W3.NX[a] + (W3.NX[b] - W3.NX[a]) * u) * o;
  WY = tk.y[a] + (tk.y[b] - tk.y[a]) * u + (W3.NY[a] + (W3.NY[b] - W3.NY[a]) * u) * o;
  return true;
}
let BA = new Float32Array(16384), BB = new Float32Array(16384);
// j 범위 [ja, jb] 사이 옆 oA ~ oB 띠를 경로에 더한다(채우기는 부른 쪽이). 안 보이는 점에서 끊는다
function band(ctx, cam, tk, W3, ja, jb, oA, oB, zA = 0, zB = 0, step = 1) {
  if (jb <= ja) return false;
  if (BA.length < (jb - ja + 4) * 2) { BA = new Float32Array((jb - ja + 64) * 2); BB = new Float32Array((jb - ja + 64) * 2); }
  let cnt = 0; let any = false;
  const flush = () => { if (cnt >= 2) { ctx.moveTo(BA[0], BA[1]); for (let k = 1; k < cnt; k += 1) ctx.lineTo(BA[k * 2], BA[k * 2 + 1]); for (let k = cnt - 1; k >= 0; k -= 1) ctx.lineTo(BB[k * 2], BB[k * 2 + 1]); ctx.closePath(); any = true; } cnt = 0; };
  const at = (j) => {
    if (wp(tk, W3, j, oA) && proj(cam, WX, WY, zA)) { const ax = PX, ay = PY; if (wp(tk, W3, j, oB) && proj(cam, WX, WY, zB)) { BA[cnt * 2] = ax; BA[cnt * 2 + 1] = ay; BB[cnt * 2] = PX; BB[cnt * 2 + 1] = PY; cnt += 1; return; } }
    flush();
  };
  at(ja); for (let j = Math.floor(ja / step) * step + step; j < jb; j += step) at(j); at(jb);
  flush();
  return any;
}
// 가운데가 j마다 달라지는 띠(레이싱 라인처럼): 가운데 off(j) ± half
function bandVar(ctx, cam, tk, W3, ja, jb, off, half) {
  if (jb <= ja) return;
  if (BA.length < (jb - ja + 4) * 2) { BA = new Float32Array((jb - ja + 64) * 2); BB = new Float32Array((jb - ja + 64) * 2); }
  let cnt = 0;
  const flush = () => { if (cnt >= 2) { ctx.moveTo(BA[0], BA[1]); for (let k = 1; k < cnt; k += 1) ctx.lineTo(BA[k * 2], BA[k * 2 + 1]); for (let k = cnt - 1; k >= 0; k -= 1) ctx.lineTo(BB[k * 2], BB[k * 2 + 1]); ctx.closePath(); } cnt = 0; };
  const at = (j) => { const o = off(j); if (wp(tk, W3, j, o - half) && proj(cam, WX, WY, 0)) { const ax = PX, ay = PY; if (wp(tk, W3, j, o + half) && proj(cam, WX, WY, 0)) { BA[cnt * 2] = ax; BA[cnt * 2 + 1] = ay; BB[cnt * 2] = PX; BB[cnt * 2 + 1] = PY; cnt += 1; return; } } flush(); };
  at(ja); for (let j = Math.floor(ja) + 1; j < jb; j += 1) at(j); at(jb); flush();
}
// 거리 범위(m)를 보이는 구간들의 펼친 j 범위로(바퀴 경계를 넘는 구간까지)
function spans(runs, tk, s0, s1) {
  const out = []; const L = tk.L;
  for (const r of runs) for (const sh of [-L, 0, L]) {
    const a = (s0 + sh) / tk.ds, b = (s1 + sh) / tk.ds;
    const lo = Math.max(a, r.a), hi = Math.min(b, r.a + r.m - 1);
    if (hi > lo) out.push([lo, hi, r]);
  }
  return out;
}

// ---------- 그리기 ----------
// R: { w, h, dpr, cam, tk, W3, P, C, detail, q, zone, now, fdt, fx, lit, car, ghost, labels, blur, overlay, far, fog }
let CXs = new Float32Array(0), CYs = new Float32Array(0), CZs = new Float32Array(0), VIS = new Uint8Array(0);
let ghostCv = null;
export function render3d(ctx, R) {
  const { w, h, cam, tk, W3, P } = R; const n = tk.n; const base = W3.base;
  const q = R.q || 1; const det = R.detail; const show = det > 0.5; const decoA = clamp01((det - 0.5) * 2);
  if (CZs.length < n) { CXs = new Float32Array(n); CYs = new Float32Array(n); CZs = new Float32Array(n); VIS = new Uint8Array(n); }
  // 1) 중심선을 화면으로 · 보이는 구간(이어진 번호 묶음)
  const far = R.far || 1e9; const tanH = (Math.max(cam.ox, w - cam.ox) + 40) / cam.F; let all = true;
  for (let i = 0; i < n; i += 1) {
    const ok = proj(cam, tk.x[i], tk.y[i], 0);
    if (ok) { CXs[i] = PX; CYs[i] = PY; CZs[i] = PZ; }
    const ax = tk.x[i] - cam.x, ay = tk.y[i] - cam.y; const lat = Math.abs(ax * cam.rx + ay * cam.ry);
    const v = ok && PZ < far && lat < PZ * tanH + 70 * q + 30;
    VIS[i] = v ? 1 : 0; if (!v) all = false;
  }
  const runs = [];
  if (all) runs.push({ a: 0, m: n + 1, closed: true });
  else {
    let start = -1; for (let i = 0; i < n; i += 1) if (!VIS[i] && VIS[(i + 1) % n]) { start = (i + 1) % n; break; }
    if (start >= 0) {
      for (let k = 0; k < n; k += 1) {
        const i = (start + k) % n; if (!VIS[i]) continue;
        let m = 0; while (m < n && VIS[(i + m) % n]) m += 1;
        const a = start + k - 2; runs.push({ a, m: m + 4 }); k += m;
      }
    }
  }
  // 안개: 멀수록 땅 색으로
  const fogA = R.fog ? R.fog[0] : 1e9, fogB = R.fog ? R.fog[1] : 2e9;
  const fogK = (z) => clamp01((z - fogA) / (fogB - fogA));

  // 2) 하늘 · 먼 스카이라인 · 땅
  const hy = cam.hy;
  ctx.fillStyle = P.ground; ctx.fillRect(0, 0, w, h);
  if (hy > -2 && det > 0.02) {
    const top = Math.min(h, hy + 1);
    const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, top)); g.addColorStop(0, P.skyTop); g.addColorStop(1, P.fog);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, top);
    // 스카이라인(무한히 먼 곳: 카메라가 돌 때만 움직인다)
    ctx.fillStyle = P.skyline; ctx.beginPath(); ctx.moveTo(0, hy + 1);
    for (let x = 0; x <= w + 3; x += 3) { let az = cam.yaw + Math.atan((x - cam.ox) / cam.F); az = ((az % TAU) + TAU) % TAU; const e = W3.SKY[Math.floor((az / TAU) * 720) % 720]; ctx.lineTo(x, hy - cam.F * Math.tan(e)); }
    ctx.lineTo(w + 3, hy + 1); ctx.closePath(); ctx.fill();
  }
  // 땅 점(세계에 붙은 격자 · 가까울수록 크게): 빠르게 흘러가며 속도를 보여 준다
  if (show && !R.lite) {
    const g = 7, dMax = 150; const fx = cam.dx, fy = cam.dy; const fl = Math.hypot(fx, fy) || 1; const hx = fx / fl, hyv = fy / fl;
    const gxC = cam.x, gyC = cam.y; const halfW = dMax * tanH + 10;
    const pts = [[gxC, gyC], [gxC + hx * dMax - cam.rx * halfW, gyC + hyv * dMax - cam.ry * halfW], [gxC + hx * dMax + cam.rx * halfW, gyC + hyv * dMax + cam.ry * halfW]];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.floor(Math.min(...xs) / g), x1 = Math.ceil(Math.max(...xs) / g), y0 = Math.floor(Math.min(...ys) / g), y1 = Math.ceil(Math.max(...ys) / g);
    if ((x1 - x0) * (y1 - y0) < 4000) {
      ctx.fillStyle = P.dot3;
      for (const band2 of [[0, 50], [50, 100], [100, dMax]]) {
        ctx.globalAlpha = decoA * (band2[0] === 0 ? 1 : band2[0] === 50 ? 0.7 : 0.4); ctx.beginPath();
        for (let gy = y0; gy <= y1; gy += 1) for (let gx = x0; gx <= x1; gx += 1) {
          const r1 = h2(gx, gy); const X = (gx + r1) * g, Y = (gy + h2(gy, gx)) * g;
          if (!proj(cam, X, Y, 0) || PZ < band2[0] || PZ >= band2[1] || PX < -4 || PX > w + 4 || PY > h + 4) continue;
          const sz = Math.max(0.8, Math.min(3.2, (0.16 * cam.F) / PZ)); ctx.rect(PX - sz / 2, PY - sz / 2, sz, sz);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // 3) 길과 그 둘레(바닥에 붙은 것)
  const hw = HALF_W * q;
  const fillBands = (color, fn) => { ctx.fillStyle = color; ctx.beginPath(); fn(); ctx.fill(); };
  const whole = (fn) => { for (const r of runs) fn(r.a, r.a + r.m - 1); };
  ctx.globalAlpha = 1;
  if (show) {
    ctx.globalAlpha = decoA;
    // 피트 레인(내야 쪽, 메인 직선)
    { const pt = W3.pit; const ps0 = pt.s0 < 0 ? pt.s0 + tk.L : pt.s0; const wv = pt.side > 0 ? W3.wl : W3.wr;
      fillBands(P.pitlane, () => { for (const [a, b] of spans(runs, tk, ps0, ps0 + (pt.s1 - pt.s0))) { const wv0 = wv[mod(Math.round(a), n)]; band(ctx, cam, tk, W3, a, b, pt.side * (wv0 + 0.4) * q, pt.side * (wv0 + 11) * q); } }); }
    // 포장 런오프(상설) · 길가 보도(시가지)
    const ro = W3.street ? 1.6 : RUNOFF;
    fillBands(P.runoff, () => whole((a, b) => band(ctx, cam, tk, W3, a, b, -(HALF_W + ro) * q, (HALF_W + ro) * q)));
    // 자갈밭
    if (!W3.street) fillBands(P.gravel, () => { for (const gz of base.gravel) for (const [a, b] of spans(runs, tk, gz.i0 * tk.ds, gz.i1 * tk.ds)) band(ctx, cam, tk, W3, a, b, gz.side * (HALF_W + 2.2) * q, gz.side * (HALF_W + 2.2 + gz.depth) * q); });
    ctx.globalAlpha = 1;
  }
  // 아스팔트
  fillBands(P.asphalt, () => whole((a, b) => band(ctx, cam, tk, W3, a, b, -hw, hw)));
  if (show) {
    ctx.globalAlpha = decoA;
    // 보수 자국 · 레이싱 라인(타이어 고무로 진해진 길) · 브레이크 고무 자국
    for (const pt of W3.patches) { ctx.fillStyle = `rgba(${P.patchRGB},${pt.a})`; ctx.beginPath(); for (const [a, b] of spans(runs, tk, pt.s0, pt.s1)) band(ctx, cam, tk, W3, a, b, pt.o0 * q, (pt.o0 + pt.w) * q); ctx.fill(); }
    ctx.fillStyle = `rgba(${P.rubberRGB},0.16)`; ctx.beginPath();
    whole((a, b) => bandVar(ctx, cam, tk, W3, a, b, (j) => { const i = Math.floor(j), u = j - i; const r0 = W3.rl[mod(i, n)], r1 = W3.rl[mod(i + 1, n)]; return (r0 + (r1 - r0) * u) * q; }, 1.5 * q));
    ctx.fill();
    for (const r of base.rubber) { ctx.fillStyle = `rgba(${P.rubberRGB},${r.a})`; ctx.beginPath(); for (const [a, b] of spans(runs, tk, r.s0, r.s1)) { const o = (W3.rl[mod(Math.round(b), n)] + r.off * 0.5) * q; for (const sd of [-0.95, 0.95]) band(ctx, cam, tk, W3, a, b, o + (sd - 0.17) * q, o + (sd + 0.17) * q); } ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // 진한 구간 + 무늬 + 손을 떼는 선
  for (const z of base.zones) for (const [a, b] of spans(runs, tk, z.s0, z.s1)) {
    fillBands(P.zone, () => band(ctx, cam, tk, W3, a, b, -hw, hw));
    if (!show || R.zone === 'shade') continue;
    ctx.globalAlpha = decoA; ctx.fillStyle = P.zoneMark; ctx.beginPath();
    const jz0 = z.s0 / tk.ds; const shift = Math.round((a - jz0) / (tk.L / tk.ds)) * (tk.L / tk.ds);
    if (R.zone === 'bars') { for (let sM = 7; sM < z.s1 - z.s0 - 1; sM += 9) { const j = jz0 + shift + sM / tk.ds; if (j < a || j + 0.3 > b) continue; band(ctx, cam, tk, W3, j, j + 0.3, -hw * 0.62, hw * 0.62); } }
    else { for (let sM = 9; sM < z.s1 - z.s0 - 3; sM += 14) { const j = jz0 + shift + sM / tk.ds; if (j < a || j + 2 > b) continue; for (const sd of [1, -1]) chevron(ctx, cam, tk, W3, j, sd, hw); } }
    ctx.fill();
    const jl = jz0 + shift; if (jl >= a - 0.01 && jl + 0.5 <= b) fillBands(P.zoneLine, () => band(ctx, cam, tk, W3, jl, jl + 0.5, -hw, hw));
    ctx.globalAlpha = 1;
  }
  if (show) {
    ctx.globalAlpha = decoA;
    // 흰 선(트랙 한계)
    const edgeRuns = (a, b, sd, fn) => { const fl = sd > 0 ? W3.edgeL : W3.edgeR; let st = null; for (let j = Math.floor(a); j <= Math.ceil(b); j += 1) { const ok = fl[mod(j, n)] === 1; if (ok && st == null) st = Math.max(a, j); if ((!ok || j >= Math.ceil(b)) && st != null) { fn(st, Math.min(b, j)); st = null; } } };
    fillBands(P.line, () => whole((a, b) => { for (const sd of [1, -1]) edgeRuns(a, b, sd, (ja, jb) => band(ctx, cam, tk, W3, ja, jb, sd * (HALF_W - 0.6) * q, sd * (HALF_W - 0.3) * q)); }));
    // 연석: 빨강 · 흰색이 번갈아(4m)
    for (const odd of [0, 1]) fillBands(odd ? P.kerbA : P.kerbB, () => {
      for (const kb of base.kerbs) for (const [a, b] of spans(runs, tk, kb.i0 * tk.ds, kb.i1 * tk.ds)) {
        const fl = kb.side > 0 ? W3.edgeL : W3.edgeR;
        for (let j = Math.floor(a / 2) * 2; j < b; j += 2) { if (((Math.floor(j / 2) % 2) + 2) % 2 !== odd) continue; if (!fl[mod(j, n)] || !fl[mod(j + 2, n)]) continue;
          if (Math.max(Math.abs(tk.k[mod(j, n)]), Math.abs(tk.k[mod(j + 2, n)])) * (HALF_W + 1.7) * q > 0.7 && kb.side * tk.k[mod(j, n)] < 0) continue;   /* 머리핀 꼭짓점: 연석 띠가 접히는 자리는 비운다 */
          const ja = Math.max(a, j), jb = Math.min(b, j + 2); if (jb > ja) band(ctx, cam, tk, W3, ja, jb, kb.side * (HALF_W - 0.25) * q, kb.side * (HALF_W + 1.7) * q); }
      }
    });
    // 출발: 체크무늬 두 줄 · 그리드 칸(8m 간격, 좌우 엇갈림)
    startMarks(ctx, cam, tk, W3, runs, P, q);
    // 타이어 자국(이번 바퀴): 길에 붙어 남는다
    drawMarks3d(ctx, cam, tk, W3, R.fx, P, q, R.car);
    ctx.globalAlpha = 1;
  }
  if (R.overlay) R.overlay(ctx);

  // 4) 서 있는 것: 먼 것부터
  const items = [];
  const shadowPath = new Path2D(); let anyShadow = false;
  if (show) {
    const camGX = cam.x, camGY = cam.y;
    const inView = (X, Y, Z, pad) => proj(cam, X, Y, Z) && PZ < far && PX > -pad && PX < w + pad && PY > -pad - 400 && PY < h + pad;
    // 벽 · 철망 · 타이어 벽(구간마다 한 조각)
    for (const r of runs) for (const sd of [1, -1]) {
      const warr = sd > 0 ? W3.wl : W3.wr; const wallH = W3.street ? 1.1 : 0.95; const fenceH = W3.street ? 4.2 : 3.4;
      let j = r.a; const end = r.a + r.m - 1;
      while (j < end) {
        const i0 = mod(j, n); const zc = CZs[i0];
        const st = zc < 90 ? 2 : zc < 220 ? 4 : 8; const j2 = Math.min(end, j + st);
        const i1 = mod(j2, n); const o0 = sd * warr[i0] * q, o1 = sd * warr[i1] * q;
        const okA = sd > 0 ? W3.okL : W3.okR; if (!okA[i0] || !okA[i1]) { j = j2; continue; }
        // 급한 코너(반지름 35m 아래)의 안쪽 · 작은 섬(벽이 중심에서 6m 안)에는 벽을 세우지 않는다(머리핀 안쪽에서 벽이 차를 가리지 않게)
        const kI = Math.abs(tk.k[i0]) > Math.abs(tk.k[i1]) ? tk.k[i0] : tk.k[i1]; if (o0 * kI < 0 && (Math.abs(o0) > 1 / Math.abs(kI) - 6 || Math.abs(kI) > 1 / 35)) { j = j2; continue; }
        const ok0 = wp(tk, W3, j, o0) && !WCL; const ax = WX, ay = WY; const ok1 = wp(tk, W3, j2, o1) && !WCL; const bx = WX, by = WY;
        if (ok0 && ok1 && proj(cam, (ax + bx) / 2, (ay + by) / 2, 1) && PZ > 12) {
          const depth = PZ; const painted = (W3.paint[i0] & (sd > 0 ? 1 : 2)) !== 0; const post = Math.floor(j / 4) !== Math.floor(j2 / 4) || st >= 4;
          items.push({ z: depth, sx: PX, half: 6, draw: () => wallSeg(ctx, cam, P, ax, ay, bx, by, wallH, fenceH, painted, j, post, 1 - fogK(depth)) });
        }
        j = j2;
      }
    }
    if (!W3.street) for (const gz of base.gravel) for (const [a, b] of spans(runs, tk, gz.i0 * tk.ds, gz.i1 * tk.ds)) {
      for (let j = a; j < b; j += 2) {
        const j2 = Math.min(b, j + 2); const i0 = mod(Math.round(j), n); const warr = gz.side > 0 ? W3.wl : W3.wr; const o = gz.side * (warr[i0] - 1.3) * q;
        if (!wp(tk, W3, j, o) || WCL) continue; const ax = WX, ay = WY; if (!wp(tk, W3, j2, o) || WCL) continue; const bx = WX, by = WY;
        if (!proj(cam, (ax + bx) / 2, (ay + by) / 2, 0.5)) continue; const depth = PZ;
        items.push({ z: depth - 0.5, draw: () => tyreSeg(ctx, cam, P, ax, ay, bx, by, Math.floor(j / 1.5) % 2, 1 - fogK(depth)) });
      }
    }
    // 브레이크 보드 3 · 2 · 1
    for (const bd of W3.boards) for (const [a] of spans(runs, tk, bd.s, bd.s + 0.01)) {
      const i0 = mod(Math.round(a), n); const warr = bd.side > 0 ? W3.wl : W3.wr; const o = bd.side * Math.min(HALF_W + 3, warr[i0] - 0.7) * q;
      if (!wp(tk, W3, a, o) || WCL) continue; const X = WX, Y = WY;
      if (!inView(X, Y, 1.5, 60)) continue; const depth = PZ;
      items.push({ z: depth, sx: PX, half: (1.2 * cam.F) / depth, draw: () => board(ctx, cam, P, tk, X, Y, tk.th[i0], bd.num, R.font, 1 - fogK(depth)) });
    }
    // 출발 갠트리
    for (const [a] of spans(runs, tk, 0, 0.01)) {
      const i0 = mod(Math.round(a), n);
      if (!proj(cam, tk.x[i0], tk.y[i0], 6)) continue; const depth = PZ;
      items.push({ z: depth, wide: true, draw: () => gantry(ctx, cam, P, tk, W3, i0, R.lit || 0, q) });
      // 빔 그림자(길 위)
      addQuadShadow(shadowPath, cam, tk, W3, i0, q, 6);
      break;
    }
    // 관중석 · 피트 건물(메인 직선)
    blockItems(ctx, items, cam, tk, W3, runs, P, fogK, shadowPath, q, R.lite); anyShadow = true;
    // 나무
    for (const t of W3.trees) {
      const dx = t.x - camGX, dy = t.y - camGY; const fwd = dx * cam.dx + dy * cam.dy; if (fwd < 2 || fwd > far) continue;
      if (Math.abs(dx * cam.rx + dy * cam.ry) > fwd * tanH * 1.4 + 20) continue;
      if (!proj(cam, t.x, t.y, t.h)) continue; const depth = PZ; const cx = PX, cy = PY; const rp = (t.r * cam.F) / PZ;
      if (cx < -rp || cx > w + rp || cy - rp > h || cy + rp < -10) continue;
      const fa = 1 - fogK(depth); if (fa <= 0.02) continue;
      items.push({ z: depth, sx: cx, half: rp, draw: () => tree(ctx, cam, P, t, cx, cy, rp, fa) });
      if (depth < 400) { ellipseShadow(shadowPath, cam, t.x + SH[0] * t.h * 0.75, t.y + SH[1] * t.h * 0.75, t.r * 1.05); anyShadow = true; }
    }
    // 건물(시가지)
    for (const b of W3.blds) {
      const dx = b.x - camGX, dy = b.y - camGY; const fwd = dx * cam.dx + dy * cam.dy; if (fwd < -30 || fwd > far + 60) continue;
      if (Math.abs(dx * cam.rx + dy * cam.ry) > Math.max(0, fwd) * tanH * 1.4 + 60) continue;
      if (!proj(cam, b.x, b.y, b.h * 0.5)) continue; const depth = PZ; const fa = 1 - fogK(depth); if (fa <= 0.02) continue;
      items.push({ z: depth, sx: PX, half: (Math.max(b.hx, b.hy) * 1.4 * cam.F) / depth, draw: () => building(ctx, cam, P, b, fa, R.lite ? 1e9 : depth) });
      if (depth < 500) { bldShadow(shadowPath, cam, b); anyShadow = true; }
    }
    // 연기 · 먼지
    for (const p of R.fx.puffs) {
      const u = (R.now - p.t) / p.life; if (u < 0 || u >= 1) continue;
      const sM = p.s - p.back * u * 3; const ii = sM / tk.ds; const o = (p.o + p.drift * u * 2) * q;
      if (!wp(tk, W3, ii, o)) continue; const X = WX, Y = WY;
      if (!proj(cam, X, Y, 0.4 + u * 1.4)) continue; const depth = PZ; const px = PX, py = PY;
      const rr = Math.max(2, ((p.r * 0.6 * (0.5 + u * 1.4)) * cam.F) / depth); const near = clamp01((depth - 8) / 14); const a = (1 - u) * (p.kind === 'dust' ? 0.5 : 0.42) * near;
      const rgb = p.kind === 'dust' ? P.dustRGB : P.smokeRGB;
      items.push({ z: depth, draw: () => {   // 가운데가 짙고 가장자리로 사라지는 둥근 연기
        const g = ctx.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`); g.addColorStop(0.55, `rgba(${rgb},${(a * 0.6).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.fill(); } });
    }
  }
  // 차 그림자 · 옅은 차 · 차
  const carOpt = R.car; const ghost = R.ghost;
  if (carOpt && !carOpt.dot) { drawCarShadow(ctx, cam, carOpt, (a) => `rgba(${P.shadowRGB},${(a * (carOpt.shadowK || 1)).toFixed(3)})`); }
  if (anyShadow) { ctx.fillStyle = `rgba(${P.shadowRGB},${P.envShadowA})`; ctx.fill(shadowPath); }
  // 안개(땅): 수평선 쪽으로 땅 색이 짙어진다
  if (R.fog && hy > -h && det > 0.02) {
    const yAt = (d) => { const X = cam.x + (cam.dx / Math.hypot(cam.dx, cam.dy)) * d, Y = cam.y + (cam.dy / Math.hypot(cam.dx, cam.dy)) * d; return proj(cam, X, Y, 0) ? PY : null; };
    const yA = yAt(fogA), yM = yAt((fogA + fogB) / 2), yB = yAt(fogB);
    if (yA != null && yA > hy + 1) {
      const top = Math.max(0, hy); const g = ctx.createLinearGradient(0, top, 0, yA);
      g.addColorStop(0, P.fog); if (yB != null && yB > top && yB < yA) g.addColorStop(clamp01((yB - top) / (yA - top)), P.fogMid); if (yM != null && yM > top && yM < yA) g.addColorStop(clamp01((yM - top) / (yA - top)), P.fogFar); g.addColorStop(1, P.fogNone);
      ctx.globalAlpha = Math.min(1, det); ctx.fillStyle = g; ctx.fillRect(0, top, w, yA - top); ctx.globalAlpha = 1;
    }
  }
  // 빠를수록 땅이 소실점에서 바깥으로 흐려진다(움직임 흐림). 차와 서 있는 것은 또렷하게
  if (R.blur > 0.03 && R.canvas && !R.lite) {
    const vx = cam.ox, vy = Math.max(0, hy); const cv = R.canvas; const dpr = R.dpr;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 수평선 아래(땅)만: 소실점을 가운데로 조금씩 키워 두 번 얹는다
    const sy0 = Math.floor(vy * dpr); const sh = cv.height - sy0;
    if (sh > 4) for (const k of [1, 2]) { const sc = 1 + R.blur * 0.026 * k; ctx.globalAlpha = 0.3 / k; ctx.drawImage(cv, 0, sy0, cv.width, sh, vx * dpr * (1 - sc), vy * dpr + (sy0 - vy * dpr) * sc, cv.width * sc, sh * sc); }
    ctx.restore();
  }
  if (R.under) R.under(ctx);
  if (ghost) {
    if (!proj(cam, ghost.x, ghost.y, 0.5)) { /* 화면 밖 */ } else {
      const depth = PZ;
      items.push({ z: depth + 4, draw: () => drawGhost(ctx, cam, ghost, R) });   // 내 차와 겹치면 옅은 차가 아래에 깔린다
    }
  }
  if (carOpt) {
    if (proj(cam, carOpt.x, carOpt.y, 0.5)) {
      const depth = PZ; const cx = PX, cy = PY;
      items.push({ z: depth, car: true, sx: cx, half: (1.4 * carOpt.S * cam.F) / depth, draw: () => {
        if (carOpt.dot) { const r = Math.max(6, (1.6 * cam.F) / depth); ctx.fillStyle = R.C.car; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.strokeStyle = R.C.bg; ctx.lineWidth = 2; ctx.stroke(); return; }
        drawCar3d(ctx, cam, carOpt);
      } });
    }
  }
  items.sort((a, b) => b.z - a.z);
  // 차보다 앞(카메라 쪽)에 있으면서 화면에서 차와 겹치는 것은 옅게(차를 가리지 않게)
  const carIdx = items.findIndex((it) => it.car); const carIt = carIdx >= 0 ? items[carIdx] : null;
  for (let k = 0; k < items.length; k += 1) {
    const it = items[k];
    const cover = carIt && k > carIdx && !it.car && (it.wide || (it.sx != null && Math.abs(it.sx - carIt.sx) < carIt.half + (it.half || 0)));
    if (cover) { ctx.globalAlpha = it.z < 22 ? 0.18 : 0.4; it.draw(); ctx.globalAlpha = 1; } else it.draw();
  }
  // 불꽃(차 뒤로 튄다)
  if (show && R.fx.sparks && R.fx.sparks.length) drawSparks(ctx, cam, R.fx, R.now, R.fdt);
  return { runs };
}

function chevron(ctx, cam, tk, W3, j, sd, hw) {
  // V자 한쪽: 가운데(j)에서 바깥 앞(j + 1.6)으로
  const pts = [];
  for (const [jj, o] of [[j, 0], [j + 1.6, sd * hw * 0.7], [j + 1.6 + 0.35, sd * hw * 0.7], [j + 0.35, 0]]) { if (!wp(tk, W3, jj, o) || !proj(cam, WX, WY, 0)) return; pts.push([PX, PY]); }
  ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath();
}

function startMarks(ctx, cam, tk, W3, runs, P, q) {
  for (const [a] of spans(runs, tk, 0, 0.01)) {
    // 체크무늬: 폭 8칸 × 두 줄(뒤로)
    const nC = 8; const sq = (2 * HALF_W * q) / nC; const dj = sq / tk.ds;
    for (const odd of [0, 1]) {
      ctx.fillStyle = odd ? P.check : P.line; ctx.beginPath();
      for (let rr = 0; rr < 2; rr += 1) for (let c = 0; c < nC; c += 1) { if ((c + rr) % 2 !== odd) continue; const o0 = -HALF_W * q + c * sq; band(ctx, cam, tk, W3, a - (rr + 1) * dj, a - rr * dj, o0, o0 + sq); }
      ctx.fill();
    }
    // 그리드 칸: 8m마다, 좌우 엇갈림. ㄷ자(앞 가로선 + 양옆 짧은 선)
    ctx.fillStyle = P.line; ctx.beginPath();
    for (let k = 0; k < 7; k += 1) {
      const back = 3 + k * 8; const lat = (k % 2 ? 1 : -1) * HALF_W * 0.45 * q; const j = a - back / tk.ds; const half = 1.5 * q;
      band(ctx, cam, tk, W3, j - 0.12, j, lat - half, lat + half);
      for (const sd of [-1, 1]) band(ctx, cam, tk, W3, j - 1.6, j, lat + sd * half - 0.1 * q, lat + sd * half + 0.1 * q);
    }
    ctx.fill();
    break;
  }
}

function drawMarks3d(ctx, cam, tk, W3, fx, P, q, car) {
  if (!fx || !fx.marks.length) return;
  const sC = car ? car.s : null;
  ctx.lineCap = 'butt';
  for (const m of fx.marks) {
    if (sC != null) { let d = m.s0 - sC; if (d > tk.L / 2) d -= tk.L; if (d < -tk.L / 2) d += tk.L; if (d < -120 || d > 500) continue; }
    ctx.fillStyle = `rgba(${P.markRGB},${(m.k * (m.kind === 'launch' ? 0.7 : 0.5)).toFixed(3)})`; ctx.beginPath();
    for (const [o0, o1] of [[m.a0, m.a1], [m.b0, m.b1]]) {
      const pts = [];
      for (const [sM, o, dl] of [[m.s0, o0, -0.16], [m.s1, o1, -0.16], [m.s1, o1, 0.16], [m.s0, o0, 0.16]]) { if (!wp(tk, W3, sM / tk.ds, (o + dl) * q) || !proj(cam, WX, WY, 0)) { pts.length = 0; break; } pts.push([PX, PY]); }
      if (pts.length === 4) { ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); }
    }
    ctx.fill();
  }
}

// 벽 한 조각: 콘크리트(코너 근처는 빨강 · 흰 줄) + 위 철망(옅은 면 · 기둥 · 윗줄)
function wallSeg(ctx, cam, P, ax, ay, bx, by, wallH, fenceH, painted, j, post, fa) {
  if (fa <= 0.02) return;
  const p = []; for (const [X, Y, Z] of [[ax, ay, 0], [bx, by, 0], [bx, by, wallH], [ax, ay, wallH], [bx, by, fenceH], [ax, ay, fenceH]]) { if (!proj(cam, X, Y, Z)) return; p.push([PX, PY]); }
  const quad = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(p[a][0], p[a][1]); ctx.lineTo(p[b][0], p[b][1]); ctx.lineTo(p[c][0], p[c][1]); ctx.lineTo(p[d][0], p[d][1]); ctx.closePath(); };
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  ctx.fillStyle = painted ? (Math.floor(j / 2) % 2 ? P.kerbA : P.wallPaint) : P.wall; quad(0, 1, 2, 3); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.strokeStyle = P.wallTop; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[3][0], p[3][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.stroke();
  ctx.fillStyle = P.fence; quad(3, 2, 4, 5); ctx.fill();
  ctx.strokeStyle = P.fenceLine; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[5][0], p[5][1]); ctx.lineTo(p[4][0], p[4][1]); if (post) { ctx.moveTo(p[3][0], p[3][1]); ctx.lineTo(p[5][0], p[5][1]); } ctx.stroke();
  ctx.globalAlpha = prevA;
}
function tyreSeg(ctx, cam, P, ax, ay, bx, by, odd, fa) {
  const p = []; for (const [X, Y, Z] of [[ax, ay, 0], [bx, by, 0], [bx, by, 0.9], [ax, ay, 0.9]]) { if (!proj(cam, X, Y, Z)) return; p.push([PX, PY]); }
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  ctx.fillStyle = odd ? P.kerbA : P.belt; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(p[k][0], p[k][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.strokeStyle = P.tyre3; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p[3][0], p[3][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.stroke();
  ctx.globalAlpha = prevA;
}
// 브레이크 보드: 기둥 + 다가오는 차를 보는 판
function board(ctx, cam, P, tk, X, Y, th, num, font, fa) {
  const fx = Math.cos(th), fy = Math.sin(th); const rx = -fy, ry = fx; const hw = 1.1;
  const p = []; for (const [o, Z] of [[-hw, 0.9], [hw, 0.9], [hw, 3.5], [-hw, 3.5]]) { if (!proj(cam, X + rx * o - fx * 0.05, Y + ry * o - fy * 0.05, Z)) return; p.push([PX, PY]); }
  if (!proj(cam, X, Y, 0)) return; const base = [PX, PY];
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  ctx.strokeStyle = P.boardEdge; ctx.lineWidth = Math.max(1, (p[1][0] - p[0][0]) * 0.08); ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); ctx.stroke();
  ctx.fillStyle = P.board; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(p[k][0], p[k][1]); ctx.closePath(); ctx.fill();
  ctx.lineWidth = Math.max(1, Math.abs(p[1][0] - p[0][0]) * 0.07); ctx.strokeStyle = P.boardEdge; ctx.stroke();
  const ht = Math.abs(p[0][1] - p[3][1]); if (ht > 7) { ctx.fillStyle = P.boardText; ctx.font = font(Math.round(ht * 0.62), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num), (p[0][0] + p[2][0]) / 2, (p[0][1] + p[2][1]) / 2 + ht * 0.04); }
  ctx.globalAlpha = prevA;
}
// 출발 갠트리: 기둥 둘 + 빔 + 다가오는 차를 보는 신호등 5열 × 2행
function gantry(ctx, cam, P, tk, W3, i0, lit, q) {
  const th = tk.th[i0]; const fx = Math.cos(th), fy = Math.sin(th); const rx = -fy, ry = fx; const X0 = tk.x[i0], Y0 = tk.y[i0];
  const reach = (HALF_W + 2.4) * q;
  const P3 = (o, f, Z) => (proj(cam, X0 + rx * o + fx * f, Y0 + ry * o + fy * f, Z) ? [PX, PY] : null);
  const poly = (pts, fill) => { if (pts.some((v) => !v)) return; ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k += 1) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = 0.6; ctx.stroke(); };
  for (const sd of [-1, 1]) { const o = sd * reach; poly([P3(o - 0.35, -0.35, 0), P3(o + 0.35, -0.35, 0), P3(o + 0.35, -0.35, 6.6), P3(o - 0.35, -0.35, 6.6)], P.gantry); poly([P3(o + sd * 0.35, -0.35, 0), P3(o + sd * 0.35, 0.35, 0), P3(o + sd * 0.35, 0.35, 6.6), P3(o + sd * 0.35, -0.35, 6.6)], P.gantrySide); }
  poly([P3(-reach, -0.45, 5.7), P3(reach, -0.45, 5.7), P3(reach, -0.45, 6.6), P3(-reach, -0.45, 6.6)], P.gantry);
  poly([P3(-reach, -0.45, 6.6), P3(reach, -0.45, 6.6), P3(reach, 0.45, 6.6), P3(-reach, 0.45, 6.6)], P.gantryTop);
  // 신호등 판(빔 아래)과 불 10개
  poly([P3(-2.9, -0.5, 4.5), P3(2.9, -0.5, 4.5), P3(2.9, -0.5, 5.7), P3(-2.9, -0.5, 5.7)], P.gantry);
  for (let c = 0; c < 5; c += 1) for (let r = 0; r < 2; r += 1) {
    const p = P3(-2.3 + c * 1.15, -0.55, 5.35 - r * 0.55); if (!p) continue; const rad = Math.max(1.2, (0.2 * cam.F) / PZ);
    const on = c < lit;
    if (on && rad > 2) { const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad * 3.2); g.addColorStop(0, `rgba(${P.redRGB},.45)`); g.addColorStop(1, `rgba(${P.redRGB},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], rad * 3.2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = on ? P.red : P.pod; ctx.beginPath(); ctx.arc(p[0], p[1], rad, 0, TAU); ctx.fill();
  }
}
function addQuadShadow(path, cam, tk, W3, i0, q, Z) {
  const th = tk.th[i0]; const fx = Math.cos(th), fy = Math.sin(th); const rx = -fy, ry = fx; const reach = (HALF_W + 2.4) * q;
  const X0 = tk.x[i0] + SH[0] * Z, Y0 = tk.y[i0] + SH[1] * Z; const pts = [];
  for (const [o, f] of [[-reach, -0.5], [reach, -0.5], [reach, 0.5], [-reach, 0.5]]) { if (!proj(cam, X0 + rx * o + fx * f, Y0 + ry * o + fy * f, 0)) return; pts.push([PX, PY]); }
  path.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < 4; k += 1) path.lineTo(pts[k][0], pts[k][1]); path.closePath();
}
function ellipseShadow(path, cam, X, Y, r) {
  const pts = []; for (let k = 0; k < 10; k += 1) { const a = (k / 10) * TAU; if (!proj(cam, X + Math.cos(a) * r * 1.25, Y + Math.sin(a) * r, 0)) return; pts.push([PX, PY]); }
  path.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k += 1) path.lineTo(pts[k][0], pts[k][1]); path.closePath();
}
function tree(ctx, cam, P, t, cx, cy, rp, fa) {
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  if (proj(cam, t.x, t.y, 0)) { ctx.strokeStyle = P.trunk; ctx.lineWidth = Math.max(1, rp * 0.14); ctx.beginPath(); ctx.moveTo(PX, PY); ctx.lineTo(cx, cy + rp * 0.5); ctx.stroke(); }
  ctx.fillStyle = P.tree; ctx.beginPath(); ctx.arc(cx, cy, rp, 0, TAU); ctx.fill();
  if (rp > 3) { ctx.fillStyle = P.treeHi; ctx.beginPath(); ctx.arc(cx - rp * 0.24, cy - rp * 0.26, rp * 0.62, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = prevA;
}
function boxCorners(b) {
  const c = Math.cos(b.a), s = Math.sin(b.a); const rx = -s, ry = c;
  return [[b.x + c * b.hx + rx * b.hy, b.y + s * b.hx + ry * b.hy], [b.x - c * b.hx + rx * b.hy, b.y - s * b.hx + ry * b.hy], [b.x - c * b.hx - rx * b.hy, b.y - s * b.hx - ry * b.hy], [b.x + c * b.hx - rx * b.hy, b.y + s * b.hx - ry * b.hy]];
}
function bldShadow(path, cam, b) {
  const cs = boxCorners(b); const pts = [...cs, ...cs.map(([x, y]) => [x + SH[0] * b.h, y + SH[1] * b.h])];
  const hull = convexHull(pts); const sp = [];
  for (const [x, y] of hull) { if (!proj(cam, x, y, 0)) return; sp.push([PX, PY]); }
  path.moveTo(sp[0][0], sp[0][1]); for (let k = 1; k < sp.length; k += 1) path.lineTo(sp[k][0], sp[k][1]); path.closePath();
}
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const v of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], v) <= 0) lo.pop(); lo.push(v); }
  const up = []; for (let i = p.length - 1; i >= 0; i -= 1) { const v = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], v) <= 0) up.pop(); up.push(v); }
  up.pop(); lo.pop(); return lo.concat(up);
}
// 건물: 카메라를 보는 벽(빛을 받는 쪽은 밝게) + 지붕 + 가까우면 층 줄
function building(ctx, cam, P, b, fa, depth) {
  const cs = boxCorners(b); const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  const top = []; const bot = [];
  for (const [x, y] of cs) { if (!proj(cam, x, y, 0)) { ctx.globalAlpha = prevA; return; } bot.push([PX, PY]); if (!proj(cam, x, y, b.h)) { ctx.globalAlpha = prevA; return; } top.push([PX, PY]); }
  const walls = [];
  for (let k = 0; k < 4; k += 1) {
    const a = cs[k], c = cs[(k + 1) % 4]; const mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2; const nx = mx - b.x, ny = my - b.y;
    if ((cam.x - mx) * nx + (cam.y - my) * ny <= 0) continue;
    const l = Math.hypot(nx, ny) || 1; const lit = Math.max(0, -(nx / l) * SUN[0] - (ny / l) * SUN[1]);
    walls.push({ k, lit });
  }
  for (const { k, lit } of walls) {
    const k2 = (k + 1) % 4; ctx.fillStyle = lit > 0.25 ? P.bldLit : P.bldShade;
    ctx.beginPath(); ctx.moveTo(bot[k][0], bot[k][1]); ctx.lineTo(bot[k2][0], bot[k2][1]); ctx.lineTo(top[k2][0], top[k2][1]); ctx.lineTo(top[k][0], top[k][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke();
    if (depth < 320) {
      ctx.strokeStyle = P.window; ctx.lineWidth = 1; ctx.beginPath();
      const floors = Math.floor(b.h / 3.6); const stepF = depth < 160 ? 1 : 2;
      for (let f = 1; f < floors; f += stepF) { const t = (f * 3.6) / b.h; ctx.moveTo(bot[k][0] + (top[k][0] - bot[k][0]) * t, bot[k][1] + (top[k][1] - bot[k][1]) * t); ctx.lineTo(bot[k2][0] + (top[k2][0] - bot[k2][0]) * t, bot[k2][1] + (top[k2][1] - bot[k2][1]) * t); }
      ctx.stroke();
    }
  }
  if (cam.z > b.h) { ctx.fillStyle = P.roof; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(top[k][0], top[k][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = P.roofEdge; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.globalAlpha = prevA;
}
// 관중석(바깥) · 피트 건물(내야): 메인 직선을 따라 10m 조각
function blockItems(ctx, items, cam, tk, W3, runs, P, fogK, shadowPath, q, lite) {
  const segs = (blk, len, fn) => { const s0 = blk.s0 < 0 ? blk.s0 + tk.L : blk.s0; for (const [a, b] of spans(runs, tk, s0, s0 + (blk.s1 - blk.s0))) for (let j = a; j < b; j += len / tk.ds) fn(j, Math.min(b, j + len / tk.ds)); };
  const corner = (j, o, Z) => (wp(tk, W3, j, o) && proj(cam, WX, WY, Z) ? [PX, PY] : null);
  const quad = (pts, fill) => { if (pts.some((v) => !v)) return false; ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k += 1) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = 0.6; ctx.stroke(); return true; };
  const n = tk.n;
  // 관중석: 앞이 낮고 뒤가 높은 비탈(사람 점) + 뒤쪽 절반을 덮는 지붕
  const st = W3.stand; const sd = st.side;
  segs(st, 10, (ja, jb) => {
    const wv = (sd > 0 ? W3.wl : W3.wr)[mod(Math.round(ja), n)]; const o0 = sd * (wv + 3) * q, o1 = sd * (wv + 29) * q;
    if (!wp(tk, W3, (ja + jb) / 2, sd * (wv + 16) * q) || !proj(cam, WX, WY, 8)) return; const depth = PZ; const fa = 1 - fogK(depth); if (fa <= 0.02) return;
    const seed = Math.floor(ja);
    items.push({ z: depth, draw: () => { const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
      quad([corner(ja, o0, 0), corner(jb, o0, 0), corner(jb, o0, 2.4), corner(ja, o0, 2.4)], P.standFront);
      if (quad([corner(ja, o0, 2.4), corner(jb, o0, 2.4), corner(jb, o1, 15), corner(ja, o1, 15)], P.stand) && depth < 240 && !lite) {
        // 사람: 줄마다 점
        const rows = 9; const cols = 12;
        for (let r = 0; r < rows; r += 1) for (let c2 = 0; c2 < cols; c2 += 1) {
          const u = (c2 + 0.5) / cols, v = (r + 0.5) / rows; const hh = h2(seed * 31 + r, c2); if (hh < 0.18) continue;
          const p = corner(ja + (jb - ja) * u, o0 + (o1 - o0) * v, 2.4 + 12.6 * v + 0.4); if (!p) continue;
          const sz = Math.max(1, (0.55 * cam.F) / PZ); ctx.fillStyle = P.crowd[Math.floor(hh * 97) % P.crowd.length]; ctx.fillRect(p[0] - sz / 2, p[1] - sz, sz, sz);
        }
      }
      quad([corner(ja, o1, 0), corner(jb, o1, 0), corner(jb, o1, 15), corner(ja, o1, 15)], P.standBack);
      // 지붕(뒤쪽 절반)과 기둥
      const om = sd * (wv + 15) * q;
      quad([corner(ja, om, 18.5), corner(jb, om, 18.5), corner(jb, o1, 19), corner(ja, o1, 19)], cam.z > 19 ? P.roof : P.roofUnder);
      ctx.globalAlpha = prevA; } });
  });
  // 피트 건물: 길을 보는 벽에 차고 문 · 위층 유리 띠 · 지붕
  const pt = W3.pit; const ps = pt.side;
  segs(pt, 12, (ja, jb) => {
    const wv = (ps > 0 ? W3.wl : W3.wr)[mod(Math.round(ja), n)]; const o0 = ps * (wv + 11.5) * q, o1 = ps * (wv + 27) * q; const H = 10;
    if (!wp(tk, W3, (ja + jb) / 2, ps * (wv + 18) * q) || !proj(cam, WX, WY, 5)) return; const depth = PZ; const fa = 1 - fogK(depth); if (fa <= 0.02) return;
    items.push({ z: depth, draw: () => { const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
      quad([corner(ja, o0, 0), corner(jb, o0, 0), corner(jb, o0, H), corner(ja, o0, H)], P.bldLit);
      // 차고 문(어둡게) · 유리 띠
      const jm = (ja + jb) / 2; const dj = 2.6 / tk.ds;
      quad([corner(jm - dj, o0 * 0.999, 0), corner(jm + dj, o0 * 0.999, 0), corner(jm + dj, o0 * 0.999, 4.6), corner(jm - dj, o0 * 0.999, 4.6)], P.garage);
      quad([corner(ja, o0 * 0.999, 6.4), corner(jb, o0 * 0.999, 6.4), corner(jb, o0 * 0.999, 8.8), corner(ja, o0 * 0.999, 8.8)], P.glass);
      if (cam.z > H) quad([corner(ja, o0, H), corner(jb, o0, H), corner(jb, o1, H), corner(ja, o1, H)], P.roof);
      ctx.globalAlpha = prevA; } });
    // 그림자
    const pts = [[ja, o0], [jb, o0], [jb, o1], [ja, o1]].map(([j, o]) => (wp(tk, W3, j, o) ? [WX + SH[0] * H, WY + SH[1] * H] : null));
    const base2 = [[ja, o0], [jb, o0], [jb, o1], [ja, o1]].map(([j, o]) => (wp(tk, W3, j, o) ? [WX, WY] : null));
    if (pts.every(Boolean) && base2.every(Boolean)) { const hull = convexHull([...pts, ...base2]); const sp = []; for (const [x, y] of hull) { if (!proj(cam, x, y, 0)) return; sp.push([PX, PY]); } shadowPath.moveTo(sp[0][0], sp[0][1]); for (let k = 1; k < sp.length; k += 1) shadowPath.lineTo(sp[k][0], sp[k][1]); shadowPath.closePath(); }
  });
}

function drawGhost(ctx, cam, g, R) {
  // 차가 들어가는 화면 사각형만큼만 따로 그려 한 번에 옅게 얹는다(겹친 면이 진해지지 않게)
  const S = g.S || 1; const fX = Math.cos(g.th), fY = Math.sin(g.th), rX = -fY, rY = fX;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const X of [-1.1, 1.1]) for (const Y of [-2.7, 2.8]) for (const Z of [0, 1.1]) {
    if (!proj(cam, g.x + (rX * X + fX * Y) * S, g.y + (rY * X + fY * Y) * S, Z * S)) return;
    x0 = Math.min(x0, PX); x1 = Math.max(x1, PX); y0 = Math.min(y0, PY); y1 = Math.max(y1, PY);
  }
  x0 = Math.floor(Math.max(0, x0 - 4)); y0 = Math.floor(Math.max(0, y0 - 4)); x1 = Math.ceil(Math.min(R.w, x1 + 4)); y1 = Math.ceil(Math.min(R.h, y1 + 4));
  if (!(x1 > x0 && y1 > y0)) return;   // NaN도 여기서 걸러진다
  const dpr = R.dpr; const cw = Math.ceil((x1 - x0) * dpr), ch = Math.ceil((y1 - y0) * dpr);
  if (!ghostCv || ghostCv.width < cw || ghostCv.height < ch) { const W = Math.max(cw, ghostCv ? ghostCv.width : 0), H = Math.max(ch, ghostCv ? ghostCv.height : 0); ghostCv = Object.assign(document.createElement('canvas'), { width: W, height: H }); }
  const gx = ghostCv.getContext('2d'); gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, cw, ch); gx.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
  drawCar3d(gx, cam, { ...g, flat: R.P.ghostSolid });
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = R.P.ghostA; ctx.drawImage(ghostCv, 0, 0, cw, ch, x0 * dpr, y0 * dpr, cw, ch); ctx.restore();
}

// 불꽃: 바닥판이 노면에 닿을 때 뒤로 튀는 짧은 선. 흰빛 → 주황 → 빨강으로 식는다
function drawSparks(ctx, cam, fx, now, fdt) {
  const g = 9.8; const keep = [];
  ctx.lineCap = 'round';
  for (const sp of fx.sparks) {
    const age = (now - sp.t) / 1000; if (age > sp.life) continue; keep.push(sp);
    const dt = Math.min(0.05, fdt || 1 / 60);
    sp.vx *= 1 - 0.9 * dt; sp.vy *= 1 - 0.9 * dt; sp.vz -= g * dt;
    sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.z += sp.vz * dt; if (sp.z < 0) { sp.z = 0; sp.vz = -sp.vz * 0.35; }
    // 꼬리: 차(카메라)에 대한 상대 속도 방향으로 — 눈에는 차 뒤로 흩어지는 선으로 보인다
    const u = age / sp.life; const tail = 0.06; const rvx = sp.vx - sp.cvx, rvy = sp.vy - sp.cvy;
    if (!proj(cam, sp.x, sp.y, sp.z)) continue; const ax = PX, ay = PY, depth = PZ;
    if (!proj(cam, sp.x - rvx * tail, sp.y - rvy * tail, Math.max(0, sp.z - sp.vz * tail * 0.5))) continue;
    const col = u < 0.3 ? '255,240,224' : u < 0.65 ? '255,156,84' : '236,84,52';
    ctx.strokeStyle = `rgba(${col},${(1 - u * 0.75).toFixed(3)})`; ctx.lineWidth = Math.max(1.3, Math.min(3, (0.07 * cam.F) / depth));
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(PX, PY); ctx.stroke();
  }
  fx.sparks = keep;
}
// 불꽃 몇 개를 차 바닥 뒤에서 낸다(세계 좌표 · 차 속도 기준)
export function addSparks(fx, car, v, now, count, rnd) {
  if (!fx.sparks) fx.sparks = [];
  const fX = Math.cos(car.th), fY = Math.sin(car.th), rX = -fY, rY = fX; const S = car.S || 1;
  for (let k = 0; k < count; k += 1) {
    const lx = (rnd() - 0.5) * 0.9, ly = -1.9 - rnd() * 0.3;
    const sp = v * (0.78 + rnd() * 0.16); const lat = (rnd() - 0.5) * 7;
    fx.sparks.push({ x: car.x + (rX * lx + fX * ly) * S, y: car.y + (rY * lx + fY * ly) * S, z: 0.05, vx: fX * sp + rX * lat, vy: fY * sp + rY * lat, vz: 0.8 + rnd() * 2.4, cvx: fX * v, cvy: fY * v, t: now, life: 0.25 + rnd() * 0.35 });
  }
  if (fx.sparks.length > 160) fx.sparks.splice(0, fx.sparks.length - 160);
}

// ---------- 글자(위에 덧그림): 코너 번호 · 손 떼기 표 ----------
export function labels3d(ctx, cam, tk, W3, R, L) {
  const { w, h } = R; const q = R.q || 1; const det = R.detail;
  const fogK = R.fog ? (z) => clamp01((z - R.fog[0]) / (R.fog[1] - R.fog[0])) : () => 0;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of L.turns) {
    const tagR = t.r; const zLift = 2.2 * det;
    const o = t.side * (HALF_W * q + (1 - det) * ((4 + tagR) / Math.max(1e-6, R.zoomOver || 1)) + det * 6.5);
    if (!wp(tk, W3, t.s / tk.ds, o) || !proj(cam, WX, WY, zLift)) continue;
    const X = PX, Y = PY; const depth = PZ; if (X < -20 || X > w + 20 || Y < -20 || Y > h + 20) continue;
    const fa = det > 0.5 ? 1 - fogK(depth) * 0.85 : 1; if (fa < 0.05) continue;
    const r = det > 0.5 ? Math.max(8, Math.min(tagR, (2.6 * cam.F) / depth)) : tagR;
    ctx.globalAlpha = fa;
    ctx.fillStyle = t.on ? L.C.text : L.C.bg; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = t.on ? L.C.bg : L.C.line2; ctx.lineWidth = t.on ? 1.5 : 1; ctx.stroke();
    ctx.fillStyle = t.on ? L.C.bg : L.C.text2; ctx.font = L.font(Math.round(r * (det > 0.5 ? 1.05 : 1.1))); ctx.fillText(String(t.n), X, Y + 0.5);
    ctx.globalAlpha = 1;
  }
  for (const c of L.coach) {
    if (!wp(tk, W3, (c.s + 3) / tk.ds, 0) || !proj(cam, WX, WY, 1.6)) continue;
    const X = PX, Y = PY; if (Y < 0 || Y > h) continue;
    ctx.font = L.font(13); const tw = ctx.measureText(c.label).width + 16; const th2 = 24;
    ctx.fillStyle = L.C.text; ctx.beginPath(); ctx.roundRect?.(X - tw / 2, Y - th2 / 2, tw, th2, 12); ctx.fill();
    ctx.strokeStyle = L.C.bg; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = L.C.bg; ctx.fillText(c.label, X, Y + 1);
  }
}
