import { SERIES } from './schedule/index.js';

export const TOKENS = {
  dark: {
    bg: '#0A0B0E', surface: '#14161B', surface2: '#1C1F26', surface3: '#242831',
    line: 'rgba(255,255,255,0.08)', line2: 'rgba(255,255,255,0.14)',
    text: '#F3F4F6', text2: '#B4B7C0', text3: '#7A7E8A', grid: 'rgba(255,255,255,0.04)',
  },
  light: {
    bg: '#F2F2F5', surface: '#FFFFFF', surface2: '#F4F4F9', surface3: '#E9EBF2',
    line: 'rgba(0,0,0,0.08)', line2: 'rgba(0,0,0,0.14)',
    text: '#17181A', text2: '#5A5B63', text3: '#8F919D', grid: 'rgba(0,0,0,0.04)',
  },
};

export const MONTHS_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
export const DAYS_KO = ['일','월','화','수','목','금','토'];

export function kstDate(iso) {
  if (!iso) return null;
  return new Date(iso.length === 10 ? iso + 'T00:00:00+09:00' : iso);
}
export function fmtDate(iso) {
  const d = kstDate(iso); if (!d) return '';
  return `${d.getMonth()+1}월 ${d.getDate()}일`;
}
export function fmtDateFull(iso) {
  const d = kstDate(iso); if (!d) return '';
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} (${DAYS_KO[d.getDay()]})`;
}

export function Mono({ children, size = 14, weight = 500, color, style }) {
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: size, fontWeight: weight, color,
      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      ...style,
    }}>{children}</span>
  );
}

export function SeriesTag({ series, theme = 'dark', variant = 'solid' }) {
  const s = SERIES[series];
  if (variant === 'ghost') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 7px 3px 5px', borderRadius: 4,
        background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
        color: s.accent, textTransform: 'uppercase', fontFamily: '"JetBrains Mono", ui-monospace',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.accent }} />
        {s.short}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 7px', borderRadius: 4,
      background: s.accent, color: '#fff',
      fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
      textTransform: 'uppercase', fontFamily: '"JetBrains Mono", ui-monospace',
    }}>{s.short}</span>
  );
}

export function StatusPill({ status, theme = 'dark' }) {
  const t = TOKENS[theme];
  if (status === 'next') return (
    <span style={{
      padding: '2px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      borderRadius: 3, background: 'rgba(46,125,255,0.15)', color: '#6BA3FF',
      fontFamily: '"JetBrains Mono", ui-monospace', textTransform: 'uppercase',
    }}>NEXT</span>
  );
  if (status === 'live') return (
    <span style={{
      padding: '2px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      borderRadius: 3, background: 'rgba(20,209,155,0.16)', color: '#22D77E',
      fontFamily: '"JetBrains Mono", ui-monospace', textTransform: 'uppercase',
    }}>LIVE</span>
  );
  if (status === 'cancelled') return (
    <span style={{
      padding: '2px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      borderRadius: 3, background: 'rgba(255,77,95,0.15)', color: '#FF6B7A',
      fontFamily: '"JetBrains Mono", ui-monospace', textTransform: 'uppercase',
    }}>CANCELLED</span>
  );
  if (status === 'completed') return (
    <span style={{
      padding: '2px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      borderRadius: 3, background: theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      color: t.text3, fontFamily: '"JetBrains Mono", ui-monospace', textTransform: 'uppercase',
    }}>DONE</span>
  );
  return null;
}
