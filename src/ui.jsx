// 화면 공용 부품 — 제목, 섹션 머리, 묶음 그릇, 이동 링크.
// AI 티 정리(2026-10-29) 기준: 영문 대문자 머리말 없음, 자간 0, 글자 7단계(12·13·15·17·20·28·40),
// 비슷한 줄은 그릇 하나에 담고 줄 사이는 들여 쓴 구분선 하나(index.css .g-group/.g-row). 그릇은 면만, 테두리·그림자 없음.
import { Chevron } from './primitives.jsx';

// 화면 제목 28/700 + 아래 한 줄(13px). 화면 전환 포커스(data-view-title)를 받는다.
export function ScreenTitle({ title, sub, right, style }) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', ...style }}>
      <div style={{ minWidth: 0 }}>
        <h1 data-view-title tabIndex={-1} style={{ margin: 0, fontSize: 28, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>{title}</h1>
        {sub && <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.4, fontWeight: 500, color: 'var(--text2)' }}>{sub}</div>}
      </div>
      {right && <div style={{ flex: 'none', minWidth: 0 }}>{right}</div>}
    </header>
  );
}

// 섹션 머리 20/700. 오른쪽에는 기준 한 줄(13px)이나 이동 링크.
export function SectionHead({ title, aside, as: Tag = 'h2', size = 20, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10, ...style }}>
      <Tag style={{ margin: 0, fontSize: size, lineHeight: 1.4, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)' }}>{title}</Tag>
      {aside && <div style={{ flex: 'none', fontSize: 13, lineHeight: 1.4, fontWeight: 500, color: 'var(--text3)' }}>{aside}</div>}
    </div>
  );
}

// 이동 링크: '전체 일정 ›'. 글자 화살표(→) 대신 꺾쇠 아이콘.
export function MoreLink({ children, onClick, style }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 2, minHeight: 44, padding: '0 4px', margin: '-12px -4px',
      border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 15, fontWeight: 500, color: 'var(--text2)', ...style,
    }}>{children}<Chevron size={16} /></button>
  );
}

// 묶음 그릇. inset = 줄 사이 구분선이 시작하는 x(줄 글자 시작점).
export function Group({ children, inset, style, ...rest }) {
  return <div className="g-group" style={{ ...(inset != null ? { '--g-inset': `${inset}px` } : null), ...style }} {...rest}>{children}</div>;
}

// 그릇 아래 안내 한 줄.
export function GroupNote({ children, style }) {
  return <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--text3)', ...style }}>{children}</div>;
}

// 날짜 묶음 머리(13/600): '10월 3일 (토)'.
export function DayHead({ children, style }) {
  return <div style={{ padding: '20px 4px 8px', fontSize: 13, lineHeight: 1.4, fontWeight: 600, color: 'var(--text2)', ...style }}>{children}</div>;
}

// 라벨-값 한 줄(설정형 목록): 왼쪽 이름, 오른쪽 값.
export function KeyValueRow({ label, value, style }) {
  return (
    <div className="g-row" style={{ minHeight: 52, ...style }}>
      <span style={{ fontSize: 15, color: 'var(--text2)', flex: 'none' }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 600, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

// 세그먼트(셋 이하 선택지). 트랙 면 + 고른 칸만 한 단계 밝은 면.
export function Segmented({ options, value, onChange, label, style, size = 'md' }) {
  const h = size === 'sm' ? 30 : 36;
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 10, background: 'var(--surface3)', ...style }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.id)} style={{
            flex: 1, minWidth: 0, minHeight: 44, margin: `${(h - 44) / 2}px 0`, padding: 0, border: 0, background: 'none', cursor: 'pointer',
            fontFamily: 'inherit', display: 'grid', placeItems: 'center',
          }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: '100%', height: h - 4, borderRadius: 8, padding: '0 8px', whiteSpace: 'nowrap',
              fontSize: 13, fontWeight: 600, color: on ? 'var(--text)' : 'var(--text2)',
              background: on ? 'var(--seg-on)' : 'transparent', boxShadow: on ? 'var(--seg-on-shadow)' : 'none',
              transition: 'background var(--dur-state) var(--ease-std), color var(--dur-state) var(--ease-std)',
            }}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// 필터 칩(알약): 고르지 않은 칩은 면만, 고른 칩은 본문색 반전. 시리즈 색으로 채우지 않는다.
export function Chip({ on, children, onClick, style }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={{
      flex: 'none', minHeight: 44, minWidth: 44, padding: 0, margin: '-6px 0', border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 14px', borderRadius: 999, whiteSpace: 'nowrap',
        fontSize: 15, fontWeight: 600, background: on ? 'var(--text)' : 'var(--fill)', color: on ? 'var(--bg)' : 'var(--text2)',
      }}>{children}</span>
    </button>
  );
}
