// '한 바퀴' 설정: 난이도 묶음과 화면 시안. 실서비스 빌드에서는 아래 기본값으로 고정이다.
// 데모 빌드(VITE_DEMO_CLOCK=1)에서만 조절 판이 localStorage 'gantry.lapDemo'와 window.__gantryLap.config()로 바꾼다.
import { useSyncExternalStore } from 'react';
import { demoClock } from '../demo/clock.js';
import { DIFFICULTY, DIFF_KEYS, diffOf } from './engine.js';

// 시안 이름
//  learn  배우는 방법   text: 준비 카드의 글 · coach: 첫 바퀴 첫 진한 구간 두 곳에서 화면이 때를 알려 줌 · practice: 본 바퀴 전 짧은 연습
//  zone   진한 구간     shade: 밝기만 · bars: 밝기 + 가로 줄무늬 · chevron: 밝기 + V자 무늬(꼭짓점이 차 쪽)
//  slip   미끄러짐      push: 차가 밀리기만 · ring: 차 둘레에 차오르는 원 · marks: 타이어 자국 + 위쪽 알림
//  delta  최고 기록과의 차이   off · corner: 코너를 지날 때마다 · live: 계속
//  car    차 모양       car: 위에서 본 F1 차 · dot: 점
//  haptic 진동          off · on: 코스 이탈과 결승선
//  home   홈 자리       below: 시간표 바로 아래 · bottom: 홈 맨 아래 · week: 경기 주간에만 시간표 아래, 그 밖에는 맨 아래
//  pacer  기록이 없을 때  guide: 안내대로 달린 차가 옅게 같이 달림 · off
//  pace   빠르기       게임 시간이 실제 시간보다 몇 배 빨리 가는지. 1 · 1.3 · 1.6 · 2. 기록은 게임 시간(실제 랩 타임 같은 숫자), 한 바퀴에 실제로 걸리는 시간만 줄어든다
//  line   레이싱 라인   rubber: 길에 남은 고무 자국만 · guide: 차 앞 220m에 안내 선(손을 떼는 구간은 빨강)
//  sound  소리         on: 켬 · off: 끔(처음 기본값. 레이어 위쪽 단추로 바꾸면 이 기기에 기억한다)
//  pedal  가속 페달     both: 오른쪽 아래 페달 + 화면 어디를 눌러도 달림 · only: 페달을 눌러야 달림(다른 곳을 누르면 페달을 가리킨다) · off: 페달 없이 화면 어디든(v3)
//  view   화면         3d: 차 뒤 위에서 앞을 내려다봄(원근) · top: 위에서 내려다봄(v2). 줄인 움직임이면 언제나 top
//  motion 데모 전용      auto: 기기 설정을 따름 · reduce: 줄인 움직임으로 보기(조절 판에서 기기 설정 없이 비교하려고)
export const LAP_DEFAULTS = Object.freeze({ diff: 'normal', tune: null, learn: 'coach', zone: 'bars', slip: 'ring', delta: 'corner', car: 'car', haptic: 'off', home: 'week', pacer: 'guide', view: '3d', pace: '1.6', line: 'rubber', pedal: 'both', sound: 'on', motion: 'auto' });
export const LAP_CHOICES = {
  diff: Object.keys(DIFFICULTY), learn: ['text', 'coach', 'practice'], zone: ['shade', 'bars', 'chevron'], slip: ['push', 'ring', 'marks'],
  delta: ['off', 'corner', 'live'], car: ['car', 'dot'], haptic: ['off', 'on'], home: ['below', 'bottom', 'week'], pacer: ['guide', 'off'], view: ['3d', 'top'], pace: ['1', '1.3', '1.6', '2'], line: ['rubber', 'guide'], pedal: ['both', 'only', 'off'], sound: ['on', 'off'], motion: ['auto', 'reduce'],
};
const KEY = 'gantry.lapDemo';

function clean(v) {
  const out = { ...LAP_DEFAULTS };
  if (!v || typeof v !== 'object') return out;
  for (const [k, list] of Object.entries(LAP_CHOICES)) if (list.includes(v[k])) out[k] = v[k];
  if (v.tune && typeof v.tune === 'object') {
    const t = {}; let any = false;
    for (const k of DIFF_KEYS) { const n = Number(v.tune[k]); if (Number.isFinite(n)) { t[k] = n; any = true; } }
    out.tune = any ? t : null;
  }
  return out;
}
function load() {
  if (!demoClock.enabled) return { ...LAP_DEFAULTS };
  try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return { ...LAP_DEFAULTS }; }
}

let cfg = load();
const subs = new Set();
export const lapConfig = () => cfg;
// 지금 난이도 숫자(묶음 + 직접 조절한 값)
export const paceOf = (c = cfg) => Number(c?.pace) || 1.6;
export const lapDiff = (c = cfg) => ({ ...diffOf(c.diff), ...(c.tune || {}) });
export function setLapConfig(patch) {
  if (!demoClock.enabled) return cfg;
  cfg = clean({ ...cfg, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* 저장이 막혀도 이번 화면에서는 바뀐다 */ }
  subs.forEach((fn) => fn());
  return cfg;
}
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export function useLapConfig() { return useSyncExternalStore(subscribe, lapConfig, lapConfig); }
// 데모 조절 판이 다른 창(같은 출처)에서 바꾼 값도 따라간다
if (demoClock.enabled && typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) { cfg = load(); subs.forEach((fn) => fn()); } });
}
