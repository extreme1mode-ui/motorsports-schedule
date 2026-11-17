// '한 바퀴' 순위표 서버 읽기: GET /api/lap(api/lap.js → Supabase lap_board). 토스는 www.gantryracing.com 주소로.
// - 서킷 · 기간 · 내 기록(ms) · 내 pid마다 한 번 받아 메모리에 두고, 1분이 지나 다시 볼 때 새로 받는다.
// - 실패 · 불러오는 중이면 없는 것으로 본다 → 순위표는 이 기기 기록만으로(서버가 없을 때와 같다). 오류 화면 · 콘솔 오류 없음.
// - 실서비스 빌드는 늘 서버를 본다. 데모 빌드는 조절 판 '순위표'가 server일 때만(sample · empty는 서버를 부르지 않는다).
import { useSyncExternalStore } from 'react';
import { demoClock } from '../demo/clock.js';
import { lapConfig } from './config.js';

const IS_TOSS = import.meta.env.MODE === 'toss';
const API = `${IS_TOSS ? 'https://www.gantryracing.com' : ''}/api/lap`;
const TTL = 60000;
const PID = /^p_[0-9a-f]{24}$/;

export const serverOn = (board = lapConfig().board) => !demoClock.enabled || board === 'server';

const cache = new Map();      // key → { at, data }
const inflight = new Map();   // key → promise
const listeners = new Set();
let version = 0;
const emit = () => { version += 1; for (const fn of listeners) { try { fn(); } catch { /* 화면 사정은 받기에 영향을 주지 않는다 */ } } };

const keyOf = (id, period, ms, pid) => `${id}|${period}|${ms ?? ''}|${ms != null && pid ? pid : ''}`;

// 받은 값 다시 확인(api가 이미 거르지만, 다른 출처의 응답일 수도 있다)
function clean(j) {
  if (!j || typeof j !== 'object' || !Array.isArray(j.rows)) return null;
  const row = (r) => (r && PID.test(r.pid) && Number.isInteger(r.ms) ? { pid: r.pid, ms: r.ms, at: Number(r.at) || 0 } : null);
  const rows = j.rows.slice(0, 50).map(row).filter(Boolean);
  const c = j.ctx && Number.isInteger(j.ctx.ahead) ? { ahead: j.ctx.ahead, above: (j.ctx.above || []).map(row).filter(Boolean), below: (j.ctx.below || []).map(row).filter(Boolean), listed: j.ctx.listed === true } : null;
  return { period: String(j.period || ''), count: Number.isInteger(j.count) ? j.count : rows.length, rows, topGhost: Array.isArray(j.topGhost) ? j.topGhost : null, ctx: c, ms: Number.isInteger(j.ms) ? j.ms : null };
}

// 받아 두기(이미 있고 1분 안이면 아무것도 안 한다). 돌려주는 것: promise | null
export function loadBoard(id, period, ms = null, pid = null) {
  if (!id || typeof fetch !== 'function' || !serverOn()) return null;
  const k = keyOf(id, period, ms, pid);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL) return null;
  if (inflight.has(k)) return inflight.get(k);
  const q = new globalThis.URLSearchParams({ track: id, period });   // eslint 설정에 없는 전역이라 globalThis로
  if (ms != null) { q.set('ms', String(ms)); if (pid && PID.test(pid)) q.set('pid', pid); }
  const p = fetch(`${API}?${q}`, { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { const d = clean(j); if (d) { cache.set(k, { at: Date.now(), data: d }); emit(); } })
    .catch(() => { /* 실패는 조용히 — 이 기기 기록만으로 */ })
    .finally(() => { inflight.delete(k); });
  inflight.set(k, p);
  return p;
}

// 지금 가진 것 중 가장 맞는 것: 같은 ms의 것(내 자리까지 정확) → 같은 서킷 · 기간의 가장 최근 것 → null
export function serverBoard(id, period, ms = null, pid = null) {
  if (!id || !serverOn()) return null;
  const exact = cache.get(keyOf(id, period, ms, pid));
  if (exact) return exact.data;
  let best = null;
  for (const [k, v] of cache) if (k.startsWith(`${id}|${period}|`) && (!best || v.at > best.at)) best = v;
  return best ? best.data : null;
}

// 받은 것이 바뀌면 다시 그리게
const subscribe = (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const getVersion = () => version;
export function useRemoteVersion() { return useSyncExternalStore(subscribe, getVersion, getVersion); }
// 데모 · 시험: 받아 둔 것 비우기
export function clearRemote() { cache.clear(); emit(); }
