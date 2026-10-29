// 홈 — 반응형 단일 컴포넌트. 레이아웃 분기는 home.css의 900px 미디어쿼리가 한다.
// 규칙·판정은 design/HOME-SPEC.md. 표현은 AI 티 정리(2026-10-29) 기준: 히어로 4층(H1), 큰 숫자는 1시간 안 카운트다운만(H2),
// 줄마다 색 막대 대신 시리즈 점(K1), 시계 칩·테마 버튼 없음(N2), 가운뎃점 한 줄에 하나(D3), D-day 기준을 말로(D6).
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
import { Group, MoreLink } from '../ui.jsx';
import { getHighlights, getHighlightNote, getRaceWeight } from '../schedule/highlights.js';
import { track } from '../analytics.js';
import { prefetchRacePhoto, prefetchHandlers, useVisiblePrefetch } from '../photo-prefetch.js';
import { GantryLockup } from '../Brand.jsx';
import { usePop, useImageLoaded } from '../use-motion.js';
import { toggleAlarm, useAlarms } from '../alarm.js';
import { HeroSiteRow } from '../circuit-map/CircuitMap.jsx';
import { demoClock } from '../demo/clock.js';
import { openDemoClock } from '../demo/demo-clock-events.js';
import { IS_TOSS } from '../platform.js';

const ORDER = ['F1', 'WEC', 'IMSA', 'GTWC', 'WRC'];
const SERIES_VAR = { F1: '--f1', WEC: '--wec', IMSA: '--imsa', WRC: '--wrc', GTWC: '--gtwc' };
const HOUR_MS = 3600000;

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

// 라운드 코드 'R19'(0을 채우지 않는다). 라운드가 없으면 데이터 라벨 그대로(대문자로 바꾸지 않는다), 그것도 없으면 비운다.
function roundText(ev) {
  const r = ev.round || ev.plannedRound;
  if (r) return `R${r}`;
  return ev.label ? String(ev.label) : '';
}
// 문장 속 라운드: '19라운드'
function roundWords(ev, t) {
  const r = ev.round || ev.plannedRound;
  if (r) return t('round.n', { n: r });
  return ev.label ? String(ev.label) : '';
}

// 시청자 시간대 기준 '09.26' / '토' — format.getParts에서 직접 (문자열 슬라이싱 금지)
const md = (fmt, date) => fmt.monthDayShort(date);                 // '09.26' / en 'Sep 26'
const dow = (fmt, date) => fmt.parts(date)?.weekdayName || '';

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
  // D-day: 시작 시각이 있으면 시청자 시간대의 날짜 차이, 없으면 서킷 현지 주말 마지막 날 기준.
  // 무엇까지인지 말로 붙인다(D6): '결승까지 6일' — 시각이 없으면 '다음 레이스 · 6일 후'.
  const ref = ts.start || zonedDateFromKey(ev.weekendEnd, '12:00', ev.timezone || 'UTC');
  const d = Math.max(0, fmt.dayDiff(ref, now) ?? 0);
  const lit = Math.max(0, Math.min(5, 5 - d));
  const what = ts.start && ev.primarySession ? fmt.sessionLabel(ev.primarySession) : '';
  if (what) return { text: d === 0 ? t('home.reason.untilToday', { label: what }) : t('home.reason.until', { label: what, d }), urgent: false, lit };
  return { text: d === 0 ? t('home.reason.weekendToday') : t('home.reason.weekend', { d }), urgent: false, lit };
}

// 히어로 시각 줄. 날짜·시각은 문장 크기(20)로, 큰 숫자(40)는 시작 1시간 안 카운트다운에만 쓴다(H2).
//   big: 굵은 한 줄, countdown: 카운트다운 대상(있으면 big 대신), note: 옆에 붙는 설명('결승 · 새벽').
function heroClock(ev, ts, kind, now, fmt, t) {
  const st = ts.start;
  const night = st && fmt.isNight(st) ? t('home.night') : null;
  const what = ev.primarySession ? fmt.sessionLabel(ev.primarySession) : '';
  if (kind === 'live') return { big: t('home.clock.live'), live: true, note: what || null };
  if (kind === 'soon' && st - now <= HOUR_MS) return { countdown: st, note: [fmt.shortDateTime(st), night].filter(Boolean).join(' · ') };
  // 주말 기간은 이벤트 고유 정보 — 서킷 현지 날짜 그대로
  if (kind === 'today' || !st) return { big: `${fmt.plainMonthDay(ev.weekendStart)} – ${fmt.plainMonthDay(ev.weekendEnd)}`, note: t('home.clock.tba') };
  return { big: fmt.shortDateTime(st), soon: kind === 'soon', note: [what, night].filter(Boolean).join(' · ') || null };
}

