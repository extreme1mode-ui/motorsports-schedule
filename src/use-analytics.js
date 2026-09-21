// 계측용 훅. analytics.js(순수 함수)와 분리해 둔다.
import { useEffect, useRef } from 'react';
import { track } from './analytics.js';

// 추천 목록 노출: 목록 구성(id 순서)이 바뀔 때만 항목별로 1회 recommendation_shown.
export function useRecommendationShown(races) {
  const key = races.map((r) => r.id).join('|');
  const lastRef = useRef(null);
  useEffect(() => {
    if (!key || lastRef.current === key) return;
    lastRef.current = key;
    races.forEach((r) => track('recommendation_shown', { series: r.series, reason_kinds: ['upcoming'] }));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
