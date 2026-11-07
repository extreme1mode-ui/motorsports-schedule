// 즐겨찾기(UX v2 SPEC 5장): 제목 + '담은 경기 N개' + 톱니 · 다가오는 경기 · 지난 경기(3개 뒤 접기) · 빈 화면(안내 + 일정 둘러보기 + 담아 볼 만한 경기).
// 위계: 내가 담은 경기(표)가 먼저, 담아 볼 만한 경기는 늘 그 아래. 빈 화면에서 담은 뒤에도 표가 위로 오고 추천은 아래에 남는다.
// 경기 한 장 = 입장권: 몸통 + 절취선(반원 홈은 CSS mask) + 스텁(결승 · 시각 · 남은 때 · 바코드).
// 지난 경기는 경기 id로 정해지는 찢긴 결·기울기, 취소는 '취소' 도장, 현장에 간 지난 경기는 '현장 관람' 도장.
// 하트로 빼면(결정 17) 이 화면에 있는 동안 흐리게 남고 다시 누르면 다시 담긴다. 다른 탭으로 가면(화면이 내려가면) 정리된다.
import { useEffect, useRef, useState } from 'react';
import './screens2.css';
import './favs2.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { useShell } from '../shell/context.js';
import { useAlarms } from '../alarm.js';
import { useRecommendationShown } from '../use-analytics.js';
import { useCircuitMap } from '../circuit-map/context.js';
import { useF1Results, resultOf } from '../results/results.js';
import { getRaceState, getMainSessionAt, isCancelled } from '../home/time.js';
import { getPrimarySession, getRoundText } from '../schedule/utils.js';
import { Icon } from '../ui2/Icon.jsx';
import { Band, ListHeader, LiveText, RaceRow, HeartBtn, GearBtn } from '../ui2/parts.jsx';
import { joinDot } from '../ui2/hooks.js';

const HOUR_MS = 3600000;
const PAST_FOLD = 3;
const TEAR_GAP = 180;   // 함께 들어온 표끼리 위에서부터 이 간격으로 찢긴다
const msOf = (v) => (v ? new Date(v).getTime() : null);
const cx = (...list) => list.filter(Boolean).join(' ');
const viewModeOf = (preferences, s) => (preferences?.series?.[s] === 'all' ? 'all' : 'race');
const startOf = (race) => msOf(getPrimarySession(race)?.startUtc) ?? msOf(race.primaryStartUtc);

// 경기 id → 늘 같은 수(바코드 무늬·찢긴 결·기울기)
const hashOf = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function Barcode({ id }) {
  let h = hashOf(id); const bars = []; let x = 0;
  while (x < 72) {
    const w = 1 + (h & 1) + ((h >> 1) & 1); const g = 1 + ((h >> 2) & 1);
    bars.push(<rect key={x} x={x} y="0" width={w} height="16" />);
    x += w + g; h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
  }
  return <svg className="gx-tk-bar" width="72" height="16" viewBox="0 0 72 16" aria-hidden="true">{bars}</svg>;
}
// 찢긴 가장자리: 스텁 왼쪽과 몸통 오른쪽에 같은 결. 기울기 ±1.6–3.0도(방향도 경기마다)
function tornEdge(id) {
  let h = hashOf(`${id}tear`); const pts = [];
  for (let i = 0; i <= 16; i++) { pts.push([h % 5, (i / 16) * 100]); h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; }
  const stub = `polygon(${pts.map(([x, y]) => `${x}px ${y}%`).join(', ')}, 100% 100%, 100% 0%)`;
  const stub0 = `polygon(${pts.map(([, y]) => `0px ${y}%`).join(', ')}, 100% 100%, 100% 0%)`;
  const body = `polygon(0% 0%, ${pts.map(([x, y]) => `calc(100% - ${4 - Math.min(4, x)}px) ${y}%`).join(', ')}, 0% 100%)`;
  const hh = hashOf(id); const tilt = (hh & 1 ? 1 : -1) * (1.6 + (hh % 15) / 10);
  return { stub, stub0, body, tilt };
}

