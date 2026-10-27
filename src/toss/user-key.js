// 토스 익명 사용자 키. 렌더를 막지 않고 시작 뒤에 받아 storage.tossUser에 둔다.
// 키 값은 로그에 찍지 않고 어디에도 보내지 않는다 — 서버 연동은 다음 단계.
// 실패하거나(토스 밖·오류) 토스 앱 버전이 낮으면 아무것도 하지 않는다.
import { User } from '@apps-in-toss/web-framework';
import { storage } from '../storage/index.js';

export async function syncTossUserKey() {
  try {
    if (!User.getAnonymousKey.isSupported()) return;
    const res = await User.getAnonymousKey();   // 앱 버전이 낮거나 오류면 throw한다(타입 정의)
    if (res?.type === 'HASH' && typeof res.hash === 'string' && res.hash) storage.tossUser.write(res.hash);
  } catch {
    // 익명 키가 없어도 앱은 그대로 돈다.
  }
}
