// '한 바퀴' 무대: 서킷 중심선 좌표만으로 그리는 세계(땅 · 런오프 · 자갈밭 · 방호벽 · 아스팔트 · 흰 선 · 연석 · 진한 구간 · 브레이크 보드 · 그리드 · 출발 갠트리).
// 좌표와 코너 위치는 데이터 그대로 쓴다. 폭 방향(옆)만 '보이는 미터'로 키워 그린다(차와 길을 실제보다 굵게 그리기 때문).
//   보이는 미터 1 = latPx 화면 px. 길이 방향(앞뒤)은 실제 미터 × zoom.
// 장식(연석 · 자갈밭 · 고무 자국 · 보드 위치)은 굽은 정도와 진한 구간에서 계산으로 만든다. 실제 서킷의 연석 · 자갈밭 자리와 같다는 뜻은 아니다.
import { zonesOf } from './analysis.js';

const TAU = Math.PI * 2;
const mod = (i, n) => ((i % n) + n) % n;
// 서킷마다 같은 무늬가 나오도록 id로 씨앗을 정한다
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---------- 서킷마다 한 번: 코너 · 연석 · 자갈밭 · 보드 · 고무 자국 ----------
const cache = new WeakMap();
export function prepWorld(tk) {
  if (cache.has(tk)) return cache.get(tk);
  const n = tk.n, ds = tk.ds;
  const K_KERB = 1 / 160, K_GRAVEL = 1 / 75;
  // 코너 구간: |κ|가 기준을 넘는 연속 구간(15m 안의 틈은 잇는다)
  const corners = [];
  let i = 0;
  while (i < n) {
    if (Math.abs(tk.k[i]) <= K_KERB) { i += 1; continue; }
    let j = i; let peak = 0; let sum = 0;
    while (j < n + i && (Math.abs(tk.k[mod(j, n)]) > K_KERB || (() => { for (let q = 1; q <= Math.round(15 / ds); q += 1) if (Math.abs(tk.k[mod(j + q, n)]) > K_KERB) return true; return false; })())) {
      const kk = tk.k[mod(j, n)]; peak = Math.max(peak, Math.abs(kk)); sum += kk; j += 1;
      if (j - i > n) break;
    }
    if ((j - i) * ds >= 10) corners.push({ i0: i, i1: j, sign: sum > 0 ? 1 : -1, peak });
    i = j + 1;
  }
  // 연석: 안쪽은 코너 전체, 바깥쪽은 코너 가운데부터 빠져나가는 15m까지
  const kerbs = [];
  for (const c of corners) {
    const inside = -c.sign, outside = c.sign;   // κ > 0(오른쪽으로 굽음)이면 안쪽은 오른쪽(−)
    kerbs.push({ i0: c.i0, i1: c.i1, side: inside });
    kerbs.push({ i0: Math.round((c.i0 + c.i1) / 2), i1: c.i1 + Math.round(15 / ds), side: outside });
  }
  // 자갈밭: 급한 코너의 바깥쪽, 코너 들어가기 10m 전부터 빠져나간 뒤 40m까지. 깊이는 급할수록 깊게(보이는 미터)
  const gravel = corners.filter((c) => c.peak > K_GRAVEL).map((c) => ({ i0: c.i0 - Math.round(10 / ds), i1: c.i1 + Math.round(40 / ds), side: c.sign, depth: Math.max(7, Math.min(16, c.peak * 700)) }));
  // 진한 구간 앞 브레이크 보드 3 · 2 · 1(150 · 100 · 50m 앞), 다가오는 코너의 바깥쪽에.
  // 앞 구간에서 170m 넘게 곧게 달려오는 큰 브레이크 자리에만 세운다(짧은 구간이 이어지는 곳은 판이 겹쳐 읽히지 않는다). 코너 번호 표 근처는 비운다
  const zones = zonesOf(tk);
  const boards = [];
  zones.forEach((z, zi) => {
    const prev = zones[(zi - 1 + zones.length) % zones.length];
    let gap = z.s0 - prev.s1; if (gap < 0) gap += tk.L;
    if (zones.length > 1 && gap < 170) return;
    const after = tk.k[mod(Math.round((z.s1 + 12) / ds), n)];
    const side = after > 0 ? 1 : -1;
    [[3, 150], [2, 100], [1, 50]].forEach(([num, d]) => {
      const sp = z.s0 - d; if (sp < 40) return;
      if (tk.turns.some((t) => Math.abs(t.s - sp) < 22)) return;
      boards.push({ s: sp, num, side });
    });
  });
  // 고무 자국: 진한 구간마다(다른 차들이 브레이크를 밟은 자리) 짧은 두 줄 자국을 여럿. 코너에 가까울수록 촘촘하게
  const R = rng(hash(tk.id || 'lap'));
  const rubber = [];
  for (const z of zones) {
    const len = z.s1 - z.s0 + 20; const count = Math.min(14, 5 + Math.round(len / 25));
    for (let q = 0; q < count; q += 1) {
      const u = Math.pow(R(), 0.6);                         // 뒤쪽(코너 쪽)에 몰리게
      const s0 = z.s0 - 20 + u * len; const L = 6 + R() * 22;
      const off = (R() - 0.5) * 3.2; const a = 0.10 + R() * 0.16;
      rubber.push({ s0, s1: s0 + L, off, a });
    }
  }
  const out = { corners, kerbs, gravel, boards, rubber, zones };
  cache.set(tk, out);
  return out;
}

