// '한 바퀴'가 쓰는 플랫폼 기능 — 토스판. src/platform.js(토스 구현: File.saveBase64 · Device.triggerHaptic)를 쓴다.
//   LAP_SAVE          기록 카드에서 '공유하기' 대신 '이미지 저장'을 주 버튼으로 쓴다(토스 웹뷰에서는 공유 창이 열리지 않을 수 있다)
//   lapHaptic(kind)   진동. kind: 'off'(코스 이탈) · 'finish'(결승선)
//   lapSaveImage({ dataUrl, fileName }) -> Promise<boolean>  저장했으면 true
import { IS_TOSS, haptic, saveImage } from '../platform.js';

export const LAP_SAVE = IS_TOSS;
export const lapHaptic = (kind) => haptic(kind);
export const lapSaveImage = (args) => saveImage(args);
