// '한 바퀴' 순위표(레이어 안 전체 화면): 이번 주 · 전체 두 탭, 위에서 50줄 + 내 줄. 내가 50위 밖이면 아래에 따로 붙는다.
import { useEffect, useRef, useState } from 'react';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { arrowPick } from '../ui2/hooks.js';
import { Icon } from '../ui2/Icon.jsx';
import { formatLap } from './engine.js';
import { useBoard } from './board.js';
import { nameOf } from './player.js';

const PERIODS = ['week', 'all'];

function Row({ r, top, locale, tr }) {
  return (
    <li className={`gx-lap-brow${r.me ? ' is-me' : ''}`}>
      <span className="gx-lap-brank gx-t15 gx-w600">{r.rank}</span>
      <span className="gx-lap-bname gx-t15 gx-ell">{nameOf(r.pid, locale)}{r.me && <em className="gx-lap-tag">{tr('lap.board.me')}</em>}</span>
      <span className="gx-lap-btime gx-t15 gx-w600">{formatLap(r.ms)}</span>
      <span className="gx-lap-bgap gx-t13">{top && r.rank > 1 ? `+${((r.ms - top.ms) / 1000).toFixed(3)}` : ''}</span>
    </li>
  );
}

export function LapBoard({ id, circuit, onClose, start = 'week' }) {
  const tr = useT(); const fmt = useFormat();
  const [period, setPeriod] = useState(start);
  const b = useBoard(id, period, Date.now());
  const closeRef = useRef(null); const listRef = useRef(null);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);
  // 열 때 · 탭을 바꿀 때: 내 줄이 첫 화면 밖이면 내 줄이 가운데 오게, 아니면 맨 위로(움직임 없이 바로)
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    const me = el.querySelector('.is-me');
    el.scrollTop = me && me.offsetTop + me.offsetHeight > el.clientHeight ? Math.max(0, me.offsetTop - (el.clientHeight - me.offsetHeight) / 2) : 0;
  }, [period]);
  const out = b?.me && b.me.rank > b.rows.length ? b.me : null;
  const n = (v) => v.toLocaleString(fmt.locale);
  const sub = period === 'week'
    ? [b.count ? tr('lap.board.count', { n: n(b.count) }) : null, tr('lap.board.reset', { when: fmt.dayDateTime(b.wk.end) })].filter(Boolean).join(' · ')
    : b.count ? tr('lap.board.count', { n: n(b.count) }) : '';
  return (
    <div className="gx-lap-board" role="dialog" aria-modal="true" aria-labelledby="gx-lap-bh">
      <header className="gx-lap-bhead">
        <button type="button" ref={closeRef} className="gx-iconbtn" aria-label={tr('lap.close')} onClick={onClose}><Icon n="close" /></button>
        <div className="gx-lap-bhead-t"><h2 className="gx-t17 gx-w600" id="gx-lap-bh">{tr('lap.board.title')}</h2><span className="gx-t13 gx-sub gx-ell">{circuit}</span></div>
      </header>
      <div className="gx-seg gx-lap-bseg" role="radiogroup" aria-label={tr('lap.board.period')}>
        {PERIODS.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={period === p} tabIndex={period === p ? 0 : -1} className={period === p ? 'is-on' : ''}
            onClick={() => setPeriod(p)} onKeyDown={(e) => arrowPick(e, PERIODS, period, setPeriod)}>{tr(`lap.board.${p}`)}</button>
        ))}
      </div>
      <p className="gx-lap-bsub gx-t13">{sub}</p>
      {b.rows.length ? (
        <ol className="gx-lap-blist" ref={listRef} aria-label={tr(`lap.board.${period}`)}>
          {b.rows.map((r) => <Row key={r.pid} r={r} top={b.top} locale={fmt.locale} tr={tr} />)}
        </ol>
      ) : (
        <p className="gx-lap-bempty gx-t15">{tr(period === 'week' ? 'lap.board.emptyWeek' : 'lap.board.emptyAll')}</p>
      )}
      {out && <ol className="gx-lap-blist is-out" start={out.rank} aria-label={tr('lap.board.mine')}><Row r={{ ...out, me: true }} top={b.top} locale={fmt.locale} tr={tr} /></ol>}
      <p className="gx-lap-bnote gx-t13">{tr(b.me ? 'lap.board.note' : 'lap.board.join')}</p>
    </div>
  );
}
