// 캘린더 구독 주소의 쿼리. 설정 화면과 셸의 '캘린더 앱으로 구독' 시트가 같이 쓴다.
// 시리즈는 'off'가 아닌 것, level은 하나라도 'all'이면 all.
import { SUPPORTED_SERIES } from './schedule/index.js';

export function calendarQuery(preferences) {
  const series = SUPPORTED_SERIES.filter((id) => (preferences?.series?.[id] || 'off') !== 'off');
  const level = series.some((id) => preferences.series[id] === 'all') ? 'all' : 'race';
  const params = new URLSearchParams();
  if (series.length) params.set('series', series.join(','));
  params.set('level', level);
  params.set('lang', preferences?.locale || 'ko');
  return { series, level, search: params.toString() };
}
