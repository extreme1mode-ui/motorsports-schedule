// supabase-js가 쓰는 저장 어댑터. localStorage를 직접 만지지 않고 storage 드라이버를 거친다.
// supabase-js는 storageKey('gantry.auth') 말고도 같은 접두의 키를 더 만들 수 있어서,
// 레지스트리의 한 레코드가 아니라 키 문자열을 그대로 드라이버에 넘긴다.
import { getStorageDriver } from '../storage/index.js';

export const authStorage = {
  getItem(key) { return getStorageDriver().get(key); },
  setItem(key, value) { getStorageDriver().set(key, value); },
  removeItem(key) { getStorageDriver().remove(key); },
};
