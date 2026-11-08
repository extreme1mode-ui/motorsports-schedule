// 서킷 좌표(src/schedule/venues-geo.js)를 Wikipedia 서킷 문서 좌표와 대조한다. 반영 전에 한 번, 서킷이 늘 때마다.
//   node tools/weather/check-venues.mjs
// 3km 넘게 다른 줄만 FAIL로 찍고 종료 코드 1. 고칠 때는 venues-geo.js의 값과 주석(출처)을 같이 바꾼다.
import { VENUES_GEO } from '../../src/schedule/venues-geo.js';

// 데이터의 circuit 값 → Wikipedia 문서 제목
const TITLE = {
  'Albert Park Circuit': 'Albert Park Circuit',
  'Algarve International Circuit': 'Algarve International Circuit',
  'Autodromo Internazionale Enzo e Dino Ferrari': 'Imola Circuit',
  'Autodromo Nazionale Monza': 'Monza Circuit',
  'Autódromo Hermanos Rodríguez': 'Autódromo Hermanos Rodríguez',
  'Autódromo José Carlos Pace': 'Interlagos Circuit',
  'Autódromo José Carlos Pace (Interlagos)': 'Interlagos Circuit',
  'Bahrain International Circuit': 'Bahrain International Circuit',
  'Baku City Circuit': 'Baku City Circuit',
  'Brands Hatch Circuit': 'Brands Hatch',
  'Canadian Tire Motorsport Park': 'Canadian Tire Motorsport Park',
  'Circuit Gilles Villeneuve': 'Circuit Gilles Villeneuve',
  'Circuit Paul Ricard': 'Circuit Paul Ricard',
  'Circuit Zandvoort': 'Circuit Zandvoort',
  'Circuit de Barcelona-Catalunya': 'Circuit de Barcelona-Catalunya',
  'Circuit de Monaco': 'Circuit de Monaco',
  'Circuit de Nevers Magny-Cours': 'Circuit de Nevers Magny-Cours',
  'Circuit de Spa-Francorchamps': 'Circuit de Spa-Francorchamps',
  'Circuit de la Sarthe': 'Circuit de la Sarthe',
  'Circuit of the Americas': 'Circuit of the Americas',
  'Daytona International Speedway': 'Daytona International Speedway',
  'Detroit Street Circuit': 'Detroit Street Circuit',
  'Fuji International Speedway': 'Fuji Speedway',
  'Fuji Speedway': 'Fuji Speedway',
  'Hungaroring': 'Hungaroring',
  'Indianapolis Motor Speedway': 'Indianapolis Motor Speedway',
  'Indianapolis Motor Speedway (road course)': 'Indianapolis Motor Speedway',
  'Istanbul Park': 'Istanbul Park',
  'Jeddah Corniche Circuit': 'Jeddah Corniche Circuit',
  'Las Vegas Strip Circuit': 'Las Vegas Strip Circuit',
  'Long Beach Street Circuit': 'Long Beach Street Circuit',
  'Lusail International Circuit': 'Lusail International Circuit',
  'Madring': 'Madring',
  'Marina Bay Street Circuit': 'Marina Bay Street Circuit',
  'Miami International Autodrome': 'Miami International Autodrome',
  'Michelin Raceway Road Atlanta': 'Road Atlanta',
  'Misano World Circuit Marco Simoncelli': 'Misano World Circuit Marco Simoncelli',
  'Mount Panorama Circuit': 'Mount Panorama Circuit',
  'Nürburgring': 'Nürburgring',
  'Nürburgring (Grand Prix circuit)': 'Nürburgring',
  'Nürburgring (Nordschleife + Grand Prix circuit)': 'Nürburgring',
  'Okayama International Circuit': 'Okayama International Circuit',
  'Pertamina Mandalika International Circuit': 'Mandalika International Street Circuit',
  'Red Bull Ring': 'Red Bull Ring',
  'Road America': 'Road America',
  'Sebring International Raceway': 'Sebring International Raceway',
  'Sepang International Circuit': 'Sepang International Circuit',
  'Shanghai International Circuit': 'Shanghai International Circuit',
  'Silverstone Circuit': 'Silverstone Circuit',
  'Suzuka Circuit': 'Suzuka International Racing Course',
  'Suzuka International Racing Course': 'Suzuka International Racing Course',
  'VIRginia International Raceway': 'Virginia International Raceway',
  'Watkins Glen International': 'Watkins Glen International',
  'WeatherTech Raceway Laguna Seca': 'Laguna Seca Raceway',
  'Yas Marina Circuit': 'Yas Marina Circuit',
};
const LIMIT_KM = 3;
const UA = 'Gantry/1.0 https://www.gantryracing.com (venue check)';

function km([a1, o1], [a2, o2]) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(a2 - a1) / 2) ** 2 + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(r(o2 - o1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

async function coords(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`;
    const json = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
    const back = {};   // 최종 제목 → 요청한 제목
    for (const t of batch) back[t] = t;
    for (const n of json.query?.normalized || []) back[n.to] = back[n.from] || n.from;
    for (const r of json.query?.redirects || []) back[r.to] = back[r.from] || r.from;
    for (const p of Object.values(json.query?.pages || {})) {
      const c = p.coordinates?.[0];
      if (c) out[back[p.title] || p.title] = [c.lat, c.lon];
    }
  }
  return out;
}

const titles = [...new Set(Object.values(TITLE))];
const wiki = await coords(titles);
let fail = 0;
for (const [circuit, ours] of Object.entries(VENUES_GEO)) {
  const t = TITLE[circuit];
  const w = t && wiki[t];
  if (!w) { console.log(`?    ${circuit} — Wikipedia 좌표 없음(${t || '제목 미지정'})`); continue; }
  const d = km(ours, w);
  const bad = d > LIMIT_KM;
  if (bad) fail += 1;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${d.toFixed(1).padStart(6)} km  ${circuit}  ours ${ours.join(', ')}  wiki ${w.map((v) => v.toFixed(4)).join(', ')}`);
}
console.log(fail ? `\n${fail}곳이 ${LIMIT_KM}km 넘게 다르다.` : `\n모두 ${LIMIT_KM}km 안.`);
process.exitCode = fail ? 1 : 0;
