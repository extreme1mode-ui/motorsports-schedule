// UX v2 부품이 같이 쓰는 훅·도우미 (컴포넌트가 아닌 것만 — react-refresh 규칙).
import { useCallback, useEffect, useRef, useState } from 'react';

// 이어 쓰는 가운뎃점: 점 앞에서 줄이 바뀌지 않게(줄 첫 글자가 '·'가 되지 않음)
export const SEP = '\u00A0· ';
export const joinDot = (list) => list.filter(Boolean).join(SEP);

// 시트·스낵바가 포털하는 자리: 앱 루트 .gx 안의 레이어(App.jsx Root의 #gx-layer). 없으면 body.
// .gx 안이라 새 토큰이 그대로 적용되고, 서킷 맵(#cm)과 겹치지 않는다.
export function getLayer() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('gx-layer') || document.body;
}

// 고르는 묶음 공통(세그먼트·탭): ←/→(↑/↓)로 옮기며 바로 고르고, 고른 칸으로 포커스. Tab은 고른 칸에서 한 번만.
export function arrowPick(e, options, value, onChange) {
  const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (!(e.key in keys)) return;
  e.preventDefault();
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  const n = (i + keys[e.key] + options.length) % options.length;
  onChange(options[n].v);
  const btns = e.currentTarget.querySelectorAll('[role="radio"], [role="tab"]');
  requestAnimationFrame(() => btns[n]?.focus());
}

// 위 막대 제목: 큰 제목(sel)이 막대(barHeight) 뒤로 지나간 뒤에만 켠다 — 같은 이름이 두 번 보이지 않게.
// [ref, on] — ref는 스크롤하는 요소에 단다.
export function useScrolledTitle(sel = 'h1', barHeight = 56) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => {
      const h = el.querySelector(sel);
      setOn(!!h && h.getBoundingClientRect().bottom < el.getBoundingClientRect().top + barHeight);
    };
    el.addEventListener('scroll', check, { passive: true });
    const raf = requestAnimationFrame(check);   // 처음 한 번(복원된 스크롤 위치)
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', check); };
  }, [sel, barHeight]);
  return [ref, on];
}

// 스낵바 상태: show(text, action?)로 띄우고 정한 시간 뒤 사라진다(되돌리기가 있으면 5초, 없으면 4초).
// hold(true)인 동안(손·포인터·포커스가 올라가 있음)과 paused인 동안(시트가 열려 있음)은 멈추고, 풀리면 다시 센다.
// action: { label, fn } — 누르면 닫고 fn을 부른다. [msg, show, hide, hold]
let snackSeq = 0;
export function useSnack({ duration = 4000, actionDuration = 5000, paused = false } = {}) {
  const [msg, setMsg] = useState(null);
  const [held, setHeld] = useState(false);
  const hide = useCallback(() => setMsg(null), []);
  const show = useCallback((text, action) => {
    snackSeq += 1;
    setMsg({ id: snackSeq, text, action: action ? { label: action.label, fn: () => { setMsg(null); action.fn?.(); } } : null });
  }, []);
  useEffect(() => {
    if (!msg || held || paused) return undefined;
    const timer = setTimeout(() => setMsg(null), msg.action ? actionDuration : duration);
    return () => clearTimeout(timer);
  }, [msg, held, paused, duration, actionDuration]);
  return [msg, show, hide, setHeld];
}
