// 일정(UX v2 SPEC 2장): 제목 + 남은 경기 수 · 목록/달력(처음은 달력) · 칩(위에 붙음).
// 목록은 주 묶음(이번 주말·다음 주말·날짜 범위), 왼쪽 날짜 줄, 지난 경기는 접기. 모바일 달력은 점 + 고른 날 패널,
// 데스크톱은 큰 달력(또는 목록) + 오른쪽 레일(작은 달력·날짜 패널). 고른 보기·칩·달·고른 날은 탭을 옮겨도 메모리로 기억한다.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './screens2.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { useShell } from '../shell/context.js';
import { useMem } from './use-mem.js';
import { dayOf, partsOfDay, noonOfDay, raceSpan, interestRank, sessionsOnDay, sessionStateAt, dayRank, isOver, rowTime } from './day-model.js';
import { getRoundText, getPrimarySession } from '../schedule/utils.js';
import { findNextRace, getRaceState, isCancelled } from '../home/time.js';
import { groupRaceWeeks, getWeekName } from '../home/weeks.js';
import { getCategoryForSeries } from '../schedule/constants.js';
import { Icon } from '../ui2/Icon.jsx';
import { Dot, Chip, Seg, StateText, RaceRow, LiveText, GearBtn } from '../ui2/parts.jsx';
import { joinDot } from '../ui2/hooks.js';

const CATS = ['F1', 'ENDURANCE', 'WRC', 'GTWC'];
const msOf = (v) => (v ? new Date(v).getTime() : null);
const cx = (...list) => list.filter(Boolean).join(' ');
const viewModeOf = (preferences, s) => (preferences?.series?.[s] === 'all' ? 'all' : 'race');
const reduceMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
// 스크롤 상자: 모바일 셸의 탭 화면 상자([data-scroll]), 데스크톱은 문서
const scrollerOf = (el) => el?.closest('[data-scroll]') || document.scrollingElement;
const topIn = (el, sc) => (sc === document.scrollingElement ? el.getBoundingClientRect().top : el.getBoundingClientRect().top - sc.getBoundingClientRect().top);

// ---------- 목록 ----------
function SchedRow({ race, now, today, onOpen, showDate, isNext, mode }) {
  const fmt = useFormat(); const tr = useT();
  const L = fmt.race(race);
  const cancelled = isCancelled(race);
  const st = getRaceState(race, now);
  const start = getPrimarySession(race)?.startUtc || null;
  const day = start ? dayOf(start, fmt.timeZone) : null;
  const p = day != null ? partsOfDay(day) : null;
  const isToday = day != null && day === today;
  const t = rowTime(race, now);
  return (
    <button type="button" className={cx('gx-row gx-srow', (st === 'done' || cancelled) && 'is-dim')} onClick={() => onOpen(race)}>
      {/* 날짜 칸: 같은 날이 이어지면 비우고, 날짜가 없는 취소 경기는 '—'(윗줄과 같은 날로 읽히지 않게) */}
      <span className={cx('gx-date', isToday && 'is-today')} aria-hidden="true">
        {showDate ? (p ? <><b className="gx-t20">{p.d}</b><span className={`gx-t13 gx-dow-${p.dow}`}>{isToday ? tr('time.today') : fmt.weekdayNames[p.dow]}</span></> : <b className="gx-t17 gx-ter">—</b>) : null}
      </span>
      <span className="gx-row-c">
        <span className={cx('gx-row-t gx-t17 gx-w600', cancelled && 'gx-strike')}>{start && <span className="gx-vh">{fmt.dayDate(start)} </span>}{L.shortName}</span>
        <span className="gx-row-s gx-t13"><Dot series={race.series} />{joinDot([race.series, getRoundText(race, fmt.locale), L.city])}</span>
      </span>
      <span className="gx-row-r">
        {cancelled
          ? <><span className="gx-t15 gx-w600">{tr('status.cancelledDate')}</span><span className="gx-t13"><StateText race={race} now={now} /></span></>
          : <><span className="gx-t15 gx-w600">{t ? fmt.time(t) : tr('status.cancelledDate')}</span><span className="gx-t13"><StateText race={race} now={now} isNext={isNext} mode={mode} /></span></>}
      </span>
    </button>
  );
}

