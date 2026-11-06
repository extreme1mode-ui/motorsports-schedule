// 셸 컨텍스트(UX v2): 화면이 셸에 부탁하는 일. 모바일(App.jsx)·데스크톱(web.jsx)이 같은 모양으로 채운다.
//   push(route)      화면 스택에 넣기(모바일) / 서랍 스택에 넣기(데스크톱). route: { t: 'detail', id } | { t: 'settings' } | { t: 'series', cat }
//   back()           한 단계 뒤로
//   openSettings()   설정 열기(모바일은 스택, 데스크톱은 설정 탭)
//   openSheet(k, a)  고르기 시트: 'mode'(a = 시리즈) · 'theme' · 'country' · 'lang' · 'cal'
//   toast(text, act) 스낵바. act = { label, fn } 이면 되돌리기 — 누르면 처음 누른 요소로 포커스가 돌아온다
//   mem              탭을 옮겨도 남는 화면 기억(일정 보기·칩·달·고른 날, 고른 시리즈). 메모리만 — 저장소에 쓰지 않는다
//   desktop          데스크톱 셸인지
import { createContext, useContext } from 'react';

const noop = () => {};
export const ShellContext = createContext({
  push: noop, back: noop, openSettings: noop, openSheet: noop, toast: noop, mem: {}, desktop: false,
});

export function useShell() {
  return useContext(ShellContext);
}