// ---------- 매 프레임: 보이는 범위의 화면 좌표 ----------
// V: { tk, w2s, ang, zoom, latPx, i0, i1, full, step }
// 중심선의 화면 좌표와 화면 법선(왼쪽), 화면에서의 반지름(px)을 한 번에 구해 둔다
export function buildView(V) {
  const { tk, w2s, ang, zoom, i0, i1 } = V; const stepI = V.step || 1;
  const m = Math.floor((i1 - i0) / stepI) + 1;
  const X = new Float32Array(m), Y = new Float32Array(m), NX = new Float32Array(m), NY = new Float32Array(m), RAD = new Float32Array(m), K = new Float32Array(m), I = new Int32Array(m);
  for (let j = 0; j < m; j += 1) {
    const ii = i0 + j * stepI; const q = mod(ii, tk.n);
    const [sx, sy] = w2s(tk.x[q], tk.y[q]); X[j] = sx; Y[j] = sy;
    const a = tk.th[q] + ang; NX[j] = Math.sin(a); NY[j] = -Math.cos(a);
    const kk = tk.k[q]; K[j] = kk; RAD[j] = Math.abs(kk) > 1e-6 ? 1 / (Math.abs(kk) * zoom) : 1e9; I[j] = ii;
  }
  V.m = m; V.X = X; V.Y = Y; V.NX = NX; V.NY = NY; V.RAD = RAD; V.K = K; V.I = I;
  return V;
}
// 중심선에서 off(px)만큼 옆(+ 왼쪽). 안쪽으로 반지름보다 깊으면 접히지 않게 줄인다
// 안쪽으로 반지름의 85%보다 깊으면 null(그 자리는 그리지 않는다 — 접히거나 꼬이지 않게)
function offAt(V, j, offPx) {
  if (offPx * V.K[j] < 0 && Math.abs(offPx) > V.RAD[j] * 0.85) return null;
  return [V.X[j] + V.NX[j] * offPx, V.Y[j] + V.NY[j] * offPx];
}
// 보이는 범위 안에서 거리 s(m)의 j(소수). 범위 밖이면 null
function jOf(V, sM) {
  const { tk } = V; const stepI = V.step || 1;
  let ii = sM / tk.ds; const span = (V.i1 - V.i0);
  // 바퀴를 넘어가는 경우를 맞춘다
  while (ii < V.i0) ii += tk.n; while (ii > V.i0 + tk.n) ii -= tk.n;
  const j = (ii - V.i0) / stepI;
  if (ii - V.i0 > span) return null;
  return j;
}
function lineAlong(ctx, V, ja, jb, offPx) {
  const a = Math.max(0, Math.floor(ja)), b = Math.min(V.m - 1, Math.ceil(jb));
  let pen = false;
  for (let j = a; j <= b; j += 1) { const p = offAt(V, j, offPx); if (!p) { pen = false; continue; } if (!pen) { ctx.moveTo(p[0], p[1]); pen = true; } else ctx.lineTo(p[0], p[1]); }
}
// 옆으로 offA~offB 사이 띠(같은 방향 두 선을 이어 닫는다)
function band(ctx, V, ja, jb, offA, offB) {
  const a = Math.max(0, Math.floor(ja)), b = Math.min(V.m - 1, Math.ceil(jb));
  if (b <= a) return false;
  const pa = [], pb = [];
  for (let j = a; j <= b; j += 1) { const p = offAt(V, j, offA), q = offAt(V, j, offB); if (!p || !q) return false; pa.push(p); pb.push(q); }
  ctx.beginPath(); ctx.moveTo(pa[0][0], pa[0][1]);
  for (let k = 1; k < pa.length; k += 1) ctx.lineTo(pa[k][0], pa[k][1]);
  for (let k = pb.length - 1; k >= 0; k -= 1) ctx.lineTo(pb[k][0], pb[k][1]);
  ctx.closePath();
  return true;
}
// 거리 범위(실제 m)를 보이는 범위의 j 범위로. 바퀴 경계를 넘는 구간도 다룬다
function spanJ(V, s0, s1) {
  const { tk } = V; const L = tk.L;
  const out = [];
  for (const shift of [-L, 0, L]) {
    const a = (s0 + shift) / tk.ds, b = (s1 + shift) / tk.ds;
    const ja = (a - V.i0) / (V.step || 1), jb = (b - V.i0) / (V.step || 1);
    if (jb < 0 || ja > V.m - 1) continue;
    out.push([Math.max(0, ja), Math.min(V.m - 1, jb)]);
  }
  return out;
}

