// 단순 치환 i18n. t(locale, key, vars) — 복수형·문맥 처리는 없다.
// 키가 없으면 영문(en) 값으로 떨어지고, 그것도 없으면 키를 그대로 돌려주며 console.warn.
import { useCallback } from 'react';
import { useFormat } from '../use-format.js';
import ko from './ko.js';
import en from './en.js';

const DICTS = { ko, en };
const warned = new Set();

export function t(locale, key, vars = {}) {
  const dict = DICTS[locale] || en;
  let template = dict[key];
  if (template === undefined) {
    template = en[key];
    if (template === undefined) {
      if (!warned.has(key)) { warned.add(key); console.warn(`[i18n] 없는 키: "${key}"`); }
      return key;
    }
    if (locale !== 'en' && !warned.has(`${locale}:${key}`)) { warned.add(`${locale}:${key}`); console.warn(`[i18n] '${locale}'에 없는 키라 영문 기본값 사용: "${key}"`); }
  }
  return template.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? String(vars[name]) : m));
}

// 컴포넌트용: locale은 useFormat()에서.
export function useT() {
  const { locale } = useFormat();
  return useCallback((key, vars) => t(locale, key, vars), [locale]);
}
