import { SERIES } from './schedule/index.js';
import { useT } from './i18n/index.js';

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

// 날짜·시간 표기는 useFormat()(사용자 시간대) 또는 schedule/format.js를 쓴다. KST 고정 래퍼는 제거됨.

// 숫자 글자. 자간은 더하지 않는다 — 넘어온 양수 자간은 0으로 (AI 티 정리: 대문자 라벨 자간 금지).
export function Mono({ children, size = 13, weight = 500, color, style }) {
  const ls = style?.letterSpacing;
  const positive = typeof ls === 'string' ? parseFloat(ls) > 0 : typeof ls === 'number' && ls > 0;
  return (
    <span style={{
      ...FONT_DATA,
      fontSize: Math.max(12, size), fontWeight: weight, color,
      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      ...style,
      ...(positive ? { letterSpacing: 0 } : null),
      ...(style?.textTransform ? { textTransform: 'none' } : null),
    }}>{children}</span>
  );
}

// 시리즈 표시: 색 점 하나 + 코드 글자(F1·WEC…). 색만으로 구분하지 않는다. 면·알약·대문자 자간 없음.
// round를 주면 같은 줄에 'R19'처럼 붙인다. onPhoto(사진 위)는 테마와 무관하게 흰 계조.
export function SeriesTag({ series, round, onPhoto, size = 13, style }) {
  const s = SERIES[series];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, flex: 'none',
      fontSize: size, lineHeight: 1.4, fontWeight: 600,
      color: onPhoto ? 'rgba(255,255,255,0.88)' : 'var(--text2)', ...FONT_DATA, ...style,
    }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: s?.accent || 'currentColor', flex: 'none' }} />
      {s?.short || series}{round ? <span style={{ fontWeight: 500 }}>{round}</span> : null}
    </span>
  );
}

// 시리즈 머리 카드의 빛 한 점(오른쪽 위). 시리즈 색이 면에 닿는 유일한 자리 — 다크 20% · 라이트 11%.
export function seriesGlow(accent, theme) {
  return accent ? `radial-gradient(120% 140% at 100% 0%, ${accent}${theme === 'dark' ? '33' : '1C'} 0%, transparent 55%)` : 'none';
}

// 이벤트 표시(스프린트 주말 등): 글자만. 상자·대문자 없음.
export function EventBadge({ label, onPhoto }) {
  if (!label) return null;
  return <span style={{ fontSize: 12, lineHeight: 1.4, fontWeight: 500, color: onPhoto ? 'rgba(255,255,255,0.75)' : 'var(--text3)', whiteSpace: 'nowrap' }}>{label}</span>;
}

// 경기 상태: 한국어 글자로. 알약·면·대문자 없음.
//   종료·취소 = 흐린 글자, 다음 경기 = 본문색 600, 진행 중 = 노랑 점 + 글자(결정 10). 색은 진행 중에만.
export function StatusPill({ status, onPhoto }) {
  const tr = useT();
  const label = { completed: tr('status.done'), cancelled: tr('status.cancelled'), next: tr('status.next'), live: tr('status.live') }[status];
  if (!label) return null;
  const base = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, lineHeight: 1.4, whiteSpace: 'nowrap' };
  if (status === 'live') {
    return (
      <span style={{ ...base, fontWeight: 600, color: onPhoto ? '#fff' : 'var(--text)' }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)' }} />{label}
      </span>
    );
  }
  if (status === 'next') return <span style={{ ...base, fontWeight: 600, color: onPhoto ? '#fff' : 'var(--text)' }}>{label}</span>;
  return <span style={{ ...base, fontWeight: 500, color: onPhoto ? 'rgba(255,255,255,0.75)' : 'var(--text3)' }}>{label}</span>;
}

// 중계처 무료/유료: 글자만. 무료는 본문색으로 조금 세게, 유료는 흐리게.
export function AccessBadge({ access, label }) {
  if (!access) return null;
  const free = access === 'free';
  return <span style={{ flex: 'none', fontSize: 13, lineHeight: 1.4, fontWeight: free ? 600 : 500, color: free ? 'var(--text)' : 'var(--text3)' }}>{label}</span>;
}

// 외부로 나가는 링크 표시(↗). 텍스트 대체는 호출부의 숨김 텍스트로.
export function ExternalIcon({ color = 'currentColor', size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

// 꺾쇠(›). '전체 일정' 같은 이동 링크 뒤에 — 글자 화살표(→) 대신.
export function Chevron({ size = 16, color = 'currentColor', dir = 'right' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}
