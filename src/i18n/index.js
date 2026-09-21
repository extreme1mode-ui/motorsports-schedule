// 단순 치환 i18n. t(locale, key, vars) — 복수형·문맥 처리는 없다. 키가 없으면 영문(en) 값, 그것도 없으면 키 + console.warn.
import { useCallback } from 'react';
import { useFormat } from '../use-format.js';
import { t } from './t.js';

export { t };

// 컴포넌트용: locale은 useFormat()에서.
export function useT() {
  const { locale } = useFormat();
  return useCallback((key, vars) => t(locale, key, vars), [locale]);
}
