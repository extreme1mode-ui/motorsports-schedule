// 홈 전용 시간 판정. 다른 화면이 쓰는 calculateEventStatus / buildNormalizedRace / normalizeSessions는 건드리지 않는다.
// 스펙: design/HOME-SPEC.md 5장(TimeStat 6상태), 6장(LIVE 판정), 10장(취소 판정).
import { getPrimarySession, getTimeLabelInKst, getDateKeyInKst } from '../schedule/utils.js';

export const TIME_STATES = ['live', 'soon', 'upcoming', 'tba', 'done', 'cancelled'];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SOON_WINDOW_MS = DAY_MS;
const KST_OFFSET = '+09:00';
const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

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

// 판정 기준 시각. 대표 세션의 startUtc/endUtc, 없으면 raceKstIso로 폴백.
// buildNormalizedRace는 시각이 없는 경기에도 raceKstIso(주말 시작 00:00)를 채우므로,
// 폴백은 kstTime이 실제 HH:MM일 때만 "확정"으로 인정한다.
export function getReferenceTimes(race) {
  const primary = getPrimarySession(race);
  const start = toDate(primary?.startUtc) || (/^\d{2}:\d{2}$/.test(race?.kstTime || '') ? toDate(race?.raceKstIso) : null);
  const end = toDate(primary?.endUtc);
  return { start, end, session: primary };
}

// 주말 구간 끝 (weekendEnd는 KST 날짜키로 취급, 그날 23:59:59 KST).
export function getWeekendEndKst(race) {
  return race?.weekendEnd ? toDate(`${race.weekendEnd}T23:59:59${KST_OFFSET}`) : null;
}

// KST 00:00~05:59 시작이면 심야.
export function isNightKst(date) {
  const d = toDate(date);
  if (!d) return false;
  const hour = Number(getTimeLabelInKst(d.toISOString()).slice(0, 2));
  return hour >= 0 && hour < 6;
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
export function resolveTimeState(race, now = new Date()) {
  const at = toDate(now) || new Date();
  const { start, end, session } = getReferenceTimes(race);
  const weekendEnd = getWeekendEndKst(race);
  const base = { start, end, session, weekendEnd, isNight: start ? isNightKst(start) : false, msUntilStart: start ? start.getTime() - at.getTime() : null };

  if (isCancelled(race)) return { ...base, state: 'cancelled' };

  if (!start) {
    const weekendPassed = weekendEnd ? at > weekendEnd : false;
    return { ...base, state: weekendPassed ? 'done' : 'tba' };
  }

  if (end && at >= start && at < end) return { ...base, state: 'live' };
  if (at < start) return { ...base, state: base.msUntilStart <= SOON_WINDOW_MS ? 'soon' : 'upcoming' };
  return { ...base, state: 'done' };
}

// ---------- KST 포맷터 ----------

function kstParts(date) {
  const d = toDate(date);
  if (!d) return null;
  const [y, m, day] = getDateKeyInKst(d).split('-');
  const time = getTimeLabelInKst(d.toISOString());
  // 요일: KST 날짜를 UTC 자정으로 만들어 getUTCDay()로 읽는다 (로컬 TZ 무관).
  const weekday = DAYS_KO[new Date(Date.UTC(Number(y), Number(m) - 1, Number(day))).getUTCDay()];
  return { y, m, day, time, weekday };
}

// '09.26 (토)'
export function formatKstDate(date) {
  const p = kstParts(date);
  return p ? `${p.m}.${p.day} (${p.weekday})` : '';
}

// '20:00'
export function formatKstTime(date) {
  const p = kstParts(date);
  return p ? p.time : '';
}

// '09.26 (토) 20:00'  — upcoming 표기. 'KST' 접미사는 호출부가 붙인다.
export function formatKstDateTime(date) {
  const p = kstParts(date);
  return p ? `${p.m}.${p.day} (${p.weekday}) ${p.time}` : '';
}

// 'HH:MM:SS' — soon 카운트다운. 음수는 00:00:00.
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// 'D-3' / 'D-DAY' — KST 날짜 차이 기준.
export function formatDday(date, now = new Date()) {
  const d = toDate(date); const at = toDate(now);
  if (!d || !at) return '';
  const key = (x) => { const [y, m, dd] = getDateKeyInKst(x).split('-').map(Number); return Date.UTC(y, m - 1, dd); };
  const days = Math.round((key(d) - key(at)) / DAY_MS);
  return days <= 0 ? 'D-DAY' : `D-${days}`;
}
