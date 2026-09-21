// 추천용 큐레이션 데이터. season-2026.json(검증된 일정)과 분리해서 둔다 — 일정 파일은 API나 2027 데이터로 통째로 바뀐다.
// 경기 id는 경로마다 다르므로(OpenF1 경로는 `f1-{meeting_key}`, round null) 시리즈+현지 경기일로 매칭한다.

export function getRaceKey(race) {
  if (!race?.series) return null;
  const date = race.raceDateLocal || race.weekendEnd;
  return date ? `${race.series}:${date}` : null;
}

// 대회 자체의 위상. 1~3 등급. 목록에 없으면 1등급. 관중 수·시청률 같은 수치는 두지 않는다.
export const RACE_PRESTIGE = {
  // 3등급 — 모터스포츠 최고 권위
  'WEC:2026-06-13': 3,    // 르망 24시
  'IMSA:2026-01-24': 3,   // 롤렉스 24 데이토나
  'GTWC:2026-06-27': 3,   // 크라우드스트라이크 스파 24시
  'GTWC:2026-05-16': 3,   // ADAC RAVENOL 24h 뉘르부르크링
  'F1:2026-06-07': 3,     // 모나코 그랑프리

  // 2등급 — 대형 이벤트
  'IMSA:2026-03-21': 2,   // 세브링 12시간
  'IMSA:2026-10-03': 2,   // 모토울 프티 르망
  'F1:2026-07-05': 2,     // 영국 그랑프리
  'F1:2026-09-06': 2,     // 이탈리아 그랑프리
  'F1:2026-03-29': 2,     // 일본 그랑프리
  'WEC:2026-05-09': 2,    // 스파-프랑코르샹 6시간
  'WRC:2026-01-25': 2,    // 몬테카를로 랠리
  'WRC:2026-03-15': 2,    // 사파리 랠리 케냐
  'WRC:2026-08-02': 2,    // 랠리 핀란드
};

export const DEFAULT_PRESTIGE = 1;

export function getPrestige(race) {
  const key = getRaceKey(race);
  return (key && RACE_PRESTIGE[key]) || DEFAULT_PRESTIGE;
}

// 특정 시즌에만 해당하는 큐레이션 노트. 직접 채우는 영역 — 확인된 사실만 넣는다.
// kind: 'driver' | 'milestone' | 'debut' | 'rivalry'. 한 경기에 여러 개 가능.
//
// 형식 예시:
//   'GTWC:2026-05-16': [
//     { kind: 'driver', note: '맥스 베르스타펜 GT3 출전' },
//   ],
export const RACE_HIGHLIGHTS = {};

export const HIGHLIGHT_KINDS = ['driver', 'milestone', 'debut', 'rivalry'];

export function getHighlights(race) {
  const key = getRaceKey(race);
  const list = key ? RACE_HIGHLIGHTS[key] : null;
  return Array.isArray(list) ? list : [];
}

// 큐레이션 키가 실제 경기와 맞는지 검사. 일정이 바뀌어 매칭이 끊기면 조용히 사라지지 않게 console.warn으로 알린다.
// 반환: { matched: [{ key, race }], missing: string[] }
export function validateCurationKeys(races = [], { warn = true } = {}) {
  const byKey = new Map();
  for (const race of races) { const key = getRaceKey(race); if (key && !byKey.has(key)) byKey.set(key, race); }
  const keys = new Set([...Object.keys(RACE_PRESTIGE), ...Object.keys(RACE_HIGHLIGHTS)]);
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
