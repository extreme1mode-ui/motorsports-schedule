// 지도의 비(非)컴포넌트 부분. CircuitMap.jsx에서 떼어 두면 Fast Refresh가 컴포넌트 파일을 그대로 갱신한다.
import { createContext, useContext } from 'react';
import { storage } from '../storage/index.js';

export const CircuitMapCtx = createContext(null);
export const useCircuitMap = () => useContext(CircuitMapCtx);

// 지금 지도가 있는 경기: 2026 싱가포르 GP 하나.
export function hasMap(race) {
  if (!race || race.series !== 'F1') return false;
  if (!String(race.raceDateKst || race.weekendStart || '').startsWith('2026')) return false;
  return /Marina Bay|마리나 베이|Singapore/i.test([race.circuit, race.circuitKo, race.city].join(' '));
}

// 지도 코어가 쓰는 저장소. 레지스트리의 한 레코드(JSON 객체) 안에 키별로 둔다.
export const mapStore = {
  get(k, d) { const o = storage.circuitMap.read(); return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : d; },
  set(k, v) { const o = storage.circuitMap.read(); o[k] = v; storage.circuitMap.write(o); },
  del(k) { const o = storage.circuitMap.read(); delete o[k]; storage.circuitMap.write(o); },
};
