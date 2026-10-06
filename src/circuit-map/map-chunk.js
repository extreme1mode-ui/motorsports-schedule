// 지도 코어 청크. 코어·마크업·지도 CSS를 한 덩어리로 묶는다 (경기와 무관한 부분).
// 경기 데이터(설정 + base.json)는 경기마다 따로 받는다 — venues/index.js의 load.
// 첫 화면에서는 받지 않는다 — load-chunk.js가 지도를 처음 열 때(또는 미리 불러오기로) import()한다.
// 여기 CSS가 오기 전에 #cm을 보이면 화면이 깨지므로, 레이어는 이 모듈이 준비된 뒤에 hidden을 푼다.
import './circuit-map.css';
import './basemap.css';

export { GantryMap } from './map-core.js';
export { mapMarkup } from './map-markup.js';
