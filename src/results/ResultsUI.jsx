// F1 결과 화면 부품: 경기 상세의 결과 섹션, 라운드 행의 포디움 줄, 시리즈 탭의 드라이버 순위, 하위 탭.
// 값은 데이터 원문 그대로 보여 준다(순위 글자 R·W, 기록 문자열, 점수). 상태 문구만 언어에 맞춰 옮긴다.
// 드라이버 사진은 무채색 바탕 위에 둔다. 팀 색은 식별용 2px 막대로만 쓴다(F1 중계 그래픽의 관습). 사진이 없으면 드라이버 코드로 그린다.
// AI 티 정리(2026-10-29): 테두리 없는 면, 영문 대문자 열 머리(POS·DRIVER·PTS) → 한국어, 'PTS' 9px → '점', 글자 12px 이상.
import { useState } from 'react';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { getRaceStartUtc } from '../schedule/index.js';
import { SectionHead, Segmented } from '../ui.jsx';
import { useF1Results, resultOf, teamColor, raceKey, photoOf, photoFocusX } from './results.js';

const MORE = 7;   // 포디움 아래 처음에 보여 줄 줄 수(4~10위). 나머지는 '전체 보기'로 편다.
const NUM = { fontVariantNumeric: 'tabular-nums' };

// 기록 칸: 기록이 있으면 그대로, 없으면 상태(+ 달린 랩 수)
function statusText(row, tr) {
  if (row.time) return row.time;
  const laps = row.laps ?? '';
  switch (row.status) {
    case 'Lapped': return tr('results.status.lapped', { laps });
    case 'Retired': return tr('results.status.retired', { laps });
    case 'Did not start': return tr('results.status.dns');
    case 'Disqualified': return tr('results.status.dsq');
    default: return row.status || '';
  }
}

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

// 원형 사진. 머리~가슴 컷아웃을 1.5배로 키워 얼굴이 원 가운데 오게 한다. 사진이 없으면 드라이버 코드.
export function Avatar({ src, code, size = 36 }) {
  return (
    <span aria-hidden style={{
      position: 'relative', flex: 'none', width: size, height: size, borderRadius: 999, overflow: 'hidden',
      background: 'var(--surface3)', display: 'grid', placeItems: 'center',
    }}>
      {src
        ? <img src={src} alt="" decoding="async" loading="lazy" style={{ position: 'absolute', width: '150%', height: '150%', maxWidth: 'none', left: `${(0.5 - photoFocusX(code) * 1.5) * 100}%`, top: '2%' }} />
        : <span style={{ fontSize: Math.max(12, Math.round(size * 0.3)), fontWeight: 700, color: 'var(--text2)' }}>{code}</span>}
    </span>
  );
}

function DriverName({ row, size = 15 }) {
  return (
    <div style={{ fontSize: size, color: 'var(--text)', letterSpacing: '-0.01em', ...ellipsis }}>
      <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{row.given} </span>
      <span style={{ fontWeight: 700 }}>{row.family}</span>
    </div>
  );
}

function Bar({ c }) {
  return <span aria-hidden style={{ width: 2, alignSelf: 'stretch', borderRadius: 1, background: teamColor(c), margin: '8px 0' }} />;
}

// 포디움 세 칸. 화면에는 2 · 1 · 3 순서로 놓고 1위 칸을 조금 높게 둔다. 읽는 순서(DOM)는 1 · 2 · 3.
// size: 'sm' 모바일 · 'md' 데스크톱 드로어 · 'lg' 데스크톱 시리즈 탭(전체 폭이라 사진을 자르지 않고 가운데 둔다)
function Podium({ rows, data, size = 'sm', metric }) {
  const top = rows.slice(0, 3);
  const tall = { sm: 128, md: 156, lg: 196 }[size];
  const wide = size !== 'sm';
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, alignItems: 'end' }}>
      {top.map((r, i) => {
        const src = photoOf(data, r.code);
        return (
          <li key={(r.n || r.code) + '-' + i} style={{ order: [2, 1, 3][i], minWidth: 0, background: 'var(--surface)', borderRadius: 'var(--r-card)', overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: i === 0 ? tall : tall - 20, background: 'var(--surface3)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
              {src
                ? <img src={src} alt="" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: size === 'lg' ? 'contain' : 'cover', objectPosition: size === 'lg' ? '50% 100%' : '50% 0%' }} />
                : <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text3)' }}>{r.code}</span>}
              <span style={{ position: 'absolute', left: size === 'lg' ? 14 : 10, top: size === 'lg' ? 10 : 6, fontSize: { sm: 17, md: 20, lg: 28 }[size], fontWeight: 700, color: 'var(--text)', ...NUM }}>{r.pt}</span>
              <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: teamColor(r.c) }} />
            </div>
            <div style={{ padding: size === 'lg' ? '12px 16px 14px' : wide ? '10px 12px 12px' : '10px 10px 10px' }}>
              <div style={{ fontSize: size === 'lg' ? 17 : 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', ...ellipsis }}>{r.family}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, ...ellipsis }}>{r.team || (r.teams || []).join(' / ')}</div>
              <div style={{ marginTop: 6 }}>{metric(r)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ResultRow({ row, data, tr, last, desktop }) {
  const timed = !!row.time;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: desktop ? '28px 2px 32px 1fr auto 36px' : '24px 2px 32px 1fr auto 30px', columnGap: 10,
      alignItems: 'center', minHeight: 60, padding: '6px 16px 6px 10px', position: 'relative',
    }}>
      {!last && <span aria-hidden style={{ position: 'absolute', left: desktop ? 102 : 98, right: 0, bottom: 0, height: 1, background: 'var(--line)' }} />}
      <span style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: /^\d+$/.test(row.pt) ? 'var(--text)' : 'var(--text3)', ...NUM }}>{row.pt}</span>
      <Bar c={row.c} />
      <Avatar src={photoOf(data, row.code)} code={row.code} size={32} />
      <div style={{ minWidth: 0 }}>
        <DriverName row={row} size={15} />
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, ...ellipsis }}>{row.team}</div>
      </div>
      <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: 13, fontWeight: timed ? 600 : 500, color: timed ? 'var(--text2)' : 'var(--text3)', ...NUM }}>{statusText(row, tr)}</span>
      <span style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, color: row.pts === '0' ? 'var(--text3)' : 'var(--text)', ...NUM }}>{row.pts}</span>
    </div>
  );
}

