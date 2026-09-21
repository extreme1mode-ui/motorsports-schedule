// useScheduleData()의 race → 홈이 쓰는 형태. 스펙: design/HOME-SPEC.md 10장.
// 주의: buildNormalizedRace가 localizeRace를 거치므로 race.name/circuit/city/country는 이미 한글(있을 때)이고
// 영문 원문은 nameEn/circuitEn/cityEn/countryEn에 있다. 그래서 officialName은 nameEn에서 읽는다.
import { getVisibleSessions } from '../schedule/utils.js';
import { getReferenceTimes, isCancelled } from './time.js';

function firstText(...values) {
  for (const v of values) if (typeof v === 'string' && v.trim()) return v;
  return null;
}

export function adaptRace(race, mode = 'all') {
  const officialName = firstText(race.nameEn, race.name);
  const displayName = firstText(race.shortName, race.shortNameKo, race.nameKo, race.nameEn, race.name);  // shortName = shortNameKo ?? shortName ?? 접두어 뗀 영문
  const fullName = firstText(race.nameKo, race.nameEn, race.name);                                       // 히어로 제목용 전체 이름
  const { start, end, session } = getReferenceTimes(race);

  return {
    id: race.id,
    series: race.series,
    round: race.round ?? null,
    plannedRound: race.plannedRound ?? null,

    displayName,                                   // 표시용 짧은 이름 (카드·행·드로어)
    fullName,                                      // 전체 이름 (히어로 제목에만)
    officialName,                                  // 스폰서 포함 영문 공식명. 히어로 부제·상세에서만
    circuit: firstText(race.circuitKo, race.circuitEn, race.circuit),
    city: firstText(race.cityKo, race.cityEn, race.city),
    country: firstText(race.countryKo, race.countryEn, race.country),

    // 사진 매칭 키용 — 한글·영문 둘 다 보존. photos.js가 합쳐 쓴다.
    name: officialName,
    nameKo: firstText(race.nameKo),
    circuitKo: firstText(race.circuitKo),
    cityKo: firstText(race.cityKo),
    countryKo: firstText(race.countryKo),
    circuitEn: firstText(race.circuitEn, race.circuit),
    cityEn: firstText(race.cityEn, race.city),
    countryEn: firstText(race.countryEn, race.country),

    weekendStart: race.weekendStart ?? null,       // KST 날짜키로 취급
    weekendEnd: race.weekendEnd ?? null,
    raceDateKst: race.raceDateKst ?? null,
    raceKstIso: start ? race.raceKstIso : null,    // 시각 미확정이면 null (buildNormalizedRace의 폴백값은 버린다)
    kstTime: /^\d{2}:\d{2}$/.test(race.kstTime || '') ? race.kstTime : null,
    startUtc: start ? start.toISOString() : null,  // 대표 세션 시작 — LIVE 판정 기준
    endUtc: end ? end.toISOString() : null,        // 대표 세션 종료 — 없으면 LIVE 불가
    primarySession: session ?? null,

    sessions: getVisibleSessions(race, mode),      // 관심 수준 반영
    allSessions: Array.isArray(race.sessions) ? race.sessions : [],
    mode,

    broadcast: Array.isArray(race.broadcast) ? race.broadcast.map((b) => (typeof b === 'string' ? b : b.name)).filter(Boolean) : [],  // 홈은 이름만 쓴다
    label: race.cup ?? null,                       // GTWC의 Sprint/Endurance Cup
    isSprint: Boolean(race.isSprint),
    cancelled: isCancelled(race),
    rawStatus: race.status ?? null,
    note: race.cancellationNote ?? race.note ?? null,
    timezone: race.timezone ?? null,

    race,                                          // 원본 참조 (resolveTimeState 등에 그대로 넘긴다)
  };
}

// preferences.series[series]를 mode로 넘긴다. preferences가 없으면 'all'.
export function adaptRaces(races = [], preferences = null) {
  return races.map((race) => adaptRace(race, preferences?.series?.[race.series] ?? 'all'));
}
