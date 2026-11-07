// 데스크톱 서랍 폭: 데스크톱(1180 이상) 560(SPEC 8장), 태블릿(900–1179) 440. 서랍 안 스낵바 폭(− 64)도 이 값을 쓴다.
export const drawerWidth = (tier) => (tier === 'tablet' ? 440 : 560);
