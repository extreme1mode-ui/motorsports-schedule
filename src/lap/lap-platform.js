// '한 바퀴'가 쓰는 플랫폼 기능 — 웹 기본 구현. 토스판(feat/toss)은 이 파일만 바꿔 src/platform.js의 토스 구현을 쓴다.
//   LAP_SAVE          기록 카드에서 '공유하기' 대신 '이미지 저장'을 주 버튼으로 쓰는가
//   lapHaptic(kind)   진동. kind: 'off'(코스 이탈) · 'finish'(결승선). 안 되는 브라우저(iOS Safari 등)에서는 아무 일도 없다
//   lapSaveImage({ dataUrl, fileName }) -> Promise<boolean>  저장했으면 true
export const LAP_SAVE = false;
export function lapHaptic(kind) {
  try { navigator.vibrate?.(kind === 'off' ? 40 : 20); } catch { /* 진동을 못 쓰는 브라우저 */ }
}
export async function lapSaveImage() { return false; }
