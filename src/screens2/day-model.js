// 일정·시리즈 화면이 쓰는 날짜 계산(순수 함수). 날짜는 보는 사람 시간대의 'YYYY-MM-DD'를 하루 번호(UTC 자정 기준 일수)로 바꿔 센다.
import { formatDateKey, zonedDateFromKey } from '../schedule/format.js';
import { getPrimarySession } from '../schedule/utils.js';
import { getSessionEnd, getMainSessionAt, resolveTimeState, isAliveState, isCancelled } from '../home/time.js';

const DAY_MS = 86400000;
export const dayOfKey = (key) => {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
};
export const keyOfDay = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
// 하루 번호 → { y, m(1-12), d, dow(0=일) }
export const partsOfDay = (n) => { const t = new Date(n * DAY_MS); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() }; };
// 하루 번호의 정오(보는 사람 시간대) — 표기용 시각
export const noonOfDay = (n, timeZone) => zonedDateFromKey(keyOfDay(n), '12:00', timeZone).getTime();
export const dayOf = (value, timeZone) => (value ? dayOfKey(formatDateKey(value, { timeZone })) : null);

// 경기의 달력 구간: 시각이 있는 세션의 날짜(보는 사람 시간대) 최소~최대. 하나도 없으면 대표 시각 하루.
export function raceSpan(race, timeZone) {
  const days = (race.sessions || []).filter((s) => s.startUtc).map((s) => dayOf(s.startUtc, timeZone));
  if (days.length) return [Math.min(...days), Math.max(...days)];
  const only = getPrimarySession(race)?.startUtc || race.primaryStartUtc;
  const d = only ? dayOf(only, timeZone) : null;
  return d == null ? null : [d, d];
}

// 관심 수준 순서(전체 세션 0 → 결승만 1 → 안 보기 2) — 점·막대가 넘쳐도 내 경기가 먼저
export const interestRank = (preferences, race) => ({ all: 0, race: 1 }[preferences?.series?.[race.series]] ?? 2);

// 고른 날의 세션(체커기 제외, 시각 순)
export function sessionsOnDay(race, day, timeZone) {
  return (race.sessions || []).filter((s) => s.startUtc && s.kind !== 'finish' && dayOf(s.startUtc, timeZone) === day)
    .sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));
}
export function sessionStateAt(race, s, now) {
  const at = new Date(now).getTime();
  const start = s.startUtc ? new Date(s.startUtc).getTime() : null;
  if (start == null) return 'tba';
  const end = getSessionEnd(race, s)?.getTime();
  if (end != null && at >= end) return 'done';
  if (at >= start) return 'live';
  return 'upcoming';
}
// 고른 날의 경기 순서: 진행 중 → 곧 시작(다음 세션 시각 순) → 끝남(그날 첫 세션 순) → 세션 없음 → 취소
export function dayRank(race, day, now, timeZone) {
  if (isCancelled(race)) return [4, 0];
  const ss = sessionsOnDay(race, day, timeZone);
  if (!ss.length) return [3, 0];
  const live = ss.find((s) => sessionStateAt(race, s, now) === 'live');
  if (live) return [0, new Date(live.startUtc).getTime()];
  const up = ss.filter((s) => sessionStateAt(race, s, now) === 'upcoming').map((s) => new Date(s.startUtc).getTime());
  if (up.length) return [1, Math.min(...up)];
  return [2, new Date(ss[0].startUtc).getTime()];
}

// 지난 경기인지(목록 접기용): 취소·시각 없음은 서킷 현지 주말 끝이 지났는지, 나머지는 상태가 끝남
export function isOver(race, now) {
  const st = resolveTimeState(race, now);
  if (isCancelled(race) || !getPrimarySession(race)?.startUtc) return !!st.weekendEnd && new Date(now) > st.weekendEnd;
  return !isAliveState(st.state);
}
// 목록 오른쪽 시각: 끝나지 않았으면 지금 기준 결승(결승이 둘이면 남은 결승), 끝났으면 대표 세션
export function rowTime(race, now) {
  const st = resolveTimeState(race, now).state;
  const s = st === 'done' ? getPrimarySession(race) : getMainSessionAt(race, now);
  return s?.startUtc || null;
}
