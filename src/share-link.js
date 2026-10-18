// 경기별 공유 주소 /race/<id>.
//   - 그 주소로 들어오면 일정 데이터가 준비된 뒤 그 경기 상세를 연다.
//   - 앱 안에서 상세를 열고 닫을 때 주소를 맞춘다. pushState는 쓰지 않는다 —
//     뒤로 가기 동작은 지금 그대로여야 하고, 서킷 맵이 history.state.gantryMap을 쓴다.
import { useEffect, useRef } from 'react';
import { raceTitle } from './race-title.js';
import { setRaceTitle } from './document-title.js';

const RACE_PATH = /^\/race\/([^/?#]+)\/?$/;

// 주소의 경기 id. /race/<id> 또는 /race/<id>/ 만 본다.
export function raceIdFromPath() {
  try {
    const m = RACE_PATH.exec(window.location.pathname);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

export function hasRaceLinkInPath() {
  return raceIdFromPath() !== null;
}

// 공유 주소에 쓰는 id. OpenF1 경로의 F1은 id가 meeting_key 기반이라 정적 페이지가 없다 — 정적 id를 쓴다.
export function racePathId(race) {
  return race?.staticId || race?.id || null;
}

export function raceShareUrl(race) {
  const id = racePathId(race);
  if (!id) return null;
  try {
    return `${window.location.origin}/race/${encodeURIComponent(id)}?utm_source=share&utm_medium=referral`;
  } catch { return null; }
}

// 경로만 바꾼다. 쿼리스트링·해시와 history.state는 그대로 둔다.
function replacePath(pathname) {
  try {
    if (window.location.pathname === pathname) return;
    history.replaceState(history.state, '', pathname + window.location.search + window.location.hash);
  } catch { /* 주소를 못 바꿔도 앱은 그대로 돈다 */ }
}

/**
 * races    일정 데이터(로드 전에는 빈 배열)
 * ready    첫 로드가 끝났는지. 끝나기 전에 열면 안 된다 — F1은 OpenF1 응답이 오면서
 *          id가 정적 id에서 f1-<meeting_key>로 바뀌어, 먼저 잡아 둔 id가 사라진다.
 * openRace 지금 열려 있는 경기(없으면 null)
 * openFrom (race, source) — 셸의 상세 열기
 * onDone   공유 링크로 연 상세가 닫혔을 때(또는 없는 id였을 때) 한 번. 온보딩 복귀용.
 */
export function useRaceLink({ races, ready, openRace, openFrom, onDone }) {
  // 'init' 첫 처리 전 · 'opened' 링크로 열었음 · 'done' 링크 처리 끝
  const phase = useRef('init');
  const latest = useRef({ openFrom, onDone });
  useEffect(() => { latest.current = { openFrom, onDone }; });

  // 1) 첫 진입: 주소에 경기 id가 있으면 데이터가 온 뒤 연다.
  useEffect(() => {
    if (phase.current !== 'init') return;
    const id = raceIdFromPath();
    if (!id) { phase.current = 'done'; return; }
    // 정적 경기 페이지(/race/<id>)가 넣어 둔 제목을 그대로 붙잡아 둔다. 앱 제목이 덮어쓰지 않게.
    setRaceTitle(document.title);
    if (!ready || !races.length) return;             // 일정 데이터가 확정될 때까지 기다린다

    const race = races.find((r) => r.staticId === id || r.id === id);
    if (race) {
      phase.current = 'opened';
      latest.current.openFrom(race, 'share_link');
    } else {
      phase.current = 'done';
      replacePath('/');                             // 없는 id면 홈을 그대로 두고 주소만 정리
      setRaceTitle(null);
      latest.current.onDone?.();
    }
  }, [races, ready]);

  // 2) 상세 열림/닫힘 ↔ 주소. 첫 처리가 끝나기 전에는 건드리지 않는다.
  useEffect(() => {
    if (phase.current === 'init') return;
    if (openRace) {
      const id = racePathId(openRace);
      if (id) replacePath(`/race/${encodeURIComponent(id)}`);
      setRaceTitle(raceTitle(openRace));
      return;
    }
    replacePath('/');
    setRaceTitle(null);
    if (phase.current === 'opened') {               // 링크로 연 상세를 닫았다 → 온보딩으로 돌아갈 차례
      phase.current = 'done';
      latest.current.onDone?.();
    }
  }, [openRace]);
}
