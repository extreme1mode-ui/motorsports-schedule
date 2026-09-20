import { useCallback, useEffect, useState } from 'react';
import { SUPPORTED_SERIES } from './constants.js';

const STORAGE_KEY = 'paddock.prefs';
const PREFERENCES_VERSION = 1;
const FALLBACK_TIMEZONE = 'Asia/Seoul';
const FALLBACK_LOCALE = 'en';

export const SERIES_MODES = ['all', 'race', 'off'];
export const LOCALES = ['ko', 'en'];

// 브라우저 API에 의존하지 않는 정적 기본값. timezone/locale의 자동 감지는
// 모듈 로드 시점이 아니라 getDefaultPreferences()/normalizePreferences() 호출 시 수행한다.
export const DEFAULT_PREFERENCES = {
  version: PREFERENCES_VERSION,
  series: Object.fromEntries(SUPPORTED_SERIES.map((id) => [id, 'all'])),
  country: null,
  timezone: FALLBACK_TIMEZONE,
  locale: FALLBACK_LOCALE,
  onboarded: false,
};

function isSeriesMode(value) {
  return SERIES_MODES.includes(value);
}

function isLocale(value) {
  return LOCALES.includes(value);
}

export function detectTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz ? tz : FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

export function detectLocale() {
  try {
    const lang = typeof navigator !== 'undefined' ? navigator.language : '';
    return typeof lang === 'string' && lang.toLowerCase().startsWith('ko') ? 'ko' : FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE;
  }
}

export function getDefaultPreferences() {
  return { ...DEFAULT_PREFERENCES, timezone: detectTimezone(), locale: detectLocale() };
}

function migratePreferences(stored) {
  const version = Number.isInteger(stored?.version) ? stored.version : 0;
  if (version === PREFERENCES_VERSION) return stored;
  // 이후 구조가 바뀌면 여기서 version별로 단계적으로 변환한다.
  // 예) if (version < 2) { ... }
  return { ...stored, version: PREFERENCES_VERSION };
}

export function normalizePreferences(input) {
  const stored = input && typeof input === 'object' ? migratePreferences(input) : {};
  const onboarded = typeof stored.onboarded === 'boolean' ? stored.onboarded : DEFAULT_PREFERENCES.onboarded;
  // 이미 관심사를 고른 사용자에게 새 시리즈가 자동으로 켜지지 않도록 한다.
  const fallbackMode = onboarded ? 'off' : 'all';
  const storedSeries = stored.series && typeof stored.series === 'object' ? stored.series : {};

  return {
    version: PREFERENCES_VERSION,
    series: Object.fromEntries(
      SUPPORTED_SERIES.map((id) => [id, isSeriesMode(storedSeries[id]) ? storedSeries[id] : fallbackMode]),
    ),
    // country는 온보딩에서 직접 묻는 값이라 "아직 모름"(null)을 허용한다.
    country: typeof stored.country === 'string' && stored.country ? stored.country : null,
    timezone: typeof stored.timezone === 'string' && stored.timezone ? stored.timezone : detectTimezone(),
    locale: isLocale(stored.locale) ? stored.locale : detectLocale(),
    onboarded,
  };
}

export function loadPreferences() {
  try { return normalizePreferences(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
  catch { return normalizePreferences(null); }
}

export function savePreferences(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); }
  catch { /* 저장 불가 환경(프라이빗 모드 등)은 무시 */ }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(() => loadPreferences());

  useEffect(() => { savePreferences(preferences); }, [preferences]);

  const setSeriesMode = useCallback((seriesId, mode) => {
    if (!SUPPORTED_SERIES.includes(seriesId) || !isSeriesMode(mode)) return;
    setPreferences((prev) => ({ ...prev, series: { ...prev.series, [seriesId]: mode } }));
  }, []);

  const setCountry = useCallback((country) => {
    if (country !== null && (typeof country !== 'string' || !country)) return;
    setPreferences((prev) => ({ ...prev, country }));
  }, []);

  const setTimezone = useCallback((timezone) => {
    if (typeof timezone !== 'string' || !timezone) return;
    setPreferences((prev) => ({ ...prev, timezone }));
  }, []);

  const setLocale = useCallback((locale) => {
    if (!isLocale(locale)) return;
    setPreferences((prev) => ({ ...prev, locale }));
  }, []);

  const setOnboarded = useCallback((value = true) => {
    setPreferences((prev) => ({ ...prev, onboarded: Boolean(value) }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(normalizePreferences(null));
  }, []);

  return { preferences, setSeriesMode, setCountry, setTimezone, setLocale, setOnboarded, resetPreferences };
}