// 땅의 잔 점 무늬(세계에 붙어 함께 움직인다 → 속도감)
let dotTile = null;
function dots(ctx, color, cell) {
  const key = `${color}|${cell}`;
  if (!dotTile || dotTile.key !== key) {
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(64, 64) : Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
    const g = c.getContext('2d'); g.fillStyle = color;
    const r = rng(7);
    for (let q = 0; q < cell; q += 1) { g.beginPath(); g.arc(r() * 64, r() * 64, 0.6 + r() * 0.9, 0, TAU); g.fill(); }
    dotTile = { key, pat: ctx.createPattern(c, 'repeat') };
  }
  return dotTile.pat;
}
let grainTile = null;
function grain(ctx, a, b) {
  const key = `${a}|${b}`;
  if (!grainTile || grainTile.key !== key) {
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(48, 48) : Object.assign(document.createElement('canvas'), { width: 48, height: 48 });
    const g = c.getContext('2d'); const r = rng(11);
    for (let q = 0; q < 90; q += 1) { g.fillStyle = q % 3 ? a : b; g.fillRect(Math.floor(r() * 48), Math.floor(r() * 48), 1, 1); }
    grainTile = { key, pat: ctx.createPattern(c, 'repeat') };
  }
  return grainTile.pat;
}
// 무늬를 세계 좌표에 붙인다(카메라와 같이 돌고 움직인다)
function stick(pat, V, scale) {
  if (!pat || !pat.setTransform || typeof DOMMatrix === 'undefined') return pat;
  const [ox, oy] = V.w2s(0, 0); const c = Math.cos(V.ang) * V.zoom * scale, s = Math.sin(V.ang) * V.zoom * scale;
  pat.setTransform(new DOMMatrix([c, s, -s, c, ox, oy]));
  return pat;
}

// ---------- 그리기 ----------
// P: 무대 색(CSS 토큰), W: prepWorld 결과, detail: 0~1(서킷 전체 보기 0 → 따라가기 1)
export function drawGround(ctx, V, P, w, h) {
  ctx.fillStyle = P.ground; ctx.fillRect(0, 0, w, h);
  if (V.detail < 0.5) return;
  ctx.globalAlpha = Math.min(1, (V.detail - 0.5) * 2);
  ctx.fillStyle = stick(dots(ctx, P.dot, 22), V, 0.11); ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}

