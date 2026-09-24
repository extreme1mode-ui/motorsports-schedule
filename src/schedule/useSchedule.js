import { useEffect, useMemo, useState } from 'react';
import { getFallbackScheduleData, hasSeasonData, loadScheduleData } from './service.js';

export function getCurrentNow() {
  return new Date();
}

const REFRESH_MS = 15 * 60 * 1000;

// 연도별 로드 결과 캐시(모듈 단위). 훅 인스턴스가 다시 마운트돼도(모바일↔웹 셸 전환, 온보딩 종료 등) 같은 요청을 또 보내지 않는다.
// 진행 중인 요청은 promise를 공유하고, 끝난 요청은 REFRESH_MS 동안 재사용한다. 주기 갱신은 force로 캐시를 건너뛴다.
const loadCache = new Map(); // year → { promise, at }
function loadScheduleCached(year, { force = false } = {}) {
  const hit = loadCache.get(year);
  if (!force && hit && Date.now() - hit.at < REFRESH_MS) return hit.promise;
  const entry = { at: Date.now(), promise: loadScheduleData(year, getCurrentNow()) };
  loadCache.set(year, entry);
  return entry.promise;
}

export function useScheduleData(now = new Date()) {
  const seasonYear = now.getFullYear();
  const [state, setState] = useState(() => ({
    races: getFallbackScheduleData(seasonYear, now),
    loading: true,
    error: null,
    usingFallback: true,
    seasonSupported: hasSeasonData(seasonYear),
    lastUpdatedAt: null,
  }));

  useEffect(() => {
    let cancelled = false;

    async function refresh(force = false) {
      const nextState = await loadScheduleCached(seasonYear, { force });
      if (cancelled) return;
      if (nextState.error) {
        console.warn('[schedule] Falling back to local schedule data', nextState.error);
      }
      setState({
        races: nextState.races,
        loading: false,
        error: nextState.error,
        usingFallback: nextState.usingFallback,
        seasonSupported: nextState.seasonSupported !== false,   // 해당 연도 데이터가 아예 없으면 false (빈 일정)
        lastUpdatedAt: nextState.lastUpdatedAt,
      });
    }

    refresh();
    const intervalId = window.setInterval(() => refresh(true), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [seasonYear]);

  return useMemo(() => ({
    ...state,
    seasonYear,
  }), [seasonYear, state]);
}
