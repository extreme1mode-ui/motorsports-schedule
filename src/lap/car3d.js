// '한 바퀴'의 차(입체): 다각형으로 만든 2026년식 F1 차 한 대. 캔버스 2D로 그린다(그림 파일 · 3D 라이브러리 없음).
// 좌표: 차 가운데 바닥이 원점, X 오른쪽 · Y 앞 · Z 위, 단위 m. 실제 차의 크기(길이 5.25m 안팎 · 폭 1.9m · 축간 거리 3.4m)를 따른다.
// 특정 팀의 도색을 따라 하지 않는다: 몸통 F1 빨강 + 가운데 흰 줄 + 탄소 검정 + 흰 헬멧. 노랑 없음.
//
// drawCar3d(ctx, cam, o)  cam: world3d의 카메라. o:
//   x, y   바닥에서 차 가운데(세계 m)   th  진행 방향(라디안, 세계)   S  크기 배율(실제보다 크게)
//   steer  앞바퀴 꺾임(라디안, 오른쪽 +)   aero 0~1 직선 모드(앞뒤 날개 플랩이 눕는다)
//   brake  0~1 브레이크가 달아오르는 빛   rain 0~1 뒤 빨간 등(손을 뗀 동안 켜 둔다. 깜빡이지 않는다)
//   spin   굴러간 거리(m): 타이어 옆면 표시가 돈다   roll · pitch  몸통 기울기(라디안, 작게)
//   C      색 { body, carbon, tyre, rim, white, rain }   flat  색 하나로만 칠한다(옅은 차용)
//   blur   0~1 빠를수록 타이어 옆면 표시가 흐려진다

const SUN = (() => { const v = [0.32, 0.5, -0.8]; const l = Math.hypot(...v); return v.map((a) => a / l); })();
const NEAR = 0.3;

