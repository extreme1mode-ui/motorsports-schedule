import { TOKENS, Mono } from './primitives.jsx';
import { SERIES } from './schedule/index.js';
import { SERIES_DESCRIPTIONS, COUNTRY_OPTIONS, optionStyles } from './preferences-options.js';

export function PageTitle({ theme, title, sub }) {
  const t = TOKENS[theme];
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25, color: t.text }}>{title}</h1>
      {sub && <p style={{ margin: '8px 0 0', fontSize: 14, color: t.text2, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

export function SectionTitle({ theme, title, sub }) {
  const t = TOKENS[theme];
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3, color: t.text }}>{title}</h2>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 13, color: t.text2, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

// 선택 표시. 시리즈 색은 선택된 상태의 이 점에만 쓴다.
export function CheckDot({ on, accent, theme }) {
  const t = TOKENS[theme];
  return (
    <span aria-hidden style={{
      flex: '0 0 auto', width: 22, height: 22, borderRadius: '50%', marginTop: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: on ? accent : 'transparent', border: `1.5px solid ${on ? accent : t.line2}`,
      transition: 'background 0.15s, border-color 0.15s',
    }}>
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.bg} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
    </span>
  );
}

// 시리즈 한 행: 점 + 약칭/풀네임 + 설명. onToggle이 있으면 체크박스 버튼, 없으면 정적 행(children으로 컨트롤을 붙인다).
export function SeriesRow({ seriesId, theme, selected, onToggle, children }) {
  const t = TOKENS[theme];
  const s = SERIES[seriesId];
  const { base, selected: sel } = optionStyles(t);
  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <CheckDot on={selected} accent={s.accent} theme={theme} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.005em' }}>{s.short}</span>
            <span style={{ fontSize: 12, color: t.text3 }}>{s.name}</span>
          </div>
          <div style={{ fontSize: 13, color: t.text2, marginTop: 4, lineHeight: 1.45 }}>{SERIES_DESCRIPTIONS[seriesId]}</div>
        </div>
      </div>
      {children && <div style={{ marginTop: 12 }}>{children}</div>}
    </>
  );
  const style = { ...base, ...(selected ? sel : null), display: 'block' };
  if (onToggle) {
    return <button type="button" role="checkbox" aria-checked={selected} onClick={onToggle} style={style}>{body}</button>;
  }
  return <div style={{ ...style, cursor: 'default' }}>{body}</div>;
}

// 라디오 그룹. 옵션은 { id, label, sub? }.
export function ChoiceGroup({ theme, options, value, onChange, label, columns = options.length, showSub = true }) {
  const t = TOKENS[theme];
  const { base, selected: sel } = optionStyles(t);
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8 }}>
      {options.map((opt) => {
        const on = value === opt.id;
        return (
          <button key={opt.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(opt.id)}
            style={{ ...base, ...(on ? sel : null), flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, padding: '10px 14px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: on ? t.text : t.text2 }}>{opt.label}</span>
            {showSub && opt.sub && <span style={{ fontSize: 12, color: t.text3 }}>{opt.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

// 국가 선택 목록. value/onChange는 COUNTRY_OPTIONS의 id 기준.
export function CountryChoices({ theme, value, onChange }) {
  const t = TOKENS[theme];
  const { base, selected: sel } = optionStyles(t);
  return (
    <div style={{ display: 'grid', gap: 8 }} role="radiogroup" aria-label="국가">
      {COUNTRY_OPTIONS.map((c) => {
        const on = value === c.id;
        return (
          <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.id)}
            style={{ ...base, ...(on ? sel : null) }}>
            <CheckDot on={on} accent={t.text} theme={theme} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TimezoneLabel({ theme, timezone }) {
  const t = TOKENS[theme];
  return <Mono size={12} color={t.text3}>{timezone}</Mono>;
}