// 점수: '25점' / '25 pts'. 예전 'PTS' 9px 대문자 대신 본문 글자.
const Pts = ({ v, size, tr }) => (
  <span style={{ whiteSpace: 'nowrap', fontSize: size, fontWeight: 700, color: 'var(--text)', ...NUM }}>{v}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)', marginLeft: 2 }}>{tr('results.points')}</span></span>
);

// 경기 상세(모바일 시트·데스크톱 드로어)의 결과 섹션. 결과 데이터가 있는 F1 경기에서만 그린다.
export function RaceResultSection({ race, variant = 'sheet' }) {
  const tr = useT();
  const fmt = useFormat();
  const data = useF1Results(race?.series === 'F1');
  const start = getRaceStartUtc(race);
  // 결승 시작 전에는 그리지 않는다(데모 시계로 과거 시각에 있을 때도 미래 결과가 보이지 않게). 시각은 상세가 열린 때 한 번 잰다.
  const [openedAt] = useState(() => Date.now());
  const res = start && openedAt < Date.parse(start) ? null : resultOf(data, race);
  const [kind, setKind] = useState('gp');
  const [all, setAll] = useState(false);
  if (!res) return null;
  const rows = (kind === 'sprint' && res.sprint) ? res.sprint : res.gp;
  const rest = rows.slice(3);
  const shown = all ? rest : rest.slice(0, MORE);
  const drawer = variant === 'drawer';

  return (
    <section style={drawer ? { marginBottom: 28 } : { padding: '28px 18px 0' }} aria-label={tr('results.aria', { race: fmt.race(race).name })}>
      <SectionHead title={tr('results.title')} />
      {res.sprint && (
        <Segmented size="sm" label={tr('results.title')} value={kind} style={{ maxWidth: 240, marginBottom: 12 }}
          onChange={(k) => { setKind(k); setAll(false); track('race_results_kind_changed', { kind: k, race_id: race.id }); }}
          options={[{ id: 'gp', label: tr('results.gp') }, { id: 'sprint', label: tr('results.sprint') }]} />
      )}
      <Podium rows={rows} data={data} size={drawer ? 'md' : 'sm'} metric={(r) => (
        // 모바일 칸은 좁아 기록(1:42:00.785)과 점수를 두 줄로 나눈다
        <div style={drawer ? { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 } : { display: 'grid', rowGap: 2 }}>
          <span style={{ minWidth: 0, fontSize: 12, fontWeight: 600, color: 'var(--text2)', ...NUM, ...ellipsis }}>{statusText(r, tr)}</span>
          <Pts v={r.pts} size={15} tr={tr} />
        </div>
      )} />
      {rest.length > 0 && (
        <div className="g-group" style={{ marginTop: 8 }}>
          {shown.map((row, i) => <ResultRow key={row.n + '-' + i} row={row} data={data} tr={tr} desktop={drawer} last={i === shown.length - 1 && rest.length <= MORE} />)}
          {rest.length > MORE && (
            <button type="button" onClick={() => { setAll((v) => !v); if (!all) track('race_results_expanded', { kind, race_id: race.id }); }} style={{
              width: '100%', minHeight: 48, border: 0, background: 'transparent', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--text2)',
            }}>{all ? tr('results.showLess') : tr('results.showAll', { n: rows.length })}</button>
          )}
        </div>
      )}
    </section>
  );
}

