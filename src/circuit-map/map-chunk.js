// 지도 청크. 코어·마크업·데이터·지도 CSS를 한 덩어리로 묶는다.
// 첫 화면에서는 받지 않는다 — load-chunk.js가 지도를 처음 열 때(또는 미리 불러오기로) import()한다.
// 여기 CSS가 오기 전에 #cm을 보이면 화면이 깨지므로, 레이어는 이 모듈이 준비된 뒤에 hidden을 푼다.
import './circuit-map.css';
import './basemap.css';

export { GantryMap } from './map-core.js';
export { MAP_MARKUP } from './map-markup.js';
export { default as BASE } from './base.json';
