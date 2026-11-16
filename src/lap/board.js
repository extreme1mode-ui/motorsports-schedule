// '한 바퀴' 순위표: 서킷마다 '이번 주'(월요일 0시 UTC = 한국 오전 9시에 새로) · '전체'. 한 사람은 한 줄(가장 빠른 기록).
// 지금(데모)은 이 기기의 내 기록 + 계산으로 만든 다른 사람 기록이다. 실서비스 빌드(데모 시계 없음)에서는 다른 사람 기록을 만들지 않는다
// — 출시 때 boardOf를 서버(Supabase) 읽기로 바꾼다(DEV-NOTES '순위표 서버'). 화면은 이 모양({ count, rows, me, top })만 본다.
import { useMemo } from 'react';
import { demoClock } from '../demo/clock.js';
import { botLap } from './engine.js';
import { lapConfig, useLapConfig } from './config.js';
import { lapTrackOf, preparedTrack, lapRecords, useLapRecords } from './store.js';
import { myPlayer, hash32 } from './player.js';
import { isThisWeek } from './place.js';
import { fitGhost, idealGhost } from './analysis.js';

const DAY = 864e5, WEEK = 7 * DAY;
export const BOARD_TOP = 50;   // 순위표에 보이는 줄(내가 그 밖이면 아래에 따로)

// 이번 주: ISO 주(월요일 0시 UTC부터 7일). key '2026-W47'
export function weekOf(now) {
  const d = new Date(now); const dow = (d.getUTCDay() + 6) % 7;
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dow * DAY;
  const yr = new Date(start + 3 * DAY).getUTCFullYear(); const jan4 = Date.UTC(yr, 0, 4); const w1 = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * DAY;
  return { key: `${yr}-W${String(1 + Math.round((start - w1) / WEEK)).padStart(2, '0')}`, start, end: start + WEEK };
}

