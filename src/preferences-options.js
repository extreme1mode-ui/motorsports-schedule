// 온보딩과 설정 화면이 함께 쓰는 선택지·문구. (컴포넌트는 preferences-ui.jsx)

import { storage } from './storage/index.js';

// 문구는 전부 i18n 키다 (src/i18n/*.js). label/sub/desc는 렌더 시점에 t(key)로 푼다.
// 시리즈 한 줄 설명 키. 문구 자체는 i18n 사전에 있다.
export const SERIES_DESCRIPTION_KEYS = {
  F1: 'series.F1.desc',
  WEC: 'series.WEC.desc',
  IMSA: 'series.IMSA.desc',
  WRC: 'series.WRC.desc',
  GTWC: 'series.GTWC.desc',
};

export const MODE_OPTIONS = [
  { id: 'all', label: 'mode.all', sub: 'mode.all.sub' },
  { id: 'race', label: 'mode.race', sub: 'mode.race.sub' },
];

export const MODE_OPTIONS_WITH_OFF = [
  ...MODE_OPTIONS,
  { id: 'off', label: 'mode.off', sub: 'mode.off.sub' },
];

// value가 null이면 "아직 모름"으로 저장된다 (usePreferences.country 규칙).
export const COUNTRY_OPTIONS = [
  { id: 'KR', value: 'KR', label: 'country.KR' },
  { id: 'JP', value: 'JP', label: 'country.JP' },
  { id: 'US', value: 'US', label: 'country.US' },
  { id: 'GB', value: 'GB', label: 'country.GB' },
  { id: 'OTHER', value: null, label: 'country.OTHER' },
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
  return storage.theme.read();
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
