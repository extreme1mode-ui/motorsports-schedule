// 벨기에 GP 2026 (스파-프랑코르샹 서킷) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.

/* zones — keys are strings; evt zone keys are 'z'+key.
   2026 access rule (promoter FAQ): "Your grandstand ticket gives you access to your grandstand only, and to the seat you've
   been allocated. However, each grandstand ticket also gives access to the entire Bronze zone." Bronze = general admission.
   So every guide grandstand is its own zone (badge = ticket tier), and 'bronze' is the shared area (the brown Bronze Areas 1–6
   of the 2026 wayfinding map = evt zone 'zbronze'). The 2026 map draws no separate area for 'Bronze area - Bruxelles'. */
const Z = {
  bronze: {badge:'BRONZE', short:'BRONZE', name:'Bronze area'},
  g1: {badge:'GOLD', short:'G1', name:'Gold 1 : Pit'},
  g2: {badge:'GOLD', short:'G2', name:'Gold 2 : GP2'},
  g3: {badge:'GOLD', short:'G3', name:'Gold 3 : Eau-Rouge'},
  g4: {badge:'GOLD', short:'G4', name:'Gold 4 : Eau-Rouge All-In'},
  g5: {badge:'GOLD', short:'G5', name:'Gold 5 : Eau Rouge'},
  g6: {badge:'GOLD', short:'G6', name:'Gold 6 : Chicane'},
  g7: {badge:'GOLD', short:'G7', name:'Gold 7 : Source'},
  g7b: {badge:'GOLD', short:'G7 BIS', name:'Gold 7 Bis : Source'},
  g7t: {badge:'GOLD', short:'G7 TER', name:'Gold 7 ter : Endurance'},
  g8: {badge:'GOLD', short:'G8', name:'Gold 8 : Source - START'},
  g9: {badge:'GOLD', short:'G9', name:'Gold 9 : Pole Position'},
  g9b: {badge:'GOLD', short:'G9 BIS', name:'Gold 9 Bis : Pole Position'},
  g11: {badge:'GOLD', short:'G11', name:'Gold 11 Premium : Chicane'},
  s1: {badge:'SILVER', short:'S1', name:'Silver 1 : Francorchamps'},
  s3: {badge:'SILVER', short:'S3', name:'Silver 3 : Double Gauche'},
  s4: {badge:'SILVER', short:'S4', name:'Silver 4 : Bruxelles'},
  s5: {badge:'SILVER', short:'S5', name:'Silver 5'},
  s6: {badge:'SILVER', short:'S6', name:'Silver 6 & Pitlane Walk'},
  s7: {badge:'SILVER', short:'S7', name:'Silver 7 All-In'},
  fzgs: {badge:'SPECIAL', short:'FANZONE', name:'Fanzone Grandstand'},
  fags: {badge:'SPECIAL', short:'FAN AREA', name:'Fan Area Grandstand: Double Gauche'},
  c1: {badge:'SPECIAL', short:'C1', name:'Combes Grandstand - 1'},
  c2: {badge:'SPECIAL', short:'C2', name:'Combes Grandstand - 2'},
  c3: {badge:'SPECIAL', short:'C3', name:'Combes Grandstand - 3'},
  c4: {badge:'SPECIAL', short:'C4', name:'Combes Grandstand - 4'},
  speed: {badge:'SPECIAL', short:'SPEED CORNER', name:'Speed Corner'},
  a1727: {badge:'SPECIAL', short:'17/27', name:'Area 17-27 Blanchimont'},
  prms: {badge:'PRM', short:'PMR SOURCE', name:'PRM - Source'},
  prmc: {badge:'PRM', short:'PMR CHICANE', name:'PRM - Chicane'}
};
const SEATED = Object.keys(Z).filter(k => k!=='bronze');

