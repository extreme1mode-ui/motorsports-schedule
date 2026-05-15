export const EVENT_SERIES = {
  F1: { id: 'F1', name: 'Formula 1', short: 'F1', accent: '#E10600', tint: '#FFE0E3', dark: '#2A0408' },
  WEC: { id: 'WEC', name: 'FIA World Endurance', short: 'WEC', accent: '#2E7DFF', tint: '#DCE9FF', dark: '#0A1A33' },
  IMSA: { id: 'IMSA', name: 'IMSA SportsCar', short: 'IMSA', accent: '#14D19B', tint: '#D2F7EA', dark: '#002A1F' },
  WRC: { id: 'WRC', name: 'World Rally Championship', short: 'WRC', accent: '#FF8A00', tint: '#FFE8CC', dark: '#311600' },
  GTWC: { id: 'GTWC', name: 'GT World Challenge', short: 'GTWC', accent: '#A77BFF', tint: '#EAE0FF', dark: '#1A0F2E' },
};

export const CATEGORY_META = {
  F1: { id: 'F1', name: 'Formula 1', short: 'F1', accent: '#E10600', tint: '#FFE0E3', dark: '#2A0408' },
  ENDURANCE: { id: 'ENDURANCE', name: 'Endurance', short: 'END', accent: '#00A6A6', tint: '#D8F7F5', dark: '#03292A' },
  WRC: { id: 'WRC', name: 'World Rally Championship', short: 'WRC', accent: '#FF8A00', tint: '#FFE8CC', dark: '#311600' },
  GTWC: { id: 'GTWC', name: 'GT World Challenge', short: 'GTWC', accent: '#A77BFF', tint: '#EAE0FF', dark: '#1A0F2E' },
};

export const CATEGORY_ORDER = ['F1', 'ENDURANCE', 'WRC', 'GTWC'];
export const SUPPORTED_SERIES = ['F1', 'WEC', 'IMSA', 'WRC', 'GTWC'];
export const ENDURANCE_SERIES = ['WEC', 'IMSA'];
export const KST_TIMEZONE = 'Asia/Seoul';

export function getCategoryForSeries(series) {
  if (ENDURANCE_SERIES.includes(series)) return 'ENDURANCE';
  return series;
}

