// 순위 숫자를 한 칸씩 세는 훅: before → n (결과 카드 · 겨루기). 카드가 뜬 뒤 DELAY에 시작해 STEP마다 한 칸, 많아도 MAX_STEPS번
import { useEffect, useState } from 'react';

const DELAY = 260, STEP = 110, MAX_STEPS = 8;

export function useCountDown(before, n, on) {
  const [v, setV] = useState(on ? before : n);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 움직임을 끄면 바로 끝 숫자로(타이머와 같은 effect에서 맞춘다)
    if (!on) { setV(n); return undefined; }
    const steps = Math.min(MAX_STEPS, before - n); let i = 0; let t = 0;
    const tick = () => { i += 1; setV(Math.round(before - ((before - n) * i) / steps)); if (i < steps) t = setTimeout(tick, STEP); };
    t = setTimeout(tick, DELAY);
    return () => clearTimeout(t);
  }, [before, n, on]);
  return v;
}
