// 스크린리더 전용 텍스트(시각적으로 숨김). 컴포넌트 파일에 상수를 두면 react-refresh 규칙에 걸려 따로 둔다.
export const SR_ONLY = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

// 상세 헤더 사진 위 스크림. 홈 히어로(452px)보다 낮은 헤더라 위쪽은 옅게, 글자가 놓이는 아래쪽만 짙게.
// 다크: 흰 글자 → 어두운 스크림. 라이트: #111 글자 → 밝은 스크림(사진이 하얗게 날아가지 않게 상단은 옅게).
// 사진은 테마를 따르지 않는다 — 다크·라이트 같은 값을 쓴다. 색을 입히지 않고 중립 검정으로만 어둡게.
// 전체 은은한 어둡기 + 글자가 놓이는 아래쪽 추가. (대비 실측에 맞춰 조정한 값)
export const PHOTO_SCRIM = 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.22) 30%, rgba(0,0,0,0.85) 100%)';