// ---------- 예시 기록(데모 전용) ----------
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const refMs = new Map();
// 이 서킷에서 낼 수 있는 가장 빠른 기록 근처(안내 속도를 정확히 지킨 차의 시간). 예시 기록은 이보다 빠르지 않다
function reference(id) {
  if (!refMs.has(id)) { const tk = preparedTrack(id); refMs.set(id, tk ? botLap(tk, 'ideal').t * 1000 : 90000); }
  return refMs.get(id);
}
// 한 사람의 기록: 반응 0.15~0.5초 + 실력(대부분 2~8초 뒤, 드물게 0.1초 안) + 가끔 코스 이탈(4~12초)
function sampleMs(R, ref) {
  const react = 0.15 + 0.35 * R() * R(); const skill = Math.pow(R(), 2.3) * 22; const off = R() < 0.14 ? 4 + R() * 8 : 0;
  return Math.round(ref + (react + skill + off) * 1000);
}
const fields = new Map();
// 전체: 지난 몇 달 동안 달린 사람들. 이번 주: 이번 주 안에 고르게 나눠 달린 사람들(지금까지 달린 사람만 보인다). 그 서킷의 경기 주간이면 4배쯤
function sampleField(id, period, wk) {
  const key = period === 'week' ? `${id}|week|${wk.key}` : `${id}|all`;
  if (fields.has(key)) return fields.get(key);
  const R = rng(hash32(key)); const ref = reference(id); const t = lapTrackOf(id);
  const hot = period === 'week' && t?.race && isThisWeek(t.race, wk.start + 3 * DAY);
  const n = period === 'all' ? 380 + Math.floor(R() * 1400) : hot ? 150 + Math.floor(R() * 160) : 18 + Math.floor(R() * 70);
  const list = [];
  for (let k = 0; k < n; k += 1) list.push({ pid: `s_${hash32(`${key}#${k}`).toString(16)}`, ms: sampleMs(R, ref), at: period === 'week' ? wk.start + R() * WEEK : wk.start - R() * 160 * DAY });
  list.sort((a, b) => a.ms - b.ms || a.at - b.at);
  fields.set(key, list);
  return list;
}
const sampleOn = (board = lapConfig().board) => demoClock.enabled && board !== 'empty';

// ---------- 내 기록 ----------
// 이번 주 내 기록: 이번 주 key가 같을 때만
export function myBest(rec, period, wk) {
  if (!rec) return null;
  if (period === 'all') return rec.best ?? null;
  return rec.wk && rec.wk.key === wk.key ? rec.wk.ms : null;
}

// 순위표: { period, wk, count, rows: [{ rank, pid, ms, me }], me: { rank, ms, pid } | null, top: 첫 줄 | null }
export function boardOf(id, period = 'week', now = Date.now(), recs = lapRecords(), board = lapConfig().board) {
  const wk = weekOf(now); const me = myPlayer(false);
  let others = [];
  if (sampleOn(board)) {
    const week = sampleField(id, 'week', wk).filter((x) => x.at <= now);
    others = period === 'week' ? week : [...sampleField(id, 'all', wk), ...week].sort((a, b) => a.ms - b.ms || a.at - b.at);
  }
  const mine = me ? myBest(recs[id], period, wk) : null;
  const all = others.slice();
  if (mine != null) { let i = 0; while (i < all.length && all[i].ms <= mine) i += 1; all.splice(i, 0, { pid: me.id, ms: mine, me: true }); }
  const row = (x, i) => ({ rank: i + 1, pid: x.pid, ms: x.ms, me: !!x.me });
  const rows = all.slice(0, BOARD_TOP).map(row);
  const mi = mine != null ? all.findIndex((x) => x.me) : -1;
  // 내 줄 둘레 세 줄(결과 카드의 순위 조각)과 다음 목표. 서버도 위 50줄 + 내 위아래 한 줄씩만 주면 된다
  let near = null; const goals = [];
  if (mi >= 0) {
    const st = Math.max(0, Math.min(mi - 1, all.length - 3)); near = all.slice(st, st + 3).map((x, k) => row(x, st + k));
    const gap = (j) => Math.max(1, mine - all[j].ms);   // 그 줄보다 빨라지려면 줄여야 하는 시간(ms). 같은 기록이면 1ms
    if (mi > 0) {
      goals.push({ kind: 'next', rank: mi, ms: gap(mi - 1) });                       // 바로 위
      const tier = [10, 3, 1].concat(mi + 1 > BOARD_TOP ? [BOARD_TOP] : []).filter((t) => t < mi).sort((a, b) => b - a)[0];   // 그다음 큰 고비(50 · 10 · 3 · 1위)
      if (tier) goals.push({ kind: tier === 1 ? 'top' : 'tier', rank: tier, ms: gap(tier - 1) });
    } else if (all.length > 1) goals.push({ kind: 'lead', rank: 2, ms: all[1].ms - mine });   // 1위: 2위와 차이
  }
  return { period, wk, count: all.length, rows, me: mi >= 0 ? { rank: mi + 1, ms: mine, pid: me.id } : null, top: rows[0] || null, near, goals };
}

// 옅은 차: 이번 주 1위 기록(이번 주에 아무도 없으면 전체 1위)의 움직임. 내가 1위면 내 최고 기록의 움직임을 그 기록 시간에 맞춘 것,
// 다른 사람이면(데모의 예시 기록) 가장 빠르게 달린 차의 움직임을 그 기록 시간에 맞게 늘인 것. 아무 기록도 없으면 null.
// 실서비스: 서버가 1위 기록과 그 움직임(0.1초마다 위치)을 함께 준다(DEV-NOTES '순위표 서버')
export function rivalOf(id, tk, now = Date.now(), recs = lapRecords(), board = lapConfig().board) {
  if (!tk) return null;
  for (const period of ['week', 'all']) {
    const top = boardOf(id, period, now, recs, board).top; if (!top) continue;
    if (top.me) { const rec = recs[id]; if (rec?.ghost?.length > 2) return { ghost: fitGhost(rec.ghost, tk.L, top.ms / 1000), ms: top.ms, me: true }; continue; }
    return { ghost: fitGhost(idealGhost(tk), tk.L, top.ms / 1000), ms: top.ms, me: false };
  }
  return null;
}

// 화면용: 기록이 바뀌면(한 바퀴를 끝내면) 다시 계산한다. now는 분 단위로 넘긴다
export function useBoard(id, period, now) {
  const recs = useLapRecords(); const sample = useLapConfig().board;   // 조절 판에서 '아무도 없는 주'로 바꾸면 다시
  const minute = Math.floor(now / 60000);
  return useMemo(() => (id ? boardOf(id, period, minute * 60000 + 59999, recs, sample) : null), [id, period, minute, recs, sample]);
}
