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
  // 'UTC+03:00' 같은 오프셋 표기(OpenF1 경로에서 IANA 시간대를 못 찾았을 때)는 Intl이 못 읽으므로 오프셋 계산으로 처리
  const offsetMatch = /^UTC([+-]\d{2}:\d{2})$/.exec(timeZone || '');
  if (offsetMatch) return localDateTimeWithOffsetToUtc(dateKey, /^\d{2}:\d{2}$/.test(time || '') ? time : '00:00', offsetMatch[1]);
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

export const SESSION_KINDS = ['race', 'finish', 'qualifying', 'sprint', 'practice', 'other'];

// 표시 라벨(t) → 세션 종류. season-2026.json은 kind를 직접 갖고 있어 이 표를 거치지 않고,
// kind가 없는 세션(OpenF1 응답 등)만 라벨로 추론한다. 한글 키는 과거 데이터 호환용.
const SESSION_KIND_BY_LABEL = {
  '결승': 'race',
  'Race': 'race',
  'Power Stage': 'race',
  '체커기': 'finish',
  '예선': 'qualifying',
  'Qualifying': 'qualifying',
  '탑 퀄리': 'qualifying',
  '스프린트 예선': 'qualifying',
  'Sprint Qualifying': 'qualifying',
  '스프린트': 'sprint',
  'Sprint': 'sprint',
  '연습 1': 'practice',
  '연습 2': 'practice',
  '연습 3': 'practice',
  'Practice 1': 'practice',
  'Practice 2': 'practice',
  'Practice 3': 'practice',
  '프리 프랙티스': 'practice',
};

const SESSION_KIND_BY_LOWER_LABEL = Object.fromEntries(
  Object.entries(SESSION_KIND_BY_LABEL).map(([label, kind]) => [label.toLowerCase(), kind]),
);

// 같은 라벨로 반복 경고하지 않도록 한 번 알린 라벨을 기억한다.
const warnedSessionLabels = new Set();

export function getSessionKind(label) {
  const trimmed = typeof label === 'string' ? label.trim() : '';
  const kind = SESSION_KIND_BY_LABEL[trimmed] || SESSION_KIND_BY_LOWER_LABEL[trimmed.toLowerCase()];
  if (kind) return kind;
  if (!warnedSessionLabels.has(trimmed)) {
    warnedSessionLabels.add(trimmed);
    console.warn(`[schedule] Unmapped session label, using kind "other": "${trimmed}"`);
  }
  return 'other';
}

// 세션 표시 라벨을 kind 기준으로 한글화한다. 원문은 tEn에 남긴다.
// 이미 한글이면(OpenF1 경로의 formatOpenF1SessionName 결과 등) 그대로 둔다. kind 'other'는 원문 유지.
const HANGUL = /[가-힣]/;
const SESSION_CLASS = /-\s*((?:HYPERCAR|LMGT3|LMP2|LMP3|GTP|GTD)(?:\s*&\s*(?:HYPERCAR|LMGT3|LMP2|LMP3|GTP|GTD))*)/i;

