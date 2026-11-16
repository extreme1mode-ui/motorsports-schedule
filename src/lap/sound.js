// '한 바퀴' 소리: Web Audio로 섞는다. 재료는 sound-gen.js(코드로 만든 소리)이고, 레이어가 열리면 쉬는 틈에 조금씩 만든다.
// 소리는 손이 처음 닿을 때(출발선에 서기 · 페달 · 스페이스) 켠다(브라우저 정책). iOS는 'ambient'로 무음 스위치를 따른다.
//
// 엔진: 속도 → 기어(8단) → 회전수. 가까운 회전수 고리 둘을 섞고 재생 속도로 맞춘다. 가속 · 감속 고리를 페달로 섞는다.
//       올림 변속은 30ms 끊김(점화 차단), 내림 변속은 회전수를 띄우는 블립, 감속 중에는 배기 터짐. 신호등 동안은 회전수가 오르고
//       다 켜지면 리미터에 걸려 떨린다(출발 직전의 긴장). 하이브리드 모터(MGU-K)의 윙 소리는 가속 · 회생 제동 때.
// 길: 바람(속도²) · 노면 · 타이어 끌림(미끄러짐) · 끽(잠김 · 휠스핀) · 연석 드르륵(속도에 맞춘 박자) · 자갈 · 충돌.
// 둘레: 벽에 되돌아오는 엔진(좌우 따로, 벽까지 거리만큼 늦게) · 관중석 웅성거림과 결승 함성 · 보드 · 갠트리를 스치는 바람.
// 옅은 차: 같은 엔진을 하나 더. 거리만큼 작고 어둡게, 옆 위치만큼 좌우로. 가까이 따라붙으면 들린다.
import * as G from './sound-gen.js';

const GEAR_TOP = [100, 135, 170, 205, 240, 275, 305, 345].map((k) => k / 3.6);   // 기어마다 최고 속도(m/s)
const SHIFT = 11800, IDLE = 4000;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

// ---------- 재료(한 번만, 쉬는 틈에) ----------
let bankP = null; let coreP = null; let coreRes = null;
const idle = () => new Promise((res) => { if (typeof window !== 'undefined' && window.requestIdleCallback) window.requestIdleCallback(() => res(), { timeout: 120 }); else setTimeout(res, 16); });
// 엔진 · 길 소리가 다 되면 coreReady가, 관중까지 다 되면 makeBank가 풀린다
export function coreReady() { makeBank(); return coreP; }
export function makeBank() {
  if (bankP) return bankP;
  coreP = new Promise((res) => { coreRes = res; });
  bankP = (async () => {
    const b = { engine: [], ready: false };
    for (const load of [1, 0]) for (const r of G.ENGINE_RPMS) { await idle(); b.engine.push(G.genEngineLoop(r, load)); }
    // 소리 크기 맞추기(genEngineSet과 같은 규칙)
    for (const l of b.engine) { const target = (l.load ? 0.32 : 0.14) * (0.62 + 0.38 * ((l.rpm - 4000) / 10000)); const g = target / (G.rms(l.data) || 1); for (let i = 0; i < l.data.length; i += 1) l.data[i] *= g; }
    await idle(); b.pops = G.genPops(); b.white = G.genNoise('white', 2); b.pink = G.genNoise('pink', 3); b.brown = G.genNoise('brown', 3);
    await idle(); b.gravel = G.genGravel();
    await idle(); b.impact = G.genImpact(); b.clunk = G.genClunk(); b.whoosh = G.genWhoosh();
    b.ready = true; coreRes(b);
    for (const ex of [false, true]) { const job = G.crowdJob(ex); while (!job.step()) await idle(); b[ex ? 'cheer' : 'crowd'] = { data: job.result(), sr: job.sr }; }
    return b;
  })();
  return bankP;
}

