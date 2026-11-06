// 셸 도우미(컴포넌트 아님).
import { useEffect } from 'react';

export const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
// 지금 포커스가 있는 요소(body면 null)
export const activeElement = () => {
  const el = typeof document !== 'undefined' ? document.activeElement : null;
  return el && el !== document.body ? el : null;
};
// 포커스 되돌리기: 그 요소가 아직 있으면 거기로, 없으면 지금 보이는 화면 제목([data-view-title])으로
export function focusBack(el, scope = document) {
  if (el && el !== 'title' && el.isConnected && typeof el.focus === 'function' && !el.closest('[inert]')) { el.focus({ preventScroll: true }); return; }
  const titles = [...scope.querySelectorAll('[data-view-title]')].filter((t) => !t.closest('[inert], [hidden]') && t.getClientRects().length);
  titles[titles.length - 1]?.focus({ preventScroll: true });
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
// 서랍처럼 aria-modal인 영역 안에서만 Tab이 돌게(onKeyDown에 단다)
export function trapTab(e) {
  if (e.key !== 'Tab') return;
  const box = e.currentTarget;
  const list = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length && !el.closest('[inert]'));
  if (!list.length) return;
  const first = list[0]; const last = list[list.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// 위 막대 1px 선(SPEC 8장): 스크롤 상자가 맨 위가 아닐 때만 data-sc="1"을 단다(CSS가 그때만 선을 그린다).
// 걸린 머리(날짜·주, [data-stick])는 실제로 위에 붙어 있을 때만 data-stuck. 읽기를 먼저 하고 쓰기는 나중에.
// 대상: rootRef 안에서 스크롤 이벤트가 나는 요소. window 스크롤(데스크톱)은 document.scrollingElement.
export function useScrollEdges(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const mark = (box) => {
      const scrolled = box.scrollTop > 2;
      const heads = box === document.scrollingElement ? root.querySelectorAll('[data-stick]') : box.querySelectorAll('[data-stick]');
      const boxTop = box === document.scrollingElement ? 0 : box.getBoundingClientRect().top;
      const stuck = [...heads].map((h) => {
        const cs = getComputedStyle(h);
        if (cs.position !== 'sticky') return false;
        const top = h.getBoundingClientRect().top;
        return scrolled && Math.abs(top - (boxTop + (parseFloat(cs.top) || 0))) < 1 && h.parentElement.getBoundingClientRect().top < top - 1;
      });
      if (scrolled !== (box.dataset.sc === '1')) { if (scrolled) box.dataset.sc = '1'; else delete box.dataset.sc; }
      heads.forEach((h, i) => { if (stuck[i] !== h.hasAttribute('data-stuck')) h.toggleAttribute('data-stuck', stuck[i]); });
    };
    const onScroll = (e) => {
      const el = e.target === document ? document.scrollingElement : e.target;
      if (el instanceof HTMLElement && (el === document.scrollingElement || root.contains(el))) mark(el);
    };
    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, [rootRef]);
}