export function drawTrack(ctx, V, P, W, opts) {
  const { latPx, roadPx, detail } = V; const hw = roadPx / 2;
  const vm = (m) => m * latPx;                       // 보이는 미터 → px
  const det = detail > 0.5;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (det) {
    // 런오프(포장된 바깥 띠) 양쪽
    ctx.strokeStyle = P.runoff; ctx.lineWidth = roadPx + vm(9) * 2;
    ctx.beginPath(); lineAlong(ctx, V, 0, V.m - 1, 0); ctx.stroke();
    // 자갈밭: 급한 코너 바깥
    ctx.fillStyle = P.gravel;
    for (const gz of W.gravel) for (const [ja, jb] of spanJ(V, gz.i0 * V.tk.ds, gz.i1 * V.tk.ds)) {
      if (band(ctx, V, ja, jb, gz.side * (hw + vm(2.2)), gz.side * (hw + vm(2.2 + gz.depth)))) ctx.fill();
    }
    const gp = stick(dots(ctx, P.gravelDot, 70), V, 0.05);
    if (gp) { ctx.fillStyle = gp; for (const gz of W.gravel) for (const [ja, jb] of spanJ(V, gz.i0 * V.tk.ds, gz.i1 * V.tk.ds)) if (band(ctx, V, ja, jb, gz.side * (hw + vm(2.2)), gz.side * (hw + vm(2.2 + gz.depth)))) ctx.fill(); }
    // 방호벽: 양쪽 바깥 선 + 6m마다 기둥(빠르게 지나가며 속도를 보여 준다)
    const bOff = hw + vm(15);
    ctx.strokeStyle = P.barrier; ctx.lineWidth = Math.max(1.5, vm(0.35));
    for (const side of [1, -1]) { ctx.beginPath(); lineAlong(ctx, V, 0, V.m - 1, side * bOff); ctx.stroke(); }
    ctx.strokeStyle = P.post; ctx.lineWidth = Math.max(1.2, vm(0.3)); ctx.lineCap = 'butt';
    const sA = V.I[0] * V.tk.ds, sB = V.I[V.m - 1] * V.tk.ds; const every = 6;
    ctx.beginPath();
    for (let sp = Math.ceil(sA / every) * every; sp <= sB; sp += every) {
      const j = (sp / V.tk.ds - V.i0) / (V.step || 1); const jj = Math.round(j); if (jj < 0 || jj >= V.m) continue;
      for (const side of [1, -1]) { const p1 = offAt(V, jj, side * (bOff - vm(0.2))), p2 = offAt(V, jj, side * (bOff + vm(1.4))); if (!p1 || !p2) continue; ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); }
    }
    ctx.stroke();
    // 타이어 벽: 자갈밭 뒤 방호벽에 작은 원을 줄지어
    ctx.fillStyle = P.tyre;
    for (const gz of W.gravel) for (const [ja, jb] of spanJ(V, gz.i0 * V.tk.ds, gz.i1 * V.tk.ds)) {
      const stepJ = Math.max(1, Math.round(2.2 / V.tk.ds / (V.step || 1)));
      for (let j = Math.ceil(ja); j <= jb; j += stepJ) { const p = offAt(V, j, gz.side * (bOff - vm(1))); if (!p) continue; ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(1.6, vm(0.7)), 0, TAU); ctx.fill(); }
    }
    ctx.lineCap = 'round';
  }
  // 아스팔트
  ctx.strokeStyle = P.asphalt; ctx.lineWidth = roadPx;
  ctx.beginPath(); lineAlong(ctx, V, 0, V.m - 1, 0); if (V.full) ctx.closePath(); ctx.stroke();
  if (det) {
    const gp = stick(grain(ctx, P.grainA, P.grainB), V, 0.06);
    if (gp) { ctx.strokeStyle = gp; ctx.globalAlpha = 0.9; ctx.beginPath(); lineAlong(ctx, V, 0, V.m - 1, 0); ctx.stroke(); ctx.globalAlpha = 1; }
    // 고무 자국(진한 구간 쪽에 몰린 브레이크 자국)
    ctx.lineCap = 'butt'; ctx.lineWidth = Math.max(1.4, vm(0.45));
    for (const r of W.rubber) for (const [ja, jb] of spanJ(V, r.s0, r.s1)) {
      ctx.strokeStyle = `rgba(${P.rubberRGB},${r.a})`;
      for (const sideOff of [-0.95, 0.95]) { ctx.beginPath(); lineAlong(ctx, V, ja, jb, vm(r.off + sideOff)); ctx.stroke(); }
    }
    ctx.lineCap = 'round';
  }
  // 진한 구간(손을 떼는 곳) + 무늬
  ctx.lineCap = 'butt';
  for (const z of W.zones) for (const [ja, jb] of spanJ(V, z.s0, z.s1)) {
    ctx.strokeStyle = P.zone; ctx.lineWidth = roadPx; ctx.beginPath(); lineAlong(ctx, V, ja, jb, 0); ctx.stroke();
    if (!det || opts.zone === 'shade') continue;
    ctx.strokeStyle = P.zoneMark;
    if (opts.zone === 'bars') {
      ctx.lineWidth = Math.max(2, roadPx * 0.1);
      const every = 9 / V.tk.ds / (V.step || 1);
      for (let j = ja + 7 / V.tk.ds / (V.step || 1); j < jb - 0.5; j += every) {
        const jj = Math.round(j); if (jj < 0 || jj >= V.m) continue;
        const p1 = offAt(V, jj, hw * 0.8), p2 = offAt(V, jj, -hw * 0.8); if (!p1 || !p2) continue;
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      }
    } else {
      ctx.lineWidth = Math.max(2, roadPx * 0.09); ctx.lineJoin = 'miter';
      const every = 14 / V.tk.ds / (V.step || 1);
      for (let j = ja + 9 / V.tk.ds / (V.step || 1); j < jb - 1; j += every) {
        const jj = Math.round(j); const jf = Math.min(V.m - 1, jj + Math.max(1, Math.round(roadPx * 0.26 / Math.max(0.5, V.zoom * V.tk.ds * (V.step || 1)))));
        if (jj < 0 || jj >= V.m) continue;
        const pA = offAt(V, jf, hw * 0.68), pC = offAt(V, jj, 0), pB = offAt(V, jf, -hw * 0.68); if (!pA || !pB) continue;
        ctx.beginPath(); ctx.moveTo(pA[0], pA[1]); ctx.lineTo(pC[0], pC[1]); ctx.lineTo(pB[0], pB[1]); ctx.stroke();
      }
      ctx.lineJoin = 'round';
    }
    // 손을 떼는 선: 구간 시작에 길 폭 그대로
    if (ja > 0.5 || z.s0 > 0) {
      const jj = Math.round(ja); const p1 = offAt(V, jj, hw), p2 = offAt(V, jj, -hw);
      if (p1 && p2) { ctx.strokeStyle = P.zoneLine; ctx.lineWidth = Math.max(2.5, roadPx * 0.09); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); }
    }
  }
  if (!det) { ctx.lineCap = 'round'; return; }
  // 흰 선(트랙 한계)
  ctx.strokeStyle = P.line; ctx.lineWidth = Math.max(1.4, vm(0.3)); ctx.lineCap = 'butt';
  for (const side of [1, -1]) { ctx.beginPath(); lineAlong(ctx, V, 0, V.m - 1, side * (hw - vm(0.45))); ctx.stroke(); }
  // 연석: 빨강 · 흰색이 번갈아(4m)
  const blk = 4; const kw = vm(1.9);
  for (const kb of W.kerbs) for (const [ja, jb] of spanJ(V, kb.i0 * V.tk.ds, kb.i1 * V.tk.ds)) {
    const sa = (V.i0 + ja * (V.step || 1)) * V.tk.ds, sb = (V.i0 + jb * (V.step || 1)) * V.tk.ds;
    for (let sp = Math.floor(sa / blk) * blk; sp < sb; sp += blk) {
      const a = Math.max(sa, sp), b = Math.min(sb, sp + blk); if (b <= a) continue;
      const odd = Math.floor(sp / blk) % 2 === 0;
      const j1 = (a / V.tk.ds - V.i0) / (V.step || 1), j2 = (b / V.tk.ds - V.i0) / (V.step || 1);
      ctx.fillStyle = odd ? P.kerbA : P.kerbB;
      if (band(ctx, V, j1, j2, kb.side * (hw - vm(0.1)), kb.side * (hw + kw))) ctx.fill();
    }
  }
  ctx.lineCap = 'round';
}

