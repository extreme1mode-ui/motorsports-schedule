// '한 바퀴' 소리 재료: 녹음 없이 코드로 만든 소리(브라우저 · 노드 공용, 씨앗이 같으면 늘 같은 소리).
// 엔진은 물리 모델: 실린더마다 배기 압력 펄스(블로다운) → 뱅크별 배기관 공명 → 터보(고음을 누름) → 꼬리관 공명 → 방사(고음 강조),
// 여기에 흡기(에어박스 공명) · 기계음을 더한다. 회전수 6곳 × 부하 둘(가속 · 감속)을 한 바퀴가 이어지는 고리로 만들어 두고,
// 재생할 때 가까운 두 고리를 섞고 속도만 바꾼다(실제 레이싱 게임의 회전수별 녹음 섞기와 같은 방식).
// 관중 · 자갈 · 충돌 · 지나가는 바람 같은 한 번 소리도 여기서 만든다. 실제 녹음으로 바꿔 끼울 수 있게 이름(키)을 고정한다.

export const SR = 44100;
export const ENGINE_RPMS = [4000, 6000, 8000, 10000, 12000, 14000];
const TAU = Math.PI * 2;

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (R) => { let u = 0; for (let i = 0; i < 6; i += 1) u += R(); return u - 3; };   // 대략 정규분포(표준편차 0.7)

