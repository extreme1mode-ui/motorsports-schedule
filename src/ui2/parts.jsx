// UX v2 화면 부품(작은 것들). 프로토타입 12판 ui.jsx를 실서비스 데이터·i18n·포매터로 옮긴 것.
// 문구는 useT(), 날짜·시각은 useFormat()(보는 사람 시간대·언어). 상태 판정은 home/time.js(L1·L3·L4).
// 아직 화면에 쓰지 않는다(UX v2 2단계부터).
import { useState } from 'react';
import './ui2.css';
import { Icon } from './Icon.jsx';
import { arrowPick, joinDot } from './hooks.js';
import { useT } from '../i18n/index.js';
import { useFormat } from '../use-format.js';
import { getRaceState, getMainSessionAt, isCancelled } from '../home/time.js';
import { getPrimarySession, getRoundText } from '../schedule/utils.js';
import { photoCredit } from '../home/photos.js';

const HOUR_MS = 3600000;
const cx = (...list) => list.filter(Boolean).join(' ');
const msOf = (v) => (v ? new Date(v).getTime() : null);

// ---------- 시리즈 ----------
export function Dot({ series }) {
  return <i className={`gx-dot s-${series}`} aria-hidden="true" />;
}
// 시리즈 타일: 옅은 면 + 시리즈 색 글자. id는 시리즈(F1·WEC…) 또는 카테고리 END(내구). off면 꺼진 것처럼(회색 타일·옅은 글자).
export function SeriesTile({ id, size = 40, off = false }) {
  const tr = useT();
  const label = id === 'END' ? tr('category.ENDURANCE') : id;
  return (
    <span className={cx('gx-tile', `s-${id}`, off && 'is-off')} style={{ width: size, height: size }} aria-hidden="true">
      <span className={label.length > 3 ? 'gx-t13' : 'gx-t15'}>{label}</span>
    </span>
  );
}

// ---------- 상태 ----------
// '진행 중'(노란 점 + 글자). 점은 켜질 때 한 번만 움직이고 멈춘다.
export function LiveText({ children }) {
  const tr = useT();
  return <span className="gx-live"><i aria-hidden="true" />{children ?? tr('status.live')}</span>;
}
// 목록 상태 글자(L3): 진행 중 · 주말 진행 중 · 12시간 안 'N시간 뒤' · 다음 경기 · 상대 날짜 · 종료 · 취소 · 시각 미정.
// mode는 그 시리즈의 관심 수준(세션 진행 중·주말 진행 중을 셀 때). isNext는 지금 목록의 '다음 경기'(findNextRace).
export function StateText({ race, now, mode = 'all', isNext = false }) {
  const tr = useT(); const fmt = useFormat();
  const st = getRaceState(race, now, mode);
  if (st === 'cancelled') return <span className="gx-st-muted">{tr('status.cancelled')}</span>;
  if (st === 'live' || st === 'session') return <LiveText />;
  if (st === 'done') return <span className="gx-st-muted">{tr('status.done')}</span>;
  if (st === 'tba') return <span className="gx-st-muted">{tr('status.tba')}</span>;
  if (st === 'weekend') return <span className="gx-st-sub">{tr('status.weekend')}</span>;
  // 12시간 안이면 '3시간 뒤'처럼 시각으로. 결승이 둘인 주말은 지금 기준 결승
  const at = msOf(now);
  const t = msOf(getMainSessionAt(race, now)?.startUtc) ?? msOf(race.primaryStartUtc);
  const near = t != null && t > at && t - at < 12 * HOUR_MS;
  if (isNext) return <span className="gx-st-next">{near ? fmt.relShort(t, now) : tr('status.next')}</span>;
  return <span className="gx-st-sub">{t == null ? tr('status.tba') : near ? fmt.relShort(t, now) : fmt.relDay(t, now)}</span>;
}

// 진행 막대: 지난 시간 / 전체
export function Progress({ from, to, now, label }) {
  const a = msOf(from); const b = msOf(to); const n = msOf(now);
  const p = Math.max(0, Math.min(1, (n - a) / Math.max(1, b - a)));
  return (
    <span className="gx-prog" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <i style={{ width: `${p * 100}%` }} />
    </span>
  );
}