// ---------- 소리 그래프 ----------
function buf(ctx, data, sr = G.SR) { const ab = ctx.createBuffer(1, data.length, sr); ab.copyToChannel ? ab.copyToChannel(data, 0) : ab.getChannelData(0).set(data); return ab; }
function loopSrc(ctx, ab, rate = 1) { const s = ctx.createBufferSource(); s.buffer = ab; s.loop = true; s.playbackRate.value = rate; return s; }
const filt = (ctx, type, f, Q = 0.7, gain = 0) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = Q; n.gain.value = gain; return n; };
const gainN = (ctx, v = 0) => { const n = ctx.createGain(); n.gain.value = v; return n; };
const panN = (ctx, v = 0) => { if (!ctx.createStereoPanner) return gainN(ctx, 1); const p = ctx.createStereoPanner(); p.pan.value = v; return p; };
// 값이 거의 그대로면 다시 걸지 않는다(매 프레임 수십 개씩 쌓이는 자동화 일을 줄인다)
const lastV = new WeakMap();
const set = (param, v, t, tau = 0.015) => { const p = lastV.get(param); if (p !== undefined && Math.abs(p - v) <= 1e-4 * Math.max(1, Math.abs(v))) return; lastV.set(param, v); param.setTargetAtTime(v, t, tau); };

// 엔진 소리 한 대(내 차 · 옅은 차): 고리 12개를 늘 돌리고 무게만 바꾼다
function engineVoice(ctx, B, out) {
  const ab = B.engine.map((l) => ({ ab: buf(ctx, l.data), rpm: l.rpm, load: l.load }));
  const cut = gainN(ctx, 1); cut.connect(out);
  const vs = ab.map((l) => { const g = gainN(ctx, 0); const s = loopSrc(ctx, l.ab); s.connect(g); g.connect(cut); s.start(); return { ...l, g, s }; });
  const on = vs.filter((v) => v.load), off = vs.filter((v) => !v.load);
  return {
    cut, vs,
    set(rpm, load, t, tau = 0.012) {
      for (const [grp, w0] of [[on, Math.sqrt(clamp(load, 0, 1))], [off, Math.sqrt(1 - clamp(load, 0, 1))]]) {
        let k = 0; while (k < grp.length - 2 && rpm > grp[k + 1].rpm) k += 1;
        const a = grp[k], b = grp[k + 1]; const w = clamp(Math.log(rpm / a.rpm) / Math.log(b.rpm / a.rpm), 0, 1);
        for (const v of grp) { const gw = v === a ? Math.cos((w * Math.PI) / 2) : v === b ? Math.sin((w * Math.PI) / 2) : 0; const was = lastV.get(v.g.gain) || 0; set(v.g.gain, w0 * gw, t, tau); if (w0 * gw > 0 || was > 0) set(v.s.playbackRate, rpm / v.rpm, t, tau * 0.8); }
      }
    },
    stop() { for (const v of vs) { try { v.s.stop(); } catch { /* 이미 멈춤 */ } } },
  };
}

