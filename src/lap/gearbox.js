// '한 바퀴' 엔진 · 기어: 속도 · 페달 → 기어(8단) · 회전수 · 부하. 소리(sound.js)와 계기판(LED · 기어 숫자)이 같은 규칙을 쓴다.
// 신호등 동안은 불이 켜질 때마다 회전수가 오르고, 다 켜지면 리미터에 걸린다. 출발하면 클러치가 붙는 동안 회전수가 버틴다.
export const GEAR_TOP = [100, 135, 170, 205, 240, 275, 305, 345].map((k) => k / 3.6);   // 기어마다 최고 속도(m/s)
export const SHIFT = 11800, IDLE = 4000;
export const REV_FROM = 9000;                                                          // LED가 켜지기 시작하는 회전수
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const gearRpm = (v, gear) => (SHIFT * v) / GEAR_TOP[gear - 1];

// 기어 바꾸기: 밟으면 올리고(회전수가 SHIFT에 닿을 때), 떼면 내린다(한 단 낮춰도 SHIFT − 250 아래일 때). 올림 · 내림 횟수를 돌려준다
export function shiftGear(st, v, down) {
  let gear = st.gear; let up = 0, dn = 0;
  if (down) { while (gear < 8 && gearRpm(v, gear) >= SHIFT) { gear += 1; up += 1; } if (gear > 1 && gearRpm(v, gear) < 7600) gear -= 1; }
  else while (gear > 1 && gearRpm(v, gear - 1) < SHIFT - 250) { gear -= 1; dn += 1; }
  st.gear = gear;
  return { up, dn, rpm: Math.max(IDLE, gearRpm(v, gear)) };
}

// inp: { phase, v(m/s), down, off, launch(0~1), lit } · t: 초. on.up(t) · on.down(t): 기어를 바꿀 때마다(소리가 끊김 · 블립을 낸다)
export function createEngine() {
  const e = { rpm: IDLE, gear: 1, load: 0, limit: 0, blipUntil: 0, lastT: null, liftAt: 0, wasDown: false, grid: false, moving: false, down: false };
  e.update = (inp, t, on = null) => {
    const dt = e.lastT == null ? 1 / 60 : clamp(t - e.lastT, 0, 0.1); e.lastT = t;
    const ph = inp.phase; const grid = ph === 'lights' || ph === 'go' || ph === 'wait'; const moving = ph === 'run' || ph === 'practice' || ph === 'finish';
    const v = inp.v || 0;
    let target, load, limit = 0; let down = false;
    if (grid) {
      target = ph === 'wait' ? 5200 : ph === 'go' ? 10900 : 5600 + (inp.lit || 0) * 1060;
      load = ph === 'wait' ? 0.3 : 0.75; if (target >= 10400) limit = 0.36;   // 다 켜지면 리미터에 걸려 떨린다
      e.gear = 1;
    } else if (moving) {
      down = !!inp.down && !inp.off && ph !== 'finish';
      const r = shiftGear(e, v, down);
      for (let k = 0; k < r.up; k += 1) if (on && on.up) on.up(t);
      for (let k = 0; k < r.dn; k += 1) { e.blipUntil = t + 0.075; if (on && on.down) on.down(t); }
      target = r.rpm;
      if (inp.launch > 0 && down) target = Math.max(target, 9200 + 1600 * (1 - inp.launch));   // 출발: 클러치가 붙는 동안 회전수가 버틴다
      load = down ? 1 : inp.off ? 0.15 : 0;
      if (e.wasDown && !down) e.liftAt = t; e.wasDown = down;
    } else { target = IDLE; load = 0; }
    if (t < e.blipUntil) { load = 0.9; target *= 1.05; }
    const tau = target > e.rpm ? (grid ? 0.12 : 0.035) : 0.06;
    e.rpm += (target - e.rpm) * (1 - Math.exp(-dt / tau)); e.load += (load - e.load) * (1 - Math.exp(-dt / 0.025));
    e.limit = limit; e.grid = grid; e.moving = moving; e.down = down; e.dt = dt;
    return e;
  };
  return e;
}

// 계기판 LED 15칸(초록 5 · 빨강 5 · 파랑 5)에 몇 칸 켤지. 리미터에 걸리면 다 켠다(깜빡이지 않는다)
export const revLeds = (e) => (e.limit > 0 ? 15 : clamp(Math.round(((e.rpm - REV_FROM) / (SHIFT - REV_FROM)) * 15), 0, 15));
