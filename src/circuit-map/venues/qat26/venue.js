// 카타르 GP 2026 (루사일 인터내셔널 서킷) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
export default {
  id: 'qat26',
  raceId: 'f1-2026-22-qatargrandprix',
  round: 'R22',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: 51.4475, lat0: 25.4971, kxLat: 25.4905 },
  tz: { off: 3, abbr: 'AST', name: '카타르 시간', utc: 'UTC+3' },
  day0: [2026, 10, 27],
  days: [{d:'11.27',w:'금',en:'FRI'},{d:'11.28',w:'토',en:'SAT'},{d:'11.29',w:'일',en:'SUN'}],
  title: '카타르 그랑프리',
  heroEn: 'Formula 1 Qatar Airways Qatar Grand Prix',
  markup: { aria: '루사일 인터내셔널 서킷 지도', circuit: '루사일 인터내셔널 서킷', dates: '11.27–29' },
  overtake: [1],
  geoBox: [-600, 1900, -600, 2000],
  /* no zone-gated access: Main Grandstand is the only assigned seating, the other grandstands are free seating,
     GA covers Lusail Hill and the Fan Zone, every ticket includes the Fan Zone and the post-race concert */
  zones: null,
  spots: [
    {id:'main',name:'Main Grandstand',zone:null,xy:[245.9,1014.6],R:250,L:414,tags:['start','podium'],desc:'메인 직선에서 피트 박스를 마주 보는 유일한 지정석이에요. 출발선, 피트 개러지와 피트레인, 포디움 세리머니가 보여요.'},
    {id:'north',name:'North Grandstand',zone:null,xy:[93.9,739.1],R:330,L:126,tags:['start','podium'],desc:'Main Grandstand 바로 왼쪽, 1번 코너 쪽 메인 직선 자유석이에요. 출발·피니시 라인과 그리드, 피트레인, 포디움 세리머니가 보여요.'},
    {id:'t2',name:'T2 Grandstand',zone:null,xy:[255.8,451.0],R:240,L:88,tags:[],desc:'2번 코너 안쪽 자유석이에요. 1번 코너를 빠져나오는 차와 3번 코너로 이어지는 구간을 봐요.'},
    {id:'t3',name:'T3 Grandstand',zone:null,xy:[272.1,327.8],R:170,L:93,tags:[],desc:'3번 코너를 내려다보는 자유석이에요.'},
    {id:'t16',name:'T16 Grandstand',zone:null,xy:[666.0,1492.7],R:300,L:98,tags:['stage'],desc:'메인 직선 앞 마지막 16번 코너예요. 빠른 속도에서 브레이크를 밟는 차를 보고, 공연 무대와 가장 가까운 관람석이에요.'},
    /* GA: no outline (the 2026 map draws one Fan Zone & GA area), pin at the 'Lusail Hill' label of the 2026 map; L 0 = no stand block */
    {id:'hill',name:'Lusail Hill',zone:null,xy:[-32.5,266.7],R:300,L:0,tags:['overtake'],desc:'1번 코너의 높은 GA 관람 구역이에요. 지정석이 없고, Fan Zone도 함께 이용할 수 있어요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands, 2026 official track map) */
  standOf: {main:'main',north:'north',t2:'t2',t3:'t3',t16:'t16'},
  extraStands: ['paddockclub','lounge','champions','novikov'],   // hospitality on the 2026 map
  stages: [
    {id:'concert',name:'Concerts Arena',zone:null,xy:[379.1,1505.7],desc:'레이스가 끝난 뒤 공연이 열리는 곳이에요. 모든 티켓에 그날 공연 입장이 포함되고, 2026 라인업은 아직 발표되지 않았어요.'},
    {id:'fzstage',name:'F1 Fanzone Main Stage',short:'Fanzone Main Stage',zone:null,xy:[263.3,1094.0],desc:'Fan Zone 안 무대예요. 위치는 2025 공식 안내도 기준이에요.'}
  ],
  /* entrances A–H of the 2025 official wayfinding map (letters only, no names). 2026 gates are not published */
  gates: [
    {id:'gA',n:'A',name:'',side:null,xy:[416.7,917.4]},
    {id:'gB',n:'B',name:'',side:null,xy:[458.4,1160.3]},
    {id:'gC',n:'C',name:'',side:null,xy:[991.5,1514.6]},
    {id:'gD',n:'D',name:'',side:null,xy:[732.6,1839.6]},
    {id:'gE',n:'E',name:'',side:null,xy:[607.4,1921.6]},
    {id:'gF',n:'F',name:'',side:null,xy:[131.8,1058.0]},
    {id:'gG',n:'G',name:'',side:null,xy:[-53.0,734.4]},
    {id:'gH',n:'H',name:'',side:null,xy:[-159.8,566.0]}
  ],
  /* which stands a gate serves: fan site (oversteer48), no official source */
  gateDesc: g => ({
      A:'서킷 안쪽 패독 쪽 게이트예요. 팬 사이트에 따르면 패독에 들어가는 호스피탈리티 손님 전용이에요. ',
      B:'서킷 안쪽 패독 쪽 게이트예요. 팬 사이트에 따르면 패독에 들어가는 호스피탈리티 손님 전용이에요. ',
      C:'팬 사이트에 따르면 T16 Grandstand 쪽 게이트예요. ', D:'팬 사이트에 따르면 T16 Grandstand 쪽 게이트예요. ', E:'팬 사이트에 따르면 T16 Grandstand 쪽 게이트예요. ',
      F:'팬 사이트에 따르면 Main·North Grandstand 쪽 게이트예요. ', G:'팬 사이트에 따르면 Main·North Grandstand 쪽 게이트예요. ',
      H:'팬 사이트에 따르면 Main·North Grandstand와 T2·T3 Grandstand, Lusail Hill 쪽 게이트예요. '
    }[g.n] || '') + '위치와 글자는 2025 공식 안내도 기준이고, 2026 게이트 정보는 아직 발표되지 않았어요.',
  transit: {
    items: [
    {id:'metro',name:'Metro Shuttle',codes:[],xy:[1025.9,1485.2],note:'Lusail QNB 메트로역과 서킷을 오가는 무료 셔틀이 서는 곳이에요. 역에서 서킷까지는 걸어갈 수 없어요(2025 안내 기준).'},
    {id:'int1',name:'Internal Shuttle',codes:[],xy:[136.1,190.3]},
    {id:'int2',name:'Internal Shuttle',codes:[],xy:[-111.5,525.2]},
    {id:'int3',name:'Internal Shuttle',codes:[],xy:[36.1,747.6]},
    {id:'int4',name:'Internal Shuttle',codes:[],xy:[204.0,1062.4]},
    {id:'int5',name:'Internal Shuttle',codes:[],xy:[549.7,1093.9]},
    {id:'int6',name:'Internal Shuttle',codes:[],xy:[567.6,1723.4]},
    {id:'int7',name:'Internal Shuttle',codes:[],xy:[774.3,1516.4]},
    {id:'int8',name:'Internal Shuttle',codes:[],xy:[957.3,1543.6]}
  ],
    xy: {},
    layer: '셔틀', kicker: '셔틀', short: '셔틀', near: '셔틀과 가까운', suffix: '', aria: ' 셔틀 정류장 ',
    note: '셔틀 정류장 위치는 2025 공식 안내도 기준이에요. 2026 운행 시간과 정류장은 아직 발표되지 않았어요.',
    icon: 'bus'
  },
  village: {
    items: [
    {id:'fanzone',name:'F1 Fan Village',label:'Fan Zone',xy:[318.7,1222.8],desc:'문화 체험, 키즈 구역, 시뮬레이터, 공연, 먹거리와 굿즈가 모인 곳이에요. 모든 티켓으로 들어갈 수 있어요.'}
  ],
    label: '팬 존', desc: ''
  },
  /* landmarks — OpenStreetMap positions (metres); car parks from the 2025 official wayfinding map. r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'피트 빌딩',xy:[309.3,924.7],r:2},
    {t:'카트 트랙',xy:[1013.9,669.8],r:3},
    {t:'Lusail Sports Arena',xy:[1635.9,1805.5],r:2},
    {t:'주차장 A',xy:[-165.3,858.0],r:3},
    {t:'주차장 B',xy:[-4.6,1000.9],r:3},
    {t:'주차장 C',xy:[54.7,1239.7],r:3},
    {t:'장애인 주차장',xy:[164.3,1146.3],r:3}
  ],
  /* schedule (local time AST, as published): [day, start, end, series, English, Korean, note]
     race end: not published — 19:00 start + 120-minute race time limit */
  track: [
    [0,'16:30','17:30','f1','Formula 1 · Practice 1','F1 연습 주행 1',''],
    [0,'20:00','21:00','f1','Formula 1 · Practice 2','F1 연습 주행 2',''],
    [1,'17:30','18:30','f1','Formula 1 · Practice 3','F1 연습 주행 3',''],
    [1,'21:00','22:00','f1','Formula 1 · Qualifying','F1 예선',''],
    [2,'19:00','21:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','57랩 · 끝나는 시각 미발표(최대 2시간 기준)',1]
  ],
  /* stage acts: none published for 2026 */
  acts: [],
  /* stages whose acts have no published times */
  tba: [
    {stage:'fzstage', name:'F1 Fanzone Main Stage', days:'금', acts:['F1 Fan Forum']}
  ],
  quietTitles: [],
  series: {f1:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'main',name:'Main Grandstand',zl:'',zones:null,seat:'main',sub:'메인 직선 · 유일한 지정석'},
    {id:'north',name:'North Grandstand',zl:'',zones:null,seat:'north',sub:'메인 직선 1번 코너 쪽 · 자유석'},
    {id:'t2',name:'T2 Grandstand',zl:'',zones:null,seat:'t2',sub:'2번 코너 안쪽 · 자유석'},
    {id:'t3',name:'T3 Grandstand',zl:'',zones:null,seat:'t3',sub:'3번 코너 · 자유석'},
    {id:'t16',name:'T16 Grandstand',zl:'',zones:null,seat:'t16',sub:'마지막 16번 코너 · 자유석'},
    {id:'ga',name:'General Admission – Lusail Hill (3일권·금요일권)',zl:'',zones:null,seat:'hill',sub:'1번 코너 Lusail Hill과 Fan Zone · 지정석 없음'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 루사일 인터내셔널 서킷 티켓 안내 기준이에요. Main Grandstand만 지정석이고 다른 그랜드스탠드는 자유석이에요. 모든 티켓에 Fan Zone과 그날 레이스 뒤 공연 입장이 포함돼요.',
  tl: { from: 15*60, to: 23*60, rows: [], names: {}, trackTag: '<span class="stag f1">F1</span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>GA 관람 구역은 1번 코너 Lusail Hill에 있어요.',
  searchPh: '관람석, 무대, 공연장, 셔틀',
  quick: ['Lusail Hill','Main Grandstand','T16 Grandstand','Concerts Arena','Metro Shuttle','F1 Fan Forum','1번 코너'],
  presets: [
    {d:0,t:'16:20',l:'연습 주행 1 · 10분 전'}, {d:0,t:'20:30',l:'연습 주행 2 진행 중'},
    {d:1,t:'20:50',l:'예선 · 10분 전'},
    {d:2,t:'18:30',l:'결승 · 30분 전'}, {d:2,t:'19:50',l:'결승 진행 중'}
  ],
  demoRange: [12*60, 24*60-1],
  amen: {wc:['wc','화장실'],food:['food','푸드 코트'],aid:['aid','응급 처치'],info:['info','안내 데스크 · 분실물'],view:['eye','관람 포인트']},
  amenLegend: [['wc','화장실'],['food','푸드 코트'],['aid','응급 처치'],['info','안내 데스크'],['eye','관람 포인트']],
  info: {
    title: '카타르 그랑프리 서킷 맵',
    sub: '루사일 인터내셔널 서킷 · 5.419km · 16개 코너 · 결승 57랩 · 시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 6m 안에서 맞아요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-09-27판에서 건물·도로·풀밭·피트레인을 그대로 그렸어요'],
      ['코너 번호·출발선·결승선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요. 11번 코너 위치와 출발선은 FIA 2025 서킷 지도를 따랐어요'],
      ['트랙 세션 시간', 'Formula 1 공식 타임테이블(2026) · 카타르 시간(AST · UTC+3) · 결승 끝 시각은 발표되지 않아 최대 120분으로 표시해요 · F2 시간은 아직 발표되지 않았어요 · 바뀔 수 있어요'],
      ['무대 공연', '2026 라인업은 아직 발표되지 않았어요 · F1 Fan Forum은 금요일 Fan Zone에서 열려요(시각 미발표) · 바뀔 수 있어요'],
      ['관람석·호스피탈리티·공연장', '루사일 인터내셔널 서킷 2026 공식 트랙 맵(호스피탈리티 안내)을 트랙에 맞춰 실측 지도 위로 옮겼어요. Lusail Hill은 지도의 GA 표기 위치예요. 관람석에서 보이는 구간은 추정치예요'],
      ['게이트·편의시설·셔틀·주차장', '2025 공식 관람 안내도(2025 F1 Qatar Wayfinding Map, gpdestinations.com 게시본) 기준이에요. 2026 안내도는 아직 나오지 않았어요. 게이트가 어느 관람석 쪽인지는 팬 사이트 표기를 따랐어요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
