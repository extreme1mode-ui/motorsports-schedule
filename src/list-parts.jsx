// 목록 공용 계산·부품 — 모바일(screens.jsx)과 데스크톱(web-screens.jsx)이 같이 쓴다.
import { useRef, useEffect } from 'react';
import { SERIES, getRaceStartUtc } from './schedule/index.js';
import { getRoundDisplay } from './primitives.jsx';
import { useT } from './i18n/index.js';

// 정렬·그룹핑은 시작 시각(UTC)으로. 시간대와 무관하게 항상 옳다.
export const startMs = (r) => { const iso = getRaceStartUtc(r) || r.primaryStartUtc; return iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER; };
export const byStart = (a, b) => startMs(a) - startMs(b);
// 시청자 달력 기준 파트 (시작 시각 → 사용자 시간대). 시작 미정이면 primaryStartUtc(주말 시작)로.
export const viewerParts = (fmt, r) => fmt.parts(getRaceStartUtc(r) || r.primaryStartUtc);

// 필터 칩 이름: '전체'·'내구'만 번역, F1·WRC·GTWC는 고유명이라 그대로.
export const catLabel = (tr, item) => (item.id === 'ALL' || item.id === 'ENDURANCE' ? tr(`category.${item.id}`) : item.short);

// 줄에 붙는 상태 글자 하나. 예정은 null(시각만 보인다).
export function raceStatus(race) {
  if (race.status === 'live') return 'live';
  if (race.status === 'cancelled') return 'cancelled';
  if (race.status === 'completed') return 'completed';
  return race.isNextRace ? 'next' : null;
}

// 'F1 R19' / 'GTWC R9-10' — 시리즈 코드와 라운드 코드 한 덩어리.
export const seriesRound = (race) => [SERIES[race.series]?.short || race.series, getRoundDisplay(race)].filter(Boolean).join(' ');

// 시청자 날짜별 묶음: [{ key:'2026-10-03', label:'10월 3일 (토)', races:[…] }]
export function groupByViewerDay(fmt, tr, list) {
  const out = [];
  for (const r of list) {
    const v = getRaceStartUtc(r) || r.primaryStartUtc;
    const key = fmt.dateKey(v) || 'tba';
    let g = out[out.length - 1];
    if (!g || g.key !== key) {
      const p = fmt.parts(v);
      g = { key, label: p ? tr('schedule.dayHead', { date: fmt.monthDay(v), dow: p.weekdayName }) : tr('time.tba'), races: [] };
      out.push(g);
    }
    g.races.push(r);
  }
  return out;
}

// 시리즈 점 8px — 줄 왼쪽, 태그 안. 색은 식별에만 쓴다.
export function SeriesDot({ series, size = 8, hollow = false, style }) {
  const c = SERIES[series]?.accent || 'var(--text3)';
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', flex: 'none', boxSizing: 'border-box', background: hollow ? 'transparent' : c, border: hollow ? `1.5px solid ${c}` : 0, ...style }} />;
}

// 시리즈 머리(그릇 없이): 이름 + 시즌, 진행 막대, '24라운드 중 18라운드 끝났어요' / '남은 경기 5, 취소 1'.
// 예전 통계 배너(ROUNDS/DONE/UPCOMING 대문자 + 0 채운 숫자 + 시리즈 색 빛·띠)를 대신한다(H3·K2). 막대는 본문색 — 시리즈 색은 이름 앞 점에만.
// wide: 데스크톱 — 이름은 왼쪽, 진행은 오른쪽 420px, 아래 머리선.
export function SeriesSummary({ cat, stats, year, wide = false, style }) {
  const tr = useT();
  const pct = stats.rounds ? Math.min(1, stats.done / stats.rounds) : 0;
  const rest = [tr('series.remaining', { n: stats.upcoming }), stats.cancelled > 0 ? tr('series.cancelledN', { n: stats.cancelled }) : null].filter(Boolean).join(', ');
  const bar = (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={stats.rounds} aria-valuenow={stats.done} aria-label={tr('series.progress', { total: stats.rounds, done: stats.done })}
      style={{ marginTop: wide ? 8 : 12, height: 4, borderRadius: 2, background: 'var(--surface3)', overflow: 'hidden' }}>
      <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--text)' }} />
    </div>
  );
  const name = (size, dot) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: wide ? 10 : 8, fontSize: size, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', minWidth: 0 }}>
      {cat.accent && <span aria-hidden style={{ width: dot, height: dot, borderRadius: '50%', background: cat.accent, flex: 'none' }} />}{cat.name}
    </span>
  );
  const meta = { fontSize: 13, lineHeight: 1.4, fontWeight: 500, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' };
  if (wide) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, paddingBottom: 20, boxShadow: 'inset 0 -1px 0 var(--line)', ...style }}>
        <div style={{ minWidth: 0 }}>{name(28, 12)}<div style={{ ...meta, marginTop: 4 }}>{tr('series.season', { year })}</div></div>
        <div style={{ flex: '0 1 420px', minWidth: 240 }}>
          <div style={{ ...meta, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{tr('series.progress', { total: stats.rounds, done: stats.done })}</span><span>{rest}</span>
          </div>
          {bar}
        </div>
      </div>
    );
  }
  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {name(20, 10)}
        <span style={{ marginLeft: 'auto', flex: 'none', fontSize: 13, color: 'var(--text3)' }}>{tr('series.season', { year })}</span>
      </div>
      {bar}
      <div style={{ ...meta, marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>{tr('series.progress', { total: stats.rounds, done: stats.done })}</span><span>{rest}</span>
      </div>
    </div>
  );
}

// 달 고르기: 글자 버튼(15px), 고른 달만 700 + 아래 2px 밑줄. 개수는 화면 제목 아래 한 줄에 한 번만(D4).
// 예전처럼 일반 버튼 + aria-pressed (탭 역할을 주면 화살표 키 이동까지 맞춰야 한다).
// 고른 달이 화면 밖이면 처음 한 번 보이는 곳으로 옮긴다.
export function MonthTabs({ names, value, onChange, style, size = 15 }) {
  const ref = useRef(null);
  useEffect(() => {
    const box = ref.current; const el = box?.querySelector('[aria-pressed="true"]');
    if (box && el && (el.offsetLeft < box.scrollLeft || el.offsetLeft + el.offsetWidth > box.scrollLeft + box.clientWidth)) {
      box.scrollLeft = Math.max(0, el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2);
    }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps -- 처음 한 번만
  return (
    <div ref={ref} style={{ display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none', ...style }}>
      {names.map((name, m) => {
        const on = m === value;
        return (
          <button key={m} type="button" aria-pressed={on} onClick={() => onChange(m)} style={{
            flex: 'none', minHeight: 44, padding: '0 8px', border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: size, fontWeight: on ? 700 : 500, color: on ? 'var(--text)' : 'var(--text3)',
            boxShadow: on ? 'inset 0 -2px 0 var(--text)' : 'none', whiteSpace: 'nowrap',
          }}>{name}</button>
        );
      })}
    </div>
  );
}
