// 비 예보 서버 함수(api/weather.js)를 실제 MET Norway에 한 번 돌려 본다. 반영 전에 한 번 — 응답 모양 확인용.
//   node tools/weather/check-live.mjs [ISO 시각]
// 9일 안 대상 경기·좌표, 성공 수, 캐시 길이, 비가 잡힌 세션을 찍는다. MET를 부르는 수는 대상 좌표 수만큼이다.
import { buildWeather } from '../../api/weather.js';

const now = process.argv[2] ? Date.parse(process.argv[2]) : Date.now();
const { body, maxAge, points, ok } = await buildWeather({ now });
console.log(`기준 ${new Date(now).toISOString()} · 좌표 ${points}곳 중 ${ok}곳 성공 · CDN 캐시 ${maxAge}s`);
for (const [id, r] of Object.entries(body.races)) {
  console.log(`- ${id} (예보 ${r.updatedAt})`);
  for (const [k, w] of Object.entries(r.sessions)) console.log(`    ${k}  level ${w.level}  ${w.mm}mm/h  ${w.symbol}`);
}
if (!Object.keys(body.races).length) console.log('비가 잡힌 세션 없음(또는 실패 — 위 성공 수를 본다)');
