// 홈 '내 주말 시간표' — 일정 목록. 데이터는 buildHomePlan의 days 그대로.
// 날짜는 왼쪽에 한 번(요일 위 · 날짜 아래, 폰에서는 그날을 스크롤하는 동안 붙어 있음). 세션은 한 줄(시각 · 막대 · 이름 · 상태).
// 같은 경기가 이어지면 경기 이름은 위에 한 번, 세로 막대로 묶는다. 끝난 세션은 날마다 한 줄로 접는다(눌러서 펼침).
// 다음 세션은 회색 면 + 남은 때 알약, 진행 중은 노란 면.
// 끝 시각: getSessionEnd 추정을 쓰되, 같은 경기의 다음 세션이 먼저 시작하면 거기서 끊는다(WEC 예선 20분 간격이 서로 겹치지 않게).
import { useMemo, useState } from 'react';
import './timeline-list.css';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { prefetchHandlers } from '../photo-prefetch.js';
import { Icon } from '../ui2/Icon.jsx';
import { LiveText, ListHeader, Roll } from '../ui2/parts.jsx';

const HOUR = 3600000;
const cx = (...l) => l.filter(Boolean).join(' ');

// 세션 하나 = { s, r, at, end, st('done'|'live'|'up'), next, rel, far, day(인덱스), key }
function useSessions(plan, now) {
  const fmt = useFormat();
  return useMemo(() => {
    const all = plan.days.flatMap((d, di) => d.items.map((it) => ({ it, di })));
    const list = all.map(({ it, di }) => {
      const nxt = all.find((o) => o.it.r.id === it.r.id && o.it.at > it.at);
      const guess = it.end ?? it.at + HOUR;
      const end = nxt && nxt.it.at < guess ? nxt.it.at : guess;
      const st = now >= end ? 'done' : now >= it.at ? 'live' : 'up';
      return { s: it.s, r: it.r, at: it.at, end, st, day: di, key: `${it.r.id}-${it.s.tEn}-${it.at}` };
    });
    const nx = list.find((x) => x.st === 'up');
    list.forEach((x) => {
      x.next = x === nx;
      x.rel = x.st === 'up' && x.at - now < 12 * HOUR ? fmt.relShort(x.at, now) : '';
      x.far = x.next && !x.rel ? fmt.relDay(x.at, now) : '';   // 12시간 밖 다음 세션: '내일' · '2일 뒤'
    });
    const days = plan.days.map((d, di) => {
      const at = d.items[0].at; const p = fmt.parts(at);
      return { key: d.key, at, items: list.filter((x) => x.day === di), wd: p.weekdayName, date: Number(p.day), weekday: p.weekday, today: fmt.dayDiff(at, now) === 0 };
    });
    return { list, days };
  }, [plan, now, fmt]);
}
const wdClass = (w) => (w === 6 ? 'is-sat' : w === 0 ? 'is-sun' : '');

