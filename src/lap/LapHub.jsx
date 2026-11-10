// '서킷 한 바퀴' 목록(달릴 수 있는 서킷 전부, 라운드 순) + 홈·상세의 진입 줄.
import { useMemo } from 'react';
import '../screens2/screens2.css';
import './lap.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { useShell } from '../shell/context.js';
import { getRaceState, isCancelled } from '../home/time.js';
import { Icon } from '../ui2/Icon.jsx';
import { ListHeader } from '../ui2/parts.jsx';
import { joinDot } from '../ui2/hooks.js';
import { formatLap } from './engine.js';
import { LAP_TRACKS, lapTrackOfRace, outlinePath, openLap, useLapRecords } from './store.js';
import { isThisWeek } from './place.js';

const cx = (...list) => list.filter(Boolean).join(' ');

export function LapThumb({ id }) {
  const d = useMemo(() => outlinePath(id, 44, 44, 7), [id]);
  return <span className="gx-lap-thumb" aria-hidden="true"><svg width="44" height="44" viewBox="0 0 44 44"><path d={d} /></svg></span>;
}

function open(id, source) { track('lap_entry_clicked', { track: id, source }); openLap(id); }

export function LapHub({ desktop = false, now }) {
  const fmt = useFormat(); const tr = useT();
  const rec = useLapRecords();
  const done = LAP_TRACKS.filter((t) => rec[t.id]?.best != null).length;
  return (
    <div className={cx('gx-screen gx-lap-hub', desktop && 'is-desk')}>
      <div className="gx-tab-top gx-lap-hub-top">
        <div>
          <h1 className={desktop ? 'gx-t30' : 'gx-t26'} data-view-title tabIndex={-1}>{tr('lap.title')}</h1>
          <span className="gx-t15 gx-sub">{done ? tr('lap.sub.some', { n: LAP_TRACKS.length, k: done }) : tr('lap.sub.none', { n: LAP_TRACKS.length })}</span>
        </div>
      </div>
      {LAP_TRACKS.map((t) => {
        const L = fmt.race(t.race); const r = rec[t.id];
        return (
          <button type="button" key={t.id} className="gx-row gx-lap-row" onClick={() => open(t.id, 'hub')}>
            <LapThumb id={t.id} />
            <span className="gx-row-c">
              <span className="gx-row-t gx-t17 gx-w600">{L.circuit}{isThisWeek(t.race, +now) && <span className="gx-lap-tag">{tr('lap.hub.week')}</span>}</span>
              <span className="gx-row-s gx-t13">{joinDot([L.country, tr('lap.turns', { n: t.turns })])}</span>
            </span>
            {r?.best != null
              ? <span className="gx-row-r"><span className="gx-t15 gx-w600">{formatLap(r.best)}</span><span className="gx-t13 gx-sub">{tr('lap.runs', { n: r.runs || 1 })}</span></span>
              : <Icon n="chev" s={20} />}
          </button>
        );
      })}
      <p className="gx-lap-hub-note gx-t13">{tr('lap.hub.note')}</p>
    </div>
  );
}

// 홈: 다가오는 경기 중 달릴 수 있는 첫 서킷(없으면 아직 안 달린 서킷, 다 달렸으면 첫 서킷) 한 줄 + '모든 서킷'
export function LapHome({ races, now }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const rec = useLapRecords();
  const pick = useMemo(() => {
    const alive = (races || []).filter((r) => !isCancelled(r) && !['done', 'cancelled'].includes(getRaceState(r, now)));
    for (const r of alive) { const t = lapTrackOfRace(r); if (t) return { t, upcoming: true, week: isThisWeek(r, now) }; }
    return { t: LAP_TRACKS.find((t) => rec[t.id]?.best == null) || LAP_TRACKS[0], upcoming: false, week: false };
  }, [races, now, rec]);
  if (!pick.t) return null;
  const { t, upcoming, week } = pick; const L = fmt.race(t.race); const r = rec[t.id];
  // 시즌이 끝나 다가오는 경기가 없을 때: 아직 안 달린 서킷 수
  const left = LAP_TRACKS.filter((x) => rec[x.id]?.best == null).length;
  const sub = r?.best != null ? tr('lap.mine', { time: formatLap(r.best) })
    : upcoming ? tr('lap.home.before') : left > 0 && left < LAP_TRACKS.length ? tr('lap.home.left', { n: left }) : tr('lap.home.try');
  return (
    <section className="gx-lap-home" aria-labelledby="gx-lap-home-h">
      <ListHeader id="gx-lap-home-h" title={tr('lap.title')} action={tr('lap.all')} onAction={() => { track('lap_hub_opened', { source: 'home' }); shell.push({ t: 'laps' }); }} />
      <button type="button" className="gx-row gx-lap-row" onClick={() => open(t.id, 'home')}>
        <LapThumb id={t.id} />
        <span className="gx-row-c">
          <span className="gx-row-t gx-t17 gx-w600">{L.circuit}{week && <span className="gx-lap-tag">{tr('lap.hub.week')}</span>}</span>
          <span className="gx-row-s gx-t13">{sub}</span>
        </span>
        <Icon n="chev" s={20} />
      </button>
    </section>
  );
}

// 경기 상세 › 현장: '한 바퀴 달려 보기' 줄. 달릴 수 있는 서킷의 경기에만
export function LapDetailRow({ race }) {
  const tr = useT(); const rec = useLapRecords();
  const t = lapTrackOfRace(race);
  if (!t) return null;
  const r = rec[t.id];
  return (
    <button type="button" className="gx-row gx-lap-row" onClick={() => open(t.id, 'detail')}>
      <span className="gx-bc-ic gx-lap-ic" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24"><path d={outlinePath(t.id, 24, 24, 1.5)} /></svg></span>
      <span className="gx-row-c"><span className="gx-t17">{tr('lap.row')}</span></span>
      <span className="gx-row-r">{r?.best != null ? <span className="gx-t15 gx-sub">{formatLap(r.best)}</span> : <Icon n="chev" s={20} className="gx-ter" />}</span>
    </button>
  );
}