export function formatSessionLabelKo(label, kind) {
  const t = typeof label === 'string' ? label.trim() : '';
  if (!t || HANGUL.test(t)) return t;
  const num = (re) => { const m = t.match(re); return m ? ` ${m[1]}` : ''; };
  const cls = (() => { const m = t.match(SESSION_CLASS); return m ? ` · ${m[1].replace(/\s*&\s*/g, ' & ').toUpperCase()}` : ''; })();
  const group = (() => { const m = t.match(/Group\s+([A-Z])/i); return m ? ` ${m[1].toUpperCase()}조` : ''; })();
  const combined = /Combined/i.test(t) ? ' 통합' : '';

  switch (kind) {
    case 'race':
      if (/Power Stage/i.test(t)) return '파워 스테이지';
      return `결승${num(/^Race\s+(\d+)$/i)}`;
    case 'finish':
      return /Podium/i.test(t) ? '포디움' : '체커기';
    case 'sprint':
      return '스프린트';
    case 'qualifying':
      if (/Sprint Qualifying|Sprint Shootout/i.test(t)) return '스프린트 예선';
      if (/Superpole/i.test(t)) return '슈퍼폴';
      if (/Hyperpole/i.test(t)) return `하이퍼폴${num(/Hyperpole\s+(\d+)/i)}${cls}`;
      if (/Top Qualifying/i.test(t)) return `탑 퀄리${num(/Top Qualifying\s+(\d+)/i)}`;
      return `예선${num(/Qualifying\s+(\d+)/i)}${group}${combined}${cls}`;
    case 'practice':
      if (/Shakedown/i.test(t)) return '셰이크다운';
      if (/Warm[- ]?up/i.test(t)) return '워밍업';
      return `연습${num(/Practice\s*#?(\d+)/i)}${/Night/i.test(t) ? ' (야간)' : ''}`;
    default:
      // kind 'other': 테스트·이벤트성 세션. WRC 'SS1 〈스테이지명〉'은 고유명이라 그대로 둔다.
      if (/^SS\d+\b/i.test(t)) return t;
      if (/Bronze Test/i.test(t)) return '브론즈 테스트';
      if (/Pit Walk/i.test(t)) return '피트 워크';
      if (/Warm[- ]?up/i.test(t)) return '워밍업';
      if (/Spa Parade/i.test(t)) return '스파 퍼레이드';
      if (/Test Day/i.test(t)) return `테스트${num(/Session\s+(\d+)/i)}`;
      if (/Test/i.test(t)) return `공식 테스트${num(/Session\s+(\d+)/i)}`;
      return t;
  }
}

// 리스트 표시명: 영문만 있을 때 시리즈 공통 접두어를 뗀다. 목록은 season-2026.json에서 실측한 것만
// (GTWC 11경기 중 5경기가 같은 37자 접두어 — 잘리면 여섯 줄이 똑같이 보인다). 다른 시리즈엔 공통 접두어가 없다.
const SERIES_NAME_PREFIXES = {
  GTWC: [/^GT World Challenge Europe Sprint Cup\s*[–-]\s*/i],
};

export function stripSeriesPrefix(name, series) {
  if (typeof name !== 'string') return name ?? null;
  for (const re of SERIES_NAME_PREFIXES[series] || []) {
    const stripped = name.replace(re, '');
    if (stripped && stripped !== name) return stripped.trim();
  }
  return name;
}

// 중계처: { name, region } 배열로 정규화. 옛 문자열 항목은 region 'global'로 취급. 지역 필터링은 아직 하지 않는다.
export const BROADCAST_REGIONS = ['global', 'KR', 'US'];
export function normalizeBroadcast(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => (typeof item === 'string' ? { name: item, region: 'global' } : item))
    .filter((item) => item && typeof item.name === 'string' && item.name.trim())
    .map((item) => ({ name: item.name, region: BROADCAST_REGIONS.includes(item.region) ? item.region : 'global' }));
}

export function normalizeSessions(sessions = []) {
  return sessions.map((session) => {
    const tEn = session.t || session.name || session.sessionName || '세션';
    // 데이터가 kind를 이미 갖고 있으면 그대로 쓰고, 없을 때만 라벨로 추론한다.
    const kind = SESSION_KINDS.includes(session.kind) ? session.kind : getSessionKind(tEn);
    return {
      t: formatSessionLabelKo(tEn, kind),
      tEn,
      kind,
      kst: session.kst ?? 'TBA',
      local: session.local ?? 'TBA',
      startUtc: session.startUtc || null,
      endUtc: session.endUtc || null,
    };
  });
}

// 대표 세션: race → sprint → 첫 세션 순.
export function getPrimarySession(race) {
  const sessions = Array.isArray(race?.sessions) ? race.sessions : [];
  return sessions.find((session) => session.kind === 'race')
    || sessions.find((session) => session.kind === 'sprint')
    || sessions[0]
    || null;
}

// 관심 수준에 따라 보여줄 세션. 어떤 경기도 0개로 보이지 않도록 최소 대표 세션은 남긴다.
// 'off'는 시리즈 숨김과 별개이므로 여기서는 'race'와 같게 처리한다.
export function getVisibleSessions(race, mode = 'all') {
  const sessions = Array.isArray(race?.sessions) ? race.sessions : [];
  if (mode === 'all') return sessions;
  const visible = sessions.filter((session) => session.kind === 'race' || session.kind === 'finish');
  if (visible.length > 0) return visible;
  const primary = getPrimarySession(race);
  return primary ? [primary] : [];
}

