// 모션용 훅. 값은 tokens.css의 --dur-*/--ease-* 토큰을 CSS 쪽에서 쓴다.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// active가 false → true로 바뀐 순간에만 pop 클래스를 켜고, animationend에 끈다. (끌 때는 반응 없음)
// 이전 값 비교는 렌더 중 상태 조정 패턴(effect 안 setState 금지 규칙 준수).
export function usePop(active) {
  const [prev, setPrev] = useState(active);
  const [pop, setPop] = useState(false);
  if (active !== prev) {
    setPrev(active);
    if (active) setPop(true);
  }
  const onAnimationEnd = () => setPop(false);
  return [pop ? ' pop' : '', onAnimationEnd];
}

// 이미지를 미리 받아 로드 완료 여부를 돌려준다. url이 바뀌면 다시 false부터 (캐시돼 있어도 onload는 비동기로 오므로 짧게 페이드인).
export function useImageLoaded(url) {
  const [state, setState] = useState({ url, loaded: false });
  if (state.url !== url) setState({ url, loaded: false });
  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setState((s) => (s.url === url ? { url, loaded: true } : s)); };
    img.src = url;
    return () => { alive = false; };
  }, [url]);
  return state.url === url && state.loaded;
}

// ---------- 탭 전환 ----------
// View Transitions API가 있으면 크로스페이드로, 없으면 즉시. 콜백 안의 setState는 flushSync로 동기 커밋해야 스냅샷이 맞는다.
export function withViewTransition(commit, flushSync) {
  if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
    document.startViewTransition(() => flushSync(commit));
  } else {
    commit();
  }
}

// 탭별 scrollTop 기억/복원. 컨테이너(ref)가 없으면 window 기준.
// save(view)는 view가 바뀌기 직전에, 복원은 view가 바뀐 뒤 페인트 전에(useLayoutEffect) 즉시(behavior auto).
export function useScrollMemory(view, containerRef) {
  const positions = useRef({});
  const save = useCallback((v) => {
    const el = containerRef?.current;
    positions.current = { ...positions.current, [v]: el ? el.scrollTop : window.scrollY };
  }, [containerRef]);
  useLayoutEffect(() => {
    const top = positions.current[view] || 0;
    const el = containerRef?.current;
    (el || window).scrollTo({ top, behavior: 'auto' });
  }, [view, containerRef]);
  return save;
}

// 전환 후 새 화면 제목([data-view-title], tabIndex=-1)으로 포커스. 스크롤은 건드리지 않는다.
export function useFocusViewTitle(view) {
  useEffect(() => {
    const el = document.querySelector('[data-view-title]');
    if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
  }, [view]);
}

// ---------- 열기/닫기 (퇴장 애니메이션이 끝난 뒤 언마운트) ----------
// open이 false로 바뀌면 mounted는 유지하고 closing=true → 퇴장 animationend(onExitEnd) 또는 타임아웃 폴백 뒤에 언마운트.
export function usePresence(open, fallbackMs = 600) {
  const [prevOpen, setPrevOpen] = useState(open);
  const [phase, setPhase] = useState(open ? 'open' : 'closed');   // 'open' | 'closing' | 'closed'
  if (open !== prevOpen) {                                          // 렌더 중 상태 조정 (effect 안 setState 금지 규칙)
    setPrevOpen(open);
    setPhase(open ? 'open' : 'closing');
  }
  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const t = setTimeout(() => setPhase('closed'), fallbackMs);     // animationend가 안 오는 환경(숨김 탭, reduced-motion 등) 폴백
    return () => clearTimeout(t);
  }, [phase, fallbackMs]);
  const onExitEnd = useCallback((e) => { if (!e || e.target === e.currentTarget) setPhase('closed'); }, []);
  return { mounted: phase !== 'closed', closing: phase === 'closing', onExitEnd };
}
