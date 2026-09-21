// 홈 전용 시간 판정. 다른 화면이 쓰는 calculateEventStatus / buildNormalizedRace / normalizeSessions는 건드리지 않는다.
// 스펙: design/HOME-SPEC.md 5장(TimeStat 6상태), 6장(LIVE 판정), 10장(취소 판정).
import { getPrimarySession, localDateTimeToUtc } from '../schedule/utils.js';
import { getParts, getCountdownParts, getDayDifference, DEFAULT_TIME_ZONE } from '../schedule/format.js';

export const TIME_STATES = ['live', 'soon', 'upcoming', 'tba', 'done', 'cancelled'];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SOON_WINDOW_MS = DAY_MS;

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// 취소 판정. 스펙 10장은 cancellationNote를 기준으로 하지만, 통합 데이터(season-2026.json)에는 그 필드가 없고
// buildNormalizedRace가 원본 status 'cancelled'를 보존하므로 둘 중 하나면 취소로 본다.
export function isCancelled(race) {
  return Boolean(race?.cancellationNote) || race?.status === 'cancelled';
}

// 판정 기준 시각. 대표 세션의 startUtc/endUtc. 없으면 "시각 미정"(raceKstIso 폴백은 쓰지 않는다 — buildNormalizedRace가 채운 값이라 확정 시각이 아니다).
export function getReferenceTimes(race) {
  const primary = getPrimarySession(race);
  return { start: toDate(primary?.startUtc), end: toDate(primary?.endUtc), session: primary };
}

// 주말 구간. weekendStart/weekendEnd는 **서킷 현지 날짜**라 race.timezone으로 해석한다 (시청자 시간대와 무관).
export function getWeekendRange(race) {
  const tz = race?.timezone || DEFAULT_TIME_ZONE;
  const start = race?.weekendStart ? toDate(localDateTimeToUtc(race.weekendStart, '00:00', tz)) : null;
  const end = race?.weekendEnd ? toDate(localDateTimeToUtc(race.weekendEnd, '23:59', tz)) : null;
  return { start, end };
}
export function getWeekendEnd(race) { return getWeekendRange(race).end; }

// 시청자 시간대에서 00:00~05:59 시작이면 심야.
export function isNight(date, timeZone = DEFAULT_TIME_ZONE) {
  const p = getParts(date, { timeZone });
  return !!p && Number(p.hour) < 6;
}

/**
 * 6상태 판정.
 *   live       시작·종료 모두 확정 & 현재가 그 사이 (종료 시각이 없으면 절대 live가 아니다)
 *   soon       시작 확정 & 24시간 이내
 *   upcoming   시작 확정 & 24시간 초과
 *   tba        시작 미확정 & 주말 구간이 안 지남
 *   done       시작을 지났거나 주말 구간이 끝남
 *   cancelled  취소
 */
export function resolveTimeState(race, now = new Date(), { timeZone = DEFAULT_TIME_ZONE } = {}) {
  const at = toDate(now) || new Date();
  const { start, end, session } = getReferenceTimes(race);
  const { start: weekendStart, end: weekendEnd } = getWeekendRange(race);
  const base = { start, end, session, weekendStart, weekendEnd, isNight: start ? isNight(start, timeZone) : false, msUntilStart: start ? start.getTime() - at.getTime() : null };

  if (isCancelled(race)) return { ...base, state: 'cancelled' };

  if (!start) {
    const weekendPassed = weekendEnd ? at > weekendEnd : false;
    return { ...base, state: weekendPassed ? 'done' : 'tba' };
  }

  if (end && at >= start && at < end) return { ...base, state: 'live' };
  if (at < start) return { ...base, state: base.msUntilStart <= SOON_WINDOW_MS ? 'soon' : 'upcoming' };
  return { ...base, state: 'done' };
}

// ---------- 표기 ----------
// 'HH:MM:SS' — soon 카운트다운. 음수는 00:00:00. (숫자는 format.getCountdownParts, 표기만 여기서)
export function formatCountdown(ms) {
  const { hours, minutes, seconds } = getCountdownParts(ms);
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
}

// 'D-3' / 'D-DAY' — 시청자 시간대의 날짜 차이 기준.
export function formatDday(date, now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const days = getDayDifference(date, now, { timeZone });
  if (days === null) return '';
  return days <= 0 ? 'D-DAY' : `D-${days}`;
}