export function buildGraph(ctx, B) {
  const g = { ctx, B };
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  g.master = gainN(ctx, 0.9); g.master.connect(comp); comp.connect(ctx.destination);
  // 엔진(내 차) → 바로 + 좌우 벽에 되돌아오는 소리
  g.engOut = gainN(ctx, 0); g.engOut.connect(g.master);
  g.eng = engineVoice(ctx, B, g.engOut);
  g.refl = [1, -1].map((sd) => { const d = ctx.createDelay(0.25); d.delayTime.value = 0.05; const lp = filt(ctx, 'lowpass', 3200); const gn = gainN(ctx, 0); const p = panN(ctx, sd > 0 ? -0.75 : 0.75); g.engOut.connect(d); d.connect(lp); lp.connect(gn); gn.connect(p); p.connect(g.master); return { d, gn }; });
  // 리미터 떨림: 11Hz 네모파로 엔진 끊김을 흔든다(깊이는 0 = 없음)
  g.lim = ctx.createOscillator(); g.lim.type = 'square'; g.lim.frequency.value = 11; g.limDepth = gainN(ctx, 0); g.lim.connect(g.limDepth); g.limDepth.connect(g.eng.cut.gain); g.lim.start();
  // 하이브리드 모터의 윙(회전수에 묶인 사인 둘)
  g.whine = [7.5, 15].map((m, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 400; const gn = gainN(ctx, 0); o.connect(gn); gn.connect(g.master); o.start(); return { o, gn, m, k: i ? 0.4 : 1 }; });
  // 기어박스 윙(곧은 이 기어): 바퀴 속도에 묶인 높이, 느린 코너에서 잘 들린다
  g.gearOsc = ctx.createOscillator(); g.gearOsc.type = 'triangle'; g.gearOsc.frequency.value = 300; g.gearW = gainN(ctx, 0); const gwF = filt(ctx, 'bandpass', 1200, 0.8); g.gearOsc.connect(gwF); gwF.connect(g.gearW); g.gearW.connect(g.master); g.gearOsc.start();
  // 바람 · 노면
  const noise = (data, sr) => loopSrc(ctx, buf(ctx, data, sr));
  g.windBp = filt(ctx, 'bandpass', 400, 0.6); g.wind = gainN(ctx, 0); const pk = noise(B.pink); pk.connect(g.windBp); g.windBp.connect(g.wind); g.wind.connect(g.master); pk.start();
  g.buffet = gainN(ctx, 0); const br = noise(B.brown); const brLp = filt(ctx, 'lowpass', 110); br.connect(brLp); brLp.connect(g.buffet); g.buffet.connect(g.master); br.start();
  g.road = gainN(ctx, 0); const br2 = noise(B.brown, G.SR); br2.playbackRate.value = 1.37; const rdLp = filt(ctx, 'lowpass', 260); br2.connect(rdLp); rdLp.connect(g.road); g.road.connect(g.master); br2.start();
  // 타이어: 끌림(잡음 두 대역) · 끽(톱니파, 높이가 떨린다)
  g.scrub = gainN(ctx, 0); const wn = noise(B.white); const s1 = filt(ctx, 'bandpass', 680, 1.4), s2 = filt(ctx, 'bandpass', 1500, 3); wn.connect(s1); wn.connect(s2); s1.connect(g.scrub); s2.connect(g.scrub); g.scrub.connect(g.master); wn.start();
  g.squeal = ctx.createOscillator(); g.squeal.type = 'sawtooth'; g.squeal.frequency.value = 1080; const jit = noise(B.brown); jit.playbackRate.value = 0.5; const jg = gainN(ctx, 90); jit.connect(jg); jg.connect(g.squeal.detune); jit.start();
  g.screech = gainN(ctx, 0); const q1 = filt(ctx, 'bandpass', 1150, 4), q2 = filt(ctx, 'bandpass', 2350, 6); g.squeal.connect(q1); g.squeal.connect(q2); q1.connect(g.screech); q2.connect(g.screech); g.screech.connect(g.master); g.squeal.start();
  // 연석: 속도에 맞춘 박자(네모파) → 둔탁한 쿵 + 덜컹 + 박자에 맞춰 튀는 잡음
  g.kerbOsc = ctx.createOscillator(); g.kerbOsc.type = 'square'; g.kerbOsc.frequency.value = 60; g.kerb = gainN(ctx, 0); g.kerbPan = panN(ctx, 0);
  const kl = filt(ctx, 'lowpass', 150, 1.2), kb = filt(ctx, 'bandpass', 430, 2); const kbG = gainN(ctx, 0.5);
  g.kerbOsc.connect(kl); g.kerbOsc.connect(kb); kl.connect(g.kerb); kb.connect(kbG); kbG.connect(g.kerb);
  const kn = noise(B.white); kn.playbackRate.value = 0.77; const knAm = gainN(ctx, 0); g.kerbOsc.connect(knAm.gain); const knF = filt(ctx, 'bandpass', 1700, 1); kn.connect(knAm); knAm.connect(knF); knF.connect(g.kerb); kn.start();
  g.kerb.connect(g.kerbPan); g.kerbPan.connect(g.master); g.kerbOsc.start();
  // 자갈
  g.gravelSrc = noise(B.gravel); g.gravel = gainN(ctx, 0); g.gravelSrc.connect(g.gravel); g.gravel.connect(g.master); g.gravelSrc.start();
  // 한 번 소리들
  g.ab = { impact: buf(ctx, B.impact), clunk: buf(ctx, B.clunk), whoosh: buf(ctx, B.whoosh), pops: B.pops.map((p) => buf(ctx, p)) };
  // 옅은 차 엔진: 거리만큼 어둡게 · 작게, 옆 위치만큼 좌우로
  g.ghostLp = filt(ctx, 'lowpass', 6000); g.ghostPan = panN(ctx, 0); g.ghostOut = gainN(ctx, 0); g.ghostLp.connect(g.ghostPan); g.ghostPan.connect(g.ghostOut); g.ghostOut.connect(g.master);
  g.ghost = engineVoice(ctx, B, g.ghostLp);
  g.crowdOut = gainN(ctx, 0); g.crowdPan = panN(ctx, 0); g.crowdOut.connect(g.crowdPan); g.crowdPan.connect(g.master);
  g.cheerOut = gainN(ctx, 0); g.cheerOut.connect(g.master);
  g.addCrowd = (bk) => {   // 관중 소리는 늦게 만들어진다
    if (bk.crowd && !g.crowdSrc) { g.crowdSrc = loopSrc(ctx, buf(ctx, bk.crowd.data, bk.crowd.sr)); g.crowdSrc.connect(g.crowdOut); g.crowdSrc.start(); }
    if (bk.cheer && !g.cheerSrc) { g.cheerSrc = loopSrc(ctx, buf(ctx, bk.cheer.data, bk.cheer.sr)); g.cheerSrc.connect(g.cheerOut); g.cheerSrc.start(); }
  };
  g.addCrowd(B);
  return g;
}

