// 탭을 옮겨도 남는 화면 기억(셸 mem — 메모리만, 저장소에 쓰지 않음). [값, 바꾸기]
import { useCallback, useState } from 'react';
import { useShell } from '../shell/context.js';

export function useMem(key, init) {
  const { mem } = useShell();
  const [v, setV] = useState(() => (mem && key in mem ? mem[key] : (typeof init === 'function' ? init() : init)));
  const set = useCallback((x) => setV((o) => {
    const n = typeof x === 'function' ? x(o) : x;
    if (mem) mem[key] = n;
    return n;
  }), [mem, key]);
  return [v, set];
}
