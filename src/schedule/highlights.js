// 추천용 큐레이션 데이터. season-2026.json(검증된 일정)과 분리해서 둔다 — 일정 파일은 API나 2027 데이터로 통째로 바뀐다.
// 경기 id는 경로마다 다르므로(OpenF1 경로는 `f1-{meeting_key}`, round null) 시리즈+현지 경기일로 매칭한다.

export function getRaceKey(race) {
  if (!race?.series) return null;
  const date = race.raceDateLocal || race.weekendEnd;
  return date ? `${race.series}:${date}` : null;
}

// ---------------------------------------------------------------------------
// RACE_WEIGHT — 이 경기가 '캘린더의 한 칸'인가, '그 자체로 하나의 사건'인가.
//
// 기준 (2026-09 셀프 IDI에서 도출):
//   - 관중 수·시청률·중계 규모는 기준이 아니다. ("모나코가 관중이 많다고 해서 경기가 재밌는 건 아니니까")
//   - 1년에 한 번뿐이라 대체 불가능한가. 내구 레이스의 24시간처럼 포맷 자체가 사건인가.
//   - 시즌에서 그 경기만 갖는 의미가 있는가 (개막전 = 새 규정의 첫 실차, 최종전 = 타이틀 확정 가능성).
//
// 여기 없는 값은 전부 1. 목록을 늘리는 방향이 아니라, 3등급을 다섯 개로 유지하는 방향으로 관리한다.
//
// 상황에 따라 갑자기 볼 만해지는 경기(날씨, 게스트 출전, 챔피언십 확정)는 여기가 아니라
// RACE_HIGHLIGHTS에 넣는다. 그쪽 가중치가 더 높다 — 평범한 경기가 사정이 생겨 최고 등급을 이기는 게 정상이다.
// ---------------------------------------------------------------------------
export const RACE_WEIGHT = {
  // 3 — 그 자체로 사건. 모터스포츠를 전혀 모르는 사람에게도 "오늘은 이게 열린다"가 성립한다.
  'WEC:2026-06-13': 3,    // 르망 24시 — 내구 레이스의 기준점, 1년에 하루
  'IMSA:2026-01-24': 3,   // 데이토나 24시 — 시즌의 문을 여는 24시간
  'GTWC:2026-06-27': 3,   // 스파 24시 — GT3 최대 규모 엔트리
  'GTWC:2026-05-16': 3,   // 뉘르 24시 — 노르트슐라이페, 게스트 출전이 가장 자주 나오는 무대
  'F1:2026-03-08': 3,     // 호주 GP — 2026 신규정 첫 실전. 개막전은 한 시즌에 한 번뿐이다.

  // 2 — 포맷이나 시즌상의 위치가 특별하다. 다른 라운드로 대체되지 않는다.
  'IMSA:2026-03-21': 2,   // 세브링 12시간 — 노면이 만드는 소모전
  'IMSA:2026-10-03': 2,   // 프티 르망 — IMSA 시즌 피날레
  'GTWC:2026-02-15': 2,   // 바투스트 12시 — 마운트 패노라마
  'GTWC:2026-09-13': 2,   // 스즈카 1000km — 부활한 포맷
  'GTWC:2026-10-10': 2,   // 인디 8시간 — 인디애나폴리스 로드코스
  'F1:2026-12-06': 2,     // 아부다비 GP — 최종전. 타이틀이 열려 있으면 하이라이트로 3등급을 넘어선다.
  'WRC:2026-01-25': 2,    // 몬테카를로 — 눈·노면이 매년 결과를 뒤집는 개막 랠리 (※ 아래 주석)
  'WRC:2026-03-15': 2,    // 사파리 케냐 — 완주 자체가 변수인 유일한 랠리 (※ 아래 주석)

  // ※ WRC 두 항목은 사용자 검증을 거치지 않은 편집자 판단이다. WRC 라이브 시청 경험이 없다고 답했으므로,
  //    인터뷰에서 WRC 팬을 만나면 가장 먼저 확인할 가설로 둔다.
};

// 이전 이름. 호출부를 옮기기 전까지 유지한다.
export const RACE_PRESTIGE = RACE_WEIGHT;

export const DEFAULT_WEIGHT = 1;
export const DEFAULT_PRESTIGE = DEFAULT_WEIGHT;

export function getRaceWeight(race) {
  const key = getRaceKey(race);
  return (key && RACE_WEIGHT[key]) || DEFAULT_WEIGHT;
}

export const getPrestige = getRaceWeight;

// ---------------------------------------------------------------------------
// RACE_HIGHLIGHTS — 이번 시즌에만 성립하는 사정. "경기 자체는 평범한데 사정 때문에 갑자기 볼 만해지는" 경우.
// 확인된 사실만 넣는다. 추측·루머·"~할 전망" 금지. 시즌이 끝나면 통째로 비운다.
//
// kind:
//   'crossover'  — 다른 종목 유명 선수의 특수 출전 (예: F1 드라이버의 GT3 출전)
//   'title'      — 이 경기에서 챔피언십이 결정될 수 있음
//   'debut'      — 신차·신규 팀·신인의 첫 출전
//   'milestone'  — 통산 기록, 마지막 출전, 복귀
//   'rivalry'    — 특정 두 명/두 팀의 직접 대결이 걸려 있음
//
// note는 한 줄, 사실만. 형용사를 쓰지 않는다. ko/en 두 벌을 넣는다.
//
// 형식:
//   'GTWC:2026-05-16': [
//     { kind: 'crossover', ko: '맥스 베르스타펜 출전', en: 'Max Verstappen entered' },
//   ],
export const RACE_HIGHLIGHTS = {};

export const HIGHLIGHT_KINDS = ['crossover', 'title', 'debut', 'milestone', 'rivalry'];

export function getHighlights(race) {
  const key = getRaceKey(race);
  const list = key ? RACE_HIGHLIGHTS[key] : null;
  return Array.isArray(list) ? list : [];
}

export function getHighlightNote(highlight, locale = 'ko') {
  if (!highlight) return '';
  return highlight[locale] || highlight.ko || highlight.en || highlight.note || '';
}

// 큐레이션 키가 실제 경기와 맞는지 검사. 일정이 바뀌어 매칭이 끊기면 조용히 사라지지 않게 console.warn으로 알린다.
// 반환: { matched: [{ key, race }], missing: string[] }
export function validateCurationKeys(races = [], { warn = true } = {}) {
  const byKey = new Map();
  for (const race of races) { const key = getRaceKey(race); if (key && !byKey.has(key)) byKey.set(key, race); }
  const keys = new Set([...Object.keys(RACE_WEIGHT), ...Object.keys(RACE_HIGHLIGHTS)]);
  const matched = []; const missing = [];
  for (const key of keys) {
    if (byKey.has(key)) matched.push({ key, race: byKey.get(key) });
    else missing.push(key);
  }
  if (warn && missing.length) {
    console.warn(`[highlights] 실제 경기와 매칭되지 않는 큐레이션 키 ${missing.length}개: ${missing.join(', ')}`);
  }
  return { matched, missing };
}