// 한 번 소리 재생
function shot(g, ab, t, gain, rate = 1, pan = 0) {
  const { ctx } = g; const s = ctx.createBufferSource(); s.buffer = ab; s.playbackRate.value = rate;
  const gn = gainN(ctx, gain); const p = panN(ctx, pan); s.connect(gn); gn.connect(p); p.connect(g.master); s.start(Math.max(t, ctx.currentTime));
  s.onended = () => { try { p.disconnect(); } catch { /* 이미 끊김 */ } };
}

// ---------- 섞는 규칙: 상태(매 프레임) → 소리 ----------
// inp: { phase, v(m/s, 게임 속도), down, off, surface, heat, lock, launch(0~1), kerb(0/1), kerbSide, wallL, wallR, street, stand(0~1), standPan, lit, ghost:{d(앞+ m), lat, v, down, dv}|null }
export function createMixer(g, seed = 1) {
  let R = seed >>> 0; const rnd = () => { R = (R * 16807) % 2147483647; return R / 2147483647; };
  const m = { rpm: IDLE, gear: 1, load: 0, blipUntil: 0, lastT: null, liftAt: 0, wasDown: false, ghostGear: 1, ghostRpm: IDLE, popsOn: false };
  const gearRpm = (v, gear) => (SHIFT * v) / GEAR_TOP[gear - 1];
  const cutAt = (t) => { const p = g.eng.cut.gain; p.cancelScheduledValues(t); p.setValueAtTime(1, t); p.linearRampToValueAtTime(0.28, t + 0.008); p.setValueAtTime(0.28, t + 0.03); p.linearRampToValueAtTime(1, t + 0.05); };
  const pop = (t, gain) => { shot(g, g.ab.pops[Math.floor(rnd() * g.ab.pops.length)], t, gain, 0.8 + rnd() * 0.45, (rnd() - 0.5) * 0.3); };
  // 기어 · 회전수(내 차와 옅은 차가 같은 규칙)
  function drive(st, v, down, t, isMe) {
    let gear = st.gear;
    if (down) { while (gear < 8 && gearRpm(v, gear) >= SHIFT) { gear += 1; if (isMe) { cutAt(t); if (rnd() < 0.6) pop(t + 0.012, 0.22); } } if (gear > 1 && gearRpm(v, gear) < 7600) gear -= 1; }
    else while (gear > 1 && gearRpm(v, gear - 1) < SHIFT - 250) { gear -= 1; if (isMe) { m.blipUntil = t + 0.075; pop(t + 0.07 + rnd() * 0.05, 0.3); } }
    st.gear = gear; return Math.max(IDLE, gearRpm(v, gear));
  }
  return {
    m,
    update(inp, t) {
      const dt = m.lastT == null ? 1 / 60 : clamp(t - m.lastT, 0, 0.1); m.lastT = t;
      const ph = inp.phase; const grid = ph === 'lights' || ph === 'go' || ph === 'wait'; const moving = ph === 'run' || ph === 'practice' || ph === 'finish';
      const v = inp.v || 0;
      // ---- 엔진 ----
      let target, load, limit = 0;
      if (grid) {
        target = ph === 'wait' ? 5200 : ph === 'go' ? 10900 : 5600 + (inp.lit || 0) * 1060;
        load = ph === 'wait' ? 0.3 : 0.75; if (target >= 10400) limit = 0.36;   // 다 켜지면 리미터에 걸려 떨린다
        m.gear = 1;
      } else if (moving) {
        const down = !!inp.down && !inp.off && ph !== 'finish';
        target = drive(m, v, down, t, true);
        if (inp.launch > 0 && down) target = Math.max(target, 9200 + 1600 * (1 - inp.launch));   // 출발: 클러치가 붙는 동안 회전수가 버틴다
        load = down ? 1 : inp.off ? 0.15 : 0;
        if (m.wasDown && !down) m.liftAt = t; m.wasDown = down;
      } else { target = IDLE; load = 0; }
      if (t < m.blipUntil) { load = 0.9; target *= 1.05; }
      const tau = target > m.rpm ? (grid ? 0.12 : 0.035) : 0.06;
      m.rpm += (target - m.rpm) * (1 - Math.exp(-dt / tau)); m.load += (load - m.load) * (1 - Math.exp(-dt / 0.025));
      const rpm = m.rpm * (1 + (limit ? 0.012 * Math.sin(t * 69) : 0));
      g.eng.set(clamp(rpm, 3600, 15500), m.load, t);
      set(g.limDepth.gain, limit, t, 0.05);
      if (grid) { set(g.eng.cut.gain, 1 - limit, t, 0.05); m.wasGrid = true; } else if (m.wasGrid) { m.wasGrid = false; g.eng.cut.gain.cancelScheduledValues(t); set(g.eng.cut.gain, 1, t, 0.02); }
      const live = grid || moving;
      set(g.engOut.gain, live ? (ph === 'finish' ? 0.5 : 0.8) : 0, t, live ? 0.08 : 0.6);   // 결승선을 지나면 엔진을 줄여 함성이 들리게
      // 감속 중 배기 터짐: 떼고 1초 동안 많이, 그 뒤 가끔
      if (moving && m.load < 0.2 && m.rpm > 7500) { const lam = t - m.liftAt < 1 ? 9 : 2.5; if (rnd() < lam * dt) pop(t + rnd() * dt, 0.12 + rnd() * 0.25); }
      // 하이브리드 윙: 가속 때 · 회생 제동 때
      const wk = moving ? (m.load > 0.5 ? 0.022 * smooth(v, 10, 80) : 0.03 * smooth(v, 25, 80)) : 0;
      for (const w of g.whine) { set(w.o.frequency, (m.rpm / 60) * w.m, t, 0.02); set(w.gn.gain, wk * w.k, t, 0.08); }
      set(g.gearOsc.frequency, clamp(v * 34, 40, 4000), t, 0.03); set(g.gearW.gain, moving && v > 3 ? 0.012 + 0.03 * m.load * (1 - smooth(v, 35, 75)) : 0, t, 0.08);
      // ---- 벽에 되돌아오는 엔진 ----
      for (const [i, wd] of [[0, inp.wallL], [1, inp.wallR]]) {
        const r = g.refl[i]; const d = clamp(wd || 30, 1.5, 40);
        set(r.d.delayTime, (2 * d) / 343, t, 0.08); set(r.gn.gain, live ? (inp.street ? 0.42 : 0.24) * clamp(4 / d, 0, 1) : 0, t, 0.06);
      }
      // ---- 바람 · 노면 ----
      const vk = v / 92; const air = moving ? vk * vk : 0;
      set(g.windBp.frequency, 280 + v * 14, t, 0.1); set(g.wind.gain, 0.62 * air, t, 0.1);
      set(g.buffet.gain, 0.75 * air * (0.75 + 0.5 * rnd()), t, 0.05);
      set(g.road.gain, moving && !inp.off ? 0.14 * clamp(vk, 0, 1) : 0, t, 0.08);
      // ---- 타이어 ----
      const heat = moving ? inp.heat || 0 : 0;
      set(g.scrub.gain, 1.05 * smooth(heat, 0.12, 0.9) * (0.8 + 0.4 * rnd()), t, 0.03);
      const scr = Math.max(0.6 * (inp.lock || 0), 0.4 * (inp.launch || 0) * (inp.down ? 1 : 0), 0.75 * smooth(heat, 0.55, 1.2));
      set(g.screech.gain, moving ? scr : 0, t, 0.03); set(g.squeal.frequency, inp.lock > 0.2 ? 1260 : 1060 + 120 * clamp(heat, 0, 1), t, 0.1);
      // ---- 연석 ----
      set(g.kerbOsc.frequency, clamp(v / 0.55, 14, 170), t, 0.03);
      set(g.kerb.gain, moving && inp.kerb ? 0.5 * smooth(v, 5, 40) : 0, t, inp.kerb ? 0.012 : 0.05); if (g.kerbPan.pan) set(g.kerbPan.pan, inp.kerb ? (inp.kerbSide > 0 ? -0.35 : 0.35) : 0, t, 0.05);
      // ---- 자갈 ----
      const grav = moving && inp.off && inp.surface === 'gravel' ? 0.65 * smooth(v, 0, 40) + 0.08 : 0;
      set(g.gravel.gain, grav, t, 0.05); set(g.gravelSrc.playbackRate, 0.55 + 0.75 * clamp(v / 60, 0, 1), t, 0.1);
      // ---- 관중 ----
      if (g.B.crowd && !g.crowdSrc) g.addCrowd(g.B);
      const crowd = (grid ? 0.32 : moving ? 0.55 * (inp.stand || 0) : 0.04 * (inp.stand || 0));
      set(g.crowdOut.gain, crowd, t, 0.25); if (g.crowdPan.pan) set(g.crowdPan.pan, inp.standPan || 0, t, 0.2);
      // ---- 옅은 차 ----
      const gh = inp.ghost;
      if (gh && moving && ph !== 'finish') {
        const gr = drive({ get gear() { return m.ghostGear; }, set gear(x) { m.ghostGear = x; } }, gh.v, gh.down, t, false);
        m.ghostRpm += (gr - m.ghostRpm) * (1 - Math.exp(-dt / 0.05));
        const ad = Math.abs(gh.d);
        g.ghost.set(clamp(m.ghostRpm * (1 + clamp((gh.dv || 0) / 343, -0.04, 0.04)), 3600, 15500), gh.down ? 1 : 0, t, 0.02);   // dv: 서로 가까워지는 속도(도플러)
        const vol = (0.55 / (1 + (ad / 14) ** 2)) * (gh.d > 0 ? 1 : 0.6) * smooth(ad, 1.5, 4);
        set(g.ghostOut.gain, vol, t, 0.05); set(g.ghostLp.frequency, 9000 / (1 + ad / 18), t, 0.05); if (g.ghostPan.pan) set(g.ghostPan.pan, clamp(-gh.lat / 7, -0.8, 0.8), t, 0.05);
      } else set(g.ghostOut.gain, 0, t, 0.1);
    },
    // ---- 일(한 번) ----
    event(name, d = {}, t) {
      if (name === 'light') shot(g, g.ab.clunk, t, 0.32, 1);
      else if (name === 'jump') { shot(g, g.ab.clunk, t, 0.38, 0.62); shot(g, g.ab.clunk, t + 0.16, 0.38, 0.62); }
      else if (name === 'launch') { set(g.cheerOut.gain, 0.35, t, 0.3); set(g.cheerOut.gain, 0, t + 1.2, 0.8); }   // 불이 꺼지면 관중석이 들썩인다
      else if (name === 'off') {
        const k = clamp(d.v / 40, 0.15, 1);
        if (d.surface === 'wall') shot(g, g.ab.impact, t, 0.95 * k, 1);
        else shot(g, g.ab.impact, t, 0.45 * k, 1.35);
      } else if (name === 'whoosh') shot(g, g.ab.whoosh, t, clamp(d.gain || 0.3, 0, 0.6), d.rate || 1, d.pan || 0);
      else if (name === 'finish') { set(g.cheerOut.gain, d.best ? 1 : 0.6, t, 0.35); set(g.cheerOut.gain, 0, t + 2.8, 1); }
    },
  };
}

