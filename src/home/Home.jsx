// 홈 — 반응형 단일 컴포넌트. 레이아웃 분기는 home.css의 900px 미디어쿼리가 한다.
// 규칙·판정은 design/HOME-SPEC.md, 픽셀·여백·타이포·색은 design/paddock-home.html을 따른다.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './home.css';
import { LightRow } from '../Brand.jsx';
import { adaptRaces } from './adapt.js';
import { resolveTimeState, resolveWeekendPhase, formatCountdown } from './time.js';
import { getRaceWeekKey, groupRacesByWeekend } from './weeks.js';
import { photo, photoPos, photoCredit } from './photos.js';
import { SERIES_DESCRIPTION_KEYS } from '../preferences-options.js';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { zonedDateFromKey } from '../schedule/format.js';
import { formatSessionLabel } from '../schedule/utils.js';
import { getRecommendations } from '../schedule/recommendations.js';
import { track } from '../analytics.js';
import { prefetchRacePhoto, prefetchHandlers, useVisiblePrefetch } from '../photo-prefetch.js';
import { GantryLockup } from '../Brand.jsx';
import { usePop, useImageLoaded } from '../use-motion.js';
import { storage } from '../storage/index.js';

const ORDER = ['F1', 'WEC', 'IMSA', 'GTWC', 'WRC'];
const SERIES_VAR = { F1: '--f1', WEC: '--wec', IMSA: '--imsa', WRC: '--wrc', GTWC: '--gtwc' };

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

function heroReason(ev, ts, kind, now, fmt, t, phase) {
  // 주말 진행 상황이 먼저다. 본경기 시작 시각만 보면 연습·예선이 달리는 중에도 'D-2'가 뜬다.
  // 'before'/'after'는 아래 기존 판정(D-day 등)으로 그대로 넘긴다.
  // 정규화된 세션의 라벨 필드는 tEn이다 (normalizeSessions). 원본 JSON의 t도 같이 받아둔다.
  const label = phase?.session ? formatSessionLabel(phase.session.tEn ?? phase.session.t, phase.session.kind, fmt.locale) : '';
  if (label && phase.phase === 'session-live') {
    return { text: t('home.reason.sessionLive', { session: label }), urgent: true, lit: 0 };
  }
  if (label && phase.phase === 'session-soon') {
    const ms = Math.max(0, phase.startsInMs ?? 0);
    const h = Math.floor(ms / 3600000);
    const m = Math.max(1, Math.round(ms / 60000));
    return {
      text: h >= 1 ? t('home.reason.sessionSoonHours', { session: label, h }) : t('home.reason.sessionSoonMinutes', { session: label, m }),
      urgent: true, lit: 5,
    };
  }
  if (label && phase.phase === 'between') {
    // 시각은 전부 시청자 시간대. ko는 '25(금)', en은 'Sep 25 (Fri)' — 오늘이어도 날짜를 그대로 붙인다.
    const next = new Date(phase.session.startUtc);
    const p = fmt.parts(next);
    const when = fmt.locale === 'ko' && p
      ? `${Number(p.day)}(${p.weekdayName}) ${fmt.time(next)}`
      : `${fmt.shortDate(next)} ${fmt.time(next)}`;
    return { text: t('home.reason.nextSession', { session: label, when }), urgent: false, lit: 5 };
  }
  // 라이트 로우: 갠트리 신호등처럼 레이스가 가까워질수록 하나씩 켜진다. 진행 중이면 전부 꺼진다(= lights out).
  if (kind === 'live') return { text: t('home.reason.live'), urgent: true, lit: 0 };
  if (kind === 'soon') {
    const ms = ts.start - now; const h = Math.floor(ms / 3600000); const m = Math.max(1, Math.round((ms % 3600000) / 60000));
    return { text: `${fmt.isNight(ts.start) ? t('home.tonight') : t('home.today')} · ${h >= 1 ? t('home.startsInHours', { h }) : t('home.startsInMinutes', { m })}`, urgent: true, lit: 5 };
  }
  if (kind === 'today') return { text: t('home.reason.today'), urgent: false, lit: 5 };
  // D-day: 시작 시각이 있으면 시청자 시간대의 날짜 차이, 없으면 서킷 현지 주말 마지막 날 기준
  const ref = ts.start || zonedDateFromKey(ev.weekendEnd, '12:00', ev.timezone || 'UTC');
  const d = Math.max(0, fmt.dayDiff(ref, now) ?? 0);
  return { text: t('home.reason.weekend', { d }), urgent: false, lit: Math.max(0, Math.min(5, 5 - d)) };
}

