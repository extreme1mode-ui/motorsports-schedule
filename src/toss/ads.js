// 토스 배너 광고(TossAds). src/platform.js의 attachBanner 계약을 채운다.
// 순서는 문서 그대로다: 앱 시작 때 initialize 한 번 → onInitialized 뒤에 attachBanner → 화면을 떠날 때 destroy.
// 광고 모양(색·글꼴·라벨·'Ad' 표시)은 SDK 그대로 두고, 새로고침은 SDK가 알아서 한다(자체 타이머 없음).
//
// 아래 중 하나라도 해당하면 광고를 쓰지 않는다 — 자리는 onEmpty로 지워진다.
// - TossAds.initialize·attachBanner가 지원되지 않는다(isSupported false, 토스 밖)
// - 토스 앱 5.241.0 미만(웹뷰 배너의 최소 버전. 낮으면 빈 화면이 뜰 수 있다)
// - 초기화 실패
import { TossAds, isMinVersionSupported } from '@apps-in-toss/web-framework';

// 광고 그룹 ID. 콘솔의 운영 ID는 하나라 모든 자리에 같이 쓴다.
const LIVE_IDS = {
  schedule: 'ait.v2.live.46af688ac32d4d8e',   // 일정 탭
  detail: 'ait.v2.live.46af688ac32d4d8e',     // 경기 상세
  home: 'ait.v2.live.46af688ac32d4d8e',       // 홈
  series: 'ait.v2.live.46af688ac32d4d8e',     // 시리즈
  fav: 'ait.v2.live.46af688ac32d4d8e',        // 저장
};
const MIN_VERSION = { android: '5.241.0', ios: '5.241.0' };

// 어떤 ID를 쓸지 — 빌드 때 정한다(주소로 고르지 않는다)
// - 기본 빌드(npm run build:toss, 검수·출시용): 늘 운영 ID. 테스트 ID 문자열은 번들에 들어가지 않는다
//   (검수는 번들에 테스트 ID가 있으면 반려한다)
// - 테스트 ID(ait-ad-test-banner-id)는 두 경우만
//   - 개발 모드(npm run dev:toss)
//   - 테스트 번들(npm run build:toss:adtest = VITE_TOSS_AD_TEST=1, 콘솔 QR 확인용. 검수에는 올리지 않는다)
// AD_TEST는 빌드 때 true/false로 바뀌어, 쓰지 않는 쪽 ID는 번들에서 지워진다. 운영 ID로 테스트하면 정책 위반이 될 수 있다.
const AD_TEST = import.meta.env.DEV || import.meta.env.VITE_TOSS_AD_TEST === '1';
const adGroupIdFor = (slot) => (AD_TEST ? 'ait-ad-test-banner-id' : LIVE_IDS[slot]) || null;

let state = 'idle';           // idle → pending → ready | off
const waiting = new Set();    // 초기화를 기다리는 자리들

function settle(next) {
  state = next;
  const list = [...waiting];
  waiting.clear();
  list.forEach((run) => run());
}

function supported() {
  try {
    return TossAds.initialize.isSupported() && TossAds.attachBanner.isSupported() && isMinVersionSupported(MIN_VERSION);
  } catch {
    return false;   // 토스 밖: SDK 호출이 throw한다
  }
}

// 앱 시작 때 한 번(src/toss/main.jsx, 렌더 뒤). 두 번 불러도 다시 초기화하지 않는다.
export function initAds() {
  if (state !== 'idle') return;
  if (!supported()) { settle('off'); return; }
  state = 'pending';
  try {
    TossAds.initialize({
      callbacks: {
        onInitialized: () => settle('ready'),
        onInitializationFailed: () => settle('off'),
      },
    });
  } catch {
    settle('off');
  }
}

// 자리 하나에 배너를 붙인다. 돌려준 함수로 뗀다. throw하지 않는다.
// onRendered: 광고가 그려졌다(자리에 여백을 준다) · onEmpty: 광고가 없다(자리를 지운다)
export function attachBanner(slot, element, { onRendered, onEmpty } = {}) {
  let banner = null;
  let detached = false;
  const empty = () => { try { banner?.destroy(); } catch { /* 이미 지워졌다 */ } banner = null; onEmpty?.(); };

  const run = () => {
    if (detached) return;
    const id = adGroupIdFor(slot);
    if (state !== 'ready' || !id || !element) { onEmpty?.(); return; }
    try {
      banner = TossAds.attachBanner(id, element, {
        variant: 'card',
        theme: 'light',
        callbacks: {
          onAdRendered: () => { if (!detached) onRendered?.(); },
          onNoFill: () => { if (!detached) empty(); },
          onAdFailedToRender: () => { if (!detached) empty(); },
        },
      });
    } catch {
      empty();
    }
  };

  if (state === 'idle' || state === 'pending') waiting.add(run);
  else run();

  return () => {
    detached = true;
    waiting.delete(run);
    try { banner?.destroy(); } catch { /* 이미 지워졌다 */ }
    banner = null;
  };
}
