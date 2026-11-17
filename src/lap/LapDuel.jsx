// '한 바퀴' 준비 카드의 대결(마리오 카트 타임 어택의 고스트 고르기처럼): 이번 상대(옅은 차 = 이번 주 1위 기록)와 나를 두 줄 트랙에 세운다.
// 앞선 차가 결승선에 닿은 순간 뒤 차가 남은 거리(m): 내 기록의 움직임이 있으면 그것으로, 없으면 평균 속도로.
// 트랙 한 줄은 결승선 앞 200m(더 멀면 출발 쪽 끝에 선다). 내가 1위면 나와 2위.
// 움직임: 카드가 뜨고 110ms 뒤 두 차가 왼쪽에서 제자리로 미끄러져 들어온다(340ms, 위 줄 먼저 · 아래 줄 110ms 뒤, 튀지 않음).
// 순위 숫자는 달린 사람 수에서 내 순위까지 한 칸씩(0.9초 안). 줄인 움직임에서는 바로 끝 모습
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { Icon } from '../ui2/Icon.jsx';
import { formatLap } from './engine.js';
import { posAt } from './analysis.js';
import { nameOf } from './player.js';
import { useCountDown } from './count-down.js';

const SPAN = 200;   // 트랙 한 줄이 보여 주는 거리(결승선 앞 m)
const xOf = (gapM) => Math.max(0.04, 1 - gapM / SPAN);

// 빠른 차(fastMs)가 결승선에 닿았을 때 느린 차가 남은 거리. ghost가 느린 차의 움직임(0.1초마다 위치)이면 그것으로
function gapMeters(L, fastMs, slowMs, ghost) {
  if (ghost && ghost.length > 2) { const p = posAt(ghost, fastMs / 1000); if (p != null) return Math.max(0, L - p); }
  return Math.max(0, L * (1 - fastMs / slowMs));
}

// 위에서 본 F1 차(오른쪽을 본다). 나는 빨강, 상대는 옅은 회색
function Car({ ghost }) {
  return (
    <svg className={`gx-lap-duel-svg${ghost ? ' is-ghost' : ''}`} width="34" height="16" viewBox="0 0 34 16" aria-hidden="true" focusable="false">
      <rect className="t" x="4" y="0.5" width="6" height="3.6" rx="1.2" /><rect className="t" x="4" y="11.9" width="6" height="3.6" rx="1.2" />
      <rect className="t" x="22" y="1" width="5" height="3.2" rx="1.1" /><rect className="t" x="22" y="11.8" width="5" height="3.2" rx="1.1" />
      <path className="b" d="M1 5.2h3.4l2-1.4h9.2l3.8 1.6 6.4.6 6.2.8v4.4l-6.2.8-6.4.6-3.8 1.6H6.4l-2-1.4H1z" />
      <rect className="b" x="30.6" y="3" width="2.4" height="10" rx="0.8" /><rect className="b" x="0.6" y="3.6" width="2.6" height="8.8" rx="0.8" />
      <ellipse className="h" cx="15.6" cy="8" rx="2.2" ry="1.7" />
    </svg>
  );
}

function Lane({ label, time, x, ghost, delay, move }) {
  return (
    <div className="gx-lap-duel-lane">
      <span className="gx-lap-duel-who gx-t13"><b className="gx-w600">{label}</b><span className="gx-lap-duel-time gx-w600">{time}</span></span>
      <span className="gx-lap-duel-track" aria-hidden="true">
        <i className="gx-lap-duel-fin" />
        <span className={`gx-lap-duel-car${move ? ' is-in' : ''}`} style={{ '--x': x.toFixed(3), animationDelay: `${delay}ms` }}><Car ghost={ghost} /></span>
      </span>
    </div>
  );
}

export function LapDuel({ board, rec, L, reduced, onOpen }) {
  const tr = useT(); const fmt = useFormat();
  const top = board?.top || null; const me = board?.me || null; const count = board?.count || 0;
  const shown = useCountDown(Math.max(count, me?.rank || 1), me?.rank || 1, !!me && !reduced && count > (me?.rank || 1));
  const name = (pid) => nameOf(pid, fmt.locale);
  let lanes = []; let note;
  if (me && top && !top.me) {        // 1위를 쫓는다
    const gm = gapMeters(L, top.ms, me.ms, rec?.best === me.ms ? rec?.ghost : null);
    lanes = [{ label: tr('lap.duel.rank', { n: 1, name: name(top.pid) }), time: formatLap(top.ms), x: 1, ghost: true },
      { label: tr('lap.board.me'), time: formatLap(me.ms), x: xOf(gm) }];
    note = tr('lap.duel.behind', { m: Math.round(gm), sec: ((me.ms - top.ms) / 1000).toFixed(3) });
  } else if (me && top && top.me) {  // 내가 1위: 2위가 쫓아온다
    const second = board.rows?.[1] || null;
    lanes = [{ label: tr('lap.duel.rank', { n: 1, name: tr('lap.board.me') }), time: formatLap(me.ms), x: 1 }];
    if (second) {
      const gm = gapMeters(L, me.ms, second.ms, null);
      lanes.push({ label: tr('lap.duel.rank', { n: 2, name: name(second.pid) }), time: formatLap(second.ms), x: xOf(gm), ghost: true });
      note = tr('lap.duel.ahead', { m: Math.round(gm), sec: ((second.ms - me.ms) / 1000).toFixed(3) });
    } else note = tr('lap.duel.solo');
  } else {                            // 아직 이번 주 기록이 없다
    if (top) lanes.push({ label: tr('lap.duel.rank', { n: 1, name: name(top.pid) }), time: formatLap(top.ms), x: 1, ghost: true });
    lanes.push({ label: tr('lap.board.me'), time: tr('lap.tile.none'), x: 0.04 });
    note = tr('lap.duel.first');
  }
  const move = !reduced;
  const aria = [...lanes.map((l) => `${l.label} ${l.time}`), note].filter(Boolean).join(', ');
  return (
    <div className="gx-lap-duel">
      <div className="gx-lap-tiles-h">
        {me ? <span className="gx-lap-rk-t"><b className="gx-t17 gx-w700">{tr('lap.board.weekRank', { n: shown })}</b><span className="gx-t13 gx-sub"> {tr('lap.board.of', { n: count.toLocaleString(fmt.locale) })}</span></span>
          : <span className="gx-t15 gx-w600">{tr(top ? 'lap.duel.title' : 'lap.duel.week')}</span>}
        <button type="button" className="gx-textbtn gx-t15 gx-lap-more" onClick={onOpen}>{tr('lap.board.title')}<Icon n="chev" s={18} /></button>
      </div>
      <div className="gx-lap-duel-lanes" role="img" aria-label={aria}>
        {lanes.map((l, i) => <Lane key={i} {...l} delay={110 + i * 110} move={move} />)}
      </div>
      {note && <span className="gx-lap-duel-note gx-t13 gx-w600">{note}</span>}
    </div>
  );
}