function heroClock(ev, ts, kind, fmt, t) {
  const st = ts.start;
  if (kind === 'live') return { big: 'LIVE', urgent: true, sub: t('home.clock.live') };
  if (kind === 'soon') return { big: null, countdown: st, urgent: true, sub: `${fmt.shortDateTime(st)}${fmt.isNight(st) ? ` · ${t('home.night')}` : ''}` };
  // 주말 기간은 이벤트 고유 정보 — 서킷 현지 날짜 그대로
  if (kind === 'today' || !st) return { big: `${fmt.plainMonthDay(ev.weekendStart)} – ${fmt.plainMonthDay(ev.weekendEnd)}`, urgent: false, sub: t('home.clock.tba') };
  return { big: md(fmt, st), urgent: false, sub: `${t('home.weekdayTime', { weekday: dow(fmt, st), time: fmt.time(st) })}${fmt.isNight(st) ? ` · ${t('home.night')}` : ''}` };
}

// 히어로 사진: 미리 로드하고 onload 때 .loaded로 opacity 0 → 1 (home.css). 레이아웃은 .hero2 min-height가 잡고 있어 안 움직인다.
function HeroPhoto({ url, pos }) {
  const loaded = useImageLoaded(url);
  return <div className={`hero2-photo${loaded ? ' loaded' : ''}`} style={{ backgroundImage: `url(${url})`, backgroundPosition: pos }} />;
}