function WeekList({ races, now, today, preferences, onOpen, showPast, setShowPast, listRef }) {
  const fmt = useFormat(); const tr = useT();
  const groups = useMemo(() => groupRaceWeeks(races, { timeZone: fmt.timeZone }), [races, fmt.timeZone]);
  const isPastGroup = (g) => g.races.every((r) => isOver(r, now));
  const past = groups.filter(isPastGroup); const rest = groups.filter((g) => !isPastGroup(g));
  // 지난 경기 수는 취소를 빼고 센다(시리즈 화면과 같은 기준)
  const pastCount = past.reduce((a, g) => a + g.races.filter((r) => !isCancelled(r)).length, 0);
  const shown = showPast ? [...past, ...rest] : rest;
  const next = findNextRace(races, now);
  // 펼치거나 접어도 보던 자리(이번 주말)는 화면에서 그대로 — 위로 올리면 가장 최근 주말부터
  const ref = useRef(null); const anchor = useRef(null);
  const toggle = () => {
    const el = ref.current?.querySelector('[data-first-rest]'); const sc = scrollerOf(ref.current);
    if (el && sc) anchor.current = { sc, y: topIn(el, sc) };
    setShowPast(!showPast);
  };
  useLayoutEffect(() => {
    const a = anchor.current; if (!a) return;
    anchor.current = null;
    const el = ref.current?.querySelector('[data-first-rest]');
    if (el) a.sc.scrollTop += topIn(el, a.sc) - a.y;
  }, [showPast]);
  const toggleBtn = (
    <button type="button" className="gx-past-toggle gx-t15" onClick={toggle} aria-expanded={showPast}>
      <Icon n={showPast ? 'up' : 'down'} s={20} /><span>{showPast ? tr('schedule.pastHide') : tr('schedule.pastShow', { n: pastCount })}</span>
    </button>
  );
  return (
    <div className="gx-wklist" ref={(el) => { ref.current = el; if (listRef) listRef.current = el; }}>
      {pastCount > 0 && toggleBtn}
      {shown.map((g, gi) => {
        const wn = getWeekName(g, now, { locale: fmt.locale, timeZone: fmt.timeZone, races });
        let prevDay = null;
        const n = g.races.filter((r) => !isCancelled(r)).length; const nc = g.races.length - n;
        // 이번·다음 주말이 아니면 머리 옆 상대 날짜는 그 주 첫 경기 시각 기준(줄의 '3주 뒤'와 맞게)
        const firstStart = g.races.map((r) => msOf(getPrimarySession(r)?.startUtc)).filter((x) => x != null).sort((a, b) => a - b)[0];
        const sub = wn.kind ? wn.sub : (firstStart != null ? fmt.relDay(firstStart, now) : wn.sub);
        const a = g.from ? dayOf(g.from, fmt.timeZone) : null; const b = g.to ? dayOf(g.to, fmt.timeZone) : null;
        return (
          <div key={g.weekKey} style={{ display: 'contents' }}>
            <section className="gx-wk" data-first-rest={g === rest[0] ? '' : undefined} aria-labelledby={`gx-wk-${g.weekKey}`} data-a={a ?? ''} data-b={b ?? ''}>
              <h2 className="gx-wk-head" id={`gx-wk-${g.weekKey}`} data-stick=""><b className="gx-t17">{wn.main}</b><span className="gx-t13 gx-ter">{joinDot([sub, n ? tr('schedule.wkCount', { n }) : null, nc ? tr('schedule.wkCancelled', { n: nc }) : null])}</span></h2>
              {g.races.map((r) => {
                const st = getPrimarySession(r)?.startUtc;
                const d = st ? dayOf(st, fmt.timeZone) : r.id;
                const show = d !== prevDay; prevDay = d;
                return <SchedRow key={r.id} race={r} now={now} today={today} onOpen={onOpen} showDate={show} isNext={r === next} mode={viewModeOf(preferences, r.series)} />;
              })}
            </section>
            {/* 펼친 지난 목록 끝(이번 주말 바로 위)에도 접기 */}
            {showPast && gi === past.length - 1 && rest.length > 0 && toggleBtn}
          </div>
        );
      })}
      {!shown.length && (
        <div className="gx-empty-end">
          <p className="gx-t15 gx-sub">{tr('schedule.seriesOver', { year: new Date(now).getFullYear() })}</p>
          {pastCount > 0 && <button type="button" className="gx-btn is-weak" onClick={toggle}>{tr('schedule.pastShow', { n: pastCount })}</button>}
        </div>
      )}
    </div>
  );
}

