// 비 예보 — 서버(GET /api/weather, MET Norway 중계·요약)가 준 값을 메모리에 들고 화면에 꺼내 준다.
// 서버는 비가 오는 세션만 보낸다: races[경기 id].sessions[세션 시작 ISO] = { level, mm, symbol }.
// 없음·불러오는 중·실패는 모두 '배지 없음'이다(오류 표시 없음). 끝난 세션은 여기서 한 번 더 거른다(서버 캐시가 3시간이라).
import { useSyncExternalStore } from 'react';
import { getSessionEnd } from '../home/time.js';
import { getVisibleSessions } from '../schedule/utils.js';

const IS_TOSS = import.meta.env.MODE === 'toss';
const API = `${IS_TOSS ? 'https://www.gantryracing.com' : ''}/api/weather`;
const REFRESH_MS = 30 * 60000;   // 서버는 3시간 캐시. 앱을 오래 켜 둔 사람만 30분마다 다시 묻는다(CDN이 받는다)

let data = null;      // { races } | null
let loadedAt = 0;
let inflight = null;
let version = 0;
const listeners = new Set();

function emit() { version += 1; for (const fn of listeners) { try { fn(); } catch { /* 화면 사정은 무시 */ } } }

export function loadWeather() {
  if (inflight || typeof fetch !== 'function') return inflight;
  if (data && Date.now() - loadedAt < REFRESH_MS) return null;
  inflight = fetch(API, { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (!json || typeof json.races !== 'object' || json.races === null) return;
      data = { races: json.races };
      loadedAt = Date.now();
      emit();
    })
    .catch(() => { /* 실패는 조용히 — 배지를 숨긴다 */ })
    .finally(() => { inflight = null; });
  return inflight;
}

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const run = () => loadWeather();
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 800);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadWeather(); });
}

function subscribe(fn) {
  start();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// 예보를 보여 주는 화면이 부른다. 예보가 도착하면 다시 그린다.
export function useWeather() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

const NONE = { ok: false };

// 경기 하나의 예보: { ok, updatedAt, of(session) → { level, mm, symbol } | null }
export function forecastFor(race) {
  const entry = race && data?.races?.[race.id];
  if (!entry || typeof entry.sessions !== 'object' || entry.sessions === null) return NONE;
  const updatedAt = Date.parse(entry.updatedAt);
  return {
    ok: true,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
    of(s) {
      const t = s?.startUtc ? Date.parse(s.startUtc) : NaN;
      if (!Number.isFinite(t)) return null;
      const w = entry.sessions[new Date(t).toISOString()];
      if (!w || !(w.level >= 1 && w.level <= 3)) return null;
      const end = getSessionEnd(race, s)?.getTime();
      if (end == null || Date.now() >= end) return null;   // 끝난 세션
      return w;
    },
  };
}

// 경기 하나의 가장 센 비 예보(주어진 세션 중, 끝나지 않은 것). 목록 줄·카드용
export function raceWx(race, sessions) {
  const f = forecastFor(race);
  if (!f.ok) return null;
  let best = null;
  for (const s of sessions) { const w = f.of(s); if (w && (!best || w.level > best.level)) best = w; }
  return best;
}

export const WX_LEVEL_KEY = { 1: 'detail.wx.light', 2: 'detail.wx.rain', 3: 'detail.wx.thunder' };
export const viewModeOf = (preferences, s) => (preferences?.series?.[s] === 'all' ? 'all' : 'race');

// 경기 하나의 가장 센 비 예보(보는 세션 중 · 끝나지 않은 것). 부르는 화면은 useWeather()로 구독한다
export function wxOfRace(race, preferences) {
  return raceWx(race, getVisibleSessions(race, viewModeOf(preferences, race.series)));
}

// 상세 세션 줄용: 경기 예보를 한 번 꺼내 세션마다 묻는다
export function useSessionWx(race) {
  useWeather();
  const f = forecastFor(race);
  return f.ok ? f.of : () => null;
}

// 홈 덱 카드: 진행 중 카드에는 붙이지 않는다 — 카드가 이미 노랑
export function useCardWx(race, preferences, live) {
  useWeather();
  return live ? null : wxOfRace(race, preferences);
}
