// F1 결과 화면 부품: 경기 상세의 결과 섹션, 라운드 행의 포디움 줄, 시리즈 탭의 드라이버 순위, 하위 탭.
// 값은 데이터 원문 그대로 보여 준다(순위 글자 R·W, 기록 문자열, 점수). 상태 문구만 언어에 맞춰 옮긴다.
// 드라이버 사진은 무채색 바탕 위에 둔다. 팀 색은 식별용 3px 막대로만 쓴다. 사진이 없으면 드라이버 코드로 그린다.
import { useState } from 'react';
import { TOKENS, Mono } from '../primitives.jsx';
import { useFormat } from '../use-format.js';
import { useT } from '../i18n/index.js';
import { track } from '../analytics.js';
import { getRaceStartUtc } from '../schedule/index.js';
import { useF1Results, resultOf, teamColor, raceKey, photoOf, photoFocusX } from './results.js';

const MORE = 7;   // 포디움 아래 처음에 보여 줄 줄 수(4~10위). 나머지는 '전체 보기'로 편다.

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
export function Avatar({ src, code, size = 36, theme }) {
  const t = TOKENS[theme];
  return (
    <span aria-hidden style={{
      position: 'relative', flex: 'none', width: size, height: size, borderRadius: 999, overflow: 'hidden',
      background: t.surface3, display: 'grid', placeItems: 'center',
    }}>
      {src
        ? <img src={src} alt="" decoding="async" loading="lazy" style={{ position: 'absolute', width: '150%', height: '150%', maxWidth: 'none', left: `${(0.5 - photoFocusX(code) * 1.5) * 100}%`, top: '2%' }} />
        : <Mono size={Math.max(8, Math.round(size * 0.3))} weight={700} color={t.text2}>{code}</Mono>}
    </span>
  );
}

function DriverName({ row, t, size = 14 }) {
  return (
    <div style={{ fontSize: size, color: t.text, letterSpacing: '-0.01em', ...ellipsis }}>
      <span style={{ color: t.text2, fontWeight: 500 }}>{row.given} </span>
      <span style={{ fontWeight: 700 }}>{row.family}</span>
    </div>
  );
}

function Bar({ c }) {
  return <span aria-hidden style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: teamColor(c), margin: '6px 0' }} />;
}

// 포디움 세 칸. 화면에는 2 · 1 · 3 순서로 놓고 1위 칸을 조금 높게 둔다. 읽는 순서(DOM)는 1 · 2 · 3.
// size: 'sm' 모바일 · 'md' 데스크톱 드로어 · 'lg' 데스크톱 시리즈 탭(전체 폭이라 사진을 자르지 않고 가운데 둔다)
function Podium({ rows, data, theme, size = 'sm', metric }) {
  const t = TOKENS[theme];
  const top = rows.slice(0, 3);
  const tall = { sm: 128, md: 156, lg: 196 }[size];
  const wide = size !== 'sm';
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, alignItems: 'end' }}>
      {top.map((r, i) => {
        const src = photoOf(data, r.code);
        return (
          <li key={(r.n || r.code) + '-' + i} style={{ order: [2, 1, 3][i], minWidth: 0, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: i === 0 ? tall : tall - 20, background: t.surface3, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
              {src
                ? <img src={src} alt="" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: size === 'lg' ? 'contain' : 'cover', objectPosition: size === 'lg' ? '50% 100%' : '50% 0%' }} />
                : <Mono size={22} weight={700} color={t.text3}>{r.code}</Mono>}
              <Mono size={{ sm: 18, md: 22, lg: 28 }[size]} weight={700} color={t.text} style={{ position: 'absolute', left: size === 'lg' ? 14 : 9, top: size === 'lg' ? 10 : 6 }}>{r.pt}</Mono>
              <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: teamColor(r.c) }} />
            </div>
            <div style={{ padding: size === 'lg' ? '12px 16px 14px' : wide ? '10px 12px 12px' : '9px 10px 10px' }}>
              <div style={{ fontSize: size === 'lg' ? 17 : wide ? 15 : 14, fontWeight: 700, color: t.text, letterSpacing: '-0.01em', ...ellipsis }}>{r.family}</div>
              <div style={{ fontSize: 11, color: t.text3, marginTop: 1, ...ellipsis }}>{r.team || (r.teams || []).join(' / ')}</div>
              <div style={{ marginTop: 6 }}>{metric(r)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ResultRow({ row, data, theme, tr, last, desktop }) {
  const t = TOKENS[theme];
  const timed = !!row.time;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: desktop ? '28px 3px 32px 1fr auto 36px' : '24px 3px 32px 1fr auto 30px', columnGap: 10,
      alignItems: 'center', minHeight: 56, padding: '6px 14px 6px 10px',
      borderBottom: last ? 'none' : `1px solid ${t.line}`,
    }}>
      <Mono size={14} weight={700} color={/^\d+$/.test(row.pt) ? t.text : t.text3} style={{ textAlign: 'center' }}>{row.pt}</Mono>
      <Bar c={row.c} />
      <Avatar src={photoOf(data, row.code)} code={row.code} size={32} theme={theme} />
      <div style={{ minWidth: 0 }}>
        <DriverName row={row} t={t} size={14} />
        <div style={{ fontSize: 11, color: t.text3, marginTop: 2, ...ellipsis }}>{row.team}</div>
      </div>
      <Mono size={12} weight={timed ? 600 : 500} color={timed ? t.text2 : t.text3} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{statusText(row, tr)}</Mono>
      <Mono size={14} weight={700} color={row.pts === '0' ? t.text3 : t.text} style={{ textAlign: 'right' }}>{row.pts}</Mono>
    </div>
  );
}