export default {
  id: 'bel26',
  raceId: 'f1-2026-10-belgiangrandprix',
  round: 'R10',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: 5.9596, lat0: 50.4462, kxLat: 50.4347 },
  tz: { off: 2, abbr: 'CEST', name: '벨기에 시간', utc: 'UTC+2' },
  day0: [2026, 6, 17],
  days: [{d:'07.17',w:'금',en:'FRI'},{d:'07.18',w:'토',en:'SAT'},{d:'07.19',w:'일',en:'SUN'}],
  title: '벨기에 그랑프리',
  heroEn: 'Formula 1 Moët & Chandon Belgian Grand Prix',
  markup: { aria: '스파-프랑코르샹 서킷 지도', circuit: '스파-프랑코르샹 서킷', dates: '07.17–19' },
  /* no official source calls a corner an overtaking spot (research §9) — see NOTES.md */
  overtake: [],
  geoBox: [-500, 1800, -500, 2550],   // measured track bbox (x 0…1273, y -2…2048 m) + ~500 m
  /* zone-gated access: own grandstand + the whole Bronze zone (2026 FAQ) */
  zones: Z,
  zoneNote: Object.assign({
    bronze: 'Bronze area · 모든 티켓으로 들어갈 수 있어요. 그랜드스탠드 티켓에도 Bronze 구역 입장이 포함돼요'
  }, Object.fromEntries(SEATED.map(k => [k, `${Z[k].name} · 이 관람석 티켓이 있어야 들어갈 수 있어요. 같은 티켓으로 Bronze 구역에도 들어가요`]))),
  /* guide grandstands = the 2026 public grandstand products (promoter zone list). Position = stand outline of the 2026 wayfinding
     map (standOf). R tuned to the official view text (NOTES.md). desc: 2026 product pages, else the 2025 "Where to sit" article;
     roof: 2026 FAQ (conflicts left out) */
  spots: [
    {id:'g1',name:'Gold 1 : Pit',zone:'g1',R:240,L:150,tags:['start'],desc:'피트레인이 잘 보이는 자리예요. 그리드와 출발, 시케인을 나와 La Source로 브레이크를 밟는 구간까지 보여요. 지붕이 있어요.'},
    {id:'g2',name:'Gold 2 : GP2',zone:'g2',R:370,L:120,tags:[],desc:'La Source부터 Raidillon까지 보이고, 패독과 F2·F3 개러지도 보여요. 지붕이 있어요.'},
    {id:'g3',name:'Gold 3 : Eau-Rouge',zone:'g3',R:240,L:120,tags:[],desc:'Raidillon 꼭대기에 있는 관람석이에요. La Source 출구부터 Raidillon 정상까지 보여요. 지붕이 있어요.'},
    {id:'g4',name:'Gold 4 : Eau-Rouge All-In',zone:'g4',R:190,L:100,tags:[],desc:'Raidillon으로 올라가는 오르막이 보여요. 음식과 음료가 포함된 All-In 좌석이고, 지붕은 없어요.'},
    {id:'g5',name:'Gold 5 : Eau Rouge',zone:'g5',R:120,L:80,tags:[],desc:'Eau Rouge 구간 좌석이에요. 지붕은 없어요.'},
    {id:'g6',name:'Gold 6 : Chicane',zone:'g6',R:100,L:120,tags:[],desc:'시케인 한가운데 있는 관람석이에요. 감속 구간과 피트 입구가 보여요. 지붕이 있어요.'},
    {id:'g7',name:'Gold 7 : Source',zone:'g7',R:150,L:100,tags:[],desc:'La Source 코너 출구 쪽 관람석이에요. 지붕이 있어요.'},
    {id:'g7b',name:'Gold 7 Bis : Source',zone:'g7b',R:150,L:80,tags:[],desc:'La Source 코너가 보이는 관람석이에요. 지붕은 없어요.'},
    {id:'g7t',name:'Gold 7 ter : Endurance',zone:'g7t',R:200,L:100,tags:[],desc:'La Source 코너에 있는 관람석이에요. La Source와 Eau Rouge·Raidillon으로 내려가는 구간, 피트 출구가 보여요. 지붕은 없어요.'},
    {id:'g8',name:'Gold 8 : Source - START',zone:'g8',R:340,L:120,tags:['start'],desc:'출발 직선과 La Source 코너가 정면으로 보여요. 지붕이 있어요.'},
    {id:'g9',name:'Gold 9 : Pole Position',zone:'g9',R:210,L:120,tags:['start'],desc:'F1 스타팅 그리드와 피트레인, La Source 코너 입구가 보여요. 지붕이 있어요.'},
    {id:'g9b',name:'Gold 9 Bis : Pole Position',zone:'g9b',R:270,L:80,tags:['start'],desc:'Gold 9를 이어 붙인 관람석이에요. 지붕은 없어요.'},
    {id:'g11',name:'Gold 11 Premium : Chicane',zone:'g11',R:150,L:100,tags:[],desc:'시케인 출구 쪽 관람석이에요. 마지막 두 코너와 피트 입구가 보여요. 지붕이 있어요.'},
    {id:'s1',name:'Silver 1 : Francorchamps',zone:'s1',R:390,L:120,tags:[],desc:'La Source 코너를 나와 Eau Rouge까지 길게 가속하는 구간과 F1 피트 출구가 보여요. 지붕은 없어요.'},
    {id:'fzgs',name:'Fanzone Grandstand',zone:'fzgs',R:200,L:100,tags:[],desc:'Raidillon 아래, Eau Rouge 바로 앞에 있는 관람석이에요. 지붕은 없어요.'},
    {id:'s3',name:'Silver 3 : Double Gauche',zone:'s3',R:190,L:150,tags:[],desc:'Pouhon 더블 레프트에 있는 관람석이에요. 차가 오래 보이는 관람석 가운데 하나예요.'},
    {id:'s4',name:'Silver 4 : Bruxelles',zone:'s4',R:200,L:120,tags:[],desc:'서킷에서 가장 높은 곳, Bruxelles 코너에 있는 관람석이에요. 지붕이 있어요.'},
    {id:'s5',name:'Silver 5',zone:'s5',R:270,L:100,tags:[],desc:'더블 레프트 출구 쪽 관람석이에요. 지붕은 없어요.'},
    {id:'s6',name:'Silver 6 & Pitlane Walk',zone:'s6',R:130,L:100,tags:[],desc:'12번 코너와 더블 레프트 출구가 보여요. 목요일 피트레인 워크가 포함되고, 지붕은 없어요.'},
    {id:'s7',name:'Silver 7 All-In',zone:'s7',R:110,L:100,tags:[],desc:'2026년에 새로 생긴 관람석이에요. Kemmel 직선 끝, Les Combes 바로 앞이고 Combes Fan Zone 옆이에요. 음식과 음료가 포함되고, 맥주와 와인은 11시부터 나와요.'},
    {id:'fags',name:'Fan Area Grandstand: Double Gauche',zone:'fags',R:180,L:100,tags:[],desc:'2026년에 새로 생긴 관람석이에요. Verstappen 관람석과 Silver 5 사이에서 더블 레프트 출구를 봐요.'},
    {id:'c1',name:'Combes Grandstand - 1',zone:'c1',R:270,L:100,tags:[],desc:'Les Combes에 있는 관람석이에요. 캠핑장과 가까워요. 지붕은 없어요.'},
    {id:'c2',name:'Combes Grandstand - 2',zone:'c2',R:260,L:100,tags:[],desc:'Les Combes에 있는 관람석이에요. 캠핑장과 가까워요.'},
    {id:'c3',name:'Combes Grandstand - 3',zone:'c3',R:210,L:100,tags:[],desc:'Les Combes에 있는 관람석이에요. 캠핑장과 가까워요.'},
    {id:'c4',name:'Combes Grandstand - 4',zone:'c4',R:280,L:100,tags:[],desc:'Les Combes에 있는 관람석이에요. 캠핑장과 가까워요. 지붕은 없어요.'},
    {id:'speed',name:'Speed Corner',zone:'speed',R:150,L:100,tags:[],desc:'9번 코너 출구에서 더블 레프트 쪽을 봐요. 대형 스크린으로 레이스 전체를 따라가요. 지붕은 없어요.'},
    {id:'a1727',name:'Area 17-27 Blanchimont',zone:'a1727',R:210,L:100,tags:[],desc:'17~27세만 들어갈 수 있는 구역이에요. 자리는 정해져 있지 않고, DJ 공연과 이벤트가 열려요. 지붕은 없어요.'},
    {id:'prms',name:'PRM - Source',kind:'장애인석',zone:'prms',R:260,L:40,tags:[],desc:'Gold 7 옆, La Source 코너 가까이에 있는 장애인 전용 관람대예요. 블루 배지(장애인 주차 카드)가 있어야 해요.'},
    {id:'prmc',name:'PRM - Chicane',kind:'장애인석',zone:'prmc',R:100,L:40,tags:[],desc:'Gold 11 아래에 있는 장애인 전용 관람대예요. 블루 배지(장애인 주차 카드)가 있어야 해요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands, 2026 wayfinding map) */
  standOf: {g1:'g1',g2:'g2',g3:'g3',g4:'g4',g5:'g5',g6:'g6',g7:'g7',g7b:'g7b',g7t:'g7t',g8:'g8',g9:'g9',g9b:'g9b',g11:'g11',
    s1:'s1',fzgs:'fzgs',s3:'s3',s4:'s4',s5:'s5',s6:'s6',s7:'s7',fags:'fags',c1:'c1',c2:'c2',c3:'c3',c4:'c4',speed:'speed',a1727:'a1727',prms:'prms',prmc:'prmc'},
  /* drawn on the 2026 wayfinding map, not sold as public 2026 grandstands. Hospitality markers (ER/CC/AC, Loge) are evt platforms */
  extraStands: ['verstappen','paddockclub'],
  /* stages = the 4 stages of the 2026 promoter timetable. The 2026 map has one 'Stage' icon, at the F1 Fanzone. Ceremony, Gold 3 and
     Gold 4 Stage positions are not published: shown at the start line and at the Gold 3 / Gold 4 stands (see NOTES.md) */
  stages: [
    {id:'fanzone',name:'Fanzone',zone:null,desc:'F1® Fanzone의 무대예요. 드라이버 인터뷰와 공연이 열리고, Bronze 티켓으로도 추가 티켓 없이 공연을 봐요.'},
    {id:'ceremony',name:'Ceremony Stage',zone:null,desc:'무대 위치는 발표되지 않았어요. 결승 전 행사 시간에 공연이 있어 출발선 쪽에 표시했어요.'},
    {id:'gold3',name:'Gold 3 Stage',zone:null,desc:'무대 위치는 발표되지 않아 이름이 같은 Gold 3 관람석에 표시했어요.'},
    {id:'gold4',name:'Gold 4 Stage',zone:null,desc:'무대 위치는 발표되지 않아 이름이 같은 Gold 4 관람석에 표시했어요.'}
  ],
  /* entrance gates = the 10 'ENTRY' labels of the 2026 wayfinding map (no numbers). side null: which ticket uses which gate is not
     published officially. desc = 2026 FAQ facts. Position: the map's entry icon (pos 'map'); Kemmel C/D/E = OSM gates of the same
     name; Blanchimont = OSM gate at the end of Route de l'Eau Rouge = 'Blanchimont Access' of the circuit's access plan (pos 'osm') */
  gates: [
    {id:'source',n:'',name:'Source',side:null,pos:'map',desc:'Yellow 캠핑장이 Source 입구와 Ster 입구 사이에 있어요.'},
    {id:'ster',n:'',name:'Ster',side:null,pos:'map',desc:'Yellow 캠핑장이 Source 입구와 Ster 입구 사이에 있어요.'},
    {id:'p15',n:'',name:'P15',side:null,pos:'map',desc:''},
    {id:'combesa',n:'',name:'Combes A',side:null,pos:'map',desc:'Green 캠핑장이 Les Combes 입구 가까이에 있어요.'},
    {id:'combesb',n:'',name:'Combes B',side:null,pos:'map',desc:'Green 캠핑장이 Les Combes 입구 가까이에 있어요.'},
    {id:'combesc',n:'',name:'Combes C',side:null,pos:'map',desc:'Green 캠핑장이 Les Combes 입구 가까이에 있어요.'},
    {id:'kemmelc',n:'',name:'Kemmel C',side:null,pos:'osm',desc:''},
    {id:'kemmeld',n:'',name:'Kemmel D',side:null,pos:'osm',desc:''},
    {id:'kemmele',n:'',name:'Kemmel E',side:null,pos:'osm',desc:''},
    {id:'blanchimont',n:'',name:'Blanchimont',side:null,pos:'osm',desc:'Young Village가 이 입구 가까이에 있어요. 자전거는 이 입구의 자전거 주차장에 세워요(금~일 6~22시).'}
  ],
  gateDesc: g => (g.desc ? g.desc+' ' : '') + '티켓 등급(Bronze·Silver·Gold)에 따라 들어가는 입구가 달라요. '
    + (g.pos==='osm' ? '위치는 OpenStreetMap의 같은 입구 기준이에요.' : '위치는 2026 관람 안내도 기준이에요.'),
  transit: {
    items: [
    /* "Rue de Sart just before the Trou Hennet traffic circle": OSM Rue de Sart where it meets the roundabout (1.8 km north of La Source) */
    {id:'tec',name:'TEC Shuttle',codes:[],note:'Verviers-Central역 앞에서 출발해 Francorchamps의 Rue de Sart, Trou Hennet 로터리 바로 앞에 내려요. 서킷행은 7:30~13시, 돌아가는 차는 같은 자리에서 16:30~19:30에 계속 다녀요. 표는 Verviers-Central역 TEC 창구에서 사요.'}
  ],
    xy: {tec:[-483,-1800]},   // OSM (Rue de Sart × Trou Hennet roundabout)
    layer: '셔틀', kicker: 'TEC 셔틀', short: '셔틀', near: '셔틀과 가까운', suffix: '', aria: ' 셔틀 정류장 ',
    note: 'TEC 294·395번 버스도 Verviers-Central역에서 서킷까지 가요(1회 €3.50). 일요일에는 우회해서 서킷에 들르지 않아요. 도시별 City Shuttle이 서킷에 내리는 곳은 발표되지 않았어요.',
    icon: 'bus'
  },
  village: {
    items: [
    /* positions: the two F1 Fanzone hatches of the 2026 wayfinding map */
    {id:'f1fanzone',name:'F1® Fanzone',label:'F1 Fanzone',zone:null,desc:'Heineken® 0.0이 후원하는 F1 팬 존이에요. Bronze 티켓으로도 들어갈 수 있고, 무대에서 드라이버와 팀 관계자를 직접 봐요.'},
    {id:'combesfz',name:'Combes Fan Zone',label:'Combes Fan Zone',zone:null,desc:'2026년에 새로 생긴 팬 존이에요. F1 공식 숍, 피트 스톱 챌린지, 포디움 포토, 레이싱 시뮬레이터가 있어요. 활동은 8~18시, 문은 0시 30분까지 열어요.'}
  ],
    label: '팬 존', desc: ''
  },
  /* landmarks — r: 1 always · 2 from k .4 · 3 from k .75. OpenStreetMap positions (metres); Formula 1® Pits, Ferris Wheel and
     Young Village from the 2026 wayfinding map */
  landmarks: [
    {t:'프랑코르샹',xy:[-480,-769],r:1},
    {t:'Formula 1® Pits',xy:[447,260],r:2},
    {t:'Karting',xy:[242,1536],r:2},
    {t:'Ferris Wheel',xy:[1332,2035],r:3},
    {t:'Young Village',xy:[488,2064],r:2},
    {t:'P1',xy:[899,-32],r:3},
    {t:'P2',xy:[814,-95],r:3},
    {t:'P14',xy:[278,204],r:3},
    {t:'P15',xy:[262,-214],r:3},
    {t:'Eau Rouge 개울',en:"l'Eau Rouge",xy:[626,1260],r:3,w:1}
  ],
  /* schedule (local time CEST, as published): [day, start, end, series, English, Korean, note].
     formula1.com 2026 timetable + FIA Timetable V4 (16 Jul 2026). Off-track items (press conferences, F1 Car Presentation in
     the pit lane, pit-lane walks, track tours) are not included. Race end 17:00 = FIA 'approximate finishing time'. */
  track: [
    [0,'09:55','10:40','f3','FIA Formula 3 · Practice Session','F3 연습',''],
    [0,'11:05','11:50','f2','FIA Formula 2 · Practice Session','F2 연습',''],
    [0,'12:30','12:50','hist','Formula 1 · Historic F1 cars Demonstration','히스토릭 F1 데모 주행',''],
    [0,'13:30','14:30','f1','Formula 1 · First Practice Session','F1 연습 주행 1',''],
    [0,'15:00','15:30','f3','FIA Formula 3 · Qualifying Session','F3 예선',''],
    [0,'15:55','16:25','f2','FIA Formula 2 · Qualifying Session','F2 예선',''],
    [0,'17:00','18:00','f1','Formula 1 · Second Practice Session','F1 연습 주행 2',''],
    [0,'18:30','19:15','psc','Porsche Mobil 1 Supercup · Practice Session','포르쉐 슈퍼컵 연습',''],
    [1,'10:00','10:45','f3','FIA Formula 3 · Sprint Race','F3 스프린트 레이스','12랩 또는 40분 +1랩'],
    [1,'11:20','11:50','psc','Porsche Mobil 1 Supercup · Qualifying Session','포르쉐 슈퍼컵 예선',''],
    [1,'12:30','13:30','f1','Formula 1 · Third Practice Session','F1 연습 주행 3',''],
    [1,'14:15','15:05','f2','FIA Formula 2 · Sprint Race','F2 스프린트 레이스','18랩 또는 45분 +1랩'],
    [1,'16:00','17:00','f1','Formula 1 · Qualifying Session','F1 예선',''],
    [1,'17:15','17:35','hist','Formula 1 · Historic F1 Cars Demonstration','히스토릭 F1 데모 주행',''],
    [2,'08:30','09:20','f3','FIA Formula 3 · Feature Race','F3 피처 레이스','15랩 또는 45분 +1랩'],
    [2,'10:00','11:05','f2','FIA Formula 2 · Feature Race','F2 피처 레이스','25랩 또는 60분 +1랩'],
    [2,'11:45','12:20','psc','Porsche Mobil 1 Supercup · Race','포르쉐 슈퍼컵 레이스','12랩 또는 30분 +1랩'],
    [2,'12:30','12:50','hist','Formula 1 · Historic F1 Cars Demonstration','히스토릭 F1 데모 주행',''],
    [2,'13:00','13:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [2,'14:44','14:46','cer','National Anthem','국가 연주',''],
    [2,'15:00','17:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','44랩 또는 120분']
  ],
  /* stage acts: [day, stage, artist, start, end] — promoter 2026 timetable page (old2026 archive), spelling as published.
     Not included: Sat 17:00–18:00 DJ Admin (no stage listed). '14:59:50' is as published (the core reads HH:MM). */
  acts: [
    [0,'fanzone','Fanzone Concert','08:00','10:15'],
    [0,'ceremony','Naomi Cazier','10:25','13:30'],[0,'gold4','IceKream','10:25','13:30'],[0,'gold3','Aiira Morena','10:25','13:30'],
    [0,'fanzone','Drivers Interviews','10:25','11:15'],[0,'fanzone','DJ Admin','11:15','13:00'],[0,'fanzone','Lucki Luc','13:00','13:30'],
    [0,'fanzone','Lucki Luc','14:30','14:35'],[0,'gold4','Tilaa','14:30','15:00'],[0,'gold3','Aiira Morena','14:30','15:00'],
    [0,'ceremony','Naomi Cazier','14:30','15:25'],[0,'fanzone','Drivers Interviews','14:45','14:55'],[0,'fanzone','Ravenous','14:55','15:25'],
    [0,'gold3','Alja Al Saadi','15:00','16:30'],[0,'gold4','Will Davids','15:00','16:30'],[0,'ceremony','Lucki Luc','15:25','16:30'],
    [0,'fanzone','Drivers Interviews','15:35','16:05'],[0,'fanzone','Ravenous','16:05','16:30'],
    [0,'gold3','Alja Al Saadi','17:25','19:15'],[0,'gold4','Will Davids','17:25','19:15'],[0,'ceremony','DJ Admin','17:25','19:15'],
    [0,'fanzone','Drivers Interviews','17:40','18:00'],[0,'fanzone','Ravenous','18:00','19:15'],
    [0,'fanzone','Naomi Cazier','19:15','20:30'],[0,'fanzone','DJ Admin','20:30','21:30'],
    [1,'fanzone','DJ Admin','08:00','09:10'],
    [1,'ceremony','Lucki Luc','09:00','12:00'],[1,'gold3','Dahr','09:00','12:00'],[1,'gold4','Will Davids','09:00','12:00'],
    [1,'fanzone','Drivers Interviews','09:20','10:00'],
    [1,'gold4','PauPrince','12:30','14:00'],[1,'ceremony','Lucki Luc','12:30','14:00'],[1,'gold3','Dahr','12:30','13:00'],
    [1,'fanzone','Drives Interviews','12:35','12:55'],   // sic, as published
    [1,'fanzone','Naomi Cazier','12:55','13:25'],[1,'gold3','Milinguap','13:00','16:00'],[1,'fanzone','Yunobi','13:25','14:25'],
    [1,'gold4','Thumez','14:00','16:00'],[1,'ceremony','Ravenous','14:00','16:00'],
    [1,'fanzone','Drivers Interviews','14:35','14:55'],[1,'fanzone','Yunobi','14:55','15:00'],
    [1,'fanzone','Drivers Interviews','15:00','15:30'],[1,'fanzone','Yunobi','15:30','16:00'],
    [1,'gold3','Milinguap','17:00','18:00'],[1,'gold4','PauPrince','17:00','18:00'],[1,'fanzone','Naomi Cazier','17:00','18:00'],
    [1,'fanzone','Amber Broos','18:00','19:00'],[1,'fanzone','Ravenous','19:00','20:30'],
    [2,'fanzone','Lucki Luc','08:00','13:00'],
    [2,'ceremony','DJ Admin','09:00','12:00'],[2,'gold4','Thumez','09:00','11:00'],[2,'gold3','Naomi Cazier','09:00','12:00'],
    [2,'gold4','Will Davids','11:00','13:00'],[2,'fanzone','Lucki Luc','12:00','13:00'],[2,'gold3','yunobi','12:00','13:00'],
    [2,'ceremony','Lucki Luc','13:30','14:44'],[2,'fanzone','Yunobi','13:30','14:44'],[2,'gold3','Ravenous','13:30','14:44'],[2,'gold4','PauPrince','13:30','14:44'],
    [2,'ceremony','Lost Frequencies','14:47','14:59:50'],[2,'fanzone','Yunobi','14:47','14:59:50'],
    [2,'gold3','Ravenous','14:47','14:59:50'],[2,'gold4','PauPrince','14:47','14:59:50'],
    [2,'ceremony','Lost Frequencies','17:00','17:15'],[2,'fanzone','Ravenous','17:00','17:25'],
    [2,'fanzone','Lost Frequencies','17:25','18:25'],[2,'fanzone','DJ Admin','18:25','20:00']
  ],
  /* every published act has a time and a stage */
  tba: [],
  quietTitles: ['국가 연주'],
  series: {f1:{code:'F1', cls:'f1'}, f2:{code:'F2', cls:'', noRound:true}, f3:{code:'F3', cls:'', noRound:true}, psc:{code:'SUPERCUP', cls:'', noRound:true}, hist:{code:'HISTORIC', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  /* 2026 public products (promoter zone list). Not modelled: Lunch Box variants (same seats + catering), Gold 2 Premium and
     the VIP / hospitality products — see NOTES.md */
  tickets: [
    {id:'g1',name:'Gold 1 : Pit',badge:'GOLD',zl:'G1',zones:['g1','bronze'],seat:'g1',sub:'피트레인·그리드 앞 지정석 · 지붕 있음'},
    {id:'g2',name:'Gold 2 : GP2',badge:'GOLD',zl:'G2',zones:['g2','bronze'],seat:'g2',sub:'La Source~Raidillon 지정석 · 지붕 있음'},
    {id:'g3',name:'Gold 3 : Eau-Rouge',badge:'GOLD',zl:'G3',zones:['g3','bronze'],seat:'g3',sub:'Raidillon 꼭대기 지정석 · 지붕 있음'},
    {id:'g4',name:'Gold 4 : Eau-Rouge All-In',badge:'GOLD',zl:'G4',zones:['g4','bronze'],seat:'g4',sub:'Raidillon 오르막 지정석 · 음식·음료 포함 · 지붕 없음'},
    {id:'g5',name:'Gold 5 : Eau Rouge',badge:'GOLD',zl:'G5',zones:['g5','bronze'],seat:'g5',sub:'Eau Rouge 지정석 · 지붕 없음'},
    {id:'g6',name:'Gold 6 : Chicane',badge:'GOLD',zl:'G6',zones:['g6','bronze'],seat:'g6',sub:'시케인 지정석 · 지붕 있음'},
    {id:'g7',name:'Gold 7 : Source',badge:'GOLD',zl:'G7',zones:['g7','bronze'],seat:'g7',sub:'La Source 출구 지정석 · 지붕 있음'},
    {id:'g7b',name:'Gold 7 Bis : Source',badge:'GOLD',zl:'G7 BIS',zones:['g7b','bronze'],seat:'g7b',sub:'La Source 지정석 · 지붕 없음'},
    {id:'g7t',name:'Gold 7 ter : Endurance',badge:'GOLD',zl:'G7 TER',zones:['g7t','bronze'],seat:'g7t',sub:'La Source 지정석 · 지붕 없음'},
    {id:'g8',name:'Gold 8 : Source - START',badge:'GOLD',zl:'G8',zones:['g8','bronze'],seat:'g8',sub:'출발 직선·La Source 지정석 · 지붕 있음'},
    {id:'g9',name:'Gold 9 : Pole Position',badge:'GOLD',zl:'G9',zones:['g9','bronze'],seat:'g9',sub:'스타팅 그리드 앞 지정석 · 지붕 있음'},
    {id:'g9b',name:'Gold 9 Bis : Pole Position',badge:'GOLD',zl:'G9 BIS',zones:['g9b','bronze'],seat:'g9b',sub:'Gold 9 옆 지정석 · 지붕 없음'},
    {id:'g11',name:'Gold 11 Premium : Chicane',badge:'GOLD',zl:'G11',zones:['g11','bronze'],seat:'g11',sub:'시케인 출구 지정석 · 지붕 있음'},
    {id:'s1',name:'Silver 1 : Francorchamps',badge:'SILVER',zl:'S1',zones:['s1','bronze'],seat:'s1',sub:'La Source 출구 지정석 · 지붕 없음'},
    {id:'s3',name:'Silver 3 : Double Gauche',badge:'SILVER',zl:'S3',zones:['s3','bronze'],seat:'s3',sub:'Pouhon 더블 레프트 지정석'},
    {id:'s4',name:'Silver 4 : Bruxelles',badge:'SILVER',zl:'S4',zones:['s4','bronze'],seat:'s4',sub:'Bruxelles 코너 지정석 · 지붕 있음'},
    {id:'s5',name:'Silver 5',badge:'SILVER',zl:'S5',zones:['s5','bronze'],seat:'s5',sub:'더블 레프트 출구 지정석 · 지붕 없음'},
    {id:'s6',name:'Silver 6 & Pitlane Walk',badge:'SILVER',zl:'S6',zones:['s6','bronze'],seat:'s6',sub:'12번 코너 지정석 · 목요일 피트레인 워크 포함'},
    {id:'s7',name:'Silver 7 All-In',badge:'SILVER',zl:'S7',zones:['s7','bronze'],seat:'s7',sub:'Kemmel 직선 끝 지정석 · 음식·음료 포함'},
    {id:'fzgs',name:'Fanzone Grandstand',badge:'SPECIAL',zl:'FANZONE',zones:['fzgs','bronze'],seat:'fzgs',sub:'Eau Rouge 앞 지정석 · 지붕 없음'},
    {id:'fags',name:'Fan Area Grandstand: Double Gauche',badge:'SPECIAL',zl:'FAN AREA',zones:['fags','bronze'],seat:'fags',sub:'더블 레프트 출구 지정석'},
    {id:'c1',name:'Combes Grandstand - 1',badge:'SPECIAL',zl:'C1',zones:['c1','bronze'],seat:'c1',sub:'Les Combes 지정석 · 지붕 없음'},
    {id:'c2',name:'Combes Grandstand - 2',badge:'SPECIAL',zl:'C2',zones:['c2','bronze'],seat:'c2',sub:'Les Combes 지정석'},
    {id:'c3',name:'Combes Grandstand - 3',badge:'SPECIAL',zl:'C3',zones:['c3','bronze'],seat:'c3',sub:'Les Combes 지정석'},
    {id:'c4',name:'Combes Grandstand - 4',badge:'SPECIAL',zl:'C4',zones:['c4','bronze'],seat:'c4',sub:'Les Combes 지정석 · 지붕 없음'},
    {id:'speed',name:'Speed Corner',badge:'SPECIAL',zl:'SPEED CORNER',zones:['speed','bronze'],seat:'speed',sub:'9번 코너 출구 지정석 · 지붕 없음'},
    {id:'a1727',name:'Area 17-27 Blanchimont',badge:'SPECIAL',zl:'17/27',zones:['a1727','bronze'],seat:'a1727',sub:'17~27세 전용 · 자유석 · 지붕 없음'},
    {id:'prms',name:'PRM - Source',badge:'PRM',zl:'PRM',zones:['prms','bronze'],seat:'prms',sub:'장애인 전용 관람대 · 동반자 티켓과 주차권 포함'},
    {id:'prmc',name:'PRM - Chicane',badge:'PRM',zl:'PRM',zones:['prmc','bronze'],seat:'prmc',sub:'장애인 전용 관람대 · 동반자 티켓과 주차권 포함'},
    {id:'bronze',name:'Bronze area',badge:'BRONZE',zl:'BRONZE',zones:['bronze'],seat:null,sub:'Bronze 구역 전체와 팬 존 자유 관람 · 지정석 없음'},
    {id:'bronzebx',name:'Bronze area - Bruxelles',badge:'BRONZE',zl:'BRONZE',zones:['bronze'],seat:null,sub:'Bruxelles 코너가 바로 보이는 Bronze 구역 · 전용 먹거리 · 지정석 없음'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '들어갈 수 있는 구역과 내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 벨기에 GP 주최측 티켓 안내 기준이에요. 그랜드스탠드 티켓으로는 내 관람석과 Bronze 구역 전체에, Bronze 티켓으로는 Bronze 구역과 팬 존에 들어가요. 좌석은 날마다 번호가 정해져 있어요. 실제 입장 범위는 티켓에 적힌 내용을 따라요.',
  tl: { from: 8*60, to: 22*60, rows: ['fanzone','ceremony','gold3','gold4'], names: {fanzone:'Fanzone',ceremony:'Ceremony',gold3:'Gold 3',gold4:'Gold 4'}, trackTag: '<span class="stag f1">F1 <span class="rd">외 4</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 그랜드스탠드가 없어요.<br>Bronze 구역에서 볼 수 있는지 현장 안내를 확인하세요.',
  searchPh: '아티스트, 무대, 관람석, 게이트, 셔틀',
  quick: ['Lost Frequencies','Ravenous','Gold 3','Silver 4','Fanzone','Combes','Blanchimont','2번 코너'],
  presets: [
    {d:0,t:'13:20',l:'연습 주행 1 · 10분 전'}, {d:1,t:'14:30',l:'F2 스프린트 레이스 진행 중'},
    {d:1,t:'15:50',l:'예선 · 10분 전'}, {d:2,t:'14:30',l:'결승 · 30분 전'},
    {d:2,t:'15:50',l:'결승 진행 중'}, {d:2,t:'17:30',l:'Lost Frequencies 공연 중'}
  ],
  demoRange: [6*60, 22*60],
  /* legend categories of the 2026 wayfinding map with an icon here (positions: evt.amen) */
  amen: {wc:['wc','화장실'],fnb:['food','식음료'],aid:['aid','응급 처치'],screen:['screen','대형 스크린']},
  amenLegend: [['wc','화장실'],['food','식음료'],['aid','응급 처치'],['screen','대형 스크린']],
  info: {
    title: '벨기에 그랑프리 서킷 맵',
    sub: '스파-프랑코르샹 서킷 · 7.004km · 19개 코너 · 결승 44랩 · 시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 0~3m 안에서 맞아요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-10-04판에서 건물·도로·물가·숲·피트레인을 그대로 그렸어요. Kemmel C·D·E와 Blanchimont 게이트, TEC 셔틀 내리는 곳, 주차장·카트장 위치도 OpenStreetMap 기준이에요'],
      ['코너 번호·출발선', '코너 번호와 피니시 라인은 Formula 1 2026 서킷 지도(formula1.com), 출발선은 서킷 운영사(Circuit de Spa-Francorchamps) 출입 안내도 기준이에요. 코너 이름은 formula1.com 코너 이름 해설(2026-07-15)을 따랐어요'],
      ['트랙 세션 시간', 'Formula 1 공식 타임테이블(2026)과 FIA 타임테이블 V4(2026-07-16) · 벨기에 시간(CEST · UTC+2) · 결승 끝나는 시각은 FIA 예상 시각이에요'],
      ['무대 공연', 'Spa Grand Prix(주최측) 2026 타임테이블 · 2026 사이트 보관본 기준이에요. 안내도에 무대 표시가 있는 곳은 F1 Fanzone 한 곳뿐이라, Ceremony·Gold 3·Gold 4 Stage는 위치가 발표되지 않았어요'],
      ['관람석·게이트·구역·편의시설', '2026 F1 벨기에 GP 관람 안내도(Wayfinding Map, gpdestinations.com 게시본)를 트랙에 맞춰 실측 지도 위로 옮겼어요. 공식 게시처는 찾지 못했어요. 안내도는 축척이 없어 트랙에서 먼 곳일수록 오차가 커요. 관람석에서 보이는 구간은 추정치예요'],
      ['관람석 설명·티켓', 'Spa Grand Prix 2026 관람석·티켓 페이지와 FAQ(2026 사이트 보관본) 기준이에요. 자세한 위치 설명은 주최측 2025 관람석 안내(Where to sit, 2025)를 따랐어요'],
      ['셔틀', 'TEC 셔틀·버스 정보는 Spa Grand Prix 2026 FAQ 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
