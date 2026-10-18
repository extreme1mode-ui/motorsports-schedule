// 탭 제목. 앱 제목(locale)과 경기 제목을 따로 받아, 경기 상세가 걸려 있으면 경기 제목을 쓴다.
//   - Root(App.jsx)는 locale이 바뀔 때 앱 제목을 넘긴다.
//   - useRaceLink(share-link.js)는 /race/<id>로 들어왔을 때와 상세를 열고 닫을 때 경기 제목을 넘긴다(닫히면 null).
// 둘을 나눠 두는 건 Root의 effect가 자식보다 늦게 돌아 경기 제목을 덮어쓰지 않게 하기 위해서다.
let appTitle = null;
let raceTitle = null;

function apply() {
  const next = raceTitle || appTitle;
  if (next && document.title !== next) document.title = next;
}

export function setAppTitle(title) {
  appTitle = title || null;
  apply();
}

export function setRaceTitle(title) {
  raceTitle = title || null;
  apply();
}
