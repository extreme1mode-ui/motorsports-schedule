// '서킷 한 바퀴' 난이도 점검: 13곳을 난이도 묶음마다 계산으로 달려 본다(브라우저 없이).
//   저장소 루트에서:  node tools/lap-sim.mjs            묶음 셋 모두
//                     node tools/lap-sim.mjs normal     한 묶음만(easy · normal · hard)
// 숫자를 바꾼 뒤에도 지켜야 하는 것
//   1) guide(안내 구간에서 손을 뗌) 열에 off가 하나도 없다
//   2) hold(누르기만 함)가 guide보다 느리다
//   3) +15m(안내보다 15m 늦게 뗌)는 guide보다 빠르거나 비슷하고, +45m는 off가 나온다
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(path.join(root, 'src/lap/engine.js'));
const tracks = JSON.parse(fs.readFileSync(path.join(root, 'src/lap/tracks.json'), 'utf8'));
const f = (r) => `${E.formatLap(r.t * 1000)}${r.offCount ? ` off${r.offCount}` : ''}${r.done ? '' : ' NOT DONE'}`;
const only = process.argv[2];
const presets = only ? [only] : Object.keys(E.DIFFICULTY);
let badAll = 0;
for (const name of presets) {
  if (!E.DIFFICULTY[name]) { console.log(`묶음 이름이 없어요: ${name}`); process.exit(1); }
  const D = E.DIFFICULTY[name];
  console.log(`\n[${name}] ${E.DIFF_KEYS.map((k) => `${k} ${D[k]}`).join(' · ')}`);
  console.log('id     | guide     | +15m          | +30m          | +45m          | hold           | 구간 수');
  let bad = 0;
  for (const raw of tracks) {
    const tr = E.prepareTrack(raw, name);
    let zones = 0; for (let i = 0; i < tr.n; i += 1) if (tr.brake[i] && !tr.brake[(i - 1 + tr.n) % tr.n]) zones += 1;
    const guide = E.botLap(tr, 'guide', 0); const hold = E.botLap(tr, 'hold');
    if (guide.offCount || !guide.done || !hold.done || hold.t <= guide.t) bad += 1;
    console.log([raw.id.padEnd(6), f(guide).padEnd(9), f(E.botLap(tr, 'guide', 15)).padEnd(13), f(E.botLap(tr, 'guide', 30)).padEnd(13), f(E.botLap(tr, 'guide', 45)).padEnd(13), f(hold).padEnd(14), zones].join(' | '));
  }
  console.log(bad ? `[${name}] 지켜야 하는 것을 어긴 서킷 ${bad}곳` : `[${name}] 13곳 모두 통과`);
  badAll += bad;
}
process.exit(badAll ? 1 : 0);
