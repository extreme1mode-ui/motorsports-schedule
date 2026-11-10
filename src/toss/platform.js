// 토스 플랫폼 구현. src/platform.js의 계약(launchParam·clearLaunchParam·onSystemBack·shareRace·attachBanner)을 채운다.
// SDK 호출은 토스 밖에서 동기로 throw한다 — 그때는 웹 기본 동작(구독 없음·웹 공유)으로 둔다.
import { Environment, Share, graniteEvent, File, Device } from '@apps-in-toss/web-framework';
import { attachBanner } from './ads.js';

const APP_SCHEME = 'intoss://gantry';
const LAUNCH_KEYS = ['race', 'tab'];

function pick(search) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(LAUNCH_KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
}

// 진입 주소의 쿼리. 웹뷰 주소(location.search)에 오면 그걸 쓰고, 없으면 SDK의 진입 스킴 URL(Environment.initialURL)에서 읽는다.
function readLaunchParams() {
  try {
    const found = pick(window.location.search);
    if (Object.keys(found).length) return found;
  } catch { /* 주소를 못 읽으면 진입 URL로 */ }
  try {
    const initial = String(Environment.initialURL || '');
    const q = initial.indexOf('?');
    if (q >= 0) return pick(initial.slice(q + 1).split('#')[0]);
  } catch { /* 진입 URL을 못 읽으면(토스 밖) 진입 값 없이 시작한다 */ }
  return {};
}

export function createTossPlatform() {
  const launch = new Map(Object.entries(readLaunchParams()));
  return {
    attachBanner,
    launchParam: (name) => launch.get(name) ?? null,
    clearLaunchParam: (name) => { launch.delete(name); },
    // 기록 카드: File.saveBase64(토스 앱 Android 5.218.0 · iOS 5.216.0 이상). 토스 밖이나 낮은 버전에서는 false
    async saveImage({ dataUrl, fileName }) {
      try { await File.saveBase64({ data: String(dataUrl).split(',')[1] || '', fileName, mimeType: 'image/png' }); return true; }
      catch { return false; }
    },
    // 진동: Device.triggerHaptic. 이탈은 'error', 결승선은 'success'
    haptic(kind) {
      try { Device.triggerHaptic({ type: kind === 'off' ? 'error' : 'success' })?.catch?.(() => {}); }
      catch { /* 토스 밖 */ }
    },
    onSystemBack(handler) {
      try { return graniteEvent.addEventListener('backEvent', { onEvent: handler, onError: () => {} }); }
      catch { return () => {}; }
    },
    async shareRace({ id, title }) {
      if (!id) return true;
      let linkPromise;
      try {
        linkPromise = Share.createLink({ path: `${APP_SCHEME}?race=${encodeURIComponent(id)}` });
      } catch {
        return false;   // 토스 밖: 화면이 웹 공유로 간다
      }
      try {
        const link = await linkPromise;
        await Share.sendMessage({ message: title ? `${title}\n${link}` : link });
      } catch { /* 취소했거나 공유가 막혔다 — 토스 안에서는 웹 공유로 넘기지 않는다 */ }
      return true;
    },
  };
}
