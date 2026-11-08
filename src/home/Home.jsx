// 홈(UX v2 SPEC 1장): 위 줄 → 제목 문장 → 카드 덱(넘겨 보기) → 관전 포인트·현장 줄 → 지난 주말 결과(48시간 안이면 덱 바로 아래)
// → 내 주말 시간표 → 놓치면 아쉬운 경기 → 이후 일정. 데스크톱은 덱 아래 시간표 + 오른쪽 레일(결과·추천·이후 일정).
// 규칙은 home/plan.js(히어로 순서 L5·덱·제목 문장·카드 상태), 시각 표기는 useFormat()(보는 사람 시간대·언어).
// 홈 조립은 분 단위로 memo하고(아래 Home의 비교), 진행 중의 지난 시간·진행 막대·숫자 굴림만 1초마다 자기 칸에서 갱신한다.
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './home2.css';
import { buildHomePlan, homeHeadline, getCardState } from './plan.js';
import { TimelineList } from './TimelineList.jsx';
import { likeCount, formatCount, popularRaces, useLikes, COUNT_IN_HEART } from '../likes/likes.js';
import { Popular, LikeInline } from '../likes/Likes.jsx';
import { WxCardTag, WxInline } from '../weather/Wx.jsx';
import { useWeather, useCardWx, wxOfRace } from '../weather/forecast.js';
import { getMainSessionAt, getRaceEnd, getSessionEnd, resolveTimeState, isAliveState, isCancelled } from './time.js';
import { photo, photoPos, photoCredit } from './photos.js';
import { SERIES_DESCRIPTION_KEYS } from '../preferences-options.js';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { getPrimarySession, getRoundText } from '../schedule/utils.js';
import { getRecommendations } from '../schedule/recommendations.js';
import { curationOf } from './curation.js';
import { track } from '../analytics.js';
import { prefetchRacePhoto, prefetchHandlers, useVisiblePrefetch } from '../photo-prefetch.js';
import { GantryLockup } from '../Brand.jsx';
import { toggleAlarm, useAlarms } from '../alarm.js';
import { HeroSiteRow } from '../circuit-map/CircuitMap.jsx';
import { demoClock } from '../demo/clock.js';
import { openDemoClock } from '../demo/demo-clock-events.js';
import { useF1Results, resultOf, photoOf, teamColor } from '../results/results.js';
import { Avatar } from '../results/ResultsUI.jsx';
import { useShell } from '../shell/context.js';
import { Icon } from '../ui2/Icon.jsx';
import { Dot, LiveText, Progress, Roll, ListHeader, Band, RaceRow, Photo, GearBtn } from '../ui2/parts.jsx';
import { joinDot, SEP } from '../ui2/hooks.js';

const HOUR_MS = 3600000;
const sameMinute = (a, b) => Math.floor(new Date(a).getTime() / 60000) === Math.floor(new Date(b).getTime() / 60000);
const msOf = (v) => (v ? new Date(v).getTime() : null);
const modeOf = (preferences, series) => preferences?.series?.[series] || 'off';
const cx = (...list) => list.filter(Boolean).join(' ');

// 1초마다 지금 시각(데모 시계면 데모 시각 — Date가 바뀌어 있다). 진행 중 칸·데모 시계만 쓴다.
function useTick(on = true) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return undefined;
    const i = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(i);
  }, [on]);
  return t;
}

// '결승 1 · 11월 9일 (월) 02:00' — 이름이 숫자로 끝나면(결승 1) 날짜 숫자와 붙지 않게 가운뎃점, 아니면 띄어쓰기
const labelAt = (tr, label, when) => (/\d$/.test(label) ? tr('home.card.raceAt', { label, datetime: when }) : `${label} ${when}`);

// 데모 시계 칩(데모 빌드만): 시간대 · 데모 시각 · '데모'
function DemoClock() {
  const fmt = useFormat(); const tr = useT();
  const tick = useTick(demoClock.enabled);
  if (!demoClock.enabled) return null;
  return <button type="button" className="gx-demo-chip" aria-label={tr('demo.open')} onClick={openDemoClock}><span className="gx-demo-zone">{fmt.zoneLabel}</span><b>{fmt.time(tick)}</b><span>{tr('demo.badge')}</span></button>;
}

