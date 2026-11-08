// 경기별 즐겨찾기 수 = 그 경기에 하트를 켜 둔 기기 수. 하트를 끄면 줄어든다.
// - 서버(GET /api/likes)는 기준(LIKE_MIN) 이상인 경기만 돌려준다. 없는 경기·불러오는 중·실패는 숫자 없이 하트만.
// - 내가 누르면 서버를 기다리지 않고 바로 +1(끄면 −1). 서버 수에 내 하트가 들어가는 건 src/account/(익명 사용자, 온보딩 뒤).
// - 서버 응답은 CDN에 5분 캐시된다. 그 사이 잠깐 ±1 어긋날 수 있다.
import { useSyncExternalStore } from 'react';
import { isCancelled } from '../home/time.js';
import { getPrimarySession } from '../schedule/utils.js';

export const LIKE_MIN = 10;
const IS_TOSS = import.meta.env.MODE === 'toss';
// 숫자를 하트 버튼 안에 두는가. 버튼 안 숫자는 누르면 바로 바뀌어야 한다 — 토스는 내 하트가 세어지지 않으니(읽기만)
// 버튼 밖 정보 줄(상세 장소 줄 끝 · 카드 윗줄 끝)에 '♡ 1,234'로 둔다.
export const COUNT_IN_HEART = !IS_TOSS;
const API = `${IS_TOSS ? 'https://www.gantryracing.com' : ''}/api/likes`;
const REFRESH_MS = 5 * 60000;

// ---------- 서버 수(메모리) ----------
let counts = null;        // Map<경기 id, n> | null(아직 없음·실패)
let loadedAt = 0;
let inflight = null;
let version = 0;
const listeners = new Set();
// 처음 본 순간의 하트 상태(서버 수에 이미 들어 있다고 본다). 그 뒤 바뀐 만큼만 더하고 뺀다. 새 수를 받으면 다시 잰다.
const seen = new Map();

function emit() { version += 1; for (const fn of listeners) { try { fn(); } catch { /* 화면 사정은 저장에 영향을 주지 않는다 */ } } }

export function loadLikes() {
  if (inflight || typeof fetch !== 'function') return inflight;
  if (counts && Date.now() - loadedAt < REFRESH_MS) return null;
  inflight = fetch(API, { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (!json || typeof json.counts !== 'object' || json.counts === null) return;
      counts = new Map(Object.entries(json.counts).filter(([, n]) => Number.isInteger(n) && n >= LIKE_MIN));
      loadedAt = Date.now();
      seen.clear();
      emit();
    })
    .catch(() => { /* 실패는 조용히 — 숫자를 숨긴다 */ })
    .finally(() => { inflight = null; });
  return inflight;
}

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const run = () => loadLikes();
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 800);
  // 다시 돌아왔을 때 5분이 지났으면 새로 받는다. 숨어 있는 동안에는 부르지 않는다.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadLikes(); });
}

function subscribe(fn) {
  start();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// 수를 보여 주는 화면이 부른다. 수가 도착하면(또는 바뀌면) 다시 그린다.
export function useLikes() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

export function likeCount(race, fav) {
  if (!race || isCancelled(race) || !counts) return { show: false, n: 0 };
  const base = counts.get(race.id);
  if (base == null) return { show: false, n: 0 };
  if (!seen.has(race.id)) seen.set(race.id, !!fav);
  const n = IS_TOSS ? base : Math.max(0, base - (seen.get(race.id) ? 1 : 0) + (fav ? 1 : 0));
  return { show: n >= LIKE_MIN, n };
}

// 1,234 · 1.2만 / 1,234 · 12K. 숫자는 고정폭(.gx-tnum)이고 바뀐 자리만 굴러 내려온다(Roll).
export function formatCount(n, locale = 'ko') {
  if (n < 10000) return n.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');
  if (locale === 'ko') return `${(Math.floor(n / 1000) / 10).toString()}만`;
  return `${Math.floor(n / 100) / 10}K`;
}

// 홈 '많이 담은 경기': 이번·다음 주말 경기 중 아직 끝나지 않았고 기준을 넘은 것, 많은 순 최대 3개.
// 주말의 끝은 월요일 정오로 본다(일요일 밤·월요일 새벽 결승까지 그 주말).
function nextWeekendEnd(now) {
  const d = new Date(now); const day = d.getDay();
  const add = day === 1 && d.getHours() < 12 ? 0 : ((8 - day) % 7) || 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + add, 12).getTime() + 7 * 86400000;
}
export function popularRaces(races, favorites, now, { isAlive }) {
  if (!counts) return [];
  const until = nextWeekendEnd(now);
  return (races || [])
    .filter((r) => !isCancelled(r) && isAlive(r))
    .filter((r) => { const s = getPrimarySession(r); const t = s?.startUtc ? Date.parse(s.startUtc) : null; return t != null && t <= until; })
    .map((r) => ({ race: r, ...likeCount(r, favorites.has(r.id)) }))
    .filter((x) => x.show)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);
}
