// 홈 — 반응형 단일 컴포넌트. 레이아웃 분기는 home.css의 900px 미디어쿼리가 한다.
// 규칙·판정은 design/HOME-SPEC.md, 픽셀·여백·타이포·색은 design/paddock-home.html을 따른다.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './home.css';
import { adaptRaces } from './adapt.js';
import { resolveTimeState, formatCountdown } from './time.js';
import { getRaceWeekKey, groupRacesByWeekend } from './weeks.js';
import { photo, photoPos, photoCredit } from './photos.js';
import { SERIES_DESCRIPTION_KEYS } from '../preferences-options.js';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { zonedDateFromKey } from '../schedule/format.js';
import { scoreRace } from '../schedule/recommendations.js';
import { track } from '../analytics.js';

const ORDER = ['F1', 'WEC', 'IMSA', 'GTWC', 'WRC'];
const SERIES_VAR = { F1: '--f1', WEC: '--wec', IMSA: '--imsa', WRC: '--wrc', GTWC: '--gtwc' };
const ALERTS_KEY = 'paddock.alerts';

// ---------- 작은 순수 헬퍼 ----------
const modeOf = (preferences, series) => preferences?.series?.[series] || 'off';
const interestOf = (preferences, series) => ({ all: 2, race: 1 }[modeOf(preferences, series)] || 0);
const isAlive = (state) => state !== 'done' && state !== 'cancelled';
// 행·카드의 기준 시각: 시작 시각(UTC). 없으면 서킷 현지 주말 마지막 날 정오(이벤트 고유 정보라 race.timezone으로).
const dateOf = (ev) => (ev.startUtc ? new Date(ev.startUtc) : zonedDateFromKey(ev.weekendEnd, '12:00', ev.timezone || 'UTC'));
const sameMinute = (a, b) => Math.floor(new Date(a).getTime() / 60000) === Math.floor(new Date(b).getTime() / 60000);

function josa(word, withBatchim, noBatchim) {
  const s = String(word || '');
  const c = s.charCodeAt(s.length - 1);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return noBatchim;
  return (c - 0xac00) % 28 ? withBatchim : noBatchim;
}

function roundText(ev) {
  if (ev.label && !ev.round) return String(ev.label).toUpperCase();
  const r = ev.round || ev.plannedRound;
  return r ? `R${String(r).padStart(2, '0')}` : 'EVENT';
}

// 시청자 시간대 기준 '09.26' / '토' — format.getParts에서 직접 (문자열 슬라이싱 금지)
const md = (fmt, date) => fmt.monthDayShort(date);                 // '09.26' / en 'Sep 26'
const dow = (fmt, date) => fmt.parts(date)?.weekdayName || '';
// 리스트 행 요일: ko '토' / en '(Sat)' — 영어는 'Oct 3 (Sat)' 꼴
const dowInList = (fmt, date) => { const w = dow(fmt, date); return fmt.locale === 'ko' ? w : `(${w})`; };

function heroReason(ev, ts, kind, now, fmt, t) {
  if (kind === 'live') return { text: t('home.reason.live'), urgent: true };
  if (kind === 'soon') {
    const ms = ts.start - now; const h = Math.floor(ms / 3600000); const m = Math.max(1, Math.round((ms % 3600000) / 60000));
    return { text: `${fmt.isNight(ts.start) ? t('home.tonight') : t('home.today')} · ${h >= 1 ? t('home.startsInHours', { h }) : t('home.startsInMinutes', { m })}`, urgent: true };
  }
  if (kind === 'today') return { text: t('home.reason.today'), urgent: false };
  // D-day: 시작 시각이 있으면 시청자 시간대의 날짜 차이, 없으면 서킷 현지 주말 마지막 날 기준
  const ref = ts.start || zonedDateFromKey(ev.weekendEnd, '12:00', ev.timezone || 'UTC');
  const d = Math.max(0, fmt.dayDiff(ref, now) ?? 0);
  return { text: t('home.reason.weekend', { d }), urgent: false };
}