// ---------- 덱 카드 ----------
// 카드의 '언제' 한 줄(카드마다 자기 상태대로). 진행 중(결승·세션)은 지난 시간 + 진행 막대, 그 밖에는 '연습 3 · 11월 7일 (토) 23:30'만.
function CardWhen({ race, c, compact }) {
  const fmt = useFormat(); const tr = useT();
  const live = c.kind === 'live' || c.kind === 'session';
  const now = useTick(live || c.kind === 'count' || (c.kind === 'between' && !!c.hour));
  const main = getMainSessionAt(race, now) || getPrimarySession(race);
  const ml = main ? fmt.sessionLabel(main) : fmt.sessionLabel({ tEn: 'Race', kind: 'race' });
  const st0 = msOf(main?.startUtc);
  const T = (text) => <b className="gx-card-time"><Roll>{text}</Roll></b>;
  const dayTime = (ms) => `${fmt.dayWord(ms, now)} ${fmt.time(ms)}`;   // 작은 장은 '내일 13:30'처럼 줄인다
  if (c.kind === 'live') {
    const multi = race.sessions.filter((s) => s.kind === 'race' && s.startUtc).length > 1;
    const el = fmt.elapsed(st0, now);
    return <>{T(multi ? tr('home.card.liveOf', { label: ml, elapsed: el }) : el)}<Progress from={st0} to={getSessionEnd(race, main)} now={now} label={ml} /></>;
  }
  if (c.kind === 'session') {
    const sl = fmt.sessionLabel(c.ses);
    return <>{T(tr('home.card.liveOf', { label: sl, elapsed: fmt.elapsed(c.ses.startUtc, now) }))}<Progress from={c.ses.startUtc} to={getSessionEnd(race, c.ses)} now={now} label={sl} /></>;
  }
  if (c.kind === 'between') {
    const nx = c.nx; const nxAt = msOf(nx.startUtc); const nl = fmt.sessionLabel(nx);
    return T(labelAt(tr, nl, compact ? dayTime(nxAt) : fmt.dayDateTime(nxAt)));
  }
  if (c.kind === 'tba' || st0 == null) return T(tr('home.card.tba', { label: ml }));
  return T(labelAt(tr, ml, compact ? dayTime(st0) : fmt.dayDateTime(st0)));
}

// 카드의 할 일 하나(결정 2·3): 진행 중이거나 1시간 안이면 '…에서 보기'(외부), 그 전에는 캘린더에 담기. 시각 미정이면 안내 한 줄.
function cardAct({ race, c, fmt, tr, alarmOn, onCal, onOpen }) {
  const bc = fmt.broadcast(race.broadcast);
  const names = (list) => list.map((b) => b.name).join(', ');
  const urgent = c.kind === 'live' || c.kind === 'session' || c.kind === 'count' || (c.kind === 'between' && c.hour);
  if (urgent && bc[0]) {
    const b = bc[0];
    const long = b.name.length > 12;
    const full = tr('home.watchOn', { channel: b.name });
    const label = long ? <><span className="lb-l">{full}</span><span className="lb-s">{tr('home.watchShort')}<span className="gx-vh">, {b.name}</span></span></> : full;
    const onClick = () => track('broadcast_clicked', { name: b.name, region: b.region, access: b.access, series: race.series, source: 'home' });
    const btn = b.url
      ? <a className={cx('gx-card-btn', long && 'is-long')} href={b.url} target="_blank" rel="noopener noreferrer" onClick={onClick}>{label}<span className="gx-vh">, {tr('aria.external')}</span></a>
      : <button type="button" className={cx('gx-card-btn', long && 'is-long')} onClick={onOpen}>{label}</button>;
    // 진행 중에는 '…에서도 중계' 줄을 빼고(버튼 하나로 충분), 좁은 카드에서 버튼이 '중계 보기'로 줄면 어디서 열리는지만
    const rest = bc.slice(1);
    const nowOn = c.kind === 'live' || c.kind === 'session';
    const restLine = rest.length && !nowOn ? tr('home.alsoOn', { channels: names(rest) }) : null;
    const line = long ? <><span className="lb-l">{restLine}</span><span className="lb-s">{tr('home.opensIn', { channel: b.name })}{restLine ? `${SEP}${restLine}` : ''}</span></> : restLine;
    return { btn, full, href: b.url, onClick, line, narrowOnly: long && !restLine, urgent: true };
  }
  const line = bc.length ? tr('home.broadcastOn', { channels: names(bc) }) : null;
  if (msOf(getPrimarySession(race)?.startUtc)) {
    return {
      btn: <button type="button" className={cx('gx-card-btn', alarmOn && 'is-weak')} onClick={onCal} aria-label={alarmOn ? tr('home.alertOn.aria') : undefined}>{alarmOn && <Icon n="check" s={20} />}{alarmOn ? tr('home.alertOn') : tr('home.alertSet')}</button>,
      line,
    };
  }
  return { btn: <span className="gx-card-note gx-t15">{tr('home.alertTba')}</span>, line };
}

