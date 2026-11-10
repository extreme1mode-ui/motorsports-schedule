// '한 바퀴'의 차: 위에서 내려다본 F1 차 한 대. 캔버스에 그린다(그림 파일 없음).
// 좌표는 차 길이 100칸 기준. 앞이 위(−y), 가운데가 (0, 50). 실제 차의 비율(길이 5.6m · 폭 2m 안팎)을 따르되,
// 작은 화면에서 읽히도록 바퀴와 앞뒤 날개를 조금 키웠다. 특정 팀의 도색을 따라 하지 않는다: 몸통 F1 빨강 + 가운데 흰 줄 하나 + 탄소 검정 + 흰 헬멧.
//
// drawCar(ctx, { x, y, rot, len, steer, C, ghost })
//   x, y   화면 좌표(차 가운데)   rot  화면에서의 방향(0이면 앞이 위, 시계 방향 +)
//   len    화면에서의 차 길이(px)  steer 앞바퀴 꺾임(라디안, 오른쪽 +)
//   C      { body, carbon, tyre, helmet, edge, hi, shadow }   ghost  true면 윤곽 하나만(내 최고 기록)

const P = (d) => (typeof Path2D === 'undefined' ? null : new Path2D(d));
const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];
const poly = (pts) => `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
const rr = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;

// 바퀴(가운데 기준). 앞 · 뒤
const FT = { x: 13.6, y: 17, w: 6.4, h: 13.4, r: 2 };
const RT = { x: 12.8, y: 85, w: 8.4, h: 14.2, r: 2.3 };

let S = null;
function shapes() {
  if (S) return S;
  // 바닥판(탄소): 옆구리 아래로 조금 보인다
  const floor = poly(mirror([[0, 36], [7, 36.4], [12.6, 39.4], [13.4, 43], [13.5, 61], [12.6, 70], [10.6, 76], [8.8, 78.4], [8.8, 92], [0, 93]]));
  // 앞날개: 가운데가 앞으로 나온 숟가락 모양 + 끝판
  const fwing = `M-17 4.6 Q-9 3.6 0 1.6 Q9 3.6 17 4.6 L17 8.4 Q9 7.8 0 6.4 Q-9 7.8 -17 8.4Z`;
  const fflap = `M-16.4 6.1 Q-9 5.4 -2.2 4.2 M16.4 6.1 Q9 5.4 2.2 4.2 M-16.4 7.4 Q-9 6.8 -2.2 5.6 M16.4 7.4 Q9 6.8 2.2 5.6`;
  const fplates = rr(-18, 3, 1.7, 6.6, 0.85) + rr(16.3, 3, 1.7, 6.6, 0.85);
  // 몸통: 노즈 → 콕핏 → 옆구리(앞이 넓고 뒤로 잘록) → 엔진 덮개
  const body = poly(mirror([[0, 2.4], [1.3, 2.8], [1.9, 6], [2.5, 12], [3.2, 20], [4.1, 26.4], [5.4, 30], [6.2, 33.4], [6.8, 36.2], [11.4, 37.4], [12.6, 39.4], [12.9, 44], [12.4, 51], [11.2, 57], [9.2, 63], [7.2, 69.6], [5.8, 76], [4.9, 83], [3.9, 89], [2.8, 93.2], [0, 93.6]]));
  // 옆구리 공기 구멍(앞쪽), 콕핏 구멍, 공기 흡입구(머리 위)
  const inlets = poly([[7.4, 36.9], [11.2, 37.8], [12.1, 39.5], [7.8, 38.8]]) + poly([[-7.4, 36.9], [-11.2, 37.8], [-12.1, 39.5], [-7.8, 38.8]]);
  const cockpit = rr(-3.4, 35.2, 6.8, 12.6, 3);
  const airbox = rr(-1.9, 49.4, 3.8, 3.2, 1.4);
  const tcam = rr(-2.6, 52.6, 5.2, 1.3, 0.6);
  // 헤일로: 앞 기둥 하나에서 둘로 갈라져 뒤로
  const halo = 'M0 32.6 L0 35.4 M0 35.4 Q-4.7 35.6 -4.7 39.6 L-4.7 47.6 M0 35.4 Q4.7 35.6 4.7 39.6 L4.7 47.6';
  // 서스펜션 팔(앞 · 뒤): 몸통에서 바퀴 가운데로 모이는 A자
  const susp = `M3.6 12 L${FT.x - 2.6} ${FT.y} L4.4 22 M-3.6 12 L${-FT.x + 2.6} ${FT.y} L-4.4 22`
    + ` M4.8 79.5 L${RT.x - 3.4} ${RT.y} L4.6 90 M-4.8 79.5 L${-RT.x + 3.4} ${RT.y} L-4.6 90`;
  // 거울: 옆구리 앞 위에 작은 타원 + 받침
  const mirrors = rr(8.2, 32.4, 3.8, 1.9, 0.9) + rr(-12, 32.4, 3.8, 1.9, 0.9);
  const stalks = 'M6.4 34.8 L9 33.6 M-6.4 34.8 L-9 33.6';
  // 뒤: 디퓨저(탄소) · 빔 날개 · 뒷날개(본판 + 플랩) · 끝판 · 비 올 때 켜는 등(꺼진 채)
  const diffuser = poly(mirror([[0, 88], [8.6, 88], [9.6, 97.6], [0, 97.6]]));
  const beam = 'M-6.4 91.4 L6.4 91.4';
  const rwing = 'M-9.8 93 Q0 92.2 9.8 93 L9.8 98.6 Q0 98 -9.8 98.6Z';
  const rflap = 'M-9 95.6 Q0 95 9 95.6';
  const rplates = rr(-11.2, 89.6, 1.8, 10, 0.8) + rr(9.4, 89.6, 1.8, 10, 0.8);
  const rain = rr(-1.2, 98.8, 2.4, 1.3, 0.4);
  // 몸통 위 빛(가운데 등줄기)과 상어 지느러미
  const spine = 'M0 3.4 L0 31 M0 54.8 L0 92.6';   // 가운데 흰 줄(도색): 노즈 끝에서 콕핏 앞까지, 엔진 덮개에서 뒤까지
  // 몸통 양옆 그늘(부피감): 옆구리 바깥 가장자리 안쪽으로
  const sideShade = poly([[11.4, 37.4], [12.6, 39.4], [12.9, 44], [12.4, 51], [11.2, 57], [9.2, 63], [7.2, 69.6], [5.8, 76], [4.9, 83], [3.6, 83], [4.4, 76], [5.6, 69.2], [7.4, 63], [9.2, 57], [10.2, 51], [10.6, 44], [10.2, 40]])
    + poly([[-11.4, 37.4], [-12.6, 39.4], [-12.9, 44], [-12.4, 51], [-11.2, 57], [-9.2, 63], [-7.2, 69.6], [-5.8, 76], [-4.9, 83], [-3.6, 83], [-4.4, 76], [-5.6, 69.2], [-7.4, 63], [-9.2, 57], [-10.2, 51], [-10.6, 44], [-10.2, 40]]);
  const tyre = (t) => rr(-t.w / 2, -t.h / 2, t.w, t.h, t.r);
  const tread = (t) => `M${-t.w / 2 + 1.2} ${-t.h / 2 + 2.4} L${-t.w / 2 + 1.2} ${t.h / 2 - 2.4} M${t.w / 2 - 1.2} ${-t.h / 2 + 2.4} L${t.w / 2 - 1.2} ${t.h / 2 - 2.4}`;
  S = {
    floor: P(floor), fwing: P(fwing), fflap: P(fflap), fplates: P(fplates), body: P(body), inlets: P(inlets), cockpit: P(cockpit), airbox: P(airbox),
    halo: P(halo), susp: P(susp), mirrors: P(mirrors), stalks: P(stalks), diffuser: P(diffuser), beam: P(beam), rwing: P(rwing), rflap: P(rflap), rplates: P(rplates),
    rain: P(rain), spine: P(spine), tcam: P(tcam), sideShade: P(sideShade), ft: P(tyre(FT)), rt: P(tyre(RT)), ftTread: P(tread(FT)), rtTread: P(tread(RT)),
    // 윤곽 하나(유령 · 바깥선): 큰 덩어리만
    hull: [P(floor), P(fwing), P(fplates), P(body), P(diffuser), P(rwing), P(rplates)],
  };
  return S;
}

function tyres(ctx, s, steer, fill, sweep) {
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.translate(sx * FT.x, FT.y); ctx.rotate(steer); fill(s.ft); sweep?.(s.ftTread); ctx.restore();
    ctx.save(); ctx.translate(sx * RT.x, RT.y); fill(s.rt); sweep?.(s.rtTread); ctx.restore();
  }
}

export function drawCar(ctx, { x, y, rot = 0, len = 34, steer = 0, C, ghost = false }) {
  const s = shapes(); if (!s.body) return;
  const k = len / 100; const px = 1 / k;            // px: 화면 1px을 차 칸으로
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k); ctx.translate(0, -50);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (ghost) {
    // 내 최고 기록: 같은 모양의 윤곽만, 옅게
    ctx.fillStyle = C.ghost;
    for (const p of s.hull) ctx.fill(p);
    tyres(ctx, s, steer, (p) => ctx.fill(p));
    ctx.restore();
    return;
  }
  // 1) 바깥선과 그림자: 길 색과 상관없이 차가 떨어져 보이게. 덩어리를 모두 굵게 그은 뒤 위를 채운다
  ctx.shadowColor = C.shadow; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1.2;   // 그림자는 화면 기준(카메라가 돌아도 빛은 위에서)
  ctx.strokeStyle = C.edge; ctx.lineWidth = 2.2 * px;
  for (const p of s.hull) ctx.stroke(p);
  tyres(ctx, s, steer, (p) => ctx.stroke(p));
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // 2) 탄소: 바닥판 · 디퓨저 · 서스펜션 · 빔 날개
  ctx.fillStyle = C.carbon; ctx.fill(s.floor); ctx.fill(s.diffuser);
  ctx.strokeStyle = C.carbon; ctx.lineWidth = Math.max(0.5, 0.7 * px); ctx.stroke(s.susp);
  ctx.lineWidth = Math.max(1.6, 0.8 * px); ctx.stroke(s.beam);
  // 3) 바퀴(앞은 꺾임만큼 돈다). 안쪽 가는 선 두 줄로 접지면을 보인다
  ctx.fillStyle = C.tyre; ctx.strokeStyle = C.tread; ctx.lineWidth = Math.max(0.6, 0.45 * px);
  tyres(ctx, s, steer, (p) => ctx.fill(p), len >= 44 ? (p) => ctx.stroke(p) : null);
  // 4) 날개: 앞날개 본판(몸통 색) + 플랩 선(탄소) + 끝판, 뒷날개 본판 + 플랩 + 끝판
  ctx.fillStyle = C.body; ctx.fill(s.fwing); ctx.fill(s.rwing);
  ctx.fillStyle = C.carbon; ctx.fill(s.fplates); ctx.fill(s.rplates);
  ctx.strokeStyle = C.carbon; ctx.lineWidth = Math.max(0.55, 0.5 * px); ctx.stroke(s.fflap); ctx.stroke(s.rflap);
  // 5) 몸통 + 등줄기 빛
  ctx.fillStyle = C.body; ctx.fill(s.body);
  ctx.fillStyle = C.shade; ctx.fill(s.sideShade);
  ctx.strokeStyle = C.hi; ctx.lineCap = 'butt'; ctx.lineWidth = Math.max(1.3, 0.9 * px); ctx.stroke(s.spine); ctx.lineCap = 'round';
  // 6) 구멍(옆구리 · 콕핏 · 흡입구), 거울, 헬멧, 헤일로, 꺼진 등
  ctx.fillStyle = C.carbon; ctx.fill(s.inlets); ctx.fill(s.cockpit); ctx.fill(s.airbox); ctx.fill(s.mirrors); ctx.fill(s.tcam);
  ctx.strokeStyle = C.carbon; ctx.lineWidth = Math.max(0.6, 0.5 * px); ctx.stroke(s.stalks);
  ctx.fillStyle = C.helmet; ctx.beginPath(); ctx.arc(0, 43.6, 2.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.carbon; ctx.beginPath(); ctx.ellipse(0, 41.9, 1.9, 0.75, 0, 0, Math.PI * 2); ctx.fill();   // 바이저
  ctx.strokeStyle = C.carbon; ctx.lineWidth = Math.max(1, 1.25 * px * 0.6); ctx.stroke(s.halo);
  ctx.fillStyle = C.rain; ctx.fill(s.rain);
  ctx.restore();
}

// 앞바퀴 꺾임: 굽은 정도(1/m)에서. 축간 거리 3.6m로 계산한 각을 읽히게 두 배 반으로 키우고, 25°에서 멈춘다
export const steerOf = (kap) => Math.max(-0.44, Math.min(0.44, Math.atan(3.6 * kap) * 2.5));

// 테마 색(캔버스용). el은 '.gx' 안 요소 — 토큰을 읽는다
export function carColors(css, el) {
  const dark = css(el, '--bg').toLowerCase() !== '#ffffff';
  return {
    body: css(el, '--f1'),
    carbon: dark ? '#2E333D' : '#1A1C21',
    tyre: dark ? '#090A0D' : '#121317',
    tread: dark ? '#262A33' : '#34373F',
    helmet: '#F4F5F7',
    hi: 'rgba(255,255,255,.9)',
    shade: 'rgba(0,0,0,.16)',
    rain: dark ? '#3A0D0C' : '#2A0A09',
    edge: css(el, '--bg'),
    shadow: dark ? 'rgba(0,0,0,.55)' : 'rgba(16,18,24,.28)',
    ghost: dark ? 'rgba(165,169,180,.34)' : 'rgba(86,91,103,.30)',
  };
}