// 눌림: 크기는 그대로 두고 겹(오버레이)만 — 세로 막대가 끊기지 않게. 손가락은 70ms 머문 뒤에 켜서 스크롤할 때 줄이 깜빡이지 않게,
// 8px 넘게 움직이면 끈다. 짧게 톡 쳐도 140ms는 보인다. 길게 눌러도 같은 모양이고, 시스템 메뉴·글자 선택은 막는다.
const PRESS_DELAY = 70, PRESS_SLOP = 8, PRESS_HOLD = 140;
const pressTimers = new WeakMap();
const pressSet = (el) => el.setAttribute('data-press', '');
const pressClear = (el, wait = 0) => {
  clearTimeout(pressTimers.get(el));
  if (wait) pressTimers.set(el, setTimeout(() => el.removeAttribute('data-press'), wait)); else el.removeAttribute('data-press');
};
const press = {
  onPointerDown(e) {
    if (e.button > 0) return;
    const el = e.currentTarget; el.gxPress = { x: e.clientX, y: e.clientY }; el.gxType = e.pointerType;
    clearTimeout(pressTimers.get(el));
    if (e.pointerType === 'mouse') pressSet(el); else pressTimers.set(el, setTimeout(() => pressSet(el), PRESS_DELAY));
  },
  onPointerMove(e) {
    const el = e.currentTarget; const p = el.gxPress;
    if (p && (Math.abs(e.clientX - p.x) > PRESS_SLOP || Math.abs(e.clientY - p.y) > PRESS_SLOP)) { el.gxPress = null; pressClear(el); }
  },
  onPointerUp(e) {
    const el = e.currentTarget; if (!el.gxPress) return;
    el.gxPress = null; pressSet(el); pressClear(el, PRESS_HOLD);
  },
  onPointerCancel(e) { e.currentTarget.gxPress = null; pressClear(e.currentTarget); },
  onPointerLeave(e) { if (e.pointerType === 'mouse') { e.currentTarget.gxPress = null; pressClear(e.currentTarget); } },
  onContextMenu(e) { if (e.currentTarget.gxType && e.currentTarget.gxType !== 'mouse') e.preventDefault(); },
};
// 사진 미리 받기(prefetchHandlers)와 눌림을 함께
const pressWith = (pf) => ({ ...press, ...pf, onPointerDown: (e) => { pf.onPointerDown?.(e); press.onPointerDown(e); } });

function runsOf(items) {
  const runs = [];
  items.forEach((x) => { const r = runs[runs.length - 1]; if (r && r.id === x.r.id) r.items.push(x); else runs.push({ id: x.r.id, r: x.r, items: [x] }); });
  return runs;
}
// quiet: '끝난 세션 N개' 아래에 펼친 줄 — 묶음이 이미 끝났다고 말하므로 줄마다 '종료'를 다시 쓰지 않는다
// cont: 첫 묶음이 펼친 끝난 세션과 같은 경기(펼쳤을 때 경기 이름을 접고 막대를 잇는다)
function ListRuns({ runs, dimOf, onOpen, cont, quiet }) {
  const fmt = useFormat(); const tr = useT();
  return runs.map((run, ri) => {
    const L = fmt.race(run.r);
    return (
      <div key={`${run.id}-${ri}`} className={cx('gx-tll-run', cont && ri === 0 && 'is-cont')} style={{ '--c': `var(--${run.r.series.toLowerCase()})` }}>
        <div className="gx-tll-runh" aria-hidden="true">{run.r.series} · {L.shortName}</div>
        {run.items.map((x, i) => {
          const live = x.st === 'live', done = x.st === 'done';
          const label = fmt.sessionLabel(x.s); const time = fmt.time(x.at);
          const chip = x.next ? (x.rel || x.far) : '';
          const state = live ? tr('status.live') : done ? tr('status.done') : (x.rel || x.far || '');
          return (
            <button key={x.key} type="button" {...pressWith(prefetchHandlers(x.r))} onClick={() => onOpen(x.r)}
              className={cx('gx-tll-row', i === 0 && 'is-first', i === run.items.length - 1 && 'is-last', done && 'is-done', live && 'is-live', x.next && 'is-next',
                x.s.kind === 'race' && 'is-race', !done && dimOf?.(x.r) && 'is-dim')}
              aria-label={`${time} ${label}, ${x.r.series} ${L.shortName}${state ? `, ${state}` : ''}`}>
              <span className="gx-tll-t">{time}</span>
              <span className="gx-tll-bar" aria-hidden="true" />
              <span className="gx-tll-n">{label}</span>
              {live ? <span className="gx-tll-st"><LiveText /></span>
                : done ? (quiet ? null : <span className="gx-tll-st is-muted">{tr('status.done')}</span>)
                  : chip ? <span className="gx-tll-chip"><span><Roll>{chip}</Roll></span></span>
                    : x.rel ? <span className="gx-tll-st"><Roll>{x.rel}</Roll></span> : null}
            </button>
          );
        })}
      </div>
    );
  });
}

