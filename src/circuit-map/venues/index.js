// 서킷 맵이 있는 경기 목록 — 첫 화면 청크에 들어가는 가벼운 부분만 둔다.
//   raceId : season-*.json의 경기 id. 이 경기의 상세·홈 히어로에 진입점이 붙는다.
//   match  : 서킷·도시 이름. OpenF1 일정은 id가 f1-<meeting_key>이고 정적 레코드와 맞을 때만 staticId가 붙어서,
//            id로 못 찾으면 2026 F1 경기 중 이 이름으로 찾는다(싱가포르는 원래 이 방식이었다).
//   mini   : 상세 카드 미니 서킷(64×48) path. 각 경기 base.json의 track.pts에서 뽑은 계산 결과다
//            (식: 바운딩 박스 → pad = max(w,h)·0.06 → 'M x y L …Z', 정수 반올림).
//   sub    : 카드 설명 문구 i18n 키. 교통 수단 이름이 경기마다 달라 키를 나눈다.
//   load   : 경기 데이터 청크(경기 설정 + base.json). 지도를 열 때(또는 미리 불러오기로) 받는다.
export const VENUES = [
  {
    id: 'sgp26', raceId: 'f1-2026-17-singaporegrandprix', sub: 'cm.sub',
    match: /Marina Bay|마리나 베이|Singapore/i,
    mini: { d: 'M1486 437L1465 285L1455 166L1452 152L1445 143L1433 139L1408 141L1389 136L1366 124L1356 116L1350 108L1345 101L1334 88L1324 86L1314 87L1301 100L1292 121L1286 174L1286 198L1289 217L1295 233L1304 251L1335 338L1346 392L1349 432L1346 449L1337 466L1321 477L1303 485L1289 488L925 467L895 461L853 445L595 297L586 292L571 285L562 288L553 301L505 383L468 453L462 465L455 467L447 463L355 367L333 351L315 341L295 345L289 349L274 363L259 391L171 548L103 669L86 698L87 713L89 730L95 742L112 757L134 772L151 783L172 790L183 794L186 801L180 813L177 824L176 837L185 866L193 878L207 891L229 911L273 946L282 955L291 974L303 990L314 1005L319 1007L329 1007L337 1005L344 1000L348 996L351 990L401 737L425 611L435 570L453 514L459 508L469 502L482 499L492 501L500 507L543 544L644 632L669 644L694 651L728 655L1014 670L1116 676L1136 676L1155 678L1159 684L1158 695L1159 713L1166 732L1175 741L1186 748L1204 753L1341 767L1431 772L1450 773L1459 772L1465 769L1472 760L1507 707L1514 694L1517 681L1514 653L1486 437Z', vb: '0 0 1603 1093' },
    load: () => import('./sgp26/chunk.js'),
  },
];

const BY_RACE = Object.fromEntries(VENUES.map((v) => [v.raceId, v]));
const BY_ID = Object.fromEntries(VENUES.map((v) => [v.id, v]));
export function venueOfRace(race) {
  if (!race) return null;
  const hit = BY_RACE[race.staticId] || BY_RACE[race.id];
  if (hit) return hit;
  if (race.series !== 'F1' || !String(race.raceDateKst || race.weekendStart || '').startsWith('2026')) return null;
  const s = [race.circuit, race.circuitKo, race.city].join(' ');
  return VENUES.find((v) => v.match.test(s)) || null;
}
export const venueById = (id) => BY_ID[id] || null;
