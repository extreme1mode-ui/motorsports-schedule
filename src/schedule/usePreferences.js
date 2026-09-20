import { useCallback, useEffect, useState } from 'react';
import { SUPPORTED_SERIES } from './constants.js';

const STORAGE_KEY = 'paddock.prefs';
const PREFERENCES_VERSION = 1;

export const SERIES_MODES = ['all', 'race', 'off'];

export const DEFAULT_PREFERENCES = {
  version: PREFERENCES_VERSION,
  series: Object.fromEntries(SUPPORTED_SERIES.map((id) => [id, 'all'])),
  country: 'KR',
  onboarded: false,
};

function isSeriesMode(value) {
  return SERIES_MODES.includes(value);
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
    country: typeof stored.country === 'string' && stored.country ? stored.country : DEFAULT_PREFERENCES.country,
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
    if (typeof country !== 'string' || !country) return;
    setPreferences((prev) => ({ ...prev, country }));
  }, []);

  const setOnboarded = useCallback((value = true) => {
    setPreferences((prev) => ({ ...prev, onboarded: Boolean(value) }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(normalizePreferences(null));
  }, []);

  return { preferences, setSeriesMode, setCountry, setOnboarded, resetPreferences };
}
