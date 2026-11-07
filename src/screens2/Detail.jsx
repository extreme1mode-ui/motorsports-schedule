// 경기 상세(UX v2 SPEC 4장): 사진(+출처) → 시리즈·라운드 / 제목 / 장소 → 핵심 블록 → 관전 포인트 → 바로 가기 탭(위에 붙음)
// → [결과] → 중계 → 세션 일정 → [중계(끝난 경기)] → 현장 또는 관련 링크 → 주말 정보 → 아래 고정 바 [♡][행동].
// 모바일은 화면 스택 안(위 막대: 뒤로·제목·공유), 데스크톱은 오른쪽 서랍(제목·공유·X). 서킷 맵은 지금 화면(src/circuit-map)을 그대로 연다.
import { useEffect, useRef, useState } from 'react';
import './screens2.css';
import './detail2.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { useShell } from '../shell/context.js';
import { raceShareUrl } from '../share-link.js';
import { toggleAlarm, useAlarms } from '../alarm.js';
import { photo, photoPos, photoCredit } from '../home/photos.js';
import { curationOf } from '../home/curation.js';
import { getRaceState, getMainSessionAt, getSessionEnd, getLiveSession, getNextSession, getWeekendRange, isCancelled } from '../home/time.js';
import { getPrimarySession, getVisibleSessions, getRoundText, findNextRound } from '../schedule/utils.js';
import { offsetText, ticketOf } from '../detail-utils.js';
import { COUNTRY_OPTIONS, countryIdFromValue } from '../preferences-options.js';
import { useF1Results, resultOf, photoOf, teamColor } from '../results/results.js';
import { Avatar } from '../results/ResultsUI.jsx';
import { useCircuitMap, hasMap } from '../circuit-map/context.js';
import { MapEntryButton } from '../circuit-map/CircuitMap.jsx';
import { drawerWidth } from './drawer.js';
import { venueOfRace } from '../circuit-map/venues/index.js';
import { Icon } from '../ui2/Icon.jsx';
import { Dot, Band, ListHeader, LiveText, Progress, Roll, Photo, Seg, HeartBtn, CalBtn } from '../ui2/parts.jsx';
import { joinDot, SEP } from '../ui2/hooks.js';

const HOUR_MS = 3600000;
const clock = () => Date.now();   // 탭 이동 중 밑줄 잠금용(이벤트 처리기에서만 부른다)
const msOf = (v) => (v ? new Date(v).getTime() : null);
const cx = (...list) => list.filter(Boolean).join(' ');
const viewModeOf = (preferences, s) => (preferences?.series?.[s] === 'all' ? 'all' : 'race');
const reduceMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

// 세션의 현지 시각 '11월 21일 20:00' (서킷 현지 날짜·시각 그대로)
function localText(fmt, s) {
  const v = typeof s?.local === 'string' ? s.local : '';
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v) || !s.startUtc) return null;
  return `${fmt.plainDayRange(v.slice(0, 10), v.slice(0, 10))} ${v.slice(11, 16)}`;
}

