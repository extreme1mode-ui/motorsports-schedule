// 빌드 타깃. 토스(앱인토스 미니앱)와 웹의 차이는 이 상수 하나로만 가른다.
// vite가 빌드 때 import.meta.env.MODE를 문자열로 바꾸므로, 웹 번들에서는 토스 분기가 통째로 지워진다.
export const IS_TOSS = import.meta.env.MODE === 'toss'
