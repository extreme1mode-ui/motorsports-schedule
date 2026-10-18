// 경기별 제목. 빌드(tools/build-race-pages.mjs)가 정적 페이지 <title>·<h1>에 쓰고, 앱이 탭 제목에 쓴다 —
// 한 곳에서 만들어야 /race/<id>로 들어왔을 때와 앱 안에서 열었을 때 제목이 같다.
const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

const seasonYearOf = (r) => (/^\d{4}$/.test(String(r.season)) ? String(r.season)
  : (/(\d{4})/.exec(r.weekendStart || r.raceDateLocal || r.id || '')?.[1] || null));

// '호주 그랑프리 · F1 2026'
export function raceHeading(race) {
  const name = text(race.nameKo) || text(race.name);
  return [name, [race.series, seasonYearOf(race)].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
}

// '호주 그랑프리 · F1 2026 | Gantry'
export function raceTitle(race) {
  return `${raceHeading(race)} | Gantry`;
}