// 출발 자리: 체크무늬 선 · 그리드 칸(뒤로 엇갈려) — 아스팔트 위
export function drawStartMarks(ctx, V, P, carLen, carW) {
  const { tk } = V; if (V.detail < 0.5) return;
  const jl = spanJ(V, 0, 0.001); if (!jl.length && !V.full) return;
  const hw = V.roadPx / 2;
  for (const [ja] of jl) {
    const j = Math.round(ja); if (j < 0 || j >= V.m) continue;
    // 체크무늬 두 줄
    const n = 8, sq = V.roadPx / n; const nx = V.NX[j], ny = V.NY[j]; const tx = -ny, ty = nx;   // 진행 방향(화면) = 법선을 시계 방향으로
    for (let c = 0; c < n; c += 1) for (let r = 0; r < 2; r += 1) {
      const o = -hw + c * sq; const back = r * sq;
      const x = V.X[j] + nx * o - tx * back, y = V.Y[j] + ny * o - ty * back;
      ctx.fillStyle = (c + r) % 2 ? P.line : P.check;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + nx * sq, y + ny * sq); ctx.lineTo(x + nx * sq - tx * sq, y + ny * sq - ty * sq); ctx.lineTo(x - tx * sq, y - ty * sq); ctx.closePath(); ctx.fill();
    }
  }
  // 그리드 칸: 내 차 자리(가운데) 뒤로 엇갈려 다섯 칸
  const boxL = carLen * 1.12, boxW = carW * 1.5; const gap = boxL * 0.75;
  ctx.strokeStyle = P.line; ctx.lineWidth = Math.max(1.5, V.latPx * 0.3); ctx.lineCap = 'butt';
  for (let k = 0; k < 6; k += 1) {
    const backPx = k === 0 ? 0 : carLen * 1.05 + (k - 1) * (boxL * 0.5 + gap * 0.4);   // 칸 앞선까지의 거리(px). 0번이 내 차 자리
    const sM = -backPx / V.zoom; const jj = jOf(V, wrap(sM, tk.L)); if (jj == null) continue;
    const j = Math.round(jj); if (j < 0 || j >= V.m) continue;
    const lat = k === 0 ? 0 : (k % 2 ? 1 : -1) * hw * 0.42;
    const nx = V.NX[j], ny = V.NY[j]; const tx = -ny, ty = nx;
    const cx = V.X[j] + nx * lat, cy = V.Y[j] + ny * lat;
    // ㄷ자: 앞쪽 가로선 + 양옆 짧은 세로선(뒤로 열림)
    const fx = cx, fy = cy; const half = boxW / 2; const arm = boxL * 0.35;
    ctx.beginPath();
    ctx.moveTo(fx + nx * half - tx * arm, fy + ny * half - ty * arm); ctx.lineTo(fx + nx * half, fy + ny * half);
    ctx.lineTo(fx - nx * half, fy - ny * half); ctx.lineTo(fx - nx * half - tx * arm, fy - ny * half - ty * arm);
    ctx.stroke();
  }
}
const wrap = (sM, L) => ((sM % L) + L) % L;

