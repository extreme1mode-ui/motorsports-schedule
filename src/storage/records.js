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
  // 'dark' | 'light'. 같은 계정이라도 기기마다 다를 수 있어 동기화 대상이 아니다.
  theme: { key: 'paddock.theme', scope: 'device', codec: text, fallback: () => 'dark' },
  // 첫 방문일 'YYYY-MM-DD'. 기기별 계측값이라 동기화하지 않는다.
  firstVisit: { key: 'paddock.firstVisit', scope: 'device', codec: text, fallback: () => null },
};