function Segment({ items, value, onChange, theme }) {
  const t = TOKENS[theme];
  return (
    <div role="tablist" style={{ display: 'inline-flex', padding: 3, borderRadius: 12, background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.id)} style={{
            minHeight: 36, padding: '0 16px', border: 0, borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: on ? 700 : 600, letterSpacing: '-0.005em',
            background: on ? t.surface : 'transparent', color: on ? t.text : t.text2,
            boxShadow: on ? (theme === 'dark' ? '0 1px 2px rgba(0,0,0,0.5)' : '0 1px 2px rgba(16,18,24,0.12)') : 'none',
          }}>{it.label}</button>
        );
      })}
    </div>
  );
}

const Pts = ({ v, t, size }) => (
  <Mono size={size} weight={700} color={t.text} style={{ whiteSpace: 'nowrap' }}>{v}<span style={{ fontSize: 9, fontWeight: 700, color: t.text3, marginLeft: 3, letterSpacing: '0.06em' }}>PTS</span></Mono>
);

// 경기 상세(모바일 시트·데스크톱 드로어)의 결과 섹션. 결과 데이터가 있는 F1 경기에서만 그린다.
export function RaceResultSection({ race, theme, variant = 'sheet' }) {
  const t = TOKENS[theme];
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
    <section style={drawer ? { marginBottom: 24 } : { padding: '24px 18px 0' }} aria-label={tr('results.aria', { race: fmt.race(race).name })}>
      <Mono size={10} weight={700} color={t.text3} style={{ letterSpacing: drawer ? '0.16em' : '0.14em' }}>{tr('results.title')}</Mono>
      {res.sprint && (
        <div style={{ marginTop: 10 }}>
          <Segment theme={theme} value={kind} onChange={(k) => { setKind(k); setAll(false); track('race_results_kind_changed', { kind: k, race_id: race.id }); }}
            items={[{ id: 'gp', label: tr('results.gp') }, { id: 'sprint', label: tr('results.sprint') }]} />
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Podium rows={rows} data={data} theme={theme} size={drawer ? 'md' : 'sm'} metric={(r) => (
          // 모바일 칸은 좁아 기록(1:42:00.785)과 점수를 두 줄로 나눈다
          <div style={drawer ? { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 } : { display: 'grid', rowGap: 3 }}>
            <Mono size={11} weight={600} color={t.text2} style={{ minWidth: 0, ...ellipsis }}>{statusText(r, tr)}</Mono>
            <Pts v={r.pts} t={t} size={drawer ? 12 : 13} />
          </div>
        )} />
      </div>
      {rest.length > 0 && (
        <div style={{ marginTop: 8, background: t.surface, border: `1px solid ${t.line}`, borderRadius: drawer ? 12 : 14, overflow: 'hidden' }}>
          {shown.map((row, i) => <ResultRow key={row.n + '-' + i} row={row} data={data} theme={theme} tr={tr} desktop={drawer} last={i === shown.length - 1 && rest.length <= MORE} />)}
          {rest.length > MORE && (
            <button type="button" onClick={() => { setAll((v) => !v); if (!all) track('race_results_expanded', { kind, race_id: race.id }); }} style={{
              width: '100%', minHeight: 48, border: 0, borderTop: `1px solid ${t.line}`, background: 'transparent', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: t.text2,
            }}>{all ? tr('results.showLess') : tr('results.showAll', { n: rows.length })}</button>
          )}
        </div>
      )}
    </section>
  );
}

// 라운드 목록 행 아래 포디움 줄: (사진) 1 VER · (사진) 2 LEC · (사진) 3 ANT
export function PodiumLine({ race, theme, size = 11 }) {
  const t = TOKENS[theme];
  const tr = useT();
  const data = useF1Results(race?.series === 'F1');
  const res = resultOf(data, race);
  if (!res) return null;
  const top = res.gp.filter((r) => ['1', '2', '3'].includes(r.pt)).slice(0, 3);
  if (!top.length) return null;
  return (
    <div aria-label={tr('results.podiumAria', { list: top.map((r) => `${r.pt} ${r.given} ${r.family}`).join(', ') })}
      style={{ display: 'flex', gap: 12, marginTop: 7, flexWrap: 'wrap' }}>
      {top.map((r) => (
        <span key={r.n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Avatar src={photoOf(data, r.code)} code={r.code} size={22} theme={theme} />
          <Mono size={size} weight={600} color={t.text2}><span style={{ color: t.text3 }}>{r.pt}</span> {r.code}</Mono>
        </span>
      ))}
    </div>
  );
}

// 시리즈 탭의 하위 탭(글자 탭): 라운드 | 드라이버 순위
export function SubTabs({ items, value, onChange, theme, size = 15 }) {
  const t = TOKENS[theme];
  return (
    <div role="tablist" style={{ display: 'flex', gap: 20, borderBottom: `1px solid ${t.line}` }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(it.id)} style={{
            minHeight: 44, padding: 0, border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: size, fontWeight: 600, letterSpacing: '-0.01em', color: on ? t.text : t.text3,
            boxShadow: on ? `inset 0 -2px 0 ${t.text}` : 'none',
          }}>{it.label}</button>
        );
      })}
    </div>
  );
}

