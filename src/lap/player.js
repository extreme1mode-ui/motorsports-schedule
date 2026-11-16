// '한 바퀴' 순위표의 나: 처음 끝까지 달릴 때 이 기기에 id 하나를 만들고, 이름은 그 id에서 만든다(색 + 동물 · 사물 + 네 자리 숫자).
// 같은 사람인지는 이 id로 판단한다 — 이 기기에서 달린 기록은 모두 같은 이름으로 순위표에 올라간다.
// 서버(0003_lap.sql)는 처음 기록을 보낼 때 이 id를 그 익명 사용자의 이름 씨(pid)로 두고 바꾸지 않는다. user_id는 밖에 나가지 않는다.
import { storage } from '../storage/index.js';

// [ko, en] — 어느 조합도 이상하지 않은 말만
const COLORS = [['빨간', 'Red'], ['파란', 'Blue'], ['초록', 'Green'], ['노란', 'Yellow'], ['하얀', 'White'], ['검은', 'Black'], ['은빛', 'Silver'], ['금빛', 'Golden'],
  ['보랏빛', 'Violet'], ['주황', 'Orange'], ['분홍', 'Pink'], ['하늘색', 'Sky'], ['회색', 'Gray'], ['남색', 'Navy'], ['청록', 'Teal'], ['갈색', 'Brown']];
const NOUNS = [['여우', 'Fox'], ['늑대', 'Wolf'], ['매', 'Hawk'], ['독수리', 'Eagle'], ['치타', 'Cheetah'], ['표범', 'Leopard'], ['호랑이', 'Tiger'], ['상어', 'Shark'],
  ['돌고래', 'Dolphin'], ['토끼', 'Rabbit'], ['사슴', 'Deer'], ['곰', 'Bear'], ['펭귄', 'Penguin'], ['부엉이', 'Owl'], ['수달', 'Otter'], ['제비', 'Swallow'],
  ['혜성', 'Comet'], ['번개', 'Bolt'], ['로켓', 'Rocket'], ['화살', 'Arrow'], ['바람', 'Wind'], ['별', 'Star'], ['파도', 'Wave'], ['유성', 'Meteor'],
  ['엔진', 'Engine'], ['나침반', 'Compass'], ['돛', 'Sail'], ['연', 'Kite'], ['종이비행기', 'Paper Plane'], ['팽이', 'Top'], ['구름', 'Cloud'], ['불꽃', 'Spark']];

// 문자열 → 32비트(FNV-1a)
export function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// 이름: id만 같으면 언제 어디서나 같은 이름(언어만 바뀐다)
export function nameOf(id, locale = 'ko') {
  const h = hash32(String(id)); const c = COLORS[h % COLORS.length]; const n = NOUNS[(h >>> 4) % NOUNS.length]; const num = 1000 + ((h >>> 9) % 9000);
  return locale === 'en' ? `${c[1]} ${n[1]} ${num}` : `${c[0]} ${n[0]} ${num}`;
}

function newId() {
  const b = new Uint8Array(12);
  try { globalThis.crypto.getRandomValues(b); } catch { for (let i = 0; i < b.length; i += 1) b[i] = Math.floor(Math.random() * 256); }
  return `p_${Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')}`;
}
// 이 기기의 나. create가 false면 없을 때 null(아직 한 바퀴도 끝까지 달리지 않았다)
export function myPlayer(create = false) {
  const v = storage.lapPlayer.read();
  if (v && typeof v.id === 'string') return v;
  if (!create) return null;
  const p = { id: newId(), at: new Date().toISOString() }; storage.lapPlayer.write(p); return p;
}
// 데모 조절 판: 새 사람으로(이름이 바뀐다)
export function resetPlayer() { storage.lapPlayer.clear(); }
// 서버에 이미 이 사람의 이름 씨가 있으면 그것으로(다른 기기 저장이 지워졌다가 같은 익명 사용자로 돌아온 경우)
export function adoptPlayerId(id) { const v = storage.lapPlayer.read(); if (v && v.id !== id) storage.lapPlayer.write({ ...v, id }); }
