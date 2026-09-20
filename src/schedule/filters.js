// 개인화 설정에 따라 경기 목록을 거른다. 정렬이나 다른 가공은 하지 않는다.
export function filterRacesByPreferences(races, preferences, favorites) {
  const series = preferences?.series;
  if (!Array.isArray(races) || !series || typeof series !== 'object') return races;
  const isFavorite = (id) => (favorites instanceof Set ? favorites.has(id) : Array.isArray(favorites) && favorites.includes(id));
  // 'off'인 시리즈는 제외하되, 사용자가 직접 저장한 경기는 남긴다.
  return races.filter((race) => series[race.series] !== 'off' || isFavorite(race.id));
}
