# F1 결과 갱신

`src/results/f1-2026.json`은 경기 결과·스프린트 결과·드라이버 순위의 스냅샷이다. 앱은 이 파일만 읽는다(실행 중에 외부 API를 부르지 않는다).
경기가 끝나면 아래 순서로 갱신한다. 5분 안팎.

## 경기 뒤 갱신

1. 결승이 끝나고 몇 시간 뒤(Jolpica 반영 후) 저장소 루트에서
   ```
   node tools/f1-results/update.mjs --dry
   ```
   - `새 경기: 18R United States Grand Prix` 처럼 방금 끝난 경기가 보여야 한다.
   - `순위 기준 …R와 마지막 결과 …R가 다르다`가 나오면 Jolpica가 아직 갱신 중이다. 한두 시간 뒤 다시.
   - `값이 바뀐 기존 경기`가 나오면 페널티 등 정정이다. 공식 발표와 맞는지 보고 진행한다.
2. 이상 없으면 `node tools/f1-results/update.mjs` (파일을 고친다)
3. `npm run build`
4. 커밋·푸시: `git commit -am "결과: F1 18R 미국 GP"` → `git push origin main` (Vercel이 자동 배포)
5. 배포 뒤 `URL=https://www.gantryracing.com node design/f1-results/qa/results.cjs` (저장소에 design/이 있을 때)
6. main에 푸시하면 토스판도 /data/v1/로 받아 간다(D2 반영 뒤).

스프린트 주말은 결승 뒤 한 번만 갱신하면 스프린트까지 같이 들어온다.

## 2026 남은 경기와 갱신 시점 (한국 시간)

| 라운드 | 경기 | 결승 시작(UTC) | 갱신 |
|---|---|---|---|
| 18 | 미국 GP | 10/25 20:00 | 10/26(월) 오후 |
| 19 | 멕시코시티 GP | 11/1 20:00 | 11/2(월) 오후 |
| 20 | 상파울루 GP | 11/8 17:00 | 11/9(월) 오전 |
| 21 | 라스베이거스 GP | 11/22 04:00 | 11/22(일) 저녁 |
| 22 | 카타르 GP | 11/29 16:00 | 11/30(월) 오전 |
| 23 | 아부다비 GP | 12/6 13:00 | 12/7(월) 오전 |

## 사진

- 파일: `public/drivers/f1-2026/<드라이버 코드>.webp` (예: `VER.webp`). © Formula 1 — 출처 줄에 `사진 Formula 1`이 붙는다.
- 목록은 스크립트가 폴더를 보고 `photos.codes`에 적는다. 파일이 없는 드라이버는 코드 원(예: `TSU`)으로 그린다.
- 새 드라이버 사진 넣기: OpenF1 `drivers`의 `headshot_url`(…`.transform/3col/image.png`, 319px)을 받아 WebP로 바꿔 넣고 스크립트를 다시 돌린다.
  - F1 기본 실루엣(회색 사람 모양, 2~3KB)은 사진이 아니다. 넣지 않는다. LIN은 OpenF1 headshot이 실루엣이라 F1 2026 전신 사진 https://media.formula1.com/image/upload/c_fill,w_720/q_auto/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.webp에서 (x 92, y 1, 539×539)를 잘라 319px로 줄여 넣었다.
- 원본에서 얼굴이 가운데를 벗어난 사진은 `src/results/results.js`의 `PHOTO_FOCUS_X`에 얼굴 가운데 비율을 적는다.
- 사진을 모두 내려야 하면: `public/drivers/f1-2026/`의 파일을 지우고 스크립트를 다시 돌린다 → 모두 코드 원으로 바뀐다.

## 다음 시즌

`node tools/f1-results/update.mjs --season 2027` → `src/results/f1-2027.json`. 앱의 `src/results/results.js`가 읽는 파일 이름과 사진 폴더(`public/drivers/f1-2027/`)를 함께 바꾼다.
