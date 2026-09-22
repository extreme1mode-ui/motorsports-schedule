// 계측 단일 진입점. 노출은 track(event, props) 하나뿐이고, 어떤 도구(PostHog/GA/…)를 쓸지는 이 파일 안에서만 정한다.
//
// 동작 규칙
// - 개발 모드(import.meta.env.DEV): 전송하지 않고 console.debug만.
// - 프로덕션: VITE_ANALYTICS_KEY가 있을 때만 전송. 없으면 아무것도 안 함.
// - navigator.doNotTrack이 켜져 있으면 전송하지 않는다 (GDPR 고려).
// - 이름·이메일 같은 식별 정보는 어디서도 넣지 않는다. 속성은 열거형 문자열·숫자·불리언·문자열 배열만 통과시키고 나머지는 버린다.
// - 어떤 경우에도 앱을 죽이지 않는다 (전체 try/catch).

import { storage } from './storage/index.js';

const KEY = import.meta.env.VITE_ANALYTICS_KEY;
const DEV = Boolean(import.meta.env.DEV);
const MAX_STRING = 64;   // 자유 텍스트 유입 방지용 상한. 열거형 값은 이보다 훨씬 짧다.

function doNotTrack() {
  try {
    const v = navigator.doNotTrack ?? window.doNotTrack ?? navigator.msDoNotTrack;
    return v === '1' || v === 'yes' || v === 1;
  } catch { return false; }
}

// 허용: 짧은 문자열 / 유한한 숫자 / 불리언 / 짧은 문자열 배열. 그 외(객체, 긴 문자열, null…)는 버린다.
function cleanValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return value.length <= MAX_STRING ? value : undefined;
  if (Array.isArray(value)) {
    const arr = value.filter((v) => typeof v === 'string' && v.length <= MAX_STRING);
    return arr.length === value.length ? arr : undefined;
  }
  return undefined;
}

// 식별 정보로 쓰이는 키와 이메일 꼴의 값은 호출부 실수여도 나가지 않게 여기서 한 번 더 거른다.
const PII_KEYS = /^(email|e-mail|phone|tel|address|ip|user_?id|first_?name|last_?name|full_?name|username|nickname)$/i;
const looksLikeEmail = (v) => typeof v === 'string' && /@/.test(v);

function sanitize(props) {
  const out = {};
  if (!props || typeof props !== 'object') return out;
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEYS.test(k) || looksLikeEmail(v)) continue;
    const c = cleanValue(v);
    if (c !== undefined) out[k] = c;
  }
  return out;
}

// ---------- 전송: PostHog (EU 리전) ----------
// 도구를 바꾸려면 이 블록(send)만 교체한다. sanitize/doNotTrack/track은 도구와 무관.
const POSTHOG_HOST = 'https://eu.i.posthog.com';   // EU 프로젝트. 빠뜨리면 SDK 기본값(US)으로 가서 이벤트가 조용히 사라진다.
// 세션 리플레이: 켜려면 이 한 줄만 true로. (PostHog 프로젝트 설정의 Session replay도 켜져 있어야 한다.)
const SESSION_REPLAY_ENABLED = false;
const QUEUE_LIMIT = 200;   // SDK 로드 전 이벤트 보관 상한. 로드가 영영 실패하는 환경에서 무한히 쌓이지 않게.

let client = null;       // 로드 완료된 posthog 인스턴스
let loading = null;      // 진행 중인 import() promise
let failed = false;      // 로드 실패 → 이후 이벤트는 조용히 버린다
const queue = [];        // 로드 전 이벤트 [event, props] — 도착 순서 유지

function flushQueue() {
  while (client && queue.length) {
    const [event, props] = queue.shift();
    client.capture(event, props);
  }
}

// posthog-js(gzip ~60KB)는 첫 이벤트 시점에 동적 import. 첫 페인트를 막지 않는다.
function loadClient() {
  if (client || loading || failed) return;
  loading = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: POSTHOG_HOST,
        autocapture: false,                 // 클릭·입력 자동 수집 안 함. 이벤트는 설계해서 심었다.
        capture_pageview: false,            // 라우팅 없는 SPA — app_opened가 그 역할.
        capture_pageleave: false,           // 같은 이유로 $pageleave도 끔.
        person_profiles: 'identified_only', // 익명 방문자 프로필 생성 안 함.
        respect_dnt: true,                  // track()의 DNT 검사와 이중으로.
        disable_session_recording: !SESSION_REPLAY_ENABLED,
        disable_surveys: true,
        disable_web_experiments: true,
        advanced_disable_flags: true,       // 기능 플래그를 안 쓰므로 init 시 /flags 요청 생략.
      });
      // IP 기반 위치 추적 끄기. posthog-js 1.4xx에는 config 옵션이 없고(옛 `ip` 옵션은 @deprecated·무효),
      // 이벤트 속성 $geoip_disable=true가 서버의 GeoIP 변환을 건너뛰게 한다. register()로 모든 이벤트에 붙인다.
      // $ip 자체는 서버가 요청에서 채우므로 클라이언트에서 못 지운다 → 프로젝트 설정 "Discard client IP data"를 켜야 한다.
      posthog.register({ $geoip_disable: true });
      client = posthog;
      flushQueue();
    })
    .catch(() => {
      // 로드 실패(오프라인, 차단기 등)는 앱과 무관. 큐를 비우고 이후 이벤트는 버린다.
      failed = true; loading = null; queue.length = 0;
    });
}

function send(event, props) {
  if (failed) return;
  if (client) { client.capture(event, props); return; }
  if (queue.length < QUEUE_LIMIT) queue.push([event, props]);
  loadClient();
}

export function track(event, props = {}) {
  try {
    if (typeof event !== 'string' || !event) return;
    const clean = sanitize(props);
    if (DEV) { console.debug(`[analytics] ${event} ${JSON.stringify(clean)}`); return; }   // 한 줄 문자열: 콘솔·로그 수집기에서 그대로 읽히게
    if (!KEY || doNotTrack()) return;
    send(event, clean);
  } catch {
    // 계측 실패는 앱 동작에 영향을 주면 안 된다.
  }
}

// 첫 방문일(YYYY-MM-DD, 로컬 날짜만) 저장 후 경과 일수. 시각은 저장하지 않는다.
export function getDaysSinceFirstVisit(now = new Date()) {
  try {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let first = storage.firstVisit.read();
    if (!first || !/^\d{4}-\d{2}-\d{2}$/.test(first)) { first = today; storage.firstVisit.write(today); }
    const [fy, fm, fd] = first.split('-').map(Number);
    const [ty, tm, td] = today.split('-').map(Number);
    return Math.max(0, Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000));
  } catch { return 0; }
}
