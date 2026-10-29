// 경기 상세 공용 계산(컴포넌트 아님). 부품은 detail-parts.jsx.

// 서킷 · 도시, 나라 (가운뎃점은 한 번만)
export function placeLine(L) {
  const city = [L.city, L.country].filter(Boolean).join(', ');
  return [L.circuit, city].filter(Boolean).join(' · ');
}

// 시간대 차이(분). Intl로 그 시각의 오프셋을 구한다. 실패하면 null.
function tzOffsetMinutes(timeZone, date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date);
    const get = (k) => Number(parts.find((p) => p.type === k)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return null;
  }
}

// '대한민국 시간보다 15시간 늦어요' — 현지 시간대(race.timezone)와 내 시간대(fmt.timeZone)를 경기 시각 기준으로 비교한다.
export function offsetText(race, fmt, tr) {
  if (!race?.timezone) return null;
  const at = new Date(race.primaryStartUtc || Date.now());
  const raceOff = tzOffsetMinutes(race.timezone, at);
  const myOff = tzOffsetMinutes(fmt.timeZone, at);
  if (raceOff == null || myOff == null) return null;
  const diff = raceOff - myOff;
  const zone = fmt.zoneLabel;
  if (diff === 0) return tr('detail.offsetSame', { zone });
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60); const m = abs % 60;
  const span = !h ? tr('detail.minutes', { m }) : m ? tr('detail.hoursMinutes', { h, m }) : tr('detail.hours', { h });
  return tr(diff < 0 ? 'detail.offsetBehind' : 'detail.offsetAhead', { zone, diff: span });
}

// 캘린더 담기를 그릴지: 끝났거나 취소됐거나 시각이 확정된 세션이 없으면 그리지 않는다(예전과 같다).
export function canAddAlarm(race) {
  return race.status !== 'completed' && race.status !== 'cancelled'
    && (Array.isArray(race.sessions) ? race.sessions : []).some((x) => x.startUtc);
}
export const ticketOf = (race) => (race.status !== 'completed' && race.status !== 'cancelled' && race.ticketUrl) || null;
export const hasDetailLinks = (race) => !!(ticketOf(race) || race.officialUrl);
