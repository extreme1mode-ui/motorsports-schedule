// 시리즈(UX v2 SPEC 3장): 목록 화면 없이 처음부터 F1. 위 탭(F1 · 내구 · WRC · GTWC)으로 바꾸고, 고른 시리즈는 탭을 옮겨도 기억.
// 풀 히어로(화면 위 끝까지 사진) 안에 '시리즈' 제목·톱니 · 탭 · 시즌 · 시리즈 이름 · 지금 상태 한 줄 · 시즌 진행.
// 아래로 내려 사진 안 탭이 지나가면 위에 탭만 있는 막대가 붙는다. 히어로 아래는 보는 범위 · (F1) 경기/드라이버 순위 ·
// 남은 경기 → 지난 경기(4개 뒤 접기) → 취소된 경기. 데스크톱은 라운드 표(결정 12).
import { useEffect, useMemo, useRef, useState } from 'react';
import './screens2.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { useShell } from '../shell/context.js';
import { useMem } from './use-mem.js';
import { getRoundNumber, getRoundText, getChampionshipLabel, getSeriesStats, getPrimarySession } from '../schedule/utils.js';
import { CATEGORY_META, getCategoryForSeries } from '../schedule/constants.js';
import { getRaceState, getMainSessionAt, isCancelled, isAliveState } from '../home/time.js';
import { photo, photoCredit } from '../home/photos.js';
import { useF1Results, resultOf, photoOf, teamColor, raceKey } from '../results/results.js';
import { Avatar } from '../results/ResultsUI.jsx';
import { Icon } from '../ui2/Icon.jsx';
import { Dot, Band, ListHeader, RaceRow, Tabs, LiveText, StateText, Photo, GearBtn } from '../ui2/parts.jsx';
import { joinDot } from '../ui2/hooks.js';

const CATS = ['F1', 'ENDURANCE', 'WRC', 'GTWC'];
const SERIES_OF = { F1: ['F1'], ENDURANCE: ['WEC', 'IMSA'], WRC: ['WRC'], GTWC: ['GTWC'] };
// 시리즈마다 차가 크게 보이는 한 장(지금 서비스 경기 사진 /photos/races/* 와 출처 그대로): F1 상하이 · 내구 몬차 · WRC 일본 · GTWC 마니쿠르
const HERO_PHOTO = { F1: ['f1-2026-2-chinesegrandprix', '50% 50%'], ENDURANCE: ['wec-2026-8-6hoursofmonza', '46% 50%'], WRC: ['wrc-2026-7-rallyjapan', '50% 50%'], GTWC: ['gtwc-2026-3-gtworldchallengeeuropesprint', '52% 50%'] };
const msOf = (v) => (v ? new Date(v).getTime() : null);
const cx = (...list) => list.filter(Boolean).join(' ');
const viewModeOf = (preferences, s) => (preferences?.series?.[s] === 'all' ? 'all' : 'race');
const startOfRace = (r) => msOf(getPrimarySession(r)?.startUtc) ?? msOf(r.primaryStartUtc) ?? 0;
const scrollerOf = (el) => el?.closest('[data-scroll]') || null;
const catName = (tr, cat) => (cat === 'ENDURANCE' ? tr('category.ENDURANCE') : CATEGORY_META[cat].name);

// 시즌 진행(사진 위): 끝난 수를 크게, 경기마다 한 칸. 끝남·취소 흰색 · 남음 옅게 · 다음 경기 칸은 키를 높여 · 진행 중 노랑
function SeasonStatus({ stats, list, now }) {
  const tr = useT();
  const ord = list.slice().sort((a, b) => startOfRace(a) - startOfRace(b));
  const cell = (r) => {
    if (isCancelled(r)) return 'x';
    const st = getRaceState(r, now);
    if (st === 'done') return 'd';
    if (st === 'live' || st === 'session') return 'l';
    if (r === stats.next) return 'n';
    return 'u';
  };
  const text = tr('series.progressText', { total: stats.rounds, done: stats.done, cancelled: stats.cancelled ? tr('series.progressText.cancelled', { n: stats.cancelled }) : '' });
  return (
    <div className="gx-ssb">
      <div className="gx-ssb-h">
        <span className="gx-ssb-n"><b className="gx-t22">{stats.done}</b><span className="gx-t15">{tr('series.heroCount', { done: '', total: stats.rounds })}</span></span>
        <span className="gx-t13 gx-ssb-r">{stats.remaining ? tr('series.heroLeft', { n: stats.remaining }) : tr('series.over')}{stats.cancelled ? tr('series.heroCancelled', { n: stats.cancelled }) : ''}</span>
      </div>
      <span className="gx-ssb-bar" role="progressbar" aria-label={tr('series.progressAria')} aria-valuemin={0} aria-valuemax={stats.rounds} aria-valuenow={stats.done} aria-valuetext={text}
        style={{ gridTemplateColumns: `repeat(${ord.length}, minmax(0, 1fr))` }}>
        {ord.map((r) => <i key={r.id} className={`ss-${cell(r)}`} />)}
      </span>
    </div>
  );
}

