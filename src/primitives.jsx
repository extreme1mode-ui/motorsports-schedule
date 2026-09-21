import { SERIES } from './schedule/index.js';

// bg/surface 계열·line·text3는 src/styles/tokens.css와 같은 값 (QA R1). 값을 바꿀 땐 두 곳을 같이.
export const TOKENS = {
  dark: {
    bg: '#07080B', surface: '#0E1015', surface2: '#14171E', surface3: '#1C2029',
    line: 'rgba(255,255,255,0.07)', line2: 'rgba(255,255,255,0.13)',
    text: '#F3F4F6', text2: '#B4B7C0', text3: '#7C818E', grid: 'rgba(255,255,255,0.04)',
  },
  light: {
    bg: '#F2F3F5', surface: '#FFFFFF', surface2: '#F7F8FA', surface3: '#EBEDF1',
    line: 'rgba(16,18,24,0.09)', line2: 'rgba(16,18,24,0.16)',
    text: '#17181A', text2: '#5A5B63', text3: '#6A6E78', grid: 'rgba(0,0,0,0.04)',
  },
};

// 날짜·시간 표기는 useFormat()(사용자 시간대) 또는 schedule/format.js를 쓴다. KST 고정 래퍼는 제거됨.

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

export function getRoundDisplay(race, fallbackIndex) {
  if (race?.roundLabel) return race.roundLabel;
  const roundNumber = race?.round ?? race?.plannedRound ?? fallbackIndex;
  if (!Number.isFinite(roundNumber)) return 'TBA';
  return `R${String(roundNumber).padStart(2, '0')}`;
}

export function getRoundDescriptor(race, fallbackIndex) {
  if (race?.roundLabel) {
    return race?.roundDescriptor || `FEATURE ${race.roundLabel}`;
  }
  const roundNumber = race?.round ?? race?.plannedRound ?? fallbackIndex;
  if (!Number.isFinite(roundNumber)) return 'EVENT';
  return `ROUND ${String(roundNumber).padStart(2, '0')}`;
}

export function EventBadge({ label, tone = 'accent', theme = 'dark' }) {
  const t = TOKENS[theme];
  const tones = {
    accent: {
      background: 'rgba(255,255,255,0.12)',
      color: theme === 'dark' ? '#fff' : t.text,
    },
    endurance: {
      background: theme === 'dark' ? 'rgba(255,196,77,0.18)' : 'rgba(185,126,12,0.12)',
      color: theme === 'dark' ? '#FFD36A' : '#8B6200',
    },
    neutral: {
      background: theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      color: t.text2,
    },
  };
  const colors = tones[tone] || tones.accent;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 6px',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.08em',
      borderRadius: 3,
      background: colors.background,
      color: colors.color,
      fontFamily: '"JetBrains Mono", ui-monospace',
      textTransform: 'uppercase',
    }}>{label}</span>
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

// 중계처 무료/유료 배지. 색은 TOKENS만 — 무료는 반전(text/bg)으로 눈에 띄게, 유료는 외곽선만.
export function AccessBadge({ access, theme, label }) {
  if (!access) return null;
  const t = TOKENS[theme];
  const free = access === 'free';
  return (
    <span style={{
      flex: 'none', fontSize: 10, fontWeight: 700, lineHeight: 1.4, padding: '1px 6px', borderRadius: 999, letterSpacing: '0.02em',
      background: free ? t.text : 'transparent', color: free ? t.bg : t.text3, border: `1px solid ${free ? t.text : t.line2}`,
    }}>{label}</span>
  );
}

// 외부로 나가는 링크 표시(↗). 텍스트 대체는 호출부의 숨김 텍스트로.
export function ExternalIcon({ color, size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}
