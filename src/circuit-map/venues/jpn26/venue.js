// 일본 GP 2026 (스즈카 서킷) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
export default {
  id: 'jpn26',
  raceId: 'f1-2026-3-japanesegrandprix',
  round: 'R3',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: 136.5219, lat0: 34.8484, kxLat: 34.8446 },
  tz: { off: 9, abbr: 'JST', name: '일본 시간', utc: 'UTC+9' },
  day0: [2026, 2, 26],
  days: [{d:'03.26',w:'목',en:'THU'},{d:'03.27',w:'금',en:'FRI'},{d:'03.28',w:'토',en:'SAT'},{d:'03.29',w:'일',en:'SUN'}],
  title: '일본 그랑프리',
  heroEn: 'Formula 1 Aramco Japanese Grand Prix',
  markup: { aria: '스즈카 서킷 지도', circuit: '스즈카 서킷', dates: '03.26–29' },
  /* Turn 1–2 and the chicane (Honda circuit guide), the hairpin (formula1.com: Grandstand I "if it's overtaking you want") */
  overtake: [1,2,11,16,17],
  /* pit lane: OSM raceway 'Pit Lane' (base.json bm.pit), so no pitFallback */
  geoBox: [-500, 2500, -500, 1550],
  /* no zone-gated access: reserved stands admit their own ticket holders, the West Area ticket covers the
     non-reserved West Area only (no colour/zone system is published) */
  zones: null,
  spots: [
    {id:'v1',name:'V1 Seat',zone:null,R:200,L:200,tags:['start','podium','stage'],desc:'메인 직선, 피트 맞은편 그랜드스탠드 아래층이에요. 포디움 바로 앞 블록이 있고, 뒤쪽이 GP Square예요.'},
    {id:'v2',name:'V2 Seat',zone:null,R:260,L:200,tags:['start','stage'],desc:'그랜드스탠드 위층이에요. 1번 코너와 마지막 코너 쪽이 보이고, 휠체어석에는 지붕과 전용 엘리베이터가 있어요.'},
    {id:'a1',name:'A1 Seat',zone:null,R:180,L:200,tags:['start'],desc:'메인 직선 임시 스탠드예요. 1번 코너와 홈 스트레이트 쪽이 보여요.'},
    {id:'a2',name:'A2 Seat',zone:null,R:190,L:120,tags:['overtake'],desc:'메인 직선 끝, 1번 코너 쪽 임시 스탠드예요.'},
    {id:'b1',name:'B1 Seat',zone:null,R:300,L:150,tags:['overtake'],desc:'2번 코너 벤치석이에요. 1번 코너와 S자 커브가 보여요. GP Square에서 내리막길로 10~15분 걸려요.'},
    {id:'b2',name:'B2 Seat',zone:null,R:430,L:200,tags:['overtake'],desc:'1·2번 코너와 S자 커브가 보여요. 시로코역 쪽에서 오면 1st Corner 게이트로 바로 들어와요.'},
    {id:'c',name:'C Seat',zone:null,R:400,L:200,tags:[],desc:'Honda 응원석이에요. S자 커브 쪽이 잘 보이고, 일요일 드라이버 퍼레이드 때 C석에서 드라이버 등장 순서가 있어요.'},
    {id:'d',name:'D Seat',zone:null,R:280,L:300,tags:[],desc:'S자 커브와 역뱅크를 안쪽에서 봐요. D4 좌석은 그늘진 곳이 많아요.'},
    {id:'e',name:'E Seat',zone:null,R:180,L:150,tags:[],desc:'NIPPO 코너 정면이에요. 역뱅크 쪽을 바라보고, E-2는 Reverse Bank 게이트와 가까워요.'},
    {id:'g',name:'G Seat',zone:null,R:180,L:250,tags:['landmark'],desc:'130R 안쪽과 입체 교차(Overpass) 쪽 좌석이에요. GP Square에서 걸어서 20분쯤 걸려요.'},
    {id:'h',name:'H Seat',zone:null,R:150,L:120,tags:[],desc:'110R(10번 코너) 임시 스탠드예요.'},
    {id:'i',name:'I Seat',zone:null,R:140,L:200,tags:['overtake'],desc:'NISSIN Brake 헤어핀 앞이에요. F1 공식 사이트가 추월을 보려면 이곳을 꼽아요. GP Square에서 편도 30분쯤 걸려요.'},
    {id:'m',name:'M Seat',zone:null,R:200,L:150,tags:['stage'],desc:'Spoon 커브 임시 스탠드예요. Spoon 게이트와 WEST FANZONE이 가깝고, GP Square에서 50분쯤 걸려요.'},
    {id:'o',name:'O Seat',zone:null,R:120,L:250,tags:[],desc:'West Straight 임시 스탠드로, 130R 쪽과 Spoon 쪽으로 나뉘어요. GP Square에서 편도 1시간 가까이 걸려요.'},
    {id:'p',name:'P Seat',zone:null,R:160,L:120,tags:['overtake'],desc:'Astemo 시케인 입구 임시 스탠드예요. GP Square에서 20분쯤 걸려요.'},
    {id:'q1',name:'Q1 Seat',zone:null,R:150,L:150,tags:['overtake'],desc:'홈 스트레이트와 Astemo 시케인이 보여요. GP Square에서 10분쯤 걸려요.'},
    {id:'q2',name:'Q2 Seat',zone:null,R:120,L:120,tags:['overtake'],desc:'Astemo 시케인 쪽 높은 곳에 있는 스탠드예요. 130R 쪽이 보여요.'},
    {id:'r',name:'R Seat',zone:null,R:180,L:150,tags:[],desc:'마지막 코너 상설 스탠드예요. GP Square에서 10분이 안 걸려요.'},
    {id:'s',name:'S Seat (Family Seat)',zone:null,R:240,L:120,tags:['landmark'],desc:'마지막 코너 가족석으로, 관람차 Circuit Wheel 옆이에요. 그늘진 벤치와 지붕 있는 쉼터, 유모차 보관소, 화장실, 기저귀 교환대가 있어요.'},
    /* West Area non-reserved areas drawn as grandstand bars on the 2026 map (J Area is not on the 2026 map) */
    {id:'larea',name:'L Area',kind:'West Area 자유석',zone:null,R:250,L:150,tags:['stage'],desc:'West Area 자유석 구역이에요. Spoon 커브 쪽이고, WEST FANZONE이 바로 옆이에요.'},
    {id:'narea',name:'N Area',kind:'West Area 자유석',zone:null,R:250,L:150,tags:[],desc:'West Area 자유석 구역이에요. Spoon 커브 쪽이고, Spoon 게이트에서 100m예요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands: vector shapes of the 2026 spectator map) */
  standOf: {v1:'v1',v2:'v2',a1:'a1',a2:'a2',b1:'b1',b2:'b2',c:'c',d:'d',e:'e',g:'g',h:'h',i:'i',m:'m',o:'o',p:'p',q1:'q1',q2:'q2',r:'r',s:'s',larea:'larea',narea:'narea'},
  /* hospitality / group seats outlined on the 2026 spectator map, not in the guide */
  extraStands: ['paddockclub','rbox','granview','sbox'],
  stages: [
    {id:'gpsq',name:'GP SQUARE FANZONE Stage',short:'GP Square',zone:null,desc:'V1·V2 스탠드 뒤 GP Square의 FANZONE 무대예요. 드라이버 토크와 공연이 열리고, F1 주행 세션은 모두 이 무대 화면으로 보여줘요.'},
    {id:'eve',name:'그랜드스탠드 앞 특설 무대',short:'특설 무대',zone:null,desc:'토요일 전야제(前夜祭) 때 그랜드스탠드 앞 홈 스트레이트에 세우는 무대예요. V1·V2 티켓, 번호표가 있는 사람, 그 밖의 순서로 들어가요.'},
    {id:'westfz',name:'WEST FANZONE Stage',short:'West Fanzone',zone:null,desc:'Spoon 커브 L 구역 옆 WEST FANZONE의 무대예요. PIT BAR, F1 SIMRACING, F1 PIT STOP CHALLENGE와 먹거리가 있고, 팬 존은 목 9:00~17:00, 금~일 8:00~18:00에 열려요.'}
  ],
  /* spectator gates: official Suzuka Circuit Google My Maps, folder 'ゲート/Spectator's Gate' (linked from the 2027 walking-route page).
     No gate numbers exist; names without the word 'Gate' (the core adds '게이트'). */
  gates: [
    {id:'main',n:'',name:'Main',side:null,ll:[136.5394382,34.8483057]},
    {id:'c1',n:'',name:'1st Corner',side:null,ll:[136.543792,34.843877]},
    {id:'pool',n:'',name:'Pool Side',side:null,ll:[136.5425368,34.8450256]},
    {id:'rbank',n:'',name:'Reverse Bank',side:null,ll:[136.5354925,34.8443996]},
    {id:'wms',n:'',name:'West Motorsports',side:null,ll:[136.5341049,34.844186]},
    {id:'chicane',n:'',name:'Chicane',side:null,ll:[136.5332439,34.846328]},
    {id:'spoon',n:'',name:'Spoon',side:null,ll:[136.5207743,34.8479278]}
  ],
  /* what each gate serves: Suzuka official gate guide (2027 page); Main Gate opening time: official 2026 main-gate page */
  gateDesc: g => ({
      main:'정면 주차장에서 들어오는 메인 입구예요. Gate Shop과 상설 화장실이 있고, V석·GP Square까지 500m예요. 금·토·일 08:00에 열려요.',
      c1:'시로코역 쪽 동쪽에서 오는 사람을 위한 임시 게이트예요. A석까지 200m, B석 470m, C석 670m예요.',
      pool:'파크 안 Batto\'s ADVENTURE VILLAGE 옆 임시 게이트예요. 시로코역까지 가는 공식 도보 경로가 여기서 시작해요.',
      rbank:'Reverse Bank Plaza와 남쪽 임시 주차장으로 이어지는 임시 게이트예요. D석까지 250m, E석 350m예요.',
      wms:'남쪽 임시 주차장에서 West Course로 들어가는 임시 게이트예요. O석까지 170m, J 구역 220m, I석 450m예요.',
      chicane:'Q·G·H·I석에 추천하는 임시 게이트예요. Q석까지 150m, P석 200m예요.',
      spoon:'Spoon 커브 M·N 구역 뒤 임시 게이트예요. M석까지 140m, N 구역 100m이고, 밖에 자전거 주차장이 있어요.'
    }[g.id] || ''),
  /* in-circuit West Course Shuttle (official 2026 shuttle page). Only the GP Square stop has a published location
     ('east end of GP Square'); West Paddock Gate, West Straight Gate and Degner East Gate stops have none */
  transit: {
    items: [
    {id:'sgpsq',name:'GP Square',codes:[],note:'West Course 셔틀은 GP Square 동쪽 끝에서 타고 내려요. 서쪽 코스의 West Paddock Gate, West Straight Gate, Degner East Gate 정류장과 이어지고, 이 세 정류장 위치는 발표되지 않았어요.'}
  ],
    xy: {sgpsq:[1816.9,428.7]},   // easternmost point of the GP Square fanzone outline on the 2026 map
    layer: '셔틀', kicker: 'West Course 셔틀', short: '셔틀', near: '셔틀과 가까운', suffix: '', aria: ' 셔틀 정류장 ',
    note: 'GP Square와 서쪽 코스를 잇는 서킷 안 셔틀이에요. 금~일 8:00~18:00(목 8:30~17:30)에 다니고, 일요일 14:00~18:00에는 노선이 바뀔 수 있어요. 약 20분, 붐비면 1시간 넘게 걸려요. 서킷까지는 긴테쓰 시로코역에서 셔틀버스(예약 없이 탑승)를 타요.',
    icon: 'bus'
  },
  village: {
    items: [
    {id:'gpfz',name:'GP SQUARE FANZONE',label:'GP Square',desc:'V1·V2 스탠드 뒤 광장이에요. 공식 무대, 기업 부스, 공식 숍, 먹거리가 모여 있어요.'},
    {id:'fwfz',name:'FERRIS WHEEL FANZONE',label:'Ferris Wheel Fanzone',desc:'2026년 새로 생긴 팬 존으로, 관람차 Circuit Wheel 근처예요. F1 STORE, F1 SIMRACING, F1 2026 SHOW CAR, FIA F1 챔피언십 트로피가 있어요.'}
  ],
    label: '팬 존', desc: ''
  },
  /* landmarks — OpenStreetMap positions (metres); Traffic Education Center from the 2026 map. r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'Circuit Wheel',xy:[1549.3,268.2],r:1},
    {t:'Suzuka Circuit Park',xy:[1664.5,152.3],r:2},
    {t:'Suzuka Circuit Hotel',xy:[1890.0,-42.4],r:2},
    {t:'South Course',xy:[479.9,683.9],r:2},
    {t:'Honda RACING Gallery',xy:[1598.8,283.3],r:3},
    {t:'Traffic Education Center',xy:[1902.9,556.4],r:3}
  ],
  /* schedule (local time JST, as published): [day, start, end, series, English, Korean, note]
     FIA Timetable V3 (27 Mar 2026) + formula1.com; promoter walks also on the Suzuka 2026 event pages */
  track: [
    [0,'09:00','12:00','fan','Promoter Activity · Public Non-Stop Pit Lane Walk / Home Straight Walk','논스톱 피트레인 워크·스트레이트 워크','그랜드스탠드 1코너 쪽 경사로로 들어가 A2석 앞 출구로 나와요'],
    [1,'09:00','09:45','fcj','Ferrari Challenge Japan · First Practice Session','페라리 챌린지 재팬 연습 1',''],
    [1,'11:30','12:30','f1','Formula 1 · First Practice Session','F1 연습 주행 1',''],
    [1,'13:00','13:45','pccj','Porsche Carrera Cup Japan · Practice Session','포르쉐 카레라컵 재팬 연습',''],
    [1,'15:00','16:00','f1','Formula 1 · Second Practice Session','F1 연습 주행 2',''],
    [1,'16:30','17:00','fcj','Ferrari Challenge Japan · Qualifying Session','페라리 챌린지 재팬 예선',''],
    [2,'10:20','10:50','pccj','Porsche Carrera Cup Japan · Qualifying Session','포르쉐 카레라컵 재팬 예선',''],
    [2,'11:30','12:30','f1','Formula 1 · Third Practice Session','F1 연습 주행 3',''],
    [2,'13:10','13:45','fcj','Ferrari Challenge Japan · First Race','페라리 챌린지 재팬 레이스 1','30분 + 1랩'],
    [2,'15:00','16:00','f1','Formula 1 · Qualifying Session','F1 예선',''],
    [2,'17:15','17:45','fan','Promoter Activity · Non-Stop Pit Lane Walk for Children','어린이 논스톱 피트레인 워크',''],
    [2,'18:00','19:10','fan','Promoter Activity · Non-Stop Pit Lane Walk and Home Straight Walk','논스톱 나이트 피트레인 워크·스트레이트 워크','역뱅크 터널(E석 쪽)로 들어가요. VIP Suite·V1·V2 티켓은 V석 아래에서 들어가요'],
    [3,'09:40','10:15','fcj','Ferrari Challenge Japan · Second Race','페라리 챌린지 재팬 레이스 2','30분 + 1랩'],
    [3,'10:55','11:30','pccj','Porsche Carrera Cup Japan · Race','포르쉐 카레라컵 재팬 레이스','12랩 또는 30분 + 1랩'],
    [3,'12:00','12:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [3,'13:44','13:46','cer','National Anthem','국가 연주','YOSHIKI가 피아노와 드럼으로 연주해요'],
    [3,'14:00','16:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','53랩 또는 120분'],
    [3,'16:30','18:00','fan','Promoter Activity · Track Walk – East Course','동쪽 코스 트랙 워크','홈 스트레이트는 들어갈 수 없어요']
  ],
  /* stage acts: [day, stage, programme · performers (as published), start, end] — Suzuka 2026 event pages (as of 24/25 Mar 2026) */
  acts: [
    [0,'gpsq','2025 F1 일본 GP 플레이백 상영','10:30','14:00'],
    [0,'gpsq','Guest Talk · 大島璃音','14:00','14:20'],
    [0,'gpsq','F1 TOKYO FAN FESTIVAL 2026 Talk Show (녹화 상영)','15:00','16:00'],
    [1,'gpsq','Opening Stage · 竜馬四重奏 (Ryoma Quartet)','08:30','09:00'],
    [1,'gpsq','F1 Drivers Stage · Max Verstappen / Isack Hadjar','09:30','09:40'],
    [1,'gpsq','F1 Drivers Stage · Pierre Gasly / Franco Colapinto / George Russell / Kimi Antonelli','09:40','09:50'],
    [1,'gpsq','F1 Drivers Stage · Charles Leclerc / Lewis Hamilton','09:50','10:00'],
    [1,'gpsq','F1 Paddock Talk · Jak Crawford','10:00','10:10'],
    [1,'gpsq','F1 Drivers Stage · Esteban Ocon / Oliver Bearman','10:10','10:20'],
    [1,'gpsq','F1 Paddock Talk · Jacques Villeneuve','10:20','10:30'],
    [1,'gpsq','F1 Paddock Talk · Peter Bayer','10:30','10:40'],
    [1,'westfz','MOS 라이브 스테이지','10:45','11:15'],
    [1,'gpsq','Session Review powered by フジテレビ · 津川哲夫 / 浜島裕英 / 山本雅史','13:10','13:30'],
    [1,'gpsq','F1 Paddock Talk · Toto Wolff','13:35','13:45'],
    [1,'gpsq','F1 Paddock Talk · Zak Brown','13:50','14:00'],
    [1,'westfz','竜馬四重奏 라이브 스테이지','14:00','14:30'],
    [1,'gpsq','F1 Paddock Talk · Dino Leone','14:00','14:10'],
    [1,'gpsq','F1 Paddock Talk · Jean Alesi','14:10','14:20'],
    [1,'gpsq','Guest Talk · 中嶋 悟 / 佐藤蓮','16:25','16:45'],
    [1,'gpsq','Guest Talk · 笠原美香 / 大島璃音','16:50','17:20'],
    [1,'gpsq','MOS 라이브 스테이지','18:15','18:45'],
    [1,'gpsq','F1 Paddock Talk · Ayao Komatsu','18:50','19:00'],
    [1,'gpsq','F1 Paddock Talk · Ryo Hirakawa','19:00','19:10'],
    [2,'gpsq','Opening Stage','08:30','08:45'],
    [2,'gpsq','FOD Presents F1™ガールズトークショー · 古畑星夏 / 織戸茉彩 / サッシャ','09:00','09:25'],
    [2,'gpsq','F1 Drivers Stage · Liam Lawson / Arvid Lindblad','09:30','09:40'],
    [2,'gpsq','F1 Drivers Stage · Lando Norris / Oscar Piastri','09:40','09:50'],
    [2,'gpsq','F1 Drivers Stage · Alex Albon / Carlos Sainz','09:50','10:00'],
    [2,'gpsq','F1 Drivers Stage · Nico Hulkenberg / Gabriel Bortoleto','10:00','10:10'],
    [2,'gpsq','F1 Drivers Stage · Fernando Alonso / Lance Stroll / Sergio Perez / Valtteri Bottas','10:10','10:20'],
    [2,'gpsq','MOS 라이브 스테이지','10:25','10:55'],
    [2,'westfz','竜馬四重奏 라이브 스테이지','12:35','13:00'],
    [2,'gpsq','자위대 연주 · 中部航空音楽隊','12:40','13:00'],
    [2,'gpsq','Session Review powered by フジテレビ · 片山右京 / 中野信治 / サッシャ / 堀池亮介','13:05','13:30'],
    [2,'gpsq','Guest Talk · 中嶋 悟 / 大島璃音','13:30','13:50'],
    [2,'westfz','伊賀忍者特殊軍団阿修羅 닌자술 퍼포먼스','13:50','14:20'],
    [2,'gpsq','F1 Paddock Talk · Bradley Lord','13:55','14:05'],
    [2,'gpsq','F1 Paddock Talk · Luke Browning / Damon Hill','14:05','14:15'],
    [2,'gpsq','F1 Paddock Talk · Yuki Tsunoda','14:15','14:25'],
    [2,'westfz','자위대 연주 · 中部航空音楽隊','14:20','14:45'],
    [2,'gpsq','日本相撲協会 콜라보 스테이지 · 大関 琴櫻','14:25','14:45'],
    [2,'westfz','MOS 라이브 스테이지','16:05','16:30'],
    [2,'gpsq','Youth Innovation Award','16:15','16:45'],
    [2,'eve','Opening Act · 竜馬四重奏','16:45','17:00'],
    [2,'eve','F1 Paddock Talk · Leonard Fornaroli','17:00','17:10'],
    [2,'eve','F1 Paddock Talk · Stefano Domenicali','17:10','17:20'],
    [2,'eve','F1 Paddock Talk · Marc Gene','17:30','17:40'],
    [2,'eve','F1 Paddock Talk · 周冠宇 / Zhou Guanyu','17:40','17:50'],
    [2,'eve','Guest Talk · 佐藤琢磨','17:50','18:10'],
    [3,'gpsq','오프닝 스테이지 & 와다이코 퍼포먼스 · 太鼓打ちシンゴ','08:30','09:00'],
    [3,'gpsq','Guest Talk · 佐藤琢磨','09:00','09:20'],
    [3,'westfz','伊賀忍者特殊軍団阿修羅 닌자술 퍼포먼스','09:10','09:30'],
    [3,'gpsq','Guest Talk · アバンギャルディ','10:30','10:45'],
    [3,'gpsq','Pre-Race talk Powered by フジテレビ · 森脇基恭 / 松田次生 / 白幡勝広','11:40','12:00']
  ],
  /* every published act has times */
  tba: [],
  quietTitles: ['국가 연주','논스톱 피트레인 워크·스트레이트 워크','어린이 논스톱 피트레인 워크','논스톱 나이트 피트레인 워크·스트레이트 워크','동쪽 코스 트랙 워크'],
  series: {f1:{code:'F1', cls:'f1'}, fcj:{code:'FERRARI', cls:'', noRound:true}, pccj:{code:'PCCJ', cls:'', noRound:true}, fan:{code:'FAN', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'v1',name:'V1 Seat',zl:'',zones:null,seat:'v1',sub:'그랜드스탠드 아래층 · 메인 직선 지정석'},
    {id:'v2',name:'V2 Seat',zl:'',zones:null,seat:'v2',sub:'그랜드스탠드 위층 · 메인 직선 지정석'},
    {id:'a1',name:'A1 Seat',zl:'',zones:null,seat:'a1',sub:'메인 직선 지정석'},
    {id:'a2',name:'A2 Seat',zl:'',zones:null,seat:'a2',sub:'메인 직선 끝 · 1번 코너 지정석'},
    {id:'b1',name:'B1 Seat',zl:'',zones:null,seat:'b1',sub:'2번 코너 벤치 지정석'},
    {id:'b2',name:'B2 Seat',zl:'',zones:null,seat:'b2',sub:'1·2번 코너 지정석'},
    {id:'c',name:'C Seat (Honda Support Seat)',zl:'',zones:null,seat:'c',sub:'2번 코너~S자 커브 · Honda 응원석'},
    {id:'d',name:'D Seat',zl:'',zones:null,seat:'d',sub:'S자 커브~역뱅크 지정석'},
    {id:'e',name:'E Seat',zl:'',zones:null,seat:'e',sub:'NIPPO 코너 지정석'},
    {id:'g',name:'G Seat',zl:'',zones:null,seat:'g',sub:'130R·입체 교차 지정석'},
    {id:'h',name:'H Seat',zl:'',zones:null,seat:'h',sub:'110R 지정석'},
    {id:'i',name:'I Seat',zl:'',zones:null,seat:'i',sub:'NISSIN Brake 헤어핀 지정석'},
    {id:'m',name:'M Seat',zl:'',zones:null,seat:'m',sub:'Spoon 커브 지정석'},
    {id:'o',name:'O Seat',zl:'',zones:null,seat:'o',sub:'West Straight 지정석'},
    {id:'p',name:'P Seat',zl:'',zones:null,seat:'p',sub:'Astemo 시케인 입구 지정석'},
    {id:'q1',name:'Q1 Seat',zl:'',zones:null,seat:'q1',sub:'Astemo 시케인 지정석'},
    {id:'q2',name:'Q2 Seat',zl:'',zones:null,seat:'q2',sub:'Astemo 시케인 위쪽 지정석'},
    {id:'r',name:'R Seat',zl:'',zones:null,seat:'r',sub:'마지막 코너 지정석'},
    {id:'s',name:'S Seat (Family Seat)',zl:'',zones:null,seat:'s',sub:'마지막 코너 가족석'},
    {id:'west',name:'West Area Ticket',zl:'',zones:null,seat:null,sub:'서쪽 구역 자유석 관람 · 지정석 스탠드는 들어갈 수 없어요'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '스즈카 서킷 공식 티켓 안내 기준이에요. 2026 안내 페이지가 2027 내용으로 바뀌어 스탠드 이름은 2027 안내와 2026 관람 안내도를 따랐어요. 지정석 티켓은 그 스탠드에만 앉을 수 있고, West Area 티켓은 서쪽 구역에서만 볼 수 있어요. 2026년 금요일은 일부 스탠드를 빼고 자유석이었어요.',
  tl: { from: 8*60, to: 20*60, rows: ['gpsq','eve','westfz'], names: {gpsq:'GP Square',eve:'특설 무대',westfz:'West Fanzone'}, trackTag: '<span class="stag f1">F1 <span class="rd">외 3</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>West Area 자유석 구역에서 볼 수 있는지 현장 안내를 확인하세요.',
  searchPh: '드라이버, 무대, 관람석, 게이트, 셔틀',
  quick: ['Max Verstappen','Yuki Tsunoda','GP Square','WEST FANZONE','Q2 Seat','Spoon','Chicane','11번 코너'],
  presets: [
    {d:0,t:'09:30',l:'피트레인 워크 진행 중'}, {d:1,t:'09:30',l:'F1 Drivers Stage 진행 중'},
    {d:1,t:'11:20',l:'연습 주행 1 · 10분 전'}, {d:2,t:'14:50',l:'예선 · 10분 전'},
    {d:3,t:'13:30',l:'결승 · 30분 전'}, {d:3,t:'14:50',l:'결승 진행 중'}
  ],
  demoRange: [7*60, 21*60-1],
  /* 2026 spectator map legend categories that have an icon here (Nursing Room, Smoking Area, Heliport, Assembly Point have none) */
  amen: {wc:['wc','화장실'],wcacc:['wc','장애인 화장실'],fnb:['food','식음료'],water:['drop','물 보급'],aid:['aid','의료 센터'],info:['info','안내'],merch:['shirt','공식 굿즈'],screen:['screen','대형 스크린 (Circuit Vision)']},
  amenLegend: [['wc','화장실'],['food','식음료'],['drop','물 보급'],['aid','의료 센터'],['info','안내'],['shirt','공식 굿즈'],['screen','대형 스크린']],
  info: {
    title: '일본 그랑프리 서킷 맵',
    sub: '스즈카 서킷 · 5.807km · 18개 코너 · 결승 53랩 · 시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 4m 안에서 맞아요. 8자 코스라 West Straight가 다리로 트랙 위를 지나가요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-10-04판에서 건물·도로·물가·풀밭·피트레인을 그대로 그렸어요'],
      ['코너 번호·출발선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요'],
      ['트랙 세션 시간', 'FIA 2026 타임테이블(V3, 2026-03-27)과 Formula 1 공식 일정 · 일본 시간(JST · UTC+9) · 바뀔 수 있어요'],
      ['무대 공연·피트레인 워크', '스즈카 서킷 2026 이벤트 안내(3월 24·25일 기준) · 바뀔 수 있어요'],
      ['관람석·팬 존·편의시설', '2026 일본 GP 관람 안내도(파일 제목 2026_F1_Japan_WayfindingMap, gpdestinations.com 게시본)를 트랙에 맞춰 실측 지도 위로 옮겼어요. 트랙 기준 오차는 2m 안팎이에요. 관람석에서 보이는 구간은 추정치예요. WEST FANZONE 무대는 지도에 표시가 없어 팬 존 가운데에 두었어요'],
      ['관람석 이름·설명', '스즈카 서킷 공식 티켓 안내(2027 페이지, 2026 안내도와 스탠드 구성이 같아요)와 formula1.com 서킷 안내를 따랐어요'],
      ['게이트', '스즈카 서킷 공식 구글 마이맵 게이트 위치(2027 도보 경로 안내 페이지)와 공식 게이트 안내(2027) 기준이에요. Main 게이트 개장 시각은 2026 공식 안내예요'],
      ['셔틀', '스즈카 서킷 2026 West Course 셔틀 안내 기준이에요. GP Square 정류장은 안내 문구(GP Square 동쪽 끝)대로 2026 안내도에 맞춰 둔 위치예요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