// ---------- 레이어에서 쓰는 손잡이 ----------
// const snd = createLapSound(); snd.enable(on); snd.unlock()(손이 닿을 때); snd.update(inp)(매 프레임); snd.event('light') …; snd.close()
// 소리 들어 보기(데모 조절 판): 상황 하나를 몇 초 동안 흉내 낸다. 그동안 게임 화면의 상태는 소리에 쓰지 않는다
const base = { phase: 'run', v: 0, down: true, off: false, surface: null, heat: 0, lock: 0, launch: 0, kerb: 0, kerbSide: 1, wallL: 30, wallR: 30, street: false, stand: 0, standPan: 0, lit: 0, ghost: null };
const lerp = (a, b, u) => a + (b - a) * clamp(u, 0, 1);
export const SOUND_TESTS = {
  grid: { dur: 10.5, at: (t) => (t < 7.4 ? { ...base, phase: 'lights', lit: Math.min(5, Math.floor(t)) } : { ...base, v: lerp(0, 48, (t - 7.4) / 3), launch: Math.max(0, 1 - (t - 7.4) / 1.1) }),
    events: [[1, 'light'], [2, 'light'], [3, 'light'], [4, 'light'], [5, 'light'], [7.4, 'launch']] },
  shifts: { dur: 7, at: (t) => ({ ...base, v: lerp(18, 92, t / 6.5) }) },
  brake: { dur: 4.5, at: (t) => ({ ...base, v: t < 0.6 ? 88 : lerp(88, 24, (t - 0.6) / 3), down: t < 0.6 || t > 3.8, lock: t > 0.8 && t < 1.8 ? 0.6 : 0 }) },
  kerb: { dur: 4, at: (t) => ({ ...base, v: 48, kerb: (t > 0.6 && t < 1.5) || (t > 2.4 && t < 3.3) ? 1 : 0, kerbSide: t < 2 ? 1 : -1 }) },
  slip: { dur: 4, at: (t) => ({ ...base, v: 42, down: t < 3, heat: t < 2.2 ? lerp(0, 1.2, t / 2.2) : lerp(1.2, 0, (t - 2.2) / 1) }) },
  gravel: { dur: 3.5, at: (t) => ({ ...base, v: lerp(38, 0, t / 3), down: false, off: t > 0.2, surface: 'gravel' }), events: [[0.2, 'off', { v: 38, surface: 'gravel' }]] },
  wall: { dur: 2.5, at: (t) => ({ ...base, v: t < 0.3 ? 46 : 0, down: false, off: t > 0.3, surface: 'wall', street: true, wallL: 2 }), events: [[0.3, 'off', { v: 46, surface: 'wall' }]] },
  ghost: { dur: 6, at: (t) => ({ ...base, v: 70, ghost: { d: lerp(-45, 45, t / 6), lat: 2.5, v: 77, down: true, dv: t < 3 ? 7 : -7 } }), events: [[3, 'whoosh', { gain: 0.3, rate: 0.85, pan: -0.4 }]] },
  street: { dur: 5, at: (t) => ({ ...base, v: lerp(40, 75, t / 5), street: true, wallL: lerp(14, 2.5, t / 2.5), wallR: lerp(3, 12, t / 5) }) },
  crowd: { dur: 7, at: (t) => ({ ...base, phase: t < 2.5 ? 'run' : 'finish', v: t < 2.5 ? 85 : lerp(85, 40, (t - 2.5) / 2), down: t < 2.5, stand: t < 2.5 ? lerp(0, 1, t / 2.5) : lerp(1, 0.5, (t - 2.5) / 3) }), events: [[2.5, 'finish', { best: true }]] },
};

