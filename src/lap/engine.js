// '한 바퀴' 엔진 — DOM 없이 도는 순수 계산. 트랙 준비(매끄럽게 · 같은 간격으로 다시 찍기 · 굽은 정도 · 코너 한계 속도) + 한 스텝 물리.
// 조작은 하나다: 누르고 있으면 가속, 떼면 다음 코너에 맞게 속도를 줄인다. 차는 트랙 중심선을 따라가고, 코너를 한계보다 빠르게 들어가면 바깥으로 밀린다.
// 실제 차의 움직임을 흉내 낸 것은 아니다(랩 타임도 실제 기록과 다르다). 서킷의 생김새와 코너 순서를 몸으로 익히는 장난감이다.

export const DS = 2;                 // 다시 찍는 간격(m)
const G = 9.81;
export const V_TOP = 94;             // 최고 속도(m/s) ≈ 338km/h
const POWER = 937;                   // 가속 = min(TRACTION, POWER / v) − DRAG·v²
const TRACTION = 12;
const DRAG = POWER / (V_TOP * V_TOP * V_TOP);
const LIFT = 8;                      // 누른 채 코너 한계에 닿으면 이만큼만 줄인다(엔진 브레이크)
export const HALF_W = 7.5;           // 트랙 반폭(m). 그림에 쓰는 값이다(이탈은 미끄러짐으로 정한다)
const V_GRASS = 8;                   // 이탈하면 이 속도까지 떨어진다(≈30km/h)
const SMOOTH_R = 5;                  // 둥글리기: ±5칸(±10m) 이동 평균을 세 번
const SMOOTH_PASS = 3;

// 난이도: 사람이 느끼는 어려움을 바꾸는 숫자만 모았다. prepareTrack(raw, diff)에 넘긴다.
//   easy     안내 구간은 브레이크를 이 비율만 쓴다고 보고 일찍 시작한다. 작을수록 진한 구간이 길고 일찍 온다
//   brake    손을 뗐을 때 감속(m/s²)
//   offHold  이탈하면 적어도 이만큼(초)은 트랙 밖에 있다
//   heatRate 코너 한계를 넘은 비율 × 이 값만큼 1초에 미끄러짐이 쌓인다. 1에 닿으면 이탈
//   heatCool 한계 안에서는 1초에 이만큼 미끄러짐이 빠진다
//   grip     옆으로 버티는 힘(latGrip)에 곱하는 값. 클수록 코너를 빨리 돈다
export const DIFF_KEYS = ['easy', 'brake', 'offHold', 'heatRate', 'heatCool', 'grip'];
export const DIFFICULTY = {
  easy:   { easy: 0.58, brake: 40, offHold: 2.4, heatRate: 5.5, heatCool: 1.6, grip: 1 },
  normal: { easy: 0.74, brake: 40, offHold: 2.6, heatRate: 6,   heatCool: 1.6, grip: 1 },
  hard:   { easy: 0.84, brake: 40, offHold: 3.2, heatRate: 9,   heatCool: 1.2, grip: 0.96 },
};
export const diffOf = (d) => ({ ...DIFFICULTY.normal, ...(typeof d === 'string' ? DIFFICULTY[d] : d) });
export const diffKey = (d) => DIFF_KEYS.map((k) => `${k}:${d[k]}`).join('|');

// 속도가 붙을수록 옆으로 버티는 힘이 커진다(다운포스 흉내)
const latGripBase = (v) => G * Math.min(5.6, 2.1 + 3.5 * (v / 72) * (v / 72));
const accelOf = (v) => Math.min(TRACTION, POWER / Math.max(v, 1)) - DRAG * v * v;

// 꺾은선을 DS 간격으로 다시 찍고(직선 보간), 닫힌 이동 평균으로 꼭짓점을 둥글린다. 스플라인처럼 바깥으로 부풀지 않는다
function resample(pts) {
  const m = pts.length; const cum = [0];
  for (let i = 0; i < m; i += 1) { const a = pts[i], b = pts[(i + 1) % m]; cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = cum[m]; const n = Math.round(L / DS); const ds = L / n;
  let x = new Float32Array(n), y = new Float32Array(n);
  let k = 0;
  for (let i = 0; i < n; i += 1) {
    const d = i * ds;
    while (cum[k + 1] < d) k += 1;
    const a = pts[k % m], b = pts[(k + 1) % m]; const f = (d - cum[k]) / Math.max(1e-6, cum[k + 1] - cum[k]);
    x[i] = a[0] + (b[0] - a[0]) * f; y[i] = a[1] + (b[1] - a[1]) * f;
  }
  const R = SMOOTH_R;
  for (let pass = 0; pass < SMOOTH_PASS; pass += 1) {
    const nx = new Float32Array(n), ny = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      let sx = 0, sy = 0;
      for (let j = -R; j <= R; j += 1) { const q = (i + j + n) % n; sx += x[q]; sy += y[q]; }
      nx[i] = sx / (2 * R + 1); ny[i] = sy / (2 * R + 1);
    }
    x = nx; y = ny;
  }
  return { x, y, n, ds, L };
}

