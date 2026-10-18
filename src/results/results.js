// F1 경기 결과·드라이버 순위 데이터. 첫 화면 번들에 넣지 않고, 결과를 보여 줄 화면이 처음 그려질 때 받는다.
// - f1-2026.json: Jolpica F1 API(결과·순위)와 OpenF1(팀 색)의 값을 그대로 옮긴 스냅샷.
//   경기가 끝나면 `node tools/f1-results/update.mjs`로 갱신한다(tools/f1-results/README.md).
// - 드라이버 사진: public/drivers/f1-2026/<CODE>.webp (© Formula 1). 목록(photos.codes)에 없는 드라이버는 코드 원으로 그린다.
import { useSyncExternalStore } from 'react';

let cache = null;
let pending = null;
const subs = new Set();

function load() {
  if (cache || pending) return;
  pending = import('./f1-2026.json')
    .then((m) => {
      cache = m.default || m;
      subs.forEach((fn) => fn());
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