// 출발 갠트리(빔 + 신호등 다섯): 그림자는 차 아래, 빔은 차 위에 그린다 → 차가 빔 밑을 지나간다
export function drawGantry(ctx, V, P, lit, layer) {
  if (V.detail < 0.5) return;
  const jl = spanJ(V, 0, 0.001); if (!jl.length) return;
  const j = Math.round(jl[0][0]); if (j < 0 || j >= V.m) return;
  const hw = V.roadPx / 2; const reach = hw + V.latPx * 11;   // 런오프 너머까지
  const nx = V.NX[j], ny = V.NY[j]; const tx = -ny, ty = nx;
  const beam = Math.max(7, V.latPx * 1.6);
  const x = V.X[j] + tx * beam * 0.2, y = V.Y[j] + ty * beam * 0.2;
  const quad = (o1, o2, b1, b2) => { ctx.beginPath(); ctx.moveTo(x + nx * o1 + tx * b1, y + ny * o1 + ty * b1); ctx.lineTo(x + nx * o2 + tx * b1, y + ny * o2 + ty * b1); ctx.lineTo(x + nx * o2 + tx * b2, y + ny * o2 + ty * b2); ctx.lineTo(x + nx * o1 + tx * b2, y + ny * o1 + ty * b2); ctx.closePath(); };
  if (layer === 'shadow') {
    // 빛은 화면 위에서: 그림자는 화면 아래쪽으로 조금
    ctx.save(); ctx.translate(beam * 0.5, beam * 0.9);
    ctx.fillStyle = P.shadow; quad(-reach, reach, -beam / 2, beam / 2); ctx.fill();
    ctx.restore();
    return;
  }
  // 기둥 둘
  ctx.fillStyle = P.gantry;
  for (const side of [1, -1]) { quad(side * reach - beam * 0.7, side * reach + beam * 0.7, -beam * 0.7, beam * 0.7); ctx.fill(); }
  // 빔
  quad(-reach, reach, -beam / 2, beam / 2); ctx.fill();
  ctx.strokeStyle = P.gantryHi; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + nx * -reach - tx * beam / 2 + tx, y + ny * -reach - ty * beam / 2 + ty); ctx.lineTo(x + nx * reach - tx * beam / 2 + tx, y + ny * reach - ty * beam / 2 + ty); ctx.stroke();
  // 신호등 다섯: 켜진 만큼 빨강
  const pod = Math.max(2.2, beam * 0.32);
  for (let q = 0; q < 5; q += 1) {
    const o = (q - 2) * Math.min(hw * 0.38, pod * 3.4);
    ctx.fillStyle = q < lit ? P.red : P.pod;
    ctx.beginPath(); ctx.arc(x + nx * o, y + ny * o, pod, 0, TAU); ctx.fill();
  }
}