function Ticket({ race, now, preferences, on, onHeart, onOpen, tear, delay, tearRef, alarmOn, going, winner }) {
  const fmt = useFormat(); const tr = useT();
  const L = fmt.race(race);
  const st = getRaceState(race, now, viewModeOf(preferences, race.series));
  const cancelled = isCancelled(race) || st === 'cancelled';
  const done = !cancelled && st === 'done';
  const m = getMainSessionAt(race, now) || getPrimarySession(race);
  const t = msOf(m?.startUtc);
  const label = fmt.sessionLabel(m || { tEn: race.series === 'WRC' ? 'Power Stage' : 'Race', kind: 'race' });
  const date = t != null ? fmt.dayDate(t) : tr('fav.tk.dateTba');
  // 스텁의 '언제': 진행 중 → 주말 진행 중 → 12시간 안 'N시간 뒤' → 상대 날짜. 지난 경기는 '종료', 취소는 도장
  const when = cancelled ? null
    : done ? <span className="gx-t13 gx-ter">{tr('fav.tk.ended')}</span>
      : st === 'live' || st === 'session' ? <span className="gx-t13"><LiveText /></span>
        : st === 'weekend' ? <span className="gx-t13 gx-sub">{tr('status.weekend')}</span>
          : t != null ? <span className="gx-t13 gx-sub">{t - now < 12 * HOUR_MS ? fmt.relShort(t, now) : fmt.relDay(t, now)}</span>
            : <span className="gx-t13 gx-ter">{tr('fav.tk.timeTba')}</span>;
  const extra = done ? (winner ? tr('fav.tk.winner', { name: winner }) : null)
    : cancelled ? null : joinDot([alarmOn ? tr('fav.inCalendar') : null, going ? tr('fav.tk.attending') : null]);
  const te = done ? tornEdge(race.id) : null;
  const style = te ? { '--tk-clip': te.stub, '--tk-clip0': te.stub0, '--tk-bclip': te.body, '--tk-tilt': `${te.tilt}deg`, '--tk-delay': `${delay || 0}ms` } : undefined;
  // 버튼 이름 뒤 상태(', 취소' · ', 종료'). 문구표 fav.tk.aria의 state 자리
  const state = cancelled ? `, ${tr('status.cancelled')}` : done ? `, ${tr('status.done')}` : '';
  return (
    <div className={cx('gx-tk', `gx-tk-${race.series}`, done && 'is-done', cancelled && 'is-cancel', (st === 'live' || st === 'session') && 'is-live', !on && 'is-off', tear && 'is-tearing')}
      style={style} ref={tearRef} data-id={race.id}>
      <button type="button" className="gx-tk-hit" onClick={() => onOpen(race)} aria-label={tr('fav.tk.aria', { title: L.shortName, date, state })} />
      <div className="gx-tk-body" aria-hidden="true">
        <span className="gx-tk-tag gx-t13"><i className={`gx-dot s-${race.series}`} /><span className="gx-ell">{joinDot([race.series, getRoundText(race, fmt.locale)])}</span></span>
        <b className={cx('gx-tk-name gx-t20', cancelled && 'gx-strike')}>{L.shortName}</b>
        <span className="gx-tk-place gx-t13">{L.circuit || L.city}</span>
        <span className="gx-tk-foot"><b className="gx-t15">{date}</b>{extra && <span className="gx-t13 gx-tk-extra">{extra}</span>}</span>
        {done && going && <span className="gx-tk-stamp gx-t13">{tr('fav.tk.attendStamp')}</span>}
      </div>
      <div className="gx-tk-stub" aria-hidden="true">
        <span className="gx-t13 gx-tk-lab">{label}</span>
        <span className="gx-tk-time">{t != null && !cancelled ? <b className="gx-t22">{fmt.time(t)}</b> : <b className="gx-t17">{cancelled ? tr('status.cancelledDate') : tr('fav.tk.timeTba')}</b>}</span>
        {when}
        {cancelled ? <span className="gx-tk-stamp gx-tk-stamp-x gx-t15">{tr('fav.tk.cancelStamp')}</span> : <Barcode id={race.id} />}
      </div>
      <HeartBtn size="icon" className="gx-tk-heart" on={on} label={tr('aria.saveRace', { name: L.shortName })} onClick={onHeart} />
    </div>
  );
}

