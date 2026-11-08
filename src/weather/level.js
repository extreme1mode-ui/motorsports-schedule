// 비 예보 단계 — 서버(api/weather.js)와 브라우저가 같이 쓴다. React·DOM을 import하지 않는다.
//
// 단계: 1 약한 비 · 2 비 · 3 뇌우. 비가 아니면 0(배지 없음). 강수 확률은 쓰지 않는다(노르딕 밖은 보장이 없다).
//  - 뇌우: symbol_code에 'thunder'
//  - 비: 시간당 1mm 이상, 또는 symbol_code가 rain·heavyrain·rainshowers·heavyrainshowers·sleet 계열
//  - 약한 비: 시간당 0.1mm 이상, 또는 symbol_code가 light…rain·light…showers
// 구간: 세션 시작부터 추정 끝까지. next_1_hours가 있으면 1시간 단위, 없으면 next_6_hours(양을 6으로 나눠 시간당).
// next_12_hours에는 강수량·기호가 있다는 보장이 없어 쓰지 않는다.

export const HORIZON_MS = 9 * 86400000;   // MET Locationforecast가 내다보는 범위
const HOUR = 3600000;

export function levelOf(symbol = '', mmPerHour = 0) {
  const s = String(symbol || '').replace(/_(day|night|polartwilight)$/, '');
  if (s.includes('thunder')) return 3;
  if (mmPerHour >= 1 || /^(heavy)?(rain|rainshowers|sleet|sleetshowers)$/.test(s)) return 2;
  if (mmPerHour >= 0.1 || /^light(rain|rainshowers|sleet|sleetshowers)$/.test(s)) return 1;
  return 0;
}

// MET 응답(properties.timeseries[])의 한 구간 요약: { level, mm(시간당 최대), symbol }.
// 예보가 구간을 하나도 덮지 못하면 null(모름 — '비 없음'과 다르다).
export function summarize(timeseries, from, to) {
  if (!Array.isArray(timeseries) || from == null || to == null) return null;
  let covered = false;
  let best = { level: 0, mm: 0, symbol: null };
  for (const e of timeseries) {
    const t = Date.parse(e?.time);
    if (!Number.isFinite(t)) continue;
    const p1 = e.data?.next_1_hours; const p6 = e.data?.next_6_hours;
    const piece = p1 ? { len: HOUR, sym: p1.summary?.symbol_code, mm: p1.details?.precipitation_amount ?? 0 }
      : p6 ? { len: 6 * HOUR, sym: p6.summary?.symbol_code, mm: (p6.details?.precipitation_amount ?? 0) / 6 } : null;
    if (!piece || t + piece.len <= from || t >= to) continue;
    covered = true;
    const lv = levelOf(piece.sym, piece.mm);
    if (lv > best.level || (lv === best.level && piece.mm > best.mm)) best = { level: lv, mm: Math.round(piece.mm * 10) / 10, symbol: piece.sym || null };
  }
  return covered ? best : null;
}
