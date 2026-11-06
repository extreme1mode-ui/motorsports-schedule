// 개발 모드 전용: 셸의 시트·스낵바를 화면 밖에서 부르는 통로(window.__gantryShell).
// UX v2 2단계에서는 시트를 여는 줄이 아직 화면에 없어서(설정 개편은 6단계) 확인용으로 둔다. 빌드에는 들어가지 않는다.
import { useEffect } from 'react';

export function useDevShellHook(shell) {
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__gantryShell = { openSheet: shell.openSheet, toast: shell.toast };
    return () => { delete window.__gantryShell; };
  }, [shell.openSheet, shell.toast]);
}
