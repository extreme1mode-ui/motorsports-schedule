// 앱이 저장하는 값의 전체 목록. 저장 항목을 추가·변경할 땐 반드시 여기만 고친다.
//
// scope
// - 'account' : 사용자에게 속한 값. 로그인을 붙이면 기기 간 동기화 대상이 된다.
// - 'device'  : 기기에 속한 값. 로그인해도 동기화하지 않는다.
//
// key와 저장 형식(JSON 배열/문자열)은 기존 값과 100% 동일하다. 이미 쓰고 있는 사용자의
// localStorage를 그대로 읽어야 하므로 마이그레이션 없이 바꾸면 안 된다.

// ---------- 코덱: 저장 문자열 <-> 앱에서 쓰는 값 ----------

const json = {
  decode(raw, fallback) {
    try { const value = JSON.parse(raw); return value ?? fallback(); }
    catch { return fallback(); }
  },
  encode(value) {
    try { return JSON.stringify(value); }
    catch { return null; }
  },
};

// Set<string> <-> JSON 배열. 저장 형식은 기존 그대로 배열이다.
const idSet = {
  decode(raw, fallback) {
    try { const value = JSON.parse(raw); return Array.isArray(value) ? new Set(value) : fallback(); }
    catch { return fallback(); }
  },
  encode(value) {
    try { return JSON.stringify([...value]); }
    catch { return null; }
  },
};

// 값 검증은 하지 않는다 (기존과 동일). 형식 판정은 각 호출부가 계속 책임진다.
const text = {
  decode(raw, fallback) { return typeof raw === 'string' && raw ? raw : fallback(); },
  encode(value) { return typeof value === 'string' ? value : null; },
};

// ---------- 레지스트리 ----------

export const RECORDS = {
  // 관심 시리즈·국가·시간대·언어·온보딩 완료 여부. 정규화는 schedule/usePreferences.js가 한다.
  preferences: { key: 'paddock.prefs', scope: 'account', codec: json, fallback: () => null },
  // 저장한 경기 id 집합.
  favorites: { key: 'paddock.fav', scope: 'account', codec: idSet, fallback: () => new Set() },
  // 알림 켠 경기 id 집합.
  alerts: { key: 'paddock.alerts', scope: 'account', codec: idSet, fallback: () => new Set() },
  // 테마 선택 'system'(기기 설정을 따름) | 'dark' | 'light'. 사용자가 고를 때만 저장한다(AI 티 정리 K5, 2026-10-29).
  // 같은 계정이라도 기기마다 다를 수 있어 동기화 대상이 아니다.
  theme: { key: 'gantry.theme', scope: 'device', codec: text, fallback: () => null },
  // 예전 테마 키 'dark' | 'light'. 예전 앱은 고르지 않아도 'dark'를 써 두었다 — 그래서 'light'만 고른 값으로 이어받는다(preferences-options.readTheme).
  legacyTheme: { key: 'paddock.theme', scope: 'device', codec: text, fallback: () => null },
  // 첫 방문일 'YYYY-MM-DD'. 기기별 계측값이라 동기화하지 않는다.
  firstVisit: { key: 'paddock.firstVisit', scope: 'device', codec: text, fallback: () => null },
  // 첫 유입 경로 { source, medium, campaign, date }. 처음 들어온 utm을 한 번만 저장하고 덮어쓰지 않는다.
  // 기기별 계측값이라 동기화하지 않는다.
  firstTouch: { key: 'gantry.firstTouch', scope: 'device', codec: json, fallback: () => null },
  // '현장에 가요'를 켠 경기 id 집합. 켠 경기는 주말 동안 홈 히어로에 현장 줄이 붙는다.
  attend: { key: 'gantry.attend', scope: 'account', codec: idSet, fallback: () => new Set() },
  // 라이브 서킷 맵(싱가포르 2026) 상태: 티켓·내 자리·담은 세션·레이어·내 위치. 지도 코어가 HOST.store로만 읽고 쓴다.
  circuitMap: { key: 'gantry.map.sgp26', scope: 'account', codec: json, fallback: () => ({}) },
  // 데모 빌드 전용 시계 {base, at, speed}. VITE_DEMO_CLOCK이 꺼진 빌드에서는 읽지 않는다.
  demoClock: { key: 'gantry.demoClock', scope: 'device', codec: json, fallback: () => null },
  // Supabase 세션. supabase-js가 createClient의 storage 어댑터를 통해 직접 읽고 쓴다
  // (앱 코드에서 storage.auth.read()를 부르지 않는다). 같은 접두로 'gantry.auth-code-verifier'
  // 같은 키를 더 만들 수 있어 어댑터가 접두 전체를 드라이버로 넘긴다. 기기에 묶인 값이라 device다.
  auth: { key: 'gantry.auth', scope: 'device', codec: text, fallback: () => null },
};
