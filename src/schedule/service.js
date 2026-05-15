import fallbackSeries from './fallback-series.json' with { type: 'json' };
import { ALL_RACES as LEGACY_RACES } from '../data.js';
import { SUPPORTED_SERIES } from './constants.js';
import {
  buildNormalizedRace,
  coerceIsoWithOffset,
  formatOpenF1SessionName,
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

const F1_BROADCAST = ['쿠팡플레이', 'F1 TV Pro'];
const OPEN_F1_MEETINGS_URL = 'https://api.openf1.org/v1/meetings';
const OPEN_F1_SESSIONS_URL = 'https://api.openf1.org/v1/sessions';

function getFallbackF1Races() {
  return LEGACY_RACES.filter((race) => race.series === 'F1');
}

function getStaticFallbackRaces() {
  return [
    ...getFallbackF1Races(),
    ...fallbackSeries,
  ];
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

function mapOpenF1Meeting(meeting, sessions) {
  const orderedSessions = [...sessions].sort((left, right) => new Date(left.date_start) - new Date(right.date_start));
  const primary = selectPrimarySession(orderedSessions);
  const offset = meeting.gmt_offset?.slice(0, 6) || '+00:00';
  const timezone = offsetToDisplayName(offset);
  const primaryIso = coerceIsoWithOffset(primary?.date_start || meeting.date_end || meeting.date_start);
  const primaryDate = primaryIso ? new Date(primaryIso) : null;

  return {
    id: `f1-${meeting.meeting_key}`,
    series: 'F1',
    round: null,
    name: meeting.meeting_name,
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
      t: formatOpenF1SessionName(session.session_name),
      local: getDateTimeLabelWithOffset(session.date_start, offset),
      kst: getDateTimeLabelInKst(session.date_start),
      startUtc: session.date_start,
      endUtc: session.date_end,
    })),
    broadcast: F1_BROADCAST,
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

  return meetings
    .filter(isGrandPrixMeeting)
    .map((meeting) => mapOpenF1Meeting(meeting, sessionsByMeeting.get(meeting.meeting_key) || []));
}

export async function loadScheduleData(year, now = new Date()) {
  const fallback = normalizeRaceCollection(getStaticFallbackRaces(), 'fallback', now);

  try {
    const f1FromApi = await fetchOpenF1Schedule(year);
    const merged = [
      ...fallback.filter((race) => race.series !== 'F1'),
      ...normalizeRaceCollection(f1FromApi, 'api', now),
    ];

    return {
      races: normalizeRaceCollection(merged, 'mixed', now),
      error: null,
      usingFallback: false,
      lastUpdatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      races: fallback,
      error,
      usingFallback: true,
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}

export function getFallbackScheduleData(now = new Date()) {
  return normalizeRaceCollection(getStaticFallbackRaces(), 'fallback', now);
}