// 저장 하트: 켜질 때만 되튐(pop). 애니메이션은 아이콘(svg)에 걸어 버튼의 :active scale과 겹치지 않게.
function HeartButton({ on, label, onClick }) {
  const [popClass, onAnimationEnd] = usePop(on);
  return (
    <button type="button" className={`heart${on ? ' on' : ''}`} aria-label={label} onClick={onClick}>
      <span className={`heart-ic${popClass}`} onAnimationEnd={onAnimationEnd} style={{ display: 'grid', placeItems: 'center' }}>
        {on
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
          : <Icon name="heart" size={16} />}
      </span>
    </button>
  );
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

function Card2({ ev, ts, onOpen, small, idx }) {
  const fmt = useFormat();
  return (
    <button type="button" className="card2" data-prefetch-index={idx} {...prefetchHandlers(ev.race)} style={small ? undefined : { marginTop: 0 }} onClick={() => onOpen(ev.race)}>
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

function Row({ ev, ts, dim, idx, onOpen }) {
  const fmt = useFormat();
  const d = dateOf(ev);
  return (
    <button type="button" className={`rowitem${dim ? ' dim' : ''}`} data-prefetch-index={idx} {...prefetchHandlers(ev.race)} onClick={() => onOpen(ev.race)}>
      <span className="dt">{md(fmt, d)} <em>{dowInList(fmt, d)}</em></span>
      <span className="ind" style={{ background: `var(${SERIES_VAR[ev.series]})` }} />
      <span className="nm ko">{ev.displayName}</span>
      <span className="side"><span className="rd">{ev.series} {roundText(ev)}</span><TimeStat ts={ts} dateless /></span>
    </button>
  );
}

// ---------- 홈 본체 ----------
function HomeView({ theme, setTheme, now, races, myRaces, preferences, favorites, toggleFav, onOpenRace, onGo, setSeriesMode }) {
  const [alerts, setAlerts] = useState(() => storage.alerts.read());
  const [, setExpiredTick] = useState(0);
  const onExpire = useCallback(() => setExpiredTick((n) => n + 1), []);
  useEffect(() => { storage.alerts.write(alerts); }, [alerts]);

  const fmt = useFormat();
  const t = useT();
  const at = useMemo(() => (now instanceof Date ? now : new Date(now)), [now]);

  // 알림 = 그 경기 하나짜리 .ics를 내려받아 OS 캘린더에 담는 것(30분 전 알람 포함).
  // localStorage는 "이미 담았다"는 표시용으로만 쓴다 — 담긴 뒤에 우리가 지울 수는 없다.
  const toggleAlert = (ev) => {
    const id = ev?.id;
    if (!id) return;
    const already = alerts.has(id);
    if (!already) {
      const start = ev.startUtc ? new Date(ev.startUtc) : null;
      const daysUntil = start ? Math.round((start.getTime() - at.getTime()) / 86400000) : null;   // at = 분 단위로 고정된 현재 시각
      track('race_alarm_added', { series: ev.series, race_id: id, ...(daysUntil === null ? {} : { days_until: daysUntil }) });
      // OpenF1 경로의 F1은 id가 meeting_key 기반이라 정적 데이터에 없다 — 매칭된 정적 id를 쓴다.
      const calendarId = ev.race?.staticId || id;
      window.open(`/api/calendar.ics?race=${encodeURIComponent(calendarId)}&lang=${fmt.locale}`, '_blank', 'noopener,noreferrer');
    }
    setAlerts((prev) => { const next = new Set(prev); if (already) next.delete(id); else next.add(id); return next; });
  };

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

  // --- 새로 볼만한 것: 추천 엔진이 점수로 고른다 (관심 경기 제외, 아직 안 끝난 것만) ---
  const mineIds = new Set(mine.map((ev) => ev.id));
  const discPool = all.filter((ev) => !mineIds.has(ev.id) && isAlive(ts(ev).state));
  const discPicks = getRecommendations(discPool.map((ev) => ev.race), preferences, at, 1, fmt.locale);
  const discRank = discPicks.length ? 0 : null;                 // 카드가 하나라 limit=1 — 순위는 배열 index
  const discPick = discPicks[0] || null;
  const disc = discPick ? discPool.find((ev) => ev.race === discPick.race) || null : null;
  const discSeries = disc?.series ?? null;
  const discReasons = (discPick?.reasons || []).filter(Boolean);

  const watching = ORDER.filter((s) => modeOf(preferences, s) !== 'off').length;

  // 히어로를 눌러 상세로 갈 때 바로 뜨도록, 상세 헤더가 쓰는 'card' 사진을 미리 받아둔다.
  // (히어로는 세로로 큰 박스라 'hero'를 쓰고 상세는 헤더 비율이라 URL이 다르다 — 그래서 따로 한 장.)
  const heroRaceId = hero?.id ?? null;
  useEffect(() => { if (hero?.race) prefetchRacePhoto(hero.race, { priority: 'low' }); }, [heroRaceId]); // eslint-disable-line react-hooks/exhaustive-deps
  // '이후 일정' 목록도 화면에 보이는 앞쪽 3개만.
  const rowsRef = useRef(null);
  const laterRaces = useMemo(() => later.map((ev) => ev.race), [later]);
  useVisiblePrefetch(rowsRef, laterRaces);

  // 계측: 발견 카드 노출은 카드가 바뀔 때만 1회. 클릭은 열기 콜백에서.
  const discId = disc?.id ?? null;
  const shownRef = useRef(null);
  useEffect(() => {
    if (!disc || shownRef.current === discId) return;
    shownRef.current = discId;
    track('recommendation_shown', { series: disc.series, reason_kinds: discPick.kinds || [], score: discPick.score, rank: discRank });
  }, [discId]); // eslint-disable-line react-hooks/exhaustive-deps
  const openDiscover = (race) => { track('recommendation_clicked', { series: race.series, position: discRank ?? 0 }); onOpenRace(race, 'recommendation'); };

  return (
    <div className="home">
      <div className="pagehead">
        <div>
          {/* 모바일에서만. 데스크톱은 사이드바에 로고가 있다. */}
          <span className="pagehead-brand"><GantryLockup height={11} /></span>
          <h1 className="ko" data-view-title tabIndex={-1} >{t('home.title')}</h1>
          <div className="sub ko">{t('home.watching', { count: watching })}</div>
        </div>
        <div className="pagehead-tools">
          <span className="clock m">{fmt.zoneLabel} <Clock /></span>
          <div className="mobtools">
            <button type="button" className="iconbtn" aria-label={t('nav.settings')} onClick={() => onGo('settings')}><Icon name="sliders" /></button>
            <button type="button" className="iconbtn" aria-label={t('theme.toggle')} onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
          </div>
        </div>
      </div>

      {hero ? (() => {
        const hts = ts(hero);
        const phase = resolveWeekendPhase(hero.race, at, { mode: modeOf(preferences, hero.series) });
        const reason = heroReason(hero, hts, kind, at, fmt, t, phase);
        const openHero = () => onOpenRace(hero.race, 'home', { hero_phase: phase.phase });
        const clock = heroClock(hero, hts, kind, fmt, t);
        const bcast = fmt.broadcast(hero.broadcast);
        const chans = bcast.map((b) => b.name);
        const urgent = kind === 'live' || kind === 'soon';
        const faved = favorites?.has(hero.id);
        const alertOn = alerts.has(hero.id);
        return (
          <section className="hero2">
            <HeroPhoto url={photo(hero, 'hero')} pos={photoPos(hero)} />
            <span className="hero2-credit">PHOTO · {photoCredit(hero)}</span>
            <div className="hero2-wrap">
              <div className="hero2-left">
                <span className={`hero2-reason${reason.urgent ? '' : ' calm'}`}><LightRow lit={reason.lit} tone={reason.urgent ? 'signal' : 'default'} size={5} gap={3} />{reason.text}</span>
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
                    ? (bcast[0].url
                      // "○○로 보기"는 중계처 랜딩으로 바로 나간다 (새 탭). 클릭 계측은 onClick, 이동은 브라우저 기본 동작.
                      ? <a className="cta" href={bcast[0].url} target="_blank" rel="noopener noreferrer" onClick={() => track('broadcast_clicked', { name: bcast[0].name, region: bcast[0].region, access: bcast[0].access, series: hero.series, source: 'home' })}>{t('home.watchOn', { channel: chans[0] })}</a>
                      : <button type="button" className="cta" onClick={openHero}>{t('home.watchOn', { channel: chans[0] })}</button>)
                    : <button type="button" className="cta" onClick={() => toggleAlert(hero)}>{alertOn ? t('home.alertOn') : t('home.alertSet')}</button>}
                  <HeartButton on={!!faved} label={t('aria.save')} onClick={() => toggleFav?.(hero.id)} />
                  <button type="button" className="linkbtn" onClick={openHero}>{t('home.detail')}</button>
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
          {mates.map((ev, i) => <Card2 key={ev.id} ev={ev} idx={i} ts={ts(ev)} onOpen={onOpenRace} />)}
        </>
      )}

      {later.length > 0 && (
        <>
          <div className="sechead"><h2 className="ko">{t('home.upNext')}</h2><button type="button" className="lnk" onClick={() => onGo('schedule')}>{t('schedule.viewAll')}</button></div>
          <div className="rows" ref={rowsRef}>
            {later.map((ev, i) => <Row key={ev.id} ev={ev} idx={i} ts={ts(ev)} dim={interest(ev) === 0} onOpen={onOpenRace} />)}
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
            {discReasons.length > 0 && (
              <div className="ko" style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text3)', lineHeight: 1.45 }}>
                {discReasons.join(' · ')}
              </div>
            )}
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