// ---------- 핵심 블록 ----------
function KeyFact({ race, now, preferences }) {
  const fmt = useFormat(); const tr = useT();
  const st = getRaceState(race, now);
  const m = getMainSessionAt(race, now) || getPrimarySession(race);
  const ml = m ? fmt.sessionLabel(m) : fmt.sessionLabel({ tEn: 'Race', kind: 'race' });
  const st0 = msOf(m?.startUtc);
  const lt = localText(fmt, m);
  if (st === 'cancelled') {
    const { end } = getWeekendRange(race);
    const past = end && now > end.getTime();
    const range = race.weekendStart && race.weekendEnd ? fmt.plainDayRange(race.weekendStart, race.weekendEnd) : null;
    return <div className="gx-dkey"><b className="gx-t22">{tr('detail.cancelled.title')}</b><span className="gx-t15 gx-sub">{past ? (range ? tr('detail.cancelled.was', { range }) : tr('detail.cancelled.never')) : tr('detail.cancelled.future')}</span></div>;
  }
  if (st === 'live') {
    const end = getSessionEnd(race, m)?.getTime();
    const hasFinish = (race.sessions || []).some((s) => s.kind === 'finish' && s.startUtc);
    return (
      <div className="gx-dkey">
        <LiveText>{tr('status.liveLabel', { label: ml })}</LiveText>
        <b className="gx-t22"><Roll>{tr('detail.key.started', { time: fmt.time(st0), elapsed: fmt.elapsed(st0, now) })}</Roll></b>
        <Progress from={st0} to={end} now={now} label={tr('detail.progressAria', { label: ml })} />
        <span className="gx-t15 gx-sub"><Roll>{tr(hasFinish ? 'time.endsIn' : 'time.endsInEst', { d: fmt.duration(end - now) })}</Roll></span>
      </div>
    );
  }
  // 끝난 경기: '결승 · 끝났어요' + '… 시작'(아래 시각이 끝난 시각으로 읽히지 않게)
  if (st === 'done') {
    if (st0 == null) return <div className="gx-dkey"><span className="gx-t15 gx-sub">{tr('detail.key.done', { label: ml })}</span></div>;
    return <div className="gx-dkey"><span className="gx-t15 gx-sub">{tr('detail.key.done', { label: ml })}</span><b className="gx-t22">{tr('detail.key.startedAt', { datetime: fmt.dayDateTime(st0) })}</b><span className="gx-t15 gx-sub">{fmt.relDay(st0, now)}</span></div>;
  }
  if (st0 == null) return <div className="gx-dkey"><span className="gx-t15 gx-sub">{ml}</span><b className="gx-t22">{tr('detail.key.tba')}</b><span className="gx-t15 gx-sub">{tr('detail.key.tbaNote')}</span></div>;
  // 1시간 안: 카운트다운(큰 숫자는 여기만)
  if (st0 - now <= HOUR_MS) {
    return (
      <div className="gx-dkey">
        <span className="gx-t15 gx-sub">{tr('detail.key.countdown', { label: ml })}</span>
        <b className="gx-t40 gx-tnum" aria-label={tr('detail.key.countdownAria', { m: Math.ceil((st0 - now) / 60000) })}><Roll>{mmss(st0 - now)}</Roll></b>
        <span className="gx-t15 gx-sub">{joinDot([tr('detail.key.startedAt', { datetime: fmt.time(st0) }), lt ? tr('detail.local', { time: lt }) : null])}</span>
      </div>
    );
  }
  // 주말 진행 중: 맨 위에 지금(진행 중 세션) 또는 다음 세션 — 결승 라벨은 그대로 두고 따로 한 줄
  const mode = viewModeOf(preferences, race.series);
  const ls = getLiveSession(race, now, mode);
  const nx = !ls && getRaceState(race, now, mode) === 'weekend' ? getNextSession(race, now, mode) : null;
  return (
    <div className="gx-dkey">
      {ls && <span className="gx-dkey-now"><LiveText>{tr('detail.key.liveSession', { label: fmt.sessionLabel(ls), time: fmt.time(ls.startUtc) })}</LiveText></span>}
      {ls && <Progress from={ls.startUtc} to={getSessionEnd(race, ls)} now={now} label={tr('detail.progressAria', { label: fmt.sessionLabel(ls) })} />}
      {nx && nx !== m && <span className="gx-dkey-now gx-t15 gx-st-next"><Roll>{tr('detail.key.nextSession', { label: fmt.sessionLabel(nx), day: fmt.relDay(nx.startUtc, now), time: fmt.time(nx.startUtc), rel: fmt.relShort(nx.startUtc, now) })}</Roll></span>}
      <span className="gx-t15 gx-sub">{ml}</span>
      <b className="gx-t22">{fmt.dayDateTime(st0)}</b>
      <span className="gx-t15 gx-sub"><Roll>{lt ? tr('detail.key.relLocal', { rel: fmt.relShort(st0, now), local: lt }) : fmt.relShort(st0, now)}</Roll></span>
    </div>
  );
}