// ---------- 달력 ----------
// 달 머리: 이전·다음 달(데이터가 있는 해 안), 'YYYY년 M월'
function MonthHead({ month, canPrev, canNext, onPrev, onNext }) {
  const fmt = useFormat(); const tr = useT();
  const title = fmt.monthTitle(Date.UTC(month[0], month[1] - 1, 15));
  return (
    <div className="gx-cal-head">
      <button type="button" className="gx-iconbtn" aria-label={tr('schedule.prevMonth')} onClick={onPrev} disabled={!canPrev}><Icon n="back" s={20} /></button>
      <b className="gx-t17" aria-live="polite">{title}</b>
      <button type="button" className="gx-iconbtn" aria-label={tr('schedule.nextMonth')} onClick={onNext} disabled={!canNext}><Icon n="chev" s={20} /></button>
    </div>
  );
}
// 칸 이름: '11월 8일 일요일, 경기 2개, 그중 취소 1개'
function dayAria(fmt, tr, day, today, list) {
  const nc = list.filter((r) => isCancelled(r)).length;
  return tr('schedule.dayAria', {
    date: `${fmt.dayDateNoDow(noonOfDay(day, fmt.timeZone))} ${fmt.weekday(noonOfDay(day, fmt.timeZone))}`,
    today: day === today ? tr('schedule.dayAria.today') : '',
    n: list.length,
    cancelled: nc ? tr('schedule.dayAria.cancelled', { n: nc }) : '',
  });
}
function monthCells(month) {
  const [y, m] = month;
  const first = Math.floor(Date.UTC(y, m - 1, 1) / 86400000);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const startDow = partsOfDay(first).dow;
  return { first, n, startDow };
}

