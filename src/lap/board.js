// '한 바퀴' 순위표: 서킷마다 '이번 주'(월요일 0시 UTC = 한국 오전 9시에 새로) · '전체'. 한 사람은 한 줄(가장 빠른 기록).
// 실서비스: 서버(remote.js → /api/lap → Supabase lap_board)의 다른 사람 줄 + 이 기기의 내 기록. 내 줄은 늘 이 기기 기록으로
// (서버에 아직 안 간 기록도 바로 보인다). 서버를 못 받으면 내 기록만(서버가 없을 때와 같다).
// 데모 빌드: 조절 판 '순위표' sample = 계산으로 만든 다른 사람 기록, empty = 내 기록만, server = 실서비스처럼.
// 화면은 이 모양({ count, rows, me, top, near, goals })만 본다.
import { useEffect, useMemo } from 'react';
import { demoClock } from '../demo/clock.js';
import { botLap } from './engine.js';
import { lapConfig, useLapConfig } from './config.js';
import { lapTrackOf, preparedTrack, lapRecords, useLapRecords } from './store.js';
import { myPlayer, hash32 } from './player.js';
import { isThisWeek } from './place.js';
import { serverOn, serverBoard, loadBoard, useRemoteVersion } from './remote.js';

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
  if (serverOn(board)) return fromServer(id, period, wk, me ? myBest(recs[id], period, wk) : null, me ? me.id : null);
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

// 서버 줄 + 내 기록. 내 자리는 위 50줄 안이면 이 기기에서 바로 세고, 그 밖이면 서버가 센 자리(ctx, 같은 기록으로 받은 것)를 쓴다.
// 그 밖인데 아직 못 받았으면 맨 뒤에 두고 approx: true(받으면 다시 계산된다). 같은 기록이면 다른 사람이 앞(데모와 같은 규칙)
function fromServer(id, period, wk, mine, pid) {
  const srv = serverBoard(id, period, mine, pid);
  const others = srv ? srv.rows.filter((r) => r.pid !== pid) : [];
  const ctx = srv && srv.ctx && srv.ms === mine ? srv.ctx : null;
  const listed = !!srv && (others.length < srv.rows.length || !!(ctx && ctx.listed));
  const othersN = srv ? Math.max(others.length, srv.count - (listed ? 1 : 0)) : 0;
  const complete = othersN <= others.length;   // 모든 사람이 위 50줄 안에 있다
  let ahead = 0; let above = []; let below = []; let approx = false;
  if (mine != null) {
    let k = 0; while (k < others.length && others[k].ms <= mine) k += 1;
    if (k < others.length || complete) {
      ahead = k; above = others.slice(Math.max(0, k - 2), k); below = others.slice(k, k + 2);
      if (below.length < 2 && !complete && ctx) below = ctx.below;
    } else if (ctx) { ahead = ctx.ahead; above = ctx.above; below = ctx.below; }
    else { ahead = othersN; above = others.slice(-2); approx = true; }
  }
  const list = others.slice(0, BOARD_TOP).map((x) => ({ pid: x.pid, ms: x.ms, me: false }));
  if (mine != null && ahead < BOARD_TOP) list.splice(ahead, 0, { pid, ms: mine, me: true });
  const rows = list.slice(0, BOARD_TOP).map((x, i) => ({ rank: i + 1, pid: x.pid, ms: x.ms, me: x.me }));
  let near = null; const goals = [];
  if (mine != null) {
    const r = ahead + 1;
    const A = above.map((x, i) => ({ rank: r - above.length + i, pid: x.pid, ms: x.ms, me: false }));
    const B = below.map((x, i) => ({ rank: r + 1 + i, pid: x.pid, ms: x.ms, me: false }));
    const seq = [...A, { rank: r, pid, ms: mine, me: true }, ...B]; const mi = A.length;
    const st = Math.max(0, Math.min(mi - 1, seq.length - 3)); near = seq.slice(st, st + 3);
    const gap = (ms) => Math.max(1, mine - ms);
    if (ahead > 0) {
      if (A.length) goals.push({ kind: 'next', rank: ahead, ms: gap(A[A.length - 1].ms) });
      const tier = [10, 3, 1].concat(r > BOARD_TOP ? [BOARD_TOP] : []).filter((t) => t < ahead).sort((a, b) => b - a)[0];
      if (tier && others[tier - 1]) goals.push({ kind: tier === 1 ? 'top' : 'tier', rank: tier, ms: gap(others[tier - 1].ms) });
    } else if (B.length) goals.push({ kind: 'lead', rank: 2, ms: B[0].ms - mine });
  }
  const top = rows[0] || null;
  // 1위의 움직임(옅은 차): 1위가 서버의 1위와 같은 사람일 때만
  const topGhost = top && !top.me && srv && srv.rows[0] && srv.rows[0].pid === top.pid ? srv.topGhost : null;
  return { period, wk, count: othersN + (mine != null ? 1 : 0), rows, me: mine != null ? { rank: ahead + 1, ms: mine, pid, approx } : null, top, near, goals, topGhost };
}

// 화면용: 기록이 바뀌면(한 바퀴를 끝내면) · 서버 줄을 받으면 다시 계산한다. now는 분 단위로 넘긴다
export function useBoard(id, period, now) {
  const recs = useLapRecords(); const sample = useLapConfig().board;   // 조절 판에서 '아무도 없는 주'로 바꾸면 다시
  const rv = useRemoteVersion();
  const minute = Math.floor(now / 60000);
  const b = useMemo(() => (id && rv >= 0 ? boardOf(id, period, minute * 60000 + 59999, recs, sample) : null), [id, period, minute, recs, sample, rv]);
  const ms = b?.me?.ms ?? null; const pid = b?.me?.pid ?? null;
  // 서버 줄 받기(내 기록이 바뀌면 그 기록의 자리까지). 1분 안이면 다시 받지 않는다
  useEffect(() => { if (id && serverOn(sample)) loadBoard(id, period, ms, pid); }, [id, period, ms, pid, sample, minute]);
  return b;
}
