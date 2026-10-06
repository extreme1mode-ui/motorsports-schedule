# 서킷 맵 데이터 만들기 (`src/circuit-map/venues/sgp26/base.json`)

서킷 맵의 바탕 지도와 행사 배치를 두 원본에서 다시 만든다. 같은 입력이면 같은 `base.json`이 나온다(바이트 단위로 확인함).

## 입력 — `work/`에 둔다 (저장소에는 넣지 않는다)

| 파일 | 얻는 법 | 라이선스 |
|---|---|---|
| `gantry-osm-marina-bay.json` | https://openfreemap.org 를 브라우저로 열고 `extract-openfreemap.js`를 개발자 콘솔에 붙여 넣는다. OSM z14 벡터 타일 4장을 마리나 베이 범위로 잘라 저장한다(약 2.6MB). | © OpenStreetMap 기여자, ODbL — 지도에 출처 표시 필수 |
| `circuit-park-map-08.pdf` | singaporegp.sg › Event › Circuit Park Map › DOWNLOAD (2026-09-10판) | 싱가포르 GP 저작물 — 이미지는 쓰지 않고 위치만 읽는다 |

트랙 형상(`base.json`의 `track`)은 이미 저장소에 있는 값(bacinger/f1-circuits, MIT)을 그대로 쓴다.

## 실행

```bash
pip install pdfplumber opencv-python matplotlib numpy   # pdftoppm(poppler)도 필요
tools/circuit-map-data/run.sh
```

## 단계

1. `pdf_extract.py`: 공식 맵을 300dpi로 렌더한다. 그다음 단어 위치, 트랙 중심선 벡터(8pt 흰 선), 구역·관람석 색 마스크를 뽑는다.
2. `build_bm.py`: OSM에서 물, 물가선, 녹지, 부두와 다리 상판, 건물(높이 3단계), 도로(위계별·다리 분리), 피트레인, MRT 출구를 만든다.
   - 타일 경계에서 잘린 조각은 이어 붙이거나 0.4m 겹친다.
   - 건물 부분(building:part)은 외곽선 안에 있으면 버린다. 단, 20m 이상 높은 타워는 남긴다.
   - 트랙에서 먼 곳은 더 간략하게 만든다.
3. `evt_final.py`: 공식 맵을 실측 지도로 옮긴다(`warp.py`, `evt.py`).
   - 트랙을 코너 T1–T19 사이 호 길이로 대응시키고, 앵커 두 곳(분수, 플라이어)을 더한다. 이것으로 thin-plate spline을 만든다.
   - 그 변환으로 구역 경계, 관람석 윤곽, 게이트, 무대, 빌리지, 플랫폼을 옮긴다.
   - 육교와 출발·결승선은 트랙 위치(m)로 옮긴다.
   - 손으로 읽은 공식 맵 좌표는 `cpm_items.json`에 있다.
4. `amen.py` → `amen_warp.py`: 공식 맵 아이콘의 색과 크기로 편의시설 위치를 뽑아 같은 방식으로 옮긴다. 대상은 화장실, 식음료, 바, 물, 응급, 안내, 굿즈, 티켓 부스, 워크어바웃, 대형 스크린이다.
5. `gen_base.py`: 위 결과를 압축 경로 문자열로 바꾸고 도로 이름 위치를 계산해 `base.json`에 쓴다.
   - 손 보정이 몇 군데 있고, 주석으로 이유를 남겼다(Gate 8, Gate 1, Wharf, Zone 1 빌리지, DBS 야외극장).

## 다음 해에

- OSM 타일 날짜가 바뀌면 1번 입력만 다시 받는다.
- 공식 맵이 바뀌면 `cpm_items.json`의 좌표를 다시 읽는다. 관람석 이름과 대응도 같이 확인한다.
- `evt_final.py`의 구역 성분 번호(`SEL`)도 다시 확인한다.
