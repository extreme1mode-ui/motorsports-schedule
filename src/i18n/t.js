// 순수 t(locale, key, vars). React 없이 쓸 수 있다 (recommendations.js 등).
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
