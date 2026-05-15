import { KST_TIMEZONE, getCategoryForSeries } from './constants.js';

function pad(value) {
  return String(value).padStart(2, '0');
}

function toParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
}

export function getDateKeyInTimeZone(date, timeZone) {
  const parts = toParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getDateKeyInKst(date) {
  return getDateKeyInTimeZone(date, KST_TIMEZONE);
}

export function getTimeLabelInTimeZone(isoString, timeZone) {
  const parts = toParts(new Date(isoString), timeZone);
  return `${parts.hour}:${parts.minute}`;
}

export function getDateTimeLabelInTimeZone(isoString, timeZone) {
  const parts = toParts(new Date(isoString), timeZone);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export function getTimeLabelInKst(isoString) {
  return getTimeLabelInTimeZone(isoString, KST_TIMEZONE);
}

export function getDateTimeLabelInKst(isoString) {
  return getDateTimeLabelInTimeZone(isoString, KST_TIMEZONE);
}

export function createLocalDateIso(dateKey, time = '00:00') {
  return `${dateKey}T${time}:00`;
}

export function coerceIsoWithOffset(value) {
  if (!value) return null;
  if (/([+-]\d{2}:\d{2}|Z)$/.test(value)) return value;
  return `${value}Z`;
}

export function offsetToDisplayName(offset) {
  if (!offset) return null;
  const normalized = offset.startsWith('+') || offset.startsWith('-') ? offset : `+${offset}`;
  return `UTC${normalized.slice(0, 6)}`;
}

function shiftDateByOffset(date, offset) {
  const normalizedOffset = (offset || '+00:00').slice(0, 6);
  const sign = normalizedOffset.startsWith('-') ? -1 : 1;
  const [hours, minutes] = normalizedOffset.replace(/[+-]/, '').split(':').map(Number);
  return new Date(date.getTime() + sign * ((hours * 60) + minutes) * 60000);
}

export function getDateKeyWithOffset(isoString, offset) {
  const shifted = shiftDateByOffset(new Date(isoString), offset);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function getTimeLabelWithOffset(isoString, offset) {
  const shifted = shiftDateByOffset(new Date(isoString), offset);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

export function getDateTimeLabelWithOffset(isoString, offset) {
  const shifted = shiftDateByOffset(new Date(isoString), offset);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

export function localDateTimeToUtc(dateKey, time, timeZone) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const safeTime = /^\d{2}:\d{2}$/.test(time || '') ? time : '00:00';
  const [hour, minute] = safeTime.split(':').map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const zoneParts = toParts(utcGuess, timeZone);
  const zoneInstant = Date.UTC(
    Number(zoneParts.year),
    Number(zoneParts.month) - 1,
    Number(zoneParts.day),
    Number(zoneParts.hour),
    Number(zoneParts.minute),
    Number(zoneParts.second),
  );
  return new Date(utcGuess.getTime() - (zoneInstant - utcGuess.getTime()));
}

export function localDateTimeWithOffsetToUtc(dateKey, time, offset) {
  const normalized = offset?.slice(0, 6) || '+00:00';
  return new Date(`${dateKey}T${time || '00:00'}:00${normalized}`);
}

export function normalizeSessions(sessions = []) {
  return sessions.map((session) => ({
    t: session.t || session.name || session.sessionName || '세션',
    kst: session.kst ?? 'TBA',
    local: session.local ?? 'TBA',
    startUtc: session.startUtc || null,
    endUtc: session.endUtc || null,
  }));
}

export function buildFallbackEventWindow(race) {
  const startUtc = localDateTimeToUtc(race.weekendStart, '00:00', race.timezone);
  const endUtc = localDateTimeToUtc(race.weekendEnd, '23:59', race.timezone);
  const mainStartUtc = race.raceKstIso
    ? new Date(race.raceKstIso)
    : localDateTimeToUtc(race.raceDateLocal || race.weekendStart, /^\d{2}:\d{2}$/.test(race.localTime || '') ? race.localTime : '00:00', race.timezone);
  return { startUtc, endUtc, mainStartUtc };
}

export function calculateEventStatus(race, now = new Date()) {
  const startUtc = race.eventStartUtc ? new Date(race.eventStartUtc) : null;
  const endUtc = race.eventEndUtc ? new Date(race.eventEndUtc) : null;
  if (!startUtc || !endUtc) return 'upcoming';
  if (now < startUtc) return 'upcoming';
  if (now > endUtc) return 'completed';
  return 'live';
}

export function buildNormalizedRace(race, source, now = new Date()) {
  const sessions = normalizeSessions(race.sessions);
  const category = race.category || getCategoryForSeries(race.series);
  const fallbackWindow = buildFallbackEventWindow(race);
  const eventStartUtc = race.eventStartUtc || fallbackWindow.startUtc.toISOString();
  const eventEndUtc = race.eventEndUtc || fallbackWindow.endUtc.toISOString();
  const primaryStartUtc = race.primaryStartUtc || fallbackWindow.mainStartUtc.toISOString();
  const localTime = race.localTime ?? (race.sessions?.find((session) => session.t === '결승' || session.name === 'Race')?.local ?? 'TBA');
  const kstTime = race.kstTime ?? (race.sessions?.find((session) => session.t === '결승' || session.name === 'Race')?.kst?.slice(11, 16) ?? null);
  const normalized = {
    ...race,
    category,
    eventName: race.eventName || race.name,
    startDate: race.startDate || race.weekendStart,
    endDate: race.endDate || race.weekendEnd,
    localTime,
    kstTime,
    sessions,
    eventStartUtc,
    eventEndUtc,
    primaryStartUtc,
    source,
    raceDateKst: race.raceDateKst || getDateKeyInKst(primaryStartUtc),
    raceDateLocal: race.raceDateLocal || race.weekendEnd,
    raceKstIso: race.raceKstIso || primaryStartUtc,
  };

  normalized.status = calculateEventStatus(normalized, now);
  return normalized;
}

export function sortRacesByPrimaryDate(races) {
  return [...races].sort((left, right) => {
    const leftTime = new Date(left.primaryStartUtc).getTime();
    const rightTime = new Date(right.primaryStartUtc).getTime();
    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.round - right.round;
  });
}

export function markNextRace(races, now = new Date()) {
  const nextRace = races.find((race) => race.status === 'upcoming');
  return races.map((race) => ({
    ...race,
    isNextRace: nextRace ? race.id === nextRace.id : false,
  }));
}

export function formatOpenF1SessionName(name) {
  const sessionMap = {
    Race: '결승',
    Qualifying: '예선',
    Sprint: '스프린트',
    'Sprint Qualifying': '스프린트 예선',
    'Practice 1': '연습 1',
    'Practice 2': '연습 2',
    'Practice 3': '연습 3',
  };
  return sessionMap[name] || name;
}
