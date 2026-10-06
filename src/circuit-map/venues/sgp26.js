// 싱가포르 GP 2026 — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값(투영 원점, 시간대, 일정, 관람석, 게이트, 무대,
// 교통, 랜드마크, 티켓, 화면 문구)은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
export default {
  id: 'sgp26',
  raceId: 'f1-2026-17-singaporegrandprix',
  round: 'R17',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: 103.8495, lat0: 1.2965, kxLat: 1.29 },
  tz: { off: 8, abbr: 'SGT', name: '싱가포르 시간', utc: 'UTC+8' },
  day0: [2026, 9, 9],
  days: [{d:'10.09',w:'금',en:'FRI'},{d:'10.10',w:'토',en:'SAT'},{d:'10.11',w:'일',en:'SUN'}],
  title: '싱가포르 그랑프리',
  heroEn: 'Singapore Grand Prix · 첫 스프린트 위켄드',
  markup: { aria: '싱가포르 마리나 베이 스트리트 서킷 지도', circuit: '마리나 베이 스트리트 서킷', dates: '10.09–11' },
  overtake: [1,7,14,16],
  pitFallback: [4700, 225],
  geoBox: [-400, 2300, -500, 2000],
  /* zones — the ticket model. null when the venue has no zone-gated access */
  zones: {
    1: {badge:'ZONE 1', short:'Z1', name:'Zone 1'}, 2: {badge:'ZONE 2', short:'Z2', name:'Zone 2'},
    3: {badge:'ZONE 3', short:'Z3', name:'Zone 3'}, 4: {badge:'ZONE 4', short:'Z4', name:'Zone 4'}
  },
  zoneNote: { 1: 'Zone 1 구역 · Zone 1 티켓이나 Premier 워크어바웃이 있어야 들어갈 수 있어요' },
  spots: [
    {id:'pit',name:'Pit',zone:1,all:1,ll:[103.86478,1.29085],R:175,L:230,tags:['start','podium'],desc:'출발·피니시 직선. 그리드, 피트 스톱, 피니시, 포디움을 한 자리에서 봐요.'},
    {id:'superpit',name:'Super Pit',zone:1,all:1,ll:[103.86470,1.29240],R:170,L:120,tags:['start','podium'],desc:'출발·피니시 직선 북쪽의 상위 좌석. 피트레인과 포디움 쪽 시야.'},
    {id:'pitexit',name:'Pit Exit',zone:1,all:1,ll:[103.86465,1.29350],R:160,L:90,tags:['start'],desc:'피트 출구 쪽. 피트 스톱 뒤 트랙으로 돌아오는 차와 언더컷 싸움을 봐요.'},
    {id:'t1',name:'Turn 1',zone:1,all:1,ll:[103.86455,1.29450],R:190,L:110,tags:['overtake','start'],desc:'메인 직선 끝 첫 브레이킹 지점. 오프닝 랩 경합과 추월이 잦아요.'},
    {id:'chicane2',name:'Chicane @ Turn 2',zone:1,all:1,ll:[103.86295,1.29525],R:170,L:90,tags:['start'],desc:'1~3번 코너로 이어지는 오프닝 시퀀스를 가까이서 봐요.'},
    {id:'republic',name:'Republic',zone:1,all:1,ll:[103.86330,1.29110],R:160,L:110,tags:['mrt'],desc:'4~5번 코너. 모든 구역에 들어갈 수 있는 좌석이고, 파당 무대까지는 걸어서 20분쯤 걸려요.'},
    {id:'bayfront',name:'Bayfront',zone:1,all:1,ll:[103.86060,1.28930],R:165,L:120,tags:['overtake'],desc:'16~17번 코너. 벤저민 시어스 브리지 아래, 긴 직선 끝 브레이킹 구간이에요.'},
    {id:'marinabay',name:'Marina Bay',zone:1,all:1,ll:[103.86505,1.28915],R:160,L:110,tags:['landmark'],desc:'마지막 18~19번 코너. 뒤로 싱가포르 플라이어가 보여요.'},
    {id:'stamford',name:'Stamford',zone:4,ll:[103.85625,1.29380],R:185,L:130,tags:['overtake'],desc:'7~8번 코너. 브레이킹 구간이라 추월이 자주 나오는 자리로 꼽혀요.'},
    {id:'padang',name:'Padang',zone:4,ll:[103.85255,1.29030],R:160,L:150,tags:['stage','landmark'],desc:'10번 코너. 파당 무대 헤드라이너 공연장까지 몇 분이면 가요.'},
    {id:'connaught',name:'Connaught',zone:4,ll:[103.85415,1.28985],R:150,L:110,tags:['overtake'],desc:'14번 코너. 에스플러네이드 드라이브 끝 하드 브레이킹 구간.'},
    {id:'empress',name:'Empress',zone:4,ll:[103.85175,1.28845],R:140,L:90,tags:[],desc:'11번 코너. 앤더슨 브리지 앞 좁은 진입부.'},
    {id:'orange',name:'Orange @ Empress',zone:4,ll:[103.85215,1.28795],R:130,L:70,tags:[],desc:'12번 코너 출구를 다른 각도에서 봐요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands) */
  standOf: {pit:'pit',superpit:'superpit',pitexit:'pitexit',t1:'t1',chicane2:'chicane2',republic:'republic',bayfront:'bayfront',marinabay:'marinabay',stamford:'stamford',padang:'padangB',connaught:'connaught',empress:'empress'},
  extraStands: ['padangA','turn2','raffles','promenade','skyline'],   // on the 2026 map, not (yet) in the guide
  stages: [
    {id:'padang',name:'Padang Stage',zone:4,ll:[103.85370,1.29030],desc:'파당 잔디 광장의 메인 무대. 모든 티켓에 이 무대 입장이 포함돼요.'},
    {id:'wharf',name:'Wharf Stage',zone:1,ll:[103.86220,1.28810],desc:''},
    {id:'barge',name:'Barge Stage',zone:1,ll:[103.86110,1.28730],desc:'2026년 새로 생긴 무대. 마리나 베이를 내려다보는 약 3,000⁠㎡ 규모의 계단식 무대예요.'},
    {id:'downtown',name:'Downtown',zone:4,ll:[103.85490,1.28840],desc:''},
    {id:'waterside',name:'Waterside',zone:4,ll:[103.85780,1.28860],desc:''},
    {id:'dbsot',name:'DBS Foundation Outdoor Theatre',short:'DBS Outdoor Theatre',zone:4,ll:[103.85630,1.28850],desc:''},
    {id:'garage',name:'The Garage',zone:4,ll:[103.85410,1.28930],desc:'매일 DJ 공연이 열려요. 시작 시각은 아직 발표되지 않았어요.'}
  ],
  /* official gates (Circuit Park Map, 10 Sep 2026). side = the zone the gate opens into */
  gates: [
    {id:'g1',n:'1',name:'Republic Blvd',side:1},
    {id:'g2',n:'2',name:'Temasek Ave',side:2},
    {id:'g3a',n:'3A',name:'Stamford',side:4},
    {id:'g3b',n:'3B',name:'Stamford',side:4},
    {id:'g4',n:'4',name:'Empress',side:4},
    {id:'g5',n:'5',name:'Fullerton',side:4},
    {id:'g6',n:'6',name:'Jubilee',side:4},
    {id:'g7',n:'7',name:'Marina Square',side:4},
    {id:'g8',n:'8',name:'Helix',side:2}
  ],
  gateDesc: g => `Zone ${g.side} 쪽으로 들어가는 게이트예요. 입장할 때 가방 검사가 있으니 여유 있게 도착하세요.`,
  transit: {
    items: [
    {id:'cityhall',name:'City Hall',codes:['NS25','EW13'],ll:[103.8525,1.2931]},
    {id:'esplanade',name:'Esplanade',codes:['CC3'],ll:[103.8556,1.2935]},
    {id:'promenade',name:'Promenade',codes:['CC4','DT15'],ll:[103.8603,1.2934]},
    {id:'raffles',name:'Raffles Place',codes:['NS26','EW14'],ll:[103.8514,1.2840]},
    {id:'bayfrontm',name:'Bayfront',codes:['CE1','DT16'],ll:[103.8590,1.2820]},
    {id:'nicoll',name:'Nicoll Highway',codes:['CC5'],ll:[103.8636,1.2999]}
  ],
    xy: {cityhall:[350,384],esplanade:[656,333],promenade:[1282,423],raffles:[218,1433],bayfrontm:[1110,1538],nicoll:[1591,-368]},   // OSM station nodes
    layer: 'MRT역', kicker: 'MRT역', short: 'MRT', near: 'MRT와 가까운', suffix: '역', aria: ' MRT역 ',
    note: '결승이 끝난 뒤에는 역이 크게 붐벼요. 연장 운행은 SMRT·SBS Transit 공지를 확인하세요.'
  },
  village: {
    items: [
    {id:'v1',name:'F1 Village @ Zone 1',zone:1,ll:[103.86210,1.29050]},
    {id:'v4',name:'F1 Village @ Zone 4',zone:4,ll:[103.85460,1.29120]}
  ],
    label: 'F1 빌리지', desc: '먹거리와 즐길 거리가 모인 구역이에요.'
  },
  /* landmarks — positions from OpenStreetMap (metres). r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'마리나 베이 샌즈',xy:[1249,1404],r:1},
    {t:'싱가포르 플라이어',xy:[1509,781],r:1},
    {t:'마리나 베이',en:'Marina Bay',xy:[930,1075],r:1,w:1},
    {t:'에스플러네이드',xy:[700,742],r:2},
    {t:'파당',xy:[393,646],r:2},
    {t:'선텍 시티',xy:[1040,115],r:2},
    {t:'내셔널 갤러리',xy:[219,700],r:2},
    {t:'아트사이언스 뮤지엄',xy:[1083,1158],r:2},
    {t:'마리나 스퀘어',xy:[868,640],r:3},
    {t:'풀러턴 호텔',xy:[398,1138],r:3},
    {t:'래플스 시티',xy:[428,300],r:3},
    {t:'멀라이언',xy:[557,1088],r:3},
    {t:'전쟁기념공원',xy:[592,412],r:3},
    {t:'헬릭스 브리지',xy:[1252,975],r:3},
    {t:'빅토리아 극장',xy:[213,900],r:3},
    {t:'아시아 문명 박물관',xy:[221,1001],r:3},
    {t:'싱가포르강',en:'Singapore River',xy:[-60,1000],r:3,w:1}
  ],
  /* schedule (local time, as published): [day, start, end, series, English, Korean, note] */
  track: [
    [0,'14:05','14:50','pcca','Porsche Carrera Cup Asia · Practice','포르쉐 카레라컵 아시아 연습',''],
    [0,'16:30','17:30','f1','Formula 1 · Practice 1','F1 연습 주행 1',''],
    [0,'20:30','21:14','f1','Formula 1 · Sprint Qualifying','F1 스프린트 예선',''],
    [1,'15:00','15:30','pcca','Porsche Carrera Cup Asia · Qualifying','포르쉐 카레라컵 아시아 예선',''],
    [1,'17:00','17:30','f1','Formula 1 · Sprint','F1 스프린트','21랩 또는 60분'],
    [1,'19:45','20:20','pcca','Porsche Carrera Cup Asia · First Race','포르쉐 카레라컵 아시아 레이스 1','12랩 또는 30분'],
    [1,'21:00','22:00','f1','Formula 1 · Qualifying','F1 예선',''],
    [2,'15:40','16:15','pcca','Porsche Carrera Cup Asia · Second Race','포르쉐 카레라컵 아시아 레이스 2',''],
    [2,'18:00','18:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [2,'19:44','19:46','cer','National Anthem','국가 연주',''],
    [2,'20:00','22:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','62랩 또는 120분']
  ],
  /* stage acts: [day, stage, artist, start, end, approx] */
  acts: [
    [0,'wharf','F1 Drivers’ Fan Forum','14:30','15:10'],[0,'barge','TOKiMONSTA','15:15','16:15'],[0,'downtown','Borderline','15:30','16:15'],
    [0,'dbsot','Momocurly','17:45','18:30'],[0,'waterside','Shingo Nakamura','17:45','18:45'],[0,'barge','Major Lazer Soundsystem','18:00','19:00'],
    [0,'downtown','Spacey Jane','18:30','19:15'],[0,'wharf','Split Enz','19:15','20:15'],[0,'padang','CORTIS','19:30','20:20'],
    [0,'barge','DJ Snake','21:25','22:30'],[0,'padang','JJ Lin','22:30','23:45'],
    [1,'wharf','F1 Drivers’ Fan Forum','15:10','15:40'],[1,'waterside','Tinzo + Jojo','15:30','16:45'],[1,'downtown','Ezra Collective','15:45','16:30'],
    [1,'barge','Flight Facilities DJ Set','15:50','16:45'],[1,'dbsot','Pleasantry','16:00','16:45'],[1,'waterside','Ape Drums','17:45','18:45'],
    [1,'downtown','Ocean Alley','17:45','18:30'],[1,'barge','Rev Run','18:00','19:00'],[1,'padang','Zara Larsson','18:45','19:45'],
    [1,'wharf','Goo Goo Dolls','19:30','20:30'],[1,'waterside','HYO','19:50','20:50'],[1,'padang','The Killers','22:30','23:45'],
    [2,'barge','ZHU','15:45','16:30'],[2,'downtown','The Rubens','15:45','16:30'],[2,'waterside','Monochrome','15:45','16:45'],
    [2,'dbsot','Lola Amour','16:30','17:15'],[2,'barge','Mark Ronson','17:00','18:00'],[2,'downtown','PREP','17:15','18:00'],
    [2,'wharf','Janet Jackson','18:15','19:15'],[2,'padang','James Arthur','18:15','19:15'],[2,'padang','Lana Del Rey','22:25','23:55',1]
  ],
  /* a stage whose acts have no times yet */
  tba: { stage: 'garage', name: 'The Garage', days: '금·토·일', acts: ['DJ Admin','SHANE 2SWEET','TeenagePop'] },
  quietTitles: ['국가 연주'],
  series: {f1:{code:'F1', cls:'f1'}, pcca:{code:'PCCA', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'pit',name:'Pit 그랜드스탠드',zl:'Z1',zones:[1,2,3,4],seat:'pit',sub:'모든 구역 입장 · 출발·피니시 직선 지정석'},
    {id:'stamford',name:'Stamford 그랜드스탠드',zl:'Z4',zones:[4],seat:'stamford',sub:'Zone 4 입장 · 7~8번 코너 지정석'},
    {id:'premier',name:'Premier 워크어바웃',zl:'ALL',zones:[1,2,3,4],seat:null,sub:'모든 구역 자유 관람 · 지정석 없음'},
    {id:'walk4',name:'Zone 4 워크어바웃',zl:'Z4',zones:[4],seat:null,sub:'Zone 4 자유 관람 · 지정석 없음'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '들어갈 수 있는 구역과 내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '구역별 입장 범위는 2026 티켓 안내를 바탕으로 한 대표 예시예요. 실제 입장 범위는 티켓에 적힌 내용을 따라요.',
  tl: { from: 14*60, to: 24*60, rows: ['padang','wharf','barge','downtown','waterside','dbsot'], names: {padang:'Padang',wharf:'Wharf',barge:'Barge',downtown:'Downtown',waterside:'Waterside',dbsot:'DBS Outdoor Theatre'}, trackTag: '<span class="stag f1">F1 <span class="rd">PCCA</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 그랜드스탠드가 없어요.<br>워크어바웃 구역에서 볼 수 있는지 현장 안내를 확인하세요.',
  searchPh: '아티스트, 무대, 관람석, 게이트, 역',
  quick: ['Lana Del Rey','The Killers','CORTIS','Stamford','Padang','City Hall','7번 코너'],
  presets: [
    {d:0,t:'16:20',l:'연습 주행 1 · 10분 전'}, {d:0,t:'19:40',l:'CORTIS 공연 중'},
    {d:1,t:'16:40',l:'스프린트 · 20분 전'}, {d:1,t:'17:12',l:'스프린트 진행 중'},
    {d:2,t:'19:30',l:'결승 · 30분 전'}, {d:2,t:'20:50',l:'결승 진행 중'}
  ],
  demoRange: [12*60, 24*60-1],
  amen: {wc:['wc','화장실'],fnb:['food','식음료'],bar:['bar','바'],water:['drop','물 보급'],aid:['aid','응급 처치'],info:['info','안내 · 분실물'],merch:['shirt','굿즈'],tix:['ticket','티켓 부스'],walk:['eye','워크어바웃 관람 지점'],screen:['screen','대형 스크린']},
  amenLegend: [['wc','화장실'],['food','식음료'],['bar','바'],['drop','물 보급'],['aid','응급 처치'],['info','안내'],['shirt','굿즈'],['ticket','티켓 부스'],['eye','관람 지점'],['screen','대형 스크린']],
  info: {
    title: '싱가포르 그랑프리 서킷 맵',
    sub: '마리나 베이 스트리트 서킷 · 4.927km · 19개 코너 · 결승 62랩 · 반시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-09-27판에서 건물·도로·물가·공원·MRT 출구를 그대로 그렸어요'],
      ['트랙 세션 시간', 'Formula 1 공식 타임테이블 · 싱가포르 시간(SGT · UTC+8) · 바뀔 수 있어요'],
      ['무대 공연', '싱가포르 GP 주최측 2026 라인업 발표 · 바뀔 수 있어요'],
      ['관람석·게이트·구역', '싱가포르 GP 공식 서킷 파크 맵(2026-09-10 기준)을 트랙에 맞춰 실측 지도 위로 옮겼어요. 공식 맵은 축척이 없는 안내도라 트랙에서 먼 곳일수록 오차가 커요. 관람석에서 보이는 구간은 추정치예요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