export function createLapSound() {
  let ctx = null, g = null, mix = null, bank = null, on = false; let testUntil = 0;
  const st = { log: null };
  coreReady().then((b) => { bank = b; if (ctx && on) build(); });
  const build = () => { if (g || !ctx || !bank || !bank.ready) return; g = buildGraph(ctx, bank); mix = createMixer(g); };
  const api = {
    get testing() { return performance.now() < testUntil; },
    get ready() { return !!g; }, get enabled() { return on; }, get ctx() { return ctx; }, get mixer() { return mix; }, get log() { return st.log; },
    setLog(v) { st.log = v ? [] : null; },   // 데모 · 시험: 상태를 남겨 두었다가 renderLog로 소리를 다시 만든다
    enable(v) { on = !!v; if (!on && ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); if (on && ctx) ctx.resume().catch(() => {}); },
    unlock() {
      if (!on) return;
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
          if (navigator.audioSession) { try { navigator.audioSession.type = 'ambient'; } catch { /* 지원 안 함 */ } }
          ctx = new AC({ latencyHint: 'interactive' });
        }
        if (ctx.state !== 'running') ctx.resume().catch(() => {});
        build();
      } catch { /* 소리 없이 계속 */ }
    },
    update(inp) { if (performance.now() < testUntil) return; if (st.log) st.log.push({ t: performance.now(), k: 'u', inp: { ...inp, ghost: inp.ghost ? { ...inp.ghost } : null } }); if (on && g && ctx.state === 'running') mix.update(inp, ctx.currentTime); },
    // 데모: 소리 하나 들어 보기. 돌려준 값이 false면 아직 소리를 켤 수 없다(앱 화면을 한 번 눌러야 하거나, 재료를 만드는 중)
    test(name) {
      const sc = SOUND_TESTS[name]; if (!sc || !on) return false; api.unlock(); if (!g || ctx.state !== 'running') return false;
      const t0 = performance.now(); testUntil = t0 + sc.dur * 1000; const evs = (sc.events || []).slice();
      const tick = () => { const t = (performance.now() - t0) / 1000; if (t > sc.dur) return; const now = ctx.currentTime;
        while (evs.length && evs[0][0] <= t) { const [, n, d] = evs.shift(); mix.event(n, d || {}, now); }
        mix.update(sc.at(t), now); requestAnimationFrame(tick); };
      requestAnimationFrame(tick); return true;
    },
    event(name, d) { if (st.log) st.log.push({ t: performance.now(), k: 'e', name, d }); if (on && g && ctx.state === 'running') mix.event(name, d, ctx.currentTime); },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    resume() { if (on && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); },
    close() { if (ctx) { ctx.close().catch(() => {}); ctx = null; g = null; mix = null; } },
  };
  return api;
}

