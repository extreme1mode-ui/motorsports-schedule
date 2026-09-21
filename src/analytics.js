// 계측 단일 진입점. 노출은 track(event, props) 하나뿐이고, 어떤 도구(PostHog/GA/…)를 쓸지는 이 파일 안에서만 정한다.
//
// 동작 규칙
// - 개발 모드(import.meta.env.DEV): 전송하지 않고 console.debug만.
// - 프로덕션: VITE_ANALYTICS_KEY가 있을 때만 전송. 없으면 아무것도 안 함.
// - navigator.doNotTrack이 켜져 있으면 전송하지 않는다 (GDPR 고려).
// - 이름·이메일 같은 식별 정보는 어디서도 넣지 않는다. 속성은 열거형 문자열·숫자·불리언·문자열 배열만 통과시키고 나머지는 버린다.
// - 어떤 경우에도 앱을 죽이지 않는다 (전체 try/catch).

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

// 실제 전송. 도구가 정해지면 이 함수만 바꾼다.
//   PostHog 예) posthog.capture(event, props)
//   GA4 예)     gtag('event', event, props)
function send(event, props) {
  void event; void props; void KEY;
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
const FIRST_VISIT_KEY = 'paddock.firstVisit';
export function getDaysSinceFirstVisit(now = new Date()) {
  try {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let first = localStorage.getItem(FIRST_VISIT_KEY);
    if (!first || !/^\d{4}-\d{2}-\d{2}$/.test(first)) { first = today; localStorage.setItem(FIRST_VISIT_KEY, today); }
    const [fy, fm, fd] = first.split('-').map(Number);
    const [ty, tm, td] = today.split('-').map(Number);
    return Math.max(0, Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000));
  } catch { return 0; }
}
