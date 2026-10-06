// 라스베이거스 GP 2026 (라스베이거스 스트립 서킷) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
/* zones — keys are strings; evt zone keys are 'z'+key. Areas: 2024 LVGP GIS polygons = the pink areas of the 2026 ped-routes map */
const Z = {
  tmobile: {badge:'T-MOBILE ZONE', short:'T-MOBILE', name:'T-Mobile Zone at Sphere'},
  flamingo: {badge:'FLAMINGO ZONE', short:'FLAMINGO', name:'Flamingo Zone'},
  koval: {badge:'KOVAL ZONE', short:'KOVAL', name:'Koval Zone'},
  eharmon: {badge:'EAST HARMON', short:'E.HARMON', name:'East Harmon Zone'},
  wharmon: {badge:'WEST HARMON', short:'W.HARMON', name:'West Harmon Zone'},
  paddock: {badge:'PADDOCK CLUB', short:'PADDOCK', name:'Paddock Club'}
};
export default {
  id: 'lvg26',
  raceId: 'f1-2026-21-lasvegasgrandprix',
  round: 'R21',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: -115.1732, lat0: 36.1255, kxLat: 36.1167 },
  tz: { off: -8, abbr: 'PST', name: '라스베이거스 시간', utc: 'UTC-8' },
  day0: [2026, 10, 19],
  days: [{d:'11.19',w:'목',en:'THU'},{d:'11.20',w:'금',en:'FRI'},{d:'11.21',w:'토',en:'SAT'}],
  title: '라스베이거스 그랑프리',
  heroEn: 'Formula 1 Heineken Las Vegas Grand Prix',
  markup: { aria: '라스베이거스 스트립 서킷 지도', circuit: '라스베이거스 스트립 서킷', dates: '11.19–21' },
  overtake: [5],
  geoBox: [-500, 1700, -500, 2450],
  /* zone-gated tickets: each ticket type enters its own zone (official 2025 wording); 2026 links West Harmon with East Harmon and Koval */
  zones: Z,
  zoneNote: {
    tmobile: 'T-Mobile Zone at Sphere · T-Mobile GA나 T-Mobile 그랜드스탠드 티켓이 있어야 들어갈 수 있어요',
    flamingo: 'Flamingo Zone by Caesars Rewards · Flamingo GA 티켓 구역이에요',
    koval: 'Koval Zone by Heineken · Heineken® Grandstands 티켓 구역이에요. East Harmon·West Harmon 티켓으로도 들어갈 수 있어요',
    eharmon: 'East Harmon Zone by Virgin Hotels Las Vegas · Main·Turn 3 그랜드스탠드 티켓 구역이에요. Koval·West Harmon 티켓으로도 들어갈 수 있어요',
    wharmon: 'West Harmon Zone · Lewis Hamilton Grandstand 티켓 구역이에요. 2026년부터 East Harmon·Koval 구역과 이어져요',
    paddock: 'Paddock Club · 호스피탈리티 티켓 전용 구역이에요'
  },
  /* guide grandstands. No official outline or seat map for 2026: the centre follows the official 2026 ticket text
     (corner / straight / zone), the block is drawn by the core (length L). See NOTES.md */
  spots: [
    {id:'main',name:'Heineken® Silver Main Grandstand',zone:'eharmon',xy:[982.1,1863.3],R:130,L:120,tags:['start'],desc:'레이스가 시작하고 끝나는 출발·피니시 직선, 피트 빌딩 맞은편 좌석이에요. 그리드를 가까이서 봐요.'},
    {id:'t3',name:'Turn 3 Grandstand',zone:'eharmon',xy:[906.7,1635.7],R:120,L:60,tags:[],desc:'3·4번 코너와 Koval 직선이 보여요. 2026년에 3번 코너 서쪽으로 자리를 옮겼어요.'},
    {id:'heineken',name:'Heineken® Grandstands',zone:'koval',xy:[804.6,1521.6],R:130,L:120,tags:[],desc:'4번 코너와 Koval 직선을 따라 놓인 블리처 지정석이에요. 21세 이상은 맥주가 포함돼요.'},
    {id:'tm5',name:'T-Mobile Zone at Sphere Grandstands · Turn 5',zone:'tmobile',xy:[870.1,674.0],R:80,L:60,tags:['overtake','stage'],desc:'T-Mobile 5번 코너(Turn 5G) 좌석이에요. 2단 기어로 도는 오른쪽 급커브로, 추월이 나오는 곳이에요.'},
    {id:'tm79',name:'T-Mobile Zone at Sphere Grandstands · Turns 7–9',zone:'tmobile',xy:[1115.5,426.2],R:130,L:90,tags:['stage'],desc:'7~9번 시케인 좌석이에요. 9번 코너를 나가면 Sphere의 Exosphere 아래로 Sands Ave에 들어서요.'},
    {id:'hamilton',name:'Lewis Hamilton Grandstand',zone:'wharmon',xy:[734.2,1918.7],R:200,L:120,tags:[],desc:'Harmon 직선을 달려와 마지막 코너와 피니시 라인을 앞두고 브레이크를 밟는 구간이 보여요. +44 기념품이 포함돼요.'}
  ],
  /* no official stand outlines (base.json evt.stands is empty) */
  standOf: {},
  extraStands: [],
  stages: [
    {id:'tmstage',name:'T-Mobile Stage',zone:'tmobile',xy:[999.8,572.7],desc:'Sphere의 Exosphere 아래, 5번 코너와 7~9번 시케인을 바라보는 무대예요. 사흘 밤 모두 헤드라이너 공연이 열려요. 정확한 무대 위치는 발표되지 않았어요.'},
    {id:'hkstage',name:'Heineken® Stage',short:'Heineken Stage',zone:'eharmon',xy:[1133.5,1823.5],desc:'East Harmon Zone의 중심 무대예요. 사흘 동안 F1 드라이버 22명의 라이브 Q&A가 열려요. 구역 안 정확한 위치는 발표되지 않아 구역 가운데에 표시했어요.'},
    {id:'afterparty',name:'Sphere · Official F1® Afterparty',short:'Sphere Afterparty',zone:null,xy:[999.8,472.7],desc:'토요일 결승이 끝난 뒤 Sphere 안에서 열리는 공식 애프터파티예요. 별도 티켓이 필요하고, 3일권 레이스 티켓이 있어야 살 수 있어요.'}
  ],
  /* zone entrances = start of the "Ticketed Access Only" routes on the 2026 ped-routes map. No gate names or numbers are
     published: n and name are empty, st = the street on the map, side = the zone the route leads into */
  gates: [
    {id:'g1',n:'',name:'',st:'Sands Ave',side:'tmobile',xy:[818.2,363.2]},
    {id:'g2',n:'',name:'',st:'Manhattan St',side:'tmobile',xy:[1242.3,685.2]},
    {id:'g3',n:'',name:'',st:'LINQ Ln',side:'flamingo',xy:[509.7,898.7]},
    {id:'g4',n:'',name:'',st:'LINQ Ln',side:'flamingo',xy:[506.4,1008.8]},
    {id:'g5',n:'',name:'',st:'E Flamingo Rd',side:'koval',xy:[692.1,1229.0]},
    {id:'g6',n:'',name:'',st:'Audrie St',side:'wharmon',xy:[507.5,1588.3]},
    {id:'g7',n:'',name:'',st:'E Rochelle Ave',side:'eharmon',xy:[1196.6,1522.9]},
    {id:'g8',n:'',name:'',st:'E Harmon Ave',side:'eharmon',xy:[1194.5,1879.1]}
  ],
  gateDesc: g => `${g.st} 쪽 입구예요. 여기서부터는 티켓 소지자만 지나갈 수 있고, ${Z[g.side].name} 쪽으로 이어져요. 위치는 2026 공식 보행 동선 지도 기준이고, 게이트 이름은 발표되지 않았어요.`,
  transit: {
    items: [
    {id:'linq',name:"Harrah's/The LINQ",codes:[],note:'모노레일 F1 안내도 기준 T-Mobile Zone at Sphere와 가장 가까운 역이에요.'},
    {id:'flamingo',name:'Flamingo/Caesars Palace',codes:[],note:'모노레일 F1 안내도 기준 Flamingo Zone과 가장 가까운 역이에요.'},
    {id:'horseshoe',name:'Horseshoe/Paris Las Vegas',codes:[],note:'모노레일 F1 안내도 기준 Koval·East Harmon·West Harmon 구역과 가장 가까운 역이에요.'}
  ],
    xy: {linq:[420.9,740.2],flamingo:[416.1,1029.1],horseshoe:[514.5,1468.5]},   // OSM station nodes
    layer: '모노레일역', kicker: '라스베이거스 모노레일', short: '모노레일', near: '모노레일과 가까운', suffix: '역', aria: ' 모노레일역 ',
    note: '2026 운행 시간은 아직 발표되지 않았어요. 2025년에는 레이스 주간 내내 24시간 운행했어요.',
    icon: 'train'
  },
  village: { items: [], label: '팬 구역', desc: '' },
  /* landmarks — OpenStreetMap positions (metres). r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'Sphere',xy:[999.8,472.7],r:1},
    {t:'Grand Prix Plaza',xy:[1066.9,1678.4],r:1},
    {t:'Fountains of Bellagio',en:'Fountains of Bellagio',xy:[-83.6,1405.3],r:2,w:1},
    {t:'Bellagio',xy:[-342.2,1369.3],r:2},
    {t:'Caesars Palace',xy:[-320.0,981.2],r:2},
    {t:'The Venetian',xy:[347.6,419.2],r:2},
    {t:'Wynn Las Vegas',xy:[701.2,-124.2],r:2},
    {t:'Paris Las Vegas',xy:[230.4,1474.8],r:2},
    {t:'Flamingo',xy:[75.1,1003.3],r:2},
    {t:'Planet Hollywood',xy:[151.8,1707.2],r:3},
    {t:'The Cosmopolitan',xy:[-80.3,1693.8],r:3},
    {t:'The LINQ',xy:[234.3,789.5],r:3},
    {t:"Harrah's",xy:[152.2,630.9],r:3},
    {t:'Horseshoe',xy:[372.7,1329.1],r:3},
    {t:'The Palazzo',xy:[443.1,145.6],r:3},
    {t:'Treasure Island',xy:[119.4,102.0],r:3},
    {t:'Fashion Show Mall',xy:[125.7,-191.2],r:3},
    {t:'Tuscany Suites',xy:[1195.2,1365.0],r:3},
    {t:'The Westin',xy:[681.0,1137.4],r:3}
  ],
  /* schedule (local time PST, as published): [day, start, end, series, English, Korean, note].
     Race end = start + the 2-hour regulation maximum (no end time published). F1 ACADEMY times are TBC (not included). */
  track: [
    [0,'16:30','17:30','f1','Formula 1 · Practice 1','F1 연습 주행 1',''],
    [0,'20:00','21:00','f1','Formula 1 · Practice 2','F1 연습 주행 2',''],
    [1,'16:30','17:30','f1','Formula 1 · Practice 3','F1 연습 주행 3',''],
    [1,'20:00','21:00','f1','Formula 1 · Qualifying','F1 예선',''],
    [2,'20:00','22:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','50랩 · 끝나는 시각 미발표(최대 2시간 기준)',1]
  ],
  /* no set times are published for any stage */
  acts: [],
  tba: [
    {stage:'tmstage', name:'T-Mobile Stage', days:'목·금·토', acts:['Two Friends (목)','Ja Rule (목)','Disclosure DJ set (금)','Gorgon City (금)','Sean Paul (토)','Natasha Bedingfield (토)','Collect 200 (날짜 미발표)','DJ Mandy (날짜 미발표)']},
    {stage:'hkstage', name:'Heineken® Stage', days:'목·금·토', acts:['The Australian Bee Gees Show (목)','PACK Drumline (목)','Super Cr3w (목)','Icona Pop DJ set (금)','Eli & Fur (금)','Now You See Me Live (금)','Disco Dom (토)','LP Giobbi (토)','F1 드라이버 22명 라이브 Q&A (목~토)']},
    {stage:'afterparty', name:'Official F1® Afterparty', days:'토 · 결승 뒤', acts:['Backstreet Boys']}
  ],
  quietTitles: [],
  series: {f1:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'main',name:'Heineken® Silver Main Grandstand',badge:'EAST HARMON',zl:'E.HARMON',zones:['eharmon','koval'],seat:'main',sub:'출발·피니시 직선 지정석 · East Harmon·Koval 구역 팬 활동'},
    {id:'t3',name:'Turn 3 Grandstand',badge:'EAST HARMON',zl:'E.HARMON',zones:['eharmon','koval'],seat:'t3',sub:'3·4번 코너 지정석 · East Harmon·Koval 구역 팬 활동'},
    {id:'heineken',name:'Heineken® Grandstands',badge:'KOVAL ZONE',zl:'KOVAL',zones:['koval','eharmon'],seat:'heineken',sub:'4번 코너·Koval 직선 블리처 지정석 · 맥주 포함(21세 이상)'},
    {id:'tm5',name:'T-Mobile Zone at Sphere Grandstands · Turn 5',badge:'T-MOBILE ZONE',zl:'T-MOBILE',zones:['tmobile'],seat:'tm5',sub:'5번 코너 지정석 · T-Mobile Stage 포함'},
    {id:'tm79',name:'T-Mobile Zone at Sphere Grandstands · Turns 7–9',badge:'T-MOBILE ZONE',zl:'T-MOBILE',zones:['tmobile'],seat:'tm79',sub:'7~9번 시케인 지정석 · T-Mobile Stage 포함'},
    {id:'hamilton',name:'Lewis Hamilton Grandstand',badge:'WEST HARMON',zl:'W.HARMON',zones:['wharmon','eharmon','koval'],seat:'hamilton',sub:'Harmon 직선·마지막 코너 지정석 · East Harmon·Koval 구역과 연결'},
    {id:'tmga',name:'General Admission · T-Mobile Zone at Sphere',badge:'T-MOBILE ZONE',zl:'T-MOBILE',zones:['tmobile'],seat:null,sub:'5~9번 코너 스탠딩 · 선착순 · 지정석 없음'},
    {id:'flga',name:'Flamingo General Admission (3일권·1일권)',badge:'FLAMINGO ZONE',zl:'FLAMINGO',zones:['flamingo'],seat:null,sub:'Flamingo Zone 스탠딩 관람 · 선착순 · 지정석 없음'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '들어갈 수 있는 구역과 내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 F1 공식 티켓 안내 기준이에요. 티켓마다 들어갈 수 있는 구역이 정해져 있고, 실제 입장 범위는 티켓에 적힌 내용을 따라요. 구역 경계는 2024 공식 GIS 구역도(2026 보행 동선 지도와 같은 범위) 기준이에요. Flamingo Zone 범위는 2024 North Koval 구역을 바탕으로 한 추정이에요.',
  tl: { from: 15*60, to: 24*60, rows: [], names: {}, trackTag: '<span class="stag f1">F1</span>' },
  turnEmpty: '이 코너 가까이에 표시된 그랜드스탠드가 없어요.<br>GA 구역에서 볼 수 있는지 현장 안내를 확인하세요.',
  searchPh: '아티스트, 무대, 관람석, 게이트, 모노레일',
  quick: ['Sean Paul','Disclosure','Icona Pop','Backstreet Boys','T-Mobile Stage','Lewis Hamilton Grandstand','Horseshoe/Paris Las Vegas','14번 코너'],
  presets: [
    {d:0,t:'16:20',l:'연습 주행 1 · 10분 전'}, {d:0,t:'20:30',l:'연습 주행 2 진행 중'},
    {d:1,t:'19:50',l:'예선 · 10분 전'},
    {d:2,t:'19:30',l:'결승 · 30분 전'}, {d:2,t:'20:40',l:'결승 진행 중'}
  ],
  demoRange: [14*60, 24*60-1],
  amen: {tbridge:['walk','임시 보행 육교'],xbridge:['walk','보행 육교']},
  amenLegend: [['walk','트랙을 건너는 보행 육교']],
  info: {
    title: '라스베이거스 그랑프리 서킷 맵',
    sub: '라스베이거스 스트립 서킷 · 6.201km · 17개 코너 · 결승 50랩 · 반시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. 2026 공식 보행 동선 지도(항공사진)와 5m 안팎에서 맞아요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-09-27판에서 건물·도로·물가·풀밭·피트레인을 그대로 그렸어요'],
      ['코너 번호·출발선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요. 코너 위치는 2026 공식 보행 동선 지도와 실측 트랙의 꼭짓점에 맞췄어요'],
      ['트랙 세션 시간', 'Formula 1 공식 일정(2026) · 라스베이거스 시간(PST · UTC-8) · 결승 종료 시각은 발표되지 않아 최대 2시간으로 표시해요 · F1 ACADEMY 시간은 미정 · 바뀔 수 있어요'],
      ['무대 공연', 'LVGP 2026 라인업 발표(T-Mobile Stage 8월 6일, Heineken® Stage 9월 10일)·Sphere Entertainment(7월 9일) · 공연 시각은 모두 미발표 · 바뀔 수 있어요'],
      ['구역·게이트·육교', 'LVGP·Kimley-Horn 2026 공식 보행 동선 지도(Hot Track Ticketed Pedestrian Routes, 2026-08-28)를 실측 지도 위로 옮겼어요. 구역 경계는 같은 범위의 2024 LVGP 공식 GIS 구역도 기준이고, 구역 이름은 2026 티켓 안내를 따라요. Flamingo Zone 범위는 2024 North Koval 구역을 바탕으로 한 추정이에요'],
      ['코너 설명·추월 지점', 'LVGP 2024 코너별 안내 기준이에요'],
      ['관람석·무대 위치', '2026 공식 관람 안내도가 없어, 2026 티켓 안내 문구(코너·직선·구역)에 맞춰 놓은 위치예요. 관람석 모양과 길이, 무대의 정확한 자리는 발표되지 않았어요. 관람석에서 보이는 구간은 추정치예요'],
      ['모노레일', '역 위치는 OpenStreetMap · 가까운 구역은 라스베이거스 모노레일 F1 안내도(2026년 5월 게시, 안내 문구는 2025 페이지) 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
