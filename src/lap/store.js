// '한 바퀴' 데이터와 기록. 트랙은 서킷 맵 데이터에서 뽑은 tracks.json(tools/build-lap-tracks.mjs), 이름은 시즌 파일의 그 경기에서 읽는다.
import { useSyncExternalStore } from 'react';
import RAW from './tracks.json' with { type: 'json' };
import { prepareTrack, diffKey } from './engine.js';
import { lapDiff } from './config.js';
import { storage } from '../storage/index.js';
import { SEASON_RACES } from '../champions/champions.js';
import { preloadLapGame } from './load-game.js';

const BY_RACE = new Map(SEASON_RACES.map((r) => [r.id, r]));
// 달릴 수 있는 서킷(라운드 순). race: 이름을 읽을 시즌 경기, turns: 코너 수
export const LAP_TRACKS = RAW.map((t) => ({ id: t.id, raceId: t.raceId, round: t.round, race: BY_RACE.get(t.raceId) || null, turns: Object.keys(t.turns || {}).length, raw: t }))
  .filter((t) => t.race);
const BY_ID = new Map(LAP_TRACKS.map((t) => [t.id, t]));
export const lapTrackOf = (id) => BY_ID.get(id) || null;
export const lapTrackOfRace = (race) => (race ? LAP_TRACKS.find((t) => t.raceId === race.id || t.raceId === race.staticId) || null : null);

// 준비한 트랙은 난이도마다 따로 둔다(진한 구간과 코너 한계가 난이도에 따라 달라진다)
const prepared = new Map();
export function preparedTrack(id, diff = lapDiff()) {
  const key = `${id}#${diffKey(diff)}`;
  if (!prepared.has(key)) { const t = BY_ID.get(id); if (!t) return null; prepared.set(key, prepareTrack(t.raw, diff)); }
  return prepared.get(key);
}

// 목록·카드용 작은 서킷 그림: 상자(w×h) 안에 맞춘 path
export function outlinePath(id, w = 44, h = 44, pad = 4) {
  const t = BY_ID.get(id); if (!t) return '';
  const pts = t.raw.pts; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const k = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0));
  const ox = (w - (x1 - x0) * k) / 2, oy = (h - (y1 - y0) * k) / 2;
  return `${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${((x - x0) * k + ox).toFixed(1)} ${((y - y0) * k + oy).toFixed(1)}`).join('')}Z`;
}

// ---------- 기록(이 기기) ----------
const subs = new Set();
let snap = null;
const read = () => { if (!snap) { const v = storage.lap.read(); snap = v && typeof v === 'object' ? v : {}; } return snap; };
export function lapRecords() { return read(); }
// wkKey: 이번 주 key(board.js weekOf). 이번 주 가장 빠른 기록을 따로 둔다(순위표 '이번 주')
export function saveLap(id, { ms, react, ghost, wkKey = null }) {
  const all = { ...read() }; const prev = all[id] || null;
  const best = !prev || ms < prev.best;
  const wk = wkKey ? (prev?.wk && prev.wk.key === wkKey && prev.wk.ms <= ms ? prev.wk : { key: wkKey, ms }) : prev?.wk;
  all[id] = best
    ? { best: ms, react, runs: (prev?.runs || 0) + 1, at: new Date().toISOString(), ghost, ...(wk ? { wk } : {}) }
    : { ...prev, runs: (prev.runs || 0) + 1, ...(wk ? { wk } : {}) };
  snap = all; storage.lap.write(all);
  subs.forEach((fn) => fn());
  return { best, prev: prev ? prev.best : null };
}
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export function useLapRecords() { return useSyncExternalStore(subscribe, read, read); }
// 데모 조절 판의 '기록 지우기'와 상태 바로 가기가 쓴다
export function writeLapRecords(all) { snap = all && typeof all === 'object' ? all : {}; storage.lap.write(snap); subs.forEach((fn) => fn()); }
// 처음 온 사람인가: 이 기기에서 어느 서킷이든 한 번이라도 끝까지 달렸으면 아니다
export const isFirstVisit = () => !Object.values(read()).some((r) => r && r.runs > 0);

// ---------- 열기(전체 화면 레이어). 어느 셸에서든 openLap(id)만 부르면 된다 ----------
let openId = null;
const openSubs = new Set();
export function openLap(id) { if (BY_ID.has(id)) { preloadLapGame(); openId = id; openSubs.forEach((fn) => fn()); } }
export function closeLap() { openId = null; openSubs.forEach((fn) => fn()); }
const subOpen = (fn) => { openSubs.add(fn); return () => openSubs.delete(fn); };
const getOpen = () => openId;
export function useOpenLap() { return useSyncExternalStore(subOpen, getOpen, getOpen); }
