// 온보딩·설정 공용 부품. AI 티 정리(C5·D1, 2026-10-29):
// 선택지마다 테두리 카드 → 그릇 하나 안의 줄, 원형 체크 + 선택 카드 → 오른쪽 체크(국가) / 세그먼트(관심 수준),
// 시간대는 IANA 값(Asia/Seoul) 대신 사람 말('대한민국 시간' + 'Seoul · UTC+9').
import { SERIES } from './schedule/index.js';
import { getTimeZoneLabel } from './schedule/format.js';
import { SERIES_DESCRIPTION_KEYS, COUNTRY_OPTIONS } from './preferences-options.js';
import { useT } from './i18n/index.js';
import { useFormat } from './use-format.js';
import { Group, Segmented } from './ui.jsx';

// 화면 제목 28/700 (+ 아래 15px 한 줄)
export function PageTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 data-view-title tabIndex={-1} style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, color: 'var(--text)' }}>{title}</h1>
      {sub && <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text2)', lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

// 섹션 머리 20/700 + 아래 13px 설명
export function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.4, color: 'var(--text)' }}>{title}</h2>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

// 체크 표시(오른쪽). 고르지 않았으면 빈 원(onboarding) 또는 아무것도 없음(목록).
export function CheckMark({ on, circle = false }) {
  if (circle) {
    return (
      <span aria-hidden style={{
        flex: 'none', width: 24, height: 24, borderRadius: 12, display: 'grid', placeItems: 'center', marginTop: 1,
        background: on ? 'var(--text)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--surface3)', color: 'var(--bg)',
        transition: 'background var(--dur-state) var(--ease-std)',
      }}>
        {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
      </span>
    );
  }
  return on
    ? <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M5 12l5 5L20 7" /></svg>
    : null;
}

// 시리즈 줄: ● F1 Formula 1 / 한 줄 설명. onToggle이 있으면 체크 줄(온보딩), 없으면 아래에 컨트롤(children)을 붙인다(설정).
export function SeriesRow({ seriesId, selected, onToggle, children }) {
  const tr = useT();
  const s = SERIES[seriesId];
  const head = (
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: s.accent, flex: 'none' }} />
        <span style={{ fontSize: 17, lineHeight: 1.4, fontWeight: 700, color: 'var(--text)' }}>{s.short}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)' }}>{s.name}</span>
      </span>
      <span style={{ display: 'block', marginTop: 2, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{tr(SERIES_DESCRIPTION_KEYS[seriesId])}</span>
    </span>
  );
  if (onToggle) {
    return (
      <button type="button" role="checkbox" aria-checked={selected} onClick={onToggle} className="g-row g-tap press-row" style={{ alignItems: 'flex-start', padding: '14px 16px' }}>
        {head}<CheckMark on={selected} circle />
      </button>
    );
  }
  return (
    <div className="g-row" style={{ display: 'block', padding: '14px 16px 16px' }}>
      <div style={{ display: 'flex' }}>{head}</div>
      {children && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

// 셋 이하 선택지: 세그먼트. 옵션은 { id, label, sub?, raw? }.
// showSub면 고른 선택지의 설명을 아래 한 줄로(예전 카드 속 작은 글자 대신).
export function ChoiceGroup({ options, value, onChange, label, showSub = true }) {
  const tr = useT();
  const opts = options.map((o) => ({ id: o.id, label: o.raw ? o.label : tr(o.label) }));
  const picked = options.find((o) => o.id === value);
  return (
    <div>
      <Segmented options={opts} value={value} onChange={onChange} label={label} />
      {showSub && picked?.sub && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text3)' }}>{tr(picked.sub)}</div>}
    </div>
  );
}

// 국가 목록: 그릇 하나, 고른 줄 오른쪽에 체크. value/onChange는 COUNTRY_OPTIONS의 id 기준.
export function CountryChoices({ value, onChange }) {
  const tr = useT();
  return (
    <Group role="radiogroup" aria-label={tr('aria.country')}>
      {COUNTRY_OPTIONS.map((c) => {
        const on = value === c.id;
        return (
          <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.id)} className="g-row g-tap press-row" style={{ minHeight: 52 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: on ? 600 : 500, color: 'var(--text)' }}>{tr(c.label)}</span>
            <CheckMark on={on} />
          </button>
        );
      })}
    </Group>
  );
}

// UTC 오프셋 '+9', '-5', '+5:30'. 못 읽으면 ''.
function utcOffset(timeZone) {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '';
    const m = name.match(/GMT([+-]\d{1,2}(?::\d{2})?)?/);
    return m ? (m[1] || '+0') : '';
  } catch { return ''; }
}

// 시간대: '대한민국 시간' (큰 글자) + 'Seoul · UTC+9' (12px). inline이면 문장 안에 이름만.
export function TimezoneLabel({ timezone, inline = false }) {
  const fmt = useFormat();
  const tr = useT();
  const name = getTimeZoneLabel(timezone, fmt.locale);
  if (inline) return <>{name}</>;
  const city = String(timezone || '').split('/').pop().replace(/_/g, ' ');
  const off = utcOffset(timezone);
  return (
    <span style={{ display: 'block', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{name}</span>
      <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'var(--text3)' }}>{[city !== name ? city : null, off ? tr('settings.timezone.offset', { offset: off }) : null].filter(Boolean).join(' · ')}</span>
    </span>
  );
}
