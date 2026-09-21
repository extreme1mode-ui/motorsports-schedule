// 사용자 시간대·언어·국가를 컴포넌트에 공급하는 컨텍스트. 값은 preferences.timezone / preferences.locale / preferences.country.
import { createContext, useMemo } from 'react';
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from './schedule/format.js';

const FormatContext = createContext({ locale: DEFAULT_LOCALE, timeZone: DEFAULT_TIME_ZONE, country: null });

export function FormatProvider({ locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE, country = null, children }) {
  const value = useMemo(() => ({ locale: locale || DEFAULT_LOCALE, timeZone: timeZone || DEFAULT_TIME_ZONE, country: country ?? null }), [locale, timeZone, country]);
  return <FormatContext.Provider value={value}>{children}</FormatContext.Provider>;
}

export { FormatContext };