// ---------- 모양: 한 번만 만든다 ----------
// 단면(8점): 바닥은 좁게, 옆은 둥글게, 위는 topK만큼 좁게
function ring(xc, y, hw, zb, zt, topK = 0.55, botK = 0.7) {
  const g = zt - zb;
  return [[xc - hw * botK, y, zb], [xc + hw * botK, y, zb], [xc + hw, y, zb + g * 0.3], [xc + hw * 0.94, y, zb + g * 0.72], [xc + hw * topK, y, zt], [xc - hw * topK, y, zt], [xc - hw * 0.94, y, zb + g * 0.72], [xc - hw, y, zb + g * 0.3]];
}
let MODEL = null;
function model() {
  if (MODEL) return MODEL;
  const V = []; const F = [];   // V: [x,y,z] · F: { v:[...], col, two, part, bias, hook }
  const add = (p) => { V.push(p); return V.length - 1; };
  const face = (pts, col, opt = {}) => { F.push({ v: pts.map(add), col, two: !!opt.two, part: opt.part || 'body', bias: opt.bias || 0, hook: opt.hook || null, cent: opt.cent || null }); };
  // 덩어리(단면을 이어 붙인 것). 바깥을 향하도록 나중에 면 방향을 맞춘다
  const loft = (rings, col, opt = {}) => {
    const c = [0, 0, 0]; let cnt = 0; for (const r of rings) for (const p of r) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; cnt += 1; }
    const cent = c.map((a) => a / cnt);
    const m = rings[0].length;
    for (let a = 0; a < rings.length - 1; a += 1) for (let k = 0; k < m; k += 1) {
      const k2 = (k + 1) % m; face([rings[a][k], rings[a][k2], rings[a + 1][k2], rings[a + 1][k]], (opt.colAt && opt.colAt(a, k)) || col, { ...opt, cent });
    }
    if (opt.capA !== false) face(rings[0].slice(), opt.capColA || col, { ...opt, cent });
    if (opt.capB !== false) face(rings[rings.length - 1].slice(), opt.capColB || col, { ...opt, cent });
  };
  const box = (x0, x1, y0, y1, z0, z1, col, opt = {}) => loft([[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]], col, opt);
  const mir = (pts) => pts.map(([x, y, z]) => [-x, y, z]);

  // 바닥판(탄소): 옆구리 아래로 넓게 보인다
  const fl = [[0.22, 1.32], [0.55, 1.1], [0.86, 0.62], [0.95, 0.15], [0.94, -0.6], [0.86, -1.18], [0.62, -1.46], [0.56, -1.66]];
  const floorTop = [...fl.map(([x, y]) => [x, y, 0.075]), ...fl.slice().reverse().map(([x, y]) => [-x, y, 0.075])];
  face(floorTop, 'carbon', { two: true });
  // 디퓨저: 뒤로 올라가는 바닥(뒤에서 보면 어두운 터널)
  face([[-0.54, -1.62, 0.075], [0.54, -1.62, 0.075], [0.56, -2.36, 0.3], [-0.56, -2.36, 0.3]], 'carbon', { two: true });
  for (const x of [-0.56, -0.2, 0.2, 0.56]) face([[x, -1.7, 0.075], [x, -2.36, 0.3], [x, -2.36, 0.12], [x, -1.9, 0.06]], 'carbon', { two: true });

  // 노즈 · 운전석(몸통): 앞이 낮고 좁다
  const nose = [
    ring(0, 2.72, 0.07, 0.25, 0.33, 0.5), ring(0, 2.4, 0.12, 0.22, 0.4), ring(0, 1.95, 0.17, 0.2, 0.5), ring(0, 1.45, 0.23, 0.16, 0.6),
    ring(0, 0.98, 0.31, 0.12, 0.67), ring(0, 0.6, 0.39, 0.1, 0.7), ring(0, 0.1, 0.42, 0.1, 0.68), ring(0, -0.24, 0.42, 0.1, 0.7),
  ];
  // 흰 줄: 노즈 위 가운데 두 면을 흰색으로(k = 4 → 위 가운데 면)
  loft(nose, 'body', { colAt: (a, k) => (k === 4 && a <= 3 ? 'white' : null) });
  // 운전석 구멍과 헬멧 · 헤일로
  face([[-0.27, 0.55, 0.705], [0.27, 0.55, 0.705], [0.3, 0.05, 0.69], [0.26, -0.22, 0.705], [-0.26, -0.22, 0.705], [-0.3, 0.05, 0.69]], 'cockpit', { two: true, bias: -0.02 });
  // 엔진 덮개: 머리 위 공기 흡입구에서 뒤로 낮아진다(위가 좁은 단면)
  const cover = [ring(0, -0.2, 0.33, 0.12, 0.99, 0.2), ring(0, -0.55, 0.35, 0.12, 0.93, 0.24), ring(0, -1.0, 0.3, 0.14, 0.73, 0.3), ring(0, -1.45, 0.2, 0.18, 0.55, 0.36), ring(0, -1.85, 0.12, 0.22, 0.42, 0.4), ring(0, -2.06, 0.08, 0.26, 0.36, 0.45)];
  loft(cover, 'body', { colAt: (a, k) => (k === 4 && a >= 1 ? 'white' : null), capColA: 'carbon' });
  // 상어 지느러미(얇은 판)
  face([[0, -0.5, 0.92], [0, -0.58, 1.04], [0, -1.6, 0.66], [0, -1.6, 0.55]], 'body', { two: true });
  // T 카메라(흰색) · 흡입구(검정)
  box(-0.07, 0.07, -0.42, -0.3, 0.98, 1.03, 'white');
  face([[-0.1, -0.19, 0.88], [0.1, -0.19, 0.88], [0.09, -0.19, 0.98], [-0.09, -0.19, 0.98]], 'cockpit', { two: true, bias: -0.02 });
  // 옆구리(양쪽): 앞 공기 구멍이 크고 뒤로 내려가며 좁아진다
  for (const sx of [1, -1]) {
    const pod = [[0.55, 0.62, 0.22, 0.13, 0.56], [0.2, 0.64, 0.26, 0.12, 0.6], [-0.3, 0.58, 0.25, 0.14, 0.57], [-0.8, 0.47, 0.2, 0.16, 0.48], [-1.3, 0.35, 0.14, 0.18, 0.4], [-1.66, 0.25, 0.08, 0.2, 0.32]]
      .map(([y, x, hw, zb, zt]) => ring(sx * x, y, hw, zb, zt, 0.6, 0.45));
    loft(pod, 'body', { capColA: 'cockpit', capB: false });
    // 거울(받침 + 뒤를 보는 유리)
    box(sx * 0.53, sx * 0.71, 0.58, 0.68, 0.64, 0.72, 'body');
    face([[sx * 0.54, 0.579, 0.65], [sx * 0.7, 0.579, 0.65], [sx * 0.7, 0.579, 0.71], [sx * 0.54, 0.579, 0.71]], 'glass', { two: true, bias: -0.02 });
  }
  // 기어박스 · 뒤 충돌 구조
  box(-0.13, 0.13, -2.38, -1.6, 0.22, 0.46, 'carbon');
  // 앞날개: 숟가락 모양 본판(가운데가 앞으로) · 플랩(직선 모드에서 눕는다: 'fflap' 표시) · 끝판
  const fw = [[0, 2.68], [0.3, 2.62], [0.62, 2.55], [0.95, 2.5], [0.95, 2.34], [0.6, 2.36], [0.3, 2.42], [0, 2.46]];
  face([...fw.map(([x, y]) => [x, y, 0.09]), ...fw.slice().reverse().map(([x, y]) => [-x, y, 0.09])], 'carbon', { two: true });
  face([[-0.94, 2.4, 0.13], [-0.12, 2.43, 0.15], [-0.12, 2.3, 0.26], [-0.94, 2.27, 0.24]], 'carbon', { two: true, part: 'fflap' });
  face([[0.94, 2.4, 0.13], [0.12, 2.43, 0.15], [0.12, 2.3, 0.26], [0.94, 2.27, 0.24]], 'carbon', { two: true, part: 'fflap' });
  for (const sx of [1, -1]) face([[sx * 0.96, 2.67, 0.05], [sx * 0.96, 2.25, 0.05], [sx * 0.96, 2.25, 0.3], [sx * 0.96, 2.6, 0.31]], 'body', { two: true });
  // 뒷날개: 본판 · 플랩(직선 모드에서 눕는다: 'rflap') · 끝판 · 빔 날개 · 받침
  face([[-0.5, -2.18, 0.8], [0.5, -2.18, 0.8], [0.5, -2.4, 0.79], [-0.5, -2.4, 0.79]], 'carbon', { two: true });
  face([[-0.5, -2.37, 0.84], [0.5, -2.37, 0.84], [0.5, -2.55, 0.98], [-0.5, -2.55, 0.98]], 'carbon', { two: true, part: 'rflap' });
  for (const sx of [1, -1]) face([[sx * 0.51, -2.04, 0.36], [sx * 0.51, -2.6, 0.36], [sx * 0.51, -2.6, 1.0], [sx * 0.51, -2.12, 1.0]], 'body', { two: true });
  face([[-0.42, -2.27, 0.41], [0.42, -2.27, 0.41], [0.42, -2.39, 0.45], [-0.42, -2.39, 0.45]], 'carbon', { two: true });
  face([[0, -2.0, 0.44], [0, -2.34, 0.44], [0, -2.34, 0.8], [0, -2.22, 0.8]], 'carbon', { two: true });
  // 뒤 빨간 등(뒤를 본다)
  face([[-0.07, -2.385, 0.3], [0.07, -2.385, 0.3], [0.07, -2.385, 0.36], [-0.07, -2.385, 0.36]], 'rain', { two: true, bias: -0.03, part: 'rain' });

  // 바퀴: 12각 기둥. 앞 · 뒤 지름 0.71m, 폭 0.30 · 0.38m
  const W12 = 12;
  const wheel = (xc, yc, r, wdt, part) => {
    const zc = r; const rings = [];
    for (const side of [-1, 1]) {
      const rr = [];
      for (let k = 0; k < W12; k += 1) { const a = (k / W12) * Math.PI * 2; rr.push([xc + side * wdt / 2, yc + Math.cos(a) * r, zc + Math.sin(a) * r]); }
      rings.push(rr);
    }
    const cent = [xc, yc, zc]; const out = Math.sign(xc);
    for (let k = 0; k < W12; k += 1) { const k2 = (k + 1) % W12; face([rings[0][k], rings[0][k2], rings[1][k2], rings[1][k]], 'tyre', { part, cent }); }
    // 바깥 면(휠 커버 · 옆면 표시)과 안쪽 면
    face(out > 0 ? rings[1].slice() : rings[0].slice(), 'tyre', { part, cent, hook: { wheel: [xc + out * (wdt / 2 + 0.004), yc, zc, r, out] } });
    face(out > 0 ? rings[0].slice() : rings[1].slice(), 'tyre', { part, cent });
  };
  wheel(0.8, 1.7, 0.355, 0.3, 'wR');   // 앞 오른쪽
  wheel(-0.8, 1.7, 0.355, 0.3, 'wL');
  wheel(0.76, -1.7, 0.36, 0.38, 'rear');
  wheel(-0.76, -1.7, 0.36, 0.38, 'rear');
  // 서스펜션 팔 · 헤일로 · 헬멧
  const L = []; const line = (a, b, wM, col) => L.push({ a, b, wM, col });
  for (const sx of [1, -1]) {
    line([sx * 0.18, 1.78, 0.52], [sx * 0.66, 1.7, 0.5], 0.035, 'carbon'); line([sx * 0.16, 1.62, 0.5], [sx * 0.66, 1.7, 0.5], 0.035, 'carbon');
    line([sx * 0.14, 1.86, 0.22], [sx * 0.66, 1.72, 0.22], 0.035, 'carbon'); line([sx * 0.14, 1.5, 0.2], [sx * 0.66, 1.72, 0.22], 0.035, 'carbon');
    line([sx * 0.15, -1.62, 0.44], [sx * 0.6, -1.7, 0.5], 0.035, 'carbon'); line([sx * 0.15, -1.95, 0.44], [sx * 0.6, -1.7, 0.5], 0.035, 'carbon');
    line([sx * 0.12, -1.6, 0.24], [sx * 0.6, -1.72, 0.22], 0.035, 'carbon'); line([sx * 0.12, -2.0, 0.24], [sx * 0.6, -1.72, 0.22], 0.035, 'carbon');
    // 헤일로: 앞 기둥에서 둘로 갈라져 뒤로
    line([0, 0.66, 0.93], [sx * 0.24, 0.42, 0.96], 0.06, 'carbon');
    line([sx * 0.24, 0.42, 0.96], [sx * 0.31, 0.05, 0.96], 0.06, 'carbon');
    line([sx * 0.31, 0.05, 0.96], [sx * 0.33, -0.2, 0.72], 0.06, 'carbon');
  }
  line([0, 0.76, 0.68], [0, 0.66, 0.93], 0.06, 'carbon');
  const balls = [{ c: [0, 0.08, 0.86], r: 0.135, col: 'white' }];
  // 면 법선(로컬)과 바깥 방향 맞추기
  for (const f of F) {
    const p = f.v.map((i) => V[i]); let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < p.length; k += 1) { const a = p[k], b = p[(k + 1) % p.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (f.cent) {
      const c = [0, 0, 0]; for (const q of p) { c[0] += q[0]; c[1] += q[1]; c[2] += q[2]; }
      const dx = c[0] / p.length - f.cent[0], dy = c[1] / p.length - f.cent[1], dz = c[2] / p.length - f.cent[2];
      if (nx * dx + ny * dy + nz * dz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    }
    f.n = [nx, ny, nz];
  }
  const part = new Array(V.length).fill('body'); for (const f of F) for (const i of f.v) part[i] = f.part;
  MODEL = { V, F, L, balls, part };
  return MODEL;
}

// ---------- 색 ----------
const rgbCache = new Map();
function rgbOf(c) {
  if (rgbCache.has(c)) return rgbCache.get(c);
  let out = [128, 128, 128];
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (m) out = [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  else { const r = /rgba?\(([^)]+)\)/.exec(c); if (r) out = r[1].split(',').slice(0, 3).map((v) => parseFloat(v)); }
  rgbCache.set(c, out);
  return out;
}
const shade = (rgb, b) => `rgb(${Math.min(255, Math.round(rgb[0] * b))},${Math.min(255, Math.round(rgb[1] * b))},${Math.min(255, Math.round(rgb[2] * b))})`;

// ---------- 그리기 ----------
let PV = new Float32Array(0); let PW = new Float32Array(0);
export function drawCar3d(ctx, cam, o) {
  const M = model(); const n = M.V.length;
  if (PV.length < n * 3) { PV = new Float32Array(n * 3); PW = new Float32Array(n * 3); }
  const S = o.S || 1; const fX = Math.cos(o.th), fY = Math.sin(o.th), rX = -fY, rY = fX;
  const roll = o.roll || 0, pitch = o.pitch || 0; const cr = Math.cos(roll), sr = Math.sin(roll);
  const cs = Math.cos(o.steer || 0), ss = Math.sin(o.steer || 0); const aero = o.aero || 0;
  const zc0 = 0.3;
  // 꼭짓점: 로컬 → 세계 → 화면
  const part = M.part;
  for (let i = 0; i < n; i += 1) {
    let [X, Y, Z] = M.V[i]; const p = part[i];
    if (p === 'wR' || p === 'wL') { const wx = p === 'wR' ? 0.8 : -0.8, wy = 1.7; const dx = X - wx, dy = Y - wy; X = wx + dx * cs - dy * ss; Y = wy + dx * ss + dy * cs; }
    else if (p !== 'rear') {
      if (p === 'fflap') Z = Z - (Z - 0.13) * aero * 0.55;          // 직선 모드: 플랩이 눕는다
      if (p === 'rflap') Z = 0.84 + (Z - 0.84) * (1 - aero * 0.8);
      // 몸통 기울기(바퀴는 그대로)
      const z1 = Z - zc0; const X2 = X * cr - z1 * sr; Z = zc0 + X * sr + z1 * cr; X = X2; Z += Y * pitch;
    }
    const wx = o.x + (rX * X + fX * Y) * S, wy = o.y + (rY * X + fY * Y) * S, wz = Z * S;
    PW[i * 3] = wx; PW[i * 3 + 1] = wy; PW[i * 3 + 2] = wz;
    const pr = cam.project(wx, wy, wz);
    if (pr) { PV[i * 3] = pr[0]; PV[i * 3 + 1] = pr[1]; PV[i * 3 + 2] = pr[2]; } else PV[i * 3 + 2] = -1;
  }
  const C = o.C; const flat = o.flat ? rgbOf(o.flat) : null;
  const col = (k) => rgbOf(C[k] || C.carbon);
  const items = [];
  for (const f of M.F) {
    let z = 0; let bad = false; let cx = 0, cy = 0, cz = 0;
    for (const i of f.v) { const d = PV[i * 3 + 2]; if (d < NEAR) { bad = true; break; } z += d; cx += PW[i * 3]; cy += PW[i * 3 + 1]; cz += PW[i * 3 + 2]; }
    if (bad) continue;
    const k = f.v.length; z /= k; cx /= k; cy /= k; cz /= k;
    const [lx, ly, lz] = f.n; let nx = rX * lx + fX * ly, ny = rY * lx + fY * ly, nz = lz;
    const vis = (cam.x - cx) * nx + (cam.y - cy) * ny + (cam.z - cz) * nz;
    if (vis < 0) { if (!f.two) continue; nx = -nx; ny = -ny; nz = -nz; }
    const lit = Math.max(0, -(nx * SUN[0] + ny * SUN[1] + nz * SUN[2]));
    items.push({ z: z + f.bias, f, b: 0.6 + 0.5 * lit });
  }
  for (const l of M.L) {
    const ia = projLocal(l.a, o, S, fX, fY, rX, rY, cam), ib = projLocal(l.b, o, S, fX, fY, rX, rY, cam); if (!ia || !ib) continue;
    items.push({ z: (ia[2] + ib[2]) / 2 - 0.01, l, a: ia, bb: ib });
  }
  for (const bl of M.balls) { const p = projLocal(bl.c, o, S, fX, fY, rX, rY, cam); if (p) items.push({ z: p[2] - 0.02, ball: bl, p }); }
  items.sort((a, b) => b.z - a.z);
  ctx.lineJoin = 'round';
  for (const it of items) {
    if (it.f) {
      const f = it.f; const rgb = flat || (f.part === 'rain' ? mixRgb(col('rain'), rgbOf(C.body), o.rain || 0) : col(f.col));
      const fill = flat ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : shade(rgb, f.part === 'rain' ? 1 + (o.rain || 0) * 0.3 : it.b);
      ctx.beginPath();
      for (let q = 0; q < f.v.length; q += 1) { const i = f.v[q]; if (q) ctx.lineTo(PV[i * 3], PV[i * 3 + 1]); else ctx.moveTo(PV[i * 3], PV[i * 3 + 1]); }
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = fill; ctx.lineWidth = 0.6; ctx.stroke();    // 이웃 면 사이 실금을 메운다
      if (f.hook && !flat) wheelFace(ctx, cam, o, S, fX, fY, rX, rY, f.hook.wheel, C);
    } else if (it.l) {
      const wpx = Math.max(0.8, (it.l.wM * S * cam.F) / it.a[2]);
      ctx.strokeStyle = flat ? `rgb(${flat.join(',')})` : shade(col(it.l.col), 0.9); ctx.lineWidth = wpx; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(it.a[0], it.a[1]); ctx.lineTo(it.bb[0], it.bb[1]); ctx.stroke();
    } else if (it.ball) {
      const r = Math.max(1, (it.ball.r * S * cam.F) / it.p[2]);
      ctx.fillStyle = flat ? `rgb(${flat.join(',')})` : shade(col(it.ball.col), 1); ctx.beginPath(); ctx.arc(it.p[0], it.p[1], r, 0, Math.PI * 2); ctx.fill();
      if (!flat) { ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.arc(it.p[0] + r * 0.25, it.p[1] + r * 0.3, r * 0.75, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // 뒤 빨간 등: 손을 뗀 동안 은은하게(깜빡이지 않는다)
  if (!flat && (o.rain || 0) > 0.02) {
    const p = projLocal([0, -2.4, 0.33], o, S, fX, fY, rX, rY, cam);
    if (p) { const r = Math.max(3, (0.45 * S * cam.F) / p[2]); const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r); const [R, G, B] = rgbOf(C.body);
      g.addColorStop(0, `rgba(${R},${G},${B},${(0.55 * o.rain).toFixed(3)})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); }
  }
}
const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function projLocal([X0, Y, Z0], o, S, fX, fY, rX, rY, cam) {
  const roll = o.roll || 0; const z1 = Z0 - 0.3; const X = X0 * Math.cos(roll) - z1 * Math.sin(roll); const Z = 0.3 + X0 * Math.sin(roll) + z1 * Math.cos(roll) + Y * (o.pitch || 0);
  return cam.project(o.x + (rX * X + fX * Y) * S, o.y + (rY * X + fY * Y) * S, Z * S);
}

// 바퀴 바깥 면: 휠 커버(어두운 원판) + 빨간 띠(소프트 타이어) + 굴러가는 흰 표시 두 개 + 브레이크 빛
function wheelFace(ctx, cam, o, S, fX, fY, rX, rY, [xc, yc, zc, r], C) {
  const steer = Math.abs(yc - 1.7) < 0.01 ? (o.steer || 0) : 0;
  const cs = Math.cos(steer), ss = Math.sin(steer);
  const wx = Math.sign(xc) * 0.8;
  const at = (a, rr) => { let X = xc, Y = yc + Math.cos(a) * rr; if (steer) { const ddx = X - wx, ddy = Y - 1.7; X = wx + ddx * cs - ddy * ss; Y = 1.7 + ddx * ss + ddy * cs; } return projW([X, Y, zc + Math.sin(a) * rr]); };
  const projW = ([X, Y, Z]) => cam.project(o.x + (rX * X + fX * Y) * S, o.y + (rY * X + fY * Y) * S, Z * S);
  const poly = (rr) => { const pts = []; for (let k = 0; k < 16; k += 1) { const p = at((k / 16) * Math.PI * 2, rr); if (!p) return null; pts.push(p); } return pts; };
  const path = (pts) => { ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
  const band = poly(r * 0.86); const cover = poly(r * 0.66);
  if (!band || !cover) return;
  const pxR = Math.hypot(band[0][0] - band[8][0], band[0][1] - band[8][1]) / 2; if (pxR < 2.5) return;
  ctx.strokeStyle = C.body; ctx.lineWidth = Math.max(0.8, pxR * 0.07); path(band); ctx.stroke();
  ctx.fillStyle = C.rim || '#2B2F36'; path(cover); ctx.fill();
  // 굴러가는 흰 표시(타이어 옆면 글자 자리). 빠르면 흐려진다
  const blur = o.blur || 0;
  if (blur < 0.95) {
    const ang = -(o.spin || 0) / (r * S);
    ctx.strokeStyle = `rgba(255,255,255,${(0.8 * (1 - blur)).toFixed(3)})`; ctx.lineWidth = Math.max(0.8, pxR * 0.06);
    for (const off of [0, Math.PI]) { ctx.beginPath(); for (let k = 0; k <= 6; k += 1) { const p = at(ang + off + (k / 6) * 0.9, r * 0.78); if (!p) break; if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
  }
  if ((o.brake || 0) > 0.03) {
    const c = at(0, 0); if (!c) return; const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], pxR * 0.9);
    g.addColorStop(0, `rgba(255,120,60,${(0.75 * o.brake).toFixed(3)})`); g.addColorStop(1, 'rgba(255,70,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], pxR * 0.9, 0, Math.PI * 2); ctx.fill();
  }
}

// 바닥 그림자: 차 밑 둥근 사각형 + 네 바퀴 접지(진하게)
export function drawCarShadow(ctx, cam, o, rgba) {
  const S = o.S || 1; const fX = Math.cos(o.th), fY = Math.sin(o.th), rX = -fY, rY = fX;
  const ring2 = (hx, hy, cy0) => { const pts = []; for (let k = 0; k < 14; k += 1) { const a = (k / 14) * Math.PI * 2; const X = Math.cos(a) * hx + 0.18, Y = cy0 + Math.sin(a) * hy - 0.22; const p = cam.project(o.x + (rX * X + fX * Y) * S, o.y + (rY * X + fY * Y) * S, 0); if (!p) return null; pts.push(p); } return pts; };
  const fillPts = (pts) => { if (!pts) return; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); };
  ctx.fillStyle = rgba(0.16); fillPts(ring2(1.15, 2.85, 0));
  ctx.fillStyle = rgba(0.2); fillPts(ring2(0.95, 2.5, 0));
  ctx.fillStyle = rgba(0.32);
  for (const [X, Y, hw] of [[0.8, 1.7, 0.18], [-0.8, 1.7, 0.18], [0.76, -1.7, 0.22], [-0.76, -1.7, 0.22]]) {
    const pts = []; for (let k = 0; k < 10; k += 1) { const a = (k / 10) * Math.PI * 2; const x = X + Math.cos(a) * hw + 0.1, y = Y + Math.sin(a) * 0.34 - 0.12; const p = cam.project(o.x + (rX * x + fX * y) * S, o.y + (rY * x + fY * y) * S, 0); if (!p) { pts.length = 0; break; } pts.push(p); }
    if (pts.length) fillPts(pts);
  }
}
