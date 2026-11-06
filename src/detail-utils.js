// 경기 상세 공용 계산(컴포넌트 아님). 화면은 screens2/Detail.jsx.


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

export const ticketOf = (race) => (race.status !== 'completed' && race.status !== 'cancelled' && race.ticketUrl) || null;
