// F1 경기 결과·드라이버 순위 데이터. 첫 화면 번들에 넣지 않고, 결과를 보여 줄 화면이 처음 그려질 때 받는다.
// - f1-2026.json: Jolpica F1 API(결과·순위)와 OpenF1(팀 색)의 값을 그대로 옮긴 스냅샷.
//   경기가 끝나면 `node tools/f1-results/update.mjs`로 갱신한다(tools/f1-results/README.md).
// - 드라이버 사진: public/drivers/f1-2026/<CODE>.webp (© Formula 1). 목록(photos.codes)에 없는 드라이버는 코드 원으로 그린다.
import { useSyncExternalStore } from 'react';

let bundled = null;    // 번들의 f1-2026.json
let override = null;   // setF1Results로 끼운 데이터(토스 빌드만)
let cache = null;
let pending = null;
const subs = new Set();

// 사진 목록은 언제나 번들 값이다. 받아 온 데이터에 새 드라이버가 있어도 번들에 사진 파일이 없으면 코드 원으로 그린다.
function publish() {
  cache = override ? { ...override, photos: bundled.photos } : bundled;
  subs.forEach((fn) => fn());
}

function load() {
  if (bundled || pending) return;
  pending = import('./f1-2026.json')
    .then((m) => {
      bundled = m.default || m;
      publish();
    })
    .catch(() => { /* 결과가 없어도 화면은 지금처럼 그린다 */ })
    .finally(() => { pending = null; });
}

function subscribe(fn) {
  subs.add(fn);
  load();
  return () => { subs.delete(fn); };
}
const noSubscribe = () => () => {};

// 결과 데이터를 바꿔 끼우는 자리. 토스 빌드가 받아 온 최신 결과를 넣는다(src/toss/data-feed.js). 웹은 부르지 않는다.
export function setF1Results(data) {
  override = data;
  if (bundled) publish();
  else load();
}
const snapshot = () => cache;

// enabled가 false면 받지 않고 null을 돌려준다(F1이 아닌 경기 상세).
export function useF1Results(enabled = true) {
  const data = useSyncExternalStore(enabled ? subscribe : noSubscribe, snapshot, snapshot);
  return enabled ? data : null;
}

// OpenF1 경로의 경기는 id가 f1-<meeting_key>이고, 정적 일정과 맞을 때만 staticId가 붙는다.
export const raceKey = (race) => (race ? race.staticId || race.id : null);

export function resultOf(data, race) {
  if (!data || !race || race.series !== 'F1') return null;
  return data.races[raceKey(race)] || null;
}

export const teamColor = (hex) => (hex ? `#${hex}` : 'transparent');

export function photoOf(data, code) {
  const p = data && data.photos;
  if (!p || !code || !p.codes.includes(code)) return null;
  return `${p.base}${code}${p.ext}`;
}

// 원형 사진에서 얼굴 가운데(가로, 사진 폭 대비). 원본에서 얼굴이 가운데를 벗어난 드라이버만 적는다. 없으면 0.5.
// 319px 사진에서 얼굴 높이 구간 좌우 끝의 가운데를 잰 값(2026-10).
const PHOTO_FOCUS_X = { HAD: 0.386, SAI: 0.414, ALO: 0.444, RUS: 0.445, COL: 0.603 };
export const photoFocusX = (code) => PHOTO_FOCUS_X[code] ?? 0.5;
