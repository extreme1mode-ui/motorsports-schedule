// 원격 계층의 시작점. main.jsx가 렌더 뒤에 startAccountSync()를 한 줄 부른다.
//
// 이번 단계는 로컬 → 서버 단방향이다. 서버 값을 로컬에 덮어쓰지 않는다.
// env가 없거나 네트워크가 끊겼거나 Supabase가 멈춰 있어도 앱은 지금과 똑같이 동작한다.
import { storage, subscribe } from '../storage/index.js';
import { REMOTE_ENABLED } from './config.js';
import { setCalendarToken } from './calendar-token.js';

const DEBOUNCE_MS = 1000;

let timer = null;
let pending = null;     // 아직 못 보낸 preferences
let started = false;

// 저장할 것이 생겼을 때 = 온보딩을 마친 사용자. 그 전에는 익명 사용자를 만들지 않는다.
const worthSaving = (prefs) => Boolean(prefs && prefs.onboarded === true);

async function flush() {
  clearTimeout(timer);
  timer = null;
  const prefs = pending;
  pending = null;
  if (!prefs) return;
  const { saveMyPreferences } = await import('./client.js');
  setCalendarToken(await saveMyPreferences(prefs));
}

function queue(prefs) {
  if (!worthSaving(prefs)) return;
  pending = prefs;
  clearTimeout(timer);
  timer = setTimeout(() => { flush(); }, DEBOUNCE_MS);
}

export function startAccountSync() {
  if (started || !REMOTE_ENABLED || typeof window === 'undefined') return;
  started = true;

  // 설정이 저장될 때마다 듣는다. 이번 단계는 preferences만 — favorites·alerts·attend·circuitMap은 올리지 않는다.
  subscribe((name, value) => { if (name === 'preferences') queue(value); });

  // 탭을 떠날 때 대기 중인 저장을 바로 보낸다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pending) flush();
  });

  // 이미 온보딩을 마쳤으면 첫 렌더 뒤 idle에 한 번 올린다(세션 확보도 이때 처음 일어난다).
  const initial = storage.preferences.read();
  if (!worthSaving(initial)) return;
  const run = () => queue(initial);
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 5000 });
  else setTimeout(run, 1500);
}
