// useScheduleData()의 race → 홈이 쓰는 형태. 스펙: design/HOME-SPEC.md 10장.
// 정규화된 race는 원문(영문) 필드와 *Ko 필드를 그대로 들고 있다. 표시명은 여기서 locale로 고른다(로드 시점에 굳히지 않는다).
import { getVisibleSessions, getRaceLabels } from '../schedule/utils.js';
import { getReferenceTimes, isCancelled } from './time.js';

function firstText(...values) {
  for (const v of values) if (typeof v === 'string' && v.trim()) return v;
  return null;
}

export function adaptRace(race, mode = 'all', locale = 'ko') {
  const labels = getRaceLabels(race, locale);   // ko: shortNameKo → nameKo → 영문 / en: shortName → 영문 → nameKo
  const officialName = firstText(race.nameEn, race.name);
  const displayName = labels.shortName;         // 표시용 짧은 이름 (카드·행·드로어)
  const fullName = labels.fullName;             // 히어로 제목용 전체 이름
  const { start, end, session } = getReferenceTimes(race);

  return {
    id: race.id,
    series: race.series,
    round: race.round ?? null,
    plannedRound: race.plannedRound ?? null,

    displayName,                                   // 표시용 짧은 이름 (카드·행·드로어)
    fullName,                                      // 전체 이름 (히어로 제목에만)
    officialName,                                  // 스폰서 포함 영문 공식명. 히어로 부제·상세에서만
    circuit: labels.circuit,
    city: labels.city,
    country: labels.country,

    // 사진 매칭 키용 — 한글·영문 둘 다 보존. photos.js가 합쳐 쓴다.
    name: officialName,
    nameKo: firstText(race.nameKo),
    circuitKo: firstText(race.circuitKo),
    cityKo: firstText(race.cityKo),
    countryKo: firstText(race.countryKo),
    circuitEn: firstText(race.circuitEn, race.circuit),
    cityEn: firstText(race.cityEn, race.city),
    countryEn: firstText(race.countryEn, race.country),

    weekendStart: race.weekendStart ?? null,       // 서킷 현지 날짜키 (시간대 변환 금지)
    weekendEnd: race.weekendEnd ?? null,
    raceDateKst: race.raceDateKst ?? null,
    raceKstIso: start ? race.raceKstIso : null,    // 데이터 필드 그대로. 판정·정렬에는 startUtc를 쓴다
    kstTime: /^\d{2}:\d{2}$/.test(race.kstTime || '') ? race.kstTime : null,
    startUtc: start ? start.toISOString() : null,  // 대표 세션 시작 — LIVE 판정 기준
    endUtc: end ? end.toISOString() : null,        // 대표 세션 종료 — 없으면 LIVE 불가
    primarySession: session ?? null,

    sessions: getVisibleSessions(race, mode),      // 관심 수준 반영
    allSessions: Array.isArray(race.sessions) ? race.sessions : [],
    mode,

    broadcast: Array.isArray(race.broadcast) ? race.broadcast.filter((b) => b && b.name) : [],   // { name, region } 그대로. 국가 필터는 화면(useFormat().broadcast)에서
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
export function adaptRaces(races = [], preferences = null, locale = 'ko') {
  return races.map((race) => adaptRace(race, preferences?.series?.[race.series] ?? 'all', locale));
}
