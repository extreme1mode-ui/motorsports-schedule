import { SERIES } from './schedule/index.js';

// 색은 src/styles/tokens.css 한 곳에서 온다. 테마는 <html data-theme>가 바꾸므로 dark/light가 같은 변수를 가리킨다.
// (예전에는 여기 hex를 따로 두어 tokens.css와 본문·보조 글자색이 달랐다.)
const VARS = {
  bg: 'var(--bg)', surface: 'var(--surface)', surface2: 'var(--surface2)', surface3: 'var(--surface3)',
  line: 'var(--line)', line2: 'var(--line2)',
  text: 'var(--text)', text2: 'var(--text2)', text3: 'var(--text3)', grid: 'var(--grid)',
  brand: 'var(--brand)', onbrand: 'var(--onbrand)',
};
export const TOKENS = { dark: VARS, light: VARS };

// 숫자·영문 라벨용 글꼴. 서체는 Pretendard 하나로 통일하고 숫자만 tnum으로 고정폭을 얻는다.
// 인라인 스타일에서 같은 문자열을 반복하지 말고 이 상수를 가져다 쓴다.
export const FONT_DATA = {
  fontFamily: '"Pretendard Variable", "Pretendard", -apple-system, "Apple SD Gothic Neo", system-ui, sans-serif',
  fontFeatureSettings: '"tnum"',
};

// 라벨 자간: 라틴 대문자·숫자에만 +8%(--track-label), 한글은 0. 넘어온 자간이 양수면 이 규칙으로 바꾼다.
const HANGUL = /([\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]+)/;
function trackRuns(children) {
  if (typeof children !== 'string' || !HANGUL.test(children)) return children;
  return children.split(HANGUL).filter(Boolean).map((part, i) => (HANGUL.test(part)
    ? <span key={i} style={{ letterSpacing: 0 }}>{part}</span>
    : part));
}
function isPositiveTrack(value) {
  const m = typeof value === 'string' && value.match(/^(-?[\d.]+)em$/);
  return !!m && Number(m[1]) > 0;
}

// 날짜·시간 표기는 useFormat()(사용자 시간대) 또는 schedule/format.js를 쓴다. KST 고정 래퍼는 제거됨.

export function Mono({ children, size = 14, weight = 500, color, style }) {
  const track = isPositiveTrack(style?.letterSpacing);
  return (
    <span style={{
      ...FONT_DATA,
      fontSize: size, fontWeight: weight, color,
      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      ...style,
      ...(track ? { letterSpacing: 'var(--track-label)' } : null),
    }}>{track ? trackRuns(children) : children}</span>
  );
}

export function SeriesTag({ series, theme = 'dark', variant = 'solid' }) {
  const s = SERIES[series];
  if (variant === 'ghost') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 7px 3px 5px', borderRadius: 'var(--r-tag)',
        background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
        color: 'var(--text)', textTransform: 'uppercase', ...FONT_DATA,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.accent }} />
        {s.short}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 7px', borderRadius: 'var(--r-tag)',
      background: s.accent, color: '#fff',
      fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
      textTransform: 'uppercase', ...FONT_DATA,
    }}>{s.short}</span>
  );
}

// 시리즈 머리 카드의 빛 한 점(오른쪽 위). 시리즈 색이 면에 닿는 유일한 자리 — 다크 20% · 라이트 11%.
export function seriesGlow(accent, theme) {
  return accent ? `radial-gradient(120% 140% at 100% 0%, ${accent}${theme === 'dark' ? '33' : '1C'} 0%, transparent 55%)` : 'none';
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

export function EventBadge({ label, tone = 'accent', theme = 'dark', onPhoto }) {
  const t = TOKENS[theme];
  if (onPhoto) tone = 'photo';
  const tones = {
    accent: {
      background: 'rgba(255,255,255,0.12)',
      color: theme === 'dark' ? '#fff' : t.text,
    },
    endurance: {   // 노랑은 '지금'에만 — 이벤트 표시는 무채색 외곽선
      background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--line2)',
      color: t.text2,
    },
    photo: { background: 'transparent', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.55)', color: '#fff' },
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
      borderRadius: 'var(--r-tag)',
      background: colors.background,
      boxShadow: colors.boxShadow,
      color: colors.color,
      ...FONT_DATA,
      textTransform: 'uppercase',
    }}>{label}</span>
  );
}

// onPhoto: 사진 위(상세 머리)에서는 테마와 무관하게 흰 계조
export function StatusPill({ status, onPhoto }) {
  const base = { padding: '2px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', borderRadius: 'var(--r-tag)', ...FONT_DATA, textTransform: 'uppercase' };
  if (onPhoto && status !== 'live') {
    const label = { next: 'NEXT', cancelled: 'CANCELLED', completed: 'DONE' }[status];
    if (!label) return null;
    return <span style={{ ...base, color: '#fff', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.55)', textDecoration: status === 'cancelled' ? 'line-through' : 'none' }}>{label}</span>;
  }
  if (status === 'next') return <span style={{ ...base, color: 'var(--text)', boxShadow: 'inset 0 0 0 1px var(--text)' }}>NEXT</span>;
  if (status === 'live') return <span style={{ ...base, color: 'var(--signal-ink)', background: 'var(--signal-wash)', boxShadow: 'inset 0 0 0 1px var(--signal-line)' }}>LIVE</span>;
  if (status === 'cancelled') return <span style={{ ...base, color: 'var(--text3)', boxShadow: 'inset 0 0 0 1px var(--line2)', textDecoration: 'line-through' }}>CANCELLED</span>;
  if (status === 'completed') return <span style={{ ...base, color: 'var(--text3)', background: 'var(--surface3)' }}>DONE</span>;
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
