// 아부다비 GP 2026 (야스 마리나 서킷) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
export default {
  id: 'abu26',
  raceId: 'f1-2026-23-abudhabigrandprix',
  round: 'R23',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: 54.6016, lat0: 24.4786, kxLat: 24.4709 },
  tz: { off: 4, abbr: 'GST', name: '아부다비 시간', utc: 'UTC+4' },
  day0: [2026, 11, 4],
  days: [{d:'12.04',w:'금',en:'FRI'},{d:'12.05',w:'토',en:'SAT'},{d:'12.06',w:'일',en:'SUN'}],
  title: '아부다비 그랑프리',
  heroEn: 'Formula 1 Etihad Airways Abu Dhabi Grand Prix',
  markup: { aria: '아부다비 야스 마리나 서킷 지도', circuit: '야스 마리나 서킷', dates: '12.04–06' },
  overtake: [6,7],
  geoBox: [-500, 1450, -700, 2200],
  /* no zone-gated access: grandstands are reserved seats, Abu Dhabi Hill and The House are non-reserved,
     every ticket includes all Fanzones and Oasis areas and the After-Race Concert of the day */
  zones: null,
  spots: [
    {id:'main',name:'Main Grandstand',zone:null,xy:[407.4,917.0],R:250,L:339,tags:['start','podium'],desc:'출발 그리드와 피트 스톱, 피니시 라인, 포디움 세리머니와 불꽃놀이를 정면에서 봐요. 목요일 Pit Lane Walk가 포함돼요.'},
    {id:'north',name:'North Grandstand',zone:null,xy:[400.3,-38.4],R:200,L:241,tags:[],desc:'5번 헤어핀 바로 앞이에요. 빠르게 들어와 늦게 브레이크를 밟고 에이펙스를 지나는 차를 가까이서 봐요.'},
    {id:'nstraight',name:'North Straight Grandstand',zone:null,xy:[251.2,209.7],R:250,L:133,tags:[],desc:'5번 헤어핀을 빠져나와 가장 긴 직선으로 가속하는 차를 봐요. 대형 중계 스크린이 있어요.'},
    {id:'west',name:'West Grandstand',zone:null,xy:[-22.8,1136.7],R:160,L:265,tags:['overtake'],desc:'가장 긴 직선 끝이에요. 시속 300km가 넘는 속도에서 6·7번 코너로 들어가며 벌어지는 추월 싸움을 봐요.'},
    {id:'wstraight',name:'West Straight Grandstand',zone:null,xy:[19.9,900.2],R:230,L:116,tags:[],desc:'가장 긴 직선 끝에서 시속 300km가 넘는 차가 6·7번 코너를 앞두고 늦게 브레이크를 밟는 구간을 봐요.'},
    {id:'south',name:'South Grandstand',zone:null,xy:[632.8,1718.6],R:200,L:235,tags:['landmark'],desc:'9번 코너(Marsa Corner)와 Yas Marina, W Abu Dhabi – Yas Island가 함께 보여요. 목요일 Pit Lane Walk가 포함돼요.'},
    {id:'marina',name:'Marina Grandstand',zone:null,xy:[269.1,1493.7],R:220,L:256,tags:['landmark'],desc:'F2·F4 UAE 피트 빌딩 위 관람석이에요. Yas Marina와 W Abu Dhabi – Yas Island, South Grandstand가 보여요.'},
    {id:'adhill',name:'Abu Dhabi Hill',kind:'GA 관람 구역',zone:null,xy:[385.3,606.3],R:400,L:345,tags:[],desc:'2~6번 코너가 넓게 보이는 잔디 언덕이에요. 지정석이 없고 대형 스크린이 있어요. 서킷 곳곳의 관람 플랫폼도 돌아다니며 이용할 수 있어요.'},
    {id:'house',name:'The House',kind:'GA 관람 구역',zone:null,xy:[439.2,1620.3],R:150,L:77,tags:[],desc:'South Oasis에서 Yas Marina를 내려다보는 야외 GA 공간이에요. 하루 종일 DJ 공연이 열리고 테이블은 지정되지 않아요. 목요일 Pit Lane Walk가 포함돼요.'}
  ],
  /* official outline per guide spot (base.json evt.stands: 2026 ticket-page seat maps, same artwork as the 2026 circuit map) */
  standOf: {main:'main',north:'north',nstraight:'nstraight',west:'west',wstraight:'wstraight',south:'south',marina:'marina',adhill:'adhill',house:'house'},
  extraStands: ['paddock','yascentral','deck2','deck9','luna','t360','trackside'],   // hospitality on the 2026 maps
  stages: [
    {id:'etihadlive',name:'Etihad Live',zone:null,xy:[464.2,-328.8],desc:'레이스가 끝난 뒤 Yasalam 공연이 열리는 야외 공연장이에요. 예전 이름은 Etihad Park예요. 그날 유효한 티켓이 있으면 선착순으로 들어갈 수 있고, 게이트는 18:00에 열려요.'}
  ],
  /* pedestrian entry/exit gates of the 2025 official Yas Island map (numbers only) + West / East Gate (2026 FAQ names,
     2025 map 'West Entrance' / 'East Entrance'). 2026 gates are not published */
  gates: [
    {id:'g2_3',n:'2/3',name:'',side:null,xy:[664.3,1772.2]},
    {id:'g5',n:'5',name:'',side:null,xy:[516.0,1705.9]},
    {id:'g6',n:'6',name:'',side:null,xy:[387.3,1632.0]},
    {id:'g8',n:'8',name:'',side:null,xy:[145.8,1467.1]},
    {id:'g9',n:'9',name:'',side:null,xy:[65.4,1399.3]},
    {id:'g14',n:'14',name:'',side:null,xy:[-140.3,1065.4]},
    {id:'g15',n:'15',name:'',side:null,xy:[-108.7,993.9]},
    {id:'g16',n:'16',name:'',side:null,xy:[-82.1,919.3]},
    {id:'g18',n:'18',name:'',side:null,xy:[-39.2,809.4]},
    {id:'g19',n:'19',name:'',side:null,xy:[-13.1,723.3]},
    {id:'g21',n:'21',name:'',side:null,xy:[141.2,294.4]},
    {id:'g22',n:'22',name:'',side:null,xy:[178.7,167.8]},
    {id:'g23',n:'23',name:'',side:null,xy:[195.0,83.1]},
    {id:'g24',n:'24',name:'',side:null,xy:[201.8,16.4]},
    {id:'west',n:'',name:'West',side:null,xy:[155.4,502.3]},
    {id:'east',n:'',name:'East',side:null,xy:[1362.6,-385.5]}
  ],
  /* which area a gate serves: older formula1.com 'Getting to …' articles (official, undated) */
  gateDesc: g => ({
      '2/3':'예전 F1 공식 안내에 따르면 South·Marina Grandstand 쪽 게이트예요. ', '5':'예전 F1 공식 안내에 따르면 South·Marina Grandstand 쪽 게이트예요. ',
      '6':'예전 F1 공식 안내에 따르면 South·Marina Grandstand 쪽 게이트예요. ', '9':'예전 F1 공식 안내에 따르면 South·Marina Grandstand 쪽 게이트예요. ',
      '18':'예전 F1 공식 안내에 따르면 Main Oasis·West Oasis와 Abu Dhabi Hill 쪽 게이트예요. ',
      '23':'예전 F1 공식 안내에 따르면 North Oasis·North Grandstand 쪽 게이트예요. ', '24':'예전 F1 공식 안내에 따르면 North Oasis·North Grandstand 쪽 게이트예요. '
    }[g.n] || '')
    + (g.n ? '번호와 위치는 2025 공식 지도 기준이고, 2026 게이트 정보는 아직 발표되지 않았어요.'
      : '2026 공식 FAQ에 나오는 게이트로, 휠체어 이용자를 관람석까지 데려다주는 이동 수단이 있어요. 위치는 2025 공식 지도 기준이에요.'),
  transit: {
    items: [
    {id:'cs1',name:'Courtesy Shuttle',codes:[],xy:[95.1,573.5],note:'West 게이트 가까운 셔틀 정류장이에요.'},
    {id:'cs2',name:'Courtesy Shuttle',codes:[],xy:[509.8,-81.3],note:'North Grandstand 옆 셔틀 정류장이에요.'},
    {id:'cs3',name:'Courtesy Shuttle',codes:[],xy:[592.5,505.8]},
    {id:'cs4',name:'Courtesy Shuttle',codes:[],xy:[1282.6,-269.1],note:'East 게이트 가까운 셔틀 정류장이에요.'},
    {id:'tx1',name:'Taxi Load Zone',codes:[],xy:[53.0,521.1],note:'택시를 타고 내리는 곳이에요. 위치는 2025 공식 지도 기준이에요.'},
    {id:'tx2',name:'Taxi Load Zone',codes:[],xy:[-211.5,1238.2],note:'택시를 타고 내리는 곳이에요. 위치는 2025 공식 지도 기준이에요.'},
    {id:'tx3',name:'Taxi Load Zone',codes:[],xy:[90.4,1554.2],note:'택시를 타고 내리는 곳이에요. 위치는 2025 공식 지도 기준이에요.'},
    {id:'tx4',name:'Taxi Load Zone',codes:[],xy:[626.4,1951.9],note:'택시를 타고 내리는 곳이에요. 위치는 2025 공식 지도 기준이에요.'},
    {id:'tx5',name:'After-Race Concert Taxi',codes:[],xy:[907.6,-423.2],note:'레이스 뒤 공연이 끝나고 택시를 타는 곳으로 표시돼 있어요. 위치는 2025 공식 지도 기준이에요.'}
  ],
    xy: {},
    layer: '셔틀·택시', kicker: '셔틀·택시', short: '셔틀', near: '셔틀과 가까운', suffix: '', aria: ' 셔틀·택시 정류장 ',
    note: '2026 안내에는 야스 섬을 도는 무료 서킷 셔틀이 나와요. 가장 가까운 정류장은 공식 앱 Wayfinding에서 확인하고, Yas Mall에 주차해도 셔틀을 탈 수 있어요. 지도의 정류장은 2025 공식 지도의 Courtesy Shuttle 위치예요.',
    icon: 'bus'
  },
  village: {
    items: [
    {id:'fanzone',name:'F1 Fanzone · Main Oasis',label:'F1 Fanzone',xy:[387.4,883.4],desc:'Main Grandstand 뒤 팬 존이에요. 목요일에는 모든 티켓으로 Main Oasis와 West Oasis의 F1 Fanzone에 들어갈 수 있어요.'},
    {id:'west1',name:'West Oasis',label:'West Oasis',xy:[-59.2,1010.3]},
    {id:'west2',name:'West Oasis',label:'West Oasis',xy:[-1.0,862.3]},
    {id:'adhoasis',name:'Abu Dhabi Hill Oasis',label:'Abu Dhabi Hill Oasis',xy:[205.4,655.5]},
    {id:'north1',name:'North Oasis',label:'North Oasis',xy:[222.5,190.5]},
    {id:'north2',name:'North Oasis',label:'North Oasis',xy:[261.1,-18.5]},
    {id:'north3',name:'North Oasis',label:'North Oasis',xy:[467.3,-24.4],desc:'Etihad Live로 걸어가는 길이 North Oasis에서 시작해요. 공연장 전용 입구가 있어요.'},
    {id:'marinaoasis',name:'Marina Oasis',label:'Marina Oasis',xy:[253.9,1513.6]},
    {id:'southoasis',name:'South Oasis',label:'South Oasis',xy:[478.4,1631.0],desc:'The House가 있는 오아시스예요.'}
  ],
    label: '오아시스', desc: '관람석 옆 공연·먹거리 구역으로, 모든 티켓으로 들어갈 수 있어요. 2025 공식 지도 기준으로 모든 오아시스에 화장실, 응급 처치, 기도실, 먹거리, 라운지 바, 굿즈 판매가 있어요.'
  },
  /* landmarks — OpenStreetMap positions (metres). r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'W Abu Dhabi – Yas Island',xy:[453.3,1237.4],r:1},
    {t:'Yas Marina',en:'Yas Marina',xy:[638.7,1257.4],r:1,w:1},
    {t:'Ferrari World',xy:[839.8,-605.2],r:1},
    {t:'Etihad Arena',xy:[265.8,2016.5],r:2},
    {t:'Yas Links',xy:[-71.2,259.1],r:2},
    {t:'Yas KartZone',xy:[569.6,147.4],r:3}
  ],
  /* schedule (local time GST, as published): [day, start, end, series, English, Korean, note]
     race end: not published — 17:00 start + 2-hour race time limit */
  track: [
    [0,'13:30','14:30','f1','Formula 1 · Practice 1','F1 연습 주행 1',''],
    [0,'17:00','18:00','f1','Formula 1 · Practice 2','F1 연습 주행 2',''],
    [1,'14:30','15:30','f1','Formula 1 · Practice 3','F1 연습 주행 3',''],
    [1,'18:00','19:00','f1','Formula 1 · Qualifying','F1 예선',''],
    [2,'17:00','19:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','58랩 · 끝나는 시각 미발표(최대 2시간 기준)',1]
  ],
  /* stage acts: no set times published for 2026 */
  acts: [],
  /* stages whose acts have no published times (Etihad Live: gates 18:00) */
  tba: [
    {stage:'etihadlive', name:'Etihad Live', days:'목·금·토·일', acts:['Zara Larsson (목)','Lewis Capaldi (목)','Alex Warren (금)','Imagine Dragons (토)','The Chainsmokers (일)','The Script (일)']}
  ],
  quietTitles: [],
  series: {f1:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'main',name:'Main Grandstand',zl:'',zones:null,seat:'main',sub:'출발·피니시 직선 지정석 · 목요일 Pit Lane Walk 포함'},
    {id:'north',name:'North Grandstand',zl:'',zones:null,seat:'north',sub:'5번 헤어핀 지정석'},
    {id:'nstraight',name:'North Straight Grandstand',zl:'',zones:null,seat:'nstraight',sub:'5~6번 코너 사이 가장 긴 직선 지정석'},
    {id:'west',name:'West Grandstand',zl:'',zones:null,seat:'west',sub:'가장 긴 직선 끝 6·7번 코너 지정석'},
    {id:'wstraight',name:'West Straight Grandstand',zl:'',zones:null,seat:'wstraight',sub:'6·7번 코너 브레이킹 구간 지정석'},
    {id:'south',name:'South Grandstand',zl:'',zones:null,seat:'south',sub:'9번 코너(Marsa Corner) 지정석 · 목요일 Pit Lane Walk 포함'},
    {id:'marina',name:'Marina Grandstand',zl:'',zones:null,seat:'marina',sub:'F2·F4 UAE 피트 빌딩 위 지정석'},
    {id:'adhill',name:'Abu Dhabi Hill (GA)',zl:'',zones:null,seat:'adhill',sub:'2~6번 코너 잔디 언덕 · 지정석 없음'},
    {id:'house',name:'The House (GA)',zl:'',zones:null,seat:'house',sub:'South Oasis 야외 공간 · 지정석 없음 · 목요일 Pit Lane Walk 포함'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 아부다비 GP 공식 티켓 안내 기준이에요. 그랜드스탠드는 지정석이고 Abu Dhabi Hill과 The House는 지정석이 없어요. 모든 티켓에 서킷 곳곳의 Fanzone·오아시스와 그날 Etihad Live 레이스 뒤 공연(선착순) 입장이 포함돼요.',
  tl: { from: 12*60, to: 21*60, rows: [], names: {}, trackTag: '<span class="stag f1">F1</span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>GA 구역 Abu Dhabi Hill에서는 2~6번 코너가 보여요.',
  searchPh: '관람석, 공연장, 오아시스, 게이트, 셔틀',
  quick: ['Imagine Dragons','The Chainsmokers','Etihad Live','Abu Dhabi Hill','South Grandstand','North Oasis','Courtesy Shuttle','9번 코너'],
  presets: [
    {d:0,t:'13:20',l:'연습 주행 1 · 10분 전'}, {d:0,t:'17:30',l:'연습 주행 2 진행 중'},
    {d:1,t:'17:50',l:'예선 · 10분 전'},
    {d:2,t:'16:30',l:'결승 · 30분 전'}, {d:2,t:'17:50',l:'결승 진행 중'}
  ],
  demoRange: [10*60, 24*60-1],
  amen: {info:['info','AskYAS 안내'],tunnel:['walk','보행자 터널']},
  amenLegend: [['info','AskYAS 안내'],['walk','보행자 터널']],
  info: {
    title: '아부다비 그랑프리 서킷 맵',
    sub: '야스 마리나 서킷 · 5.281km · 16개 코너 · 결승 58랩 · 반시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 4m 안에서 맞아요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-09-27판에서 건물·도로·물가·풀밭·피트레인을 그대로 그렸어요'],
      ['코너 번호·출발선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요'],
      ['트랙 세션 시간', 'Formula 1 공식 일정(2026) · 아부다비 시간(GST · UTC+4) · 결승 끝 시각은 발표되지 않아 최대 2시간으로 표시해요 · F2·F4 UAE 시간은 아직 발표되지 않았어요 · 바뀔 수 있어요'],
      ['무대 공연', '아부다비 GP 2026 Yasalam 라인업 발표 · 공연 시각은 아직 발표되지 않았고, Etihad Live 게이트는 18:00에 열려요 · 바뀔 수 있어요'],
      ['관람석·호스피탈리티', '아부다비 GP 2026 공식 서킷 지도와 티켓 페이지 좌석 지도(2025년에 올린 같은 그림)를 트랙에 맞춰 실측 지도 위로 옮겼어요. 공식 지도는 축척이 없는 안내도라 트랙에서 먼 곳일수록 오차가 커요. 관람석에서 보이는 구간은 추정치예요'],
      ['게이트·오아시스·셔틀·편의시설', '2025 공식 지도(FIA 2025 미디어 키트의 Yas Island Map·Yas Marina Circuit Map) 기준이에요. 2026 안내도는 아직 나오지 않았어요. 게이트가 어느 관람석 쪽인지는 예전 F1 공식 안내를 따랐어요'],
      ['공연장·랜드마크', 'Etihad Live(예전 du Arena·Etihad Park)와 랜드마크 위치는 OpenStreetMap 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
