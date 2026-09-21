// 스크린리더 전용 텍스트(시각적으로 숨김). 컴포넌트 파일에 상수를 두면 react-refresh 규칙에 걸려 따로 둔다.
export const SR_ONLY = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

// 상세 헤더 사진 위 스크림. 홈 히어로(452px)보다 낮은 헤더라 위쪽은 옅게, 글자가 놓이는 아래쪽만 짙게.
// 다크: 흰 글자 → 어두운 스크림. 라이트: #111 글자 → 밝은 스크림(사진이 하얗게 날아가지 않게 상단은 옅게).
export const DETAIL_SCRIM = {
  dark: 'linear-gradient(180deg, rgba(7,8,11,0.20) 0%, rgba(7,8,11,0.50) 48%, rgba(7,8,11,0.82) 100%)',
  light: 'linear-gradient(180deg, rgba(242,243,245,0.30) 0%, rgba(242,243,245,0.62) 48%, rgba(242,243,245,0.88) 100%)',
};