export function prepareTrack(raw, difficulty = 'normal') {
  const D = diffOf(difficulty); const latGrip = (v) => latGripBase(v) * D.grip;
  const src = raw.pts.slice();
  const f = src[0], l = src[src.length - 1];
  if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 0.5) src.pop();   // 닫는 점이 한 번 더 들어 있으면 뺀다
  const { x, y, n, ds, L } = resample(src);
  // 방향(화면 좌표: y가 아래로)과 굽은 정도 κ = dθ/ds. ±3칸으로 방향을 재고, ±6칸 이동 평균으로 고른다
  const th = new Float32Array(n), kRaw = new Float32Array(n), k = new Float32Array(n);
  const W = 3;
  for (let i = 0; i < n; i += 1) { const a = (i - W + n) % n, b = (i + W) % n; th[i] = Math.atan2(y[b] - y[a], x[b] - x[a]); }
  for (let i = 0; i < n; i += 1) {
    let d = th[(i + 1) % n] - th[(i - 1 + n) % n];
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    kRaw[i] = d / (2 * ds);
  }
  const S = 9;
  for (let i = 0; i < n; i += 1) { let sum = 0; for (let j = -S; j <= S; j += 1) sum += kRaw[(i + j + n) % n]; k[i] = sum / (2 * S + 1); }
  // 코너 한계 속도: v² · |κ| = latGrip(v)
  const vlim = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const c = Math.abs(k[i]); let v = V_TOP;
    if (c > 1e-5) { for (let it = 0; it < 8; it += 1) v = Math.min(V_TOP, Math.sqrt(latGrip(v) / c)); }
    vlim[i] = v;
  }
  // 누르고 있어도 넘지 않는 속도: 앞으로 16m 안의 가장 낮은 한계(코너 안에서는 차가 알아서 한계 속도로 돈다)
  const vcap = new Float32Array(n);
  const AHEAD = Math.round(16 / ds);
  for (let i = 0; i < n; i += 1) { let m = vlim[i]; for (let j = 1; j <= AHEAD; j += 1) m = Math.min(m, vlim[(i + j) % n]); vcap[i] = m * 0.985; }
  // 속도 그림 두 개: ideal(브레이크를 끝까지 쓸 때) · easy(안내용, 여유 있게). 뒤에서 앞으로 브레이크 한계, 앞에서 뒤로 가속 한계
  const profile = (decel) => {
    const p = Float32Array.from(vcap);
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = n - 1; i >= 0; i -= 1) { const nx = p[(i + 1) % n]; p[i] = Math.min(p[i], Math.sqrt(nx * nx + 2 * decel * ds)); }
      for (let i = 0; i < n; i += 1) { const pv = p[(i - 1 + n) % n]; p[i] = Math.min(p[i], Math.sqrt(pv * pv + 2 * Math.max(0.2, accelOf(pv)) * ds)); }
    }
    return p;
  };
  const ideal = profile(D.brake * 0.95);
  const easy = profile(D.brake * D.easy);
  // 손을 떼야 하는 구간(안내): 엔진 브레이크만으로는 모자란 곳
  const brake = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) { const a = easy[i], b = easy[(i + 1) % n]; brake[i] = (a * a - b * b) / (2 * ds) > LIFT * 1.15 ? 1 : 0; }
  // 짧게 끊긴 틈(20m 이하)은 잇고, 너무 짧은 구간(12m 이하)은 지운다
  const run = (val, maxLen) => {
    let i = 0;
    while (i < n) {
      if (brake[i] !== val) { i += 1; continue; }
      let j = i; while (j < n && brake[j] === val) j += 1;
      if (i > 0 && j < n && (j - i) * ds <= maxLen) for (let q = i; q < j; q += 1) brake[q] = val ? 0 : 1;
      i = j;
    }
  };
  run(0, 20); run(1, 12);
  const turns = Object.entries(raw.turns || {}).map(([num, s]) => ({ n: Number(num), s: Number(s), i: Math.round(Number(s) / ds) % n })).sort((a, b) => a.s - b.s);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i += 1) { x0 = Math.min(x0, x[i]); x1 = Math.max(x1, x[i]); y0 = Math.min(y0, y[i]); y1 = Math.max(y1, y[i]); }
  return { id: raw.id, raceId: raw.raceId, n, ds, L, x, y, th, k, vlim, vcap, ideal, easy, brake, turns, box: [x0, y0, x1, y1], D, latGrip };
}

export function newRun() {
  return { s: 0, v: 0, off: 0, t: 0, done: false, offTrack: false, offT: 0, offCount: 0, offAt: [], vmax: 0, heat: 0, side: 1 };
}

