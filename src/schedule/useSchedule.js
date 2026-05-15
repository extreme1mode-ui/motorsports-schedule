import { useEffect, useMemo, useState } from 'react';
import { getFallbackScheduleData, loadScheduleData } from './service.js';

export function getCurrentNow() {
  return new Date();
}

export function useScheduleData(now = new Date()) {
  const seasonYear = now.getFullYear();
  const [state, setState] = useState(() => ({
    races: getFallbackScheduleData(now),
    loading: true,
    error: null,
    usingFallback: true,
    lastUpdatedAt: null,
  }));

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const nextState = await loadScheduleData(seasonYear, getCurrentNow());
      if (cancelled) return;
      setState({
        races: nextState.races,
        loading: false,
        error: nextState.error,
        usingFallback: nextState.usingFallback,
        lastUpdatedAt: nextState.lastUpdatedAt,
      });
    }

    refresh();
    const intervalId = window.setInterval(refresh, 15 * 60 * 1000);
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

