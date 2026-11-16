// '한 바퀴' 레이어 자리. 게임 코드는 레이어를 처음 열 때 받는다(load-game.js). 받는 동안은 빈 바탕만 덮는다.
import { lazy, Suspense } from 'react';
import { useOpenLap, lapTrackOf } from './store.js';
import { loadLapGame } from './load-game.js';

const Game = lazy(() => loadLapGame().then((m) => ({ default: m.LapLayer })));

export function LapLayer() {
  const id = useOpenLap();
  if (!id || !lapTrackOf(id)) return null;
  return <Suspense fallback={<div className="gx-lap-boot" aria-hidden="true" />}><Game /></Suspense>;
}
