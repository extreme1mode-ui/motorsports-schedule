// '한 바퀴' 입체 무대: 차 뒤 위에서 앞을 내려다보는 카메라(원근)로 서킷을 그린다. 캔버스 2D만 쓴다.
// 세계 좌표는 엔진과 같다(x 오른쪽 · y 아래 = 남쪽, 단위 m, 바닥 z = 0, z는 위). 서킷 좌표와 코너 위치는 데이터 그대로다.
// 길 위의 것(아스팔트 · 연석 · 진한 구간 · 선)은 띠로, 서 있는 것(벽 · 철망 · 보드 · 갠트리 · 관중석 · 피트 건물 · 나무 · 건물 · 차 · 연기)은
// 카메라에서 먼 것부터 그린다. 주변 풍경(관중석 · 피트 · 나무 · 건물 · 먼 스카이라인 · 광고 다리 · 마셜 · 런오프 심볼 · 구름 그림자)은
// 계산으로 만든 장식이다. 실제 서킷의 배치가 아니다.
// 흔들림 · 번쩍임은 없다. 빠를수록 소실점에서 바깥으로 땅이 흐려진다(줄인 움직임에서는 이 화면을 쓰지 않는다).
// 움직이는 장식은 마셜 깃발(옅은 차가 뒤에 붙으면 파랑, 결승선에서 체크) · 관중석 깃발 · 피트 담 팀 사람들의 팔(결승 때) · 구름 그림자뿐이고 모두 천천히 움직인다.
import { HALF_W } from './engine.js';
import { prepWorld } from './world.js';
import { MARK_FADE } from './fx.js';
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
const CREW_S = [-40, 14];                            // 피트 담의 팀 사람들이 서는 곳(출발선 기준 m). 이 사이에는 피트 월 스탠드를 두지 않는다

