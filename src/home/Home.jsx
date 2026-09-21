// 홈 — 반응형 단일 컴포넌트. 레이아웃 분기는 home.css의 900px 미디어쿼리가 한다.
// 규칙·판정은 design/HOME-SPEC.md, 픽셀·여백·타이포·색은 design/paddock-home.html을 따른다.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './home.css';
import { adaptRaces } from './adapt.js';
import { resolveTimeState, isNightKst, formatKstDate, formatKstTime, formatCountdown } from './time.js';
import { getRaceWeekKey, groupRacesByWeekend } from './weeks.js';
import { photo, photoPos, photoCredit } from './photos.js';
import { SERIES_DESCRIPTIONS } from '../preferences-options.js';
import { getDateKeyInKst } from '../schedule/index.js';

const ORDER = ['F1', 'WEC', 'IMSA', 'GTWC', 'WRC'];
const SERIES_KO = { F1: '포뮬러 1', WEC: '세계 내구 선수권', IMSA: 'IMSA 스포츠카', WRC: '세계 랠리 선수권', GTWC: 'GT 월드 챌린지' };
const SERIES_VAR = { F1: '--f1', WEC: '--wec', IMSA: '--imsa', WRC: '--wrc', GTWC: '--gtwc' };
const DAY_MS = 86400000;
const ALERTS_KEY = 'paddock.alerts';

// ---------- 작은 순수 헬퍼 ----------
const modeOf = (preferences, series) => preferences?.series?.[series] || 'off';
const interestOf = (preferences, series) => ({ all: 2, race: 1 }[modeOf(preferences, series)] || 0);
const isAlive = (state) => state !== 'done' && state !== 'cancelled';
const fromKey = (key, time = '12:00') => (key ? new Date(`${key}T${time}:00+09:00`) : null);
const dateOf = (ev) => (ev.startUtc ? new Date(ev.startUtc) : fromKey(ev.raceDateKst || ev.weekendEnd));
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

function dow(date) { return formatKstDate(date).slice(-2, -1); }        // '09.26 (토)' → '토'
function md(date) { return formatKstDate(date).slice(0, 5); }           // '09.26'

function heroReason(ev, ts, kind, now) {
  if (kind === 'live') return { text: '지금 진행 중', urgent: true };
  if (kind === 'soon') {
    const ms = ts.start - now; const h = Math.floor(ms / 3600000); const m = Math.max(1, Math.round((ms % 3600000) / 60000));
    return { text: `${isNightKst(ts.start) ? '오늘 밤' : '오늘'} · ${h >= 1 ? `${h}시간 뒤 시작` : `${m}분 뒤 시작`}`, urgent: true };
  }
  if (kind === 'today') return { text: '오늘 진행 · 시작 시각 미정', urgent: false };
  const ref = ts.start ? getDateKeyInKst(ts.start) : ev.weekendEnd;
  const d = Math.max(0, Math.round((fromKey(ref) - fromKey(getDateKeyInKst(now))) / DAY_MS));
  return { text: `다음 레이싱 위켄드 · D-${d}`, urgent: false };
}

function heroClock(ev, ts, kind) {
  const st = ts.start;
  if (kind === 'live') return { big: 'LIVE', urgent: true, sub: '진행 중' };
  if (kind === 'soon') return { big: null, countdown: st, urgent: true, sub: `${formatKstDate(st)} ${formatKstTime(st)} KST${isNightKst(st) ? ' · 심야' : ''}` };
  if (kind === 'today' || !st) return { big: `${md(fromKey(ev.weekendStart))} – ${md(fromKey(ev.weekendEnd))}`, urgent: false, sub: '시작 시각 미정 · 확정되면 알려드립니다' };
  return { big: md(st), urgent: false, sub: `${dow(st)}요일 ${formatKstTime(st)} KST${isNightKst(st) ? ' · 심야' : ''}` };
}

