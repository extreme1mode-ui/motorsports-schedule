// 홈 전용 시간 판정. 다른 화면이 쓰는 calculateEventStatus / buildNormalizedRace / normalizeSessions는 건드리지 않는다.
// 스펙: design/HOME-SPEC.md 5장(TimeStat 6상태), 6장(LIVE 판정), 10장(취소 판정).
import { getPrimarySession, getVisibleSessions, localDateTimeToUtc } from '../schedule/utils.js';
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

// ---------- 세션 종료 시각 (표시용 추정) ----------
// ※ 아래 길이는 전부 **화면 표시용 추정치**다. 확정된 종료 시각이 아니다.
//    season-2026.json의 483개 세션에는 endUtc가 하나도 없어서, 이게 없으면 LIVE 판정이 영원히 거짓이 된다.
//    데이터 파일은 건드리지 않는다 — 런타임에만 계산해서 "지금 달리는 중"을 보여주는 용도로만 쓴다.
//    OpenF1처럼 실제 endUtc를 주는 경로에서는 그 값이 항상 우선한다.
const SESSION_MINUTES = { practice: 60, qualifying: 60, sprint: 60, finish: 30, other: 60 };
const DEFAULT_RACE_MINUTES = 120;

// 경기 이름에서 길이를 뽑는다 ('24 Hours of Le Mans' → 24, '후지 6시간' → 6).
// api/calendar.ics.js의 raceDurationFromName과 같은 규칙 — 한쪽만 고치면 캘린더와 화면이 어긋난다.
export function raceMinutesFromName(race) {
  const en = [race?.name, race?.nameEn].find((v) => typeof v === 'string') || '';
  const ko = typeof race?.nameKo === 'string' ? race.nameKo : '';
  const m = en.match(/(\d{1,2})\s*Hours?\b/i) || ko.match(/(\d{1,2})\s*시간?\b/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 24 ? n * 60 : null;
}

// 같은 주말에 kind 'finish'(체커기·포디움) 세션이 있으면 본경기 종료는 추정보다 그 시각을 먼저 쓴다.
function finishTimeOf(race) {
  const sessions = Array.isArray(race?.sessions) ? race.sessions : [];
  return toDate(sessions.find((x) => x.kind === 'finish' && x.startUtc)?.startUtc);
}

// 세션 종료. 데이터에 endUtc가 있으면 그대로, 없으면 kind별 기본 길이로 추정한다.
export function getSessionEnd(race, session) {
  if (!session) return null;
  const real = toDate(session.endUtc);
  if (real) return real;
  const start = toDate(session.startUtc);
  if (!start) return null;
  if (session.kind === 'race') {
    const finish = finishTimeOf(race);
    if (finish && finish > start) return finish;
    return new Date(start.getTime() + (raceMinutesFromName(race) || DEFAULT_RACE_MINUTES) * 60000);
  }
  return new Date(start.getTime() + (SESSION_MINUTES[session.kind] || SESSION_MINUTES.other) * 60000);
}

// ---------- 주말 진행 상태 ----------
// 본경기 시작 시각 하나만 보면 연습·예선이 달리는 중에도 'D-2'가 뜬다. 주말 전체를 세션 단위로 본다.
// 판정 대상은 getVisibleSessions(race, mode) — '본경기만'으로 둔 사용자에게 연습 진행 중을 띄우면 개인화와 모순된다.
export const WEEKEND_PHASES = ['before', 'session-live', 'session-soon', 'between', 'after'];
const SESSION_SOON_MS = 2 * HOUR_MS;

export function resolveWeekendPhase(race, now = new Date(), { mode = 'all' } = {}) {
  const at = toDate(now) || new Date();
  const ms = at.getTime();
  const { start: weekendStart, end: weekendEnd } = getWeekendRange(race);

  const sessions = getVisibleSessions(race, mode)
    .map((session) => ({ session, start: toDate(session.startUtc), end: getSessionEnd(race, session) }))
    .filter((x) => x.start)
    .sort((a, b) => a.start - b.start);

  // 볼 세션의 시각이 하나도 확정 안 됐으면 주말 구간만으로 판단한다.
  if (!sessions.length) {
    if (weekendEnd && at > weekendEnd) return { phase: 'after', session: null, startsInMs: null };
    if (weekendStart && at < weekendStart) return { phase: 'before', session: null, startsInMs: null };
    return { phase: 'between', session: null, startsInMs: null };
  }

  // 관심 수준을 반영한 '내 주말'의 시작 — 'race' 모드에서는 본경기 전까지 계속 before로 남는다.
  if (ms < sessions[0].start.getTime()) {
    const next = sessions[0];
    const startsInMs = next.start.getTime() - ms;
    if (startsInMs <= SESSION_SOON_MS) return { phase: 'session-soon', session: next.session, startsInMs };
    return { phase: 'before', session: next.session, startsInMs };
  }

  const live = sessions.find((x) => ms >= x.start.getTime() && x.end && ms < x.end.getTime());
  if (live) return { phase: 'session-live', session: live.session, startsInMs: live.start.getTime() - ms };

  const next = sessions.find((x) => x.start.getTime() > ms);
  if (!next) return { phase: 'after', session: null, startsInMs: null };   // 볼 세션이 전부 끝났다

  const startsInMs = next.start.getTime() - ms;
  if (startsInMs <= SESSION_SOON_MS) return { phase: 'session-soon', session: next.session, startsInMs };
  if (weekendEnd && at > weekendEnd) return { phase: 'after', session: null, startsInMs: null };
  return { phase: 'between', session: next.session, startsInMs };
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
  const { start, end: dataEnd, session } = getReferenceTimes(race);
  // 데이터에 종료 시각이 없으면 추정치로 메운다. 이게 없으면 live 조건이 영원히 거짓이다.
  const end = dataEnd || getSessionEnd(race, session);
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
