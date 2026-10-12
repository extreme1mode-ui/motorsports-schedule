// 캐나다 GP 2026 (질 빌뇌브 서킷, 몬트리올) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
/* zones — keys are strings; evt zone keys are 'z'+key. Areas = the colour-zone fills of the 2026 wayfinding map;
   which stand belongs to which zone = the zone tables of the Guide Média 2026 site map (CARTE DU SITE). */
const Z = {
  orange: {badge:'ORANGE ZONE', short:'ORANGE', name:'Orange Zone'},
  red: {badge:'RED ZONE', short:'RED', name:'Red Zone'},
  yellow: {badge:'YELLOW ZONE', short:'YELLOW', name:'Yellow Zone'},
  green: {badge:'GREEN ZONE', short:'GREEN', name:'Green Zone'},
  pink: {badge:'PINK ZONE', short:'PINK', name:'Pink Zone'},
  blue: {badge:'BLUE ZONE', short:'BLUE', name:'Blue Zone'}
};
/* General Admission: "Valid in all General Admission areas except the Blue Zone and VIP sections" → every zone but Blue */
const GA = ['orange','red','yellow','green','pink'];
export default {
  id: 'can26',
  raceId: 'f1-2026-5-canadiangrandprix',
  round: 'R5',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: -73.5299, lat0: 45.5143, kxLat: 45.5057 },
  tz: { off: -4, abbr: 'EDT', name: '몬트리올 시간', utc: 'UTC-4' },
  day0: [2026, 4, 22],
  days: [{d:'05.22',w:'금',en:'FRI'},{d:'05.23',w:'토',en:'SAT'},{d:'05.24',w:'일',en:'SUN'}],
  title: '캐나다 그랑프리',
  heroEn: 'Formula 1 Lenovo Grand Prix du Canada',
  markup: { aria: '몬트리올 질 빌뇌브 서킷 지도', circuit: '질 빌뇌브 서킷', dates: '05.22–24' },
  overtake: [10],
  geoBox: [-750, 1280, -600, 2620],
  /* zone-gated: the Blue Zone is reserved for Blue Zone ticket holders and has its own Gate 3 */
  zones: Z,
  zoneNote: {
    orange: 'Orange Zone · Grandstand 15·21·21A·24·31·46, Terrace 21과 F2·F1 ACADEMY 패독이 있어요. Cosmos 다리로 들어가요',
    yellow: 'Yellow Zone · Grandstand 34·47, Terrace 34와 F1 Fanzone, Bell Stage가 있어요. Cosmos 다리로 들어가요',
    green: 'Green Zone · Grandstand 16·17이 있어요. 2번 게이트(Casino)와 Concorde 다리로 들어가요',
    red: 'Red Zone · Grandstand 32·33·41A가 있어요. Concorde 다리로 들어가요',
    pink: 'Pink Zone · Grandstand 1, Platine, Terrace 1978과 CGV Experience가 있어요. Concorde 다리로 들어가요',
    blue: 'Blue Zone · Grandstand 10·11·12, CGV Terrace, Privilège 12, Élite 티켓이 있어야 들어갈 수 있어요. 전용 3번 게이트로 들어가요'
  },
  /* guide grandstands and terraces (2026 products). Outline = the 2026 wayfinding-map symbol (standOf); zone = Guide Média 2026 */
  spots: [
    {id:'gs1',name:'Grandstand 1',zone:'pink',R:200,L:177,tags:['start'],desc:'F1 팀 개러지와 피트레인 바로 맞은편 좌석이에요. 출발 그리드와 피트 스톱, 레이스 출발과 세리머니를 봐요.'},
    {id:'gs16',name:'Grandstand 16',zone:'green',R:150,L:65,tags:['start'],desc:'F1 피트레인과 개러지 맞은편 좌석이에요. 출발 그리드와 피트 스톱이 보이고, 메트로역에서는 멀어요.'},
    {id:'gs17',name:'Grandstand 17',zone:'green',R:190,L:66,tags:['start'],desc:'Privilège 17 호스피탈리티에 딸린 좌석이에요. 팀 개러지 바로 맞은편에서 피트레인과 출발 직전 순간을 봐요.'},
    {id:'platine',name:'Platine Grandstand',zone:'pink',R:190,L:101,tags:['start'],desc:'서킷 안쪽, 출발 그리드에서 Senna 코너로 이어지는 직선 옆 좌석이에요. 지붕이 있고, 첫 코너로 가속하는 차를 봐요.'},
    {id:'t1978',name:'Terrace 1978',kind:'테라스',zone:'pink',R:220,L:46,tags:['start','podium'],desc:'Podium Suite 아래 테라스예요. 출발선과 1·2번 S자 코너, 포디움이 보여요.'},
    {id:'gs10',name:'Grandstand 10',zone:'blue',R:160,L:76,tags:[],desc:'Senna 코너 바로 뒤 좌석이에요. 1·2번 코너가 잘 보이고, 대형 스크린은 일부만 보여요.'},
    {id:'gs11',name:'Grandstand 11',zone:'blue',R:160,L:74,tags:['start'],desc:'Senna 코너를 마주 보는 좌석이에요. 1·2번 코너와, 피트 출구에서 레이스로 돌아오는 차를 봐요.'},
    {id:'gs12',name:'Grandstand 12',zone:'blue',R:190,L:101,tags:['start'],desc:'1·2번 코너와 3번 코너로 올라가는 구간, 피트 출구가 보여요.'},
    {id:'cgvt',name:'CGV Terrace',kind:'테라스',zone:'blue',R:160,L:41,tags:[],desc:'Senna 코너(1·2번 코너)를 내려다보는 테라스예요. 더 높은 CGV VIP Terrace 구역도 있어요.'},
    {id:'gs32',name:'Grandstand 32',zone:'red',R:160,L:60,tags:[],desc:'트랙 안쪽에서 6·7번 코너의 기술적인 구간을 봐요. 강 풍경도 보여요.'},
    {id:'gs33',name:'Grandstand 33 (Family Grandstand)',zone:'red',R:160,L:102,tags:[],desc:'Family Zone 안의 가족 관람석이에요. 시속 100km쯤으로 지나는 6·7번 좌우 연속 코너를 봐요.'},
    {id:'gs41a',name:'Grandstand 41A',kind:'장애인석',zone:'red',R:160,L:85,tags:['landmark'],desc:'휠체어 관람 플랫폼과 장애인 화장실이 있는 좌석이에요. 8·9번 코너와 몬트리올 시내가 보여요.'},
    {id:'gs31',name:'Grandstand 31',zone:'orange',R:160,L:63,tags:['landmark'],desc:'오른쪽으로 몬트리올 스카이라인이 보여요. 시속 300km 넘는 속도에서 120km쯤까지 줄이는 8·9번 코너를 봐요.'},
    {id:'gs15',name:'Grandstand 15',zone:'orange',R:130,L:58,tags:['overtake','mrt'],desc:'10번 헤어핀을 내려다보는 좌석이에요. 손꼽히는 추월 지점이고, 메트로역과 가까워요.'},
    {id:'gs21',name:'Grandstand 21',zone:'orange',R:120,L:64,tags:['overtake','mrt'],desc:'10번 헤어핀 진입부가 잘 보여요. 1번 게이트와 메트로역에서 조금만 걸으면 돼요.'},
    {id:'gs21a',name:'Grandstand 21A',kind:'장애인석',zone:'orange',R:110,L:101,tags:['overtake'],desc:'휠체어 관람 플랫폼이에요. 10번 헤어핀 진입부가 보이고, 사흘권으로만 팔아요.'},
    {id:'t21',name:'Terrace 21',kind:'테라스',zone:'orange',R:130,L:39,tags:['overtake'],desc:'10번 헤어핀을 내려다보는 3층 테라스예요. 휠체어로 이용할 수 있고, 사흘권으로만 팔아요.'},
    {id:'gs24',name:'Grandstand 24 – Lance Stroll',zone:'orange',R:130,L:96,tags:['overtake'],desc:'10번 헤어핀을 맨 앞에서 보고, 11번 코너를 지나 Casino 직선으로 가속하는 차를 봐요. 손꼽히는 추월 구간이에요.'},
    {id:'gs34',name:'Grandstand 34',zone:'yellow',R:190,L:63,tags:['overtake'],desc:'서킷 한가운데에서 10번 헤어핀을 봐요. F1 Fanzone과 가까워요.'},
    {id:'t34',name:'Terrace 34',kind:'테라스',zone:'yellow',R:160,L:35,tags:['overtake'],desc:'Grandstand 34 바로 아래, 10번 헤어핀 안쪽에 있는 테라스예요.'},
    {id:'gs46',name:'Grandstand 46',zone:'orange',R:260,L:96,tags:[],desc:'Casino 직선이 시작되는 바깥쪽 좌석이에요. 헤어핀 출구와 Wall of Champions로 가는 직선 들머리를 보고, 대형 스크린이 바로 맞은편에 있어요.'},
    {id:'gs47',name:'Grandstand 47',zone:'yellow',R:190,L:68,tags:[],desc:'Casino 직선이 시작되는 안쪽 좌석이에요. Wall of Champions로 가는 직선 들머리를 봐요.'}
  ],
  /* official stand symbol per guide spot (base.json evt.stands) */
  standOf: {gs1:'gs1',gs16:'gs16',gs17:'gs17',platine:'platine',t1978:'t1978',gs10:'gs10',gs11:'gs11',gs12:'gs12',cgvt:'cgvt',gs32:'gs32',gs33:'gs33',gs41a:'gs41a',gs31:'gs31',gs15:'gs15',gs21:'gs21',gs21a:'gs21a',t21:'t21',gs24:'gs24',gs34:'gs34',t34:'t34',gs46:'gs46',gs47:'gs47'},
  extraStands: [],
  stages: [
    {id:'cgv',name:'CGV Concert Stage',short:'CGV Stage',zone:'pink',desc:'Jean-Doré 해변의 CGV Experience 저녁 콘서트 무대예요. 공연은 CGV Experience 티켓(일반 입장+콘서트)에 포함되고, 이 구역은 23시에 닫아요.'},
    {id:'bell',name:'Bell Stage',zone:'yellow',desc:'Yellow Zone의 무대예요. 공연 라인업과 시간은 발표되지 않았어요.'}
  ],
  /* entrance gates: 2026 wayfinding map ('#1 Entrée / Gate Principale / Main', '#2 Entrée / Gate Casino'); Gate 3 position =
     the 2026 Parc Jean-Drapeau mobility map (the wayfinding map only points to it). side = the zone the gate opens into */
  gates: [
    {id:'g1',n:'1',name:'Main',side:null,desc:'Jean-Drapeau 메트로역에서 걸어서 들어오는 정문(Main Gate)이에요. 리버 셔틀 선착장과 택시 하차장(P8, La Ronde)에서도 걸어와요.'},
    {id:'g2',n:'2',name:'Casino',side:'green',desc:'Pôle Grand Prix(rue Marc-Cantin)에서 전용 셔틀을 타고 오는 게이트예요. 택시·차량 호출은 Concorde 다리를 건널 수 없어요.'},
    {id:'g3',n:'3',name:'Blue Zone',side:'blue',desc:'Grandstand 10·11·12, CGV Terrace, Privilège 12, Élite 티켓 전용 게이트예요. Saint-Lambert(151 Rue de l’Écluse)에서 걸어서만 와요.'}
  ],
  gateDesc: g => g.desc + ' 금 8:00·토 8:30·일 9:30에 열어요. 다시 들어오려면 나갈 때 도장을 받아야 해요.',
  transit: {
    items: [
    {id:'jeandrapeau',name:'Jean-Drapeau',codes:['Ligne 4'],note:'STM 메트로 4호선(노란색) 역이에요. 1번 게이트(Main Gate)와 가까워요.'}
  ],
    xy: {jeandrapeau:[-252,205]},   // OSM station node 66008741171
    layer: '메트로역', kicker: 'STM 메트로', short: '메트로', near: '메트로와 가까운', suffix: '역', aria: ' 메트로역 ',
    note: '메트로 4호선(노란색) Jean-Drapeau역으로 와요. 표 사는 줄이 길어지니 왕복 승차권을 미리 사 두세요. 공원 안으로는 차가 들어올 수 없어요.',
    icon: 'train'
  },
  village: {
    items: [
    {id:'fanzone',name:'F1 Fanzone Presented by Heineken 0.0',label:'F1 Fanzone',zone:'yellow',desc:'시뮬레이터, 피트 스톱 챌린지, 굿즈 매장, F1 DJ 무대가 있는 팬 존이에요. Grandstand 34·47 뒤, 섬 한가운데에 있어요.'},
    {id:'beergarden',name:'Heineken Beergarden',label:'Heineken Beergarden',zone:'yellow',desc:''},
    {id:'hhouse',name:'Heineken House',label:'Heineken House',zone:'red',desc:''},
    {id:'paddock2',name:'Support Races Paddock',label:'F2·F1 ACADEMY 패독',zone:'orange',desc:'F2와 F1 ACADEMY 패독이에요. Grandstand 15 뒤에 있어요.'}
  ],
    label: '팬 구역', desc: ''
  },
  /* landmarks — OpenStreetMap positions (metres); Pavillon de la Jamaïque from Parc Jean-Drapeau (ll); Wall of Champions =
     outside of the final-chicane exit on the measured track. r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'Casino de Montréal',xy:[318,972],r:1},
    {t:'Biosphère',xy:[-119,23],r:1},
    {t:'Olympic Basin',en:'Olympic Basin',xy:[500,756],r:1,w:1},
    {t:'Wall of Champions',xy:[462,1176],r:2},
    {t:'Jean-Doré Beach',xy:[423,1622],r:2},
    {t:'Île Notre-Dame',xy:[317,334],r:2},
    {t:'Île Sainte-Hélène',xy:[-366,-506],r:2},
    {t:'Écluse de Saint-Lambert',xy:[982,2248],r:2},
    {t:'Lac des régates',en:'Lac des régates',xy:[381,1439],r:3,w:1},
    {t:'Jardins des Floralies',xy:[173,861],r:3},
    {t:'Pavillon de la Jamaïque',ll:[-73.528416,45.505380],r:3},
    {t:'Pont de la Concorde',xy:[-292,700],r:3},
    {t:'Pont des Îles',xy:[-15,693],r:3},
    {t:'Passerelle du Cosmos',xy:[46,148],r:3}
  ],
  /* schedule (local time EDT, as published — formula1.com 2026 timetable + FIA Timetable V3, 21 May 2026):
     [day, start, end, series, English, Korean, note]. Race ends are the FIA approximate finishing times. */
  track: [
    [0,'09:00','09:40','f1a','F1 ACADEMY · Practice Session','F1 아카데미 연습',''],
    [0,'10:05','10:50','f2','FIA Formula 2 · First Practice Session','F2 연습',''],
    [0,'12:30','13:30','f1','Formula 1 · First Practice Session','F1 연습 주행 1',''],
    [0,'14:00','14:30','f2','FIA Formula 2 · Qualifying Session','F2 예선',''],
    [0,'16:30','17:14','f1','Formula 1 · Sprint Qualifying Session','F1 스프린트 예선',''],
    [0,'18:00','18:30','f1a','F1 ACADEMY · Qualifying','F1 아카데미 예선',''],
    [1,'09:45','10:20','f1a','F1 ACADEMY · Opening Race','F1 아카데미 오프닝 레이스','17랩 또는 최대 30분 +1랩'],
    [1,'12:00','12:30','f1','Formula 1 · Sprint','F1 스프린트','23랩 또는 60분'],
    [1,'14:10','15:00','f2','FIA Formula 2 · Sprint Race','F2 스프린트 레이스','28랩 또는 45분 +1랩'],
    [1,'16:00','17:00','f1','Formula 1 · Qualifying Session','F1 예선',''],
    [1,'18:05','18:35','f1a','F1 ACADEMY · Reverse Grid Race','F1 아카데미 리버스 그리드 레이스','17랩 또는 최대 30분 +1랩'],
    [2,'10:45','11:20','f1a','F1 ACADEMY · Feature Race','F1 아카데미 피처 레이스','17랩 또는 최대 30분 +1랩'],
    [2,'12:05','13:10','f2','FIA Formula 2 · Feature Race','F2 피처 레이스','39랩 또는 60분 +1랩'],
    [2,'14:00','14:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [2,'15:44','15:46','cer','National Anthem','국가 연주',''],
    [2,'16:00','18:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','70랩 또는 120분']
  ],
  /* stage acts: [day, stage, artist, start, end] — CGV Experience 2026 line-up (gpcanada.ca) */
  acts: [
    [0,'cgv','Matt Lang','19:30','20:30'],[0,'cgv','Simple Plan','21:00','22:30'],
    [1,'cgv','Dean Brody','19:30','20:30'],[1,'cgv','Bryan Adams','21:00','22:30'],
    [2,'cgv','The Beaches','19:30','20:30'],[2,'cgv','Alessia Cara','21:00','22:00']
  ],
  /* stages whose acts have no published times: none (Bell Stage and the Fanzone DJ stage have no published line-up) */
  tba: [],
  quietTitles: ['국가 연주'],
  series: {f1:{code:'F1', cls:'f1'}, f2:{code:'F2', cls:'', noRound:true}, f1a:{code:'F1 ACADEMY', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  /* ticket model (2026 products). Badge = the stand's zone (Guide Média 2026). zones: GA = official GA wording; seat tickets whose
     page says "Access to general admission zones" get GA (+ blue for CGV Terrace); null = access range not published */
  tickets: [
    {id:'gs1',name:'Grandstand 1',badge:'PINK ZONE',zl:'PINK',zones:null,seat:'gs1',sub:'피트레인 맞은편 지정석'},
    {id:'gs16',name:'Grandstand 16',badge:'GREEN ZONE',zl:'GREEN',zones:null,seat:'gs16',sub:'피트레인 맞은편 지정석'},
    {id:'platine',name:'Platine Grandstand',badge:'PINK ZONE',zl:'PINK',zones:null,seat:'platine',sub:'출발 직선 안쪽 · 지붕 있는 지정석'},
    {id:'t1978',name:'Terrace 1978',badge:'PINK ZONE',zl:'PINK',zones:null,seat:'t1978',sub:'출발선·1·2번 코너·포디움'},
    {id:'gs10',name:'Grandstand 10',badge:'BLUE ZONE',zl:'BLUE',zones:null,seat:'gs10',sub:'1·2번 코너 지정석 · 3번 게이트'},
    {id:'gs11',name:'Grandstand 11',badge:'BLUE ZONE',zl:'BLUE',zones:null,seat:'gs11',sub:'1·2번 코너·피트 출구 지정석 · 3번 게이트'},
    {id:'gs12',name:'Grandstand 12',badge:'BLUE ZONE',zl:'BLUE',zones:null,seat:'gs12',sub:'1~3번 코너·피트 출구 지정석 · 3번 게이트'},
    {id:'cgvt',name:'CGV Terrace',badge:'BLUE ZONE',zl:'BLUE',zones:['blue'].concat(GA),seat:'cgvt',sub:'Senna 코너 테라스 · 일반 입장 구역 포함'},
    {id:'gs32',name:'Grandstand 32',badge:'RED ZONE',zl:'RED',zones:GA,seat:'gs32',sub:'6·7번 코너 지정석 · 일반 입장 구역 포함'},
    {id:'gs33',name:'Grandstand 33 (Family Grandstand)',badge:'RED ZONE',zl:'RED',zones:GA,seat:'gs33',sub:'6·7번 코너 가족 관람석 · 일반 입장 구역 포함'},
    {id:'gs41a',name:'Grandstand 41A',badge:'RED ZONE',zl:'RED',zones:null,seat:'gs41a',sub:'8·9번 코너 휠체어 관람 플랫폼 · 사흘권'},
    {id:'gs31',name:'Grandstand 31',badge:'ORANGE ZONE',zl:'ORANGE',zones:null,seat:'gs31',sub:'8·9번 코너 지정석'},
    {id:'gs15',name:'Grandstand 15',badge:'ORANGE ZONE',zl:'ORANGE',zones:GA,seat:'gs15',sub:'10번 헤어핀 지정석 · 일반 입장 구역 포함'},
    {id:'gs21',name:'Grandstand 21',badge:'ORANGE ZONE',zl:'ORANGE',zones:GA,seat:'gs21',sub:'10번 헤어핀 진입부 지정석 · 일반 입장 구역 포함'},
    {id:'gs21a',name:'Grandstand 21A',badge:'ORANGE ZONE',zl:'ORANGE',zones:null,seat:'gs21a',sub:'10번 헤어핀 휠체어 관람 플랫폼 · 사흘권'},
    {id:'t21',name:'Terrace 21',badge:'ORANGE ZONE',zl:'ORANGE',zones:null,seat:'t21',sub:'10번 헤어핀 3층 테라스 · 사흘권'},
    {id:'gs24',name:'Grandstand 24 – Lance Stroll',badge:'ORANGE ZONE',zl:'ORANGE',zones:null,seat:'gs24',sub:'10번 헤어핀·11번 코너 지정석'},
    {id:'gs34',name:'Grandstand 34',badge:'YELLOW ZONE',zl:'YELLOW',zones:null,seat:'gs34',sub:'10번 헤어핀 지정석'},
    {id:'t34',name:'Terrace 34',badge:'YELLOW ZONE',zl:'YELLOW',zones:null,seat:'t34',sub:'10번 헤어핀 안쪽 테라스'},
    {id:'gs46',name:'Grandstand 46',badge:'ORANGE ZONE',zl:'ORANGE',zones:null,seat:'gs46',sub:'Casino 직선 들머리 바깥쪽 지정석'},
    {id:'gs47',name:'Grandstand 47',badge:'YELLOW ZONE',zl:'YELLOW',zones:null,seat:'gs47',sub:'Casino 직선 들머리 안쪽 지정석'},
    {id:'ga',name:'General Admission (3일권·1일권)',badge:'GA',zl:'GA',zones:GA,seat:null,sub:'Blue Zone과 VIP 구역을 뺀 일반 입장 구역 자유 관람 · 관람석 입장 없음'},
    {id:'cgvx',name:'CGV Experience (3일권·1일권)',badge:'GA',zl:'GA',zones:GA,seat:null,sub:'일반 입장에 그날 저녁 CGV 콘서트가 포함돼요'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '들어갈 수 있는 구역과 내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 캐나다 GP 티켓 안내와 미디어 가이드 현장 지도 기준이에요. 일반 입장(GA)은 Blue Zone과 VIP 구역을 뺀 일반 입장 구역에 들어갈 수 있고, Blue Zone은 Blue Zone 티켓으로만 3번 게이트로 들어가요. 입장 범위가 발표되지 않은 관람석은 구역 제한 없이 보여줘요. 실제 입장 범위는 티켓에 적힌 내용을 따라요.',
  tl: { from: 9*60, to: 23*60, rows: ['cgv'], names: {cgv:'CGV Concert Stage'}, trackTag: '<span class="stag f1">F1 <span class="rd">외 2</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>일반 입장(GA) 구역에서 보이는지 현장 안내를 확인하세요.',
  searchPh: '아티스트, 무대, 관람석, 게이트, 역',
  quick: ['Bryan Adams','Simple Plan','Grandstand 15','Lance Stroll','F1 Fanzone','Jean-Drapeau','10번 코너'],
  presets: [
    {d:0,t:'12:20',l:'연습 주행 1 · 10분 전'}, {d:1,t:'12:10',l:'스프린트 진행 중'},
    {d:1,t:'15:50',l:'예선 · 10분 전'}, {d:1,t:'21:15',l:'Bryan Adams 공연 중'},
    {d:2,t:'15:30',l:'결승 · 30분 전'}, {d:2,t:'16:50',l:'결승 진행 중'}
  ],
  demoRange: [7*60, 24*60-1],
  /* amenity categories of the 2026 wayfinding map legend (positions in evt.amen); walk = General admission areas of the
     Guide Média 2026 site map */
  amen: {wc:['wc','화장실'],fnb:['food','식음료'],bar:['bar','바'],water:['drop','물 보급'],aid:['aid','응급 처치'],info:['info','고객 서비스'],prog:['info','공식 프로그램'],merch:['shirt','공식 굿즈'],screen:['screen','대형 스크린'],walk:['eye','일반 입장(GA) 관람 구역']},
  amenLegend: [['wc','화장실'],['food','식음료'],['bar','바'],['drop','물 보급'],['aid','응급 처치'],['info','고객 서비스 · 프로그램'],['shirt','굿즈'],['screen','대형 스크린'],['eye','GA 관람 구역']],
  info: {
    title: '캐나다 그랑프리 서킷 맵',
    sub: '질 빌뇌브 서킷 · 4.361km · 14개 코너 · 결승 70랩 · 시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 4m 안에서 맞아요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-10-04판에서 건물·도로·물가·풀밭·피트레인·메트로 출구를 그대로 그렸어요'],
      ['코너 번호·결승선', 'Formula 1 2026 서킷 지도(formula1.com)와 FIA 2026 서킷 지도(2026-05-22) 기준이에요. 결승선은 FIA 지도의 컨트롤 라인이에요'],
      ['트랙 세션 시간', 'Formula 1 공식 타임테이블(2026)과 FIA 타임테이블 V3(2026-05-21) · 몬트리올 시간(EDT · UTC-4) · 레이스 끝 시각은 FIA가 발표한 예상 시각이에요'],
      ['무대 공연', 'CGV Experience 2026 라인업(gpcanada.ca)과 Bell GPCanada 2026 미디어 가이드 · Bell Stage 공연은 발표되지 않았어요'],
      ['관람석·게이트·구역·편의시설', '2026 F1 Canada 관람 안내도(Wayfinding Map, gpdestinations.com 게시본)를 트랙에 맞춰 실측 지도 위로 옮겼어요. 안내도의 관람석은 위치 표시라 실제 관람석 크기와 달라요. 관람석에서 보이는 구간은 추정치예요'],
      ['구역별 관람석·GA 관람 구역', 'Bell GPCanada 2026 미디어 가이드의 현장 지도(CARTE DU SITE) 기준이에요'],
      ['관람석 설명·티켓', 'Bell GPCanada 티켓·FAQ 페이지(gpcanada.ca) 기준이에요. 지금은 2027년판으로 바뀐 페이지라 2026 상품 목록과 대조했어요'],
      ['게이트·교통', 'Parc Jean-Drapeau 2026 그랑프리 이동 안내(2026-05-19)와 Bell GPCanada 접근 안내 기준이에요. 3번 게이트 위치는 이동 안내 지도, 역 위치는 OpenStreetMap 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
