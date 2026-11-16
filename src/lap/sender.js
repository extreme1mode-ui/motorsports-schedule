// '한 바퀴' 기록을 서버로 보내는 함수 자리. 웹 진입점의 원격 계층(src/account/index.js startAccountSync)이 채운다.
// 토스 빌드는 원격 계층을 부르지 않으므로 비어 있고, supabase-js도 토스 번들에 들어가지 않는다.
let sender = null;
export function setLapSender(fn) { sender = typeof fn === 'function' ? fn : null; }
export const lapSender = () => sender;