function CardHeart({ on, label, onClick, count = null }) {
  const [pop, setPop] = useState(false);
  return (
    <button type="button" className={cx('gx-card-heart', on && 'is-on', pop && 'is-pop', count && 'has-count')} aria-pressed={!!on} aria-label={label}
      onClick={() => { if (!on) setPop(true); onClick(); }} onAnimationEnd={() => setPop(false)}>
      <Icon n={on ? 'heartF' : 'heart'} s={20} />
      {count && <span className="gx-heart-n" aria-hidden="true"><Roll>{count}</Roll></span>}
    </button>
  );
}

// size: m(모바일 넘겨 보기) · main(데스크톱 큰 장) · side(옆 한 장) · mini(옆 두 장 중 하나)
function DeckCard({ race, k, n, size, c, onHit, onOpen, actions }) {
  const fmt = useFormat(); const tr = useT();
  const L = fmt.race(race);
  const compact = size === 'mini';
  const live = c.kind === 'live' || c.kind === 'session';
  const a = cardAct({ race, c, fmt, tr, alarmOn: actions.alarms.has(race.id), onCal: () => actions.addAlarm(race), onOpen });
  const credit = photoCredit(race);
  const desk = size !== 'm';
  // 즐겨찾기 수(기준 이상일 때만) · 비 예보(보는 세션 중 하나라도, 진행 중 카드는 빼고)
  useLikes();
  const fav = actions.favorites.has(race.id);
  const lc = likeCount(race, fav);
  const cnt = COUNT_IN_HEART && lc.show ? formatCount(lc.n, fmt.locale) : null;
  const wx = useCardWx(race, actions.preferences, live);
  return (
    <article className={cx('gx-card', `is-${size}`, live && 'is-live')} data-k={k} role="group"
      aria-roledescription={desk ? undefined : tr('home.deck.roledesc')}
      aria-label={!desk && n > 1 ? tr('home.deck.cardAria', { n, k: k + 1, name: L.fullName }) : L.fullName}>
      <Photo className="gx-card-img" src={photo(race, size === 'mini' ? 'card' : 'hero')} pos={photoPos(race)} eager={k === 0} lazy={k > 1} />
      <span className="gx-card-scrim" aria-hidden="true" />
      <button type="button" className="gx-card-hit" {...prefetchHandlers(race)} onClick={() => (onHit ? onHit(k, race) : onOpen())} aria-label={tr('home.openDetail', { name: L.fullName })} />
      {/* 출처는 글자 폭만 누를 수 있고 Tab은 건너뛴다(상세에서도 볼 수 있음) */}
      {credit && <span className="gx-card-credit"><a href={credit.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-label={`${tr('photo.credit', credit)}. ${tr('aria.external')}`}>{tr('photo.credit', credit)}</a></span>}
      <CardHeart on={fav} count={cnt} label={cnt ? tr('aria.saveRaceCount', { name: L.shortName, n: cnt }) : tr('aria.saveRace', { name: L.shortName })} onClick={() => actions.toggleFav(race)} />
      <div className="gx-card-body">
        <div className="gx-card-main">
          <span className="gx-card-tag gx-t13">{live && <LiveText />}<Dot series={race.series} />{joinDot([race.series, getRoundText(race, fmt.locale), race.isSprint ? tr('home.sprintWeekend') : null])}<LikeInline race={race} fav={fav} /></span>
          <span className="gx-card-title">{L.fullName}</span>
          <span className="gx-card-when"><CardWhen race={race} c={c} compact={compact} /></span>
          <WxCardTag w={wx} />
        </div>
        {/* 메인 버튼(CTA)만 — 아래 중계 줄('…에서 중계'·'…에서도 중계')은 넣지 않는다 */}
        {compact
          ? (a.urgent && a.href && <a className="gx-card-link gx-t15" href={a.href} target="_blank" rel="noopener noreferrer" onClick={a.onClick}>{a.full}<Icon n="ext" s={16} /><span className="gx-vh">, {tr('aria.external')}</span></a>)
          : a.btn && <div className="gx-card-side"><div className="gx-card-act">{a.btn}</div></div>}
      </div>
    </article>
  );
}

// 카드 아래 캡션: 관전 포인트 · 현장 줄(현장에 가요를 켠 서킷 맵 경기, 주말 동안만 — HeroSiteRow가 판단). 지금 보는 장의 것만.
function FootItem({ race, cur, now }) {
  const tr = useT();
  return (
    <>
      {cur && <p className="gx-cur gx-t15"><span className="gx-badge">{tr('home.curation')}</span>{cur.text}</p>}
      <HeroSiteRow race={race} now={new Date(now)} />
    </>
  );
}
// 칸 높이는 지금 장에 맞춰 180ms로 바뀐다(빈 장 아래가 비지 않게). 높이는 DOM에 직접 — 상태로 들면 렌더가 한 번 더 돈다.
function DeckFoot({ list, i, now }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current; const it = el?.children[i];
    if (el && it) el.style.height = `${it.offsetHeight}px`;
  });
  return (
    <div className="gx-deck-foot" ref={ref}>
      {list.map(({ race, cur }, k) => <div key={race.id} className={cx('gx-deck-foot-i', k === i && 'is-on')} aria-hidden={k !== i}><FootItem race={race} cur={cur} now={now} /></div>)}
    </div>
  );
}

