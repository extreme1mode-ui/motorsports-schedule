// UX v2 시트. 모바일은 아래에서 올라오는 시트(손잡이·제목 줄을 끌어 닫기), 데스크톱(dialog)은 가운데 대화상자 + X.
// - 열려 있는 동안 뒤 화면은 inert(앱 루트 .gx 안에서 시트 줄기 밖의 형제 전부), Tab은 시트 안에서만 돈다. Esc로 닫는다.
// - 첫 포커스는 지금 고른 값([aria-checked="true"]), 없으면 첫 줄·버튼. 닫히면 연 요소로 포커스를 돌려준다.
// - 여는 중(올라오는 중간)에 닫아도 지금 자리에서 내려간다: 닫을 때의 위치를 읽어 거기서부터 Web Animations로 내린다.
// - .gx 안의 레이어(#gx-layer)로 포털한다(새 토큰이 적용되고, 서킷 맵 #cm과 겹치지 않는다).
import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ui2.css';
import { Icon } from './Icon.jsx';
import { getLayer } from './hooks.js';
import { useT } from '../i18n/index.js';

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
// CSS 길이 토큰('180ms') → ms. 줄인 움직임이면 1ms.
function durationOf(el, name, fallback) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? (v.endsWith('s') && !v.endsWith('ms') ? n * 1000 : n) : fallback;
}

export function Sheet({ open, onClose, title, sub, children, footer, dialog = false }) {
  const tr = useT();
  const tid = useId();
  // 닫히는 움직임이 끝날 때까지는 그린다
  const [shown, setShown] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) { setPrevOpen(open); if (open) setShown(true); }

  const wrapRef = useRef(null);
  const sheetRef = useRef(null);
  const scrimRef = useRef(null);
  const close = useEffectEvent(() => onClose?.());

  // 닫기: 지금 위치에서 아래로(대화상자는 살짝 작아지며 사라짐). 다시 열면 움직임을 거두고 제자리로.
  useLayoutEffect(() => {
    const el = sheetRef.current; const scrim = scrimRef.current;
    if (!el) return undefined;
    if (open) {
      el.getAnimations().forEach((a) => { if (a instanceof CSSAnimation) return; a.cancel(); });
      el.style.transform = '';
      return undefined;
    }
    const cs = getComputedStyle(el);
    const from = { transform: cs.transform === 'none' ? 'none' : cs.transform, opacity: cs.opacity };
    const fromScrim = scrim ? getComputedStyle(scrim).opacity : '1';
    el.getAnimations().forEach((a) => a.cancel());
    scrim?.getAnimations().forEach((a) => a.cancel());
    const timing = { duration: durationOf(el, '--d2', 180), easing: 'cubic-bezier(.3, 0, .8, .15)', fill: 'forwards' };
    const to = dialog ? { transform: 'scale(.98)', opacity: 0 } : { transform: 'translateY(100%)', opacity: from.opacity };
    const anim = el.animate([from, to], timing);
    scrim?.animate([{ opacity: fromScrim }, { opacity: 0 }], timing);
    anim.onfinish = () => setShown(false);
    return () => { anim.onfinish = null; };
  }, [open, dialog]);

  // 열린 동안: 뒤 화면 inert, Tab 가두기, Esc, 첫 포커스, 닫히면 포커스 돌려주기
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const wrap = wrapRef.current; const root = wrap?.closest('.gx'); const locked = [];
    if (root) {
      for (let n = wrap; n && n !== root; n = n.parentElement) {
        for (const sib of n.parentElement?.children || []) {
          if (sib !== n && !sib.inert) { sib.inert = true; locked.push(sib); }
        }
      }
    }
    const focusTimer = setTimeout(() => {
      const el = sheetRef.current?.querySelector('[aria-checked="true"]') || sheetRef.current?.querySelector('.gx-sheet-body button, .gx-sheet-foot button, .gx-sheet-body a[href]');
      (el || sheetRef.current)?.focus({ preventScroll: true });
    }, 60);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      const box = sheetRef.current;
      if (e.key !== 'Tab' || !box) return;
      const list = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length);
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0]; const last = list[list.length - 1]; const inside = box.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey, true);
      locked.forEach((el) => { el.inert = false; });
      if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    };
  }, [open]);

  // 끌어서 닫기: 아래로 끌면 따라 내려오고, 1/4 넘게 또는 빠르게 놓으면 닫는다. 위로는 고무줄처럼 조금만. 대화상자는 끌지 않는다.
  const drag = useRef(null);
  const onDown = (e) => {
    const el = sheetRef.current;
    if (!el || dialog || e.button > 0 || e.target.closest('button')) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0, h: el.offsetHeight };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    el.style.transition = 'none';
  };
  const onMove = (e) => {
    const d = drag.current; if (!d) return;
    const raw = e.clientY - d.y; d.dy = raw > 0 ? raw : raw / 6;
    sheetRef.current.style.transform = `translateY(${d.dy}px)`;
    if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0, 1 - Math.max(0, d.dy) / d.h));
  };
  const onUp = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    const el = sheetRef.current; const v = d.dy / Math.max(1, performance.now() - d.t);
    el.style.transition = '';
    if (d.dy > Math.min(140, d.h / 4) || (d.dy > 24 && v > 0.6)) { onClose?.(); return; }
    if (scrimRef.current) scrimRef.current.style.opacity = '';
    el.style.transform = '';
  };

  if (!shown && !open) return null;
  const layer = getLayer();
  if (!layer) return null;
  return createPortal(
    <div ref={wrapRef} className={`gx-sheet-wrap${dialog ? ' is-dialog' : ''}${open ? '' : ' is-closing'}`}>
      <button type="button" className="gx-scrim" aria-label={tr('aria.close')} tabIndex={-1} onClick={onClose} ref={scrimRef} />
      <div className="gx-sheet" role="dialog" aria-modal="true" aria-labelledby={title ? tid : undefined} tabIndex={-1} ref={sheetRef}>
        <div className="gx-sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="gx-handle" aria-hidden="true" />
          <button type="button" className="gx-iconbtn gx-sheet-x" aria-label={tr('aria.close')} onClick={onClose}><Icon n="close" s={20} /></button>
          {title && <h2 className="gx-t22 gx-sheet-t" id={tid}>{title}</h2>}
          {sub && <p className="gx-t15 gx-sheet-sub">{sub}</p>}
        </div>
        <div className="gx-sheet-body">{children}</div>
        {footer && <div className="gx-sheet-foot">{footer}</div>}
      </div>
    </div>,
    layer,
  );
}