// 숫자 굴림: 바뀐 자리의 숫자만 위에서 굴러 내려온다(180ms). 처음 그릴 때는 그대로, 줄인 움직임 설정이면 길이가 1ms.
// 직전 글자는 상태로 기억한다(렌더 중 ref 읽기 대신 — react-hooks 규칙).
export function Roll({ children }) {
  const text = String(children ?? '');
  const [memo, setMemo] = useState({ cur: text, old: null });
  if (memo.cur !== text) setMemo({ cur: text, old: memo.cur });
  const old = memo.cur !== text ? memo.cur : memo.old;
  const out = []; let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c >= '0' && c <= '9') {
      if (buf) { out.push(buf); buf = ''; }
      const changed = old != null && old[i] !== c;
      out.push(<span key={`${i}-${c}`} className={changed ? 'gx-dg gx-roll' : 'gx-dg'}>{c}</span>);
    } else buf += c;
  }
  if (buf) out.push(buf);
  return <>{out}</>;
}

// ---------- 목록 ----------
export function ListHeader({ title, sub, action, onAction, id, right, as: H = 'h2' }) {
  return (
    <div className="gx-lh">
      <div className="gx-lh-l"><H className="gx-t20" id={id}>{title}</H>{sub && <span className="gx-lh-sub gx-t15">{sub}</span>}</div>
      {right || (action && <button type="button" className="gx-textbtn gx-t15" onClick={onAction}>{action}<Icon n="chev" s={16} /></button>)}
    </div>
  );
}
// 섹션 사이 회색 띠(12px, 토스 16px)
export function Band() { return <div className="gx-band" aria-hidden="true" />; }

// 경기 줄: 왼쪽 시리즈 타일, 가운데 이름·라운드·장소, 오른쪽 날짜·시각(고정폭). 취소는 '미정 · 취소', 끝난 경기는 한 단계 흐리게.
export function RaceRow({ race, now, onOpen, meta, right, dim = false, tag, lead }) {
  const tr = useT(); const fmt = useFormat();
  const labels = fmt.race(race);
  const cancelled = isCancelled(race);
  const done = getRaceState(race, now) === 'done';
  const start = getPrimarySession(race)?.startUtc || null;
  const place = labels.city && labels.city !== labels.shortName ? labels.city : (labels.circuit || labels.city);
  return (
    <button type="button" className={cx('gx-row', (dim || done || cancelled) && 'is-dim')} onClick={() => onOpen?.(race)}>
      {lead || <SeriesTile id={race.series} />}
      <span className="gx-row-c">
        <span className={cx('gx-row-t gx-t17 gx-w600', cancelled && 'gx-strike')}>{tag && <span className="gx-row-tag gx-t13">{tag}</span>}{labels.shortName}</span>
        <span className="gx-row-s gx-t13">{meta || joinDot([getRoundText(race, fmt.locale), place])}</span>
      </span>
      <span className="gx-row-r">
        {right || (cancelled
          ? <><span className="gx-t15 gx-w600">{tr('status.cancelledDate')}</span><span className="gx-t13 gx-ter">{tr('status.cancelled')}</span></>
          : start
            ? <><span className="gx-t15 gx-w600">{fmt.dayDate(start)}</span><span className="gx-t13 gx-sub">{fmt.time(start)}</span></>
            : <span className="gx-t15 gx-w600">{tr('status.tba')}</span>)}
      </span>
    </button>
  );
}

// ---------- 고르기 ----------
export function Chip({ on, children, onClick }) {
  return <button type="button" className={cx('gx-chip', on && 'is-on')} aria-pressed={!!on} onClick={onClick}>{children}</button>;
}
// options: [{ v, l }]. ←/→로 옮기며 바로 고른다(WAI-ARIA radio).
export function Seg({ value, options, onChange, label }) {
  return (
    <div className="gx-seg" role="radiogroup" aria-label={label} onKeyDown={(e) => arrowPick(e, options, value, onChange)}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} tabIndex={value === o.v ? 0 : -1}
          className={value === o.v ? 'is-on' : undefined} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}
