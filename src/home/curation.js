// 관전 포인트 한 줄(홈 덱 카드·경기 상세): 하이라이트 → 가중치 3 → 가중치 2 (추천 점수와 같은 순서).
// 계측 hero_curation은 kind. 1등급이면 null(줄을 그리지 않는다).
import { getHighlights, getHighlightNote, getRaceWeight } from '../schedule/highlights.js';
import { t } from '../i18n/t.js';

export function curationOf(race, locale = 'ko') {
  const h = getHighlights(race);
  if (h.length) { const text = getHighlightNote(h[0], locale); if (text) return { kind: 'highlight', text }; }
  const w = getRaceWeight(race);
  if (w === 3) return { kind: 'weight3', text: t(locale, 'rec.weight3') };
  if (w === 2) return { kind: 'weight2', text: t(locale, 'rec.weight2') };
  return null;
}