// 모바일 덱: 스크롤 스냅, 넘기면 점·캡션이 따라온다. ←/→로 장과 포커스가 함께, 점은 Tab 한 번 + 화살표.
// 엿보이는 장을 누르면 먼저 넘긴다. 시간이 흘러 순서가 바뀌어도 보던 경기에 머문다(보던 경기 id를 상태로 기억).
function DeckMobile({ deck, states, curs, openAt, actions, now }) {
  const tr = useT(); const fmt = useFormat();
  const n = deck.length;
  const [viewed, setViewed] = useState(deck[0]?.id ?? null);
  const found = deck.findIndex((r) => r.id === viewed);
  const i = found < 0 ? 0 : found;
  const ref = useRef(null);
  const step = () => { const c = ref.current?.querySelector('.gx-card'); return c ? c.offsetWidth + 12 : 1; };
  const reduce = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  const go = (k, instant) => { const el = ref.current; if (el) el.scrollTo({ left: k * step(), behavior: reduce() || instant ? 'auto' : 'smooth' }); };
  // 순서가 바뀌면(보던 경기가 다른 자리로) 스크롤을 그 자리로 옮긴다
  const order = deck.map((r) => r.id).join('|');
  useLayoutEffect(() => { const el = ref.current; if (el) el.scrollLeft = i * step(); }, [order]); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const k = Math.max(0, Math.min(n - 1, Math.round(el.scrollLeft / step())));
    if (deck[k] && deck[k].id !== viewed) setViewed(deck[k].id);
  };
  // 키보드로 다른 장 안 버튼에 가면 그 장으로 넘긴다
  const onFocus = (e) => { const card = e.target.closest?.('.gx-card'); if (!card) return; const k = Number(card.dataset.k); if (k !== i) go(k); };
  // ←/→: 장을 넘기면서 포커스도 새 장의 같은 자리로
  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const card = e.target.closest?.('.gx-card'); if (!card) return;
    const k = Number(card.dataset.k) + (e.key === 'ArrowRight' ? 1 : -1);
    if (k < 0 || k >= n) return;
    e.preventDefault(); go(k);
    const cls = ['gx-card-hit', 'gx-card-btn', 'gx-card-heart'].find((x) => e.target.classList.contains(x)) || 'gx-card-hit';
    const cards = ref.current?.querySelectorAll('.gx-card');
    (cards?.[k]?.querySelector(`.${cls}`) || cards?.[k]?.querySelector('.gx-card-hit'))?.focus({ preventScroll: true });
  };
  // 옆에 엿보이는 장을 누르면 먼저 그 장으로(바로 열지 않음)
  const onHit = (k, race) => { if (k !== i) go(k); else openAt(k, race); };
  const onDotKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const k = Math.max(0, Math.min(n - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    go(k); e.currentTarget.querySelectorAll('button')[k]?.focus();
  };
  return (
    <section className="gx-deck" aria-roledescription={tr('home.deck.roledesc')} aria-label={tr('home.deck.region')}>
      <div className="gx-deck-track" ref={ref} onScroll={onScroll} onFocus={onFocus} onKeyDown={onKey}>
        {deck.map((race, k) => <DeckCard key={race.id} race={race} k={k} n={n} size="m" c={states[k]} onHit={onHit} onOpen={() => openAt(k, race)} actions={actions} />)}
      </div>
      {n > 1 && (
        <div className="gx-deck-dots" role="group" aria-label={tr('home.deck.dots')} onKeyDown={onDotKey}>
          {deck.map((race, k) => (
            <button key={race.id} type="button" className={k === i ? 'is-on' : undefined} tabIndex={k === i ? 0 : -1} aria-current={k === i ? 'true' : undefined}
              aria-label={tr('home.deck.dot', { k: k + 1, name: fmt.race(race).shortName })} onClick={() => go(k)}><i /></button>
          ))}
        </div>
      )}
      <DeckFoot list={deck.map((race, k) => ({ race, cur: curs[k] }))} i={i} now={now} />
    </section>
  );
}

