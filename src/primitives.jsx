// 예전 인라인 스타일 셸(TweaksPanel)이 쓰는 색 이름 표. UX v2 화면은 tokens-v2.css(.gx)를 쓴다.
// 색은 src/styles/tokens.css 한 곳에서 온다. 테마는 <html data-theme>가 바꾸므로 dark/light가 같은 변수를 가리킨다.
// (예전에는 여기 hex를 따로 두어 tokens.css와 본문·보조 글자색이 달랐다.)
const VARS = {
  bg: 'var(--bg)', surface: 'var(--surface)', surface2: 'var(--surface2)', surface3: 'var(--surface3)',
  line: 'var(--line)', line2: 'var(--line2)',
  text: 'var(--text)', text2: 'var(--text2)', text3: 'var(--text3)', grid: 'var(--grid)',
  brand: 'var(--brand)', onbrand: 'var(--onbrand)',
};
export const TOKENS = { dark: VARS, light: VARS };
