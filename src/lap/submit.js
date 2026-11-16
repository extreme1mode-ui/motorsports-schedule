// '한 바퀴' 기록 보내기(웹만): 한 바퀴를 끝내 이번 주 · 전체 최고 기록이 빨라지면 서버(Supabase submit_lap)로 보낸다.
// - 토스는 보내지 않는다(Supabase 익명 계정을 만들지 않는다, 순위표는 읽기만). Supabase env가 없으면 아무것도 안 한다.
// - 못 보낸 기록은 이 기기에 서킷마다 하나(가장 빠른 것) 두었다가, 다음에 그 서킷을 열 때 · 다음 바퀴 뒤에 다시 보낸다.
// - 받지 않는 기록(22023: 너무 빠름 · 움직임이 맞지 않음 등)은 다시 보내지 않는다. 남이 쓰는 이름 씨(23505)면 새 이름 씨로 한 번 더.
// - supabase-js는 src/account/client.js만 들고 있다(동적 import). 게임 코드에만 있다.
import { REMOTE_ENABLED } from '../account/config.js';
import { lapRecords, setLapPending, clearLapPending } from './store.js';
import { myPlayer, resetPlayer, adoptPlayerId } from './player.js';
import { serverOn } from './remote.js';

const IS_TOSS = import.meta.env.MODE === 'toss';
export const submitOn = () => !IS_TOSS && REMOTE_ENABLED && serverOn();

const busy = new Set();

// 못 보낸 기록이 있으면 보낸다. 돌려주는 것: 서버 답({ pid, week, all_ms, week_ms }) 또는 null
export async function flushLap(id) {
  if (!submitOn() || busy.has(id)) return null;
  const p = lapRecords()[id]?.pend; if (!p) return null;
  busy.add(id);
  try {
    const { submitLap } = await import('../account/client.js');
    const send = () => submitLap({ track: id, ms: p.ms, react: p.react, ghost: p.ghost, pid: myPlayer(true).id });
    let r = await send();
    if (!r.ok && r.code === '23505') { resetPlayer(); r = await send(); }
    if (r.ok) {
      if (r.data && typeof r.data.pid === 'string') adoptPlayerId(r.data.pid);
      clearLapPending(id, p.ms);
      return r.data;
    }
    if (r.code === '22023') clearLapPending(id, p.ms);
    return null;
  } catch {
    return null;
  } finally {
    busy.delete(id);
  }
}

// 한 바퀴를 끝낸 뒤: 더 빨라졌으면(improved) 못 보낸 기록으로 두고 바로 보낸다
export function queueLap(id, { ms, react, ghost }, improved) {
  if (!submitOn() || !improved || !Array.isArray(ghost) || ghost.length < 3) return null;
  setLapPending(id, { ms, react: Number.isFinite(react) ? Math.round(react) : null, ghost });
  return flushLap(id);
}
