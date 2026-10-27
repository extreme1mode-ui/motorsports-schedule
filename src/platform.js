// 빌드 타깃. 토스(앱인토스 미니앱)와 웹의 차이는 이 상수 하나로만 가른다.
// vite가 빌드 때 import.meta.env.MODE를 문자열로 바꾸므로, 웹 번들에서는 토스 분기가 통째로 지워진다.
import { useEffect, useRef } from 'react';

export const IS_TOSS = import.meta.env.MODE === 'toss'

// 플랫폼 기능. 화면 코드는 이 파일만 본다.
// 여기 있는 것은 웹 기본 구현이고, 토스 진입점(src/toss/main.jsx)이 시작할 때 setPlatform으로 토스 구현을 끼운다
// (storage/index.js의 setStorageDriver와 같은 방식). 토스 SDK는 src/toss/ 안에서만 import한다.
//
// 계약
// - launchParam(name)      -> string | null   진입 주소의 쿼리 값(?race=, ?tab=). 웹은 쓰지 않아 null.
// - clearLaunchParam(name) -> void             처리한 진입 값을 잊는다(웹의 주소 정리에 해당).
// - onSystemBack(handler)  -> () => void       시스템 뒤로가기 구독. 반환 함수로 해제한다.
// - shareRace({ id, title }) -> Promise<boolean>  앱 공유 시트로 공유했으면(또는 처리했으면) true.
//                                                 false면 화면이 웹 공유(navigator.share·클립보드)로 간다.
// - 어떤 메서드도 throw하지 않는다.
const webPlatform = {
  launchParam: () => null,
  clearLaunchParam: () => {},
  onSystemBack: () => () => {},
  shareRace: async () => false,
};

let impl = webPlatform;

export function setPlatform(next) {
  impl = { ...webPlatform, ...next };
}

export const launchParam = (name) => impl.launchParam(name);
export const clearLaunchParam = (name) => impl.clearLaunchParam(name);
export const shareRace = (args) => impl.shareRace(args);

// 시스템 뒤로가기. active일 때만 구독하고, 아니거나 언마운트되면 해제한다.
// 구독하지 않은 상태에서는 플랫폼 기본 동작(토스: 미니앱 종료)이 된다.
export function useSystemBack(active, handler) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useEffect(() => {
    if (!active) return undefined;
    return impl.onSystemBack(() => latest.current?.());
  }, [active]);
}
