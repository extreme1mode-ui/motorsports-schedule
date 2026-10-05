# 라이브 서킷 맵 (`src/circuit-map/`)

2026 싱가포르 GP(R17) 하나에만 붙는 전체 화면 지도다. 탭이 아니라 한 경기의 '모드'로 열리고, 나오면 들어오기 직전 화면으로 돌아간다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `CircuitMap.jsx` | React 쪽 전부. `CircuitMapProvider`(열림 상태·히스토리·포커스·`현장에 가요`), 전체 화면 레이어(포털 `#cm`), 진입점 두 개(`CircuitMapSection`, `HeroSiteRow`), `hasMap(race)` |
| `map-core.js` | 지도 코어 `GantryMap(HOST, D)`. 프레임워크 없는 DOM/SVG 코드. 팬·줌, 레이어, 핀, 시트(지금·일정·관람·내 계획), 검색, 티켓 대화상자 |
| `map-markup.js` | 코어가 처음 열릴 때 `#cm`에 넣는 마크업과 아이콘 심볼 |
| `base.json` | 지도 데이터(약 360KB). `track` 트랙, `bm` 바탕 지도(OSM), `evt` 행사 배치(공식 맵), `roadlab` 도로 이름. `tools/circuit-map-data/run.sh`가 만든다. 손으로 고치지 않는다 |
| `circuit-map.css` | 지도 안 부품. 모두 `#cm` 아래로 한정 |
| `basemap.css` | 바탕 지도 재료(`--bm-*`), 도로·건물·구역 스타일, 표시 단계(LOD) 규칙 |
| `entry.css` | 진입점 두 곳(`.cme`, `.home .hero2-site`)과 레이어 전환 애니메이션 |

데모 시계는 `src/demo/`에 있다(아래 참고).

## 앱과 붙는 곳

| 위치 | 내용 |
|---|---|
| `App.jsx` | `CircuitMapProvider`로 모바일·웹 셸을 감싼다. 창 크기로 셸이 바뀌어도 지도 상태가 유지된다. `DemoClockSheet`도 여기 |
| `screens.jsx` › `RaceDetail` | `<CircuitMapSection race={race} />` (세션 목록 다음, WEEKEND 앞) |
| `web-screens.jsx` › `RaceDrawer` | `<CircuitMapSection race={race} variant="drawer" />`. 드로어의 Esc는 지도가 열려 있으면(`html.cm-open`) 무시한다 |
| `home/Home.jsx` | 히어로 안 `<HeroSiteRow race={hero.race} now={now} />`, 데모 빌드에서만 시계 칩이 데모 시계를 연다 |
| `storage/records.js` | `attend`(현장에 가요 경기 id 집합), `circuitMap`(티켓·자리·담은 세션·레이어), `demoClock`(데모 전용) |
| `schedule/useSchedule.js` | `gantry:clock` 이벤트를 받으면 상태(LIVE·NEXT)를 다시 계산한다. 기본 빌드에서는 이 이벤트가 오지 않는다 |
| `i18n/ko.js`, `en.js` | `cm.*`(진입점·나가기), `demo.*`(데모 시계) |
| `main.jsx` | `./demo/clock.js`를 가장 먼저 import한다 |

## 동작

**진입점**

- 경기 상세의 `현장 · ON SITE` 카드: `hasMap(race)`인 경기만 보인다. 취소된 경기에는 없다.
- 홈 히어로 아래 현장 줄은 세 조건을 모두 만족할 때만 보인다.
  - 히어로가 지도 있는 경기다.
  - `현장에 가요`를 켰다.
  - 지금이 주말 시작 하루 전 00:00부터 주말 마지막 날 23:59(사용자 시간대) 사이다.

**나가기**

- 뒤로 버튼: 모바일은 상단 캡슐 왼쪽 `‹`, 데스크톱은 패널 맨 위 `‹ 경기 상세` / `‹ 홈`.
- Esc: 지도 안 레이어·대화상자부터 닫고, 남은 게 없으면 나간다.
- 브라우저/OS 뒤로: 지도는 히스토리 한 칸(`history.state.gantryMap`)이다.

**포커스와 접근성**

- 열려 있는 동안 `#root`는 `inert`다.
- 들어가면 포커스가 뒤로 버튼으로 가고, 나오면 누른 버튼으로 돌아온다.
- 처음 열 때만 티켓을 묻는다. 고른 티켓은 상세 카드와 현장 줄에 `내 티켓 · {name} · {zone}`으로 나온다.

**앱과 같이 쓰는 것**

