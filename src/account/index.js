// 원격 계층의 시작점. main.jsx가 렌더 뒤에 startAccountSync()를 한 줄 부른다.
//
// 로컬 → 서버 단방향이다. 서버 값을 로컬에 덮어쓰지 않는다.
// - preferences: 관심 설정 + 개인 캘린더 토큰
// - favorites: 경기별 즐겨찾기 수를 세기 위한 목록(목록 전체를 보내 서버를 맞춘다 — 놓친 변경도 다음에 저절로 맞춰진다)
// env가 없거나 네트워크가 끊겼거나 Supabase가 멈춰 있어도 앱은 지금과 똑같이 동작한다.
import { storage, subscribe } from '../storage/index.js';
import { REMOTE_ENABLED } from './config.js';
import { setCalendarToken } from './calendar-token.js';

const DEBOUNCE_MS = 1000;

let timer = null;
let pending = null;     // 아직 못 보낸 preferences
let likesTimer = null;
let likesPending = null; // 아직 못 보낸 즐겨찾기 목록(Set)
let started = false;
const RACE_ID = /^[a-z0-9-]{1,80}$/;
const MAX_LIKES = 500;   // DB 함수와 같은 상한

// 저장할 것이 생겼을 때 = 온보딩을 마친 사용자. 그 전에는 익명 사용자를 만들지 않는다.
const worthSaving = (prefs) => Boolean(prefs && prefs.onboarded === true);

async function flush() {
  clearTimeout(timer);
  timer = null;
  const prefs = pending;
  pending = null;
  if (!prefs) return;
  const { saveMyPreferences } = await import('./client.js');
  // 저장에 실패하면(null) 받아 둔 토큰을 그대로 둔다. 지우면 설정 화면 주소가 예전 쿼리 주소로 되돌아간다.
  const token = await saveMyPreferences(prefs);
  if (token) setCalendarToken(token);
}

function queue(prefs) {
  if (!worthSaving(prefs)) return;
  pending = prefs;
  clearTimeout(timer);
  timer = setTimeout(() => { flush(); }, DEBOUNCE_MS);
}

async function flushLikes() {
  clearTimeout(likesTimer);
  likesTimer = null;
  const set = likesPending;
  likesPending = null;
  if (!set) return;
  const ids = [...set].filter((id) => typeof id === 'string' && RACE_ID.test(id)).slice(0, MAX_LIKES);
  const { saveMyLikes } = await import('./client.js');
  await saveMyLikes(ids);
}

// 즐겨찾기도 온보딩을 마친 뒤에만 올린다(그 전에는 익명 사용자가 없다). 온보딩을 마치는 순간 지금 목록을 한 번에 올린다.
function queueLikes(favorites) {
  if (!worthSaving(storage.preferences.read())) return;
  likesPending = favorites instanceof Set ? favorites : new Set(Array.isArray(favorites) ? favorites : []);
  clearTimeout(likesTimer);
  likesTimer = setTimeout(() => { flushLikes(); }, DEBOUNCE_MS);
}

export function startAccountSync() {
  if (started || !REMOTE_ENABLED || typeof window === 'undefined') return;
  started = true;

  // 저장될 때마다 듣는다. preferences와 favorites만 — alerts·attend·circuitMap은 올리지 않는다.
  let wasOnboarded = worthSaving(storage.preferences.read());
  subscribe((name, value) => {
    if (name === 'preferences') {
      queue(value);
      // 방금 온보딩을 마쳤다 = 익명 사용자가 막 생긴다. 그 전에 담아 둔 하트를 한 번에 올린다.
      if (!wasOnboarded && worthSaving(value)) { wasOnboarded = true; queueLikes(storage.favorites.read()); }
    }
    if (name === 'favorites') queueLikes(value);
  });

  // 탭을 떠날 때 대기 중인 저장을 바로 보낸다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    if (pending) flush();
    if (likesPending) flushLikes();
  });

  // 이미 온보딩을 마쳤으면 첫 렌더 뒤 idle에 한 번 올린다(세션 확보도 이때 처음 일어난다).
  // 즐겨찾기도 같이 — 목록을 통째로 보내므로 지난 방문에 못 보낸 변경도 여기서 맞춰진다.
  const initial = storage.preferences.read();
  if (!worthSaving(initial)) return;
  const run = () => { queue(initial); queueLikes(storage.favorites.read()); };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 5000 });
  else setTimeout(run, 1500);
}
