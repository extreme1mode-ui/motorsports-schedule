// 저장 단일 진입점. 앱 어디서도 localStorage를 직접 만지지 않는다.
//
// 쓰는 법
//   import { storage } from './storage/index.js';
//   const favorites = storage.favorites.read();   // 항상 동기. 실패해도 기본값을 준다.
//   storage.favorites.write(favorites);           // 실패해도 throw하지 않는다.
//
// 왜 이 층이 필요한가
// - 저장하는 값의 목록이 records.js 한 곳에 모인다 (전에는 6개 파일에 흩어져 있었다).
// - 어떤 값이 기기 고정이고 어떤 값이 계정 동기화 대상인지 scope로 선언돼 있다.
// - 매체를 바꿔도 화면 코드는 그대로다 (setStorageDriver).
//
// 로그인을 붙일 때
//   화면은 계속 여기서 동기적으로 읽는다. 원격 계층은 accountStores()만 훑어서
//   로그인 직후 1회 병합 → 이후 write 때마다 뒤에서 서버로 밀어 넣고, 서버에서 받은 값은
//   다시 storage.<name>.write()로 로컬에 반영한다. 드라이버는 로컬 그대로 둔다.

import { createLocalDriver } from './driver.js';
import { RECORDS } from './records.js';

let driver = createLocalDriver();

// 테스트나 다른 매체(메모리·네이티브 저장소 등)로 갈아끼우는 자리.
export function setStorageDriver(next) {
  driver = next || createLocalDriver();
}

export function getStorageDriver() {
  return driver;
}

function createStore(record) {
  return {
    key: record.key,
    scope: record.scope,
    read() {
      const raw = driver.get(record.key);
      return raw === null ? record.fallback() : record.codec.decode(raw, record.fallback);
    },
    write(value) {
      const raw = record.codec.encode(value);
      if (raw === null) return false;
      return driver.set(record.key, raw);
    },
    clear() {
      return driver.remove(record.key);
    },
  };
}

export const storage = Object.freeze(
  Object.fromEntries(
    Object.entries(RECORDS).map(([name, record]) => [name, Object.freeze(createStore(record))]),
  ),
);

// 로그인 시 기기 간 동기화 대상. 원격 계층은 이 목록만 보면 된다.
export function accountStores() {
  return Object.entries(storage).filter(([, store]) => store.scope === 'account');
}
