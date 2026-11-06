// 레이싱 위켄드 묶기: weekendEnd가 속한 주(월요일 시작)로 그룹화한다.
// weekendEnd는 서킷 현지 날짜 'YYYY-MM-DD'(이벤트 고유 정보)라 시간대 변환 없이 달력 산술만 한다.
// 스펙: design/HOME-SPEC.md 4장.
import { getParts, zonedDateFromKey, formatDayRange, formatRelDay, DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from '../schedule/format.js';
import { t } from '../i18n/t.js';
import { getPrimarySession } from '../schedule/utils.js';
import { resolveTimeState, isAliveState } from './time.js';

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

// ---------- 주 묶음 이름 (UX v2 L9) ----------
// 지금이 속한 레이싱 위켄드(월요일 키, 보는 사람 시간대). 월요일은 지난 주말 경기가 아직 안 끝났을 때만 지난 주에 속하고,
// 다 끝났으면 다가오는 주말이 '이번 주말'이다.
export function getCurrentWeekKey(now = new Date(), races = [], { timeZone = DEFAULT_TIME_ZONE } = {}) {
  const p = getParts(now, { timeZone });
  if (!p) return null;
  const today = `${p.year}-${p.month}-${p.day}`;
  const own = getWeekStartKey(today);
  if (p.weekday !== 1) return own;
  const prev = toDateKey(parseDateKey(own) - 7 * DAY_MS);
  return races.some((race) => getRaceWeekKey(race) === prev && isAliveState(resolveTimeState(race, now).state)) ? prev : own;
}

const ms = (v) => (v ? new Date(v).getTime() : null);
// 경기 묶음 + 보는 사람 시간대의 날짜 구간 { weekKey, races, from, to }.
// 구간: 시각이 있는 경기는 첫 세션 ~ 대표 세션 시작, 시각이 하나도 없는 경기(취소분 등)는 서킷 현지 주말 날짜(정오).
export function groupRaceWeeks(races = [], { timeZone = DEFAULT_TIME_ZONE } = {}) {
  return groupRacesByWeekend(races).map((g) => {
    const times = g.races.flatMap((race) => {
      const starts = (race.sessions || []).map((x) => ms(x.startUtc)).filter((x) => x != null);
      if (starts.length) return [Math.min(...starts), ms(getPrimarySession(race)?.startUtc) ?? Math.min(...starts)];
      return [ms(zonedDateFromKey(race.weekendStart, '12:00', timeZone)), ms(zonedDateFromKey(race.weekendEnd, '12:00', timeZone))];
    }).filter((x) => x != null);
    return { ...g, from: times.length ? new Date(Math.min(...times)) : null, to: times.length ? new Date(Math.max(...times)) : null };
  });
}
// 주 이름 { kind: 'this' | 'next' | null, main, sub }. 이번·다음 주말은 '이번 주말' + 날짜 구간, 그 밖은 날짜 구간 + 상대 날짜.
export function getWeekName(group, now = new Date(), { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE, races = [] } = {}) {
  const cur = getCurrentWeekKey(now, races, { timeZone });
  const next = cur ? toDateKey(parseDateKey(cur) + 7 * DAY_MS) : null;
  const range = group?.from ? formatDayRange(group.from, group.to, { locale, timeZone }) : '';
  if (group?.weekKey === cur) return { kind: 'this', main: t(locale, 'week.this'), sub: range };
  if (group?.weekKey === next) return { kind: 'next', main: t(locale, 'week.next'), sub: range };
  return { kind: null, main: range, sub: group?.from ? formatRelDay(group.from, now, { locale, timeZone }) : '' };
}
