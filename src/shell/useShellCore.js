// 셸 공통 상태: 고르기 시트, 스낵바(되돌리기 + 포커스 돌려주기), 화면 기억(mem). 모바일·데스크톱 셸이 같이 쓴다.
import { useCallback, useRef, useState } from 'react';
import { useSnack } from '../ui2/hooks.js';
import { activeElement, focusBack } from './utils.js';

export function useShellCore() {
  const [sheet, setSheet] = useState(null);          // { k, arg } | null
  const sheetFrom = useRef(null);                     // 시트를 연 줄 — 시트 안에서 고른 결과의 되돌리기 포커스 자리
  // 시트가 열려 있는 동안 스낵바는 숨기고(Snackbar hidden) 시간도 멈춘다
  const [snack, show, hideSnack, holdSnack] = useSnack({ paused: !!sheet });
  const [mem] = useState(() => ({}));                 // 탭을 옮겨도 남는 화면 기억(메모리만)

  const openSheet = useCallback((k, arg) => { sheetFrom.current = activeElement(); setSheet({ k, arg }); }, []);
  const closeSheet = useCallback(() => setSheet(null), []);
  // 되돌리기를 누르면 스낵바가 사라지니, 포커스는 처음 누른 요소(시트 안이면 시트를 연 줄)로 돌려준다
  const toast = useCallback((text, action) => {
    let from = activeElement();
    if (from?.closest?.('.gx-sheet')) from = sheetFrom.current;
    show(text, action ? { label: action.label, fn: () => { action.fn(); requestAnimationFrame(() => focusBack(from)); } } : undefined);
  }, [show]);

  return { sheet, openSheet, closeSheet, snack, holdSnack, hideSnack, toast, mem };
}
