#!/bin/bash
# 서킷 맵 데이터 재생성: work/ 에 두 입력 파일을 두고 저장소 루트에서 실행 → src/circuit-map/venues/sgp26/base.json
#   work/gantry-osm-marina-bay.json   (extract-openfreemap.js 로 브라우저에서 저장)
#   work/circuit-park-map-08.pdf      (singaporegp.sg › Circuit Park Map › DOWNLOAD)
set -e
cd "$(dirname "$0")"
python3 pdf_extract.py
python3 build_bm.py
python3 evt_final.py
python3 amen.py
python3 amen_warp.py
python3 gen_base.py