function heroClock(ev, ts, kind, fmt, t) {
  const st = ts.start;
  if (kind === 'live') return { big: 'LIVE', urgent: true, sub: t('home.clock.live') };
  if (kind === 'soon') return { big: null, countdown: st, urgent: true, sub: `${fmt.shortDateTime(st)}${fmt.isNight(st) ? ` · ${t('home.night')}` : ''}` };
  // 주말 기간은 이벤트 고유 정보 — 서킷 현지 날짜 그대로
  if (kind === 'today' || !st) return { big: `${fmt.plainMonthDay(ev.weekendStart)} – ${fmt.plainMonthDay(ev.weekendEnd)}`, urgent: false, sub: t('home.clock.tba') };
  return { big: md(fmt, st), urgent: false, sub: `${t('home.weekdayTime', { weekday: dow(fmt, st), time: fmt.time(st) })}${fmt.isNight(st) ? ` · ${t('home.night')}` : ''}` };
}

function readAlerts() {
  try { return new Set(JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]')); } catch { return new Set(); }
}

// ---------- 1초 단위로 자기 DOM만 갱신하는 조각 (홈 전체 리렌더 없음) ----------
function Clock() {
  const fmt = useFormat();
  const ref = useRef(null);
  useEffect(() => {
    const tick = () => { if (ref.current) ref.current.textContent = fmt.time(new Date()); };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [fmt]);
  return <b ref={ref} />;
}

function Countdown({ target, onExpire }) {
  const ref = useRef(null);
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (ref.current) ref.current.textContent = formatCountdown(diff);
      if (diff <= 0) onExpire?.();
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [target, onExpire]);
  return <span ref={ref} />;
}

// ---------- 표시 조각 ----------
function Icon({ name, size = 17 }) {
  const paths = {
    sliders: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
    moon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />,
    heart: <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function SeriesBadge({ series }) {
  return <span className="sbadge"><i style={{ background: `var(${SERIES_VAR[series]})` }} />{series}</span>;
}

function TimeStat({ ts, dateless }) {
  const fmt = useFormat();
  const t = useT();
  const { state, start } = ts;
  if (state === 'cancelled') return <span className="time time--cancelled">{t('time.cancelled')}</span>;
  if (state === 'live') return <span className="time time--live">LIVE</span>;
  if (state === 'tba') return <span className="time time--tba">{t('time.tba')}</span>;
  if (state === 'done') return <span className="time time--done">{t('time.done')}</span>;
  return (
    <span className={`time${state === 'soon' ? ' time--soon' : ''}`}>
      {fmt.isNight(start) && <span className="nightmark">{t('home.night')}</span>}
      {dateless ? '' : `${fmt.shortDate(start)} `}{fmt.time(start)}
    </span>
  );
}

function Card2({ ev, ts, onOpen, small }) {
  const fmt = useFormat();
  return (
    <button type="button" className="card2" style={small ? undefined : { marginTop: 0 }} onClick={() => onOpen(ev.race)}>
      <span className="ind" style={{ background: `var(${SERIES_VAR[ev.series]})` }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SeriesBadge series={ev.series} /><span className="rnd">{roundText(ev)}</span></span>
        <span className="ttl ko" style={{ display: 'block', fontSize: small ? 14 : undefined }}>{ev.displayName}</span>
        <span className="sub ko" style={{ display: 'block' }}>
          {small
            ? `${ev.city || ''} · ${fmt.plainShortDate(ev.weekendStart)} — ${fmt.plainShortDate(ev.weekendEnd)}`
            : ev.circuit || ''}
        </span>
      </span>
      {!small && (
        <span className="side">
          <TimeStat ts={ts} />
          <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>{fmt.broadcast(ev.broadcast)[0]?.name || ''}</span>
        </span>
      )}
    </button>
  );
}

function Row({ ev, ts, dim, onOpen }) {
  const fmt = useFormat();
  const d = dateOf(ev);
  return (
    <button type="button" className={`rowitem${dim ? ' dim' : ''}`} onClick={() => onOpen(ev.race)}>
      <span className="dt">{md(fmt, d)} <em>{dowInList(fmt, d)}</em></span>
      <span className="ind" style={{ background: `var(${SERIES_VAR[ev.series]})` }} />
      <span className="nm ko">{ev.displayName}</span>
      <span className="side"><span className="rd">{ev.series} {roundText(ev)}</span><TimeStat ts={ts} dateless /></span>
    </button>
  );
}

// ---------- 홈 본체 ----------
function HomeView({ theme, setTheme, now, races, myRaces, preferences, favorites, toggleFav, onOpenRace, onGo, setSeriesMode }) {
  const [alerts, setAlerts] = useState(readAlerts);
  const [, setExpiredTick] = useState(0);
  const onExpire = useCallback(() => setExpiredTick((n) => n + 1), []);
  useEffect(() => { try { localStorage.setItem(ALERTS_KEY, JSON.stringify([...alerts])); } catch { /* ignore */ } }, [alerts]);
  const toggleAlert = (id) => setAlerts((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const fmt = useFormat();
  const t = useT();
  const at = useMemo(() => (now instanceof Date ? now : new Date(now)), [now]);

  // 관심 경기(myRaces)와 전체(races)를 홈 형태로. 시간 상태는 한 번만 계산해 id로 찾는다.
  const mine = useMemo(() => adaptRaces(myRaces || [], preferences, fmt.locale), [myRaces, preferences, fmt.locale]);
  const all = useMemo(() => adaptRaces(races || [], preferences, fmt.locale), [races, preferences, fmt.locale]);
  const stateOf = useMemo(() => {
    const map = new Map();
    for (const ev of all) map.set(ev.id, resolveTimeState(ev.race, at, { timeZone: fmt.timeZone }));
    return map;
  }, [all, at, fmt.timeZone]);
  const ts = (ev) => stateOf.get(ev.id) || resolveTimeState(ev.race, at, { timeZone: fmt.timeZone });
  const interest = (ev) => interestOf(preferences, ev.series);

  // --- 히어로 한 자리. 무엇이 들어갈지는 긴급도가 정한다 (스펙 4장). ---
  let hero = null; let kind = null; let heroWeek = null;
  const live = mine.filter((ev) => ts(ev).state === 'live');
  const soon = mine.filter((ev) => ts(ev).state === 'soon').sort((a, b) => ts(a).start - ts(b).start);
  const todayTba = mine.filter((ev) => { const s = ts(ev); return s.state === 'tba' && s.weekendStart && s.weekendEnd && s.weekendStart <= at && at <= s.weekendEnd; });
  if (live.length) { hero = live[0]; kind = 'live'; }
  else if (soon.length) { hero = soon[0]; kind = 'soon'; }
  else if (todayTba.length) { hero = todayTba[0]; kind = 'today'; }
  const weekGroups = groupRacesByWeekend(mine);
  if (!hero) {
    for (const group of weekGroups) {
      const cand = group.races.filter((ev) => isAlive(ts(ev).state));
      if (!cand.length) continue;
      cand.sort((a, b) => {
        if (interest(b) !== interest(a)) return interest(b) - interest(a);           // 관심 수준 내림차순 (all > race)
        const as = ts(a).start ? 0 : 1; const bs = ts(b).start ? 0 : 1;
        if (as !== bs) return as - bs;                                                 // 시각 확정 우선
        return ORDER.indexOf(a.series) - ORDER.indexOf(b.series);                      // 시리즈 순서
      });
      hero = cand[0]; heroWeek = group.weekKey; kind = 'weekend'; break;
    }
  }
  const used = new Set();
  if (hero) { used.add(hero.id); heroWeek = heroWeek || getRaceWeekKey(hero); }

  // --- 같은 주말 ---
  const mates = (weekGroups.find((g) => g.weekKey === heroWeek)?.races || []).filter((ev) => !used.has(ev.id) && isAlive(ts(ev).state));
  mates.forEach((ev) => used.add(ev.id));

  // --- 이후 일정 (관심 경기, 최대 7) ---
  const later = mine.filter((ev) => !used.has(ev.id) && isAlive(ts(ev).state)).slice(0, 7);

  // --- 새로 볼만한 것: 관심이 꺼진 시리즈 중 가장 가까운 경기 ---
  const mineIds = new Set(mine.map((ev) => ev.id));
  let disc = null; let discSeries = null;
  for (const s of ORDER) {
    if (modeOf(preferences, s) !== 'off') continue;
    const found = all.find((ev) => ev.series === s && !mineIds.has(ev.id) && isAlive(ts(ev).state));
    if (found) { disc = found; discSeries = s; break; }
  }

  const watching = ORDER.filter((s) => modeOf(preferences, s) !== 'off').length;

  // 계측: 발견 카드 노출은 카드가 바뀔 때만 1회. 클릭은 열기 콜백에서.
  const discId = disc?.id ?? null;
  const shownRef = useRef(null);
  useEffect(() => {
    if (!disc || shownRef.current === discId) return;
    shownRef.current = discId;
    track('recommendation_shown', { series: disc.series, reason_kinds: scoreRace(disc.race, preferences, at).kinds });
  }, [discId]); // eslint-disable-line react-hooks/exhaustive-deps
  const openDiscover = (race) => { track('recommendation_clicked', { series: race.series, position: 0 }); onOpenRace(race, 'recommendation'); };

  return (
    <div className="home">
      <div className="pagehead">
        <div>
          <h1 className="ko">{t('home.title')}</h1>
          <div className="sub ko">{t('home.watching', { count: watching })}</div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <span className="clock m">{fmt.zoneLabel} <Clock /></span>
          <div className="mobtools">
            <button type="button" className="iconbtn" aria-label={t('nav.settings')} onClick={() => onGo('settings')}><Icon name="sliders" /></button>
            <button type="button" className="iconbtn" aria-label={t('theme.toggle')} onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
          </div>
        </div>
      </div>

      {hero ? (() => {
        const hts = ts(hero);
        const reason = heroReason(hero, hts, kind, at, fmt, t);
        const clock = heroClock(hero, hts, kind, fmt, t);
        const bcast = fmt.broadcast(hero.broadcast);
        const chans = bcast.map((b) => b.name);
        const urgent = kind === 'live' || kind === 'soon';
        const faved = favorites?.has(hero.id);
        const alertOn = alerts.has(hero.id);
        return (
          <section className="hero2">
            <div className="hero2-photo" style={{ backgroundImage: `url(${photo(hero, 1600)})`, backgroundPosition: photoPos(hero) }} />
            <div className="hero2-tint" style={{ background: `var(${SERIES_VAR[hero.series]})` }} />
            <span className="hero2-credit">PHOTO · {photoCredit(hero)}</span>
            <div className="hero2-wrap">
              <div className="hero2-left">
                <span className={`hero2-reason${reason.urgent ? '' : ' calm'}`}>{reason.urgent && <i />}{reason.text}</span>
                <div className="hero2-meta">
                  <SeriesBadge series={hero.series} /><span className="rnd">{roundText(hero)}</span>
                  {hero.isSprint && <span className="tagpill">{t('home.sprintWeekend')}</span>}
                </div>
                <h2 className="hero2-title ko">{hero.fullName || hero.displayName}</h2>
                {hero.officialName && hero.officialName !== (hero.fullName || hero.displayName) && <div className="hero2-official">{hero.officialName}</div>}
                <div className="hero2-place ko">{hero.circuit || ''}{hero.city ? ` · ${hero.city}` : ''}{hero.country ? `, ${hero.country}` : ''}</div>
              </div>
              <div className="hero2-right">
                <div className={`hero2-clock${clock.urgent ? ' urgent' : ''}`}>
                  {clock.countdown ? <Countdown target={clock.countdown} onExpire={onExpire} /> : clock.big}
                </div>
                <div className="hero2-when ko">{clock.sub}</div>
                <div className="hero2-act">
                  {urgent && chans.length
                    ? <button type="button" className="cta" onClick={() => { track('broadcast_clicked', { name: bcast[0].name, region: bcast[0].region }); onOpenRace(hero.race); }}>{t('home.watchOn', { channel: chans[0] })}</button>
                    : <button type="button" className="cta" onClick={() => toggleAlert(hero.id)}>{alertOn ? t('home.alertOn') : t('home.alertSet')}</button>}
                  <button type="button" className={`heart${faved ? ' on' : ''}`} aria-label={t('aria.save')} onClick={() => toggleFav?.(hero.id)}>
                    {faved
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                      : <Icon name="heart" size={16} />}
                  </button>
                  <button type="button" className="linkbtn" onClick={() => onOpenRace(hero.race)}>{t('home.detail')}</button>
                </div>
                {chans.length > 0 && <div className="hero2-chans">{chans.join(' · ')}</div>}
              </div>
            </div>
          </section>
        );
      })() : (
        <div className="empty">
          <h3 className="ko">{t('home.empty.title')}</h3>
          <p className="ko">{t('home.empty.body')}</p>
          <button type="button" className="cta ghost" style={{ maxWidth: 220, margin: '14px auto 0' }} onClick={() => onGo('schedule')}>{t('home.empty.cta')}</button>
        </div>
      )}

      {mates.length > 0 && (
        <>
          <div className="sechead"><h2 className="ko">{t('home.sameWeekend')}</h2><span className="meta">{t('home.raceCount', { n: mates.length })}</span></div>
          {mates.map((ev) => <Card2 key={ev.id} ev={ev} ts={ts(ev)} onOpen={onOpenRace} />)}
        </>
      )}

      {later.length > 0 && (
        <>
          <div className="sechead"><h2 className="ko">{t('home.upNext')}</h2><button type="button" className="lnk" onClick={() => onGo('schedule')}>{t('schedule.viewAll')}</button></div>
          <div className="rows">
            {later.map((ev) => <Row key={ev.id} ev={ev} ts={ts(ev)} dim={interest(ev) === 0} onOpen={onOpenRace} />)}
          </div>
        </>
      )}

      {disc && (
        <>
          <div className="sechead"><h2 className="ko">{t('home.discover')}</h2></div>
          <div className="panel">
            <h3 className="ko">{t('home.discover.title', { name: t(`series.${discSeries}.name`), josa: josa(t(`series.${discSeries}.name`), '은', '는') })}</h3>
            <p className="ko">{t('home.discover.body', { desc: t(SERIES_DESCRIPTION_KEYS[discSeries]) })}</p>
            <Card2 ev={disc} ts={ts(disc)} onOpen={openDiscover} small />
            <button type="button" className="cta ghost" style={{ marginTop: 11 }} onClick={() => { track('series_mode_changed', { series: discSeries, from: modeOf(preferences, discSeries), to: 'race' }); setSeriesMode?.(discSeries, 'race'); }}>{t('home.discover.add', { series: discSeries })}</button>
          </div>
        </>
      )}
    </div>
  );
}

// App의 1초 setNow로 홈이 통째로 리렌더되지 않도록 now는 분 단위로만 비교한다 (스펙 5장).
// 초 단위 갱신은 KstClock/Countdown이 자기 DOM만 손댄다.
export const Home = memo(HomeView, (prev, next) => {
  for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (key === 'now') { if (!sameMinute(prev.now, next.now)) return false; continue; }
    if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
});
