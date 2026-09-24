import season2026 from './season-2026.json' with { type: 'json' };
import season2027 from './season-2027.json' with { type: 'json' };
import { SUPPORTED_SERIES } from './constants.js';
import { getRaceKey } from './highlights.js';
import {
  buildNormalizedRace,
  coerceIsoWithOffset,
  getDateKeyInKst,
  getDateKeyWithOffset,
  getDateTimeLabelInKst,
  getDateTimeLabelWithOffset,
  getTimeLabelInKst,
  getTimeLabelWithOffset,
  markNextRace,
  offsetToDisplayName,
  sortRacesByPrimaryDate,
} from './utils.js';

const OPEN_F1_MEETINGS_URL = 'https://api.openf1.org/v1/meetings';
const OPEN_F1_SESSIONS_URL = 'https://api.openf1.org/v1/sessions';

// 연도별 정적 시즌 데이터. OpenF1 API 실패 시 F1도 이 데이터로 떨어진다.
// 없는 연도를 조용히 다른 연도로 떨어뜨리지 않는다 — 그러면 두 시즌이 섞인 일정이 나온다.
const SEASONS = {
  2026: season2026,
  2027: season2027,
};
export const SUPPORTED_SEASONS = Object.keys(SEASONS).map(Number).sort((a, b) => a - b);

export function hasSeasonData(year) {
  return Array.isArray(SEASONS[Number(year)]);
}

export function getStaticFallbackRaces(year) {
  const races = SEASONS[Number(year)];
  if (!races) {
    warnMissingSeason(year);
    return [];
  }
  return races;
}

// 같은 연도로 반복 경고하지 않는다.
const warnedSeasons = new Set();
function warnMissingSeason(year) {
  if (warnedSeasons.has(year)) return;
  warnedSeasons.add(year);
  console.warn(`[schedule] ${year} 시즌 데이터가 없습니다. 지원 연도: ${SUPPORTED_SEASONS.join(', ')}. 빈 일정을 돌려줍니다.`);
}

// OpenF1 경로의 중계처: 날짜로 매칭된 정적 레코드의 값. 매칭이 없으면 그 연도 F1 데이터의 첫 중계처 목록(전 라운드 동일).
function f1BroadcastFor(year) {
  return getStaticFallbackRaces(year).find((race) => race.series === 'F1' && Array.isArray(race.broadcast) && race.broadcast.length)?.broadcast ?? [];
}

function normalizeRaceCollection(races, source, now = new Date()) {
  return markNextRace(
    sortRacesByPrimaryDate(
      races
        .filter((race) => SUPPORTED_SERIES.includes(race.series))
        .map((race) => buildNormalizedRace(race, source, now)),
    ),
    now,
  );
}

function isGrandPrixMeeting(meeting) {
  return /grand prix/i.test(meeting.meeting_name || meeting.meeting_official_name || '');
}

function selectPrimarySession(sessions) {
  return sessions.find((session) => session.session_type === 'Race')
    || sessions.find((session) => session.session_type === 'Sprint')
    || sessions[0];
}

// OpenF1 meeting ↔ 해당 연도 season-YYYY.json의 F1 레코드 매칭. 키는 **주말 날짜 구간 겹침(현지 날짜)**.
//  - round: OpenF1 응답에 없고, 정적 라운드도 재편됨(바레인 4→16) → 불안정
//  - name : 'Barcelona Grand Prix' ≠ 'Barcelona-Catalunya Grand Prix', 'Bahrain Grand Prix'가 2건(4월 취소분·10월 세팡) → 모호
//  - date : F1은 같은 주에 두 대회가 없고, 연기된 바레인도 정적 데이터가 10월로 반영돼 있어 1:1 → 채택
// 1차: 날짜 겹침으로 정적 레코드를 '점유'(전체 필드 차용). 2차: 남은 meeting은 이름이 유일하게 맞을 때만
// 이벤트 정체성 필드(nameKo/shortNameKo/countryKo)만 빌린다 — 취소된 4월 바레인이 10월 세팡의 round·시간대를 물려받지 않게.
const STATIC_KO_FIELDS = ['nameKo', 'shortNameKo', 'circuitKo', 'cityKo', 'countryKo'];
const STATIC_IDENTITY_FIELDS = ['nameKo', 'shortNameKo', 'countryKo'];
const normalizeMeetingName = (name) => String(name || '').toLowerCase().replace(/grand prix/g, '').replace(/[^a-z0-9]/g, '');