// 데스크톱 덱: 큰 장 + 옆 장(두 장까지). 옆 장보다 경기가 많으면 '이번 주말 경기 모두 보기'. 관전 포인트는 큰 장만(결정 7).
function DeckDesktop({ deck, states, curs, openAt, actions, onGo, now }) {
  const tr = useT();
  const [r, ...others] = deck;
  const side = others.slice(0, 2);
  const more = others.length - side.length;
  return (
    <section className="gx-deck" aria-label={tr('home.deck.region')}>
      <div className={cx('gx-deck-grid', !side.length && 'is-one')}>
        <DeckCard race={r} k={0} n={deck.length} size="main" c={states[0]} onOpen={() => openAt(0, r)} actions={actions} />
        {side.length > 0 && (
          <div className="gx-deck-side">
            {side.map((x, k) => <DeckCard key={x.id} race={x} k={k + 1} n={deck.length} size={side.length > 1 ? 'mini' : 'side'} c={states[k + 1]} onOpen={() => openAt(k + 1, x)} actions={actions} />)}
          </div>
        )}
      </div>
      <div className="gx-deck-dfoot">
        <div className="gx-deck-dfoot-l"><FootItem race={r} cur={curs[0]} now={now} /></div>
        {more > 0 && <button type="button" className="gx-textbtn gx-t15" onClick={() => onGo('schedule')}>{tr('home.deck.allThisWeekend')}<Icon n="chev" s={16} /></button>}
      </div>
    </section>
  );
}

// ---------- 내 주말 시간표 ----------
// 홈 시간표는 TimelineList.jsx(일정 목록). 여기는 온보딩 미리보기 줄만 — 누르지 않는 줄, 상태 글자 없음
function PreviewRow({ it }) {
  const fmt = useFormat();
  const { s, r } = it;
  return (
    <div className="gx-row gx-tl-row is-static">
      <span className="gx-tl-time"><b className="gx-t17">{fmt.time(it.at)}</b></span>
      <span className="gx-row-c">
        <span className={cx('gx-row-t gx-t17', s.kind === 'race' && 'gx-w600')}>{fmt.sessionLabel(s)}</span>
        <span className="gx-row-s gx-t13"><Dot series={r.series} />{joinDot([r.series, fmt.race(r).shortName])}</span>
      </span>
    </div>
  );
}

// 온보딩 미리보기(SPEC 7장): 홈과 같은 시간표 줄을 날짜별로, 누르지 않는 모양으로
export function PreviewDays({ plan, now }) {
  const fmt = useFormat();
  return (
    <>
      {plan.days.map((d) => {
        const head = fmt.dayHead(d.items[0].at, now);
        return (
          <div key={d.key} className="gx-tl-day">
            <div className="gx-tl-dh"><span className="gx-t15 gx-w600">{head.main}</span><span className="gx-t13 gx-ter">{head.sub}</span></div>
            {d.items.map((it) => <PreviewRow key={`${it.r.id}-${it.s.tEn}-${it.at}`} it={it} />)}
          </div>
        );
      })}
    </>
  );
}

// ---------- 지난 주말 결과 · 추천 · 이후 일정 ----------
function LastResult({ race, data, onOpen }) {
  const fmt = useFormat(); const tr = useT();
  const res = resultOf(data, race);
  const top = (res?.gp || []).filter((x) => ['1', '2', '3'].includes(String(x.pt))).slice(0, 3);
  if (!top.length) return null;
  const L = fmt.race(race);
  const list = top.map((x, i) => `${tr('home.last.pos', { n: i + 1 })} ${x.family}`).join(', ');
  return (
    <section aria-labelledby="gx-last-h">
      <ListHeader id="gx-last-h" title={tr('home.last.title')} action={tr('home.last.more')} onAction={onOpen} />
      <button type="button" className="gx-podium" onClick={onOpen} aria-label={tr('home.last.aria', { name: L.fullName, list })}>
        <span className="gx-stag gx-t13"><Dot series={race.series} />{joinDot([race.series, getRoundText(race, fmt.locale), L.shortName])}</span>
        <span className="gx-pod-grid" aria-hidden="true">
          {top.map((x, i) => (
            <span className="gx-pod-col" key={x.code}>
              {/* 1·2·3위 사진 원은 같은 크기(56) */}
              <span className="gx-pod-av"><Avatar src={photoOf(data, x.code)} code={x.code} size={56} team={x.c} /></span>
              <span className="gx-t13 gx-sub">{i === 0 ? tr('home.last.winner') : tr('home.last.pos', { n: i + 1 })}</span>
              <span className="gx-t15 gx-w600 gx-pod-name">{x.family}</span>
              <span className="gx-t13 gx-sub gx-pod-team"><i className="gx-team-dot" style={{ background: x.c ? teamColor(x.c) : 'var(--text4)' }} />{x.team}</span>
            </span>
          ))}
        </span>
      </button>
    </section>
  );
}

