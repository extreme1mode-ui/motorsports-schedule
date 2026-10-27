// 외부 링크를 토스 밖 브라우저로 연다. 화면 코드의 <a>는 그대로 두고 document 캡처 단계에서 가로챈다.
// 대상: http(s) a[href] 중 target="_blank"이거나 다른 origin인 것 (중계·티켓·공식 사이트·사진 출처).
// stopPropagation은 하지 않는다 — 링크의 onClick 계측은 그대로 돈다.
import { Device } from '@apps-in-toss/web-framework';

function externalHref(anchor) {
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (anchor.target === '_blank' || url.origin !== window.location.origin) return url.href;
  } catch { /* 해석할 수 없는 주소는 브라우저 기본 동작에 맡긴다 */ }
  return null;
}

function onClick(event) {
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!anchor) return;
  const href = externalHref(anchor);
  if (!href) return;
  event.preventDefault();
  try {
    Promise.resolve(Device.openURL(href)).catch(() => {});
  } catch {
    // 토스 밖(SDK 호출이 throw): 브라우저가 하던 대로 새 탭으로 연다.
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

export function installExternalLinks() {
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