function matchStaticF1(meetings, staticF1, year) {
  const matches = new Map();
  const claimed = new Set();
  const claim = (meeting, race, full) => { claimed.add(race.id); matches.set(meeting.meeting_key, { race, full }); };
  const localRaceDay = (meeting) => getDateKeyWithOffset(meeting.date_end, meeting.gmt_offset?.slice(0, 6) || '+00:00');

  // 1차: `${series}:${raceDateLocal}` 정확 일치 (큐레이션 데이터와 같은 키 — highlights.getRaceKey)
  for (const meeting of meetings) {
    const key = `F1:${localRaceDay(meeting)}`;
    const exact = staticF1.find((race) => !claimed.has(race.id) && getRaceKey(race) === key);
    if (exact) claim(meeting, exact, true);
  }
  // 2차: 주말 날짜 구간 겹침 (경기일이 하루 어긋난 경우의 안전망)
  for (const meeting of meetings) {
    if (matches.has(meeting.meeting_key)) continue;
    const offset = meeting.gmt_offset?.slice(0, 6) || '+00:00';
    const start = getDateKeyWithOffset(meeting.date_start, offset);
    const end = getDateKeyWithOffset(meeting.date_end, offset);
    const byDate = staticF1.find((race) => !claimed.has(race.id) && race.weekendStart && race.weekendEnd && race.weekendStart <= end && start <= race.weekendEnd);
    if (byDate) claim(meeting, byDate, true);
  }
  // 3차: 이름이 유일하게 맞으면 정체성 필드만 (취소된 4월 바레인처럼 옮겨진 대회의 옛 일정)
  for (const meeting of meetings) {
    if (matches.has(meeting.meeting_key)) continue;
    const key = normalizeMeetingName(meeting.meeting_name);
    const byName = staticF1.filter((race) => normalizeMeetingName(race.name) === key);
    if (byName.length === 1) matches.set(meeting.meeting_key, { race: byName[0], full: false });
  }
  const unmatched = meetings.filter((meeting) => !meeting.is_cancelled && !matches.get(meeting.meeting_key)?.full);
  if (unmatched.length) {
    console.warn(`[schedule] OpenF1 F1 경기 ${unmatched.length}건이 season-${year}.json과 매칭되지 않아 한글 표시명 없이 표시됩니다: ${unmatched.map((m) => `${m.meeting_name} (${localRaceDay(m)})`).join(', ')}`);
  }
  return matches;
}

function mapOpenF1Meeting(meeting, sessions, match = null, fallbackBroadcast = []) {
  const orderedSessions = [...sessions].sort((left, right) => new Date(left.date_start) - new Date(right.date_start));
  const primary = selectPrimarySession(orderedSessions);
  const offset = meeting.gmt_offset?.slice(0, 6) || '+00:00';
  const staticRace = match?.race ?? null;
  const koFields = match ? (match.full ? STATIC_KO_FIELDS : STATIC_IDENTITY_FIELDS) : [];
  // IANA 시간대는 날짜로 매칭된 정적 레코드에서. 없으면 'UTC+HH:MM' 표기(utils.localDateTimeToUtc가 처리).
  const timezone = (match?.full && staticRace?.timezone) || offsetToDisplayName(offset);
  const primaryIso = coerceIsoWithOffset(primary?.date_start || meeting.date_end || meeting.date_start);
  const primaryDate = primaryIso ? new Date(primaryIso) : null;

  return {
    id: `f1-${meeting.meeting_key}`,
    series: 'F1',
    round: match?.full ? (staticRace.round ?? null) : null,
    name: meeting.meeting_name,
    // 정적 데이터의 한글 표시명 보존 (없으면 null → 영문 폴백)
    ...Object.fromEntries(koFields.map((field) => [field, staticRace?.[field] ?? null])),
    // 정적 레코드의 id. 캘린더 파일(/api/calendar.ics?race=)은 정적 데이터로 만들기 때문에
    // API 경로의 id(f1-<meeting_key>)로는 찾을 수 없다.
    staticId: match?.full ? (staticRace?.id ?? null) : null,
    status: meeting.is_cancelled ? 'cancelled' : 'scheduled',
    shortName: meeting.meeting_name?.replace(/ Grand Prix/i, ' GP') || meeting.meeting_name,
    eventName: meeting.meeting_name,
    circuit: orderedSessions[0]?.circuit_short_name || meeting.location,
    city: meeting.location,
    country: meeting.country_name,
    countryEn: meeting.country_name,
    raceDateLocal: primaryIso ? getDateKeyWithOffset(primaryIso, offset) : null,
    raceDateKst: primaryIso ? getDateKeyInKst(primaryDate) : null,
    localTime: primaryIso ? getTimeLabelWithOffset(primaryIso, offset) : 'TBA',
    kstTime: primaryIso ? getTimeLabelInKst(primaryIso) : null,
    raceKstIso: primaryIso,
    weekendStart: getDateKeyWithOffset(meeting.date_start, offset),
    weekendEnd: getDateKeyWithOffset(meeting.date_end, offset),
    sessions: orderedSessions.map((session) => ({
      t: session.session_name,   // 원문 유지. 표시 라벨은 렌더 시점에 formatSessionLabel
      local: getDateTimeLabelWithOffset(session.date_start, offset),
      kst: getDateTimeLabelInKst(session.date_start),
      startUtc: session.date_start,
      endUtc: session.date_end,
    })),
    broadcast: (match?.full && Array.isArray(staticRace?.broadcast) && staticRace.broadcast.length) ? staticRace.broadcast : fallbackBroadcast,
    timezone,
    isSprint: orderedSessions.some((session) => session.session_type === 'Sprint'),
    eventStartUtc: coerceIsoWithOffset(meeting.date_start),
    eventEndUtc: coerceIsoWithOffset(meeting.date_end),
    primaryStartUtc: primaryIso,
  };
}

