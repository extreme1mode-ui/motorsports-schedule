// 영국 GP 2026 (실버스톤 서킷) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
export default {
  id: 'gbr26',
  raceId: 'f1-2026-9-britishgrandprix',
  round: 'R9',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: -1.0243, lat0: 52.0789, kxLat: 52.0718 },
  tz: { off: 1, abbr: 'BST', name: '영국 시간', utc: 'UTC+1' },
  day0: [2026, 6, 2],
  days: [{d:'07.02',w:'목',en:'THU'},{d:'07.03',w:'금',en:'FRI'},{d:'07.04',w:'토',en:'SAT'},{d:'07.05',w:'일',en:'SUN'}],
  title: '영국 그랑프리',
  heroEn: 'Formula 1 Pirelli British Grand Prix',
  markup: { aria: '영국 실버스톤 서킷 지도', circuit: '실버스톤 서킷', dates: '07.02–05' },
  /* Village (Silverstone grandstand guide 2026), Brooklands (Luffield text, same guide), Stowe (formula1.com + the same guide) */
  overtake: [3,6,15],
  geoBox: [-500, 1550, -500, 2200],
  /* no zone-gated access: grandstands are reserved seats (Fri–Sun) and include GA; GA+ are reserved standing areas */
  zones: null,
  /* guide grandstands = 2026 public grandstands (Silverstone grandstand guide / FAQ 2026, ticket prices 2026), lap order.
     Outline = the magenta grandstand block of the 2026 event map (standOf). GA+ = the numbered GA Plus discs of the same map */
  spots: [
    {id:'hama',name:'Hamilton Straight A',zone:null,xy:[22.6,1151.9],R:200,L:111,tags:['start','podium'],desc:'출발 그리드와 F1 피트가 있는 Hamilton Straight 관람석이에요. 지붕과 쿠션 좌석이 있고, 일부 좌석에서는 포디움 세리머니가 보여요.'},
    {id:'hamb',name:'Hamilton Straight B',zone:null,xy:[133.1,987.0],R:200,L:104,tags:['start','podium'],desc:'출발 그리드와 F1 피트가 있는 Hamilton Straight 관람석이에요. 일부 좌석에서는 포디움 세리머니가 보여요.'},
    {id:'abbeya',name:'Abbey A',zone:null,xy:[177.6,921.6],R:200,L:53,tags:[],desc:'1번 코너 Abbey는 드라이버의 담력을 시험하는 아주 빠른 오른쪽 코너예요. F1 패독과 가까워요.'},
    {id:'abbeyb',name:'Abbey B',zone:null,xy:[233.9,856.9],R:170,L:134,tags:[],desc:'1번 코너 Abbey는 드라이버의 담력을 시험하는 아주 빠른 오른쪽 코너예요. 지붕과 쿠션 좌석이 있어요.'},
    {id:'farm',name:'Farm Curve',zone:null,xy:[543.7,758.0],R:160,L:126,tags:[],desc:'2번 코너 Farm Curve 관람석이에요.'},
    {id:'villagea',name:'Village A',zone:null,xy:[666.5,696.2],R:170,L:99,tags:['overtake'],desc:'3번 코너 Village는 랩의 첫 번째 큰 브레이킹 구간이라 추월이 자주 나와요. 피트 출구가 이 구간으로 이어져요.'},
    {id:'villageb',name:'Village B',zone:null,xy:[746.9,650.1],R:130,L:81,tags:['overtake'],desc:'3번 코너 Village는 랩의 첫 번째 큰 브레이킹 구간이라 추월이 자주 나와요. 지붕이 있어요.'},
    {id:'luffield',name:'Luffield',zone:null,xy:[137.7,206.2],R:250,L:124,tags:['overtake'],desc:'Wellington Straight부터 Brooklands, Luffield까지 넓게 보이는 관람석이에요. 지붕이 있어요.'},
    {id:'luffcorner',name:'Luffield Corner',zone:null,xy:[144.0,371.5],R:300,L:128,tags:['overtake'],desc:'Brooklands와 Luffield를 보는, 실버스톤에서 시야가 가장 넓은 관람석 가운데 하나예요. 지붕이 있어요.'},
    {id:'woodcotea',name:'Woodcote A',zone:null,xy:[203.4,90.3],R:160,L:100,tags:[],desc:'8번 코너 Woodcote 관람석이에요. 지붕이 있어요.'},
    {id:'woodcoteb',name:'Woodcote B',zone:null,xy:[281.5,23.5],R:160,L:99,tags:[],desc:'8번 코너 Woodcote 관람석이에요. 지붕이 있어요.'},
    {id:'woodcotec',name:'Woodcote C',zone:null,xy:[362.1,-22.7],R:160,L:76,tags:[],desc:'8번 코너 Woodcote 관람석이에요.'},
    {id:'nps',name:'National Pit Straight',zone:null,xy:[498.6,-30.4],R:200,L:118,tags:[],desc:'Woodcote와 Copse 사이 National Pits Straight 관람석이에요. 지붕이 있어요.'},
    {id:'stirlinga',name:'Stirling A',zone:null,xy:[678.6,-50.0],R:200,L:82,tags:[],desc:'Copse로 들어가기 전, National Pits Straight 끝 관람석이에요.'},
    {id:'stirlingb',name:'Stirling B',zone:null,xy:[760.5,-57.9],R:150,L:81,tags:[],desc:'Copse로 들어가기 전, National Pits Straight 끝 관람석이에요. 지붕이 있어요.'},
    {id:'copsea',name:'Copse A',zone:null,xy:[876.1,-60.5],R:200,L:60,tags:[],desc:'F1에서 가장 빠른 코너 가운데 하나인 9번 코너 Copse예요. 영국 그랑프리의 명장면이 많이 나온 곳이고, 지붕이 있어요.'},
    {id:'copseb',name:'Copse B',zone:null,xy:[934.5,-33.0],R:200,L:55,tags:[],desc:'F1에서 가장 빠른 코너 가운데 하나인 9번 코너 Copse예요. 영국 그랑프리의 명장면이 많이 나온 곳이고, 지붕이 있어요.'},
    {id:'copsec',name:'Copse C',zone:null,xy:[964.3,16.2],R:200,L:55,tags:[],desc:'F1에서 가장 빠른 코너 가운데 하나인 9번 코너 Copse예요. 영국 그랑프리의 명장면이 많이 나온 곳이고, 지붕이 있어요.'},
    {id:'copsed',name:'Copse D',zone:null,xy:[984.3,76.9],R:200,L:58,tags:[],desc:'F1에서 가장 빠른 코너 가운데 하나인 9번 코너 Copse예요. 영국 그랑프리의 명장면이 많이 나온 곳이에요.'},
    {id:'becketts',name:'Becketts',zone:null,xy:[1085.9,779.0],R:225,L:159,tags:[],desc:'Maggotts와 Becketts로 이어지는, 모터스포츠에서 손꼽히는 연속 코너를 봐요. 지붕이 있어요.'},
    {id:'chapel',name:'Chapel',zone:null,xy:[986.2,1005.6],R:160,L:110,tags:[],desc:'14번 코너 Chapel 관람석이에요. 여기서 Hangar Straight가 시작돼요.'},
    {id:'lando',name:'Landostand',zone:null,xy:[387.6,1721.9],R:250,L:299,tags:['overtake'],desc:'아주 빠른 15번 코너 Stowe를 둘러싼 1만 6천 석이 넘는 새 관람석이에요. Hangar Straight 끝, 실버스톤에서 손꼽히는 추월 포인트예요.'},
    {id:'vale',name:'Vale',zone:null,xy:[120.4,1531.2],R:170,L:140,tags:[],desc:'16번 코너 Vale 관람석이에요.'},
    {id:'cluba',name:'Club A',zone:null,xy:[29.2,1426.8],R:170,L:75,tags:[],desc:'마지막 17·18번 코너 Club 관람석이에요.'},
    {id:'clubcorner',name:'Club Corner',zone:null,xy:[-29.8,1297.5],R:180,L:176,tags:[],desc:'마지막 Club 코너가 넓게 보여 인기가 많은 관람석이에요. 포디움 세리머니 장소와 가깝고, 지붕이 있어요.'},
    /* GA+ reserved standing areas: pin = numbered GA Plus disc of the 2026 map (no outline; L 0 = no stand block) */
    {id:'gpabbey',name:'Abbey GA Plus',kind:'GA+ 구역',zone:null,xy:[264.1,841.6],R:150,L:0,tags:[],desc:'1번 코너 Abbey 가까이에 있는 GA+ 지정 입석 구역이에요.'},
    {id:'gpluffcomplex',name:'Luffield Complex GA Plus',kind:'GA+ 구역',zone:null,xy:[161.0,370.2],R:300,L:0,tags:[],desc:'Luffield 구간에 있는 GA+ 지정 입석 구역이에요.'},
    {id:'gpluffield',name:'Luffield Terrace GA Plus',kind:'GA+ 구역',zone:null,xy:[162.9,191.1],R:220,L:0,tags:[],desc:'Luffield 구간을 높은 곳에서 내려다보는 GA+ 지정 입석 구역이에요.'},
    {id:'gpcopsea',name:'Copse A GA Plus',kind:'GA+ 구역',zone:null,xy:[867.4,-47.5],R:150,L:0,tags:[],desc:'9번 코너 Copse의 GA+ 지정 입석 구역이에요.'},
    {id:'gpcopsec',name:'Copse C GA Plus',kind:'GA+ 구역',zone:null,xy:[940.9,10.6],R:150,L:0,tags:[],desc:'9번 코너 Copse의 GA+ 지정 입석 구역이에요.'},
    {id:'gplando',name:'Landostand GA Plus',kind:'GA+ 구역',zone:null,xy:[329.7,1679.7],R:300,L:0,tags:[],desc:'Landostand 옆 Vale Bank에 있는 GA+ 지정 입석 구역이에요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands, 2026 event map) */
  standOf: {hama:'hama',hamb:'hamb',abbeya:'abbeya',abbeyb:'abbeyb',farm:'farm',villagea:'villagea',villageb:'villageb',luffield:'luffield',luffcorner:'luffcorner',woodcotea:'woodcotea',woodcoteb:'woodcoteb',woodcotec:'woodcotec',nps:'nps',stirlinga:'stirlinga',stirlingb:'stirlingb',copsea:'copsea',copseb:'copseb',copsec:'copsec',copsed:'copsed',becketts:'becketts',chapel:'chapel',lando:'lando',vale:'vale',cluba:'cluba',clubcorner:'clubcorner'},
  /* magenta blocks of the 2026 map that are not sold as public 2026 grandstands (enclosure seating, unlisted stands) */
  extraStands: ['loop','boxpark','wellington','hanger','theview','lakeside'],
  /* positions: 2026 map ('Main Stage' icon; Garage and T1 = enclosure keys 58 and 67). Made at Vale and Drivers Inn are not on
     the map, so they and their programme are left out (NOTES.md) */
  stages: [
    {id:'mainstage',name:'M&S Mainstage',short:'Mainstage',zone:null,xy:[511.1,357.3],desc:'저녁 헤드라이너 공연이 열리는 메인 무대예요. 입장 티켓이 있으면 그날 저녁 공연을 볼 수 있어요.'},
    {id:'garage',name:'Garage Enclosure',short:'Garage',zone:null,xy:[731.4,590.0],desc:'금·토 저녁에 Comedy Club이 열려요.'},
    {id:'t1',name:'T1 Enclosure',short:'T1',zone:null,xy:[239.3,707.8],desc:'T1 애프터파티가 열리는 곳이에요. 18세 이상만 들어갈 수 있고 따로 티켓이 필요해요(2027 안내 기준).'}
  ],
  /* entrance gates = the 12 'Entrance Gates' icons of the 2026 map with the name printed beside each (two are 'Club') */
  gates: [
    {id:'ghamilton',n:'',name:'Hamilton Straight',side:null,xy:[148.1,878.6]},
    {id:'gclub',n:'',name:'Club',side:null,xy:[189.4,591.8]},
    {id:'gbrooklands',n:'',name:'Brooklands',side:null,xy:[144.4,510.1]},
    {id:'gluffield',n:'',name:'Luffield',side:null,xy:[62.4,320.7]},
    {id:'gwoodcote',n:'',name:'Woodcote',side:null,xy:[332.9,-84.9]},
    {id:'gcopse',n:'',name:'Copse',side:null,xy:[811.7,-162.6]},
    {id:'gbecketts',n:'',name:'Becketts',side:null,xy:[1175.5,693.3]},
    {id:'gstowe',n:'',name:'Stowe',side:null,xy:[388.6,1863.4]},
    {id:'gridings',n:'',name:'The Ridings',side:null,xy:[248.3,1726.3]},
    {id:'gsouth',n:'',name:'South Hospitality',side:null,xy:[137.1,1645.3]},
    {id:'gvale',n:'',name:'Vale',side:null,xy:[-42.1,1637.8]},
    {id:'gclub2',n:'',name:'Club',side:null,xy:[-86.0,1604.6]}
  ],
  gateDesc: g => ({
      gbrooklands:'기차역·도시 셔틀이 이 입구에서 걸어서 2분쯤 되는 곳에 내려요(2027 안내 기준). ',
      gluffield:'National Express·Megabus 코치가 이 입구에서 걸어서 몇 분 거리에 내려요(2027 안내 기준). ',
      gclub:'Customer Corner 옆 게이트예요. ',
      gclub2:'Vale 게이트 옆에 있는 또 하나의 Club 게이트예요. '
    }[g.id] || '') + '공식 고객센터 안내로는 게이트가 목 11:00, 금·토 07:30, 일 06:30에 열려요. 가방은 20리터 이하 1개만 들고 들어갈 수 있어요.',
  transit: {
    /* bus hubs and coach park of the 2026 map (named boxes 'Bus Hub 1/2', 'Coach Park', two unnamed 'Bus Hub' icons) */
    items: [
    {id:'bushub1',name:'Bus Hub 1',codes:[],xy:[-26.7,513.8]},
    {id:'bushub2',name:'Bus Hub 2',codes:[],xy:[-24.3,705.6]},
    {id:'coach',name:'Coach Park',codes:[],xy:[20.6,-15.7],note:'National Express·Megabus 코치가 서는 곳이에요. Luffield 입구까지 걸어서 몇 분 걸려요(2027 안내 기준).'},
    {id:'bushub3',name:'Bus Hub',codes:[],xy:[853.9,-119.7]},
    {id:'bushub4',name:'Bus Hub',codes:[],xy:[176.6,1623.3]}
  ],
    xy: {},
    layer: '셔틀버스', kicker: '셔틀버스', short: '셔틀', near: '셔틀과 가까운', suffix: '', aria: ' 셔틀버스 정류장 ',
    note: '셔틀버스는 Milton Keynes·Northampton·Banbury·Coventry·Oxford Parkway 기차역과 주변 도시, Park & Ride(Sixfields·Hinton·Bicester)에서 출발해요. 돌아가는 셔틀은 목~토 17:00~23:00, 일 16:30~22:30에 출발해요.',
    icon: 'bus'
  },
  village: {
    items: [
    {id:'fanzone',name:'F1 Fanzone',label:'F1 Fanzone',zone:null,xy:[643.4,532.8],desc:'시뮬레이터가 있는 팬 존이에요. 모든 티켓으로 들어갈 수 있어요.'},
    {id:'museum',name:'Silverstone Museum',label:'Silverstone Museum',zone:null,xy:[170.0,526.0],desc:'GP 티켓이 있으면 무료로 들어가요. 목 11:00~20:00, 금~일 08:00~20:00(마지막 입장 19:30)에 열고, 일요일은 결승 때문에 15:00에 닫았다가 다시 열어요.'}
  ],
    label: '팬 구역', desc: ''
  },
  /* landmarks — 2026 map labels moved onto the measured map; Hilton Garden Inn from OpenStreetMap. r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'F1 Paddock',xy:[262.0,1088.8],r:2},
    {t:'대관람차',xy:[235.7,437.9],r:3},
    {t:'헬리포트',xy:[645.5,1589.5],r:3},
    {t:'Hilton Garden Inn',xy:[110,1026],r:3},
    {t:'Escapade',xy:[1145.3,564.0],r:3},
    {t:'The Pop-Up Hotel',xy:[461.1,1224.4],r:3},
    {t:'The Pop-Up Hotel',xy:[588.7,1314.8],r:3},
    {t:'Nova Glamping',xy:[415.3,1345.7],r:3},
    {t:'Glamping at The Ridings',xy:[277.4,2014.5],r:3},
    {t:'Customer Corner',xy:[160.5,665.2],r:3},
    {t:'Car Park 26',xy:[1082.5,-96.1],r:3},
    {t:'Car Park 38',xy:[1203.2,865.7],r:3},
    {t:'Car Park 41',xy:[62.9,1798.1],r:3},
    {t:'Car Park 50',xy:[-25.6,858.1],r:3},
    {t:'Car Park 50C',xy:[-29.4,992.1],r:3}
  ],
  /* schedule (local time BST, as published): [day, start, end, series, English, Korean, note]
     Fri–Sun: FIA combined timetable V4 (Doc 29, 2026-07-03 16:05), ends marked ² there are approximate finishing times.
     Thu: Silverstone 2026 Media Guide (no FIA timetable for Thursday). */
  track: [
    [0,'11:45','12:00','f1d','Historic F1 Car Demonstration (High Speed)','히스토릭 F1 머신 시범 주행',''],
    [0,'15:00','15:25','f1d','Formula 1 Pirelli Hot Laps (High Speed)','F1 피렐리 핫랩',''],
    [0,'15:25','15:35','f1d','Historic F1 Car Demonstration (High Speed)','히스토릭 F1 머신 시범 주행',''],
    [0,'16:00','19:00','pw','Silverstone Pit Lane Walk Ticket Holders','피트레인 워크','피트 워크 티켓 소지자'],
    [1,'07:45','08:25','f1a','F1 ACADEMY · Practice Session','F1 아카데미 연습',''],
    [1,'08:50','09:35','f3','FIA Formula 3 · Practice Session','F3 연습',''],
    [1,'10:00','10:45','f2','FIA Formula 2 · Practice Session','F2 연습',''],
    [1,'11:30','12:00','f1d','Formula 1 Pirelli Hot Laps (High Speed)','F1 피렐리 핫랩',''],
    [1,'12:30','13:30','f1','Formula 1 · First Practice Session','F1 연습 주행 1',''],
    [1,'14:00','14:30','f3','FIA Formula 3 · Qualifying Session','F3 예선',''],
    [1,'14:55','15:25','f2','FIA Formula 2 · Qualifying Session','F2 예선',''],
    [1,'15:45','16:00','f1d','Historic F1 Car Demonstration (High Speed)','히스토릭 F1 머신 시범 주행',''],
    [1,'16:30','17:14','f1','Formula 1 · Sprint Qualifying','F1 스프린트 예선',''],
    [1,'18:00','18:30','f1a','F1 ACADEMY · Qualifying Session','F1 아카데미 예선',''],
    [2,'09:35','10:20','f3','FIA Formula 3 · Sprint Race','F3 스프린트 레이스','18랩 또는 40분 +1랩'],
    [2,'10:30','11:05','f1d','Formula 1 Pirelli Hot Laps (High Speed)','F1 피렐리 핫랩',''],
    [2,'12:00','12:30','f1','Formula 1 · Sprint','F1 스프린트','17랩 또는 60분'],
    [2,'13:45','14:35','f2','FIA Formula 2 · Sprint Race','F2 스프린트 레이스','21랩 또는 45분 +1랩'],
    [2,'14:50','15:15','f1d','Historic F1 Car Demonstration (High Speed)','히스토릭 F1 머신 시범 주행',''],
    [2,'15:15','15:25','mcl','John Watson MP4/1 - 1981 British GP Winner Demonstration (High Speed)','맥라렌 MP4/1 시범 주행','John Watson · 1981 영국 GP 우승 차'],
    [2,'16:00','17:00','f1','Formula 1 · Qualifying Session','F1 예선',''],
    [2,'18:05','18:35','f1a','F1 ACADEMY · Reverse Grid Race','F1 아카데미 리버스 그리드 레이스','13랩 또는 최대 30분 +1랩'],
    [3,'08:25','09:15','f3','FIA Formula 3 · Feature Race','F3 피처 레이스','22랩 또는 45분 +1랩'],
    [3,'10:00','10:30','f1a','F1 ACADEMY · Feature Race','F1 아카데미 피처 레이스','13랩 또는 최대 30분 +1랩'],
    [3,'11:15','12:20','f2','FIA Formula 2 · Feature Race','F2 피처 레이스','29랩 또는 60분 +1랩'],
    [3,'12:30','12:45','f1d','Historic F1 Car Demonstration (High Speed)','히스토릭 F1 머신 시범 주행',''],
    [3,'13:00','13:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [3,'13:30','13:50','f1d','Formula 1 Pirelli Hot Laps (High Speed)','F1 피렐리 핫랩',''],
    [3,'14:44','14:46','cer','National Anthem','국가 연주',''],
    [3,'15:00','17:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','52랩 또는 120분']
  ],
  /* stage acts: [day, stage, artist, start, end | null] — Silverstone entertainment guide (2026-06-25) publishes start times only */
  acts: [
    [0,'mainstage','Women in Motorsport panel','13:45',null],[0,'mainstage','F1 Academy panels','14:15',null],
    [0,'mainstage','Anne-Marie','19:30',null],[0,'mainstage','David Guetta presents The Monolith','21:00',null],
    [0,'t1','John Newman','23:15',null],
    [1,'garage','Comedy Club: Jack Whitehall, Lou Sanders, Fin Taylor','18:30',null],
    [1,'mainstage','Alex James Britpop Classical','19:25',null],[1,'mainstage','Richard Ashcroft','21:15',null],
    [1,'t1','Rudimental','23:15',null],
    [2,'mainstage','F1 Explains Podcast with Jenson Button','10:10',null],
    [2,'garage','Comedy Club: Paul Chowdhry, Grace Campbell, Jack Skipper','18:30',null],
    [2,'mainstage','Jazzy','19:20',null],[2,'mainstage','RAF Falcons jump display','20:10',null],[2,'mainstage','Chase & Status','21:00',null],
    [2,'t1','Pendulum DJ Set','23:15',null],
    [3,'mainstage','P1 with Matt & Tommy Live Podcast','10:40',null],
    [3,'mainstage','Vikkstar DJ Set','19:45',null],[3,'mainstage','James Arthur','21:00',null]
  ],
  /* stages whose acts have no published times */
  tba: [
    {stage:'t1', name:'T1 Enclosure', days:'날짜 미발표', acts:['MK']}
  ],
  quietTitles: ['국가 연주'],
  series: {f1:{code:'F1', cls:'f1'}, f2:{code:'F2', cls:'', noRound:true}, f3:{code:'F3', cls:'', noRound:true}, f1a:{code:'F1 ACADEMY', cls:'', noRound:true}, f1d:{code:'F1', cls:'', noRound:true}, mcl:{code:'MCLAREN', cls:'', noRound:true}, pw:{code:'PIT WALK', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'hama',name:'Hamilton Straight A',zl:'',zones:null,seat:'hama',sub:'출발 그리드·F1 피트 앞 지정석'},
    {id:'hamb',name:'Hamilton Straight B',zl:'',zones:null,seat:'hamb',sub:'출발 그리드·F1 피트 앞 지정석'},
    {id:'abbeya',name:'Abbey A',zl:'',zones:null,seat:'abbeya',sub:'1번 코너 지정석'},
    {id:'abbeyb',name:'Abbey B',zl:'',zones:null,seat:'abbeyb',sub:'1번 코너 지정석'},
    {id:'farm',name:'Farm Curve',zl:'',zones:null,seat:'farm',sub:'2번 코너 지정석'},
    {id:'villagea',name:'Village A',zl:'',zones:null,seat:'villagea',sub:'3번 코너 지정석'},
    {id:'villageb',name:'Village B',zl:'',zones:null,seat:'villageb',sub:'3번 코너 지정석'},
    {id:'luffield',name:'Luffield',zl:'',zones:null,seat:'luffield',sub:'6·7번 코너 지정석'},
    {id:'luffcorner',name:'Luffield Corner',zl:'',zones:null,seat:'luffcorner',sub:'6·7번 코너 지정석'},
    {id:'woodcotea',name:'Woodcote A',zl:'',zones:null,seat:'woodcotea',sub:'8번 코너 지정석'},
    {id:'woodcoteb',name:'Woodcote B',zl:'',zones:null,seat:'woodcoteb',sub:'8번 코너 지정석'},
    {id:'woodcotec',name:'Woodcote C',zl:'',zones:null,seat:'woodcotec',sub:'8번 코너 지정석'},
    {id:'nps',name:'National Pit Straight',zl:'',zones:null,seat:'nps',sub:'National Pits Straight 지정석'},
    {id:'stirlinga',name:'Stirling A',zl:'',zones:null,seat:'stirlinga',sub:'National Pits Straight 끝 지정석'},
    {id:'stirlingb',name:'Stirling B',zl:'',zones:null,seat:'stirlingb',sub:'National Pits Straight 끝 지정석'},
    {id:'copsea',name:'Copse A',zl:'',zones:null,seat:'copsea',sub:'9번 코너 지정석'},
    {id:'copseb',name:'Copse B',zl:'',zones:null,seat:'copseb',sub:'9번 코너 지정석'},
    {id:'copsec',name:'Copse C',zl:'',zones:null,seat:'copsec',sub:'9번 코너 지정석'},
    {id:'copsed',name:'Copse D',zl:'',zones:null,seat:'copsed',sub:'9번 코너 지정석'},
    {id:'becketts',name:'Becketts',zl:'',zones:null,seat:'becketts',sub:'Maggotts–Becketts 지정석'},
    {id:'chapel',name:'Chapel',zl:'',zones:null,seat:'chapel',sub:'14번 코너 지정석'},
    {id:'lando',name:'Landostand',zl:'',zones:null,seat:'lando',sub:'15번 코너 Stowe 지정석 · 티셔츠와 리스트밴드 포함'},
    {id:'vale',name:'Vale',zl:'',zones:null,seat:'vale',sub:'16번 코너 지정석'},
    {id:'cluba',name:'Club A',zl:'',zones:null,seat:'cluba',sub:'17·18번 코너 지정석'},
    {id:'clubcorner',name:'Club Corner',zl:'',zones:null,seat:'clubcorner',sub:'17·18번 코너 지정석'},
    {id:'gpabbey',name:'Abbey GA Plus',zl:'',zones:null,seat:'gpabbey',sub:'1번 코너 GA+ 지정 입석 구역'},
    {id:'gpluffcomplex',name:'Luffield Complex GA Plus',zl:'',zones:null,seat:'gpluffcomplex',sub:'Luffield 구간 GA+ 지정 입석 구역'},
    {id:'gpluffield',name:'Luffield Terrace GA Plus',zl:'',zones:null,seat:'gpluffield',sub:'Luffield 구간 GA+ 지정 입석 구역'},
    {id:'gpcopsea',name:'Copse A GA Plus',zl:'',zones:null,seat:'gpcopsea',sub:'9번 코너 GA+ 지정 입석 구역'},
    {id:'gpcopsec',name:'Copse C GA Plus',zl:'',zones:null,seat:'gpcopsec',sub:'9번 코너 GA+ 지정 입석 구역'},
    {id:'gplando',name:'Landostand GA Plus',zl:'',zones:null,seat:'gplando',sub:'Landostand 옆 GA+ 지정 입석 구역'},
    {id:'ga',name:'General Admission',zl:'',zones:null,seat:null,sub:'서킷 곳곳의 GA 관람 구역 · 지정석 없음'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 실버스톤 티켓 안내 기준이에요. 그랜드스탠드는 금~일 지정석이고 GA 입장이 함께 포함돼요. 모든 티켓에 공연, 엔터테인먼트 구역, F1 Fanzone, Silverstone Museum 입장이 포함돼요.',
  tl: { from: 7*60, to: 24*60, rows: ['mainstage','garage','t1'], names: {mainstage:'M&S Mainstage',garage:'Garage',t1:'T1 Enclosure'}, trackTag: '<span class="stag f1">F1 <span class="rd">외 3</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>GA 관람 구역에서 볼 수 있는지 현장 안내를 확인하세요.',
  searchPh: '아티스트, 무대, 관람석, 게이트, 셔틀',
  quick: ['David Guetta','Chase & Status','James Arthur','M&S Mainstage','Landostand','Copse','Bus Hub','15번 코너'],
  presets: [
    {d:0,t:'21:00',l:'David Guetta 공연 시작'},
    {d:1,t:'12:20',l:'연습 주행 1 · 10분 전'}, {d:1,t:'16:20',l:'스프린트 예선 · 10분 전'},
    {d:2,t:'12:10',l:'스프린트 진행 중'}, {d:2,t:'15:50',l:'예선 · 10분 전'},
    {d:3,t:'14:30',l:'결승 · 30분 전'}, {d:3,t:'15:50',l:'결승 진행 중'}
  ],
  demoRange: [7*60, 24*60-1],
  /* categories of the 2026 map legend that were placed (Baby Changing, Wellbeing Hub: no fitting icon, NOTES.md) */
  amen: {wc:['wc','화장실'],awc:['wc','장애인 화장실'],water:['drop','식수대'],aid:['aid','응급 처치'],hdu:['aid','의료 지원 (HDU)'],info:['info','팬 서비스 안내'],access:['eye','장애인 관람 구역'],ga:['eye','GA 관람 구역']},
  amenLegend: [['wc','화장실'],['drop','식수대'],['aid','응급 처치 · 의료 지원'],['info','팬 서비스 안내'],['eye','GA · 장애인 관람 구역']],
  info: {
    title: '영국 그랑프리 서킷 맵',
    sub: '실버스톤 서킷 · 5.891km · 18개 코너 · 결승 52랩 · 시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 중앙값 1m, 최대 5m 차이예요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-10-04판에서 건물·도로·물가·풀밭·피트레인을 그대로 그렸어요'],
      ['코너 번호·결승선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요. 출발선은 2026 관람 지도에 그려진 위치예요'],
      ['트랙 세션 시간', 'FIA 2026 통합 타임테이블 V4(7월 3일)와 Formula 1 공식 일정 · 목요일은 실버스톤 2026 미디어 가이드 기준 · 영국 시간(BST · UTC+1) · 바뀔 수 있어요'],
      ['무대 공연', '실버스톤 2026 엔터테인먼트 가이드(6월 25일)와 라인업 발표(3월 16일) · 시작 시각만 발표됐어요 · 지도에 위치가 없는 Made at Vale·Drivers Inn 프로그램은 넣지 않았어요 · 바뀔 수 있어요'],
      ['관람석·GA+·게이트·편의시설', '2026 실버스톤 관람 지도(2026 F1 GB Wayfinding Map, gpdestinations.com 게시본)를 트랙에 맞춰 실측 지도 위로 옮겼어요. 공식 맵은 축척이 없는 안내도라 트랙에서 먼 곳일수록 오차가 커요. 관람석에서 보이는 구간은 추정치예요'],
      ['관람석 설명', '실버스톤 공식 관람석 안내(2026)를 따랐어요. 지붕 여부는 실버스톤 고객센터 안내(2026-09 갱신), GA+ 구역 설명은 고객센터 2027 안내 기준이에요'],
      ['게이트·셔틀', 'Park & Ride는 실버스톤 2026 대회 안내(6월 23일), 셔틀·코치 하차 위치와 운행 시간은 2027 대회로 바뀐 교통 안내 페이지 기준이에요. 게이트 여는 시각은 공식 고객센터 안내(연도 표기 없음)예요'],
      ['랜드마크', 'Silverstone Museum·Hilton Garden Inn 위치는 OpenStreetMap, 나머지는 2026 관람 지도 기준이에요'],
      ['티켓', '실버스톤 2026 티켓 가격 안내(2025-09-08)와 관람석 FAQ(2026-05-27) 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
