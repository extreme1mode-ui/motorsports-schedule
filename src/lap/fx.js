// '한 바퀴' 효과: 길에 남는 타이어 자국(이번 바퀴 동안), 연기 · 먼지 알갱이, 차 옆을 스치는 바람 줄.
// 자국과 알갱이는 '거리 s(m) · 옆 o(보이는 미터)'로 저장한다 → 확대가 바뀌어도 길에 붙어 있다.
// 흔들림 · 번쩍임은 쓰지 않는다. 알갱이는 천천히 커지며 옅어지고, 바람 줄은 속도에 따라 길어진다.
import { screenAt } from './world.js';

export function newFx() { return { marks: [], puffs: [], streaks: [], rear: null, seed: 1 }; }
const rnd = (fx) => { fx.seed = (fx.seed * 16807) % 2147483647; return fx.seed / 2147483647; };

// 자국 한 조각(뒷바퀴 둘). kind: 'slide' 미끄러짐 · 'lock' 늦은 브레이크 · 'launch' 출발 휠스핀
export function addMarks(fx, s, oL, oR, a, kind) {
  const prev = fx.rear;
  if (prev && s - prev.s > 0 && s - prev.s < 8) {
    fx.marks.push({ s0: prev.s, s1: s, a0: prev.oL, a1: oL, b0: prev.oR, b1: oR, k: a, kind });
    if (fx.marks.length > 1800) fx.marks.splice(0, 300);
  }
  fx.rear = { s, oL, oR };
}
export function breakMarks(fx) { fx.rear = null; }

// 알갱이: kind 'smoke'(아스팔트 위 흰 연기) · 'dust'(코스 밖 먼지)
export function addPuff(fx, s, o, kind, now, size = 1) {
  fx.puffs.push({ s, o, t: now, kind, drift: (rnd(fx) - 0.5) * 1.6, back: 1 + rnd(fx) * 3, life: kind === 'dust' ? 1100 : 800, r: (2.2 + rnd(fx) * 1.6) * size });
  if (fx.puffs.length > 160) fx.puffs.splice(0, fx.puffs.length - 160);
}

export function drawMarks(ctx, V, P, fx) {
  if (V.detail < 0.5 || !fx.marks.length) return;
  const sA = V.I[0] * V.tk.ds - 10, sB = V.I[V.m - 1] * V.tk.ds + 10, L = V.tk.L;
  const inWin = (sp) => (sp >= sA && sp <= sB) || (sp + L >= sA && sp + L <= sB) || (sp - L >= sA && sp - L <= sB);
  ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.6, V.latPx * 0.55);
  for (const m of fx.marks) {
    if (!inWin(m.s0)) continue;
    ctx.strokeStyle = `rgba(${P.markRGB},${(m.k * (m.kind === 'launch' ? 0.75 : 0.55)).toFixed(3)})`;
    for (const [o0, o1] of [[m.a0, m.a1], [m.b0, m.b1]]) {
      const p0 = screenAt(V, m.s0, o0), p1 = screenAt(V, m.s1, o1); if (!p0 || !p1) continue;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
  }
}

export function drawPuffs(ctx, V, P, fx, now) {
  if (V.detail < 0.5) { fx.puffs.length = 0; return; }
  fx.puffs = fx.puffs.filter((p) => now - p.t < p.life);
  for (const p of fx.puffs) {
    const u = (now - p.t) / p.life;
    const pt = screenAt(V, p.s - p.back * u * 3, p.o + p.drift * u * 2); if (!pt) continue;
    const r = Math.max(2, p.r * V.latPx * (0.6 + u * 1.6));
    const a = (1 - u) * (p.kind === 'dust' ? 0.42 : 0.5);
    ctx.fillStyle = `rgba(${p.kind === 'dust' ? P.dustRGB : P.smokeRGB},${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2); ctx.fill();
  }
}

// 바람 줄: 차 둘레에서 차 뒤로 흐르는 가는 선. 시속 200km(55m/s)부터 보이고 빨라질수록 길고 진해진다
export function drawStreaks(ctx, fx, P, car, v, fdt, reduced) {
  const k = Math.max(0, Math.min(1, (v - 55) / 35));
  if (reduced || k <= 0) { fx.streaks.length = 0; return; }
  const want = Math.round(4 + k * 10);
  while (fx.streaks.length < want) fx.streaks.push({ x: (rnd(fx) - 0.5) * 2, y: rnd(fx) * 2 - 1.4, sp: 0.8 + rnd(fx) * 0.6 });
  if (fx.streaks.length > want) fx.streaks.length = want;
  const { x, y, rot, len } = car; const c = Math.cos(rot), s = Math.sin(rot);
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
  for (const st of fx.streaks) {
    st.y += st.sp * v * fdt * 0.035;                   // 차 길이 단위로 뒤로 흐른다
    if (st.y > 1.6) { st.y = -1.4; st.x = (rnd(fx) - 0.5) * 2; }
    const lx = st.x * len * 0.62 + Math.sign(st.x || 1) * len * 0.12, ly = st.y * len;
    if (Math.abs(lx) < len * 0.2) continue;              // 차 몸 위로는 긋지 않는다
    const l2 = len * (0.35 + k * 0.6);
    const fade = 1 - Math.min(1, Math.abs(st.y) / 1.6);
    ctx.strokeStyle = `rgba(${P.streakRGB},${(0.32 * k * fade).toFixed(3)})`; ctx.lineWidth = 1.2;
    const ax = lx * c - ly * s, ay = lx * s + ly * c, bx = lx * c - (ly + l2) * s, by = lx * s + (ly + l2) * c;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  ctx.restore();
}
