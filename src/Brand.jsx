// GANTRY 브랜드 마크 — 원본 벡터는 gantry-*.svg와 같은 값. 수정 시 함께 바꿀 것.
// 사용: <GantryLockup height={14} /> · <GantrySymbol size={16} title="Gantry" /> · <LightRow lit={2} />
//       <SeriesTag series="f1" code="F1" round="R15" /> · <TimeWithZone time="20:00" zone="KST" /> · <Beam />
// 심볼: 스타트 갠트리(빔 1 + 신호등 5열×2행). 가로 19u × 세로 10u.
//   빔 두께 = 워드마크 가로획(122), 신호등 지름 2.8u, 간격 1.2u. 아래 줄은 기준선 아래로 8(광학 보정).
// 워드마크: 전용 설계 글자(캡하이트 10u). 색은 currentColor만 쓴다.

const WORDMARK_D = "M200,0h300c154.5,0 197.1,37.3 199.9,184h-144.9c-4.7,-48.9 -26.1,-62 -86.9,-62h-236c-70.4,0 -88,17.6 -88,88v280c0,70.4 17.6,88 88,88h236c70.4,0 88,-17.6 88,-88v-39h-206v-122h350v171c0,160 -40,200 -200,200h-300c-160,0 -200,-40 -200,-200v-300c0,-160 40,-200 200,-200zM764,700l235,-700h300l235,700h-146.9l-53,-158h-370.2l-53,158zM1004.9,420h288.2l-100,-298h-88.2zM1618,700v-700h187.2l339,481.6l17.4,33.3l-7.6,-36.4v-478.5h144v700h-187.2l-339,-481.6l-17.4,-33.3l7.6,36.4v478.5zM2451,0h528c48.8,0 61,12.2 61,61c0,48.8 -12.2,61 -61,61l-192,0v578h-144v-578h-192c-48.8,0 -61,-12.2 -61,-61c0,-48.8 12.2,-61 61,-61zM3128,700v-700h470c147.2,0 184,36.8 184,184v74.5c0,113.4 -27.9,143.1 -138.8,144l164.8,297.5h-175.7l-164.8,-297.5h-195.6v297.5zM3585.2,280.5c42.2,0 52.8,-10.6 52.8,-52.8v-26.5c0,-63.4 -15.8,-79.2 -79.2,-79.2h-286.8v158.5zM3816,0h181.4l187.7,227.1l9.2,33.5l12.5,-33.5l187.7,-227.1h181.4l-308,372.6v327.4h-144v-327.4z";
const WORD_W = 4576;

function SymbolShapes({ lit = 5 }) {
  const cols = [0, 1, 2, 3, 4];
  return (
    <>
      <rect x="0" y="0" width="1330" height="122" rx="61" fill="currentColor" />
      {cols.map(i => (
        <g key={i} className="gt-col" fill="currentColor" fillOpacity={i < lit ? 1 : 0.16}>
          <circle cx={105 + i * 280} cy="330" r="98" />
          <circle cx={105 + i * 280} cy="610" r="98" />
        </g>
      ))}
    </>
  );
}

export function GantrySymbol({ size = 20, title, lit = 5 }) {
  // size = 심볼 높이(px). 너비는 1.9배.
  return (
    <svg width={size * 1.9} height={size * 708 / 700} viewBox="0 0 1330 708" role={title ? 'img' : undefined}
      aria-label={title} aria-hidden={title ? undefined : true} focusable="false" style={{ display: 'block', flex: 'none' }}>
      <SymbolShapes lit={lit} />
    </svg>
  );
}

export function GantryWordmark({ height = 12 }) {
  return (
    <svg width={height * WORD_W / 700} height={height} viewBox={`0 0 ${WORD_W} 700`} aria-hidden="true" focusable="false" style={{ display: 'block', flex: 'none' }}>
      <path fill="currentColor" d={WORDMARK_D} />
    </svg>
  );
}

// 가로 락업: 심볼 높이 = 캡하이트, 사이 간격 = 6u(신호등 두 개 폭).
export function GantryLockup({ height = 14 }) {
  return (
    <span role="img" aria-label="Gantry" style={{ display: 'inline-flex', alignItems: 'flex-start', gap: height * 0.6 }}>
      <GantrySymbol size={height} />
      <GantryWordmark height={height} />
    </span>
  );
}

// 라이트 로우 — 레이스까지 남은 날을 켜진 신호등 개수로 보여준다 (D-4 → 1개 … D-0 → 5개).
// 켜질 때는 하나씩, 꺼질 때는 한꺼번에. 꺼지는 전환에는 애니메이션을 주지 않는다.
export function LightRow({ lit = 0, tone = 'default', size = 6, gap = 3 }) {
  const on = tone === 'signal' ? 'var(--signal)' : 'var(--text, currentColor)';
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap, flex: 'none' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <i key={i} style={{ width: size, height: size, borderRadius: '50%', display: 'block',
          background: i < lit ? on : 'currentColor', opacity: i < lit ? 1 : 0.22 }} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// v1.1 디테일 컴포넌트 — 글자는 모두 Pretendard(상속). 숫자는 tnum·case.
const DATA_FEATURES = '"tnum", "case"';

// 시리즈 태그: 막대 3×14 · 간격 8 · 코드 12/700 +6% · 라운드 500 +4%
// <SeriesTag series="f1" code="F1" round="R15" />
export function SeriesTag({ series, code, round, size = 12 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.67, fontSize: size, fontWeight: 700,
      letterSpacing: '.06em', color: 'var(--text)', fontFeatureSettings: DATA_FEATURES, lineHeight: 1 }}>
      <i aria-hidden="true" style={{ display: 'block', width: 3, height: size * 1.17, borderRadius: 1.5, background: `var(--${series})` }} />
      <span>{code}{round && <span style={{ fontWeight: 500, letterSpacing: '.04em', color: 'var(--text3)', marginLeft: size * 0.5 }}>{round}</span>}</span>
    </span>
  );
}

// 시각 + 시간대: 단위는 시각 × 0.28, 캡하이트 윗선에 맞춤
// <TimeWithZone time="20:00" zone="KST" size={40} />
export function TimeWithZone({ time, zone, size = 40, weight = 700 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: Math.max(4, size * 0.14), lineHeight: 1 }}>
      <span style={{ fontSize: size, fontWeight: weight, letterSpacing: size >= 60 ? '-.03em' : '-.02em', fontFeatureSettings: DATA_FEATURES }}>{time}</span>
      {zone && <span style={{ fontSize: Math.max(11, size * 0.28), fontWeight: 600, letterSpacing: '.1em', color: 'var(--text3)',
        marginTop: size * 0.1, fontFeatureSettings: DATA_FEATURES }}>{zone}</span>}
    </span>
  );
}

// 빔: 라벨 앞 24×3, 헤드라인 위 40×4
export function Beam({ variant = 'marker' }) {
  const [w, h] = variant === 'head' ? [40, 4] : [24, 3];
  return <i aria-hidden="true" style={{ display: 'block', width: w, height: h, borderRadius: h / 2, background: 'currentColor', flex: 'none' }} />;
}
