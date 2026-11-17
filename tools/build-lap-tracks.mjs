// '한 바퀴'용 트랙 데이터: 서킷 맵 base.json의 track(중심선 좌표 · 길이 · 코너 위치)만 뽑아 가벼운 파일 하나로 만든다.
//   node tools/build-lap-tracks.mjs → src/lap/tracks.json
// 값은 base.json 그대로다(좌표는 미터, 북쪽이 위). 첫 점에서 출발해 점 순서대로 달린다 — 첫 점이 실제 출발선인지는 따로 확인하지 않았다. 손으로 고치지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/circuit-map/venues');
const season = JSON.parse(fs.readFileSync(path.join(root, 'src/schedule/season-2026.json'), 'utf8'));
const out = [];
for (const id of fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'base.json')))) {
  const base = JSON.parse(fs.readFileSync(path.join(dir, id, 'base.json'), 'utf8'));
  const venue = fs.readFileSync(path.join(dir, id, 'venue.js'), 'utf8');
  const raceId = (venue.match(/raceId:\s*'([^']+)'/) || [])[1] || null;
  const race = season.find((r) => r.id === raceId);
  if (!base.track || !Array.isArray(base.track.pts) || !race) { console.warn('skip', id); continue; }
  out.push({ id, raceId, round: race.round, pts: base.track.pts, L: base.track.L, turns: base.track.turns || {} });
}
out.sort((a, b) => a.round - b.round);
fs.writeFileSync(path.join(root, 'src/lap/tracks.json'), `${JSON.stringify(out)}\n`);
console.log(out.map((t) => `${t.id} R${t.round} ${t.pts.length}pts ${t.L}m T${Object.keys(t.turns).length} T1@${t.turns['1']}`).join('\n'));
