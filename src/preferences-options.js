// 온보딩과 설정 화면이 함께 쓰는 선택지·문구. (컴포넌트는 preferences-ui.jsx)

// 처음 접하는 사용자를 위한 한 줄 설명. 문구는 추후 직접 다듬을 것.
export const SERIES_DESCRIPTIONS = {
  F1: '세계 최고 수준의 싱글시터 레이싱. 예선·스프린트·결승으로 한 주말이 구성됩니다.',
  WEC: '르망 24시를 포함한 세계 내구 레이스 선수권. 한 경기가 6~24시간 이어집니다.',
  IMSA: '데이토나 24시, 세브링 12시 등 북미에서 열리는 스포츠카 내구 레이스.',
  WRC: '포장도로·자갈·눈길 등 일반 도로를 달리는 세계 랠리 선수권.',
  GTWC: '양산차 기반 GT카로 겨루는 스프린트·내구 레이스 시리즈.',
};

export const MODE_OPTIONS = [
  { id: 'all', label: '전체 세션', sub: '예선·스프린트까지 전부' },
  { id: 'race', label: '본경기만', sub: '결승만' },
];

export const MODE_OPTIONS_WITH_OFF = [
  ...MODE_OPTIONS,
  { id: 'off', label: '안 봄', sub: '홈에서 숨김' },
];

// value가 null이면 "아직 모름"으로 저장된다 (usePreferences.country 규칙).
export const COUNTRY_OPTIONS = [
  { id: 'KR', value: 'KR', label: '한국' },
  { id: 'JP', value: 'JP', label: '일본' },
  { id: 'US', value: 'US', label: '미국' },
  { id: 'GB', value: 'GB', label: '영국' },
  { id: 'OTHER', value: null, label: '그 외' },
];

const TIMEZONE_COUNTRY = {
  'Asia/Seoul': 'KR',
  'Asia/Tokyo': 'JP',
  'Europe/London': 'GB',
};

export function guessCountryFromTimezone(tz) {
  if (!tz) return 'OTHER';
  if (TIMEZONE_COUNTRY[tz]) return TIMEZONE_COUNTRY[tz];
  if (tz.startsWith('America/') || tz === 'Pacific/Honolulu') return 'US';
  return 'OTHER';
}

// 저장된 country 값 → COUNTRY_OPTIONS의 id
export function countryIdFromValue(country) {
  return COUNTRY_OPTIONS.find((c) => c.value === country)?.id ?? 'OTHER';
}

export function countryValueFromId(id) {
  return COUNTRY_OPTIONS.find((c) => c.id === id)?.value ?? null;
}

export function readTheme() {
  try { return localStorage.getItem('paddock.theme') || 'dark'; }
  catch { return 'dark'; }
}

// 온보딩·설정 공용 선택 항목 스타일. 터치 영역 최소 56px.
export function optionStyles(t) {
  return {
    base: {
      display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 56,
      padding: '14px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
      fontFamily: 'inherit', color: t.text, background: t.surface,
      borderWidth: 1, borderStyle: 'solid', borderColor: t.line,
    },
    selected: { background: t.surface2, borderColor: t.line2 },
  };
}