- 테마: 지도 정보 시트에서 바꿔도 앱 전체에 반영된다(`HOST.setTheme`).
- 시계: 앱과 하나를 쓴다.
- 세션 종료 시각: 서비스 데이터에는 시작 시각만 있다. 지도 안의 LIVE 판정은 `map-core.js`의 `TRACK_RAW`(행사 공식 타임테이블. 서포트 레이스 포함, SGT 시작·종료 시각)를 쓴다.

**계측**: `circuit_map_opened {race_id, source}`, `attend_on` / `attend_off {race_id}`.

## 데모 시계 (`src/demo/`)

`VITE_DEMO_CLOCK=1`로 빌드할 때만 켜진다. 기본 빌드에서는 `Date`를 건드리지 않고 시계 칩도 일반 칩이다.

- 켜지면 앱 전체의 `Date`를 원하는 순간으로 옮긴다.
- 프리셋: 출국 전날, 스프린트 20분 전(기본), 결승 30분 전, 결승 진행 중, 위켄드가 끝난 뒤.
- 라이브 상태를 QA하려면 `VITE_DEMO_CLOCK=1 npm run dev`로 띄운다.

## 지도 구성

| 단계 | 배율 k (px/m) | 보이는 것 |
|---|---|---|
| 0 전체 | < 0.42 | 주요 도로, 건물 면 |
| 1 구역 | 0.42–1.05 | 서비스 도로, 건물 윤곽선, 도로 이름 |
| 2 거리 | ≥ 1.05 | 보행로, MRT 출구, 편의시설, 플랫폼 |

**레이어 순서(아래 → 위)**

1. `#mbg` 점 격자
2. `#bmap` 바탕 지도: 별도 `<svg>`
3. `#map` 트랙·관람석·피트
4. `#ov` 화면 좌표 오버레이: 셰브런, 출발/결승선, 육교, 도로 이름
5. `#pins`

**성능**

- 바탕은 꼭짓점이 약 3만 개라 매 프레임 다시 그리지 않는다.
- 움직이는 동안에는 CSS transform으로 합성만 한다. 멈추고 140ms 뒤에 화면과 여백 40%만 다시 그린다.
- 트랙·핀만 매 프레임 갱신하며, 모바일·데스크톱 모두 프레임 중앙값은 16.7ms다.

## 데이터와 출처

| 무엇 | 출처 | 의무 |
|---|---|---|
| 건물·도로·물·공원·다리·부두·피트레인·MRT 출구·랜드마크 | © OpenStreetMap 기여자, ODbL (OpenFreeMap 2026-09-27판 z14) | **지도 오른쪽 아래 `© OpenStreetMap 기여자`와 정보 시트의 출처 줄을 지우지 않는다** |
| 관람석·게이트·구역·무대·빌리지·플랫폼·육교·출발/결승선·편의시설 | 싱가포르 GP 공식 Circuit Park Map (2026-09-10판 PDF) | 위치만 읽었다. 이미지는 쓰지 않는다 |
| 트랙 형상 | bacinger/f1-circuits (MIT) | — |

**정확도**

- 트랙 중심선과 OSM 도로 중심선의 차이: 중앙값 0.6m, 95% 7.9m.
- 공식 맵은 축척이 없는 안내도다. 그래서 코너 T1–T19 사이 호 길이와 앵커 두 곳으로 thin-plate spline 변환을 만들어 옮겼다.
- 트랙에서 멀수록 수십 m까지 어긋날 수 있다.
- 손 보정 다섯 곳(Gate 8, Gate 1, Wharf, Zone 1 빌리지, DBS 야외극장)의 이유는 `tools/circuit-map-data/gen_base.py`에 있다.

**다시 만들기**: `tools/circuit-map-data/README.md`를 따른다. 같은 입력이면 바이트 단위로 같은 `base.json`이 나온다.

## 알려진 한계 · 결정이 필요한 것

- 지도 안 문구(`map-core.js`, `map-markup.js`)는 한국어로 고정돼 있다. 앱 언어를 따르지 않는다.
- 2026 공식 맵에 없는 `Orange @ Empress` 관람석은 이전 위치와 모양을 유지했다.
- 가이드의 `Padang`은 `Padang B`에 대응시켰다.
- 공식 맵에만 있는 관람석 다섯 곳(Padang A, Turn 2, Raffles, Promenade, Skyline)은 지도에 윤곽과 이름만 있다.
- 게이트는 공식 9곳(1, 2, 3A, 3B, 4, 5, 6, 7, 8)이다. 2026 맵에 없는 Singapore Flyer 게이트는 뺐다.
- 출발선과 결승선은 공식 맵대로 두 선으로 그린다.
- 무대·육교·화면처럼 행사 때만 생기는 시설은 OSM에 없다. 위치는 공식 맵에서 옮긴 값뿐이다.