// 놓치면 아쉬운 경기: 안 보는 시리즈 추천 1개. '…도 챙겨 보기'를 누르면 이 화면에 있는 동안 '✓ … 담았어요'로 고정 + 되돌리기.
function Discover({ pick, preferences, setSeriesMode, onOpen, now }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const [added, setAdded] = useState(null);   // 누른 추천(이 화면에 있는 동안)
  const d = added || pick;
  // 계측: 보이는 카드가 바뀔 때만 1회. 담은 뒤(고정된 동안)에는 추천이 바뀌어도 화면에 보이지 않으니 세지 않는다
  const shownRef = useRef(null);
  const pickId = pick?.race?.id ?? null;
  const fixed = !!added;
  useEffect(() => {
    if (fixed || !pick || shownRef.current === pickId) return;
    shownRef.current = pickId;
    track('recommendation_shown', { series: pick.race.series, reason_kinds: pick.kinds || [], score: pick.score, rank: 0 });
  }, [pickId, fixed]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return null;
  const r = d.race; const s = r.series; const done = !!added;
  const raceWord = tr(s === 'WRC' ? 'raceWord.WRC' : 'raceWord.race');
  // 소개 문장이 이미 '아직 안 보고 있어요'라고 하니 같은 이유는 한 번만
  const why = (d.reasons || []).filter((x) => x && x !== tr('rec.offSeries'));
  const add = () => {
    const from = modeOf(preferences, s);
    track('series_mode_changed', { series: s, from, to: 'race' });
    setSeriesMode?.(s, 'race');
    setAdded(d);
    shell.toast(tr('home.discover.toast', { series: s, raceWord }), {
      label: tr('toast.undo'),
      fn: () => { track('series_mode_changed', { series: s, from: 'race', to: from }); setSeriesMode?.(s, from); setAdded(null); },
    });
  };
  const main = getPrimarySession(r);
  return (
    <section aria-labelledby="gx-disc-h">
      <ListHeader id="gx-disc-h" title={tr('home.discover')} />
      <div className="gx-disc">
        <p className="gx-disc-intro gx-t15">{done ? tr('home.discover.addedIntro', { series: s, raceWord }) : tr('home.discover.intro', { series: s, desc: tr(SERIES_DESCRIPTION_KEYS[s]) })}</p>
        <RaceRow race={r} now={now} onOpen={() => { track('recommendation_clicked', { series: s, position: 0 }); onOpen(r, 'recommendation'); }}
          meta={joinDot([main ? fmt.sessionLabel(main) : raceWord, getRoundText(r, fmt.locale)])} />
        {why.length > 0 && <ul className="gx-why gx-t15" aria-label={tr('home.discover.whyAria')}>{why.map((x) => <li key={x}><Icon n="check" s={16} />{x}</li>)}</ul>}
        {done
          ? <button type="button" className="gx-btn is-done" aria-disabled="true"><Icon n="check" s={20} />{tr('home.discover.added', { series: s, raceWord })}</button>
          : <button type="button" className="gx-btn" onClick={add}><Icon n="plus" s={20} />{tr('home.discover.follow', { series: s, raceWord })}</button>}
      </div>
    </section>
  );
}

// 이후 일정: 왼쪽 달력 한 장(달 + 날짜, 같은 날이 이어지면 첫 줄에만) · 이름 · 시리즈·라운드·요일 · 오른쪽 시각 + 상대 날짜
function Later({ list, now, dimOf, onOpen, onGo, preferences }) {
  const fmt = useFormat(); const tr = useT();
  useWeather();
  const ref = useRef(null);
  useVisiblePrefetch(ref, list);
  if (!list.length) return null;
  const whenOf = (r) => msOf(getPrimarySession(r)?.startUtc) ?? msOf(r.primaryStartUtc);
  return (
    <section aria-labelledby="gx-later-h" ref={ref}>
      <ListHeader id="gx-later-h" title={tr('home.upNext')} action={tr('schedule.viewAll')} onAction={() => onGo('schedule')} />
      {list.map((r, i) => {
        const t = whenOf(r); const p = t != null ? fmt.parts(t) : null;
        const pt = i > 0 ? whenOf(list[i - 1]) : null;
        const same = p && pt != null && fmt.dateKey(t) === fmt.dateKey(pt);
        const timed = msOf(getPrimarySession(r)?.startUtc) != null;
        return (
          <button type="button" key={r.id} data-prefetch-index={i} {...prefetchHandlers(r)} className={cx('gx-row gx-later', dimOf(r) && 'is-dim')} onClick={() => onOpen(r)}>
            <span className="gx-leaf" aria-hidden="true">{same ? null : p ? <><span className="gx-t13 gx-sub">{p.monthShort}</span><b className="gx-t20">{Number(p.day)}</b></> : <span className="gx-t13 gx-ter">{tr('status.tba')}</span>}</span>
            <span className="gx-row-c">
              <span className="gx-row-t gx-t17 gx-w600">{fmt.race(r).shortName}</span>
              <span className="gx-row-s gx-t13"><Dot series={r.series} />{joinDot([r.series, getRoundText(r, fmt.locale), t != null ? fmt.weekday(t) : null])}<WxInline w={wxOfRace(r, preferences)} /></span>
            </span>
            <span className="gx-row-r"><span className="gx-t15 gx-w600">{timed ? fmt.time(t) : tr('status.tba')}</span><span className="gx-t13 gx-sub">{t != null ? fmt.relDay(t, now) : ''}</span></span>
          </button>
        );
      })}
    </section>
  );
}

function Empty({ onGo }) {
  const tr = useT();
  return (
    <div className="gx-empty">
      <span className="gx-empty-ic"><Icon n="flag" s={28} /></span>
      <b className="gx-t20">{tr('home.empty.title')}</b>
      <p className="gx-t15 gx-sub">{tr('home.empty.body')}</p>
      <button type="button" className="gx-btn is-weak" onClick={() => onGo('schedule')}>{tr('home.empty.cta')}</button>
    </div>
  );
}

// ---------- 홈 본체 ----------
function HomeView({ now, races, myRaces, preferences, favorites, toggleFav, onOpenRace, onGo, setSeriesMode }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const alarms = useAlarms();   // 상세에서 담아도 카드가 바로 '담았어요'가 된다 (alarm.js가 알린다)
  useLikes();                   // 즐겨찾기 수가 도착하면 '많이 담은 경기'를 다시 짠다
  const results = useF1Results(true);
  const minute = Math.floor(msOf(now) / 60000) * 60000;   // 홈은 분 단위로 다시 짠다
  const plan = useMemo(() => buildHomePlan(races || [], {
    preferences, favorites, now: minute, timeZone: fmt.timeZone, hasResults: (r) => !!resultOf(results, r),
  }), [races, preferences, favorites, minute, fmt.timeZone, results]);
  const hl = useMemo(() => homeHeadline(plan, minute, { locale: fmt.locale, timeZone: fmt.timeZone, races: plan.mine }), [plan, minute, fmt.locale, fmt.timeZone]);
  const deck = plan.deck;
  const states = useMemo(() => deck.map((r) => getCardState(r, minute, preferences)), [deck, minute, preferences]);
  const curs = useMemo(() => deck.map((r) => curationOf(r, fmt.locale)), [deck, fmt.locale]);
  const mineIds = useMemo(() => new Set((myRaces || []).map((r) => r.id)), [myRaces]);
  const dimOf = useCallback((r) => modeOf(preferences, r.series) === 'off', [preferences]);

  // 첫 장 사진(상세 헤더용 'card')을 미리 받는다
  const heroId = plan.hero?.id ?? null;
  useEffect(() => { if (plan.hero) prefetchRacePhoto(plan.hero, { priority: 'low' }); }, [heroId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 덱 카드 열기: 첫 장에만 hero_phase·hero_curation(지금 히어로와 같은 뜻), 둘째 장부터는 source home만
  const openAt = useCallback((k, race) => {
    if (k === 0) onOpenRace(race, 'home', { hero_phase: plan.phase?.phase ?? null, hero_curation: curs[0]?.kind ?? null });
    else onOpenRace(race, 'home');
  }, [onOpenRace, plan.phase, curs]);
  const open = useCallback((race, source = 'home') => onOpenRace(race, source), [onOpenRace]);

  // 카드의 하트(스낵바 + 되돌리기)·캘린더(L7: 두 번째부터는 같은 파일 다시 받기)
  const actions = {
    favorites, alarms, preferences,
    toggleFav: (race) => {
      const had = favorites.has(race.id);
      toggleFav(race.id);
      shell.toast(tr(had ? 'toast.unsaved' : 'toast.saved'), { label: tr('toast.undo'), fn: () => toggleFav(race.id) });
    },
    addAlarm: (race) => {
      const res = toggleAlarm(race, { source: 'hero', preferences, locale: fmt.locale, now: new Date(minute) });
      shell.toast(tr(res?.again ? 'toast.calAgain' : 'toast.calAdded'));
    },
  };

  // 지난 주말 결과: 끝난 지 48시간 안이면 덱 바로 아래, 아니면 시간표 아래
  const lastEnd = plan.last ? getRaceEnd(plan.last)?.getTime() : null;
  const freshLast = lastEnd != null && minute - lastEnd < 48 * HOUR_MS;
  // 놓치면 아쉬운 경기: 관심 밖(즐겨찾기도 아닌) 아직 안 끝난 경기에서 추천 엔진 점수 1등
  const pick = useMemo(() => {
    const pool = (races || []).filter((r) => !mineIds.has(r.id) && !isCancelled(r) && isAliveState(resolveTimeState(r, minute).state));
    return getRecommendations(pool, preferences, new Date(minute), 1, fmt.locale)[0] || null;
  }, [races, mineIds, preferences, minute, fmt.locale]);

  const last = plan.last ? <LastResult race={plan.last} data={results} onOpen={() => open(plan.last)} /> : null;
  const timeline = <TimelineList plan={plan} now={minute} columns={shell.desktop} dimOf={dimOf} onOpen={open} onMore={() => shell.openSettings()} />;
  const disc = pick ? <Discover pick={pick} preferences={preferences} setSeriesMode={setSeriesMode} onOpen={open} now={minute} /> : null;
  const later = <Later list={plan.later} now={minute} dimOf={dimOf} onOpen={open} onGo={onGo} preferences={preferences} />;
  // 많이 담은 경기: 이번·다음 주말, 기준을 넘은 것만 최대 3개. 없으면 섹션째 없다
  const popList = popularRaces(races, favorites, minute, { isAlive: (r) => isAliveState(resolveTimeState(r, minute).state) });
  const popular = popList.length ? <Popular list={popList} onOpen={open} preferences={preferences} /> : null;
  const head = (
    <div className="gx-home-top">
      <h1 className={shell.desktop ? 'gx-t30' : 'gx-t26'} data-view-title tabIndex={-1}><Roll>{hl.title}</Roll></h1>
    </div>
  );

  if (shell.desktop) {
    return (
      <div className="gx-home home is-desk">
        {demoClock.enabled && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><DemoClock /></div>}
        {head}
        {plan.hero ? <DeckDesktop deck={deck} states={states} curs={curs} openAt={openAt} actions={actions} onGo={onGo} now={minute} /> : <Empty onGo={onGo} />}
        <div className="gx-dhome-grid">
          <div className="gx-dhome-main">{timeline}</div>
          <aside className="gx-rail" aria-label={tr('home.railAria')}>
            {last && <div className="gx-rail-card">{last}</div>}
            {popular && <div className="gx-rail-card">{popular}</div>}
            {disc && <div className="gx-rail-card">{disc}</div>}
            {plan.later.length > 0 && <div className="gx-rail-card">{later}</div>}
          </aside>
        </div>
      </div>
    );
  }
  return (
    <div className="gx-home home">
      <header className="gx-home-bar gx-appbar">
        <GantryLockup height={13} />
        <span className="gx-bar-r"><DemoClock /><GearBtn onClick={() => onGo('settings')} /></span>
      </header>
      {head}
      {plan.hero ? <DeckMobile deck={deck} states={states} curs={curs} openAt={openAt} actions={actions} now={minute} /> : <Empty onGo={onGo} />}
      {freshLast && last && <><Band />{last}</>}
      {plan.days.length > 0 && <><Band />{timeline}</>}
      {popular && <><Band />{popular}</>}
      {!freshLast && last && <><Band />{last}</>}
      {disc && <><Band />{disc}</>}
      {plan.later.length > 0 && <><Band />{later}</>}
    </div>
  );
}

// App의 1초 setNow로 홈이 통째로 리렌더되지 않도록 now는 분 단위로만 비교한다.
// 초 단위 갱신은 진행 중 칸(CardWhen)과 데모 시계가 자기 안에서 한다.
export const Home = memo(HomeView, (prev, next) => {
  for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
    if (key === 'now') { if (!sameMinute(prev.now, next.now)) return false; continue; }
    if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
});