// 히어로 큐레이션 줄. heroReason(시간·주말 진행 상태)이 못 담는 '왜 하필 이 경기인가'를 한 줄로 붙인다.
// 우선순위는 추천 엔진(scoreRace)과 같다 — 하이라이트가 등급을 이긴다. 1등급이면 null(줄 자체를 안 그린다).
function heroCuration(race, locale, t) {
  const highlights = getHighlights(race);
  if (highlights.length) {
    const text = getHighlightNote(highlights[0], locale);
    if (text) return { kind: 'highlight', text };
  }
  const weight = getRaceWeight(race);
  if (weight === 3) return { kind: 'weight3', text: t('rec.weight3') };
  if (weight === 2) return { kind: 'weight2', text: t('rec.weight2') };
  return null;
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
    <button type="button" className={`heart${on ? ' on' : ''}`} aria-label={label} aria-pressed={on} onClick={onClick}>
      <span className={`heart-ic${popClass}`} onAnimationEnd={onAnimationEnd} style={{ display: 'grid', placeItems: 'center' }}>
        {on
          ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
          : <Icon name="heart" size={24} />}
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// 시리즈 표시: 8px 점 + 코드(+ 라운드) 한 번. 예전 막대·대문자·자간 없음.
function SeriesBadge({ series, round }) {
  return <span className="sbadge"><i style={{ background: `var(${SERIES_VAR[series]})` }} />{series}{round ? ` ${round}` : ''}</span>;
}

// 줄 오른쪽: 시각(17/600) + 아래 12px 한 줄(상태·'새벽'·날짜). 예전 LIVE 노랑 알약·'심야' 상자 대신 글자.
function TimeStat({ ts, withDate }) {
  const fmt = useFormat();
  const t = useT();
  const { state, start } = ts;
  const sub = (txt, cls = '') => <span className={`time-sub${cls}`}>{txt}</span>;
  if (state === 'cancelled') return <span className="time-col"><span className="time time--tba">{t('time.tba')}</span>{sub(t('time.cancelled'))}</span>;
  if (state === 'tba') return <span className="time-col"><span className="time time--tba">{t('time.tba')}</span></span>;
  const live = state === 'live';
  return (
    <span className="time-col">
      <span className={`time${state === 'soon' ? ' time--soon' : ''}`}>{fmt.time(start)}</span>
      {live && sub(<><i className="livedot" />{t('home.clock.live')}</>, ' time-sub--live')}
      {state === 'done' && sub(t('time.done'))}
      {!live && state !== 'done' && (withDate ? sub(fmt.shortDate(start)) : fmt.isNight(start) ? sub(t('home.night')) : null)}
    </span>
  );
}

// 같은 주말 줄 / 새로 볼만한 것 줄: 이름 · '● F1 R19 · 서킷' · 중계 한 줄 …… 시각 + 날짜.
function Card2({ ev, ts, onOpen, small, idx }) {
  const fmt = useFormat();
  const t = useT();
  const chans = fmt.broadcast(ev.broadcast).map((b) => b.name);
  return (
    <button type="button" className="g-row g-tap hrow hrow--card" data-prefetch-index={idx} {...prefetchHandlers(ev.race)} onClick={() => onOpen(ev.race)}>
      <span className="main">
        <span className="nm ko">{ev.displayName}</span>
        <span className="meta ko"><SeriesBadge series={ev.series} round={roundText(ev)} />
          {small
            ? ` · ${[ev.city, `${fmt.plainShortDate(ev.weekendStart)} – ${fmt.plainShortDate(ev.weekendEnd)}`].filter(Boolean).join(', ')}`
            : ev.circuit ? ` · ${ev.circuit}` : ''}
        </span>
        {!small && chans.length > 0 && <span className="cap ko">{t('home.broadcastOn', { channels: chans.join(', ') })}</span>}
      </span>
      {!small && <TimeStat ts={ts} withDate />}
    </button>
  );
}

// 이후 일정 줄: 날짜 칸(11.08 / 일) · 이름 + '● WEC R8' …… 시각 + '새벽'.
function Row({ ev, ts, dim, idx, onOpen }) {
  const fmt = useFormat();
  const d = dateOf(ev);
  return (
    <button type="button" className={`g-row g-tap hrow${dim ? ' g-dim' : ''}`} data-prefetch-index={idx} {...prefetchHandlers(ev.race)} onClick={() => onOpen(ev.race)}>
      <span className="dt">{md(fmt, d)}<small>{dow(fmt, d)}</small></span>
      <span className="main">
        <span className="nm ko">{ev.displayName}</span>
        <span className="meta"><SeriesBadge series={ev.series} round={roundText(ev)} /></span>
      </span>
      <TimeStat ts={ts} />
    </button>
  );
}

// ---------- 홈 본체 ----------
function HomeView({ now, races, myRaces, preferences, favorites, toggleFav, onOpenRace, onGo, setSeriesMode }) {
  const alerts = useAlarms();   // 상세에서 담아도 히어로가 바로 '담음'이 된다 (alarm.js가 알린다)
  const [, setExpiredTick] = useState(0);
  const onExpire = useCallback(() => setExpiredTick((n) => n + 1), []);

  const fmt = useFormat();
  const t = useT();
  const at = useMemo(() => (now instanceof Date ? now : new Date(now)), [now]);

  const toggleAlert = (ev) => toggleAlarm(ev, { source: 'hero', preferences, locale: fmt.locale, now: at });

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
        <div className="pagehead-id">
          {/* 모바일에서만. 데스크톱은 사이드바에 로고가 있다. */}
          <span className="pagehead-brand"><GantryLockup height={14} /></span>
          {/* 제목은 화면에서만 숨긴다 — 화면 전환 포커스(data-view-title)와 화면 낭독기가 쓴다. */}
          <h1 className="ko vh" data-view-title tabIndex={-1} >{t('home.title')}</h1>
        </div>
        <div className="pagehead-tools">
          {/* 시계 칩은 없앴다(N2) — 시간 기준은 일정 제목 아래 한 줄. 데모 빌드에서만 데모 시계 시트를 여는 버튼이 남는다. */}
          {demoClock.enabled && <button type="button" className="clock clock--demo" aria-label={t('demo.open')} onClick={openDemoClock}>{fmt.zoneLabel} <Clock /><span className="dm">{t('demo.badge')}</span></button>}
          {/* 테마 버튼은 설정으로 옮겼다(K5). */}
          <div className="mobtools">
            <button type="button" className="iconbtn" aria-label={t('nav.settings')} onClick={() => onGo('settings')}><Icon name="sliders" size={24} /></button>
          </div>
        </div>
      </div>

      {hero ? (() => {
        const hts = ts(hero);
        const phase = resolveWeekendPhase(hero.race, at, { mode: modeOf(preferences, hero.series) });
        const reason = heroReason(hero, hts, kind, at, fmt, t, phase);
        const curation = heroCuration(hero.race, fmt.locale, t);
        const openHero = () => onOpenRace(hero.race, 'home', { hero_phase: phase.phase, hero_curation: curation?.kind ?? null });
        const clock = heroClock(hero, hts, kind, at, fmt, t);
        const bcast = fmt.broadcast(hero.broadcast);
        const chans = bcast.map((b) => b.name);
        const urgent = kind === 'live' || kind === 'soon';
        const faved = favorites?.has(hero.id);
        const alertOn = alerts.has(hero.id);
        const credit = photoCredit(hero);
        const title = hero.fullName || hero.displayName;
        // 영문 공식명(스폰서 포함)은 영어 화면에서만 부제로 둔다 — 한국어 화면에서는 같은 경기를 두 번 쓰는 셈이다(H1).
        const official = fmt.locale !== 'ko' && hero.officialName && hero.officialName !== title ? hero.officialName : null;
        return (
          <section className="hero2">
            <HeroPhoto url={photo(hero, 'hero')} pos={photoPos(hero)} />
            {/* 히어로 전체가 상세로 가는 버튼이다('상세' 링크 대신, H1). 안쪽 버튼·링크는 이 위에 따로 눌린다. */}
            <button type="button" className="hero2-hit" aria-label={t('home.openDetail', { name: title })} onClick={openHero} />
            {credit && (
              <a className="hero2-credit" href={credit.url} target="_blank" rel="noopener noreferrer" title={t('photo.credit', credit)} aria-label={t('photo.credit', credit)}>
                <span className="by">{t('photo.by', credit)}</span><span className="lic">&nbsp;· {credit.license}</span>
              </a>
            )}
            <div className="hero2-wrap">
              <div className="hero2-left">
                {/* ① 신호등 줄 + 이유 한 줄 (알약 없음). 노랑은 진행 중·24시간 안일 때만(K3). */}
                <div className={`hero2-reason${reason.urgent ? ' urgent' : ''}`}><LightRow lit={reason.lit} tone={reason.urgent ? 'signal' : 'default'} size={6} gap={3} />{reason.text}</div>
                {curation && <div className="hero2-curation ko">{curation.text}</div>}
                {/* ② 제목 */}
                <h2 className="hero2-title ko">{title}</h2>
                {official && <div className="hero2-official">{official}</div>}
                {/* ③ '● F1 19라운드' + 서킷 */}
                <div className="hero2-place ko">
                  <span className="sbadge"><i style={{ background: `var(${SERIES_VAR[hero.series]})` }} />{[hero.series, roundWords(hero, t)].filter(Boolean).join(' ')}</span>
                  {hero.isSprint && <span className="hero2-tag">{t('home.sprintWeekend')}</span>}
                  <span className="hero2-circuit">{[hero.circuit, hero.city].filter(Boolean).join(', ')}</span>
                </div>
              </div>
              <div className="hero2-right">
                {/* ④ 시각 + 행동 + 중계 */}
                <div className={`hero2-time${clock.countdown ? ' hero2-time--count' : ''}${clock.live || clock.countdown || clock.soon ? ' urgent' : ''}`}>
                  <b>{clock.countdown ? <Countdown target={clock.countdown} onExpire={onExpire} /> : <>{clock.live && <i className="livedot" />}{clock.big}</>}</b>
                  {clock.note && <span className="ko">{clock.note}</span>}
                </div>
                <div className="hero2-act">
                  {urgent && chans.length
                    ? (bcast[0].url
                      // "○○에서 보기"는 중계처 랜딩으로 바로 나간다 (새 탭). 클릭 계측은 onClick, 이동은 브라우저 기본 동작.
                      ? <a className="cta" href={bcast[0].url} target="_blank" rel="noopener noreferrer" onClick={() => track('broadcast_clicked', { name: bcast[0].name, region: bcast[0].region, access: bcast[0].access, series: hero.series, source: 'home' })}>{t('home.watchOn', { channel: chans[0] })}</a>
                      : <button type="button" className="cta" onClick={openHero}>{t('home.watchOn', { channel: chans[0] })}</button>)
                    // 토스 빌드는 캘린더 알림을 쓰지 않는다 — 자리에 다른 버튼을 넣지 않는다.
                    : !IS_TOSS && <button type="button" className="cta" aria-pressed={alertOn} onClick={() => toggleAlert(hero)}>{alertOn ? t('home.alertOn') : t('home.alertSet')}</button>}
                  <HeartButton on={!!faved} label={t('aria.save')} onClick={() => toggleFav?.(hero.id)} />
                </div>
                {chans.length > 0 && <div className="hero2-chans ko">{t('home.broadcastOn', { channels: chans.join(', ') })}</div>}
              </div>
              {/* 현장 줄: '현장에 가요'를 켠 지도 있는 경기, 주말 동안만 */}
              {!IS_TOSS && <HeroSiteRow race={hero.race} now={now} />}
            </div>
          </section>
        );
      })() : (
        <Group className="g-group empty">
          <h3 className="ko">{t('home.empty.title')}</h3>
          <p className="ko">{t('home.empty.body')}</p>
          <button type="button" className="btn2" onClick={() => onGo('schedule')}>{t('home.empty.cta')}</button>
        </Group>
      )}

      {mates.length > 0 && (
        <>
          <div className="sechead"><h2 className="ko">{t('home.sameWeekend')}</h2></div>
          <Group>{mates.map((ev, i) => <Card2 key={ev.id} ev={ev} idx={i} ts={ts(ev)} onOpen={onOpenRace} />)}</Group>
        </>
      )}

      {later.length > 0 && (
        <>
          <div className="sechead"><h2 className="ko">{t('home.upNext')}</h2><MoreLink onClick={() => onGo('schedule')}>{t('schedule.viewAll')}</MoreLink></div>
          {/* 구분선은 이름 시작점(16 + 날짜 칸 52 + 간격 12 = 80)부터 */}
          <div ref={rowsRef}>
            <Group inset={80}>{later.map((ev, i) => <Row key={ev.id} ev={ev} idx={i} ts={ts(ev)} dim={interest(ev) === 0} onOpen={onOpenRace} />)}</Group>
          </div>
        </>
      )}

      {disc && (
        <>
          <div className="sechead"><h2 className="ko">{t('home.discover')}</h2></div>
          <Group className="g-group panel">
            <h3 className="ko">{t('home.discover.title', { name: t(`series.${discSeries}.name`), josa: josa(t(`series.${discSeries}.name`), '은', '는') })}</h3>
            <p className="ko">{t('home.discover.body', { desc: t(SERIES_DESCRIPTION_KEYS[discSeries]) })}</p>
            <div className="panel-pick"><Card2 ev={disc} ts={ts(disc)} onOpen={openDiscover} small /></div>
            {discReasons.length > 0 && <div className="panel-why ko">{discReasons.join(', ')}</div>}
            <button type="button" className="btn2" onClick={() => { track('series_mode_changed', { series: discSeries, from: modeOf(preferences, discSeries), to: 'race' }); setSeriesMode?.(discSeries, 'race'); }}>{t('home.discover.add', { series: discSeries })}</button>
          </Group>
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
