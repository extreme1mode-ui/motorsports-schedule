// 토스 웹뷰의 아래 safe-area(홈 인디케이터). 웹뷰 안에서는 CSS env(safe-area-inset-bottom)이 0으로 와서
// 탭 바·아래 버튼이 화면 맨 아래(홈 인디케이터 위)에 붙는다. SDK 값을 --ait-sab로 넘기면 tokens-v2.css의
// --gx-sab가 env()와 큰 쪽을 쓴다(앱인토스 문서 '화면 > Safe Area': get()은 동기, subscribe는 해제 함수를 돌려준다).
// 문서에 이름이 SafeArea와 SafeAreaInsets 두 가지로 나와서 있는 쪽을 쓴다. 토스 밖이면 아무것도 하지 않는다(env() 그대로).
import * as ait from '@apps-in-toss/web-framework';

function setBottom(insets) {
  const b = Number(insets?.bottom);
  if (Number.isFinite(b) && b >= 0) document.documentElement.style.setProperty('--ait-sab', `${b}px`);
}

export function installSafeArea() {
  const api = ait.SafeArea ?? ait.SafeAreaInsets;
  if (!api) return () => {};
  try { setBottom(api.get()); } catch { /* 토스 밖 */ }
  try { return api.subscribe({ onEvent: setBottom }) || (() => {}); } catch { return () => {}; }
}