function readAlerts() {
  try { return new Set(JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]')); } catch { return new Set(); }
}

// ---------- 1초 단위로 자기 DOM만 갱신하는 조각 (홈 전체 리렌더 없음) ----------
function KstClock() {
  const ref = useRef(null);
  useEffect(() => {
    const tick = () => { if (ref.current) ref.current.textContent = formatKstTime(new Date()); };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);
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
  const { state, start } = ts;
  if (state === 'cancelled') return <span className="time time--cancelled">취소</span>;
  if (state === 'live') return <span className="time time--live">LIVE</span>;
  if (state === 'tba') return <span className="time time--tba">시간 미정</span>;
  if (state === 'done') return <span className="time time--done">종료</span>;
  return (
    <span className={`time${state === 'soon' ? ' time--soon' : ''}`}>
      {isNightKst(start) && <span className="nightmark">심야</span>}
      {dateless ? '' : `${formatKstDate(start)} `}{formatKstTime(start)}<span className="z">KST</span>
    </span>
  );
}

function Card2({ ev, ts, onOpen, small }) {
  return (
    <button type="button" className="card2" style={small ? undefined : { marginTop: 0 }} onClick={() => onOpen(ev.race)}>
      <span className="ind" style={{ background: `var(${SERIES_VAR[ev.series]})` }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SeriesBadge series={ev.series} /><span className="rnd">{roundText(ev)}</span></span>
        <span className="ttl ko" style={{ display: 'block', fontSize: small ? 14 : undefined }}>{ev.displayName}</span>
        <span className="sub ko" style={{ display: 'block' }}>
          {small
            ? `${ev.city || ''} · ${formatKstDate(fromKey(ev.weekendStart))} — ${formatKstDate(fromKey(ev.weekendEnd))}`
            : ev.circuit || ''}
        </span>
      </span>
      {!small && (
        <span className="side">
          <TimeStat ts={ts} />
          <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>{ev.broadcast[0] || ''}</span>
        </span>
      )}
    </button>
  );
}

function Row({ ev, ts, dim, onOpen }) {
  const d = dateOf(ev);
  return (
    <button type="button" className={`rowitem${dim ? ' dim' : ''}`} onClick={() => onOpen(ev.race)}>
      <span className="dt">{md(d)} <em>{dow(d)}</em></span>
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

  const at = useMemo(() => (now instanceof Date ? now : new Date(now)), [now]);
  const todayKey = getDateKeyInKst(at);

  // 관심 경기(myRaces)와 전체(races)를 홈 형태로. 시간 상태는 한 번만 계산해 id로 찾는다.
  const mine = useMemo(() => adaptRaces(myRaces || [], preferences), [myRaces, preferences]);
  const all = useMemo(() => adaptRaces(races || [], preferences), [races, preferences]);
  const stateOf = useMemo(() => {
    const map = new Map();
    for (const ev of all) map.set(ev.id, resolveTimeState(ev.race, at));
    return map;
  }, [all, at]);
  const ts = (ev) => stateOf.get(ev.id) || resolveTimeState(ev.race, at);
  const interest = (ev) => interestOf(preferences, ev.series);

  // --- 히어로 한 자리. 무엇이 들어갈지는 긴급도가 정한다 (스펙 4장). ---
  let hero = null; let kind = null; let heroWeek = null;
  const live = mine.filter((ev) => ts(ev).state === 'live');
  const soon = mine.filter((ev) => ts(ev).state === 'soon').sort((a, b) => ts(a).start - ts(b).start);
  const todayTba = mine.filter((ev) => ts(ev).state === 'tba' && ev.weekendStart <= todayKey && todayKey <= ev.weekendEnd);
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

  return (
    <div className="home">
      <div className="pagehead">
        <div>
          <h1 className="ko">내 레이싱 위켄드</h1>
          <div className="sub ko">{watching}개 시리즈를 보고 있습니다</div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <span className="clock m">KST <KstClock /></span>
          <div className="mobtools">
            <button type="button" className="iconbtn" aria-label="설정" onClick={() => onGo('settings')}><Icon name="sliders" /></button>
            <button type="button" className="iconbtn" aria-label="테마 전환" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
          </div>
        </div>
      </div>

      {hero ? (() => {
        const hts = ts(hero);
        const reason = heroReason(hero, hts, kind, at);
        const clock = heroClock(hero, hts, kind);
        const chans = hero.broadcast;
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
                  {hero.isSprint && <span className="tagpill">스프린트 주말</span>}
                </div>
                <h2 className="hero2-title ko">{hero.displayName}</h2>
                {hero.officialName && hero.officialName !== hero.displayName && <div className="hero2-official">{hero.officialName}</div>}
                <div className="hero2-place ko">{hero.circuit || ''}{hero.city ? ` · ${hero.city}` : ''}{hero.country ? `, ${hero.country}` : ''}</div>
              </div>
              <div className="hero2-right">
                <div className={`hero2-clock${clock.urgent ? ' urgent' : ''}`}>
                  {clock.countdown ? <Countdown target={clock.countdown} onExpire={onExpire} /> : clock.big}
                </div>
                <div className="hero2-when ko">{clock.sub}</div>
                <div className="hero2-act">
                  {urgent && chans.length
                    ? <button type="button" className="cta" onClick={() => onOpenRace(hero.race)}>{chans[0]}에서 보기</button>
                    : <button type="button" className="cta" onClick={() => toggleAlert(hero.id)}>{alertOn ? '알림 켜짐' : '시작 전에 알림 받기'}</button>}
                  <button type="button" className={`heart${faved ? ' on' : ''}`} aria-label="저장" onClick={() => toggleFav?.(hero.id)}>
                    {faved
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                      : <Icon name="heart" size={16} />}
                  </button>
                  <button type="button" className="linkbtn" onClick={() => onOpenRace(hero.race)}>상세</button>
                </div>
                {chans.length > 0 && <div className="hero2-chans">{chans.join(' · ')}</div>}
              </div>
            </div>
          </section>
        );
      })() : (
        <div className="empty">
          <h3 className="ko">관심 시리즈에 예정된 경기가 없습니다</h3>
          <p className="ko">전체 일정에서 다른 시리즈의 경기를 찾아볼 수 있습니다.</p>
          <button type="button" className="cta ghost" style={{ maxWidth: 220, margin: '14px auto 0' }} onClick={() => onGo('schedule')}>전체 일정 보기</button>
        </div>
      )}

      {mates.length > 0 && (
        <>
          <div className="sechead"><h2 className="ko">같은 주말</h2><span className="meta">{mates.length}경기</span></div>
          {mates.map((ev) => <Card2 key={ev.id} ev={ev} ts={ts(ev)} onOpen={onOpenRace} />)}
        </>
      )}

      {later.length > 0 && (
        <>
          <div className="sechead"><h2 className="ko">이후 일정</h2><button type="button" className="lnk" onClick={() => onGo('schedule')}>전체 일정 →</button></div>
          <div className="rows">
            {later.map((ev) => <Row key={ev.id} ev={ev} ts={ts(ev)} dim={interest(ev) === 0} onOpen={onOpenRace} />)}
          </div>
        </>
      )}

      {disc && (
        <>
          <div className="sechead"><h2 className="ko">새로 볼만한 것</h2></div>
          <div className="panel">
            <h3 className="ko">{SERIES_KO[discSeries]}{josa(SERIES_KO[discSeries], '은', '는')} 아직 안 보고 계시네요</h3>
            <p className="ko">{SERIES_DESCRIPTIONS[discSeries]} 관심 설정이 꺼져 있어 일정에서 빠져 있습니다. 가장 가까운 경기를 가져왔습니다.</p>
            <Card2 ev={disc} ts={ts(disc)} onOpen={onOpenRace} small />
            <button type="button" className="cta ghost" style={{ marginTop: 11 }} onClick={() => setSeriesMode?.(discSeries, 'race')}>{discSeries} 관심 시리즈에 추가</button>
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
