// Cloudflare Turnstile (Invisible). 익명 로그인 직전에 한 번만 부른다.
// 사이트 키가 없으면 스크립트를 아예 받지 않는다. 세션이 이미 있으면 이 모듈도 평가되지 않는다.
import { TURNSTILE_KEY } from './config.js';

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TIMEOUT_MS = 15000;

let scriptPromise = null;

function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SCRIPT;
    el.async = true;
    el.onload = () => resolve(window.turnstile);
    el.onerror = () => { scriptPromise = null; reject(new Error('turnstile script')); };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

// 토큰 하나를 받아 돌려준다. 못 받으면 null — 호출부는 CAPTCHA 없이 그대로 진행한다.
// 토큰은 한 번 쓰고 버린다(위젯도 같이 지운다).
export async function getTurnstileToken() {
  if (!TURNSTILE_KEY || typeof document === 'undefined') return null;

  let box = null;
  let widgetId = null;
  try {
    const api = await loadScript();
    if (!api || typeof api.render !== 'function') return null;

    // 화면에 아무것도 보이면 안 된다 (Invisible 모드).
    box = document.createElement('div');
    box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    box.setAttribute('aria-hidden', 'true');
    document.body.appendChild(box);

    return await new Promise((resolve) => {
      const done = (value) => { clearTimeout(timer); resolve(value); };
      const timer = setTimeout(() => done(null), TIMEOUT_MS);
      try {
        widgetId = api.render(box, {
          sitekey: TURNSTILE_KEY,
          callback: (token) => done(token || null),
          'error-callback': () => done(null),
          'timeout-callback': () => done(null),
        });
      } catch { done(null); }
    });
  } catch {
    return null;
  } finally {
    try { if (widgetId != null && window.turnstile?.remove) window.turnstile.remove(widgetId); } catch { /* 지우기 실패는 넘어간다 */ }
    try { box?.remove(); } catch { /* 같음 */ }
  }
}
