// 모나코 GP 2026 (모나코 서킷, 몬테카를로) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
export default {
  id: 'mco26',
  raceId: 'f1-2026-6-monacograndprix',
  round: 'R6',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: 7.4212, lat0: 43.7411, kxLat: 43.7372 },
  tz: { off: 2, abbr: 'CEST', name: '모나코 시간', utc: 'UTC+2' },
  day0: [2026, 5, 4],
  days: [{d:'06.04',w:'목',en:'THU'},{d:'06.05',w:'금',en:'FRI'},{d:'06.06',w:'토',en:'SAT'},{d:'06.07',w:'일',en:'SUN'}],
  title: '모나코 그랑프리',
  heroEn: 'Formula 1 Louis Vuitton Grand Prix de Monaco',
  markup: { aria: '몬테카를로 모나코 서킷 지도', circuit: '모나코 서킷', dates: '06.04–07' },
  overtake: [1,10],   // formula1.com 2026-06-04: Sainte Devote(1) · Nouvelle Chicane(10/11, 브레이킹은 10번 코너)
  geoBox: [-500, 1250, -500, 1500],
  /* no zone-gated access: each ticket is for one tribune or standing zone, moving between them is not stated */
  zones: null,
  /* guide stands. Names = promoter ticketing names (monaco-grandprix.com) and the ACM 2026 plan legend ('Tribune PMR').
     K1–K6 and T1–T3 are one block each on the 2026 plan ('K6 à K1', 'T1 T2 T3'); the tickets stay per product and point
     to the shared spot. Position = official outline (standOf → evt.stands). R tuned to the official view text (NOTES.md) */
  spots: [
    {id:'a',name:'Tribune A',zone:null,R:35,L:40,tags:['start','overtake','landmark'],desc:'Sainte-Dévote 성당 맞은편, 출발 직후의 작은 관람석이에요. 시속 270km까지 달려온 차가 첫 코너 Sainte Devote에 들어서는 모습을 봐요.'},
    {id:'b',name:'Tribune B',zone:null,R:200,L:60,tags:['landmark'],desc:'Hôtel de Paris와 Café de Paris 사이, Casino 맞은편 관람석이에요. Massenet를 돌아 Casino Square로 들어와 Avenue des Spélugues로 내려가는 차를 봐요.'},
    {id:'e',name:'Tribune E',zone:null,R:60,L:60,tags:[],desc:'Tabac를 지나 수영장 구간이 시작되는 곳에 있어요. 정면으로 달려오는 차가 아주 빠른 좌우 연속 코너를 지나는 모습을 봐요.'},
    {id:'k',name:'Tribune K',zone:null,R:105,L:220,tags:['mrt'],desc:'Nouvelle Chicane 출구부터 Tabac, 수영장 첫 S자까지 서킷 아래쪽 구간이 보이고 대형 스크린이 있어요. K1~K3은 8번, K4~K6은 7번 게이트로 들어가요.'},
    {id:'l',name:'Tribune L',zone:null,R:100,L:120,tags:['start'],desc:'Rainier III 수영장 해변 위에 세운 큰 관람석이에요. 수영장 S자 출구와 피트 레인이 내려다보이고, 대형 스크린이 있어요.'},
    {id:'n',name:'Tribune N',zone:null,R:180,L:60,tags:[],desc:'Tabac부터 수영장 S자 출구까지 보여요. 2번 게이트(Av. du Port)로 들어가요.'},
    {id:'o',name:'Tribune O',zone:null,R:115,L:80,tags:[],desc:'모나코 항구 한가운데 있는 큰 관람석이에요. 수영장 구간 코너들이 보이고, 대형 스크린이 있어요.'},
    {id:'p',name:'Tribune P',zone:null,R:140,L:60,tags:[],desc:'Tabac부터 수영장 S자 출구까지 보여요. 2번 게이트(Av. du Port)로 들어가요.'},
    {id:'t',name:'Tribune T1·T2·T3',zone:null,R:108,L:150,tags:['start'],desc:'수영장 S자 출구부터 La Rascasse까지 직선이 보이고, 피트 맞은편이라 미캐닉 작업을 가까이서 봐요. N열보다 아래 좌석에서는 피트가 보이지 않아요.'},
    {id:'v',name:'Tribune V',zone:null,R:77,L:40,tags:['start'],desc:'La Rascasse를 빠져나와 오르막을 오르는 서킷 남쪽 끝, 트랙과 가장 가까운 관람석이에요. 피트 입구 맞은편이라 F1 패독에서 걸어오는 드라이버도 보여요.'},
    {id:'z',name:'Tribune Z',kind:'스탠딩 구역',zone:null,R:90,L:80,tags:[],desc:'Avenue JF Kennedy 위에서 트랙을 내려다보는 스탠딩 구역이에요. Tabac 앞 직선과 Tabac 코너가 보여요.'},
    {id:'rocher',name:'Secteur Rocher',kind:'스탠딩 구역',zone:null,R:120,L:150,tags:[],desc:'구시가지가 있는 Rocher 비탈, 항구 맞은편의 자유석 스탠딩 구역이에요. 높은 곳에서는 서킷 전체가 보이고, 자정부터 열려서 일찍 가는 게 좋아요.'},
    {id:'prm',name:'Tribune PMR',kind:'이동 약자 관람 구역',zone:null,R:60,L:40,tags:[],desc:'Boulevard Albert Ier 직선 옆 이동 약자 전용 관람석이에요. Rue Princesse Caroline 쪽 4번 게이트로 들어가요.'},
    {id:'chiron',name:'Espace Chiron',kind:'이동 약자 관람 구역',zone:null,R:60,L:40,tags:[],desc:'Princesse Stéphanie 정원 안, Noghès 코너가 보이는 이동 약자 전용 야외 공간이에요. Rue Saige 쪽 3번 게이트로 들어가요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands, ACM 2026 plan) */
  standOf: {a:'a',b:'b',e:'e',k:'k',l:'l',n:'n',o:'o',p:'p',t:'t',v:'v',z:'z',rocher:'rocher',prm:'prm',chiron:'chiron'},
  extraStands: ['prmrocher','pclub'],   // on the 2026 plan, not in the guide: PRM zone by the Secteur Rocher, Paddock Club
  /* fan zone = the only stage (the core's '무대와 가까운' guide filter needs one). 2026 line-up and hours: not published */
  stages: [
    {id:'fanzone',name:'MGP Live Fanzone',short:'Fanzone',zone:null,desc:'La Condamine의 Place d\'Armes에 열리는 무료 팬존이에요. 6월 4일(목)부터 7일(일)까지 드라이버 인터뷰, 시뮬레이터, 콘서트가 열려요. 2026 공연 라인업과 운영 시간은 발표되지 않았어요.'}
  ],
  /* access gates: 'Portes d'accès / Access gates' 1–9 of the ACM 2026 plan (number, street, stands served). Position = gate box */
  gates: [
    {id:'g1',n:'1',name:'Av. de la Porte Neuve',side:null,to:'Secteur Rocher'},
    {id:'g2',n:'2',name:'Av. du Port',side:null,to:'Tribune N·O·P·V'},
    {id:'g3',n:'3',name:'Rue Saige',side:null,to:'Tribune T1·T2·T3, Garage 1, Loges, Espace PMR Chiron'},
    {id:'g4',n:'4',name:'Rue Princesse Caroline',side:null,to:'Tribune PMR'},
    {id:'g5',n:'5',name:'Square Gastaud',side:null,to:'Tribune L'},
    {id:'g6',n:'6',name:'Rue Suffren Reymond',side:null,to:'Tribune H1·H2'},
    {id:'g7',n:'7',name:'Rue Princesse Antoinette',side:null,to:'Tribune E·H3·H4·K4·K5·K6, Belvédère, DC'},
    {id:'g8',n:'8',name:'Rue Grimaldi',side:null,to:'Tribune A·K1·K2·K3·Z'},
    {id:'g9',n:'9',name:'Allée des Boulingrins',side:null,to:'Tribune B'}
  ],
  gateDesc: g => `${g.to} 입구예요. 게이트 번호와 위치는 ACM 2026 관람 안내도 기준이고, 대회장에는 짐 보관소가 없어요.`,
  transit: {
    items: [
    {id:'mcmc',name:'Monaco-Monte-Carlo',codes:['TER'],ll:[7.41917,43.73861],note:'ZOU! TER 기차역이에요. formula1.com 안내로는 서킷까지 걸어서 10~15분이고, ACM은 역 출구가 관람석 입구와 가깝다고 안내해요.'}
  ],
    xy: {mcmc:[-137,314]},   // OSM station node; the 6 station entrances are drawn from OSM (bm.exits)
    layer: '기차역', kicker: '기차역', short: '기차역', near: '기차역과 가까운', suffix: '역', aria: ' 기차역 ',
    note: '그랑프리 기간(6월 1~8일)에는 모나코 시내버스 전 노선이 무료예요(모나코 정부 2026-03-30 발표).',
    icon: 'train'
  },
  village: { items: [], label: '팬존', desc: '' },
  /* landmarks — OpenStreetMap positions (metres). r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'몬테카를로 카지노',xy:[549,214],r:1},
    {t:'에르퀼 항',en:'Port Hercule',xy:[445,657],r:1,w:1},
    {t:'모나코빌',xy:[291,1120],r:1},
    {t:'생트 데보트 성당',xy:[-21,396],r:2},
    {t:'라니에 3세 수영장',xy:[64,710],r:2},
    {t:'페어몬트 몬테카를로',xy:[703,123],r:2},
    {t:'모나코 대공궁',xy:[-111,1088],r:2},
    {t:'오텔 드 파리',xy:[504,231],r:3},
    {t:'카페 드 파리',xy:[535,167],r:3}
  ],
  /* schedule (local time CEST, as published): [day, start, end, series, English, Korean, note]
     FIA Timetable V3 (2026-06-04) = formula1.com 2026 timetable. Race times = start of the formation lap (FIA footnote);
     race end 17:00 = FIA 'Approximate Finishing time'. Hot laps, demonstrations, Honour Lap, pit-lane walks: see NOTES.md */
  track: [
    [0,'13:25','14:10','f3','FIA Formula 3 · Practice Session','F3 연습',''],
    [0,'15:00','15:45','f2','FIA Formula 2 · Practice Session','F2 연습',''],
    [0,'16:30','17:15','psc','Porsche Mobil 1 Supercup · Practice Session','포르쉐 슈퍼컵 연습',''],
    [1,'11:05','11:21','f3','FIA Formula 3 · Qualifying Session (Group A)','F3 예선 A조',''],
    [1,'11:29','11:45','f3','FIA Formula 3 · Qualifying Session (Group B)','F3 예선 B조',''],
    [1,'13:30','14:30','f1','Formula 1 · First Practice Session','F1 연습 주행 1',''],
    [1,'15:10','15:26','f2','FIA Formula 2 · Qualifying Session (Group A)','F2 예선 A조',''],
    [1,'15:34','15:50','f2','FIA Formula 2 · Qualifying Session (Group B)','F2 예선 B조',''],
    [1,'17:00','18:00','f1','Formula 1 · Second Practice Session','F1 연습 주행 2',''],
    [1,'18:45','19:15','psc','Porsche Mobil 1 Supercup · Qualifying Session','포르쉐 슈퍼컵 예선',''],
    [2,'10:45','11:30','f3','FIA Formula 3 · Sprint Race','F3 스프린트 레이스','23랩 또는 40분 +1랩'],
    [2,'12:30','13:30','f1','Formula 1 · Third Practice Session','F1 연습 주행 3',''],
    [2,'14:15','15:05','f2','FIA Formula 2 · Sprint Race','F2 스프린트 레이스','30랩 또는 45분 +1랩'],
    [2,'16:00','17:00','f1','Formula 1 · Qualifying Session','F1 예선',''],
    [3,'07:45','08:35','f3','FIA Formula 3 · Feature Race','F3 피처 레이스','27랩 또는 45분 +1랩'],
    [3,'09:25','10:30','f2','FIA Formula 2 · Feature Race','F2 피처 레이스','42랩 또는 60분 +1랩'],
    [3,'11:45','12:20','psc','Porsche Mobil 1 Supercup · Race','포르쉐 슈퍼컵 레이스','17랩 또는 30분 +1랩'],
    [3,'13:00','13:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [3,'14:44','14:46','cer','National Anthem','국가 연주',''],
    [3,'15:00','17:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','78랩 또는 120분']
  ],
  /* stage acts: none published for 2026 (fan-zone programme was never released) */
  acts: [],
  tba: [],
  quietTitles: ['국가 연주'],
  series: {f1:{code:'F1', cls:'f1'}, f2:{code:'F2', cls:'', noRound:true}, f3:{code:'F3', cls:'', noRound:true}, psc:{code:'SUPERCUP', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  /* ticket model: one ticket per tribune / standing zone and per day (Thu, Fri, Sat, Sun). Products as listed on
     monaco-grandprix.com (2027 sale, permanent positions); gate = ACM 2026 plan legend. seat → the stand's spot */
  tickets: [
    {id:'a',name:'Tribune A',zl:'',zones:null,seat:'a',sub:'Sainte Devote(1번 코너) · 출발 직후 · 8번 게이트'},
    {id:'b',name:'Tribune B',zl:'',zones:null,seat:'b',sub:'Casino Square · 대형 스크린 · 9번 게이트'},
    {id:'e',name:'Tribune E',zl:'',zones:null,seat:'e',sub:'Tabac 뒤 수영장 구간 시작 · 7번 게이트'},
    {id:'k1',name:'Tribune K1',zl:'',zones:null,seat:'k',sub:'Nouvelle Chicane 출구~수영장 · 8번 게이트'},
    {id:'k2',name:'Tribune K2',zl:'',zones:null,seat:'k',sub:'Nouvelle Chicane 출구~수영장 · 8번 게이트'},
    {id:'k3',name:'Tribune K3',zl:'',zones:null,seat:'k',sub:'Nouvelle Chicane 출구~수영장 · 8번 게이트'},
    {id:'k4',name:'Tribune K4',zl:'',zones:null,seat:'k',sub:'Nouvelle Chicane 출구~수영장 · 7번 게이트'},
    {id:'k5',name:'Tribune K5',zl:'',zones:null,seat:'k',sub:'Nouvelle Chicane 출구~수영장 · 7번 게이트'},
    {id:'k6',name:'Tribune K6',zl:'',zones:null,seat:'k',sub:'Nouvelle Chicane 출구~수영장 · 7번 게이트'},
    {id:'l',name:'Tribune L',zl:'',zones:null,seat:'l',sub:'수영장 S자 출구·피트 레인 · 5번 게이트'},
    {id:'n',name:'Tribune N',zl:'',zones:null,seat:'n',sub:'Tabac~수영장 S자 출구 · 2번 게이트'},
    {id:'o',name:'Tribune O',zl:'',zones:null,seat:'o',sub:'수영장 구간 · 대형 스크린 · 2번 게이트'},
    {id:'p',name:'Tribune P',zl:'',zones:null,seat:'p',sub:'Tabac~수영장 S자 출구 · 2번 게이트'},
    {id:'t1',name:'Tribune T1',zl:'',zones:null,seat:'t',sub:'수영장 출구~La Rascasse · 피트 맞은편 · 3번 게이트'},
    {id:'t2',name:'Tribune T2',zl:'',zones:null,seat:'t',sub:'수영장 출구~La Rascasse · 피트 맞은편 · 3번 게이트'},
    {id:'t3',name:'Tribune T3',zl:'',zones:null,seat:'t',sub:'수영장 출구~La Rascasse · 피트 맞은편 · 3번 게이트'},
    {id:'v',name:'Tribune V',zl:'',zones:null,seat:'v',sub:'La Rascasse 출구 · 피트 입구 맞은편 · 2번 게이트'},
    {id:'z',name:'Tribune Z (스탠딩)',zl:'',zones:null,seat:'z',sub:'Tabac 앞 직선 · 스탠딩 구역 · 8번 게이트'},
    {id:'rocher',name:'Secteur Rocher (스탠딩)',zl:'',zones:null,seat:'rocher',sub:'자유석 스탠딩 · 자정부터 입장 · 1번 게이트'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '주최측(ACM) 티켓 안내 기준이에요. 티켓은 관람석이나 스탠딩 구역마다, 날짜마다 따로 팔고, 다른 관람석으로 옮겨 다닐 수 있는지는 발표되지 않았어요. 관람석 목록과 설명은 2027 판매 페이지 문구이고, 게이트는 ACM 2026 관람 안내도 기준이에요.',
  tl: { from: 7*60, to: 20*60, rows: [], names: {}, trackTag: '<span class="stag f1">F1 <span class="rd">외 3</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>스탠딩 구역에서 볼 수 있는지 현장 안내를 확인하세요.',
  searchPh: '관람석, 팬존, 게이트, 역',
  quick: ['F2','포르쉐 슈퍼컵','Tribune K','Secteur Rocher','MGP Live Fanzone','Monaco-Monte-Carlo','1번 코너'],
  presets: [
    {d:0,t:'13:15',l:'F3 연습 · 10분 전'}, {d:1,t:'13:20',l:'연습 주행 1 · 10분 전'},
    {d:2,t:'15:50',l:'예선 · 10분 전'}, {d:3,t:'13:00',l:'드라이버 퍼레이드'},
    {d:3,t:'14:30',l:'결승 · 30분 전'}, {d:3,t:'15:50',l:'결승 진행 중'}
  ],
  demoRange: [7*60, 21*60],
  /* amenities = the services of the ACM 2026 plan legend that have an icon here (police and public parking have none) */
  amen: {wc:['wc','화장실'],snack:['food','음료·스낵'],aid:['aid','응급 처치'],screen:['screen','대형 스크린'],bridge:['walk','보행 육교'],shop:['shirt','공식 굿즈 숍'],popup:['shirt','팝업 스토어'],tix:['ticket','공식 매표소'],sale:['ticket','티켓 판매처'],info:['info','관광 안내소']},
  amenLegend: [['wc','화장실'],['food','음료·스낵'],['aid','응급 처치'],['screen','대형 스크린'],['walk','보행 육교'],['shirt','굿즈'],['ticket','티켓'],['info','관광 안내소']],
  info: {
    title: '모나코 그랑프리 서킷 맵',
    sub: '모나코 서킷 · 3.337km · 19개 코너 · 결승 78랩 · 시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 도로 중심선과 평균 1m, 터널 안에서 최대 8m 차이예요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-10-04판에서 건물·도로·물가·풀밭·피트레인·기차역 출구를 그대로 그렸어요'],
      ['코너 번호·출발선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요. 코너 위치는 실측 트랙의 꼭짓점에 맞췄어요'],
      ['코너 이름·추월 지점', 'formula1.com 코너 이름 해설(2026-06-04) 기준이에요'],
      ['트랙 세션 시간', 'FIA 2026 공식 타임테이블(V3, 2026-06-04)과 Formula 1 공식 일정 · 모나코 시간(CEST · UTC+2) · 레이스는 포메이션 랩 시작 시각이고, 결승 끝나는 시각은 FIA 예상치예요'],
      ['팬존', '주최측(ACM) 2026 소식(5월 26일·6월 1일)과 ACM 2026 관람 안내도 기준이에요 · 2026 공연 라인업과 운영 시간은 발표되지 않았어요'],
      ['관람석·게이트·편의시설', '주최측(ACM) 2026 공식 관람 안내도(2026-05-27 게시)를 트랙에 맞춰 실측 지도 위로 옮겼어요. 공식 안내도는 축척이 없어 트랙에서 먼 곳일수록 오차가 커요. 관람석에서 보이는 구간은 추정치예요. 관람석 설명은 주최측 티켓 사이트(monaco-grandprix.com)의 2027 판매용 문구이고, 이동 약자 관람 구역은 ACM 2026 이동 약자 안내도와 안내 페이지 기준이에요'],
      ['티켓', 'ACM 티켓 구매 안내(2027 페이지)와 monaco-grandprix.com 관람석 목록 기준이고, 관람석별 게이트는 ACM 2026 관람 안내도를 따랐어요'],
      ['기차역', 'Monaco-Monte-Carlo역과 역 출구 위치는 OpenStreetMap 기준 · 도보 시간은 formula1.com 안내예요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
