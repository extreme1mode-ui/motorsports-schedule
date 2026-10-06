// 미국 GP 2026 (서킷 오브 디 아메리카스, 오스틴) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
export default {
  id: 'usa26',
  raceId: 'f1-2026-18-unitedstatesgrandprix',
  round: 'R18',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: -97.6435, lat0: 30.1395, kxLat: 30.135 },
  tz: { off: -5, abbr: 'CDT', name: '오스틴 시간', utc: 'UTC-5' },
  day0: [2026, 9, 22],
  days: [{d:'10.22',w:'목',en:'THU'},{d:'10.23',w:'금',en:'FRI'},{d:'10.24',w:'토',en:'SAT'},{d:'10.25',w:'일',en:'SUN'}],
  title: '미국 그랑프리',
  heroEn: 'Formula 1 MSC Cruises United States Grand Prix',
  markup: { aria: '오스틴 서킷 오브 디 아메리카스 지도', circuit: '서킷 오브 디 아메리카스', dates: '10.22–25' },
  overtake: [1,12],
  geoBox: [-700, 2500, -1000, 1700],
  /* no zone-gated access at COTA: GA covers all grass areas, grandstand tickets are reserved seats */
  zones: null,
  spots: [
    {id:'main',name:'Main Grandstand',zone:null,xy:[208,768],R:250,L:343,tags:['start'],desc:'출발·피니시 라인 바로 앞 메인 직선 좌석이에요. 4개 층 가운데 Mezzanine 층에 지붕이 있어요.'},
    {id:'t1',name:'Turn 1 Grandstand',zone:null,xy:[640,1121],R:480,L:51,tags:['overtake','start'],desc:'133피트 오르막 끝의 1번 코너예요. 메인 직선과 피트 출구, 1~3번 코너가 보여요.'},
    {id:'t4',name:'Turn 4 Grandstand',zone:null,xy:[922,594],R:160,L:156,tags:[],desc:'3번 코너로 내려오는 구간과 4·5번 코너의 빠른 좌우 연속 구간을 봐요. 위층(Upper)에는 지붕이 있어요.'},
    {id:'t9',name:'Turn 9 Bleachers',zone:null,xy:[1518,389],R:505,L:119,tags:['stage'],desc:'6·7·8번 코너와 11번 헤어핀, 트랙에서 가장 빠른 구간이 보여요. 레이스가 끝나면 Super Stage 잔디 구역으로 가장 빨리 갈 수 있어요.'},
    {id:'t12',name:'Turn 12 Bleachers',zone:null,xy:[724,184],R:150,L:120,tags:['overtake'],desc:'백 스트레이트 끝 12번 코너예요. 시속 200마일이 넘는 속도에서 브레이크를 밟는 구간이에요.'},
    {id:'t15',name:'Turn 15 Grandstand',zone:null,xy:[528,376],R:220,L:245,tags:['overtake','landmark'],desc:'12~16번 코너 스타디움 구간의 까다로운 코너들을 봐요. 25번 섹션이 COTA Tower와 가장 가까워요.'},
    {id:'t19',name:'Turn 19 Grandstand',zone:null,xy:[309,423],R:340,L:59,tags:['landmark'],desc:'18·19·20번 코너가 잘 보이고, Grand Plaza에서 몇 걸음 거리예요. 위층(Upper)에는 지붕이 있어요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands, 2026 grandstand map) */
  standOf: {main:'main',t1:'t1',t4:'t4',t9:'t9',t12:'t12',t15:'t15',t19:'t19'},
  extraStands: [],
  stages: [
    {id:'superstage',name:'Germania Insurance Super Stage',short:'Super Stage',zone:null,xy:[1415,63],desc:'금·토 헤드라이너 공연장이에요. 모든 레이스 티켓에 잔디 구역 입장이 포함되고, 공연은 그날 트랙 일정이 끝나고 60~90분 뒤에 시작해요.'},
    {id:'amph',name:'Germania Insurance Amphitheater',short:'Amphitheater',zone:null,xy:[505,534],desc:'COTA Tower 바로 아래 야외 공연장이에요. 일요일 결승이 끝난 뒤 공연이 열려요.'},
    {id:'ranch',name:'The Ranch',zone:null,xy:[1134,260],desc:'인필드 Crossover 옆 빌리지 무대예요. 공연은 시작 시각만 발표됐어요.'},
    {id:'cantina',name:'La Cantina',zone:null,xy:[1270,452],desc:'빌리지 무대예요. 공연은 시작 시각만 발표됐어요.'},
    {id:'lonestar',name:'Lonestar Land',zone:null,xy:[702,587],desc:'16번 코너 Blue Pedestrian Bridge 근처의 빌리지예요(2025 안내 기준).'}
  ],
  /* entrance gates: the 6 'EG' icons of the 2025 spectator map. No official map prints gate names or numbers:
     'Grand Plaza' is official wording (2026), the others are fan-site names (nameSrc 'secondary'), g4 has none. */
  gates: [
    {id:'g1',n:'',name:'Main Grandstand',side:null,xy:[289,1017],nameSrc:'secondary'},
    {id:'g2',n:'',name:'Turn 1',side:null,xy:[682,1084],nameSrc:'secondary'},
    {id:'g3',n:'',name:'Turn 3',side:null,xy:[855,787],nameSrc:'secondary'},
    {id:'g4',n:'',name:'',side:null,xy:[1132,574],nameSrc:null},
    {id:'g5',n:'',name:'Turn 11',side:null,xy:[2063,-34],nameSrc:'secondary'},
    {id:'g6',n:'',name:'Grand Plaza',side:null,xy:[310,140],nameSrc:'official'}
  ],
  gateDesc: g => (g.id==='g6' ? '목요일(Grand PrixView Thursday)에는 모두 Grand Plaza 게이트로 들어가요. ' : '')
    + (g.nameSrc==='secondary' ? '게이트 이름은 공식 발표가 없어 팬 사이트 표기를 따랐어요. ' : !g.name ? '게이트 이름은 발표되지 않았어요. ' : '')
    + '위치는 2025 관람 안내도 기준이에요. 가방은 12×12×20인치까지만 들고 들어갈 수 있어요.',
  transit: {
    items: [
    {id:'dtshuttle',name:'Downtown Shuttle',codes:[],xy:[36,337],note:'Waterloo Park(다운타운)에서 출발해 COTA Blvd에 내려요. Grand Plaza 게이트와 가까워요. 결승 날(일)에는 COTA로 가는 마지막 셔틀이 오후 2시에 출발해요.'},
    {id:'expo',name:'Expo Center Shuttle',codes:[],xy:[-214,-472],note:'Travis County Expo Center(7311 Decker Lane)에서 출발해요. 결승 날(일)에는 COTA로 가는 마지막 셔틀이 오후 2시에 출발해요.'},
    {id:'ride',name:'Rideshare Lot',codes:[],xy:[-17,-807],note:'Uber·Lyft 같은 차량 호출은 McAngus Lot에서 타고 내려요. Grand Plaza 근처 Ticketmaster 박스오피스까지 무료 트램이 다녀요.'},
    {id:'pnr',name:'Park N Ride',codes:[],xy:[1915,-27],note:'Park N Ride 셔틀이 내리는 곳이에요. 타는 곳은 아직 발표되지 않았어요.'},
    {id:'tram1',name:'COTA Tram',codes:[],xy:[344,232]},
    {id:'tram2',name:'COTA Tram',codes:[],xy:[325,999]},
    {id:'tram3',name:'COTA Tram',codes:[],xy:[660,1113]},
    {id:'tram4',name:'COTA Tram',codes:[],xy:[961,701]},
    {id:'tram5',name:'COTA Tram',codes:[],xy:[1232,546]},
    {id:'tram6',name:'COTA Tram',codes:[],xy:[1314,0]},
    {id:'tram7',name:'COTA Tram',codes:[],xy:[2066,-105]}
  ],
    xy: {},
    layer: '셔틀·트램', kicker: '셔틀·트램', short: '셔틀·트램', near: '셔틀과 가까운', suffix: '', aria: ' 셔틀·트램 정류장 ',
    note: '경기장 안을 오가는 COTA Tram 정류장이에요. 위치는 2025 관람 안내도 기준이고, 2026 F1 트램 노선은 아직 발표되지 않았어요.',
    icon: 'bus'
  },
  village: {
    items: [
    {id:'plaza',name:'Grand Plaza',label:'Grand Plaza',xy:[366,306],desc:'메인 광장이에요. 응급 처치소, 물 보급소, 수유실이 있어요.'},
    {id:'fanzone',name:'F1 Fan Zone',label:'F1 Fan Zone',xy:[322,353],desc:'Turn 12·Turn 15 관람석과 붙어 있는 팬 존이에요. 목요일에도 열려요.'}
  ],
    label: '팬 구역', desc: ''
  },
  /* landmarks — OpenStreetMap positions (metres); COTA Tower from the 2026 grandstand map. r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'COTA Tower',xy:[533,578],r:1},
    {t:'COTALAND',xy:[91,416],r:2},
    {t:'Red Pedestrian Bridge',xy:[784,672],r:3},
    {t:'Blue Pedestrian Bridge',xy:[631,505],r:3},
    {t:'Lot A',xy:[6,788],r:2},
    {t:'Lot C',xy:[330,6],r:2},
    {t:'Lot D',xy:[442,142],r:3},
    {t:'Lot E',xy:[924,44],r:3},
    {t:'Lot F',xy:[844,-279],r:2},
    {t:'Lot G',xy:[1312,-254],r:3},
    {t:'Lot H',xy:[1357,-15],r:3},
    {t:'Lot J',xy:[1699,-240],r:3},
    {t:'Lot K',xy:[1590,-295],r:3},
    {t:'Lot L',xy:[2141,5],r:2},
    {t:'Lot M',xy:[2147,349],r:3},
    {t:'Lot N',xy:[1014,813],r:2},
    {t:'Lot T',xy:[803,1536],r:2},
    {t:'Jenkins and White Pond',en:'Jenkins and White Pond',xy:[499,-147],r:3,w:1}
  ],
  /* schedule (local time CDT, as published): [day, start, end, series, English, Korean, note] */
  track: [
    [0,'12:25','13:05','f1a','F1 ACADEMY · Free Practice','F1 아카데미 연습',''],
    [0,'16:30','17:00','f1a','F1 ACADEMY · Qualifying','F1 아카데미 예선',''],
    [1,'09:45','10:10','mh','Masters Historic · Practice Session','마스터스 히스토릭 연습',''],
    [1,'12:30','13:30','f1','Formula 1 · First Practice Session','F1 연습 주행 1',''],
    [1,'14:00','14:30','pccna','Porsche Carrera Cup North America · Practice Session','포르쉐 카레라컵 북미 연습',''],
    [1,'14:55','15:20','mh','Masters Historic · Qualifying Session','마스터스 히스토릭 예선',''],
    [1,'16:00','17:00','f1','Formula 1 · Second Practice Session','F1 연습 주행 2',''],
    [1,'17:50','18:25','f1a','F1 ACADEMY · Opening Race','F1 아카데미 오프닝 레이스','13랩 또는 최대 30분 +1랩'],
    [2,'09:10','09:40','pccna','Porsche Carrera Cup North America · Qualifying Session','포르쉐 카레라컵 북미 예선',''],
    [2,'10:10','10:40','mh','Masters Historic · First Race','마스터스 히스토릭 레이스 1','25분'],
    [2,'12:30','13:30','f1','Formula 1 · Third Practice Session','F1 연습 주행 3',''],
    [2,'14:45','15:20','f1a','F1 ACADEMY · Reverse Grid Race','F1 아카데미 리버스 그리드 레이스','13랩 또는 최대 30분 +1랩'],
    [2,'16:00','17:00','f1','Formula 1 · Qualifying Session','F1 예선',''],
    [2,'17:55','18:35','pccna','Porsche Carrera Cup North America · First Race','포르쉐 카레라컵 북미 레이스 1','35분'],
    [3,'09:25','09:55','mh','Masters Historic · Second Race','마스터스 히스토릭 레이스 2','25분'],
    [3,'10:40','11:10','f1a','F1 ACADEMY · Feature Race','F1 아카데미 피처 레이스','13랩 또는 최대 30분 +1랩'],
    [3,'11:50','12:30','pccna','Porsche Carrera Cup North America · Second Race','포르쉐 카레라컵 북미 레이스 2','35분'],
    [3,'13:00','13:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [3,'14:44','14:46','cer','National Anthem','국가 연주',''],
    [3,'15:00','17:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','56랩 또는 120분']
  ],
  /* stage acts: [day, stage, artist, start, end | null (only the start time is published)] */
  acts: [
    [1,'ranch','BARTLY','10:15',null],[1,'cantina','Mariachi Voz de Pasión','10:15',null],
    [1,'ranch','Restos','11:30',null],[1,'cantina','Grupo Morros','11:30',null],
    [1,'ranch','Jennifer Foster & the Audacity','14:30',null],[1,'cantina','Los Alcos','14:30',null],
    [2,'ranch','Monica Valli','10:30',null],[2,'cantina','Midnight Navy','10:30',null],
    [2,'ranch','Mayeux & Broussard','13:45',null],[2,'cantina','Andrea Daniela','13:45',null],
    [2,'ranch','Next of Kin','17:15',null],[2,'cantina','Carrie Rodriguez','17:15',null],
    [3,'ranch','LeTrainiump','10:00',null],[3,'cantina','lluvii','10:00',null],
    [3,'ranch','Moving Panoramas','12:30',null],[3,'cantina','SANA SANA MUSICA','12:30',null],
    [3,'ranch','Nakia & the Never Not Now','13:45',null],[3,'cantina','Gina Chavez','13:45',null]
  ],
  /* stages whose acts have no published times */
  tba: [
    {stage:'superstage', name:'Germania Insurance Super Stage', days:'금·토', acts:['Maroon 5 (금)','Post Malone (토)']},
    {stage:'amph', name:'Germania Insurance Amphitheater', days:'일 · 결승 뒤', acts:['Alesso']},
    {stage:'cantina', name:'La Cantina', days:'날짜 미발표', acts:['DJ Raquiqui']},
    {stage:'lonestar', name:'Lonestar Land', days:'날짜 미발표', acts:['DJ Squibs']}
  ],
  quietTitles: ['국가 연주'],
  series: {f1:{code:'F1', cls:'f1'}, f1a:{code:'F1 ACADEMY', cls:'', noRound:true}, pccna:{code:'PCCNA', cls:'', noRound:true}, mh:{code:'MASTERS', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'main',name:'Main Grandstand',zl:'',zones:null,seat:'main',sub:'출발·피니시 직선 지정석'},
    {id:'t1',name:'Turn 1 Grandstand',zl:'',zones:null,seat:'t1',sub:'1번 코너 지정석'},
    {id:'t4',name:'Turn 4 Grandstand',zl:'',zones:null,seat:'t4',sub:'3~5번 코너 지정석 · Williams 패키지는 1·2섹션'},
    {id:'t9',name:'Turn 9 Bleachers',zl:'',zones:null,seat:'t9',sub:'9번 코너 블리처 지정석'},
    {id:'t12',name:'Turn 12 Bleachers',zl:'',zones:null,seat:'t12',sub:'12번 코너 블리처 지정석'},
    {id:'t15',name:'Turn 15 Grandstand',zl:'',zones:null,seat:'t15',sub:'스타디움 구간 지정석'},
    {id:'t19',name:'Turn 19 Grandstand',zl:'',zones:null,seat:'t19',sub:'18~20번 코너 지정석'},
    {id:'ga',name:'General Admission (3일권·1일권)',zl:'',zones:null,seat:null,sub:'서킷 둘레 잔디 구역 자유 관람 · 지정석 없음'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 COTA 티켓 안내 기준이에요. GA는 서킷 둘레 잔디 구역 어디서나 볼 수 있고, 그랜드스탠드는 지정석이에요. 모든 레이스 티켓에 Super Stage 공연 입장이 포함돼요.',
  tl: { from: 9*60, to: 19*60, rows: ['ranch','cantina'], names: {ranch:'The Ranch',cantina:'La Cantina'}, trackTag: '<span class="stag f1">F1 <span class="rd">외 3</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 그랜드스탠드가 없어요.<br>GA 관람 구역에서 볼 수 있는지 현장 안내를 확인하세요.',
  searchPh: '아티스트, 무대, 관람석, 게이트, 셔틀',
  quick: ['Maroon 5','Post Malone','Alesso','The Ranch','Turn 12','Grand Plaza','COTA Tram','1번 코너'],
  presets: [
    {d:0,t:'12:15',l:'F1 아카데미 연습 · 10분 전'}, {d:1,t:'12:20',l:'연습 주행 1 · 10분 전'},
    {d:2,t:'13:45',l:'Mayeux & Broussard 공연 시작'}, {d:2,t:'15:50',l:'예선 · 10분 전'},
    {d:3,t:'14:30',l:'결승 · 30분 전'}, {d:3,t:'15:50',l:'결승 진행 중'}
  ],
  demoRange: [8*60, 24*60-1],
  amen: {wc:['wc','화장실'],fnb:['food','식음료'],bar:['bar','바'],aid:['aid','응급 처치'],info:['info','게스트 서비스 · 분실물'],merch:['shirt','F1 굿즈'],tix:['ticket','티켓 부스'],screen:['screen','대형 스크린'],walk:['eye','GA 관람 구역'],ada:['eye','ADA GA 관람 구역']},
  amenLegend: [['wc','화장실'],['food','식음료'],['bar','바'],['aid','응급 처치'],['info','게스트 서비스'],['shirt','굿즈'],['ticket','티켓 부스'],['screen','대형 스크린'],['eye','GA 관람 구역']],
  info: {
    title: '미국 그랑프리 서킷 맵',
    sub: '서킷 오브 디 아메리카스 · 5.513km · 20개 코너 · 결승 56랩 · 반시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 3m 안에서 맞아요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-09-27판에서 건물·도로·물가·풀밭·피트레인을 그대로 그렸어요'],
      ['코너 번호·출발선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요'],
      ['트랙 세션 시간', 'Formula 1 공식 타임테이블(2026)과 F1 ACADEMY 공식 일정 · 오스틴 시간(CDT · UTC-5) · 바뀔 수 있어요'],
      ['무대 공연', 'COTA 2026 라인업 발표 · The Ranch·La Cantina는 시작 시각만, 헤드라이너와 DJ는 시각 미발표 · 바뀔 수 있어요'],
      ['관람석·GA 구역', 'COTA 2026 그랜드스탠드 지도와 GA 좌석 지도를 트랙에 맞춰 실측 지도 위로 옮겼어요. 공식 맵은 축척이 없는 안내도라 트랙에서 먼 곳일수록 오차가 커요. 관람석에서 보이는 구간은 추정치예요. 관람석 설명은 COTA 티켓 안내와 F1 공식 티켓 판매처(tickets.formula1.com) 문구를 따랐고, ADA 관람 지점 2곳은 2025 관람 안내도 기준이에요'],
      ['Super Stage', 'COTA 2026 Super Stage 지도 기준이에요'],
      ['게이트·편의시설·빌리지 무대', '2025 관람 안내도(2025 USGP spectator map PDF, gpdestinations.com 게시본) 기준이에요. 2026 안내도는 아직 나오지 않았어요. 게이트 이름은 공식 지도에 없어 Grand Plaza 말고는 팬 사이트 표기를 따랐어요'],
      ['셔틀·트램', '셔틀·차량 호출 위치는 COTA 2026 주차 지도, 트램 정류장은 2025 관람 안내도 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
