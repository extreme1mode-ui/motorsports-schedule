// '한 바퀴' 게임 코드(입체 무대 · 차 · 소리 · 효과)를 한 번만 받는다(Promise 캐시). 실패하면 캐시를 비워 다음에 다시 시도한다.
// 첫 화면에서는 받지 않는다 — 진입점에 손이 닿거나(누르기 시작 · 포커스) 레이어를 열 때 import()한다. 서킷 맵의 load-chunk.js와 같은 방식.
let game = null;

export function loadLapGame() {
  if (!game) game = import('./LapGame.jsx').catch((err) => { game = null; throw err; });
  return game;
}

// 미리 받아 두기. 실패는 조용히 넘긴다 — 열 때 다시 시도한다.
export function preloadLapGame() {
  loadLapGame().catch(() => {});
}