// RBJ 쿡북 2차 필터
export function bq(type, f, Q, sr = SR, db = 0) {
  const w = (TAU * Math.min(f, sr * 0.45)) / sr; const c = Math.cos(w), s = Math.sin(w); const al = s / (2 * Q); const A = 10 ** (db / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'pk') { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else throw new Error(type);
  const f2 = { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  f2.step = (x) => { const y = f2.b0 * x + f2.b1 * f2.x1 + f2.b2 * f2.x2 - f2.a1 * f2.y1 - f2.a2 * f2.y2; f2.x2 = f2.x1; f2.x1 = x; f2.y2 = f2.y1; f2.y1 = y; return y; };
  return f2;
}
// 관 공명(빗살 필터): 끝에서 되돌아오는 파(열린 끝은 뒤집혀 돌아온다) + 관 벽의 감쇠(1차 저역)
function comb(delay, g, damp) {
  const n = Math.ceil(delay) + 2; const buf = new Float64Array(n); let w = 0; let lp = 0;
  return (x) => {
    let r = w - delay; while (r < 0) r += n; const i = Math.floor(r); const fr = r - i; const d = buf[i % n] * (1 - fr) + buf[(i + 1) % n] * fr;
    lp += (d - lp) * (1 - damp); const y = x + g * lp; buf[w] = y; w = (w + 1) % n; return y;
  };
}
// 고리 소리: 처음과 끝이 이어지도록 필터 사슬을 두 번 돌린다(첫 바퀴로 상태를 데우고 두 번째 바퀴를 쓴다)
function loopThrough(x, chain) {
  const out = new Float32Array(x.length);
  for (let pass = 0; pass < 2; pass += 1) for (let i = 0; i < x.length; i += 1) { let v = x[i]; for (const f of chain) v = typeof f === 'function' ? f(v) : f.step(v); if (pass) out[i] = v; }
  return out;
}
const peak = (a) => { let m = 0; for (let i = 0; i < a.length; i += 1) m = Math.max(m, Math.abs(a[i])); return m; };
export const rms = (a) => { let s = 0; for (let i = 0; i < a.length; i += 1) s += a[i] * a[i]; return Math.sqrt(s / a.length); };
function normalize(a, to = 0.9) { const p = peak(a) || 1; for (let i = 0; i < a.length; i += 1) a[i] *= to / p; return a; }

// ---------- 엔진 ----------
// 2026년 F1 파워 유닛: 1.6L V6(90°) 터보, 720° 동안 120°마다 한 번 = 6번 점화. 점화 주파수 = rpm / 60 × 3
const CYL_AMP = [1.0, 0.92, 1.07, 0.96, 1.04, 0.9];       // 실린더마다 조금씩 다른 세기(이것이 거친 맛 · 반차수 성분을 만든다)
const CYL_DT = [0, 0.014, -0.009, 0.011, -0.013, 0.006];  // 점화 시점의 작은 차이(점화 간격의 비율)
export function genEngineLoop(rpm, load, sr = SR, seed = 7) {
  const R = rng(seed * 977 + Math.round(rpm) + (load ? 1 : 0) * 31);
  const T = 120 / rpm; const cycles = Math.max(13, Math.round(0.42 / T) + (Math.round(rpm / 1000) % 5));   // 고리마다 길이를 조금씩 달리해 섞었을 때 같은 무늬가 되풀이되지 않게
  const len = Math.round(cycles * T * sr); const ev = len / (cycles * 6); const realRpm = (120 * cycles * sr) / len;
  const on = load > 0.5;
  const banks = [new Float64Array(len), new Float64Array(len)]; const intake = new Float64Array(len); const env = new Float64Array(len);
  const tr = (on ? 0.00032 : 0.00045) * sr;            // 블로다운 펄스가 솟는 시간
  const tn = (on ? 0.0011 : 0.0016) * sr;               // 펄스 속 난류 소음이 사라지는 시간
  const kl = Math.min(Math.floor(ev * 1.6), Math.floor(0.007 * sr));
  const noiseMix = on ? 0.28 : 0.55;
  for (let k = 0; k < cycles * 6; k += 1) {
    const c = k % 6; let amp = CYL_AMP[c] * (1 + gauss(R) * (on ? 0.05 : 0.28));
    if (!on) { amp *= 0.24; if (R() < 0.1) amp *= 0.2; }   // 감속: 연료를 끊어 약하고 들쭉날쭉(가끔 거의 빠짐)
    const t0 = (k + CYL_DT[c] + gauss(R) * (on ? 0.006 : 0.02)) * ev;
    const b = banks[c % 2];
    for (let j = 0; j < kl; j += 1) {
      const n = Math.floor(t0) + j; const tau = n - t0; if (tau < 0) continue; const idx = n % len;
      const alpha = (tau / tr) * Math.exp(1 - tau / tr);
      const turb = (R() * 2 - 1) * Math.exp(-tau / tn);
      const under = tau > 3 * tr ? -0.32 * ((tau - 3 * tr) / (2 * tr)) * Math.exp(1 - (tau - 3 * tr) / (2 * tr)) : 0;   // 배기 맥동 뒤의 음압(소기)
      const p = amp * ((1 - noiseMix) * alpha + noiseMix * turb + under);
      b[idx] += p; env[idx] += Math.abs(p);
      // 흡기: 같은 박자로 더 넓고 약한 음압(뒤집힌) 펄스
      const tri = 2.6 * tr; intake[(n + Math.floor(ev * 0.5)) % len] -= amp * 0.5 * (tau / tri) * Math.exp(1 - tau / tri);
    }
  }
  // 뱅크마다 헤더(약 0.6m) 공명 → 합쳐서 터보(고음을 누르고 중음을 살짝 올림) → 꼬리관(0.45m) 공명 → 방사(고음 강조)
  const D = (L) => (2 * L / 343) * sr;
  const L0 = loopThrough(Float32Array.from(banks[0]), [comb(D(0.58), -0.52, 0.45), bq('lp', 7000, 0.7, sr)]);
  const L1 = loopThrough(Float32Array.from(banks[1]), [comb(D(0.64), -0.52, 0.45), bq('lp', 7000, 0.7, sr)]);
  const merged = new Float32Array(len); for (let i = 0; i < len; i += 1) merged[i] = L0[i] + L1[i];
  const turbo = loopThrough(merged, [bq('lp', on ? 3300 : 2400, 0.75, sr), bq('pk', 950, 1.1, sr, 3), bq('pk', 2400, 1.4, sr, on ? 4 : 1), comb(D(0.45), -0.36, 0.5)]);
  let prev = turbo[len - 1]; const exhaust = new Float32Array(len);
  for (let i = 0; i < len; i += 1) { const x = turbo[i]; exhaust[i] = 0.55 * x + 0.9 * (x - prev); prev = x; }   // 방사: 미분(고음) 섞기
  const air = loopThrough(Float32Array.from(intake), [bq('bp', 190, 2.6, sr), bq('pk', 640, 3, sr, 6), bq('pk', 1650, 4, sr, 5)]);
  // 기계음(밸브 · 기어): 점화 세기를 따라 뛰는 4~7kHz 잡음
  const mech = new Float32Array(len); const MR = rng(seed + 99); let ev2 = 0;
  for (let i = 0; i < len; i += 1) { ev2 += (env[i] - ev2) * 0.02; mech[i] = (MR() * 2 - 1) * (0.25 + ev2); }
  const mechF = loopThrough(mech, [bq('bp', 5200, 0.9, sr)]);
  const out = new Float32Array(len);
  const ai = on ? 0.5 : 0.18, mi = on ? 0.05 : 0.025;
  for (let i = 0; i < len; i += 1) out[i] = exhaust[i] + ai * air[i] + mi * mechF[i];
  const hp = loopThrough(out, [bq('hp', 35, 0.7, sr)]);
  // 온보드 마이크의 살짝 눌린 맛(부드러운 포화)
  const p = peak(hp) || 1; const drive = on ? 1.7 : 1.2;
  for (let i = 0; i < len; i += 1) hp[i] = Math.tanh((drive * hp[i]) / p) / Math.tanh(drive);
  return { data: hp, rpm: realRpm, load: on ? 1 : 0 };
}
// 6곳 × 둘. 소리 크기: 회전수가 오를수록 · 가속일수록 크게(실제 엔진처럼). 한꺼번에 정규화한다
export function genEngineSet(sr = SR, seed = 7) {
  const loops = [];
  for (const load of [1, 0]) for (const r of ENGINE_RPMS) loops.push(genEngineLoop(r, load, sr, seed));
  for (const l of loops) {
    const target = (l.load ? 0.32 : 0.14) * (0.62 + 0.38 * ((l.rpm - 4000) / 10000));
    const g = target / (rms(l.data) || 1); for (let i = 0; i < l.data.length; i += 1) l.data[i] *= g;
  }
  return loops;
}

// ---------- 배기 터짐(감속 중 · 변속할 때) ----------
export function genPops(sr = SR, seed = 3, count = 6) {
  const out = [];
  for (let v = 0; v < count; v += 1) {
    const R = rng(seed * 131 + v); const len = Math.round(0.09 * sr); const x = new Float32Array(len);
    const dur = (0.002 + R() * 0.006) * sr; const a = 0.6 + R() * 0.4;
    for (let i = 0; i < len; i += 1) x[i] = i < dur * 4 ? a * (R() * 2 - 1) * Math.exp(-i / dur) + 0.5 * a * Math.sin((TAU * 90 * i) / sr) * Math.exp(-i / (dur * 3)) : 0;
    const y = loopThrough(x, [comb((2 * 0.45 / 343) * sr, -0.4, 0.4), bq('lp', 3800 + R() * 1500, 0.8, sr), bq('hp', 60, 0.7, sr)]);
    for (let i = 0; i < 40; i += 1) { y[i] *= i / 40; y[len - 1 - i] *= i / 40; }
    out.push(normalize(y, 0.8));
  }
  return out;
}

// ---------- 잡음 고리(바람 · 노면 · 타이어 끌림에 쓴다) ----------
export function genNoise(kind, seconds = 3, sr = SR, seed = 11) {
  const R = rng(seed + kind.length * 17); const n = Math.round(seconds * sr); const x = new Float32Array(n);
  if (kind === 'white') for (let i = 0; i < n; i += 1) x[i] = R() * 2 - 1;
  else if (kind === 'pink') { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (let i = 0; i < n; i += 1) { const w = R() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; x[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926; } }
  else if (kind === 'brown') { let l = 0; for (let i = 0; i < n; i += 1) { l = (l + 0.02 * (R() * 2 - 1)) / 1.02; x[i] = l; } }
  // 고리 이음매: 앞뒤 50ms를 서로 겹쳐 섞는다
  const f = Math.round(0.05 * sr); const y = x.slice(0, n - f);
  for (let i = 0; i < f; i += 1) { const u = i / f; y[i] = x[i] * Math.sqrt(u) + x[n - f + i] * Math.sqrt(1 - u); }
  return normalize(y, 0.9);
}

// ---------- 자갈: 알갱이 수천 개가 바닥판 · 타이어에 튀는 소리(낱알 합성) ----------
export function genGravel(sr = SR, seed = 5, seconds = 2.4) {
  const R = rng(seed); const n = Math.round(seconds * sr); const x = new Float32Array(n);
  const grains = Math.round(seconds * 1400);
  for (let g = 0; g < grains; g += 1) {
    const t0 = Math.floor(R() * n); const a = 0.15 + Math.pow(R(), 3) * 0.85; const d = (0.0003 + R() * 0.0018) * sr; const f = 1800 + R() * 5200; const ph = R() * TAU;
    for (let j = 0; j < d * 5; j += 1) { const i = (t0 + j) % n; x[i] += a * Math.sin(ph + (TAU * f * j) / sr) * Math.exp(-j / d) * (R() * 0.6 + 0.7); }
  }
  // 큰 돌이 바닥판을 때리는 둔탁한 소리
  for (let g = 0; g < seconds * 45; g += 1) {
    const t0 = Math.floor(R() * n); const a = 0.6 + R() * 0.9; const f = 380 + R() * 700; const d = (0.004 + R() * 0.006) * sr;
    for (let j = 0; j < d * 5; j += 1) { const i = (t0 + j) % n; x[i] += a * Math.sin((TAU * f * j) / sr) * Math.exp(-j / d); }
  }
  const W = genNoise('brown', seconds + 0.06, sr, seed + 1);
  for (let i = 0; i < n; i += 1) x[i] += 2.2 * W[i % W.length];   // 차체가 흔들리는 낮은 울림
  return normalize(loopThrough(x, [bq('hp', 70, 0.7, sr), bq('pk', 3200, 0.8, sr, 3)]), 0.85);
}

// ---------- 충돌(벽 · 타이어 벽에 닿음) ----------
export function genImpact(sr = SR, seed = 9) {
  const R = rng(seed); const n = Math.round(0.9 * sr); const x = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / sr; const f = 34 + 70 * Math.exp(-t / 0.05);
    x[i] = 1.1 * Math.sin(TAU * (34 * t + 70 * 0.05 * (1 - Math.exp(-t / 0.05)))) * Math.exp(-t / 0.22) * (f > 0 ? 1 : 0)   // 몸통이 울리는 낮은 쿵
      + 0.9 * (R() * 2 - 1) * Math.exp(-t / 0.035)                                                              // 부딪는 순간의 파열음
      + 0.25 * (R() * 2 - 1) * Math.exp(-t / 0.25) * (R() < 0.04 ? 3 : 0.2);                                   // 파편이 떨어지는 달그락
  }
  return normalize(loopThrough(x, [bq('lp', 5200, 0.7, sr), bq('pk', 220, 1.2, sr, 4)]), 0.95);
}

// ---------- 신호등 한 열이 켜질 때: 낮은 '툭'(계전기 · 조명 켜짐) ----------
export function genClunk(sr = SR, seed = 13) {
  const R = rng(seed); const n = Math.round(0.16 * sr); const x = new Float32Array(n);
  for (let i = 0; i < n; i += 1) { const t = i / sr; x[i] = 0.9 * Math.sin(TAU * (160 * t - 300 * t * t)) * Math.exp(-t / 0.045) + 0.5 * (R() * 2 - 1) * Math.exp(-t / 0.0025); }
  return normalize(loopThrough(x, [bq('lp', 2600, 0.7, sr)]), 0.8);
}

// ---------- 지나가는 바람(보드 · 갠트리 · 옅은 차를 스칠 때): 소리 높이가 내려가는 휙 ----------
export function genWhoosh(sr = SR, seed = 17) {
  const R = rng(seed); const n = Math.round(0.55 * sr); const x = new Float32Array(n); let f = null;
  for (let i = 0; i < n; i += 1) {
    const u = i / n; if (i % 64 === 0) f = bq('bp', 2200 * Math.pow(0.22, u) + 250, 1.4, sr);
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 2) * (u < 0.45 ? u / 0.45 : 1);
    x[i] = env * (R() * 2 - 1);
    if (f) x[i] = f.step(x[i]);
  }
  return normalize(x, 0.85);
}

// ---------- 관중: 목소리 수십 개(성대 + 모음 공명) + 박수 + 웅성거림 ----------
const VOWELS = [[730, 1090, 2440], [570, 840, 2410], [300, 870, 2240], [530, 1840, 2480], [660, 1720, 2410]];
export function genCrowd(excited, sr = 22050, seed = 21, seconds = 5) { const job = crowdJob(excited, sr, seed, seconds); while (!job.step()); return job.result(); }
// 잘게 나눠 만들기(화면이 멈추지 않게 한 번에 목소리 몇 개씩): step()이 true를 돌려주면 끝
export function crowdJob(excited, sr = 22050, seed = 21, seconds = 5) {
  const R = rng(seed + (excited ? 1 : 0)); const n = Math.round(seconds * sr); const out = new Float32Array(n);
  const voices = excited ? 48 : 28; let v = 0; let y = null;
  const voice = () => {
    const f0 = R() < 0.6 ? 105 + R() * 70 : 190 + R() * 110; const vw = VOWELS[Math.floor(R() * VOWELS.length)];
    const fs = vw.map((fm) => bq('bp', fm * (0.92 + R() * 0.16), 7 + R() * 5, sr));
    const yells = excited ? 2 + Math.floor(R() * 3) : 1 + Math.floor(R() * 2);
    for (let y = 0; y < yells; y += 1) {
      const start = Math.floor(R() * n); const dur = Math.floor((excited ? 0.5 + R() * 1.4 : 0.25 + R() * 0.6) * sr); const amp = (excited ? 0.6 : 0.35) * (0.4 + R() * 0.6);
      let ph = 0; const vib = 4.5 + R() * 2; const rise = excited ? 1.25 + R() * 0.35 : 1.05 + R() * 0.15;
      for (const f of fs) { f.x1 = f.x2 = f.y1 = f.y2 = 0; }
      for (let j = 0; j < dur; j += 1) {
        const u = j / dur; const contour = 1 + (rise - 1) * Math.sin(Math.PI * Math.min(1, u * 1.3)) - 0.08 * u;   // '와아~' 올랐다 내려오는 높이
        const fr = f0 * contour * (1 + 0.012 * Math.sin((TAU * vib * j) / sr)) * (1 + 0.004 * (R() - 0.5));
        ph += fr / sr; const saw = 2 * (ph % 1) - 1 + 0.15 * (R() * 2 - 1);
        const env = Math.min(1, u / 0.12) * Math.min(1, (1 - u) / 0.3);
        let s2 = 0; for (let q = 0; q < 3; q += 1) s2 += fs[q].step(saw) * (q === 2 ? 0.35 : 1);
        out[(start + j) % n] += amp * env * s2;
      }
    }
  };
  const finish = () => {
  // 박수: 짧은 잡음 터짐(1~2.5kHz)
  const claps = Math.round(seconds * (excited ? 55 : 8));
  for (let c = 0; c < claps; c += 1) {
    const t0 = Math.floor(R() * n); const a = 0.12 + R() * 0.25; const f = bq('bp', 1100 + R() * 1400, 1.8, sr);
    for (let j = 0; j < 0.03 * sr; j += 1) out[(t0 + j) % n] += a * f.step((R() * 2 - 1) * Math.exp(-j / (0.004 * sr)));
  }
  // 웅성거림: 분홍 잡음을 말소리 대역으로 · 천천히 출렁이게
  const P = genNoise('pink', seconds + 0.06, sr, seed + 3); const band = [bq('bp', 450, 0.8, sr), bq('pk', 1500, 1, sr, 4)];
  let lfo = 0; const LR = rng(seed + 5);
  for (let i = 0; i < n; i += 1) { if (i % 256 === 0) lfo += (LR() - 0.5) * 0.08; lfo *= 0.999; let v = P[i % P.length]; for (const f of band) v = f.step(v); out[i] += (excited ? 0.12 : 0.22) * (1 + lfo) * v; }
  y = normalize(loopThrough(out, [bq('hp', 120, 0.7, sr), bq('lp', 6500, 0.7, sr)]), 0.85);
  };
  return {
    step: () => { if (v < voices) { for (let k = 0; k < 4 && v < voices; k += 1, v += 1) voice(); return false; } if (!y) finish(); return true; },
    result: () => y, sr,
  };
}

// 이름 → 만드는 함수. 실제 녹음을 쓰게 되면 같은 이름의 파일이 이 소리를 대신한다(sound.js)
export const SAMPLE_KEYS = ['crowd', 'cheer', 'gravel', 'impact'];