async function fetchOpenF1Schedule(year) {
  const [meetingsResponse, sessionsResponse] = await Promise.all([
    fetch(`${OPEN_F1_MEETINGS_URL}?year=${year}`),
    fetch(`${OPEN_F1_SESSIONS_URL}?year=${year}`),
  ]);

  if (!meetingsResponse.ok || !sessionsResponse.ok) {
    throw new Error(`OpenF1 schedule request failed (${meetingsResponse.status}/${sessionsResponse.status})`);
  }

  const meetings = await meetingsResponse.json();
  const sessions = await sessionsResponse.json();
  const sessionsByMeeting = sessions.reduce((map, session) => {
    const next = map;
    if (!next.has(session.meeting_key)) next.set(session.meeting_key, []);
    next.get(session.meeting_key).push(session);
    return next;
  }, new Map());

  const grandPrix = meetings.filter(isGrandPrixMeeting);
  const matches = matchStaticF1(grandPrix, getStaticFallbackRaces(year).filter((race) => race.series === 'F1'), year);
  const fallbackBroadcast = f1BroadcastFor(year);
  return grandPrix
    // 취소된 meeting이 이름으로만 매칭됐다면(= 같은 이름의 정적 레코드를 다른 날짜의 meeting이 이미 점유) 옮겨진 대회의
    // 옛 일정이다. 정적 데이터는 이를 한 라운드로 취급하므로 여기서도 뺀다 (예: 4월 바레인 → 10월 세팡).
    .filter((meeting) => !(meeting.is_cancelled && matches.get(meeting.meeting_key) && !matches.get(meeting.meeting_key).full))
    .map((meeting) => mapOpenF1Meeting(meeting, sessionsByMeeting.get(meeting.meeting_key) || [], matches.get(meeting.meeting_key) || null, fallbackBroadcast));
}

export async function loadScheduleData(year, now = new Date()) {
  const seasonSupported = hasSeasonData(year);
  const fallback = normalizeRaceCollection(getStaticFallbackRaces(year), 'fallback', now);

  // 데이터가 없는 연도는 빈 일정을 그대로 돌려준다. 다른 연도로 떨어뜨리면 섞인 일정이 나온다.
  if (!seasonSupported) {
    return { races: [], error: null, usingFallback: true, seasonSupported: false, seasonYear: Number(year), lastUpdatedAt: new Date().toISOString() };
  }

  try {
    const f1FromApi = await fetchOpenF1Schedule(year);
    // OpenF1에 아직 그 시즌이 없으면(빈 배열) 정적 F1을 살린다. 안 그러면 F1만 통째로 사라진다.
    if (!f1FromApi.length) {
      return { races: fallback, error: null, usingFallback: true, seasonSupported: true, seasonYear: Number(year), lastUpdatedAt: new Date().toISOString() };
    }
    const merged = [
      ...fallback.filter((race) => race.series !== 'F1'),
      ...normalizeRaceCollection(f1FromApi, 'api', now),
    ];

    return {
      races: normalizeRaceCollection(merged, 'mixed', now),
      error: null,
      usingFallback: false,
      seasonSupported: true,
      seasonYear: Number(year),
      lastUpdatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      races: fallback,
      error,
      usingFallback: true,
      seasonSupported: true,
      seasonYear: Number(year),
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}

export function getFallbackScheduleData(year, now = new Date()) {
  return normalizeRaceCollection(getStaticFallbackRaces(year), 'fallback', now);
}