// ---------- 결과 ----------
function Results({ race, data }) {
  const tr = useT();
  const res = resultOf(data, race);
  const [kind, setKind] = useState('gp');
  const [all, setAll] = useState(false);
  if (!res) return null;
  const rows = (kind === 'sprint' && res.sprint) ? res.sprint : res.gp;
  const list = all ? rows : rows.slice(0, 10);
  const statusText = (x) => {
    if (x.time) return x.time;
    switch (x.status) {
      case 'Lapped': return tr('results.status.lapped', { laps: x.laps ?? '' });
      case 'Retired': return tr('results.status.retired', { laps: x.laps ?? '' });
      case 'Did not start': return tr('results.status.dns');
      case 'Disqualified': return tr('results.status.dsq');
      default: return x.status || '';
    }
  };
  return (
    <section aria-labelledby="gx-sec-res-h" id="gx-sec-res" className="gx-results">
      <div className="gx-lh">
        <div className="gx-lh-l"><h2 className="gx-t20" id="gx-sec-res-h">{tr('results.title')}</h2>{!res.sprint && <span className="gx-lh-sub gx-t15">{tr('results.gp')}</span>}</div>
        {res.sprint && <Seg label={tr('results.kindAria')} value={kind} options={[{ v: 'gp', l: tr('results.gp') }, { v: 'sprint', l: tr('results.sprint') }]}
          onChange={(k) => { setKind(k); setAll(false); track('race_results_kind_changed', { kind: k, race_id: race.id }); }} />}
      </div>
      {list.map((x) => {
        const p = +x.p;
        return (
          <div key={`${x.code}-${x.p}`} className={cx('gx-row gx-res-row', p <= 3 && 'is-podium')}>
            <span className={cx('gx-res-p', p <= 3 ? 'gx-t20' : 'gx-t17', !/^\d+$/.test(x.pt) && 'gx-ter')}>{x.pt}</span>
            <span className="gx-res-av"><Avatar src={photoOf(data, x.code)} code={x.code} size={40} /></span>
            <span className="gx-row-c">
              <span className="gx-t17 gx-res-name"><span className="gx-sub gx-t15 gx-given">{x.given}</span> <b className="gx-w600">{x.family}</b></span>
              <span className="gx-row-s gx-t13"><i className="gx-team-dot" style={{ background: x.c ? teamColor(x.c) : 'var(--text4)' }} />{x.team}</span>
            </span>
            <span className="gx-row-r gx-res-v">
              <span className={x.time ? 'gx-t15 gx-w600' : 'gx-t13 gx-ter'}>{statusText(x)}</span>
              <span className="gx-t13 gx-sub gx-res-pt">{x.pts && x.pts !== '0' ? tr('results.pts', { n: x.pts }) : ''}</span>
            </span>
          </div>
        );
      })}
      {rows.length > 10 && (
        <button type="button" className="gx-past-toggle gx-t15" aria-expanded={all} onClick={() => { if (!all) track('race_results_expanded', { kind, race_id: race.id }); setAll(!all); }}>
          <Icon n={all ? 'up' : 'down'} s={20} />{all ? tr('results.showLess') : tr('results.showAll', { n: rows.length })}
        </button>
      )}
    </section>
  );
}
// 결정 14: 결과 데이터가 없는 끝난 경기 — 결과 자리에 공식 사이트 한 줄
function ResultLink({ race }) {
  const tr = useT();
  return (
    <section aria-labelledby="gx-sec-res-h" id="gx-sec-res">
      <ListHeader id="gx-sec-res-h" title={tr('results.title')} />
      <a className="gx-row gx-link-row" href={race.officialUrl} target="_blank" rel="noopener noreferrer"
        onClick={() => track('official_site_clicked', { series: race.series, race_id: race.id, source: 'detail' })}>
        <span className="gx-row-c"><span className="gx-t17">{tr('results.officialLink')}</span></span>
        <span className="gx-row-r gx-row-r-mid"><Icon n="ext" s={20} className="gx-ter" /><span className="gx-vh">{tr('aria.external')}</span></span>
      </a>
    </section>
  );
}

// ---------- 중계 ----------
function Broadcast({ race }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const list = fmt.broadcast(race.broadcast);
  const cid = countryIdFromValue(fmt.country);
  const country = tr(COUNTRY_OPTIONS.find((c) => c.id === cid)?.label || 'country.OTHER');
  return (
    <section aria-labelledby="gx-sec-bc-h" id="gx-sec-bc">
      <ListHeader id="gx-sec-bc-h" title={tr('detail.broadcast')} sub={tr('detail.broadcast.basis', { country })} />
      {list.map((b) => (
        <a key={b.name} className="gx-row gx-bc-row" href={b.url || undefined} target="_blank" rel="noopener noreferrer"
          onClick={() => track('broadcast_clicked', { name: b.name, region: b.region, access: b.access, series: race.series, source: 'detail' })}>
          <span className="gx-bc-ic" aria-hidden="true"><Icon n="tv" s={22} /></span>
          <span className="gx-row-c"><span className="gx-t17 gx-w600">{b.name}</span>{b.access && <span className="gx-row-s gx-t13">{tr(`detail.access.${b.access}`)}</span>}</span>
          <span className="gx-row-r gx-row-r-mid"><span className="gx-t15 gx-sub">{tr('detail.watch')}</span><Icon n="ext" s={20} className="gx-ter" /><span className="gx-vh">{tr('aria.external')}</span></span>
        </a>
      ))}
      <div className="gx-dfoot">
        <span className="gx-t13 gx-ter">{tr('detail.broadcastNote')}</span>
        <button type="button" className="gx-textbtn gx-t15" onClick={() => shell.openSheet('country')}>{tr('detail.changeCountry')}<Icon n="chev" s={16} /></button>
      </div>
    </section>
  );
}

