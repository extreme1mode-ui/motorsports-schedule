import { KST_TIMEZONE, getCategoryForSeries } from './constants.js';
import { formatDateKey, formatTime, formatDateTimeKey, zonedDateFromKey } from './format.js';

function pad(value) {
  return String(value).padStart(2, '0');
}

// 날짜·시간 포매팅은 ./format.js가 단일 지점. 아래는 기존 호출부를 위한 얇은 래퍼.
export function getDateKeyInTimeZone(date, timeZone) {
  return formatDateKey(date, { timeZone });
}

export function getDateKeyInKst(date) {
  return getDateKeyInTimeZone(date, KST_TIMEZONE);
}

export function getTimeLabelInTimeZone(isoString, timeZone) {
  return formatTime(isoString, { timeZone });
}

export function getDateTimeLabelInTimeZone(isoString, timeZone) {
  return formatDateTimeKey(isoString, { timeZone });
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
  return zonedDateFromKey(dateKey, time, timeZone);
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

// 세션 표시 라벨. 데이터의 원문(tEn)은 영문이라 'en'은 그대로 돌려주고, 'ko'는 kind 기준으로 한글화한다.
// 렌더 시점에 호출한다(로드 시점에 굳히지 않는다). 이미 한글이면 그대로. kind 'other'는 원문 유지.
const HANGUL = /[가-힣]/;
const SESSION_CLASS = /-\s*((?:HYPERCAR|LMGT3|LMP2|LMP3|GTP|GTD)(?:\s*&\s*(?:HYPERCAR|LMGT3|LMP2|LMP3|GTP|GTD))*)/i;

export function formatSessionLabel(label, kind, locale = 'ko') {
  const t = typeof label === 'string' ? label.trim() : '';
  if (!t || locale !== 'ko' || HANGUL.test(t)) return t;
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
export const BROADCAST_ACCESS = ['free', 'paid'];

// { name, region, url, access, excludeRegions } — url/access/excludeRegions는 데이터 값을 그대로 둔다 (코드에서 URL을 만들지 않는다).
export function normalizeBroadcast(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => (typeof item === 'string' ? { name: item, region: 'global' } : item))
    .filter((item) => item && typeof item.name === 'string' && item.name.trim())
    .map((item) => ({
      name: item.name,
      region: BROADCAST_REGIONS.includes(item.region) ? item.region : 'global',
      url: typeof item.url === 'string' && item.url ? item.url : null,
      access: BROADCAST_ACCESS.includes(item.access) ? item.access : null,
      excludeRegions: Array.isArray(item.excludeRegions) ? item.excludeRegions.filter((r) => typeof r === 'string') : [],
    }));
}

export function normalizeSessions(sessions = []) {
  return sessions.map((session) => {
    // 이미 정규화된 세션(tEn만 있음)이 다시 들어와도 같은 결과가 나오게 tEn을 먼저 본다 (loadScheduleData가 병합 후 재정규화한다)
    const tEn = session.tEn || session.t || session.name || session.sessionName || '세션';
    // 데이터가 kind를 이미 갖고 있으면 그대로 쓰고, 없을 때만 라벨로 추론한다.
    const kind = SESSION_KINDS.includes(session.kind) ? session.kind : getSessionKind(tEn);
    return {
      tEn,   // 표시 라벨은 렌더 시점에 formatSessionLabel(tEn, kind, locale)로
      kind,
      kst: session.kst ?? 'TBA',
      local: session.local ?? 'TBA',
      startUtc: session.startUtc || null,
      endUtc: session.endUtc || null,
    };
  });
}

// 경기 시작 시각(UTC ISO). 대표 세션의 startUtc만 신뢰한다 — 없으면 "시각 미정".
// (raceKstIso / kstTime은 데이터 필드로만 두고 판정·정렬에는 쓰지 않는다.)
export function getRaceStartUtc(race) {
  return getPrimarySession(race)?.startUtc || null;
}

// 달력에 그릴 '레이스 위크 막대'. 경기 하나가 주말 전체를 잇는 막대 하나가 된다.
//
// 구간은 각 세션의 startUtc를 **시청자 시간대**로 옮긴 날짜의 최소~최대다.
// weekendStart/weekendEnd로 계산하면 안 된다 — 그건 서킷 현지 날짜라서 시청자 달력과 어긋난다
// (라스베이거스: 현지 11/19~21이지만 KST로는 11/20~22).
//
//   parts        use-format의 fmt.parts. (isoOrDate) => { year, month, day, ... }
//   year, month  달력이 보여주는 연/월 (month는 0-based — Date와 같게)
//   firstDow     1일의 요일 (0=일). 달력 cells 배열과 같은 기준
//   daysInMonth  그 달의 일수
//   maxLanes     한 주에 쌓을 수 있는 막대 줄 수. 넘치면 +N으로 흘린다
//
// 반환 { weeks: [{ segments, overflow, byDay }] }  — 주는 일요일 시작, cells를 7개씩 자른 것과 1:1
//   segments  [{ race, from, to, startCol, endCol, lane, roundStart, roundEnd }]
//             주 경계를 넘는 구간은 주마다 조각으로 쪼갠다. roundStart/roundEnd가 false인 쪽은
//             다음(이전) 줄로 이어진다는 뜻이라 호출부가 모서리를 각지게 그린다.
//             lane은 달 전체에서 한 번만 배정해서, 쪼개진 조각들이 줄을 바꾸지 않는다.
//   overflow  { [day]: n }  레인이 모자라 못 그린 조각 수
//   byDay     { [day]: race[] }  그 날을 덮는 경기들 (칸 클릭용)
export function buildRaceWeekBars(races = [], { parts, year, month, firstDow, daysInMonth, maxLanes = 3 }) {
  const dayOf = (value) => {
    const p = parts(value);
    if (!p || Number(p.year) !== year || Number(p.month) - 1 !== month) return null;   // 표시 중인 달 밖은 잘라낸다
    return Number(p.day);
  };

  // --- 경기별 구간 ---
  const spans = [];
  for (const race of races) {
    const sessions = (Array.isArray(race?.sessions) ? race.sessions : []).filter((x) => x.startUtc);
    let days = sessions.map((x) => dayOf(x.startUtc)).filter((d) => d !== null);
    if (!sessions.length) {
      // 시각이 하나도 없는 경기(2027 데이터, 취소분)는 대표 시각 하루짜리 구간.
      const only = dayOf(getRaceStartUtc(race) || race.primaryStartUtc);
      days = only ? [only] : [];
    }
    if (!days.length) continue;
    spans.push({ race, from: Math.min(...days), to: Math.max(...days) });
  }

  // --- 레인 배정 (달 전체에서 한 번만) ---
  // 주 단위로 배정하면 주 경계에서 쪼갠 두 조각이 서로 다른 레인을 받아 막대가 줄을 바꿔 버린다.
  // 그래서 쪼개기 **전에** span 단위로 배정하고, 거기서 나온 조각들이 같은 lane을 그대로 물려받는다.
  // 정렬 3번째 키(race.id)는 결정성용 — 같은 달을 다시 그려도 배치가 같아야 한다.
  spans.sort((a, b) => a.from - b.from
    || (b.to - b.from) - (a.to - a.from)
    || String(a.race.id ?? '').localeCompare(String(b.race.id ?? '')));

  const lanes = [];              // lane → 이미 놓인 span들
  const placedSpans = [];
  const overflowSpans = [];
  for (const span of spans) {
    let lane = lanes.findIndex((rows) => rows.every((r) => span.to < r.from || span.from > r.to));
    if (lane === -1) {
      if (lanes.length >= maxLanes) { overflowSpans.push(span); continue; }   // 자리 없음 → span 통째로 +N
      lane = lanes.length; lanes.push([]);
    }
    lanes[lane].push(span);
    span.lane = lane;
    placedSpans.push(span);
  }

  // --- 주 경계에서 쪼개기 ---
  const cellIndex = (d) => d + firstDow - 1;
  const weekOf = (d) => Math.floor(cellIndex(d) / 7);
  const colOf = (d) => cellIndex(d) % 7;
  const weekCount = Math.ceil((firstDow + daysInMonth) / 7);
  const weeks = Array.from({ length: weekCount }, () => ({ segments: [], overflow: {}, byDay: {} }));

  for (const { race, from, to } of spans) {
    for (let d = from; d <= to; d++) (weeks[weekOf(d)].byDay[d] = weeks[weekOf(d)].byDay[d] || []).push(race);
  }
  // 못 그린 span은 덮는 모든 날짜에 +1. 일부 주만 그려지는 일은 없다 — span 단위로 빠진다.
  for (const { from, to } of overflowSpans) {
    for (let d = from; d <= to; d++) weeks[weekOf(d)].overflow[d] = (weeks[weekOf(d)].overflow[d] || 0) + 1;
  }

  for (const { race, from, to, lane } of placedSpans) {
    for (let w = weekOf(from); w <= weekOf(to); w++) {
      const segFrom = Math.max(from, w * 7 - firstDow + 1);
      const segTo = Math.min(to, w * 7 + 6 - firstDow + 1);
      if (segFrom > segTo) continue;
      weeks[w].segments.push({
        race, from: segFrom, to: segTo, lane,
        startCol: colOf(segFrom), endCol: colOf(segTo),
        roundStart: segFrom === from, roundEnd: segTo === to,
      });
    }
  }

  return { weeks };
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

// 표시명은 렌더 시점에 locale로 고른다. 정규화된 race는 원문 필드(name/circuit/city/country = 영문)와 *Ko를 그대로 들고 있다.
const text = (v) => (typeof v === 'string' && v.trim() ? v : null);

export function getLocalizedField(race, field, locale = 'ko') {
  const ko = text(race?.[`${field}Ko`]);
  const en = text(race?.[`${field}En`]) ?? text(race?.[field]);
  return (locale === 'ko' ? (ko ?? en) : (en ?? ko)) ?? null;
}

// { name, fullName, shortName, circuit, city, country } — ko: *Ko → 영문, en: 영문 → *Ko
export function getRaceLabels(race, locale = 'ko') {
  const nameKo = text(race?.nameKo); const nameEn = text(race?.nameEn) ?? text(race?.name);
  const shortKo = text(race?.shortNameKo);
  const shortEn = text(race?.shortName) ?? stripSeriesPrefix(nameEn, race?.series);   // OpenF1의 'X GP' 또는 시리즈 접두어 뗀 영문
  const fullName = (locale === 'ko' ? (nameKo ?? nameEn) : (nameEn ?? nameKo)) ?? null;
  const shortName = (locale === 'ko' ? (shortKo ?? nameKo ?? shortEn ?? nameEn) : (shortEn ?? nameEn ?? shortKo ?? nameKo)) ?? null;
  return {
    name: fullName,
    fullName,
    shortName,
    circuit: getLocalizedField(race, 'circuit', locale),
    city: getLocalizedField(race, 'city', locale),
    country: getLocalizedField(race, 'country', locale),
  };
}

// 중계처 노출: region이 'global'이거나 사용자 국가와 같은 것. 비면(방어) 전체를 그대로 보여준다.
// 노출 = (global 또는 내 국가) 이고 excludeRegions에 내 국가가 없음. 무료를 위로, 같은 등급 안에서는 데이터 순서 유지(안정 정렬).
export function getVisibleBroadcast(list = [], country = null) {
  if (!Array.isArray(list)) return [];
  const notExcluded = (b) => !(b.excludeRegions ?? []).includes(country);
  let visible = list.filter((b) => b && (b.region === 'global' || (country && b.region === country)) && notExcluded(b));
  if (!visible.length) visible = list.filter((b) => b && notExcluded(b));   // 데이터에 구멍이 있을 때의 안전망
  const rank = (b) => (b.access === 'free' ? 0 : 1);
  return visible.map((b, i) => [b, i]).sort((a, z) => (rank(a[0]) - rank(z[0])) || (a[1] - z[1])).map(([b]) => b);
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