// 모바일·작은 달력: 점(최대 3, 넘치면 2 + '+N'), 취소는 빈 점, 오늘은 옅은 원, 고른 날은 채운 원, 지난 날은 흐리게.
// 키보드: 고른 날에만 Tab, 화살표로 날짜 이동(달 끝을 넘으면 달도). 폰은 좌우로 밀어 달을 넘긴다.
function MonthCal({ byDay, month, nav, sel, setSel, today, small }) {
  const fmt = useFormat(); const tr = useT();
  const { first, n, startDow } = monthCells(month);
  const cells = [...Array(startDow).fill(null), ...Array.from({ length: n }, (_, i) => first + i)];
  const grid = useRef(null);
  const onKey = (e) => {
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!d) return;
    e.preventDefault();
    if (nav.moveDay(sel + d)) requestAnimationFrame(() => grid.current?.querySelector('.gx-mcal-d.is-sel')?.focus());
  };
  const sw = useRef(null); const swiped = useRef(false);
  return (
    <div className={cx('gx-mcal', small && 'is-small')}>
      <MonthHead month={month} canPrev={nav.canPrev} canNext={nav.canNext} onPrev={() => nav.step(-1)} onNext={() => nav.step(1)} />
      <div className="gx-mcal-grid" role="group" aria-label={fmt.monthTitle(Date.UTC(month[0], month[1] - 1, 15))} ref={grid} onKeyDown={onKey}
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') sw.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          const o = sw.current; sw.current = null; if (!o) return;
          const dx = e.clientX - o.x;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - o.y) * 1.5) {
            swiped.current = true; setTimeout(() => { swiped.current = false; }, 350);
            nav.step(dx < 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => { sw.current = null; }}
        onClickCapture={(e) => { if (swiped.current) { swiped.current = false; e.stopPropagation(); e.preventDefault(); } }}>
        {fmt.weekdayNames.map((d, i) => <span key={d} className={`gx-mcal-dow gx-t13 gx-dow-${i}`} aria-hidden="true">{d}</span>)}
        {cells.map((k, i) => {
          if (k == null) return <span key={`e${i}`} />;
          const list = byDay.get(k) || []; const p = partsOfDay(k);
          const many = list.length > 3;
          return (
            <button type="button" key={k} className={cx('gx-mcal-d', k === today && 'is-today', k === sel && 'is-sel', list.length && 'has', k < today && 'is-past')}
              tabIndex={k === sel ? 0 : -1} onClick={() => setSel(k)} aria-pressed={k === sel} aria-label={dayAria(fmt, tr, k, today, list)}>
              <span className={`gx-t15 gx-dow-${p.dow}`}>{p.d}</span>
              <span className="gx-mcal-dots">
                {list.slice(0, many ? 2 : 3).map((r) => <i key={r.id} className={cx('gx-dot', `s-${r.series}`, isCancelled(r) && 'is-hollow')} />)}
                {many && <span className="gx-mcal-more">+{list.length - 2}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 데스크톱 큰 달력: 칸 전체가 날짜, 주말 전체를 잇는 막대(관심 순 3줄, 넘치면 '+N' 버튼), 다음 주로 넘어간 조각에도 이름
function BigCal({ spans, month, nav, sel, setSel, today, onOpen }) {
  const fmt = useFormat(); const tr = useT();
  const { first, n, startDow } = monthCells(month);
  const weeks = []; let cur = Array(startDow).fill(null);
  for (let d = 0; d < n; d++) { cur.push(first + d); if (cur.length === 7) { weeks.push(cur); cur = []; } }
  if (cur.length) { while (cur.length < 7) cur.push(null); weeks.push(cur); }
  const grid = useRef(null);
  const onKey = (e) => {
    if (!e.target.classList?.contains('gx-bcal-d')) return;
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!d) return;
    e.preventDefault();
    if (nav.moveDay(sel + d)) requestAnimationFrame(() => grid.current?.querySelector('.gx-bcal-d.is-sel')?.focus());
  };
  const LANES = 3;
  return (
    <div className="gx-bcal">
      <MonthHead month={month} canPrev={nav.canPrev} canNext={nav.canNext} onPrev={() => nav.step(-1)} onNext={() => nav.step(1)} />
      <div className="gx-bcal-dows" aria-hidden="true">{fmt.weekdayNames.map((d, i) => <span key={d} className={`gx-t13 gx-dow-${i}`}>{d}</span>)}</div>
      <div ref={grid} onKeyDown={onKey} role="group" aria-label={fmt.monthTitle(Date.UTC(month[0], month[1] - 1, 15))}>
        {weeks.map((w, wi) => {
          const ws = w.find((x) => x != null); const we = [...w].reverse().find((x) => x != null);
          // 칸이 모자라면 관심 수준이 높은 경기부터, 같으면 먼저 시작하는 경기·긴 경기부터
          const inW = spans.filter((s) => s.b >= ws && s.a <= we).sort((p, q) => p.w - q.w || p.a - q.a || (q.b - q.a) - (p.b - p.a));
          const occ = []; const placed = [];
          for (const s of inW) {
            const sa = Math.max(s.a, ws); const sb = Math.min(s.b, we); let l = 0;
            while (occ[l] && occ[l].some(([x, z]) => x <= sb && sa <= z)) l++;
            (occ[l] = occ[l] || []).push([sa, sb]); placed.push({ ...s, sa, sb, l });
          }
          const off = w.indexOf(ws);
          const hidden = (k) => placed.filter((q) => q.l >= LANES && q.sa <= k && k <= q.sb).length;
          return (
            <div className="gx-bcal-week" key={wi}>
              <div className="gx-bcal-days">
                {w.map((k, i) => {
                  if (k == null) return <span key={`e${i}`} className="gx-bcal-blank" />;
                  const p = partsOfDay(k);
                  const on = placed.filter((q) => q.sa <= k && k <= q.sb).map((q) => q.r);
                  return (
                    <button type="button" key={k} className={cx('gx-bcal-d', k === today && 'is-today', k === sel && 'is-sel', k < today && 'is-past')}
                      tabIndex={k === sel ? 0 : -1} onClick={() => setSel(k)} aria-pressed={k === sel} aria-label={dayAria(fmt, tr, k, today, on)}>
                      <span className={`gx-t15 gx-dow-${i}`}>{p.d}</span>
                    </button>
                  );
                })}
              </div>
              <div className="gx-bcal-bars">
                {placed.filter((q) => q.l < LANES).map((q) => {
                  const name = fmt.race(q.r).shortName; const cancelled = isCancelled(q.r);
                  return (
                    <button type="button" key={q.r.id} tabIndex={-1} className={cx('gx-bcal-bar', `bar-${q.r.series}`, cancelled && 'is-cancelled', q.b < today && 'is-past')}
                      title={name} aria-label={cancelled ? tr('schedule.barCancelled', { name }) : name}
                      style={{ gridColumn: `${off + (q.sa - ws) + 1} / span ${q.sb - q.sa + 1}`, gridRow: q.l + 1 }} onClick={() => onOpen(q.r)}>
                      <span className="gx-t13 gx-w600" aria-hidden="true">{name}</span>
                    </button>
                  );
                })}
                {w.map((k, i) => {
                  if (k == null) return null;
                  const more = hidden(k);
                  return more ? (
                    <button type="button" key={`m${k}`} tabIndex={-1} className="gx-bcal-more gx-t13" style={{ gridColumn: i + 1, gridRow: LANES + 1 }} onClick={() => setSel(k)}
                      aria-label={tr('schedule.moreAria', { date: fmt.dayDateNoDow(noonOfDay(k, fmt.timeZone)), n: more })}>+{more}</button>
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 고른 날의 경기: 진행 중 → 곧 → 끝남 순, 오른쪽은 지금 보는 세션 → 다음 세션('3시간 뒤') → 종료
function DayPanel({ races, sel, now, onOpen, panelRef }) {
  const fmt = useFormat(); const tr = useT();
  const list = races.filter((r) => r.span && r.span[0] <= sel && sel <= r.span[1])
    .map((r) => [r, dayRank(r, sel, now, fmt.timeZone)]).sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1]).map((x) => x[0]);
  const noon = noonOfDay(sel, fmt.timeZone);
  const MAXS = 3;
  return (
    <section className="gx-daypanel" aria-label={tr('schedule.dayPanelAria')} ref={panelRef} aria-live="polite">
      <h2 className="gx-wk-head"><b className="gx-t17">{tr('schedule.dayPanelHead', { date: fmt.dayDate(noon) })}</b><span className="gx-t13 gx-ter">{fmt.relDay(noon, now)}</span></h2>
      {list.length ? list.map((r) => {
        const ss = sessionsOnDay(r, sel, fmt.timeZone);
        const live = ss.find((s) => sessionStateAt(r, s, now) === 'live');
        const nxt = live || ss.find((s) => sessionStateAt(r, s, now) === 'upcoming');
        const f = nxt || ss[ss.length - 1];
        const labels = ss.map((s) => fmt.sessionLabel(s));
        const meta = ss.length
          ? (labels.length > MAXS ? tr('schedule.sessionsMore', { list: labels.slice(0, MAXS).join(tr('list.sep')), n: labels.length - MAXS }) : labels.join(tr('list.sep')))
          : (isCancelled(r) ? null : tr('schedule.noSessions'));
        const at = new Date(now).getTime();
        const right = isCancelled(r) ? undefined : f ? <>
          <span className="gx-t15 gx-w600">{fmt.time(f.startUtc)}</span>
          {live ? <span className="gx-t13"><LiveText /></span>
            : nxt ? (msOf(nxt.startUtc) - at < 12 * 3600000 ? <span className="gx-t13 gx-sub">{fmt.relShort(nxt.startUtc, now)}</span> : nxt !== ss[0] ? <span className="gx-t13 gx-sub gx-ell">{fmt.sessionLabel(nxt)}</span> : <span />)
              : <span className="gx-t13 gx-ter">{tr('status.done')}</span>}
        </> : <span />;
        return <RaceRow key={r.id} race={r} now={now} onOpen={onOpen} meta={meta} right={right} />;
      }) : <p className="gx-empty-line gx-t15">{tr('schedule.noRaces')}</p>}
    </section>
  );
}

// ---------- 화면 ----------
export function ScheduleScreen({ races = [], now, onOpenRace, preferences, seasonYear }) {
  const fmt = useFormat(); const tr = useT(); const shell = useShell();
  const desktop = shell.desktop;
  const at = new Date(now).getTime();
  const tz = fmt.timeZone;
  const today = dayOf(at, tz);
  const year = Number.isFinite(seasonYear) ? seasonYear : partsOfDay(today).y;
  const tp = partsOfDay(today);

  const all = useMemo(() => races.map((r) => ({ ...r, span: raceSpan(r, tz) })), [races, tz]);
  const [view, setView0] = useMem('sched.view', 'cal');
  const [cat, setCat0] = useMem('sched.cat', 'ALL');
  const [showPast, setShowPast] = useMem('sched.past', false);
  const list = useMemo(() => all.filter((r) => cat === 'ALL' || getCategoryForSeries(r.series) === cat), [all, cat]);

  // 처음 고른 날: 오늘 남은(진행 중) 세션이 있으면 오늘, 아니면 이번 달 안의 다음 경기 날, 없으면 오늘
  const initialSel = () => {
    const todayLeft = all.some((r) => !isCancelled(r) && sessionsOnDay(r, today, tz).some((s) => sessionStateAt(r, s, at) !== 'done'));
    if (todayLeft) return today;
    const nx = all.filter((r) => !isCancelled(r) && getPrimarySession(r)?.startUtc).map((r) => dayOf(getPrimarySession(r).startUtc, tz)).filter((d) => d >= today).sort((a, b) => a - b)[0];
    return nx != null && partsOfDay(nx).m === tp.m && partsOfDay(nx).y === tp.y ? nx : today;
  };
  const [month, setMonth0] = useMem('sched.month', () => [tp.y, tp.m]);
  const [sel, setSel0] = useMem('sched.sel', initialSel);
  // 시계가 다른 날로 넘어가면(데모 시각 변경 포함) 달·고른 날은 오늘 기준으로 다시
  const [dayMem, setDayMem] = useMem('sched.day', today);
  if (dayMem !== today) { setDayMem(today); setMonth0([tp.y, tp.m]); setSel0(initialSel()); }

  // 달 이동은 데이터가 있는 해 안. 넘기면 그달 첫 경기 날(이번 달이면 오늘)
  const canPrev = !(month[0] === year && month[1] === 1);
  const canNext = !(month[0] === year && month[1] === 12);
  const firstRaceDay = (mo) => {
    const [yy, mm] = mo; const a = Math.floor(Date.UTC(yy, mm - 1, 1) / 86400000); const b = Math.floor(Date.UTC(yy, mm, 0) / 86400000);
    if (yy === tp.y && mm === tp.m) return today;
    const ks = list.filter((r) => r.span && !isCancelled(r)).map((r) => Math.max(r.span[0], a)).filter((x) => x >= a && x <= b);
    return ks.length ? Math.min(...ks) : a;
  };
  const pick = useRef(false);
  const nav = {
    canPrev, canNext,
    step: (dir) => {
      if (dir < 0 ? !canPrev : !canNext) return;
      const mo = dir < 0 ? (month[1] === 1 ? [month[0] - 1, 12] : [month[0], month[1] - 1]) : (month[1] === 12 ? [month[0] + 1, 1] : [month[0], month[1] + 1]);
      track('schedule_month_changed', { direction: dir < 0 ? 'prev' : 'next' });
      setMonth0(mo); setSel0(firstRaceDay(mo));
    },
    moveDay: (k) => {
      const p = partsOfDay(k);
      if (p.y !== year) return false;
      if (p.m !== month[1] || p.y !== month[0]) { track('schedule_month_changed', { direction: k < sel ? 'prev' : 'next' }); setMonth0([p.y, p.m]); }
      pick.current = true; setSel0(k);
      return true;
    },
  };
  const setSel = (k) => { pick.current = true; setSel0(k); const p = partsOfDay(k); if (p.m !== month[1] || p.y !== month[0]) setMonth0([p.y, p.m]); };

  // 날을 고르면 그날 경기가 보이게: 모바일은 패널을 화면 안으로, 데스크톱 목록 보기는 목록을 그 주로(지난 날이면 지난 경기를 펼친 뒤)
  const listRef = useRef(null); const panelRef = useRef(null); const root = useRef(null);
  useEffect(() => {
    if (!pick.current) return;
    pick.current = false;
    if (desktop && view === 'list') {
      const secs = [...(listRef.current?.querySelectorAll('.gx-wk') || [])];
      if (!showPast && secs.length && sel < +secs[0].dataset.a) { pick.current = true; setShowPast(true); return; }
      const hit = secs.find((el) => +el.dataset.a <= sel && sel <= +el.dataset.b) || secs.find((el) => +el.dataset.a >= sel);
      hit?.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
    } else if (!desktop) {
      panelRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  }, [sel, showPast, desktop, view, setShowPast]);

  // 칩을 바꾸면 목록 처음부터(제목은 두고 칩 바로 아래로), 펼친 지난 경기는 접는다
  const chipsRef = useRef(null);
  const setCat = (c) => {
    if (c === cat) return;
    setCat0(c); setShowPast(false);
    const sc = scrollerOf(root.current); const ch = chipsRef.current;
    if (sc && ch) { const top = topIn(ch, sc) + sc.scrollTop - (desktop ? 0 : 4); if (sc.scrollTop > top) sc.scrollTop = top; }
  };
  // 목록 ↔ 달력: 보기마다 보던 자리를 따로 기억
  const viewPos = useRef({});
  const [viewChanged, setViewChanged] = useState(false);
  const setView = (v) => { const sc = scrollerOf(root.current); if (sc) viewPos.current[view] = sc.scrollTop; setViewChanged(true); setView0(v); };
  useLayoutEffect(() => {
    if (!viewChanged) return;
    const sc = scrollerOf(root.current); const t = viewPos.current[view];
    if (sc) sc.scrollTop = t ?? 0;
  }, [view, viewChanged]);

  const remaining = list.filter((r) => !isOver(r, at) && !isCancelled(r)).length;
  const sub = remaining ? tr('schedule.left', { n: remaining }) : tr('schedule.seasonOver', { year });
  const byDay = useMemo(() => {
    const m = new Map();
    for (const r of list) { if (!r.span) continue; for (let k = r.span[0]; k <= r.span[1]; k++) { if (!m.has(k)) m.set(k, []); m.get(k).push(r); } }
    for (const v of m.values()) v.sort((a, b) => interestRank(preferences, a) - interestRank(preferences, b));
    return m;
  }, [list, preferences]);
  const spans = useMemo(() => list.filter((r) => r.span).map((r) => ({ r, a: r.span[0], b: r.span[1], w: interestRank(preferences, r) })), [list, preferences]);
  const open = (r) => onOpenRace(r);

  const viewSeg = <Seg label={tr('schedule.view')} value={view} onChange={setView} options={[{ v: 'list', l: tr('schedule.view.list') }, { v: 'cal', l: tr('schedule.view.cal') }]} />;
  const chips = (
    <div className="gx-chips-wrap" ref={chipsRef} data-stick="">
      <div className="gx-chips" role="group" aria-label={tr('schedule.chipsAria')}>
        <Chip on={cat === 'ALL'} onClick={() => setCat('ALL')}>{tr('category.ALL')}</Chip>
        {CATS.map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c === 'ENDURANCE' ? tr('category.ENDURANCE') : c}</Chip>)}
      </div>
    </div>
  );
  const head = (
    <div className="gx-tab-top">
      <div><h1 className="gx-t26" data-view-title tabIndex={-1}>{tr('schedule.title')}</h1><span className="gx-t15 gx-sub">{sub}</span></div>
      <div className="gx-top-acts">{viewSeg}{!desktop && <GearBtn onClick={() => shell.openSettings()} />}</div>
    </div>
  );
  const weekList = <WeekList races={list} now={at} today={today} preferences={preferences} onOpen={open} showPast={showPast} setShowPast={setShowPast} listRef={listRef} />;
  const dayPanel = <DayPanel races={list} sel={sel} now={at} onOpen={open} panelRef={panelRef} />;

  if (desktop) {
    return (
      <div className={cx('gx-screen gx-dsched', view === 'cal' && 'is-cal')} ref={root}>
        <div className="gx-dcol-main">
          {head}
          {chips}
          {view === 'list' ? weekList : <BigCal spans={spans} month={month} nav={nav} sel={sel} setSel={setSel} today={today} onOpen={open} />}
        </div>
        <aside className="gx-drail" aria-label={tr('schedule.view.cal')}>
          <div className="gx-rail-card gx-rail-scroll">
            {view === 'list' && <MonthCal byDay={byDay} month={month} nav={nav} sel={sel} setSel={setSel} today={today} small />}
            {dayPanel}
          </div>
        </aside>
      </div>
    );
  }
  return (
    <div className="gx-screen gx-sched" ref={root}>
      {head}
      {chips}
      {view === 'list' ? weekList : <><MonthCal byDay={byDay} month={month} nav={nav} sel={sel} setSel={setSel} today={today} /><div className="gx-band" />{dayPanel}</>}
    </div>
  );
}