function SeriesHero({ cat, races, stats, list, now, tabs, tabsRef, onOpen, year }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const [pid, pos] = HERO_PHOTO[cat];
  const ph = races.find((r) => (r.staticId || r.id) === pid) || null;
  const credit = ph ? photoCredit(ph) : null;
  const lv = stats.live; const lvSt = lv ? getRaceState(lv, now) : null;
  const target = lv || stats.next;
  const t = target ? (msOf(getMainSessionAt(target, now)?.startUtc) ?? msOf(target.primaryStartUtc)) : null;
  const name = (r) => fmt.race(r).shortName;
  const status = lv
    ? (lvSt === 'live' || lvSt === 'session' ? <LiveText>{tr('series.liveRace', { name: name(lv) })}</LiveText> : <span>{tr('series.weekendRace', { name: name(lv) })}</span>)
    : stats.next ? <span className="gx-nw-parts">{tr('series.heroNext', { name: name(stats.next), datetime: t ? fmt.dayDateTime(t) : tr('status.tba') })}</span> : null;
  const sub = SERIES_OF[cat].length > 1 ? joinDot([tr('series.season', { year }), ...SERIES_OF[cat]]) : tr('series.season', { year });
  // 히어로 제목만 '내구 레이스'(프로토타입 그룹 이름). 탭 이름은 '내구' 그대로
  const nm = cat === 'ENDURANCE' ? tr('series.heroName.ENDURANCE') : catName(tr, cat);
  return (
    <header className="gx-sfh">
      {ph && <Photo className="gx-sfh-img" key={ph.id} src={photo(ph, 'hero')} pos={pos} eager />}
      <span className="gx-sfh-shade" aria-hidden="true" />
      <div className="gx-sfh-in">
        <div className="gx-sfh-top"><h1 className="gx-t26" data-view-title tabIndex={-1}>{tr('series.title')}</h1>{!shell.desktop && <GearBtn onClick={() => shell.openSettings()} />}</div>
        <div className="gx-ser-tabs is-on-photo" ref={tabsRef}>{tabs}</div>
        <div className="gx-sfh-info" key={cat}>
          <span className="gx-t15 gx-sfh-sub">{sub}</span>
          <h2 className={nm.length > 16 ? 'gx-t26' : 'gx-t30'} id={`gx-ser-h-${cat}`}>{nm}</h2>
          {status ? (target ? <button type="button" className="gx-ser-now gx-t15" onClick={() => onOpen(target)}>{status}<Icon n="chev" s={16} /></button> : <span className="gx-ser-now gx-t15">{status}</span>) : null}
          <SeasonStatus stats={stats} list={list} now={now} />
        </div>
      </div>
      {credit && <a className="gx-sfh-credit" href={credit.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-label={`${tr('photo.credit', credit)}. ${tr('aria.external')}`}>{tr('photo.credit', credit)}</a>}
    </header>
  );
}

// 미니 시상대: 1위가 맨 위
function MiniPodium({ race, data }) {
  const res = resultOf(data, race);
  const top = (res?.gp || []).filter((x) => ['1', '2', '3'].includes(String(x.pt))).slice(0, 3);
  if (!top.length) return null;
  return (
    <span className="gx-mini-podium" aria-label={top.map((x) => x.family).join(', ')}>
      {top.map((x, i) => <span className="gx-mini-av" key={x.code} style={{ zIndex: 3 - i }}><Avatar src={photoOf(data, x.code)} code={x.code} size={28} /></span>)}
    </span>
  );
}

// 드라이버 순위(F1): 순위 · 사진 · 이름 · 팀 · 승수 …… 점수. 사진이 없으면 코드 글자(13px)
function Standings({ races, data }) {
  const fmt = useFormat(); const tr = useT();
  if (!data) return <div style={{ minHeight: 240 }} />;
  const st = data.standings;
  const after = races.find((r) => raceKey(r) === st.raceId);
  return (
    <section aria-label={tr('standings.title')}>
      <p className="gx-tl-note gx-t13">{tr('standings.after', { round: st.round, race: after ? fmt.race(after).shortName : '' })}</p>
      {st.rows.map((x) => (
        <div key={x.code} className={cx('gx-row gx-res-row', +x.p <= 3 && 'is-podium')}>
          <span className={cx('gx-res-p', +x.p <= 3 ? 'gx-t20' : 'gx-t17')}>{x.pt}</span>
          <span className="gx-res-av"><Avatar src={photoOf(data, x.code)} code={x.code} size={40} /></span>
          <span className="gx-row-c">
            <span className="gx-t17 gx-res-name"><span className="gx-sub gx-t15">{x.given}</span> <b className="gx-w600">{x.family}</b></span>
            <span className="gx-row-s gx-t13"><i className="gx-team-dot" style={{ background: x.c ? teamColor(x.c) : 'var(--text4)' }} />{joinDot([(x.teams || []).join(' / '), +x.wins ? tr('standings.wins', { n: x.wins }) : null])}</span>
          </span>
          <span className="gx-row-r gx-res-pts"><span className="gx-t17 gx-w600">{x.pts}</span><span className="gx-t13 gx-sub">{tr('results.points')}</span></span>
        </div>
      ))}
    </section>
  );
}

// 데스크톱 라운드 표(결정 12): F1만 포디움 열, 마지막 열 '시각'(WRC '파워 스테이지 시각'), 내구는 경기 칸에 시리즈 점·코드
function RoundTable({ list, multi, next, now, data, onOpen, preferences }) {
  const fmt = useFormat(); const tr = useT();
  const pod = list.some((r) => r.series === 'F1');
  const wrc = list.every((r) => r.series === 'WRC');
  return (
    <div className="gx-rtable-wrap">
      <table className="gx-rtable">
        <thead><tr>
          <th scope="col">{tr('series.col.round')}</th><th scope="col">{tr('series.col.date')}</th><th scope="col">{tr('series.col.race')}</th>
          {pod && <th scope="col">{tr('series.col.podium')}</th>}
          <th scope="col" className="is-r">{tr(wrc ? 'series.col.start.WRC' : 'series.col.start')}</th>
        </tr></thead>
        <tbody>
          {list.map((r) => {
            const st = getRaceState(r, now); const cancelled = isCancelled(r);
            const start = getPrimarySession(r)?.startUtc;
            const L = fmt.race(r);
            const res = resultOf(data, r);
            const top = (res?.gp || []).filter((x) => ['1', '2', '3'].includes(String(x.pt))).slice(0, 3);
            return (
              <tr key={r.id} className={st === 'done' || cancelled ? 'is-dim' : undefined} onClick={() => onOpen(r)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(r); } }}>
                <td className="gx-t15 gx-sub">{getRoundNumber(r) || '—'}</td>
                <td className="gx-t15 is-nowrap">{start ? fmt.dayDate(start) : tr('status.cancelledDate')}</td>
                <td>
                  <span className={cx('gx-t15 gx-w600', cancelled && 'gx-strike')}>{L.shortName}</span>
                  <span className="gx-t13 gx-sub is-block">{multi && <Dot series={r.series} />}{joinDot([multi ? r.series : null, getChampionshipLabel(r), L.circuit, r.isSprint ? tr('home.sprintWeekend') : null])}</span>
                </td>
                {pod && <td>{top.length ? <span className="gx-t13 gx-pod-names">{top.map((x) => <span key={x.code}><b>{x.pt}</b> {x.code}</span>)}</span> : <span className="gx-t13 gx-ter">—</span>}</td>}
                <td className="is-r is-nowrap">
                  <span className="gx-t15 gx-w600">{cancelled || !start ? tr('status.cancelledDate') : fmt.time(start)}</span>
                  {st !== 'done' && <span className="gx-t13 is-block"><StateText race={r} now={now} isNext={r === next} mode={viewModeOf(preferences, r.series)} /></span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SeriesBody({ cat, list, stats, now, preferences, data, onOpen, races }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const [tab, setTab] = useState('rounds');
  const [allDone, setAllDone] = useState(false);
  const series = SERIES_OF[cat];
  const one = series.length === 1;
  const upcoming = list.filter((r) => isAliveState(getRaceState(r, now)));
  const done = list.filter((r) => getRaceState(r, now) === 'done').sort((a, b) => startOfRace(b) - startOfRace(a));
  const cancelled = list.filter((r) => isCancelled(r));
  const place = (r) => { const L = fmt.race(r); return L.city && L.city !== L.shortName ? L.city : (L.circuit || L.city); };
  const winner = (r) => { const res = resultOf(data, r); const w = res?.gp?.find((x) => String(x.pt) === '1'); return w ? tr('series.winner', { name: w.family }) : null; };
  // 시리즈 하나짜리는 왼쪽에 라운드 번호(같은 타일이 줄마다 반복되지 않게), 내구는 시리즈 타일
  const lead = (r) => (one ? <span className="gx-date gx-rnd" aria-hidden="true">{getRoundNumber(r) ? <><b className="gx-t17">{getRoundNumber(r)}</b><span className="gx-t13 gx-sub">{tr('round.lead')}</span></> : <b className="gx-t17 gx-ter">—</b>}</span> : null);
  // GTWC는 보조 줄에 선수권 이름(결정 10), 내구는 라운드 문구
  const metaHead = (r) => (one ? getChampionshipLabel(r) : getRoundText(r, fmt.locale));
  const upRight = (r) => {
    const st = getRaceState(r, now, viewModeOf(preferences, r.series));
    if (['live', 'session', 'weekend', 'soon'].includes(st)) {
      const m = getMainSessionAt(r, now);
      return <><span className="gx-t15 gx-w600">{m?.startUtc ? (st === 'live' ? fmt.time(m.startUtc) : fmt.dayDate(m.startUtc)) : tr('status.tba')}</span><span className="gx-t13"><StateText race={r} now={now} mode={viewModeOf(preferences, r.series)} /></span></>;
    }
    if (r === stats.next) {
      const s = getPrimarySession(r)?.startUtc;
      return <><span className="gx-t15 gx-w600">{s ? fmt.dayDate(s) : tr('status.tba')}</span><span className="gx-t13 gx-st-next">{s ? tr('series.nextLine', { time: fmt.time(s) }) : tr('status.next')}</span></>;
    }
    return undefined;
  };
  const modeLabel = (s, m) => tr(m === 'race' && s === 'WRC' ? 'mode.race.WRC' : `mode.${m}`);
  const onTab = (v) => { if (v !== tab) track('series_view_changed', { category: cat, view: v }); setTab(v); };
  return (
    <>
      {series.map((s) => {
        const m = preferences?.series?.[s] || 'off';
        return (
          <button type="button" key={s} className="gx-row gx-mode-row" onClick={() => shell.openSheet('mode', s)}>
            <span className="gx-row-c"><span className="gx-t17">{one ? tr('series.following') : tr('series.followingOf', { series: s })}</span></span>
            <span className="gx-row-r gx-row-r-mid"><span className={cx('gx-t15', m === 'off' ? 'gx-ter' : 'gx-sub')}>{modeLabel(s, m)}</span><Icon n="chev" s={20} className="gx-ter" /></span>
          </button>
        );
      })}
      <Band />
      {cat === 'F1' && <div className="gx-tabs-wrap"><Tabs label={tr('series.tabsAria')} value={tab} onChange={onTab} options={[{ v: 'rounds', l: tr('series.view.rounds') }, { v: 'drivers', l: tr('series.view.drivers') }]} /></div>}
      {tab === 'drivers' && cat === 'F1' ? <Standings races={races} data={data} /> : shell.desktop ? (
        <><ListHeader title={tr('series.roundList')} sub={tr('list.count', { n: list.length })} /><RoundTable list={list} multi={!one} next={stats.next} now={now} data={data} onOpen={onOpen} preferences={preferences} /></>
      ) : (
        <>
          {upcoming.length > 0 && <>
            <ListHeader title={tr('series.upcoming')} sub={tr('list.count', { n: upcoming.length })} />
            {upcoming.map((r) => <RaceRow key={r.id} race={r} now={now} onOpen={onOpen} lead={lead(r)} meta={joinDot([metaHead(r), place(r), r === stats.next ? fmt.relDay(startOfRace(r), now) : null])} right={upRight(r)} />)}
          </>}
          {done.length > 0 && <>
            <ListHeader title={tr('series.past')} sub={tr('series.pastSub', { n: done.length })} />
            {(allDone ? done : done.slice(0, 4)).map((r) => {
              const s = getPrimarySession(r)?.startUtc;
              const pod = <MiniPodium race={r} data={data} />;
              return <RaceRow key={r.id} race={r} now={now} onOpen={onOpen} lead={lead(r)} meta={joinDot([metaHead(r), winner(r) || place(r)])}
                right={resultOf(data, r) ? pod : <span className="gx-t13 gx-sub">{s ? fmt.dayDateNoDow(s) : ''}</span>} />;
            })}
            {done.length > 4 && <button type="button" className="gx-past-toggle gx-t15" aria-expanded={allDone} onClick={() => setAllDone(!allDone)}><Icon n={allDone ? 'up' : 'down'} s={20} />{allDone ? tr('series.pastHide') : tr('series.pastAll', { n: done.length })}</button>}
          </>}
          {cancelled.length > 0 && <>
            <ListHeader title={tr('series.cancelled')} sub={tr('list.count', { n: cancelled.length })} />
            {cancelled.map((r) => <RaceRow key={r.id} race={r} now={now} onOpen={onOpen} lead={lead(r)} meta={joinDot([metaHead(r), place(r)])} />)}
          </>}
        </>
      )}
    </>
  );
}

export function SeriesScreen({ races = [], now, onOpenRace, preferences, seasonYear, initialCategory }) {
  const tr = useT(); const shell = useShell();
  const at = new Date(now).getTime();
  const [picked, setPicked0] = useMem('series.picked', initialCategory || 'F1');
  // 다른 화면이 시리즈를 정해 열면(홈의 시리즈 링크 등) 그 시리즈로
  const [lastInit, setLastInit] = useState(initialCategory);
  if (initialCategory && initialCategory !== lastInit) { setLastInit(initialCategory); setPicked0(initialCategory); }
  const year = Number.isFinite(seasonYear) ? seasonYear : new Date(at).getFullYear();
  const data = useF1Results(true);
  const byCat = useMemo(() => {
    const o = {};
    for (const c of CATS) {
      const list = races.filter((r) => getCategoryForSeries(r.series) === c).sort((a, b) => startOfRace(a) - startOfRace(b));
      o[c] = { list, stats: getSeriesStats(list, at) };
    }
    return o;
  }, [races, at]);
  const { list, stats } = byCat[picked] || byCat.F1;

  // 사진 안의 탭이 위로 지나가면 위에 탭 막대를 붙인다(자리를 차지하지 않고, 안 보일 때는 inert)
  const root = useRef(null); const tabsRef = useRef(null);
  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    const sc = scrollerOf(root.current); const target = sc || window;
    const check = () => {
      const tb = tabsRef.current; if (!tb) return;
      const top = sc ? sc.getBoundingClientRect().top : 0;
      setBarOn(tb.getBoundingClientRect().bottom < top + 4);
    };
    target.addEventListener('scroll', check, { passive: true });
    const raf = requestAnimationFrame(check);
    return () => { cancelAnimationFrame(raf); target.removeEventListener('scroll', check); };
  }, []);
  const setPicked = (id) => {
    if (id === picked) return;
    track('series_tab_changed', { category: id });
    setPicked0(id);
    // 아래로 내려와 있었으면 새 시리즈의 처음(사진)부터
    if (barOn) { const sc = scrollerOf(root.current); if (sc) sc.scrollTop = 0; else window.scrollTo({ top: 0 }); }
  };
  // 진행 중인 경기가 있는 시리즈는 탭에 노란 점
  const opts = CATS.map((c) => {
    const lv = byCat[c].stats.live; const st = lv ? getRaceState(lv, at) : null;
    const on = st === 'live' || st === 'session';
    return { v: c, l: <>{c === 'ENDURANCE' ? tr('category.ENDURANCE') : c}{on && <><i className="gx-tab-live" aria-hidden="true" /><span className="gx-vh">{tr('series.liveTab')}</span></>}</> };
  });
  const tabs = <Tabs label={tr('series.tabsLabel')} value={picked} onChange={setPicked} options={opts} />;
  const open = (r) => onOpenRace(r);
  return (
    <div className={cx('gx-screen gx-series', shell.desktop ? 'is-desk' : 'is-mob')} ref={root}>
      <div className={cx('gx-ser-bar', barOn && 'is-on')} inert={!barOn || undefined} aria-hidden={!barOn || undefined}>
        <div className="gx-ser-bar-in"><div className="gx-ser-tabs">{tabs}</div></div>
      </div>
      <SeriesHero cat={picked} races={races} stats={stats} list={list} now={at} tabs={tabs} tabsRef={tabsRef} onOpen={open} year={year} />
      <div className="gx-ser-main">
        <div key={picked} className="gx-ser-body">
          <SeriesBody cat={picked} list={list} stats={stats} now={at} preferences={preferences} data={data} onOpen={open} races={races} />
        </div>
      </div>
    </div>
  );
}

