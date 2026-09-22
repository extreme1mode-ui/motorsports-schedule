// 저장 매체 드라이버. storage/index.js는 이 인터페이스 하나만 보고 동작한다.
//
// 계약
// - get(key)        -> string | null   값이 없거나 읽기에 실패하면 null
// - set(key, value) -> boolean         저장 성공 여부
// - remove(key)     -> boolean
// - 어떤 메서드도 throw하지 않는다. 프라이빗 모드·쿼터 초과·SSR(localStorage 자체가 없는 환경)을
//   호출부가 신경 쓰지 않게 하기 위함이다. 기존 코드가 곳곳에서 하던 try/catch를 여기로 모았다.
//
// 로그인(원격 동기화)을 붙일 때도 이 드라이버는 그대로 둔다. 원격은 로컬을 "대체"하는 게 아니라
// 로컬 "위에 얹히는" 계층이다 — 화면은 언제나 로컬에서 동기적으로 즉시 읽고, 서버와의 정합은
// 뒤에서 맞춘 뒤 결과를 다시 로컬에 써 넣는다. (첫 페인트 속도와 오프라인 동작을 지키기 위함)

export function createLocalDriver() {
  return {
    name: 'local',
    get(key) {
      try { return localStorage.getItem(key); }
      catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); return true; }
      catch { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); return true; }
      catch { return false; }
    },
  };
}