// 한 스텝. throttle: 누르고 있는가.
//  - 코너 안에서는 누르고 있어도 한계 속도로만 돈다. 문제는 너무 빠르게 들어왔을 때다.
//  - 코너에서 필요한 옆 힘이 한계를 넘으면(r > 1) 미끄러짐(heat)이 쌓인다. 조금 넘으면 천천히, 많이 넘으면 바로.
//  - heat가 1에 닿으면 코스 이탈: 30km/h까지 떨어지고 offHold초 동안은 가속이 안 된다. 제때 브레이크를 밟는 것보다 항상 손해다.
export function step(run, tr, throttle, dt) {
  if (run.done) return run;
  const { D, latGrip } = tr;
  const i = Math.floor(run.s / tr.ds) % tr.n;
  const kap = tr.k[i]; let v = run.v;
  // 누르면 가속. 다만 코너 한계(vcap)에 닿으면 더 빨라지지 않고, 넘어 있으면 엔진 브레이크만큼만 줄인다 → 큰 감속은 손을 떼야 한다
  let a;
  if (!throttle) a = v > tr.easy[i] ? -(D.brake + DRAG * v * v) : -DRAG * v * v;   // 떼면 다음 코너에 맞는 속도까지만 줄이고, 그 아래로는 굴러간다
  else if (v > tr.vcap[i]) a = -(LIFT + DRAG * v * v);
  else a = Math.min(accelOf(v), (tr.vcap[i] - v) / dt);
  const r = (v * v * Math.abs(kap)) / latGrip(v);
  if (run.offTrack) {
    run.offT += dt;
    a = v > V_GRASS ? -32 : 0;
    if (run.offT >= D.offHold && v <= V_GRASS + 0.5) { run.offTrack = false; run.heat = 0; }
  } else if (r > 1) {
    run.side = kap > 0 ? 1 : -1;                 // 화면 좌표(y가 아래)에서 κ > 0은 오른쪽으로 굽는 것 → 바깥은 왼쪽(+)
    run.heat += (r - 1) * D.heatRate * dt;
    a -= 5 + Math.min(14, (r - 1) * 12);         // 미끄러지며 속도를 잃는다
    if (run.heat >= 1) { run.offTrack = true; run.offT = 0; run.offCount += 1; run.offAt.push(run.s); }
  } else {
    run.heat = Math.max(0, run.heat - D.heatCool * dt);
  }
  // 화면에 보이는 밀림: 트랙 안에서는 heat만큼(가장자리까지), 이탈하면 트랙 밖으로
  const target = run.offTrack ? run.side * (HALF_W + 5.5) : run.side * run.heat * (HALF_W - 1.5);
  run.off += (target - run.off) * Math.min(1, dt * (run.offTrack ? 5 : 9));
  v = Math.max(0, v + a * dt);
  run.v = v; run.vmax = Math.max(run.vmax, v);
  run.s += v * dt; run.t += dt;
  if (run.s >= tr.L) { run.t -= (run.s - tr.L) / Math.max(v, 1); run.s = tr.L; run.done = true; }   // 결승선을 넘은 순간으로 되돌려 잰다
  return run;
}

// 위치(중심선 + 밀린 만큼)와 방향
export function poseAt(tr, s, off = 0) {
  const f = (s / tr.ds) % tr.n; const i = Math.floor(f) % tr.n; const j = (i + 1) % tr.n; const u = f - Math.floor(f);
  const th = tr.th[i];
  const x = tr.x[i] + (tr.x[j] - tr.x[i]) * u; const y = tr.y[i] + (tr.y[j] - tr.y[i]) * u;
  // 왼쪽 법선(화면 좌표, y가 아래): (sin θ, −cos θ)
  return { x: x + Math.sin(th) * off, y: y - Math.cos(th) * off, th };
}

// 시험용 자동 운전. mode: 'ideal'(이상 속도보다 빠르면 뗀다) · 'guide'(안내 구간에서 뗀다, late만큼 늦게) · 'hold'(누르기만)
export function botLap(tr, mode = 'ideal', late = 0, dt = 1 / 120) {
  const run = newRun(); let guard = 0; let zoneAt = -1;
  while (!run.done && guard < 120 * 900) {
    const i = Math.floor(run.s / tr.ds) % tr.n;
    let throttle = true;
    if (mode === 'ideal') throttle = run.v <= tr.ideal[i];
    else if (mode === 'guide') {
      if (tr.brake[i]) { if (zoneAt < 0) zoneAt = run.s; throttle = run.s - zoneAt < late ? true : run.v <= (late > 0 ? tr.ideal[i] : tr.easy[i]); }
      else zoneAt = -1;
    }
    step(run, tr, throttle, dt); guard += 1;
  }
  return run;
}

export function formatLap(ms) {
  if (!Number.isFinite(ms)) return '';
  const total = Math.round(ms); const m = Math.floor(total / 60000); const s = Math.floor((total % 60000) / 1000); const r = total % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
}
