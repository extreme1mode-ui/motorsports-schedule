// UX v2 스낵바. 아래에서 8px 올라오며 나타나고(260 감속), 사라질 때 180 가속으로 내려간다.
// - 라이브 영역(role=status)이 문구와 '되돌리기 버튼이 있어요'를 읽어 준다.
// - 손가락·포인터·포커스가 올라가 있는 동안은 시간이 멈춘다(onHold → useSnack의 hold). WCAG 2.2.1.
// - 자리(placement): 'tabbar' 탭 바 위 · 'bar' 아래 고정 바 위 · 'bottom' 아래 24 · 'desktop' 오른쪽 아래 · 'drawer' 데스크톱 서랍 안.
// - hidden: 시트가 열려 있는 동안 잠시 숨김.
// msg: { id, text, action?: { label, fn } } | null — useSnack()이 만든다.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import './ui2.css';
import { getLayer } from './hooks.js';
import { useT } from '../i18n/index.js';

// drawerWidth: 'drawer' 자리일 때 서랍 폭(스낵바 폭 = 서랍 폭 − 64)
export function Snackbar({ msg, onHold, placement = 'bottom', hidden = false, drawerWidth }) {
  const tr = useT();
  // 사라지는 움직임 동안 마지막 문구를 붙들어 둔다
  const [last, setLast] = useState(msg);
  if (msg && msg !== last) setLast(msg);
  const m = msg || last;
  const live = msg ? `${msg.text}${msg.action ? `. ${tr('toast.actionHint', { label: msg.action.label })}` : ''}` : '';
  const node = (
    <>
      <div className="gx-vh" role="status" aria-live="polite">{live}</div>
      {m && (
        <div key={m.id} className={`gx-snack is-${placement}${msg ? '' : ' is-out'}${hidden ? ' is-hidden' : ''}`}
          style={placement === 'drawer' && drawerWidth ? { '--gx-drawer-w': `${drawerWidth}px` } : undefined}
          onAnimationEnd={() => { if (!msg) setLast(null); }}
          onPointerEnter={() => onHold?.(true)} onPointerLeave={() => onHold?.(false)}
          onFocus={() => onHold?.(true)} onBlur={() => onHold?.(false)}>
          <span className="gx-t15" aria-hidden="true">{m.text}</span>
          {m.action && <button type="button" className="gx-snack-a gx-t15" onClick={m.action.fn} tabIndex={msg ? 0 : -1}>{m.action.label}</button>}
        </div>
      )}
    </>
  );
  const layer = getLayer();
  return layer ? createPortal(node, layer) : null;
}