// 브레이크 보드 3 · 2 · 1: 길 바깥 런오프에 서 있는 판. 글자는 바로 세운다
export function drawBoards(ctx, V, P, W, font) {
  if (V.detail < 0.5) return;
  const hw = V.roadPx / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(11, 700);
  for (const b of W.boards) {
    const jl = spanJ(V, b.s, b.s + 0.001); if (!jl.length) continue;
    const j = Math.round(jl[0][0]); if (j < 0 || j >= V.m) continue;
    const pp = offAt(V, j, b.side * (hw + V.latPx * 5.5)); if (!pp) continue; const [x, y] = pp;
    const bw = 13, bh = 15;
    ctx.fillStyle = P.board; ctx.strokeStyle = P.boardEdge; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 2.5) : ctx.rect(x - bw / 2, y - bh / 2, bw, bh); ctx.fill(); ctx.stroke();
    ctx.fillStyle = P.boardText; ctx.fillText(String(b.num), x, y + 0.5);
  }
}

// 거리 s · 옆 off(보이는 미터)의 화면 좌표(타이어 자국 · 먼지처럼 길에 붙는 것)
export function screenAt(V, sM, offVm) {
  const jl = spanJ(V, sM, sM + 0.001); if (!jl.length) return null;
  const jf = jl[0][0]; const j = Math.floor(jf); if (j < 0 || j >= V.m - 1) return null;
  const u = jf - j; const pa = offAt(V, j, offVm * V.latPx), pb = offAt(V, j + 1, offVm * V.latPx); if (!pa || !pb) return null;
  return [pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u];
}
