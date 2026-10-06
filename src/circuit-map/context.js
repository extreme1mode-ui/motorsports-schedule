// 지도의 비(非)컴포넌트 부분. CircuitMap.jsx에서 떼어 두면 Fast Refresh가 컴포넌트 파일을 그대로 갱신한다.
import { createContext, useContext } from 'react';
import { storage } from '../storage/index.js';
import { venueOfRace } from './venues/index.js';

export const CircuitMapCtx = createContext(null);
export const useCircuitMap = () => useContext(CircuitMapCtx);

// 지도가 있는 경기: venues/index.js에 등록된 경기.
export function hasMap(race) {
  return !!venueOfRace(race);
}

// 지도 코어가 쓰는 저장소. 레지스트리의 한 레코드(storage.circuitMap, JSON 객체) 안에 키별로 둔다.
//   싱가포르(sgp26)는 처음부터 최상위에 저장해 왔으므로 그대로 두고, 다른 경기는 '@<id>' 아래에 둔다.
const slot = (id) => (id === 'sgp26' ? null : `@${id}`);
export function mapStoreFor(id) {
  const k = slot(id);
  const read = () => { const o = storage.circuitMap.read(); return k ? (o[k] && typeof o[k] === 'object' ? o[k] : {}) : o; };
  const write = (sub) => { if (!k) { storage.circuitMap.write(sub); return; } const o = storage.circuitMap.read(); o[k] = sub; storage.circuitMap.write(o); };
  return {
    get(key, d) { const o = read(); return Object.prototype.hasOwnProperty.call(o, key) ? o[key] : d; },
    set(key, v) { const o = read(); o[key] = v; write(o); },
    del(key) { const o = read(); delete o[key]; write(o); },
  };
}
export const mapStore = mapStoreFor('sgp26');
