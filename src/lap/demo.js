// 데모 빌드 전용: 조절 판과 자동 시험이 쓰는 window.__gantryLap. 실서비스 빌드(VITE_DEMO_CLOCK 없음)에서는 아무것도 하지 않는다.
//   open(id) · close() · config(patch) · getConfig() · clear() · sim()          레이어가 닫혀 있어도 된다
//   get() · press(down) · auto() · state(name)                                     레이어가 열려 있을 때(LapGame이 채운다)
import { demoClock } from '../demo/clock.js';
import { prepareTrack, botLap, formatLap } from './engine.js';
import { lapConfig, lapDiff, setLapConfig } from './config.js';
import { LAP_TRACKS, openLap, closeLap, writeLapRecords } from './store.js';

const api = {};
export function demoApi() { return demoClock.enabled ? api : null; }

if (demoClock.enabled && typeof window !== 'undefined') {
  Object.assign(api, {
    tracks: () => LAP_TRACKS.map((t) => t.id),
    open: (id) => openLap(id),
    close: () => closeLap(),
    config: (patch) => setLapConfig(patch || {}),
    getConfig: () => ({ ...lapConfig(), numbers: lapDiff() }),
    clear: () => writeLapRecords({}),
    // 지금 숫자로 계산: 안내대로(진한 구간에서 손을 뗌) · 누르기만. id를 안 주면 13곳 모두
    sim: (id) => {
      const D = lapDiff();
      return LAP_TRACKS.filter((t) => !id || t.id === id).map((t) => {
        const tk = prepareTrack(t.raw, D); const g = botLap(tk, 'guide', 0); const h = botLap(tk, 'hold');
        return { id: t.id, guide: formatLap(g.t * 1000), guideOffs: g.offCount, hold: formatLap(h.t * 1000), holdOffs: h.offCount, ok: !g.offCount && h.t > g.t };
      });
    },
  });
  window.__gantryLap = api;
}