// 라운드 목록 행 아래 포디움 줄: (사진) 1 VER  (사진) 2 LEC  (사진) 3 ANT
export function PodiumLine({ race }) {
  const tr = useT();
  const data = useF1Results(race?.series === 'F1');
  const res = resultOf(data, race);
  if (!res) return null;
  const top = res.gp.filter((r) => ['1', '2', '3'].includes(r.pt)).slice(0, 3);
  if (!top.length) return null;
  return (
    <div aria-label={tr('results.podiumAria', { list: top.map((r) => `${r.pt} ${r.given} ${r.family}`).join(', ') })}
      style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
      {top.map((r) => (
        <span key={r.n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Avatar src={photoOf(data, r.code)} code={r.code} size={18} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', ...NUM }}><span style={{ color: 'var(--text3)' }}>{r.pt}</span> {r.code}</span>
        </span>
      ))}
    </div>
  );
}

// 시리즈 탭의 하위 탭(글자 탭): 라운드 | 드라이버 순위
export function SubTabs({ items, value, onChange, size = 15 }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 20, boxShadow: 'inset 0 -1px 0 var(--line)' }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.id)} style={{
            minHeight: 44, padding: 0, border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: size, fontWeight: on ? 700 : 500, letterSpacing: '-0.01em', color: on ? 'var(--text)' : 'var(--text3)',
            boxShadow: on ? 'inset 0 -2px 0 var(--text)' : 'none',
          }}>{it.label}</button>
        );
      })}
    </div>
  );
}

// 드라이버 순위: 1~3위는 사진 포디움, 4위부터 목록. races는 '몇 라운드 이후'에 경기 이름을 붙이려고 받는다.
export function StandingsList({ races, variant = 'mobile' }) {
  const tr = useT();
  const fmt = useFormat();
  const data = useF1Results(true);
  if (!data) return <div style={{ minHeight: 240 }} />;
  const st = data.standings;
  const after = races.find((r) => raceKey(r) === st.raceId);
  const desk = variant === 'desktop';
  const rest = st.rows.slice(3);
  const cols = desk ? '40px 2px 36px minmax(0,1.4fr) minmax(0,1fr) 64px 64px' : '26px 2px 36px 1fr auto 40px';
  const lineLeft = desk ? 16 + 40 + 12 + 2 + 12 + 36 + 12 : 10 + 26 + 10 + 2 + 10 + 36 + 10;   // 구분선은 이름 시작점부터
  return (
    <section aria-label={tr('standings.title')}>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
        {tr('standings.after', { round: st.round, race: after ? fmt.race(after).shortName : '' })}
        {after?.raceDateLocal ? <span style={{ color: 'var(--text3)' }}> · {fmt.plainDateFull(after.raceDateLocal)}</span> : null}
      </div>
      <Podium rows={st.rows} data={data} size={desk ? 'lg' : 'sm'} metric={(r) => (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>{r.wins !== '0' ? tr('standings.wins', { n: r.wins }) : ''}</span>
          <Pts v={r.pts} size={desk ? 17 : 15} tr={tr} />
        </div>
      )} />
      <div className="g-group" style={{ marginTop: 8 }}>
        {desk && (
          <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 12, alignItems: 'center', padding: '10px 16px', boxShadow: 'inset 0 -1px 0 var(--line)' }}>
            {[tr('results.col.pos'), '', '', tr('results.col.driver'), tr('results.col.team'), tr('results.col.wins'), tr('results.col.pts')].map((h, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textAlign: i === 0 ? 'center' : i >= 5 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
        )}
        {rest.map((r, i) => (
          <div key={r.n || r.code} style={{
            display: 'grid', gridTemplateColumns: cols, columnGap: desk ? 12 : 10, alignItems: 'center',
            minHeight: 60, padding: desk ? '6px 16px' : '6px 16px 6px 10px', position: 'relative',
          }}>
            {i < rest.length - 1 && <span aria-hidden style={{ position: 'absolute', left: lineLeft, right: 0, bottom: 0, height: 1, background: 'var(--line)' }} />}
            <span style={{ textAlign: 'center', fontSize: desk ? 17 : 15, fontWeight: 700, color: 'var(--text)', ...NUM }}>{r.pt}</span>
            <Bar c={r.c} />
            <Avatar src={photoOf(data, r.code)} code={r.code} size={36} />
            <div style={{ minWidth: 0 }}>
              <DriverName row={r} size={15} />
              {!desk && <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, ...ellipsis }}>{r.teams.join(' / ')}</div>}
            </div>
            {desk
              ? <div style={{ fontSize: 13, color: 'var(--text2)', ...ellipsis }}>{r.teams.join(' / ')}</div>
              : <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>{r.wins !== '0' ? tr('standings.wins', { n: r.wins }) : ''}</span>}
            {desk && <span style={{ textAlign: 'right', fontSize: 15, fontWeight: 600, color: r.wins === '0' ? 'var(--text3)' : 'var(--text2)', ...NUM }}>{r.wins}</span>}
            <span style={{ textAlign: 'right', fontSize: desk ? 17 : 15, fontWeight: 700, color: 'var(--text)', ...NUM }}>{r.pts}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