// 표시명: `${field}Ko`가 있으면 그것, 없으면 원문(영문). 원문은 `${field}En`에 보존한다.
// 나중에 i18n(locale 인자)으로 정리할 자리.
const LOCALIZED_FIELDS = ['name', 'shortName', 'circuit', 'city', 'country'];

export function getLocalizedField(race, field, locale = 'ko') {
  const ko = race?.[`${field}Ko`];
  if (locale === 'ko' && typeof ko === 'string' && ko.trim()) return ko;
  return race?.[field] ?? null;
}

export function localizeRace(race, locale = 'ko') {
  const localized = { ...race };
  for (const field of LOCALIZED_FIELDS) {
    localized[`${field}En`] = race?.[`${field}En`] ?? race?.[field] ?? null;
    localized[field] = getLocalizedField(race, field, locale);
  }
  // 리스트용 짧은 이름: shortNameKo ?? shortName ?? (시리즈 접두어를 뗀 영문명)
  localized.shortName = localized.shortName || stripSeriesPrefix(localized.nameEn ?? localized.name, race?.series);
  return localized;
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

export function buildNormalizedRace(input, source, now = new Date()) {
  const race = localizeRace(input);
  const sessions = normalizeSessions(race.sessions);
  const category = race.category || getCategoryForSeries(race.series);
  const fallbackWindow = buildFallbackEventWindow(race);
  const eventStartUtc = race.eventStartUtc || fallbackWindow.startUtc.toISOString();
  const eventEndUtc = race.eventEndUtc || fallbackWindow.endUtc.toISOString();
  const primaryStartUtc = race.primaryStartUtc || fallbackWindow.mainStartUtc.toISOString();
  const primarySession = getPrimarySession({ sessions });
  const localTime = race.localTime ?? (primarySession?.local ?? 'TBA');
  const kstTime = race.kstTime ?? (primarySession?.kst && primarySession.kst !== 'TBA' ? primarySession.kst.slice(11, 16) : null);
  const normalized = {
    ...race,
    category,
    eventName: race.eventName || race.name,
    startDate: race.startDate || race.weekendStart,
    endDate: race.endDate || race.weekendEnd,
    localTime,
    kstTime,
    sessions,
    broadcast: normalizeBroadcast(race.broadcast),
    eventStartUtc,
    eventEndUtc,
    primaryStartUtc,
    source,
    raceDateKst: race.raceDateKst || getDateKeyInKst(new Date(primaryStartUtc)),
    raceDateLocal: race.raceDateLocal || race.weekendEnd,
    raceKstIso: race.raceKstIso || primaryStartUtc,
  };

  // 취소는 데이터가 결정한다. 그 외('scheduled' 등)는 현재 시각 기준으로 upcoming/live/completed를 계산.
  normalized.status = race.status === 'cancelled' ? 'cancelled' : calculateEventStatus(normalized, now);
  return normalized;
}

// 시리즈/카테고리 헤더 집계. 모바일·데스크톱이 각자 세던 것을 하나로. includeInRoundCount === false는 제외.
// rounds는 데이터에 있는 경기 수(취소 포함) — F1 2026은 24.
export function getSeriesStats(races = []) {
  const counted = races.filter((race) => race.includeInRoundCount !== false);
  return {
    rounds: counted.length,
    done: counted.filter((race) => race.status === 'completed').length,
    upcoming: counted.filter((race) => race.status === 'upcoming' || race.status === 'live').length,
    cancelled: counted.filter((race) => race.status === 'cancelled').length,
  };
}

export function sortRacesByPrimaryDate(races) {
  return [...races].sort((left, right) => {
    const leftTime = new Date(left.primaryStartUtc).getTime();
    const rightTime = new Date(right.primaryStartUtc).getTime();
    if (leftTime !== rightTime) return leftTime - rightTime;
    const leftOrder = left.round ?? left.plannedRound ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.round ?? right.plannedRound ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
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
