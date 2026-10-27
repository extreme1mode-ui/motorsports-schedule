import { defineConfig } from '@apps-in-toss/web-framework/config';

// 앱인토스 설정. 웹 번들은 `npm run build:toss`(vite build --mode toss)가 dist-toss/에 만들고,
// `npx ait build`가 그 폴더를 .ait로 묶는다.
export default defineConfig({
  appName: 'gantry',
  brand: {
    primaryColor: '#14161C',
  },
  // 위치·사진·카메라를 쓰지 않는다.
  permissions: [],
  // 뒤로가기만 켠다. 로고·이름은 기본값(콘솔 등록 정보).
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
  webBundleDir: 'dist-toss',
});