// 펼친 날은 상세에 갔다 와도(홈이 다시 그려져도) 그대로 — 이 탭이 열려 있는 동안만(sessionStorage)
const FOLD_KEY = 'gantry.tl.open';
const readFold = () => { try { return JSON.parse(sessionStorage.getItem(FOLD_KEY) || '{}') || {}; } catch { return {}; } };
export function TimelineList({ plan, now, columns, dimOf, onOpen, onMore }) {
  const fmt = useFormat(); const tr = useT();
  const { list, days } = useSessions(plan, now);
  const [open, setOpenRaw] = useState(readFold);
  const setOpen = (o) => { setOpenRaw(o); try { sessionStorage.setItem(FOLD_KEY, JSON.stringify(o)); } catch { /* 저장 못 해도 이번 화면에서는 펼친 그대로 */ } };
  if (!plan.heroWeek || !days.length) return null;
  return (
    <section aria-labelledby="gx-tl-h" className={cx('gx-tll', columns ? 'is-cols' : 'is-day')}>
      {/* 데스크톱: '다른 시리즈 확인하기 ›'는 머리 줄 오른쪽 글자 버튼. 폰은 아래 넓은 버튼 */}
      <ListHeader id="gx-tl-h" title={tr('home.tl.title')} sub={tr('home.tl.count', { n: list.length })} action={columns ? tr('home.tl.moreShort') : null} onAction={onMore} />
      <div className="gx-tll-days">
        {days.map((d) => {
          const done = d.items.filter((x) => x.st === 'done');
          const rest = d.items.filter((x) => x.st !== 'done');
          // 끝난 세션이 둘 이상이거나 그날이 다 끝났으면 한 줄로 접는다
          const foldable = done.length >= 2 || (done.length > 0 && !rest.length);
          const isOpen = !foldable || !!open[d.key];
          const head = fmt.dayHead(d.at, now);
          const cont = done.length > 0 && rest.length > 0 && done[done.length - 1].r.id === rest[0].r.id;
          return (
            <div key={d.key} className={cx('gx-tll-day', !rest.length && 'is-past', foldable && 'has-fold')}>
              <div className="gx-tll-date" aria-hidden="true">
                <span className={cx('gx-tll-wd', wdClass(d.weekday))}>{d.wd}</span>
                <span className={cx('gx-tll-num', d.today && 'is-today')}>{d.date}</span>
              </div>
              <div className="gx-tll-body">
                <h3 className="gx-vh">{head.main} {head.sub}</h3>
                {foldable && (
                  <button type="button" {...press} className={cx('gx-tll-fold', isOpen && 'is-open')} aria-expanded={isOpen} aria-controls={`gx-tll-more-${d.key}`} onClick={() => setOpen({ ...open, [d.key]: !isOpen })}>
                    <span className="gx-tll-foldt">{tr('home.tl.doneN', { n: done.length })}</span>
                    <span className="gx-tll-foldbtn">{tr(isOpen ? 'home.tl.collapse' : 'home.tl.expand')}<span className="gx-tll-chev"><Icon n="down" s={14} /></span></span>
                  </button>
                )}
                {foldable && (
                  <div id={`gx-tll-more-${d.key}`} className={cx('gx-tll-more', isOpen && 'is-open', cont && 'has-cont')} inert={isOpen ? undefined : true}>
                    <div className="gx-tll-morein"><ListRuns runs={runsOf(done)} dimOf={dimOf} onOpen={onOpen} quiet /></div>
                  </div>
                )}
                <ListRuns runs={runsOf(foldable ? rest : d.items)} dimOf={dimOf} onOpen={onOpen} cont={foldable && cont} />
              </div>
            </div>
          );
        })}
      </div>
      {!columns && (
        <div className="gx-tl-foot">
          <button type="button" className="gx-btn is-weak" onClick={onMore}>{tr('home.tl.more')}</button>
        </div>
      )}
    </section>
  );
}