export function FavoritesScreen({ races, myRaces, now, preferences, favorites, toggleFav, onOpenRace }) {
  const tr = useT(); const fmt = useFormat(); const shell = useShell();
  const desktop = !!shell.desktop;
  const at = msOf(now);
  const alarms = useAlarms();
  const cm = useCircuitMap();
  const results = useF1Results(true);
  // 결정 17: 뺀 표는 이 화면에 있는 동안 흐리게 남긴다(다시 누르면 다시 담김)
  const [kept, setKept] = useState(() => new Set());
  const [allPast, setAllPast] = useState(false);
  const list = (races || []).filter((r) => favorites.has(r.id) || kept.has(r.id));
  const alive = (r) => { const s = getRaceState(r, at); return s !== 'done' && s !== 'cancelled' && !isCancelled(r); };
  const up = list.filter(alive).sort((a, b) => (startOf(a) ?? Infinity) - (startOf(b) ?? Infinity));
  const past = list.filter((r) => !alive(r)).sort((a, b) => (startOf(b) ?? 0) - (startOf(a) ?? 0));
  const savedN = list.filter((r) => favorites.has(r.id)).length;

  const heart = (race) => {
    const had = favorites.has(race.id);
    if (had) setKept((k) => new Set(k).add(race.id));
    toggleFav(race.id);
    shell.toast(tr(had ? 'toast.unsaved' : 'toast.saved'), { label: tr('toast.undo'), fn: () => toggleFav(race.id) });
  };
  const open = (race) => onOpenRace(race);

  // 빈 화면 추천: 다가오는 관심 경기 3개(지금 서비스 규칙). 담아도 이 화면에 있는 동안은 목록을 그대로 둔다
  const recs0 = (Array.isArray(myRaces) ? myRaces : races || []).filter((r) => r.status === 'upcoming' || r.status === 'live').slice(0, 3);
  const [suggIds, setSuggIds] = useState(null);
  if (!list.length && suggIds === null && recs0.length) setSuggIds(recs0.map((r) => r.id));
  const sugg = suggIds ? suggIds.map((id) => (races || []).find((r) => r.id === id)).filter(Boolean) : recs0;
  const emptyMode = !list.length || (!!suggIds && list.every((r) => suggIds.includes(r.id)));
  useRecommendationShown(emptyMode ? sugg : []);

  // 지난 경기 표는 이 세션에서 처음 화면에 들어올 때 한 번만 찢긴다(기억은 셸 메모리). 함께 들어온 표는 위에서부터 차례로
  const [tearing, setTearing] = useState(() => new Map());   // id → 지연(ms)
  const pending = useRef(new Map());
  const tearRef = (id) => (el) => { if (el) pending.current.set(id, el); else pending.current.delete(id); };
  const pastKey = (allPast ? past : past.slice(0, PAST_FOLD)).map((r) => r.id).join('|');
  useEffect(() => {
    const torn = shell.mem ? (shell.mem['fav.torn'] ||= new Set()) : new Set();
    const els = [...pending.current.entries()].filter(([id]) => !torn.has(id) && pastKey.split('|').includes(id));
    if (!els.length) return undefined;
    // 줄인 움직임이거나 IntersectionObserver가 없으면 바로 찢긴 모양(움직임 없음)
    let reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* */ }
    if (reduce || typeof IntersectionObserver === 'undefined') { els.forEach(([id]) => torn.add(id)); return undefined; }
    const io = new IntersectionObserver((ents) => {
      const vis = ents.filter((e) => e.isIntersecting).map((e) => e.target).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      if (!vis.length) return;
      const add = [];
      vis.forEach((el) => { const id = el.dataset.id; if (torn.has(id)) return; torn.add(id); add.push(id); io.unobserve(el); });
      if (add.length) setTearing((m) => { const n = new Map(m); add.forEach((id, i) => n.set(id, i * TEAR_GAP)); return n; });
    }, { threshold: 0.6 });
    els.forEach(([, el]) => io.observe(el));
    return () => io.disconnect();
  }, [pastKey, shell.mem]);

  const winnerOf = (race) => resultOf(results, race)?.gp?.[0]?.family || null;
  const ticket = (race) => (
    <Ticket key={race.id} race={race} now={at} preferences={preferences} on={favorites.has(race.id)} onHeart={() => heart(race)} onOpen={open}
      tear={tearing.has(race.id)} delay={tearing.get(race.id)} tearRef={tearRef(race.id)}
      alarmOn={alarms.has(race.id)} going={!!cm?.attend?.has(race.id)} winner={winnerOf(race)} />
  );
  const pastShown = allPast ? past : past.slice(0, PAST_FOLD);

  // 담아 볼 만한 경기: 담은 경기 아래(빈 화면이면 안내 아래)
  const suggSec = emptyMode && sugg.length > 0 && (
    <section aria-labelledby="gx-fav-sugg">
      <ListHeader id="gx-fav-sugg" title={tr('fav.suggest')} />
      <div className="gx-sugg-list">
        {sugg.map((r, i) => {
          const on = favorites.has(r.id);
          return (
            <div key={r.id} className="gx-row-wrap gx-sugg">
              <RaceRow race={r} now={at} meta={getRoundText(r, fmt.locale) || r.series}
                onOpen={() => { track('recommendation_clicked', { series: r.series, position: i }); onOpenRace(r, 'recommendation'); }} />
              <button type="button" className={cx('gx-save-btn gx-t15', on && 'is-on')} aria-pressed={on} aria-label={tr('aria.saveRace', { name: fmt.race(r).shortName })}
                onClick={() => toggleFav(r.id)}>{on ? <><Icon n="check" s={16} />{tr('fav.savedShort')}</> : tr('fav.save')}</button>
            </div>
          );
        })}
      </div>
    </section>
  );

  const upSec = up.length > 0 && (
    <section aria-labelledby="gx-fav-up">
      <ListHeader id="gx-fav-up" title={tr('fav.upcoming')} sub={tr('list.count', { n: up.length })} />
      <div className="gx-tk-list">{up.map(ticket)}</div>
    </section>
  );
  const pastSec = past.length > 0 && (
    <section aria-labelledby="gx-fav-past">
      <ListHeader id="gx-fav-past" title={tr('fav.past')} sub={tr('fav.pastSub', { n: past.length })} />
      <div className="gx-tk-list">{pastShown.map(ticket)}</div>
      {past.length > PAST_FOLD && (
        <button type="button" className="gx-past-toggle gx-t15" aria-expanded={allPast} onClick={() => setAllPast(!allPast)}>
          <Icon n={allPast ? 'up' : 'down'} s={20} />{allPast ? tr('fav.pastHide') : tr('fav.pastAll', { n: past.length })}
        </button>
      )}
    </section>
  );
  return (
    <div className={cx('gx-favs', desktop && 'is-desk')}>
      <div className="gx-tab-top">
        <div><h1 className="gx-t26" data-view-title tabIndex={-1}>{tr('fav.title')}</h1>{savedN > 0 && <span className="gx-t15 gx-sub">{tr('fav.subtitle', { n: savedN })}</span>}</div>
        {!desktop && <div className="gx-top-acts"><GearBtn onClick={() => shell.openSettings()} /></div>}
      </div>
      {!list.length && (
        <div className="gx-empty">
          <span className="gx-empty-ic"><Icon n="heart" s={28} /></span>
          <b className="gx-t20">{tr('fav.emptyTitle')}</b>
          <p className="gx-t15 gx-sub">{tr('fav.emptyBody')}</p>
          <button type="button" className="gx-btn is-weak" onClick={() => shell.go?.('schedule')}>{tr('fav.browse')}</button>
        </div>
      )}
      {desktop ? (
        list.length > 0 && <div className="gx-fav-cols"><div>{upSec}</div><div>{pastSec}</div></div>
      ) : (
        <>
          {upSec}
          {up.length > 0 && past.length > 0 && <Band />}
          {pastSec}
        </>
      )}
      {suggSec && <><Band />{suggSec}</>}
    </div>
  );
}