// 레이싱 라인(+ 왼쪽, m): 길 안(±lim)에서 곡률 제곱합이 가장 작은 선. 실제 F1처럼 코너 앞 바깥 → 꼭짓점 안쪽 → 빠져나가며 바깥,
// 곧은 길에서는 곧게 이어진다. 중심선 점마다 '양옆 두 점씩으로 본 매끈한 자리'(-1, 4, 4, -1)/6 쪽으로 옮기고 길 안으로 자르기를 되풀이한다.
// 긴 굽이부터 잡도록 64칸 건너뛰기부터 1칸까지 좁혀 간다. 급한 코너 안쪽은 반지름의 70%까지만(띠가 접히지 않게)
function racingLine(tk, NX, NY, lim) {
  const n = tk.n; const lo = new Float64Array(n), hi = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    // 굽음: 데이터의 tk.k와 중심선 모양(앞뒤 4m) 가운데 급한 쪽
    const a = mod(i - 2, n), c = mod(i + 2, n); const ax = tk.x[a], ay = tk.y[a], bx = tk.x[i], by = tk.y[i], cx = tk.x[c], cy = tk.y[c];
    const d = Math.hypot(bx - ax, by - ay) * Math.hypot(cx - bx, cy - by) * Math.hypot(cx - ax, cy - ay);
    const kg = d > 0 ? (2 * ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax))) / d : 0;
    const k = Math.abs(kg) > Math.abs(tk.k[i]) ? kg : tk.k[i]; const cap = 0.7 / Math.max(1e-6, Math.abs(k));
    hi[i] = k < 0 ? Math.min(lim, cap) : lim; lo[i] = k > 0 ? -Math.min(lim, cap) : -lim;   // o · k < 0 이 안쪽
  }
  const o = new Float32Array(n); const Px = Float64Array.from(tk.x), Py = Float64Array.from(tk.y);
  for (const st of [64, 32, 16, 8, 4, 2, 1]) for (let it = 0; it < 60; it += 1) for (let i = 0; i < n; i += 1) {
    const a = mod(i - 2 * st, n), b = mod(i - st, n), c = mod(i + st, n), d = mod(i + 2 * st, n);
    const tx = (4 * (Px[b] + Px[c]) - Px[a] - Px[d]) / 6, ty = (4 * (Py[b] + Py[c]) - Py[a] - Py[d]) / 6;
    const v = Math.max(lo[i], Math.min(hi[i], (tx - tk.x[i]) * NX[i] + (ty - tk.y[i]) * NY[i]));
    o[i] = v; Px[i] = tk.x[i] + NX[i] * v; Py[i] = tk.y[i] + NY[i] * v;
  }
  return o;
}

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
  const k1 = conv(tk.k, gauss(10));
  const rl = conv(racingLine(tk, NX, NY, HALF_W - 1.0), gauss(5));   // 꼭짓점에서 안쪽 바퀴가 연석에 올라탈 만큼(차 폭의 절반 1.24m)
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
  // 고무가 얼마나 쌓였는지(0~1): 브레이크 구간과 코너에서 진하고 직선에서 옅다
  let rI = new Float32Array(n);
  for (let i = 0; i < n; i += 1) rI[i] = Math.min(1, 0.22 + Math.max(tk.brake[i] ? 0.9 : 0, Math.min(1, Math.abs(k1[i]) * 70)));
  rI = conv(rI, gauss(14));
  // 연석이 있는 자리(바퀴가 올라타면 먼지)
  const kerbF = new Uint8Array(n);
  for (const kb of base.kerbs) for (let i = kb.i0; i <= kb.i1; i += 1) kerbF[mod(i, n)] |= kb.side > 0 ? 1 : 2;
  // 마블(라인 밖 타이어 부스러기): 코너 바깥쪽, 레이싱 라인에서 2.6m 넘게 떨어진 곳에 작은 점
  const marbles = [];
  for (const c of base.corners) {
    const out1 = c.sign;   // 바깥쪽
    for (let i = c.i0; i <= c.i1 + Math.round(20 / ds); i += 1) {
      const q = mod(i, n); const from = Math.max(0, out1 * rl[q]) + 2.6; const to = HALF_W - 0.5; if (to - from < 0.6) continue;
      for (let k = 0; k < 2; k += 1) { const u = R(); marbles.push({ j: i + R(), o: out1 * (from + (to - from) * Math.pow(u, 0.4)), r: 0.04 + R() * 0.07 }); }   // 바깥 흰 선 쪽으로 몰린다
    }
  }
  marbles.sort((a, b) => a.j - b.j);
  // 직선의 벽 광고판(갠트리 심볼): 70m마다 30m
  const hoard = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) { const sM = i * ds; if (Math.abs(k1[i]) < 1 / 300 && (sM % 70) < 30) hoard[i] = 3; }
  // 마셜 포스트: 약 300m마다, 코너 바깥쪽 벽 뒤
  // 가까운 구간(앞뒤 60m)의 길에 너무 붙지 않았는지: 머리핀처럼 길이 휘어 돌아오면 벽 뒤 자리가 다른 쪽 길 위가 된다
  const clearOfOwn = (i, o, need) => { const x = tk.x[i] + NX[i] * o, y = tk.y[i] + NY[i] * o; for (let j = -30; j <= 30; j += 1) { const q = mod(i + j, n); if (Math.hypot(tk.x[q] - x, tk.y[q] - y) < need) return false; } return true; };
  // 광고 다리: 300m 넘게 곧은 길의 한가운데 위로(출발선 앞뒤 220m는 갠트리가 있어 비운다). 두 개까지, 서로 500m 넘게. 기둥은 벽 바로 뒤
  const bridges = [];
  { const cand = []; let st = -1;
    for (let k = 0; k <= n; k += 1) { const ok = k < n && Math.abs(k1[k]) < 1 / 420; if (ok && st < 0) st = k; if (!ok && st >= 0) { if ((k - st) * ds >= 300) cand.push({ s: ((st + k) / 2) * ds, len: (k - st) * ds }); st = -1; } }
    cand.sort((a, b) => b.len - a.len);
    for (const c of cand) {
      if (bridges.length >= 2) break;
      if (Math.min(c.s, tk.L - c.s) < 220 || bridges.some((b) => Math.abs(b.s - c.s) < 500)) continue;
      const i = mod(Math.round(c.s / ds), n); const oL = wl[i] + 1.2, oR = wr[i] + 1.2;
      if (!okL[i] || !okR[i] || onOther(i, oL, 2) || onOther(i, -oR, 2) || !clearOfOwn(i, oL, wl[i] + 0.2) || !clearOfOwn(i, -oR, wr[i] + 0.2)) continue;
      bridges.push({ s: c.s, i, oL, oR });
    }
  }
  const nearBridge = (sM, pad) => bridges.some((b) => { let d = Math.abs(sM - b.s); d = Math.min(d, tk.L - d); return d < pad; });
  const marshals = [];
  for (let sM = 120; sM < tk.L - 60; sM += 260 + R() * 80) {
    const i = mod(Math.round(sM / ds), n); const ahead = k1[mod(i + Math.round(60 / ds), n)]; const side = ahead > 0 ? 1 : -1;
    if ((side > 0 ? okL : okR)[i] && !inBlock(i, side, 20) && !nearBridge(sM, 14) && !onOther(i, side * (wallAt(i, side) + 2), 3) && clearOfOwn(i, side * (wallAt(i, side) + 2.4), wallAt(i, side) + 0.8)) marshals.push({ s: sM, side });
  }
  // 가로등(시가지): 40m마다 좌우 번갈아 벽 바로 뒤, 길 위로 팔을 뻗는다
  const lamps = [];
  if (street) for (let sM = 10, k = 0; sM < tk.L; sM += 40, k += 1) {
    const i = mod(Math.round(sM / ds), n); const side = k % 2 ? 1 : -1;
    if (!(side > 0 ? okL : okR)[i] || side * tk.k[i] < 0 && Math.abs(tk.k[i]) > 1 / 40) continue;
    if (onOther(i, side * (wallAt(i, side) + 1), 2) || !clearOfOwn(i, side * (wallAt(i, side) + 0.7), wallAt(i, side) - 0.2) || nearBridge(sM, 5)) continue;
    lamps.push({ s: sM, side });
  }
  // 피트 출입 선: 피트 레인 앞뒤의 곧은 길을 따라 내야 쪽에 흰 선
  const pitLines = [];
  { let a = pit.s0; let len = 0; while (len < 140 && straightAt(a - 8)) { a -= 8; len += 8; } if (len > 30) pitLines.push([a, pit.s0]);
    let b = pit.s1; len = 0; while (len < 140 && straightAt(b + 8)) { b += 8; len += 8; } if (len > 30) pitLines.push([pit.s1, b]); }
  // 런오프에 칠한 갠트리 심볼(상설): 자갈밭이 없는 코너의 바깥 포장 런오프, 빠져나가는 자리. 급한 코너부터 네 곳까지
  const logos = [];
  if (!street) {
    const cs = base.corners.filter((c) => !base.gravel.some((gz) => gz.side === c.sign && gz.i1 >= c.i0 - 30 && gz.i0 <= c.i1 + 30)).sort((a, b) => b.peak - a.peak);
    for (const c of cs) {
      if (logos.length >= 4) break;
      const sM = (c.i1 + Math.round(8 / ds)) * ds; const i = mod(Math.round(sM / ds), n); const side = c.sign;
      if (Math.abs(sM % tk.L) < 60 || (side > 0 ? wl : wr)[i] < HALF_W + RUNOFF + 2 || !(side > 0 ? edgeL : edgeR)[i]) continue;
      let ok = true; for (const dd of [-7, 0, 7]) { const q = mod(i + Math.round(dd / ds), n); if (onOther(q, side * (HALF_W + 5), 3) || !(side > 0 ? okL : okR)[q]) ok = false; }
      if (ok) logos.push({ s: sM, side });
    }
  }
  // 구름 그림자(낮): 서킷 위로 큰 구름 열넷이 바람을 따라 천천히 흐른다(땅의 15%쯤을 덮는다). 모양은 둘레 12점의 반지름(들쭉날쭉)
  const clouds = [];
  for (let k = 0; k < 14; k += 1) { const r = 90 + R() * 130; const shape = []; for (let a = 0; a < 12; a += 1) shape.push(0.72 + R() * 0.45); clouds.push({ x: bx0 - 300 + R() * (bx1 - bx0 + 600), y: by0 - 300 + R() * (by1 - by0 + 600), r, shape }); }
  const wind = (() => { const a = R() * TAU; return [Math.cos(a) * 3.2, Math.sin(a) * 3.2]; })();
  // 피트 담의 팀 사람들: 결승선 앞 40m ~ 뒤 14m, 피트 담 바로 뒤에 두셋씩 모여 선다(결승선 마셜 자리는 비운다). 팀 옷 색은 다섯 가지 가운데 한 무리에 하나
  // 따로 뽑는다(위 구름 · 바람 자리가 바뀌지 않게)
  const crew = [];
  { const Rc = rng(hash(`${tk.id}|crew`)); const s0 = Math.max(pit.s0 + 4, CREW_S[0]), s1 = Math.min(pit.s1 - 4, CREW_S[1]); let kit = Math.floor(Rc() * 5); let left = 0;
    for (let sM = s0; sM < s1; sM += 0.75 + Rc() * 0.5) {
      if (left <= 0) { sM += 1.6 + Rc() * 2.4; left = 2 + Math.floor(Rc() * 3); kit = (kit + 1 + Math.floor(Rc() * 3)) % 5; if (sM >= s1) break; }
      const i = mod(Math.round(sM / ds), n);
      if (Math.abs(sM + 4) < 1.4 || !(pit.side > 0 ? okL : okR)[i]) { left = 0; continue; }
      crew.push({ s: sM, kit, h: 0.95 + Rc() * 0.1, up: 0.55 + Rc() * 0.45, ph: Rc() * TAU, late: Rc() * 0.25 }); left -= 1;
    }
  }
  const out = { base, street, rl, rI, wl, wr, okL, okR, edgeL, edgeR, NX, NY, paint, infield, stand, pit, trees, blds, SKY, bumps, patches, boards, kerbF, marbles, hoard, marshals, lamps, pitLines, bridges, logos, clouds, wind, crew };
  cache.set(tk, out);
  return out;
}
export const rlAt = (W3, tk, sM) => { const f = (((sM % tk.L) + tk.L) % tk.L) / tk.ds; const i = Math.floor(f) % tk.n; const j = (i + 1) % tk.n; const u = f - Math.floor(f); return W3.rl[i] + (W3.rl[j] - W3.rl[i]) * u; };
export const kerbAtS = (W3, tk, sM, side) => { const i = Math.round((((sM % tk.L) + tk.L) % tk.L) / tk.ds) % tk.n; return (W3.kerbF[i] & (side > 0 ? 1 : 2)) !== 0; };
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
const wrapM = (sM, L) => ((sM % L) + L) % L;
// j 순으로 놓인 것 가운데 펼친 범위 [a, b]에 드는 것만(바퀴 경계를 넘어도)
function eachSorted(arr, a, b, n, fn) {
  for (const sh of [-n, 0, n]) {
    const lo = a - sh, hi = b - sh; let l = 0, r = arr.length;
    while (l < r) { const m = (l + r) >> 1; if (arr[m].j < lo) l = m + 1; else r = m; }
    for (let k = l; k < arr.length && arr[k].j <= hi; k += 1) fn(arr[k], arr[k].j + sh);
  }
}
// 벽이 서는 구간만 이어서(옆 구간 위 · 급한 코너 안쪽은 끊는다)
function wallRuns(tk, W3, r, sd, q, fn) {
  const n = tk.n; const warr = sd > 0 ? W3.wl : W3.wr; const okA = sd > 0 ? W3.okL : W3.okR; let st = null; const end = r.a + r.m - 1;
  for (let j = r.a; j <= end; j += 1) {
    const i = mod(j, n); const kI = tk.k[i]; const o = sd * warr[i] * q;
    const ok = okA[i] && !(o * kI < 0 && (Math.abs(o) > 1 / Math.abs(kI) - 6 || Math.abs(kI) > 1 / 35));
    if (ok && st == null) st = j;
    if ((!ok || j === end) && st != null) { if (j - st >= 1) fn(st, j); st = null; }
  }
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
    // 런오프에 칠한 갠트리 심볼(상설): 빔 하나 + 5열 × 2행 점. 바깥이 위(길에서 보면 바로 선다)
    if (W3.logos.length) fillBands(P.paint, () => { for (const lg of W3.logos) runoffLogo(ctx, cam, tk, W3, runs, lg, q); });
    ctx.globalAlpha = 1;
  }
  // 아스팔트
  fillBands(P.asphalt, () => whole((a, b) => band(ctx, cam, tk, W3, a, b, -hw, hw)));
  if (show) {
    ctx.globalAlpha = decoA;
    // 보수 자국 · 레이싱 라인(타이어 고무로 진해진 길) · 브레이크 고무 자국
    for (const pt of W3.patches) { ctx.fillStyle = `rgba(${P.patchRGB},${pt.a})`; ctx.beginPath(); for (const [a, b] of spans(runs, tk, pt.s0, pt.s1)) band(ctx, cam, tk, W3, a, b, pt.o0 * q, (pt.o0 + pt.w) * q); ctx.fill(); }
    // 레이싱 라인: 가운데 옅은 띠(한 번에) + 바퀴 두 줄의 고무. 바퀴 자국만 고무 양을 네 단계로 묶어 칠한다(브레이크 구간 · 코너 진하게, 직선 옅게).
    // 달릴 때 450m보다 먼 바퀴 자국은 1px 남짓이라 그리지 않는다(칠하는 넓이를 줄여 느린 기기 부담을 덜기)
    const rlOff = (j) => { const i = Math.floor(j), u = j - i; const r0 = W3.rl[mod(i, n)], r1 = W3.rl[mod(i + 1, n)]; return (r0 + (r1 - r0) * u) * q; };
    ctx.fillStyle = `rgba(${P.rubberRGB},0.085)`; ctx.beginPath(); whole((a, b) => bandVar(ctx, cam, tk, W3, a, b, rlOff, 1.75 * q)); ctx.fill();
    const zMax = q > 1 ? Infinity : 450; const lv = [[], [], [], []];
    whole((a, b) => { for (let j0 = Math.floor(a / 6) * 6; j0 < b; j0 += 6) { const ja = Math.max(a, j0), jb = Math.min(b, j0 + 6); if (jb <= ja || CZs[mod(Math.floor(ja), n)] > zMax) continue; lv[Math.min(3, Math.floor(W3.rI[mod(j0 + 3, n)] * 4))].push(ja, jb); } });
    for (let lvl = 0; lvl < 4; lvl += 1) {
      const c = lv[lvl]; if (!c.length) continue;
      ctx.fillStyle = `rgba(${P.rubberRGB},${(0.04 + 0.13 * (lvl + 0.5) / 4).toFixed(3)})`; ctx.beginPath();
      for (let k = 0; k < c.length; k += 2) for (const sd of [-0.85, 0.85]) bandVar(ctx, cam, tk, W3, c[k], c[k + 1], (j) => rlOff(j) + sd * q, 0.3 * q);
      ctx.fill();
    }
    // 마블: 라인 밖 코너 바깥쪽의 타이어 부스러기(가까이서만)
    ctx.fillStyle = P.marble; ctx.beginPath();
    for (const r of runs) eachSorted(W3.marbles, r.a, r.a + r.m - 1, n, (mb, jj) => {
      if (!wp(tk, W3, jj, mb.o * q) || !proj(cam, WX, WY, 0) || PZ > 110) return;
      const sz = Math.max(0.8, Math.min(2.4, (mb.r * 2 * cam.F) / PZ)); ctx.rect(PX - sz / 2, PY - sz / 2, sz, sz);
    });
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
    // 연석 바깥 턱(살짝 솟은 연석의 그늘)
    fillBands(P.kerbLip, () => {
      for (const kb of base.kerbs) for (const [a, b] of spans(runs, tk, kb.i0 * tk.ds, kb.i1 * tk.ds)) {
        const fl = kb.side > 0 ? W3.edgeL : W3.edgeR;
        for (let j = Math.floor(a / 2) * 2; j < b; j += 2) { if (!fl[mod(j, n)] || !fl[mod(j + 2, n)] || CZs[mod(j, n)] > 350) continue;
          if (Math.max(Math.abs(tk.k[mod(j, n)]), Math.abs(tk.k[mod(j + 2, n)])) * (HALF_W + 1.95) * q > 0.7 && kb.side * tk.k[mod(j, n)] < 0) continue;
          const ja = Math.max(a, j), jb = Math.min(b, j + 2); if (jb > ja) band(ctx, cam, tk, W3, ja, jb, kb.side * (HALF_W + 1.7) * q, kb.side * (HALF_W + 1.95) * q); }
      }
    });
    // 피트 출입 선(내야 쪽 흰 선) · 피트 레인 가운데 점선 · 차고 앞 칸
    fillBands(P.line, () => {
      const ins = W3.infield;
      for (const [p0, p1] of W3.pitLines) for (const [a, b] of spans(runs, tk, wrapM(p0, tk.L), wrapM(p0, tk.L) + (p1 - p0))) band(ctx, cam, tk, W3, a, b, ins * (HALF_W - 2.75) * q, ins * (HALF_W - 2.5) * q);
      const pt = W3.pit; const ps0 = wrapM(pt.s0, tk.L); const wv = pt.side > 0 ? W3.wl : W3.wr;
      for (const [a, b] of spans(runs, tk, ps0, ps0 + (pt.s1 - pt.s0))) {
        for (let j = Math.ceil(a / 3) * 3; j < b; j += 3) { const w0 = wv[mod(j, n)]; band(ctx, cam, tk, W3, j, Math.min(b, j + 1.5), pt.side * (w0 + 4.5) * q, pt.side * (w0 + 4.65) * q); }
        for (let j = Math.ceil(a / 5) * 5; j < b; j += 5) { const w0 = wv[mod(j, n)]; band(ctx, cam, tk, W3, j, Math.min(b, j + 0.08), pt.side * (w0 + 6.2) * q, pt.side * (w0 + 10.8) * q); }
      }
    });
    // 벽 밑 그늘(벽이 땅에 닿는 자리). 달릴 때는 350m 안만(멀면 1px 아래)
    ctx.fillStyle = P.ao; ctx.beginPath();
    const aoMax = q > 1 ? Infinity : 350;
    for (const r of runs) for (const sd of [1, -1]) wallRuns(tk, W3, r, sd, q, (ja, jb) => {
      const off = (j) => { const i = Math.floor(j), u = j - i; const wv = sd > 0 ? W3.wl : W3.wr; return sd * (wv[mod(i, n)] + (wv[mod(i + 1, n)] - wv[mod(i, n)]) * u - 0.5) * q; };
      let st = null; for (let j = ja; j <= jb; j += 1) { const near = CZs[mod(j, n)] < aoMax; if (near && st == null) st = j; if ((!near || j === jb) && st != null) { if (j > st) bandVar(ctx, cam, tk, W3, st, j, off, 0.5 * q); st = null; } }
    });
    ctx.fill();
    // 자갈 알갱이(가까이서만)
    if (!W3.street && !R.lite) {
      ctx.fillStyle = P.gravelDot3; ctx.beginPath();
      for (const gz of base.gravel) for (const [a, b] of spans(runs, tk, gz.i0 * tk.ds, gz.i1 * tk.ds)) {
        for (let j = Math.ceil(a / 0.6) * 0.6; j < b; j += 0.6) {
          const i0 = mod(Math.round(j), n); if (CZs[i0] > 120) continue;
          for (let k = 0; k < gz.depth; k += 1.1) { const hh = h2(Math.round(j * 10), k * 10 + gz.i0); const o = gz.side * (HALF_W + 2.4 + k + hh * 0.9) * q;
            if (!wp(tk, W3, j + hh * 0.5, o) || !proj(cam, WX, WY, 0)) continue; const sz = Math.max(0.7, Math.min(2, (0.12 * cam.F) / PZ)); ctx.rect(PX - sz / 2, PY - sz / 2, sz, sz); }
        }
      }
      ctx.fill();
    }
    // 출발: 체크무늬 두 줄 · 그리드 칸(8m 간격, 좌우 엇갈림)
    startMarks(ctx, cam, tk, W3, runs, P, q);
    // 레이싱 라인 안내(고르면): 차 앞 220m에 4m마다 앞을 가리키는 V자. 손을 떼는 구간은 빨강, 멀수록 옅게(칠한 선과 헷갈리지 않게 V자로)
    if (R.guide && R.car) {
      const s0 = R.car.s + 7; const lat = (sM) => rlAt(W3, tk, sM) * q;
      const inZone = (sM) => { const m = wrapM(sM, tk.L); return base.zones.some((z) => m >= z.s0 && m <= z.s1); };
      for (const red of [false, true]) for (const band2 of [[0, 70, 0.95], [70, 140, 0.7], [140, 220, 0.4]]) {
        ctx.globalAlpha = decoA * band2[2]; ctx.fillStyle = red ? P.red : P.guide; ctx.beginPath();
        for (let d = band2[0]; d < band2[1]; d += 4) {
          const sc = s0 + d; if (inZone(sc) !== red) continue; const o = lat(sc); const jc = wrapM(sc, tk.L) / tk.ds;
          const pts = [];
          // V자: 끝(앞) · 왼팔 · 오른팔, 굵기 0.24m
          for (const [ds2, dl] of [[0.5, 0], [-0.5, 0.7], [-0.5, 0.46], [0.26, 0], [-0.5, -0.46], [-0.5, -0.7]]) { if (!wp(tk, W3, jc + ds2 / tk.ds, (o + dl) * q) || !proj(cam, WX, WY, 0)) { pts.length = 0; break; } pts.push([PX, PY]); }
          if (pts.length === 6) { ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); ctx.lineTo(pts[4][0], pts[4][1]); ctx.lineTo(pts[5][0], pts[5][1]); ctx.closePath(); }
        }
        ctx.fill();
      }
      ctx.globalAlpha = decoA;
    }
    // 타이어 자국(레이어를 닫을 때까지, 지난 바퀴는 옅게) · 자갈밭에서 끌려 나온 자갈
    drawMarks3d(ctx, cam, tk, W3, R.fx, P, q, R.car);
    // 구름 그림자(낮): 바닥에만 옅게. 바깥 테두리와 안쪽을 두 번 칠해 가장자리가 부드럽다
    if (!P.night && !R.lite && P.cloudA > 0 && R.now != null) {
      const tt = R.now / 1000; const [cx0, cy0, cx1, cy1] = tk.box; const M = 600; const WW = cx1 - cx0 + 2 * M, HH = cy1 - cy0 + 2 * M;
      for (const sc of [1, 0.64]) {
        ctx.fillStyle = `rgba(${P.shadowRGB},${P.cloudA})`; ctx.beginPath();
        for (const c of W3.clouds) {
          const x = cx0 - M + ((((c.x + W3.wind[0] * tt) - (cx0 - M)) % WW) + WW) % WW, y = cy0 - M + ((((c.y + W3.wind[1] * tt) - (cy0 - M)) % HH) + HH) % HH;
          const dz = (x - cam.x) * cam.dx + (y - cam.y) * cam.dy; if (dz < -c.r * 1.3 || dz > 1400) continue;
          const pts = []; for (let k = 0; k < 24; k += 1) { const u = k / 2; const k0 = Math.floor(u) % 12, k1 = (k0 + 1) % 12; const fr = u - Math.floor(u); const w = (1 - Math.cos(fr * Math.PI)) / 2; const f = c.shape[k0] * (1 - w) + c.shape[k1] * w; const an = (k / 24) * TAU; pts.push([x + Math.cos(an) * c.r * f * sc, y + Math.sin(an) * c.r * f * sc]); }
          groundPoly(ctx, cam, pts);
        }
        ctx.fill();
      }
    }
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
          const hoardOn = !painted && depth < 450 && W3.hoard[i0] && W3.hoard[i1]; const mark = hoardOn && depth < 150 && Math.floor(j / 6) !== Math.floor(j2 / 6);
          items.push({ z: depth, sx: PX, half: 6, draw: () => wallSeg(ctx, cam, P, ax, ay, bx, by, wallH, fenceH, painted, j, post, 1 - fogK(depth), hoardOn, mark) });
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
    // 마셜 포스트: 벽 뒤 작은 초소(창 · 꺼진 신호판)
    for (const mp of W3.marshals) for (const [a] of spans(runs, tk, mp.s, mp.s + 0.01)) {
      const i0 = mod(Math.round(a), n); const wv = (mp.side > 0 ? W3.wl : W3.wr)[i0];
      if (!wp(tk, W3, a, mp.side * (wv + 2.4) * q) || WCL) continue; const X = WX, Y = WY;
      if (!inView(X, Y, 1.3, 80) || PZ > 450) continue; const depth = PZ; const fa = 1 - fogK(depth); if (fa <= 0.02) continue;
      const b = { x: X, y: Y, hx: 1.5, hy: 1.2, a: tk.th[i0], h: 3.0 };
      items.push({ z: depth, sx: PX, half: (2 * cam.F) / depth, draw: () => booth(ctx, cam, P, b, mp.side, fa) });
      // 마셜(사람): 초소 앞쪽(다가오는 쪽) 벽 바로 뒤. 옅은 차가 뒤에 바짝 붙으면 차 앞 400m 안의 마셜이 파랑 깃발을 흔든다
      if (depth < 330 && wp(tk, W3, a - 2.6 / tk.ds, mp.side * (wv + 0.9) * q) && !WCL) {
        const FX = WX, FY = WY; if (!proj(cam, FX, FY, 1)) continue; const dz = PZ; const sx = PX;
        let ahead = R.car ? mp.s - R.car.s : -1; if (ahead < -tk.L / 2) ahead += tk.L; if (ahead > tk.L / 2) ahead -= tk.L;
        const flag = R.flags && R.flags.blue && ahead > 0 && ahead < 400 ? 'blue' : null;
        items.push({ z: dz, sx, half: (1.5 * cam.F) / dz, draw: () => marshalFig(ctx, cam, P, FX, FY, 0, tk.th[i0], mp.side, flag, R.now / 1000 + mp.s * 0.013, fa) });
      }
    }
    // 결승선 마셜: 피트 담 위, 출발선 4m 앞. 마지막 직선에 들어서면 체크 깃발을 흔든다
    { const pt = W3.pit; const sF = tk.L - 4;
      for (const [a] of spans(runs, tk, sF, sF + 0.01)) {
        const i0 = mod(Math.round(a), n); const wv = (pt.side > 0 ? W3.wl : W3.wr)[i0];
        if (!(pt.side > 0 ? W3.okL : W3.okR)[i0] || !wp(tk, W3, a, pt.side * (wv + 0.15) * q) || WCL) continue; const FX = WX, FY = WY;
        if (!proj(cam, FX, FY, 2) || PZ > 330) continue; const dz = PZ; const fa = 1 - fogK(dz); if (fa <= 0.02) continue; const sx = PX;
        items.push({ z: dz, sx, half: (1.5 * cam.F) / dz, draw: () => marshalFig(ctx, cam, P, FX, FY, 1.0, tk.th[i0], pt.side, R.flags && R.flags.cheq ? 'cheq' : null, R.now / 1000, fa) });
      }
      // 팀 사람들: 피트 담 바로 뒤. 마지막 320m부터(체크 깃발과 같은 때) 담 아래 턱에 올라서며 두 팔을 든다
      if (!R.lite && P.crew && P.crew.length) for (const cr of W3.crew) for (const [a] of spans(runs, tk, wrapM(cr.s, tk.L), wrapM(cr.s, tk.L) + 0.01)) {
        const i0 = mod(Math.round(a), n); const wv = (pt.side > 0 ? W3.wl : W3.wr)[i0];
        if (!(pt.side > 0 ? W3.okL : W3.okR)[i0] || !wp(tk, W3, a, pt.side * (wv + 0.6) * q) || WCL) continue; const FX = WX, FY = WY;
        if (!proj(cam, FX, FY, 1) || PZ > 220) continue; const dz = PZ; const fa = 1 - fogK(dz); if (fa <= 0.02) continue; const sx = PX;
        const up = Math.max(0, Math.min(1, ((R.crewUp || 0) - cr.late) / (1 - cr.late))) * cr.up;
        items.push({ z: dz + 2.5, sx, half: (1.2 * cam.F) / dz, draw: () => crewFig(ctx, cam, P, FX, FY, tk.th[i0], cr, up, R.now / 1000, fa) });   // 담 뒤: 담 조각보다 먼저 그려 담이 다리를 가린다
      }
    }
    // 가로등(시가지): 기둥 + 길 위로 뻗은 팔 + 등
    for (const lp of W3.lamps) for (const [a] of spans(runs, tk, lp.s, lp.s + 0.01)) {
      const i0 = mod(Math.round(a), n); const wv = (lp.side > 0 ? W3.wl : W3.wr)[i0];
      if (!wp(tk, W3, a, lp.side * (wv + 0.7) * q) || WCL) continue; const X = WX, Y = WY;
      if (!wp(tk, W3, a, lp.side * (wv - 2.2) * q)) continue; const HX = WX, HY = WY;
      if (!inView(X, Y, 6, 80) || PZ > 400) continue; const depth = PZ; const fa = 1 - fogK(depth); if (fa <= 0.02) continue;
      items.push({ z: depth, sx: PX, half: 4, draw: () => lampPost(ctx, cam, P, X, Y, HX, HY, fa) });
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
    // 광고 다리(긴 직선 위): 기둥 둘 + 빔(다가오는 쪽 면에 갠트리 심볼) + 길 위 그림자
    for (const br of W3.bridges) for (const [a] of spans(runs, tk, br.s, br.s + 0.01)) {
      const i0 = mod(Math.round(a), n);
      if (!proj(cam, tk.x[i0], tk.y[i0], 6.2)) continue; const depth = PZ; const fa = 1 - fogK(depth); if (fa <= 0.02) continue;
      items.push({ z: depth, wide: true, draw: () => adBridge(ctx, cam, P, tk, br, i0, q, fa) });
      if (depth < 800) bridgeShadow(shadowPath, cam, tk, br, i0, q);   // 그림자는 아래 관중석 · 피트와 함께 칠한다
    }
    // 관중석 · 피트 건물(메인 직선)
    blockItems(ctx, items, cam, tk, W3, runs, P, fogK, shadowPath, q, R.lite, R.cheer || 0, (R.now || 0) / 1000); anyShadow = true;
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
      const rr = Math.max(2, ((p.r * 0.6 * (0.5 + u * 1.4)) * cam.F) / depth); const near = clamp01((depth - 8) / 14); const a = (1 - u) * (p.kind === 'dust' ? 0.5 : p.kind === 'kerb' ? 0.3 : 0.42) * near;
      const rgb = p.kind === 'smoke' ? P.smokeRGB : P.dustRGB;
      items.push({ z: depth, draw: () => {   // 가운데가 짙고 가장자리로 사라지는 둥근 연기
        const g = ctx.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`); g.addColorStop(0.55, `rgba(${rgb},${(a * 0.6).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rr, 0, TAU); ctx.fill(); } });
    }
  }
  // 차 그림자 · 옅은 차 · 차
  const carOpt = R.car; const ghost = R.ghost;
  if (carOpt && !carOpt.dot) { drawCarShadow(ctx, cam, carOpt, (a) => `rgba(${P.shadowRGB},${(a * (carOpt.shadowK || 1)).toFixed(3)})`); }
  if (anyShadow) { ctx.fillStyle = `rgba(${P.shadowRGB},${P.envShadowA})`; ctx.fill(shadowPath); }
  // 밤(다크): 가로등 불빛이 길에 고인다
  if (show && P.night && W3.lamps.length) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const lp of W3.lamps) for (const [a] of spans(runs, tk, lp.s, lp.s + 0.01)) {
      const i0 = mod(Math.round(a), n); const wv = (lp.side > 0 ? W3.wl : W3.wr)[i0]; if (!wp(tk, W3, a, lp.side * (wv - 3.4) * q)) continue;
      if (!proj(cam, WX, WY, 0) || PZ > 260) continue; const cx = PX, cy = PY, depth = PZ;
      const rx = (11 * cam.F) / depth; const ry = rx * Math.max(0.25, Math.min(1, (cam.z / depth) * 1.1));
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(${P.lampGlowRGB},${(0.16 * decoA * (1 - fogK(depth))).toFixed(3)})`); g.addColorStop(1, `rgba(${P.lampGlowRGB},0)`);
      ctx.setTransform(R.dpr * rx, 0, 0, R.dpr * ry, R.dpr * cx, R.dpr * cy); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
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
  if (!fx) return;
  const sC = car ? car.s : null; const L = tk.L;
  const rel = (sM) => { let d = sM - sC; d -= Math.round(d / L) * L; return d; };
  if (fx.marks.length) {
    // 같은 진하기끼리 한 번에 칠한다(겹친 자국이 두 번 진해지지 않고, 칠하는 횟수도 준다)
    const groups = new Map();
    for (const m of fx.marks) {
      if (sC != null) { const d = rel(m.s0); if (d < -120 || d > 500) continue; }
      const a = Math.round(m.k * (m.kind === 'launch' ? 0.7 : 0.5) * MARK_FADE ** (m.age || 0) * 50) / 50; if (a <= 0) continue;
      let list = groups.get(a); if (!list) { list = []; groups.set(a, list); } list.push(m);
    }
    for (const [a, list] of groups) {
      ctx.fillStyle = `rgba(${P.markRGB},${a.toFixed(3)})`; ctx.beginPath();
      for (const m of list) for (const [o0, o1] of [[m.a0, m.a1], [m.b0, m.b1]]) {
        const pts = [];
        for (const [sM, o, dl] of [[m.s0, o0, -0.16], [m.s1, o1, -0.16], [m.s1, o1, 0.16], [m.s0, o0, 0.16]]) { if (!wp(tk, W3, sM / tk.ds, (o + dl) * q) || !proj(cam, WX, WY, 0)) { pts.length = 0; break; } pts.push([PX, PY]); }
        if (pts.length === 4) { ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); }
      }
      ctx.fill();
    }
  }
  // 자갈: 차 앞 160m 안의 알갱이만
  if (fx.debris && fx.debris.length && sC != null) {
    ctx.fillStyle = P.debris; ctx.beginPath();
    for (const d of fx.debris) {
      const r = rel(d.s); if (r < -40 || r > 160) continue;
      if (!wp(tk, W3, d.s / tk.ds, d.o * q) || !proj(cam, WX, WY, 0)) continue;
      const sz = Math.max(0.8, Math.min(2.4, (d.r * 2 * cam.F) / PZ)); ctx.rect(PX - sz / 2, PY - sz / 2, sz, sz);
    }
    ctx.fill();
  }
}

// 바닥 다각형(세계 m): 카메라 바로 앞(깊이 NEAR + 0.5)에서 잘라 화면으로. 카메라가 그림자 안에 있어도 바르게 칠한다
function groundPoly(ctx, cam, pts) {
  const zN = NEAR + 0.5; const m = pts.length; const out = [];
  const dep = (p) => (p[0] - cam.x) * cam.dx + (p[1] - cam.y) * cam.dy - cam.z * cam.dz;
  for (let k = 0; k < m; k += 1) {
    const a = pts[k], b = pts[(k + 1) % m]; const da = dep(a), db = dep(b);
    if (da >= zN) out.push(a);
    if ((da >= zN) !== (db >= zN)) { const u = (zN - da) / (db - da); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
  }
  if (out.length < 3) return;
  let first = true;
  for (const p of out) { if (!proj(cam, p[0], p[1], 0)) continue; if (first) { ctx.moveTo(PX, PY); first = false; } else ctx.lineTo(PX, PY); }
  if (!first) ctx.closePath();
}

// 런오프 심볼 하나: 길 바깥(sd) HALF_W + 2.4 ~ 7.2m에 12m 폭. 빔(맨 바깥 띠) + 점 5열 × 2행
function runoffLogo(ctx, cam, tk, W3, runs, lg, q) {
  const sd = lg.side; const o = (x) => sd * (HALF_W + x) * q;
  for (const [a, b] of spans(runs, tk, lg.s - 6, lg.s + 6)) {
    if (CZs[mod(Math.round((a + b) / 2), tk.n)] > 450) continue;
    band(ctx, cam, tk, W3, a, b, o(6.3), o(7.1));
    const shift = Math.round((a - (lg.s - 6) / tk.ds) / (tk.L / tk.ds)) * (tk.L / tk.ds); const jc = lg.s / tk.ds + shift;
    for (let c = 0; c < 5; c += 1) for (const row of [5.0, 3.3]) {
      const jd = jc + (-4.8 + c * 2.4) / tk.ds; if (jd < a || jd > b) continue;
      let first = true;
      for (let k = 0; k < 10; k += 1) { const an = (k / 10) * TAU; if (!wp(tk, W3, jd + (Math.cos(an) * 0.62) / tk.ds, o(row) + sd * Math.sin(an) * 0.62 * q) || !proj(cam, WX, WY, 0)) { first = true; break; } if (first) { ctx.moveTo(PX, PY); first = false; } else ctx.lineTo(PX, PY); }
      if (!first) ctx.closePath();
    }
  }
}

// 광고 다리: 기둥 둘(벽 바로 뒤) + 빔(높이 5.2~7m). 다가오는 쪽 면은 어두운 판에 9m마다 갠트리 심볼
function adBridge(ctx, cam, P, tk, br, i0, q, fa) {
  const th = tk.th[i0]; const fx = Math.cos(th), fy = Math.sin(th); const rx = -fy, ry = fx; const X0 = tk.x[i0], Y0 = tk.y[i0];
  const lo = -br.oL * q, hi = br.oR * q;   // 이 그림의 옆(o)은 오른쪽이 +
  const P3 = (o, f, Z) => (proj(cam, X0 + rx * o + fx * f, Y0 + ry * o + fy * f, Z) ? [PX, PY, PZ] : null);
  const poly = (pts, fill) => { if (pts.some((v) => !v)) return; ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k += 1) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = 0.6; ctx.stroke(); };
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  for (const [o, sd] of [[lo, -1], [hi, 1]]) {
    poly([P3(o - 0.4, -0.4, 0), P3(o + 0.4, -0.4, 0), P3(o + 0.4, -0.4, 7), P3(o - 0.4, -0.4, 7)], P.gantry);
    poly([P3(o - sd * 0.4, -0.4, 0), P3(o - sd * 0.4, 0.4, 0), P3(o - sd * 0.4, 0.4, 7), P3(o - sd * 0.4, -0.4, 7)], P.gantrySide);   // 길 쪽 옆면
  }
  poly([P3(lo - 0.4, -0.6, 7), P3(hi + 0.4, -0.6, 7), P3(hi + 0.4, 0.6, 7), P3(lo - 0.4, 0.6, 7)], P.gantryTop);
  if (cam.z < 5.2) poly([P3(lo - 0.4, -0.6, 5.2), P3(hi + 0.4, -0.6, 5.2), P3(hi + 0.4, 0.6, 5.2), P3(lo - 0.4, 0.6, 5.2)], P.gantrySide);
  poly([P3(lo - 0.4, -0.6, 5.2), P3(hi + 0.4, -0.6, 5.2), P3(hi + 0.4, -0.6, 7), P3(lo - 0.4, -0.6, 7)], P.hoard);
  // 심볼: 빔(2.4 × 0.16m) + 점 5열 × 2행
  const mid = P3(0, -0.62, 6.1); if (mid && (2.4 * cam.F) / mid[2] > 6) {
    const span = hi - lo; const cnt = Math.max(1, Math.floor(span / 9)); ctx.fillStyle = P.hoardMark;
    for (let k = 0; k < cnt; k += 1) {
      const oc = lo + (span * (k + 0.5)) / cnt;
      poly([P3(oc - 1.2, -0.62, 6.56), P3(oc + 1.2, -0.62, 6.56), P3(oc + 1.2, -0.62, 6.72), P3(oc - 1.2, -0.62, 6.72)], P.hoardMark);
      ctx.fillStyle = P.hoardMark; ctx.beginPath();
      for (let c = 0; c < 5; c += 1) for (const Z of [6.2, 5.82]) { const p = P3(oc - 0.96 + c * 0.48, -0.62, Z); if (!p) continue; const r = Math.max(0.6, (0.13 * cam.F) / p[2]); ctx.moveTo(p[0] + r, p[1]); ctx.arc(p[0], p[1], r, 0, TAU); }
      ctx.fill();
    }
  }
  ctx.globalAlpha = prevA;
}
function bridgeShadow(path, cam, tk, br, i0, q) {
  const th = tk.th[i0]; const fx = Math.cos(th), fy = Math.sin(th); const rx = -fy, ry = fx; const Z = 6.1;
  const X0 = tk.x[i0] + SH[0] * Z, Y0 = tk.y[i0] + SH[1] * Z; const pts = [];
  for (const [o, f] of [[-br.oL * q, -0.6], [br.oR * q, -0.6], [br.oR * q, 0.6], [-br.oL * q, 0.6]]) pts.push([X0 + rx * o + fx * f, Y0 + ry * o + fy * f]);
  const sp = []; for (const [x, y] of pts) { if (!proj(cam, x, y, 0)) return; sp.push([PX, PY]); }
  path.moveTo(sp[0][0], sp[0][1]); for (let k = 1; k < 4; k += 1) path.lineTo(sp[k][0], sp[k][1]); path.closePath();
}

// 마셜(사람, 주황 옷): 발(X, Y, z0)에서 선다. side: 길의 어느 쪽에 섰는지(+ 왼쪽). flag: null(팔을 내림) · 'blue' · 'cheq'.
// 깃발은 다가오는 운전자를 보며 좌우로 흔든다(1.25번/초). 천은 흔드는 반대쪽으로 끌리며 끝에서 접힌다. 차처럼 실제보다 1.3배(작은 화면에서 읽히게)
function marshalFig(ctx, cam, P, X, Y, z0, th, side, flag, t, fa) {
  const K = CAR3;
  const Nx = Math.sin(th), Ny = -Math.cos(th); const Tx = -side * Nx, Ty = -side * Ny; const fX = Math.cos(th), fY = Math.sin(th);
  const pr = (x, y, z) => (proj(cam, x, y, z) ? [PX, PY, PZ] : null);
  const foot = pr(X, Y, z0), hip = pr(X, Y, z0 + 0.92 * K), neck = pr(X, Y, z0 + 1.46 * K), head = pr(X, Y, z0 + 1.64 * K); if (!foot || !hip || !neck || !head) return;
  const wpx = (m, d) => Math.max(1, (m * K * cam.F) / d);
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa; ctx.lineCap = 'round';
  const seg = (a, b, wM, col) => { ctx.strokeStyle = col; ctx.lineWidth = wpx(wM, a[2]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  seg(foot, hip, 0.28, P.marshal); seg(hip, neck, 0.4, P.marshal);
  ctx.fillStyle = P.marshalHead; ctx.beginPath(); ctx.arc(head[0], head[1], wpx(0.13, head[2]), 0, TAU); ctx.fill();
  if (flag) {
    const sx = X + Tx * 0.12 * K, sy = Y + Ty * 0.12 * K; const sh = pr(sx, sy, z0 + 1.4 * K);
    const hx = X + Tx * 0.26 * K, hy = Y + Ty * 0.26 * K, hz = z0 + 1.92 * K; const hand = pr(hx, hy, hz);
    if (sh && hand) seg(sh, hand, 0.11, P.marshal);
    const w = TAU * 1.25 * t; const a = 0.55 * Math.sin(w); const da = Math.cos(w);
    const pdx = Tx * Math.sin(a), pdy = Ty * Math.sin(a), pdz = Math.cos(a);           // 깃대 방향(위 · 길 쪽 사이)
    const qx = Tx * Math.cos(a), qy = Ty * Math.cos(a), qz = -Math.sin(a);             // 깃대에 수직(같은 면)
    const tipX = hx + pdx * K, tipY = hy + pdy * K, tipZ = hz + pdz * K; const tip = pr(tipX, tipY, tipZ);
    if (hand && tip) { ctx.strokeStyle = P.flagPole; ctx.lineWidth = wpx(0.04, tip[2]); ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke(); }
    const cw = -0.85 * K * Math.tanh(da * 2.4); const rip = 0.08 * K * Math.sin(w * 2.3);
    const A = [tipX, tipY, tipZ], D = [tipX - pdx * 0.58 * K, tipY - pdy * 0.58 * K, tipZ - pdz * 0.58 * K];
    const B = [A[0] + qx * cw + fX * rip, A[1] + qy * cw + fY * rip, A[2] + qz * cw - 0.06];
    const C = [D[0] + qx * cw * 0.94 - fX * rip, D[1] + qy * cw * 0.94 - fY * rip, D[2] + qz * cw * 0.94 - 0.06];
    const at = (u, v) => [A[0] + (B[0] - A[0]) * u + (D[0] - A[0]) * v + (A[0] - B[0] + C[0] - D[0]) * u * v, A[1] + (B[1] - A[1]) * u + (D[1] - A[1]) * v + (A[1] - B[1] + C[1] - D[1]) * u * v, A[2] + (B[2] - A[2]) * u + (D[2] - A[2]) * v + (A[2] - B[2] + C[2] - D[2]) * u * v];
    const cell = (u0, v0, u1, v1) => { const q4 = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)].map((p) => pr(p[0], p[1], p[2])); if (q4.some((p) => !p)) return; ctx.moveTo(q4[0][0], q4[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(q4[k][0], q4[k][1]); ctx.closePath(); };
    if (flag === 'cheq') {
      for (const odd of [0, 1]) { ctx.fillStyle = odd ? P.check : P.line; ctx.beginPath(); for (let u = 0; u < 4; u += 1) for (let v = 0; v < 3; v += 1) if ((u + v) % 2 === odd) cell(u / 4, v / 3, (u + 1) / 4, (v + 1) / 3); ctx.fill(); }
    } else { ctx.fillStyle = P.flagBlue; ctx.beginPath(); cell(0, 0, 1, 1); ctx.fill(); }
  }
  ctx.globalAlpha = prevA;
}

// 피트 담의 팀 사람(팀 옷 · 어두운 바지 · 헤드셋): 길을 보고 선다. up(0~1)만큼 담 아래 턱에 올라서고 두 팔을 V로 든다(든 팔은 천천히 좌우로).
// 마셜처럼 실제보다 1.3배
function crewFig(ctx, cam, P, X, Y, th, cr, up, t, fa) {
  const K = CAR3 * cr.h; const fX = Math.cos(th), fY = Math.sin(th);
  const z0 = 0.45 * up; const arm = Math.min(1, up * 1.8); const ease = arm * arm * (3 - 2 * arm);
  const pr = (x, y, z) => (proj(cam, x, y, z) ? [PX, PY, PZ] : null);
  const foot = pr(X, Y, z0), hip = pr(X, Y, z0 + 0.92 * K), neck = pr(X, Y, z0 + 1.42 * K), head = pr(X, Y, z0 + 1.62 * K); if (!foot || !hip || !neck || !head) return;
  const wpx = (m, d) => Math.max(1, (m * K * cam.F) / d);
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa; ctx.lineCap = 'round';
  const seg = (a, b, wM, col) => { ctx.strokeStyle = col; ctx.lineWidth = wpx(wM, a[2]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  const kit = P.crew[cr.kit % P.crew.length];
  seg(foot, hip, 0.3, P.headset); seg(hip, neck, 0.44, kit);
  const sz = z0 + 1.36 * K; const sway = 0.07 * K * Math.sin(t * TAU * 1.05 + cr.ph) * ease;
  for (const sd of [-1, 1]) {
    const sh = pr(X + fX * sd * 0.19 * K, Y + fY * sd * 0.19 * K, sz); if (!sh) continue;
    const along = sd * (0.1 + 0.32 * ease) * K + sway; const hz = sz + (-0.6 + 1.18 * ease) * K;
    const hand = pr(X + fX * (sd * 0.19 * K + along), Y + fY * (sd * 0.19 * K + along), hz); if (hand) seg(sh, hand, 0.11, kit);
  }
  const hr = wpx(0.12, head[2]);
  ctx.fillStyle = P.marshalHead; ctx.beginPath(); ctx.arc(head[0], head[1], hr, 0, TAU); ctx.fill();
  if (hr > 2.2) { ctx.strokeStyle = P.headset; ctx.lineWidth = Math.max(1, hr * 0.35); ctx.beginPath(); ctx.arc(head[0], head[1], hr * 1.05, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  ctx.globalAlpha = prevA;
}

// 벽 한 조각: 콘크리트(코너 근처는 빨강 · 흰 줄) + 위 철망(옅은 면 · 기둥 · 윗줄)
function wallSeg(ctx, cam, P, ax, ay, bx, by, wallH, fenceH, painted, j, post, fa, hoardOn, mark) {
  if (fa <= 0.02) return;
  const p = []; for (const [X, Y, Z] of [[ax, ay, 0], [bx, by, 0], [bx, by, wallH], [ax, ay, wallH], [bx, by, fenceH], [ax, ay, fenceH]]) { if (!proj(cam, X, Y, Z)) return; p.push([PX, PY]); }
  const quad = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(p[a][0], p[a][1]); ctx.lineTo(p[b][0], p[b][1]); ctx.lineTo(p[c][0], p[c][1]); ctx.lineTo(p[d][0], p[d][1]); ctx.closePath(); };
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  ctx.fillStyle = painted ? (Math.floor(j / 2) % 2 ? P.kerbA : P.wallPaint) : P.wall; quad(0, 1, 2, 3); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.strokeStyle = P.wallTop; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[3][0], p[3][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.stroke();
  ctx.fillStyle = P.fence; quad(3, 2, 4, 5); ctx.fill();
  if (hoardOn) {   // 광고판: 철망 아래쪽에 판, 12m마다 갠트리 심볼(빔 하나 + 5열 × 2행)
    const z0 = wallH + 0.15, z1 = wallH + 1.45; const hp = []; for (const [X, Y, Z] of [[ax, ay, z0], [bx, by, z0], [bx, by, z1], [ax, ay, z1]]) { if (!proj(cam, X, Y, Z)) { ctx.globalAlpha = prevA; return; } hp.push([PX, PY]); }
    ctx.fillStyle = P.hoard; ctx.beginPath(); ctx.moveTo(hp[0][0], hp[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(hp[k][0], hp[k][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = P.hoard; ctx.lineWidth = 0.6; ctx.stroke();
    if (mark) {
      const L = Math.hypot(bx - ax, by - ay) || 1; const ux = (bx - ax) / L, uy = (by - ay) / L; const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const at = (t, Z) => (proj(cam, mx + ux * t, my + uy * t, Z) ? [PX, PY, PZ] : null);
      const b0 = at(-1.1, wallH + 1.2), b1 = at(1.1, wallH + 1.2), b2 = at(1.1, wallH + 1.34), b3 = at(-1.1, wallH + 1.34);
      ctx.fillStyle = P.hoardMark;
      if (b0 && b1 && b2 && b3) { ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b3[0], b3[1]); ctx.closePath(); ctx.fill(); }
      ctx.beginPath();
      for (let c = 0; c < 5; c += 1) for (const Z of [wallH + 0.88, wallH + 0.55]) { const p = at(-0.88 + c * 0.44, Z); if (!p) continue; const r = Math.max(0.6, (0.12 * cam.F) / p[2]); ctx.moveTo(p[0] + r, p[1]); ctx.arc(p[0], p[1], r, 0, TAU); }
      ctx.fill();
    }
  }
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
// 마셜 포스트: 흰 상자 + 창 띠(다가오는 쪽 · 길 쪽) + 꺼진 신호판(LED 판, 불은 꺼진 채) + 지붕 모서리 선
function booth(ctx, cam, P, b, side, fa) {
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  box3d(ctx, cam, P, b, P.booth, P.boothShade, P.roof);
  const c = Math.cos(b.a), s = Math.sin(b.a); const rx = -s, ry = c;   // 진행 방향(c, s) · 오른쪽(rx, ry). 왼쪽(+o)은 -오른쪽
  const tx = side * rx, ty = side * ry;   // 상자에서 길 쪽(벽이 왼쪽이면 오른쪽)
  const quad = (pts, fill) => { if (pts.some((v) => !v)) return; ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); ctx.fill(); };
  // 면 하나: 가운데(fx, fy) · 바깥 방향(nx, ny) · 면을 따라가는 방향(ux, uy) · 반폭 w
  const face = (fx, fy, nx, ny, ux, uy, w, panel) => {
    if ((cam.x - fx) * nx + (cam.y - fy) * ny <= 0) return;
    const P4 = (t, Z) => (proj(cam, fx + nx * 0.02 + ux * t, fy + ny * 0.02 + uy * t, Z) ? [PX, PY] : null);
    quad([P4(-w * 0.82, b.h * 0.6), P4(w * 0.82, b.h * 0.6), P4(w * 0.82, b.h * 0.86), P4(-w * 0.82, b.h * 0.86)], P.glass);
    if (panel) quad([P4(-w * 0.82, b.h * 0.18), P4(-w * 0.82 + 0.9, b.h * 0.18), P4(-w * 0.82 + 0.9, b.h * 0.46), P4(-w * 0.82, b.h * 0.46)], P.panel);
  };
  face(b.x - c * b.hx, b.y - s * b.hx, -c, -s, tx, ty, b.hy, false);   // 다가오는 차를 보는 면
  face(b.x + tx * b.hy, b.y + ty * b.hy, tx, ty, c, s, b.hx, true);    // 길 쪽 면(신호판은 다가오는 쪽 끝에)
  // 지붕 모서리(라이트 테마의 흰 땅에서도 상자가 읽히게)
  const cs = boxCorners(b); const top = []; for (const [x, y] of cs) { if (!proj(cam, x, y, b.h)) { ctx.globalAlpha = prevA; return; } top.push([PX, PY]); }
  ctx.strokeStyle = P.roofEdge; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(top[k][0], top[k][1]); ctx.closePath(); ctx.stroke();
  ctx.globalAlpha = prevA;
}
// 상자(바닥 네 모서리 + 높이): 카메라를 보는 벽(빛 받는 쪽 밝게) + 지붕
function box3d(ctx, cam, P, b, lit, shade, roof) {
  const cs = boxCorners(b); const top = []; const bot = [];
  for (const [x, y] of cs) { if (!proj(cam, x, y, 0)) return; bot.push([PX, PY]); if (!proj(cam, x, y, b.h)) return; top.push([PX, PY]); }
  for (let k = 0; k < 4; k += 1) {
    const a = cs[k], c2 = cs[(k + 1) % 4]; const mx = (a[0] + c2[0]) / 2, my = (a[1] + c2[1]) / 2; const nx = mx - b.x, ny = my - b.y;
    if ((cam.x - mx) * nx + (cam.y - my) * ny <= 0) continue;
    const l = Math.hypot(nx, ny) || 1; const L = Math.max(0, -(nx / l) * SUN[0] - (ny / l) * SUN[1]); const k2 = (k + 1) % 4;
    ctx.fillStyle = L > 0.25 ? lit : shade; ctx.beginPath(); ctx.moveTo(bot[k][0], bot[k][1]); ctx.lineTo(bot[k2][0], bot[k2][1]); ctx.lineTo(top[k2][0], top[k2][1]); ctx.lineTo(top[k][0], top[k][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke();
  }
  if (cam.z > b.h) { ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (let k = 1; k < 4; k += 1) ctx.lineTo(top[k][0], top[k][1]); ctx.closePath(); ctx.fill(); }
}
// 가로등: 기둥(11m) + 길 위로 뻗은 팔 + 등. 밤에는 등이 빛난다
function lampPost(ctx, cam, P, X, Y, HX, HY, fa) {
  const a = cam.project(X, Y, 0), b = cam.project(X, Y, 11), c = cam.project(HX, HY, 11.2); if (!a || !b || !c) return;
  const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa;
  ctx.strokeStyle = P.lamp; ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, (0.22 * cam.F) / a[2]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.lineWidth = Math.max(1, (0.14 * cam.F) / b[2]); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
  const r = Math.max(1.2, Math.min(5, (0.35 * cam.F) / c[2]));
  if (P.night && a[2] < 300) { const R5 = Math.min(26, r * 5); const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], R5); g.addColorStop(0, `rgba(${P.lampGlowRGB},.5)`); g.addColorStop(1, `rgba(${P.lampGlowRGB},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], R5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = P.night ? P.lampHeadOn : P.lampHead; ctx.beginPath(); ctx.ellipse(c[0], c[1] + r * 0.2, r * 1.3, r * 0.55, 0, 0, TAU); ctx.fill();
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
function blockItems(ctx, items, cam, tk, W3, runs, P, fogK, shadowPath, q, lite, cheer = 0, tSec = 0) {
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
        // 사람: 줄마다 점. 결승 때는 일어선다(0.35m 위로, 한 번). 드문드문 깃발(결승 때 더 크게 흔든다)
        const rows = 9; const cols = 12; const flags = [];
        for (let r = 0; r < rows; r += 1) for (let c2 = 0; c2 < cols; c2 += 1) {
          const u = (c2 + 0.5) / cols, v = (r + 0.5) / rows; const hh = h2(seed * 31 + r, c2); if (hh < 0.18) continue;
          const up = cheer * (hh > 0.3 ? 0.35 : 0);
          const p = corner(ja + (jb - ja) * u, o0 + (o1 - o0) * v, 2.4 + 12.6 * v + 0.4 + up); if (!p) continue;
          const sz = Math.max(1, (0.55 * cam.F) / PZ); ctx.fillStyle = P.crowd[Math.floor(hh * 97) % P.crowd.length];
          if (sz < 5) ctx.fillRect(p[0] - sz / 2, p[1] - sz, sz, sz);
          else { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p[0] - sz * 0.42, p[1] - sz * 0.95, sz * 0.84, sz * 0.95, sz * 0.3) : ctx.rect(p[0] - sz * 0.42, p[1] - sz * 0.95, sz * 0.84, sz * 0.95); ctx.arc(p[0], p[1] - sz * 1.25, sz * 0.27, 0, TAU); ctx.fill(); }   // 가까우면 머리와 몸
          if (hh > 0.955 && depth < 170) flags.push([ja + (jb - ja) * u, o0 + (o1 - o0) * v, 2.4 + 12.6 * v + 0.4 + up, hh]);
        }
        for (const [jf, of, zf, hh] of flags) {
          const base = corner(jf, of, zf); const top = corner(jf, of, zf + 1.3); if (!base || !top) continue;
          ctx.strokeStyle = P.flagPole; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
          const wv = (0.25 + 0.6 * cheer) * Math.sin(tSec * TAU * (0.9 + hh) + hh * 40);   // 천이 앞뒤(길 방향)로 흔들린다
          const djf = (0.9 * Math.cos(wv)) / tk.ds; const a2 = corner(jf + djf, of, zf + 1.3 - 0.12 * Math.sin(wv)), b2 = corner(jf + djf, of, zf + 0.75 - 0.12 * Math.sin(wv)), c3 = corner(jf, of, zf + 0.75);
          if (!a2 || !b2 || !c3) continue;
          ctx.fillStyle = [P.red, P.line, P.check][Math.floor(hh * 1000) % 3]; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(c3[0], c3[1]); ctx.closePath(); ctx.fill();
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
  // 피트 월 스탠드: 피트 담 위 팀 자리(지붕 달린 작은 상자) 16m마다
  segs({ s0: pt.s0 + 20, s1: pt.s1 - 20 }, 16, (ja) => {
    { let sR = wrapM(ja * tk.ds, tk.L); if (sR > tk.L / 2) sR -= tk.L; if (sR > CREW_S[0] - 3 && sR < CREW_S[1] + 3) return; }   // 결승선 앞뒤는 팀 사람들 자리
    const wv = (ps > 0 ? W3.wl : W3.wr)[mod(Math.round(ja), n)];
    if (!wp(tk, W3, ja, ps * (wv + 1.0) * q)) return; const X = WX, Y = WY; if (!proj(cam, X, Y, 1.2)) return; const depth = PZ; const fa = 1 - fogK(depth); if (fa <= 0.02 || depth > 400) return;
    const b = { x: X, y: Y, hx: 1.6, hy: 0.7, a: tk.th[mod(Math.round(ja), n)], h: 2.5 };
    items.push({ z: depth, sx: PX, half: (2 * cam.F) / depth, draw: () => { const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa; box3d(ctx, cam, P, b, P.booth, P.boothShade, P.panel); ctx.globalAlpha = prevA; } });
  });
  // 레이스 컨트롤 탑: 피트 건물 뒤, 출발선 근처에 높게(위쪽은 유리)
  { const sT = Math.max(pt.s0 + 30, Math.min(pt.s1 - 30, 20)); const iT = mod(Math.round(wrapM(sT, tk.L) / tk.ds), n); const wv = (ps > 0 ? W3.wl : W3.wr)[iT];
    for (const [a] of spans(runs, tk, wrapM(sT, tk.L), wrapM(sT, tk.L) + 0.01)) {
      if (!wp(tk, W3, a, ps * (wv + 33) * q)) break; const X = WX, Y = WY; if (!proj(cam, X, Y, 12)) break; const depth = PZ; const fa = 1 - fogK(depth); if (fa <= 0.02) break;
      const b = { x: X, y: Y, hx: 7, hy: 5.5, a: tk.th[iT], h: 24 };
      items.push({ z: depth, sx: PX, half: (9 * cam.F) / depth, draw: () => { const prevA = ctx.globalAlpha; ctx.globalAlpha = prevA * fa; box3d(ctx, cam, P, b, P.bldLit, P.bldShade, P.roof); box3d(ctx, cam, P, { ...b, h: 23.9, hx: 7.05, hy: 5.55 }, P.glass, P.glass, P.roof); box3d(ctx, cam, P, { ...b, h: 18 }, P.bldLit, P.bldShade, P.roof); ctx.globalAlpha = prevA; } });
      if (depth < 600) { bldShadow(shadowPath, cam, b); }
      break;
    }
  }
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
    // 표를 받치는 가는 기둥(땅에 선 표지판처럼)
    if (det > 0.5 && proj(cam, WX, WY, 0)) { ctx.strokeStyle = L.C.line2; ctx.lineWidth = Math.max(1, Math.min(2, (0.12 * cam.F) / depth)); ctx.beginPath(); ctx.moveTo(X, Y + r * 0.8); ctx.lineTo(PX, PY); ctx.stroke(); }
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
