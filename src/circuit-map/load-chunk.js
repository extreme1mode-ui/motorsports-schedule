// 지도 청크를 한 번만 받는다(Promise 캐시). 실패하면 캐시를 비워 다음에 다시 시도한다.
let pending = null;

export function loadMapChunk() {
  if (!pending) {
    pending = import('./map-chunk.js').catch((err) => { pending = null; throw err; });
  }
  return pending;
}

// 진입점이 화면에 나타나거나(idle) 버튼에 포인터·포커스가 닿으면 미리 받아 둔다.
// 실제로 누를 때는 대개 이미 받아 둔 상태가 된다. 실패는 조용히 넘긴다 — 열 때 다시 시도한다.
export function preloadMapChunk() {
  loadMapChunk().catch(() => {});
}
