// '한 바퀴' 결과 카드의 순위 · 다음 목표 · 구간 기록(마리오 카트 결과 화면처럼 순위가 한 칸씩 올라가는 장면).
// 움직임: 카드가 뜬 뒤 260ms에 내 줄이 아래에서 올라오고 바로 아래 줄은 내려간다(340ms, 튀지 않음). 순위 숫자는 이전 순위에서 한 칸씩(0.9초 안).
// 줄인 움직임에서는 바로 끝 모습
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { Icon } from '../ui2/Icon.jsx';
import { formatLap } from './engine.js';
import { nameOf } from './player.js';
import { useCountDown } from './count-down.js';

const secText = (t) => (t >= 60 ? formatLap(t * 1000) : t.toFixed(3));

export function LapRank({ rank, reduced, onOpen }) {
  const tr = useT(); const fmt = useFormat();
  const up = rank.before == null ? 'new' : rank.before > rank.n ? 'up' : null;
  const shown = useCountDown(rank.before ?? rank.n, rank.n, up === 'up' && !reduced);
  const near = rank.near || []; const k = near.findIndex((r) => r.me);
  const move = reduced ? null : up;
  const sub = [nameOf(rank.pid, fmt.locale), up === 'new' ? tr('lap.board.joined') : up === 'up' ? tr('lap.board.up', { n: rank.before }) : null].filter(Boolean).join(' · ');
  return (
    <div className="gx-lap-rk">
      <div className="gx-lap-rk-h">
        <span className="gx-lap-rk-t"><b className="gx-t20 gx-w700">{tr('lap.board.weekRank', { n: shown })}</b><span className="gx-t13 gx-sub"> {tr('lap.board.of', { n: rank.count.toLocaleString(fmt.locale) })}</span></span>
        <button type="button" className="gx-textbtn gx-t15 gx-lap-more" onClick={onOpen}>{tr('lap.board.title')}<Icon n="chev" s={18} /></button>
      </div>
      <span className="gx-t13 gx-sub gx-ell">{sub}</span>
      {near.length > 0 && (
        <ol className={`gx-lap-rk-rows${move ? ` is-${move}` : ''}`} aria-label={tr('lap.board.near')}>
          {near.map((r, i) => (
            <li key={r.pid} className={`gx-lap-rk-row${r.me ? ' is-me' : ''}${move === 'up' && i === k + 1 ? ' is-passed' : ''}`}>
              <span className="gx-lap-rk-n gx-t15 gx-w600">{r.me ? shown : r.rank}</span>
              <span className="gx-lap-rk-name gx-t15 gx-ell">{nameOf(r.pid, fmt.locale)}{r.me && <em className="gx-lap-tag">{tr('lap.board.me')}</em>}</span>
              <span className="gx-lap-rk-ms gx-t15 gx-w600">{formatLap(r.ms)}</span>
            </li>
          ))}
        </ol>
      )}
      {rank.goals?.length > 0 && (
        <div className="gx-lap-goals">
          <span className="gx-t13 gx-sub">{tr('lap.goal.title')}</span>
          <ul>
            {rank.goals.map((g) => (
              <li key={g.kind}>
                <span className="gx-t13 gx-sub">{g.kind === 'next' ? tr('lap.goal.next', { n: g.rank }) : g.kind === 'tier' ? tr('lap.goal.tier', { n: g.rank }) : g.kind === 'top' ? tr('lap.goal.top') : tr('lap.goal.lead')}</span>
                <b className="gx-t17 gx-w700">{tr('lap.goal.sec', { sec: (g.ms / 1000).toFixed(3) })}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 구간 기록: 같은 거리로 나눈 세 구간(칸마다 작은 서킷 그림에 그 구간만 진하게). 이전 최고 기록이 있으면 구간마다 차이(빨랐으면 채운 칸, 늦었으면 테두리만 — 색만으로 나누지 않는다)
export function LapThirds({ thirds, prev, paths }) {
  const tr = useT();
  return (
    <div className="gx-lap-thirds">
      <div className="gx-lap-rk-h"><span className="gx-t15 gx-w600">{tr('lap.sector.title')}</span>{prev && <span className="gx-t13 gx-sub">{tr('lap.sector.vs')}</span>}</div>
      <ol className="gx-lap-secs">
        {thirds.map((t, i) => {
          const d = prev ? t - prev[i] : null; const same = d != null && Math.abs(d) < 0.0005;
          return (
            <li key={i}>
              {paths && <svg className="gx-lap-sec-map" width="44" height="30" viewBox="0 0 44 30" aria-hidden="true"><path className="is-all" d={paths.full} /><path d={paths.parts[i]} /></svg>}
              <span className="gx-t13 gx-sub">{tr('lap.sector.n', { n: i + 1 })}</span>
              <b className="gx-t17 gx-w700">{secText(t)}</b>
              {d != null && (
                <span className={`gx-lap-secd gx-t13 gx-w600 ${same ? 'is-same' : d < 0 ? 'is-fast' : 'is-slow'}`}
                  aria-label={same ? tr('lap.sector.same') : tr(d < 0 ? 'lap.sector.faster' : 'lap.sector.slower', { sec: Math.abs(d).toFixed(3) })}>
                  {same ? '0.000' : `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(3)}`}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
