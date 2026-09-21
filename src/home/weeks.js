// 레이싱 위켄드 묶기: weekendEnd가 속한 주(월요일 시작)로 그룹화한다.
// weekendEnd는 서킷 현지 날짜 'YYYY-MM-DD'(이벤트 고유 정보)라 시간대 변환 없이 달력 산술만 한다.
// 스펙: design/HOME-SPEC.md 4장.

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function toDateKey(utcMs) {
  const d = new Date(utcMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// 해당 날짜가 속한 주의 월요일 날짜키. 예) '2026-09-20'(일) → '2026-09-14'
export function getWeekStartKey(dateKey) {
  const ms = parseDateKey(dateKey);
  if (ms === null) return null;
  const day = new Date(ms).getUTCDay(); // 0=일 … 6=토
  const offset = (day + 6) % 7;          // 월요일까지 며칠 거슬러 갈지
  return toDateKey(ms - offset * DAY_MS);
}

// 주 시작(월)·끝(일) 날짜키.
export function getWeekRange(dateKey) {
  const start = getWeekStartKey(dateKey);
  if (!start) return null;
  return { start, end: toDateKey(parseDateKey(start) + 6 * DAY_MS) };
}

// 경기가 속한 레이싱 위켄드 키 = weekendEnd가 속한 주의 월요일.
export function getRaceWeekKey(race) {
  return getWeekStartKey(race?.weekendEnd) || null;
}

// races → [{ weekKey, start, end, races }] (주 오름차순, 그룹 안 순서는 입력 순서 유지).
// 주 키를 만들 수 없는 경기는 건너뛴다.
export function groupRacesByWeekend(races = []) {
  const groups = new Map();
  for (const race of races) {
    const weekKey = getRaceWeekKey(race);
    if (!weekKey) continue;
    if (!groups.has(weekKey)) groups.set(weekKey, { weekKey, ...getWeekRange(weekKey), races: [] });
    groups.get(weekKey).races.push(race);
  }
  return [...groups.values()].sort((a, b) => (a.weekKey < b.weekKey ? -1 : a.weekKey > b.weekKey ? 1 : 0));
}

// 특정 주의 그룹만.
export function getRacesInWeek(races = [], weekKey) {
  return races.filter((race) => getRaceWeekKey(race) === weekKey);
}