// 탭: ←/→ 로빙(고른 탭에만 Tab). ids를 주면 aria-controls로 패널과 잇는다.
export function Tabs({ value, options, onChange, label, idPrefix }) {
  return (
    <div className="gx-tabs" role="tablist" aria-label={label} onKeyDown={(e) => arrowPick(e, options, value, onChange)}>
      {options.map((o) => (
        <button key={o.v} type="button" role="tab" aria-selected={value === o.v} tabIndex={value === o.v ? 0 : -1}
          id={idPrefix ? `${idPrefix}-tab-${o.v}` : undefined} aria-controls={idPrefix ? `${idPrefix}-panel-${o.v}` : undefined}
          className={value === o.v ? 'is-on' : undefined} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

// ---------- 사진 ----------
// 어두운 바탕 위에서 260ms 동안 서서히(캐시에 있으면 바로). eager면 먼저 받는다.
export function Photo({ src, pos, className = '', eager = false, lazy = false, alt = '' }) {
  const [loaded, setLoaded] = useState(null);   // 다 받은 src
  // 캐시에 있던 사진은 onLoad 전에 이미 complete — 붙는 순간 바로 보인다
  const markIfReady = (im) => { if (im && im.complete && im.naturalWidth) setLoaded(src); };
  return (
    <img ref={markIfReady} className={cx(className, 'gx-ph', loaded === src && 'is-in')} src={src} alt={alt}
      style={pos ? { objectPosition: pos } : undefined} decoding="async" loading={lazy ? 'lazy' : undefined} fetchPriority={eager ? 'high' : undefined}
      onLoad={() => setLoaded(src)} onError={() => setLoaded(src)} />
  );
}
// 사진 출처(Commons CC BY·BY-SA는 작가·라이선스 표기가 사용 조건). onPhoto면 사진 위 흰색 60%, 아니면 사진 아래 --text3.
export function Credit({ race, onPhoto = false, tabIndex, className = '' }) {
  const tr = useT();
  const credit = photoCredit(race);
  if (!credit) return null;
  const full = tr('photo.credit', credit);
  return (
    <a className={cx('gx-credit', onPhoto && 'is-on-photo', className)} href={credit.url} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex}
      title={full} aria-label={`${full}. ${tr('aria.external')}`}>{full}</a>
  );
}

// ---------- 행동 ----------
// 하트: 켜질 때 한 번 튄다. size 'btn'은 52px 회색 버튼(상세 아래 바), 'icon'은 44px 아이콘 버튼.
// count: 즐겨찾기 수 글자(기준 이상일 때만, 없으면 하트만). 바뀐 자리만 굴러 내려온다
export function HeartBtn({ on, onClick, label, size = 'btn', className = '', count = null }) {
  const tr = useT();
  const [pop, setPop] = useState(false);
  return (
    <button type="button" aria-pressed={!!on} aria-label={label ?? tr('nav.fav')}
      className={cx(size === 'btn' ? 'gx-btn is-weak is-icon' : 'gx-iconbtn', 'gx-heart', on && 'is-on', pop && 'is-pop', count && 'has-count', className)}
      onClick={() => { if (!on) setPop(true); onClick?.(); }} onAnimationEnd={() => setPop(false)}>
      <Icon n={on ? 'heartF' : 'heart'} />
      {count && <span className="gx-heart-n" aria-hidden="true"><Roll>{count}</Roll></span>}
    </button>
  );
}
// 캘린더 담기(결정 3): 담기 전 '캘린더에 담기', 담은 뒤 '✓ 캘린더에 담았어요'로 고정. 다시 누르면 같은 파일을 다시 받는다(표시 유지).
export function CalBtn({ on, onClick, disabled = false, grow = true, className = '' }) {
  const tr = useT();
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={on ? tr('home.alertOn.aria') : undefined}
      className={cx('gx-btn', on ? 'is-weak gx-cal is-on' : 'is-primary gx-cal', grow && 'is-grow', className)}>
      {on && <Icon n="check" s={20} />}{on ? tr('home.alertOn') : tr('home.alertSet')}
    </button>
  );
}
// 설정 톱니(결정 18: 모바일·토스는 모든 탭 제목 줄 오른쪽). 데스크톱은 사이드바에 있어 쓰지 않는다.
export function GearBtn({ onClick }) {
  const tr = useT();
  return <button type="button" className="gx-iconbtn" aria-label={tr('nav.settings')} onClick={onClick}><Icon n="gear" /></button>;
}