// 녹화한 상태로 소리를 다시 만든다(데모 · 시험용: 화면 녹화에 소리를 입힐 때). log는 createLapSound({ log: true }).log
export async function renderLog(entries, { seconds, t0, sampleRate = 44100 } = {}) {
  const b = await makeBank(); while (!b.crowd || !b.cheer) await idle();
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OAC(2, Math.ceil(seconds * sampleRate), sampleRate);
  const g = buildGraph(ctx, b); const mix = createMixer(g);
  for (const e of entries) { const t = (e.t - t0) / 1000; if (t < 0 || t > seconds) continue; if (e.k === 'u') mix.update(e.inp, t); else mix.event(e.name, e.d, t); }
  return ctx.startRendering();
}

// 들어 보기 장면들을 이어서 소리 파일로(데모 · 시험). 장면 사이 0.8초 쉼
export async function renderScenes(names, sampleRate = 44100) {
  const b = await makeBank(); while (!b.crowd || !b.cheer) await idle();
  const list = names.filter((n) => SOUND_TESTS[n]); const total = list.reduce((a, n) => a + SOUND_TESTS[n].dur + 0.8, 0.4);
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; const ctx = new OAC(2, Math.ceil(total * sampleRate), sampleRate);
  const g = buildGraph(ctx, b); const mix = createMixer(g); let off = 0.3;
  for (const n of list) {
    const sc = SOUND_TESTS[n]; const evs = (sc.events || []).slice();
    for (let t = 0; t <= sc.dur; t += 1 / 60) { while (evs.length && evs[0][0] <= t) { const [, en, d] = evs.shift(); mix.event(en, d || {}, off + t); } mix.update(sc.at(t), off + t); }
    mix.update({ ...base, phase: 'ready' }, off + sc.dur + 0.02); off += sc.dur + 0.8;
  }
  return ctx.startRendering();
}

// AudioBuffer → 16비트 WAV 바이트(시험 녹화에 소리를 입힐 때)
export function wavBytes(ab) {
  const ch = ab.numberOfChannels, n = ab.length, sr = ab.sampleRate; const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, x) => { for (let i = 0; i < x.length; i += 1) out.setUint8(o + i, x.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = []; for (let c = 0; c < ch; c += 1) data.push(ab.getChannelData(c));
  let o = 44; for (let i = 0; i < n; i += 1) for (let c = 0; c < ch; c += 1) { out.setInt16(o, Math.max(-32767, Math.min(32767, Math.round(data[c][i] * 32767))), true); o += 2; }
  return new Uint8Array(out.buffer);
}
