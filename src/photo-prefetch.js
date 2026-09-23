// 상세 헤더 사진을 누르기 전에 받아둔다. 상세를 여는 순간 연결 설정(DNS/TCP/TLS)부터 시작하면
// 빠른 회선에서도 300ms 근처의 바닥값이 생긴다.
//
// (a) 의도 시점: 리스트 행의 pointerdown — click보다 먼저 와서 그 사이에 다운로드가 시작된다. 낭비 0.
// (b) 화면에 보이는 앞쪽 몇 개만 낮은 우선순위로. 전부 받으면 모바일에서 낭비가 크다.
import { useEffect, useRef } from 'react';
import { photo } from './home/photos.js';

const requested = new Set();          // 이미 요청한 URL. 중복 요청을 막는다.
export const VISIBLE_PREFETCH_LIMIT = 3;

// 회선이 느리면 미리 받는 장수를 줄인다. Slow 4G(400kbps)에서 3장을 동시에 받으면
// 대역을 다 써서 정작 사용자가 누른 첫 행이 오히려 늦어진다(실측: 첫 행 1.5s → 1.6s).
// 1장만 받으면 경합 없이 맨 위 행만 이득을 본다.
function visibleBudget(limit) {
  try {
    const c = navigator.connection;
    if (!c) return limit;
    if (c.saveData) return 0;
    return c.effectiveType === '4g' ? limit : 1;
  } catch { return limit; }
}

// 상세 헤더가 쓰는 것과 같은 URL('card')을 받아둔다. 같은 URL이어야 캐시가 걸린다.
export function prefetchRacePhoto(race, { priority = 'auto' } = {}) {
  if (!race || typeof Image === 'undefined') return null;
  let url;
  try { url = photo(race, 'card'); } catch { return null; }
  if (!url || requested.has(url)) return null;
  requested.add(url);
  const img = new Image();
  // fetchPriority는 미지원 브라우저에서 그냥 무시된다.
  img.fetchPriority = priority;
  img.decoding = 'async';
  img.src = url;
  return url;
}

export function hasPrefetched(race) {
  try { return requested.has(photo(race, 'card')); } catch { return false; }
}

// 리스트 행에 그대로 펼쳐 쓰는 핸들러. onPointerDown이 없는 환경을 위해 포커스에도 건다.
export function prefetchHandlers(race) {
  const run = () => prefetchRacePhoto(race, { priority: 'high' });
  return { onPointerDown: run, onFocus: run };
}

// 화면에 들어온 행 중 앞의 N개만 낮은 우선순위로 받아둔다.
// containerRef 안에서 [data-prefetch-index]를 가진 요소를 관찰한다.
export function useVisiblePrefetch(containerRef, races, { limit = VISIBLE_PREFETCH_LIMIT } = {}) {
  const budget = useRef(limit);
  useEffect(() => { budget.current = visibleBudget(limit); }, [limit, races]);
  useEffect(() => {
    const root = containerRef?.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const targets = [...root.querySelectorAll('[data-prefetch-index]')];
    if (!targets.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      // 위에 있는 행부터. 사용자가 실제로 누르는 건 대개 위쪽이다.
      const visible = entries.filter((e) => e.isIntersecting)
        .sort((a, b) => Number(a.target.dataset.prefetchIndex) - Number(b.target.dataset.prefetchIndex));
      for (const entry of visible) {
        if (budget.current <= 0) { observer.disconnect(); return; }
        const race = races[Number(entry.target.dataset.prefetchIndex)];
        if (prefetchRacePhoto(race, { priority: 'low' })) budget.current -= 1;
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px' });
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef, races]);
}
