// 지도 청크를 한 번만 받는다(Promise 캐시). 실패하면 캐시를 비워 다음에 다시 시도한다.
//   코어(map-chunk.js)는 모든 경기가 같이 쓰고, 경기 데이터는 경기마다 따로 받는다.
import { venueById } from './venues/index.js';

let core = null;
const venues = {};

function once(cache, key, load) {
  if (!cache[key]) cache[key] = load().catch((err) => { cache[key] = null; throw err; });
  return cache[key];
}

export function loadMapChunk(venueId) {
  const v = venueById(venueId);
  if (!v) return Promise.reject(new Error(`unknown circuit map venue: ${venueId}`));
  const c = core || (core = import('./map-chunk.js').catch((err) => { core = null; throw err; }));
  return Promise.all([c, once(venues, venueId, v.load)])
    .then(([m, d]) => ({ GantryMap: m.GantryMap, mapMarkup: m.mapMarkup, VN: d.VN, BASE: d.BASE }));
}

// 진입점이 화면에 나타나거나(idle) 버튼에 포인터·포커스가 닿으면 미리 받아 둔다.
// 실제로 누를 때는 대개 이미 받아 둔 상태가 된다. 실패는 조용히 넘긴다 — 열 때 다시 시도한다.
export function preloadMapChunk(venueId) {
  loadMapChunk(venueId).catch(() => {});
}
