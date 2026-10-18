// 개인 캘린더 토큰을 화면에 건네는 자리. 이 모듈은 supabase-js를 import하지 않는다 —
// 설정 화면이 이것만 가져다 쓰므로, 토큰이 없을 때 지도·계정 청크가 딸려오지 않는다.
import { useSyncExternalStore } from 'react';

let token = null;
const subscribers = new Set();

export function setCalendarToken(next) {
  const value = typeof next === 'string' && next ? next : null;
  if (value === token) return;
  token = value;
  for (const fn of subscribers) {
    try { fn(token); } catch { /* 구독자 사정은 저장에 영향을 주지 않는다 */ }
  }
}

export function getCalendarToken() { return token; }

// 토큰이 생기면(또는 바뀌면) 다시 그린다. 없으면 null — 호출부가 기존 주소로 폴백한다.
// 외부 저장소라 useSyncExternalStore로 읽는다(구독 전에 도착한 값도 그대로 집어 온다).
function subscribe(onChange) {
  subscribers.add(onChange);
  return () => { subscribers.delete(onChange); };
}

export function useCalendarToken() {
  return useSyncExternalStore(subscribe, getCalendarToken, () => null);
}