// ---------- 세션 일정 ----------
// 관심 수준대로(결승만이면 결승 + 체커기), 나머지는 '세션 N개 더 보기'. 끝난 세션이 둘 이상이면 접고(접기 줄에 다음 세션),
// 시각 미정은 맨 아래, 경기가 다 끝나면 미정 세션은 숨긴다.
function Sessions({ race, now, preferences }) {
  const fmt = useFormat(); const tr = useT();
  const mode = viewModeOf(preferences, race.series);
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const st = getRaceState(race, now);
  const over = st === 'done' || st === 'cancelled';
  const all = race.sessions || [];
  const pool = over ? all.filter((s) => s.startUtc) : all;
  const base = getVisibleSessions(race, mode).filter((s) => pool.includes(s));
  if (!pool.length) return null;
  const shownSet = open ? pool : base;
  const hidden = pool.length - base.length;
  const sstate = (s) => {
    const a = msOf(s.startUtc); if (a == null) return 'tba';
    const e = getSessionEnd(race, s)?.getTime();
    if (e != null && now >= e) return 'done';
    return now >= a ? 'live' : 'upcoming';
  };
  // '다음': 앞선 연습·예선 시각이 아직 안 나왔으면 단정하지 않는다
  const tbaBefore = all.some((s) => !s.startUtc && (s.kind === 'practice' || s.kind === 'qualifying'));
  const next = tbaBefore ? null : all.filter((s) => s.startUtc && msOf(s.startUtc) > now && s.kind !== 'finish').sort((a, b) => msOf(a.startUtc) - msOf(b.startUtc))[0];
  const doneN = over ? 0 : shownSet.filter((s) => sstate(s) === 'done').length;
  const fold = doneN >= 2 && !showDone;
  const shown = (fold ? shownSet.filter((s) => sstate(s) !== 'done') : shownSet).slice()
    .sort((a, b) => (a.startUtc == null) - (b.startUtc == null) || (msOf(a.startUtc) ?? 0) - (msOf(b.startUtc) ?? 0));
  const groups = [];
  shown.forEach((s) => {
    const k = s.startUtc ? fmt.dateKey(s.startUtc) : 'tba';
    let g = groups.find((x) => x.k === k);
    if (!g) { g = { k, s, items: [] }; groups.push(g); }
    g.items.push(s);
  });
  const nextHidden = !open && next && !base.includes(next);
  return (
    <section aria-labelledby="gx-sec-ses-h" id="gx-sec-ses">
      <ListHeader id="gx-sec-ses-h" title={tr('detail.sessions')} sub={tr('tz.basis', { zone: fmt.zoneLabel })} />
      {doneN >= 2 && (
        <button type="button" className="gx-past-toggle gx-t15" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
          <Icon n={showDone ? 'up' : 'down'} s={20} />{showDone ? tr('home.tl.hideDone') : tr('detail.sessions.showDone', { n: doneN })}
        </button>
      )}
      {groups.map((g) => {
        const head = g.s.startUtc ? fmt.dayHead(g.s.startUtc, now) : null;
        return (
          <div className="gx-ses-day" key={g.k}>
            <div className="gx-tl-dh">{head ? <><span className="gx-t15 gx-w600">{head.main}</span><span className="gx-t13 gx-ter">{head.sub}</span></> : <span className="gx-t15 gx-w600">{tr('detail.sessions.tba')}</span>}</div>
            {g.items.map((s, i) => {
              const ss = sstate(s); const lt = localText(fmt, s); const label = fmt.sessionLabel(s);
              return (
                // 홈 시간표와 같은 줄: 왼쪽 시각 · 가운데 세션(현지 시각) · 오른쪽 상태. 경기 전체가 끝났으면 '종료'를 반복하지 않고 흐리게만
                <div key={`${s.tEn}-${i}`} className={cx('gx-row gx-tl-row gx-ses-row', ss === 'done' && 'is-dim', ss === 'live' && 'is-live')}>
                  <span className="gx-tl-time"><b className="gx-t17">{s.startUtc ? fmt.time(s.startUtc) : tr('status.cancelledDate')}</b></span>
                  <span className="gx-row-c">
                    <span className={cx('gx-row-t gx-t17', s.kind === 'race' && 'gx-w600')}>{label}</span>
                    {lt && <span className="gx-row-s gx-t13">{tr('detail.local', { time: lt })}</span>}
                    {ss === 'live' && <Progress from={s.startUtc} to={getSessionEnd(race, s)} now={now} label={tr('detail.progressAria', { label })} />}
                  </span>
                  {(ss === 'live' || (ss === 'done' && !over) || s === next) && (
                    <span className="gx-row-r gx-t13">{ss === 'live' ? <LiveText /> : ss === 'done' ? <span className="gx-ter">{tr('status.done')}</span> : <span className="gx-st-next"><Roll>{tr('detail.sessions.next', { rel: fmt.relShort(s.startUtc, now) })}</Roll></span>}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {hidden > 0 && (
        <button type="button" className="gx-past-toggle gx-t15" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon n={open ? 'up' : 'down'} s={20} />{open ? tr('results.showLess') : <span>{tr('detail.sessions.more', { n: hidden })}{nextHidden && <span className="gx-sub gx-w500">{SEP}{tr('detail.sessions.nextHidden', { label: fmt.sessionLabel(next), time: fmt.time(next.startUtc) })}</span>}</span>}
        </button>
      )}
    </section>
  );
}

// ---------- 현장 / 관련 링크 ----------
function Venue({ race, now }) {
  const tr = useT(); const cm = useCircuitMap();
  const st = getRaceState(race, now);
  const alive = st !== 'done' && st !== 'cancelled';
  const map = !!cm && hasMap(race) && !isCancelled(race);
  const v = map ? venueOfRace(race) : null;
  const going = map && cm.attend.has(race.id);
  const start = msOf(getPrimarySession(race)?.startUtc);
  const ticket = ticketOf(race);
  const rows = [];
  if (map) rows.push(
    <MapEntryButton key="map" race={race} className="gx-row">
      <span className="gx-bc-ic"><Icon n="map" s={22} /></span>
      <span className="gx-row-c"><span className="gx-t17">{tr('cm.title')}</span><span className="gx-row-s gx-t13">{tr(v?.sub || 'cm.sub')}</span></span>
      <span className="gx-row-r"><Icon n="chev" s={20} className="gx-ter" /></span>
    </MapEntryButton>,
  );
  if (map && alive) rows.push(
    <button key="go" type="button" className="gx-row" role="switch" aria-checked={going} onClick={() => cm.toggleAttend(race)}>
      <span className="gx-bc-ic"><Icon n="flag" s={22} /></span>
      <span className="gx-row-c"><span className="gx-t17">{tr('cm.attend')}</span><span className="gx-row-s gx-t13">{tr('cm.attendNote')}</span></span>
      <span className={cx('gx-switch', going && 'is-on')} aria-hidden="true"><i /></span>
    </button>,
  );
  if (ticket && alive && start != null && now < start) rows.push(
    <a key="tk" className="gx-row" href={ticket} target="_blank" rel="noopener noreferrer" onClick={() => track('ticket_clicked', { series: race.series, race_id: race.id, source: 'detail' })}>
      <span className="gx-bc-ic"><Icon n="ticket" s={22} /></span>
      <span className="gx-row-c"><span className="gx-t17">{tr('detail.buyTickets')}</span><span className="gx-row-s gx-t13">{tr('detail.buyTickets.sub')}</span></span>
      <span className="gx-row-r"><Icon n="ext" s={20} className="gx-ter" /><span className="gx-vh">{tr('aria.external')}</span></span>
    </a>,
  );
  if (race.officialUrl) rows.push(
    <a key="of" className="gx-row" href={race.officialUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('official_site_clicked', { series: race.series, race_id: race.id, source: 'detail' })}>
      <span className="gx-bc-ic"><Icon n="globe" s={22} /></span>
      <span className="gx-row-c"><span className="gx-t17">{tr('detail.officialSite')}</span></span>
      <span className="gx-row-r"><Icon n="ext" s={20} className="gx-ter" /><span className="gx-vh">{tr('aria.external')}</span></span>
    </a>,
  );
  if (!rows.length) return null;
  return <><Band /><section aria-labelledby="gx-sec-ven-h" id="gx-sec-ven"><ListHeader id="gx-sec-ven-h" title={tr(map ? 'cm.section' : 'detail.links')} />{rows}</section></>;
}
const hasVenue = (race, cm) => !!race.officialUrl || !!ticketOf(race) || (!!cm && hasMap(race) && !isCancelled(race));

// ---------- 주말 정보 ----------
function Weekend({ race }) {
  const fmt = useFormat(); const tr = useT();
  const m = getPrimarySession(race);
  const lt = localText(fmt, m);
  const off = offsetText(race, fmt, tr);
  const range = race.weekendStart && race.weekendEnd ? fmt.plainDayRange(race.weekendStart, race.weekendEnd) : null;
  return (
    <><Band /><section aria-labelledby="gx-sec-wk-h" id="gx-sec-wk">
      <ListHeader id="gx-sec-wk-h" title={tr('detail.weekend')} />
      {range && <div className="gx-row gx-kv"><span className="gx-row-c gx-t17 gx-sub">{tr('detail.period')}</span><span className="gx-row-r gx-t15 gx-w600">{range}</span></div>}
      {lt && !isCancelled(race) && <div className="gx-row gx-kv"><span className="gx-row-c gx-t17 gx-sub">{tr('detail.mainLocal', { label: fmt.sessionLabel(m) })}</span><span className="gx-row-r gx-t15 gx-w600">{lt}</span></div>}
      {off && <div className="gx-row gx-kv"><span className="gx-row-c gx-t17 gx-sub">{tr('detail.offset')}</span><span className="gx-row-r gx-t15 gx-w600">{off}</span></div>}
    </section></>
  );
}

// ---------- 바로 가기 탭 ----------
// 누르면 그 섹션으로 + 섹션 제목에 포커스. 스크롤하면 밑줄이 따라오고, 끝까지 내렸을 때만 마지막 탭. 하나뿐이면 탭 줄 없음.
function DetailTabs({ items, scroller }) {
  const tr = useT();
  const [on, setOn] = useState(items[0]?.[0] ?? null);
  const nav = useRef(null); const lock = useRef(0);
  const key = items.map((x) => x[0]).join('|');
  useEffect(() => {
    const el = scroller.current; if (!el) return undefined;
    const spy = () => {
      if (lock.current > clock()) return;
      const line = (nav.current?.getBoundingClientRect().bottom ?? el.getBoundingClientRect().top + 100) + 16;
      let cur = items[0][0];
      items.forEach(([id]) => { const s = el.querySelector(`#${id}`); if (s && s.getBoundingClientRect().top <= line) cur = id; });
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) cur = items[items.length - 1][0];
      setOn(cur);
    };
    const end = () => { lock.current = 0; };
    el.addEventListener('scroll', spy, { passive: true }); el.addEventListener('scrollend', end);
    return () => { el.removeEventListener('scroll', spy); el.removeEventListener('scrollend', end); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (id) => {
    const el = scroller.current; const s = el?.querySelector(`#${id}`); if (!s) return;
    // 탭 줄이 아직 붙기 전이어도 붙은 뒤의 자리(위 막대 아래 + 탭 줄 높이)를 기준으로 잰다
    const navBottom = nav.current ? (parseFloat(getComputedStyle(nav.current).top) || 0) + nav.current.offsetHeight : 100;
    const off = s.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - navBottom;
    lock.current = clock() + 900; setOn(id);
    el.scrollTo({ top: off, behavior: reduceMotion() ? 'auto' : 'smooth' });
    const h = s.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  };
  if (items.length < 2) return null;
  return (
    <nav ref={nav} className="gx-dtabs" aria-label={tr('detail.tabs')} data-stick="">
      {items.map(([id, l]) => <button key={id} type="button" className={on === id ? 'is-on' : undefined} aria-current={on === id ? 'true' : undefined} onClick={() => go(id)}>{l}</button>)}
    </nav>
  );
}

// ---------- 아래 고정 바 ----------
function DetailBar({ race, now, preferences, favorites, toggleFav, races, onOpenRace }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const alarms = useAlarms();
  const vm = viewModeOf(preferences, race.series);
  const st = getRaceState(race, now, vm);
  const bc = fmt.broadcast(race.broadcast);
  const fav = favorites.has(race.id);
  const L = fmt.race(race);
  // 결정 2: 진행 중이거나 다음 보는 세션이 1시간 안이면 중계, 그 전에는 캘린더
  const nx = getNextSession(race, now, vm);
  const urgent = st === 'live' || st === 'session' || (nx && msOf(nx.startUtc) - now <= HOUR_MS);
  let primary = null; let note = null;
  if (st === 'cancelled') note = tr(fav ? 'detail.note.savedCancelled' : 'detail.note.saveCancelled');
  else if (urgent && bc[0]?.url) {
    const b = bc[0];
    primary = <a className="gx-btn is-primary is-grow" href={b.url} target="_blank" rel="noopener noreferrer"
      onClick={() => track('broadcast_clicked', { name: b.name, region: b.region, access: b.access, series: race.series, source: 'detail' })}>{tr('home.watchOn', { channel: b.name })}<span className="gx-vh">, {tr('aria.external')}</span></a>;
  } else if (st === 'done') {
    // L12: 같은 선수권의 다음 경기(취소 제외). GTWC는 championship으로 나눈다
    const nr = findNextRound(race, races);
    if (nr) primary = <button type="button" className="gx-btn is-weak is-grow" onClick={() => onOpenRace(nr, 'detail')}><span className="gx-ell">{tr('detail.nextRound', { name: fmt.race(nr).shortName })}</span></button>;
    else note = tr('detail.note.lastRace');
  } else if ((race.sessions || []).some((s) => s.startUtc)) {
    // 결정 3: 담은 뒤 '✓ 캘린더에 담았어요' 고정, 다시 누르면 같은 파일 다시 받기
    primary = <CalBtn on={alarms.has(race.id)} onClick={() => { const res = toggleAlarm(race, { source: 'detail', preferences, locale: fmt.locale, now: new Date(now) }); shell.toast(tr(res?.again ? 'toast.calAgain' : 'toast.calAdded')); }} />;
  } else note = tr('home.alertTba');
  const onFav = () => {
    toggleFav(race.id);
    shell.toast(tr(fav ? 'toast.unsaved' : 'toast.saved'), { label: tr('toast.undo'), fn: () => toggleFav(race.id) });
  };
  return (
    <div className="gx-dbar">
      <HeartBtn on={fav} onClick={onFav} label={tr('aria.saveRace', { name: L.shortName })} />
      {primary || <span className="gx-dbar-note gx-t15 gx-sub">{note}</span>}
    </div>
  );
}

// ---------- 상세 ----------
export function RaceDetailV2({ race, now, preferences, favorites, toggleFav, races = [], onOpenRace, onClose, inDrawer = false }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell(); const cm = useCircuitMap();
  const at = new Date(now).getTime();
  const data = useF1Results(race?.series === 'F1');
  const ref = useRef(null);
  const [solid, setSolid] = useState(false); const [titled, setTitled] = useState(false);
  // 위 막대: 사진이 지나가면 채움, 제목은 큰 제목이 지나간 뒤. 처음에는 제목(h1)으로 포커스
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    el.scrollTop = 0;
    const onScroll = () => {
      const bar = 56; const ph = el.querySelector('.gx-dphoto')?.offsetHeight || 180; const h1 = el.querySelector('.gx-dhead h1');
      setSolid(el.scrollTop > ph - bar);
      setTitled(h1 ? h1.getBoundingClientRect().bottom < el.getBoundingClientRect().top + bar : el.scrollTop > ph);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const f = setTimeout(() => { if (!el.contains(document.activeElement) || document.activeElement === el) el.querySelector('.gx-dhead h1')?.focus({ preventScroll: true }); }, 80);
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(f); };
  }, [race?.id]);
  const L = fmt.race(race);
  // 공유: navigator.share가 있으면 시트, 없으면 클립보드 복사 후 스낵바. 클립보드까지 막혔으면 주소를 스낵바에
  const share = async () => {
    const url = raceShareUrl(race); if (!url) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: L.name, url }); track('race_shared', { series: race.series, method: 'native' }); } catch { /* 사용자가 취소했다 */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); track('race_shared', { series: race.series, method: 'copy' }); shell.toast(tr('toast.linkCopied')); }
    catch { shell.toast(url); }
  };
  const st = getRaceState(race, at);
  const done = st === 'done'; const cancelled = st === 'cancelled';
  // 결과는 끝난 경기에서만(데모 시계로 과거에 있을 때 미래 결과가 보이지 않게)
  const showResults = done && !!resultOf(data, race);
  const cur = curationOf(race, fmt.locale);
  const credit = photoCredit(race);
  const hasSessions = (race.sessions || []).length > 0;
  const items = [
    showResults || (done && race.officialUrl) ? ['gx-sec-res', tr('detail.tab.result')] : null,
    ...(cancelled ? [hasSessions ? ['gx-sec-ses', tr('detail.tab.sessions')] : null]
      : done ? [hasSessions ? ['gx-sec-ses', tr('detail.tab.sessions')] : null, ['gx-sec-bc', tr('detail.tab.watch')]]
        : [['gx-sec-bc', tr('detail.tab.watch')], hasSessions ? ['gx-sec-ses', tr('detail.tab.sessions')] : null]),
    hasVenue(race, cm) ? ['gx-sec-ven', tr(cm && hasMap(race) && !isCancelled(race) ? 'detail.tab.site' : 'detail.tab.links')] : null,
    ['gx-sec-wk', tr('detail.tab.info')],
  ].filter(Boolean);
  return (
    <div className={cx('gx-detail', inDrawer && 'is-drawer')} ref={ref}>
      {inDrawer ? (
        <div className={cx('gx-dtop', solid && 'is-solid')}>
          <span className={cx('gx-dtop-title gx-t17 gx-w600 is-left', titled && 'is-on')} aria-hidden={!titled}>{L.shortName}</span>
          <button type="button" className="gx-iconbtn gx-round" aria-label={tr('aria.shareRace', { name: L.shortName })} onClick={share}><Icon n="share" /></button>
          <button type="button" className="gx-iconbtn gx-round" aria-label={tr('aria.close')} onClick={onClose}><Icon n="close" /></button>
        </div>
      ) : (
        <div className={cx('gx-dtop', solid && 'is-solid')}>
          <button type="button" className="gx-iconbtn gx-round" aria-label={tr('aria.back')} onClick={onClose}><Icon n="back" /></button>
          <span className={cx('gx-dtop-title gx-t17 gx-w600', titled && 'is-on')} aria-hidden={!titled}>{L.shortName}</span>
          <button type="button" className="gx-iconbtn gx-round" aria-label={tr('aria.shareRace', { name: L.shortName })} onClick={share}><Icon n="share" /></button>
        </div>
      )}
      {/* 사진 출처는 사진 안 오른쪽 아래에 연하게(시리즈 히어로와 같은 10px) */}
      <div className="gx-dphoto">
        <Photo src={photo(race, inDrawer ? 'hero' : 'card')} pos={photoPos(race)} eager />
        {credit && <a className="gx-dcredit" href={credit.url} target="_blank" rel="noopener noreferrer" aria-label={`${tr('photo.credit', credit)}. ${tr('aria.external')}`}>{tr('photo.credit', credit)}</a>}
      </div>
      <div className="gx-dhead">
        <span className="gx-stag gx-t13"><Dot series={race.series} />{joinDot([race.series, getRoundText(race, fmt.locale), race.isSprint ? tr('home.sprintWeekend') : null])}</span>
        <h1 className={cx('gx-t26', cancelled && 'gx-strike')} tabIndex={-1} data-view-title>{L.fullName}</h1>
        <span className="gx-t15 gx-sub">{joinDot([L.circuit, [L.city, L.country].filter(Boolean).join(', ')])}</span>
      </div>
      <KeyFact race={race} now={at} preferences={preferences} />
      {cur && !done && <p className="gx-cur gx-t15 gx-dcur"><span className="gx-badge">{tr('home.curation')}</span>{cur.text}</p>}
      <DetailTabs items={items} scroller={ref} />
      {showResults && <><Band /><Results race={race} data={data} /></>}
      {!showResults && done && race.officialUrl && <><Band /><ResultLink race={race} /></>}
      {!done && !cancelled && <><Band /><Broadcast race={race} /></>}
      {hasSessions && <><Band /><Sessions race={race} now={at} preferences={preferences} /></>}
      {done && <><Band /><Broadcast race={race} /></>}
      <Venue race={race} now={at} />
      <Weekend race={race} />
      <div className="gx-dspace" />
      <DetailBar race={race} now={at} preferences={preferences} favorites={favorites} toggleFav={toggleFav} races={races} onOpenRace={onOpenRace} />
    </div>
  );
}

// 데스크톱 서랍: 오른쪽 패널(폭 440/480/560) + 바깥 어둠. X는 한 단계 뒤로(Esc와 같다), 바깥을 누르면 서랍을 닫는다.
// 들고 나는 움직임은 index.css drawer-* 그대로
export function DetailDrawer({ tier, closing, onExitEnd, onClose, onDismiss, ...props }) {
  const fmt = useFormat();
  const width = drawerWidth(tier);
  return (
    <div className={cx('drawer-root', closing && 'closing')} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end' }}>
      <div className="drawer-backdrop" onClick={onDismiss || onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <aside className="drawer-panel gx-drawer-panel" role="dialog" aria-modal="true" aria-label={fmt.race(props.race).name} onAnimationEnd={closing ? onExitEnd : undefined}
        style={{ position: 'relative', width, maxWidth: '100vw', height: '100vh', background: 'var(--bg)' }}>
        <RaceDetailV2 {...props} onClose={onClose} inDrawer />
      </aside>
    </div>
  );
}