// 드라이버 순위: 1~3위는 사진 포디움, 4위부터 목록. races는 '몇 라운드 이후'에 경기 이름을 붙이려고 받는다.
export function StandingsList({ theme, races, variant = 'mobile' }) {
  const t = TOKENS[theme];
  const tr = useT();
  const fmt = useFormat();
  const data = useF1Results(true);
  if (!data) return <div style={{ minHeight: 240 }} />;
  const st = data.standings;
  const after = races.find((r) => raceKey(r) === st.raceId);
  const desk = variant === 'desktop';
  const rest = st.rows.slice(3);
  const cols = desk ? '40px 3px 36px minmax(0,1.4fr) minmax(0,1fr) 64px 64px' : '26px 3px 36px 1fr auto 40px';
  return (
    <section aria-label={tr('standings.title')}>
      <div style={{ fontSize: 13, color: t.text2, marginBottom: 12 }}>
        {tr('standings.after', { round: st.round, race: after ? fmt.race(after).shortName : '' })}
        {after?.raceDateLocal ? <span style={{ color: t.text3 }}> · {fmt.plainDateFull(after.raceDateLocal)}</span> : null}
      </div>
      <Podium rows={st.rows} data={data} theme={theme} size={desk ? 'lg' : 'sm'} metric={(r) => (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
          <Mono size={desk ? 12 : 11} weight={600} color={t.text3} style={{ whiteSpace: 'nowrap' }}>{r.wins !== '0' ? tr('standings.wins', { n: r.wins }) : ''}</Mono>
          <Pts v={r.pts} t={t} size={desk ? 20 : 15} />
        </div>
      )} />
      <div style={{ marginTop: 8, background: t.surface, border: `1px solid ${t.line}`, borderRadius: desk ? 12 : 14, overflow: 'hidden' }}>
        {desk && (
          <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${t.line}` }}>
            {['POS', '', '', 'DRIVER', 'TEAM', 'WINS', 'PTS'].map((h, i) => (
              <Mono key={i} size={10} weight={700} color={t.text3} style={{ letterSpacing: '0.12em', textAlign: i === 0 ? 'center' : i >= 5 ? 'right' : 'left' }}>{h}</Mono>
            ))}
          </div>
        )}
        {rest.map((r, i) => (
          <div key={r.n || r.code} style={{
            display: 'grid', gridTemplateColumns: cols, columnGap: desk ? 12 : 10, alignItems: 'center',
            minHeight: 60, padding: desk ? '6px 16px' : '6px 14px 6px 10px',
            borderBottom: i === rest.length - 1 ? 'none' : `1px solid ${t.line}`,
          }}>
            <Mono size={desk ? 16 : 15} weight={700} color={t.text} style={{ textAlign: 'center' }}>{r.pt}</Mono>
            <Bar c={r.c} />
            <Avatar src={photoOf(data, r.code)} code={r.code} size={36} theme={theme} />
            <div style={{ minWidth: 0 }}>
              <DriverName row={r} t={t} size={desk ? 15 : 14} />
              {!desk && <div style={{ fontSize: 11, color: t.text3, marginTop: 2, ...ellipsis }}>{r.teams.join(' / ')}</div>}
            </div>
            {desk
              ? <div style={{ fontSize: 13, color: t.text2, ...ellipsis }}>{r.teams.join(' / ')}</div>
              : <Mono size={11} weight={600} color={t.text3} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.wins !== '0' ? tr('standings.wins', { n: r.wins }) : ''}</Mono>}
            {desk && <Mono size={14} weight={600} color={r.wins === '0' ? t.text3 : t.text2} style={{ textAlign: 'right' }}>{r.wins}</Mono>}
            <Mono size={desk ? 16 : 15} weight={700} color={t.text} style={{ textAlign: 'right' }}>{r.pts}</Mono>
          </div>
        ))}
      </div>
    </section>
  );
}
