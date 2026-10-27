// 토스 네이티브 저장소 드라이버. 계약은 storage/driver.js 그대로다:
// get은 동기(string | null), set·remove는 boolean, 어떤 메서드도 throw하지 않는다.
//
// 네이티브 Storage는 비동기라, 렌더 전에 RECORDS의 키를 모두 읽어 메모리에 올려 두고
// get은 메모리에서 읽는다. set·remove는 메모리를 먼저 바꾸고 네이티브에 쓰기를 던져 둔다(기다리지 않는다).
import { Storage } from '@apps-in-toss/web-framework';
import { RECORDS } from '../storage/records.js';

// 네이티브 호출이 동기로 throw하거나 reject해도 앱으로 새지 않게 한다.
function fireAndForget(fn) {
  try { Promise.resolve(fn()).catch(() => {}); } catch { /* 저장 실패는 다음 쓰기에서 다시 시도된다 */ }
}

// 토스 밖(SDK 호출이 throw)이거나 읽기에 실패하면 null — 호출부는 기존 로컬 드라이버를 그대로 둔다.
// (dev:toss에서는 @apps-in-toss/devtools의 mock Storage가 응답한다.)
export async function loadTossStorageDriver() {
  const keys = Object.values(RECORDS).map((r) => r.key);
  let values;
  try {
    values = await Promise.all(keys.map((key) => Storage.getItem(key)));
  } catch {
    return null;
  }
  const memory = new Map();
  keys.forEach((key, i) => { if (typeof values[i] === 'string') memory.set(key, values[i]); });

  return {
    name: 'toss',
    get(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    set(key, value) {
      memory.set(key, value);
      fireAndForget(() => Storage.setItem(key, value));
      return true;
    },
    remove(key) {
      memory.delete(key);
      fireAndForget(() => Storage.removeItem(key));
      return true;
    },
  };
}
