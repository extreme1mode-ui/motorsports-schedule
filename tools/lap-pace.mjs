// '서킷 한 바퀴' 빠르기 점검: 게임 시간을 실제 시간보다 빠르게 돌릴 때(배속), 사람이 늦게 반응하면 얼마나 이탈하는지 계산한다(브라우저 없이).
//   저장소 루트에서:  node tools/lap-pace.mjs
// 사람 모형: 진한 구간에 들어선 뒤 '반응'(실제 초)만큼 더 누르고 있다가 떼고, 구간이 끝난 뒤 같은 만큼 늦게 다시 누른다.
// 배속이 1.6이면 실제 0.25초 늦음 = 게임 0.4초 늦음이다. 화면에 보이는 기록은 게임 시간 그대로(실제 랩 타임 같은 숫자).
// 사람은 구간이 다가오는 것을 보고 미리 준비하므로, 이 모형은 실제보다 비관적이다(반응 0초 = 안내 그대로).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(path.join(root, 'src/lap/engine.js'));
const tracks = JSON.parse(fs.readFileSync(path.join(root, 'src/lap/tracks.json'), 'utf8'));
const DT = 1 / 120;

function humanLap(tr, delaySim) {
  const run = E.newRun(); let guard = 0; let inZone = false; let since = 99;
  while (!run.done && guard < 120 * 900) {
    const i = Math.floor(run.s / tr.ds) % tr.n; const z = !!tr.brake[i];
    if (z !== inZone) { inZone = z; since = 0; }
    since += DT;
    const throttle = inZone ? since < delaySim : since >= delaySim;   // 구간 안: 늦게 뗀다 · 구간 밖: 늦게 다시 누른다
    E.step(run, tr, throttle, DT); guard += 1;
  }
  return run;
}

const paces = [1, 1.3, 1.6, 2];
const delays = [0, 0.15, 0.25, 0.35];
const presets = Object.keys(E.DIFFICULTY);
console.log('13곳 합: 이탈 횟수(반응 0 · 0.15 · 0.25 · 0.35초) | 한 바퀴 실제 시간 평균(반응 0.25초)');
for (const name of presets) {
  const trs = tracks.map((raw) => E.prepareTrack(raw, name));
  for (const pace of paces) {
    const offs = []; let real = 0;
    for (const d of delays) {
      let sum = 0;
      for (const tr of trs) { const r = humanLap(tr, d * pace); sum += r.offCount; if (d === 0.25) real += r.t / pace; }
      offs.push(sum);
    }
    console.log(`${name.padEnd(6)} ×${String(pace).padEnd(3)} | 이탈 ${offs.map((o) => String(o).padStart(3)).join(' ·')} | 실제 ${(real / trs.length).toFixed(1)}초`);
  }
}
