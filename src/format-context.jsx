// 사용자 시간대·언어를 컴포넌트에 공급하는 컨텍스트. 값은 preferences.timezone / preferences.locale.
// 언어는 이번 단계에서 'ko' 고정, 시간대만 실제 값이 흐른다.
import { createContext, useMemo } from 'react';
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from './schedule/format.js';

const FormatContext = createContext({ locale: DEFAULT_LOCALE, timeZone: DEFAULT_TIME_ZONE });

export function FormatProvider({ locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE, children }) {
  const value = useMemo(() => ({ locale, timeZone: timeZone || DEFAULT_TIME_ZONE }), [locale, timeZone]);
  return <FormatContext.Provider value={value}>{children}</FormatContext.Provider>;
}

export { FormatContext };
