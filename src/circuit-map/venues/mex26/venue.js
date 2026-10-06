// 멕시코시티 GP 2026 (아우토드로모 에르마노스 로드리게스) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
/* zones — keys are strings; evt zone keys are 'z'+key. Areas = the colour zones of the 2026 official map (mgp-mapa-2026-v03) */
const Z = {
  verde: {badge:'ZONA VERDE', short:'VERDE', name:'Zona Verde'},
  naranja: {badge:'ZONA NARANJA', short:'NARANJA', name:'Zona Naranja'},
  azul: {badge:'ZONA AZUL', short:'AZUL', name:'Zona Azul'},
  rosa: {badge:'ZONA ROSA', short:'ROSA', name:'Zona Rosa'},
  amarilla: {badge:'ZONA AMARILLA', short:'AMARILLA', name:'Zona Amarilla'},
  gris: {badge:'ZONA GRIS', short:'GRIS', name:'Zona Gris'},
  cafe: {badge:'ZONA CAFÉ', short:'CAFÉ', name:'Zona Café'}
};
export default {
  id: 'mex26',
  raceId: 'f1-2026-19-mexicocitygrandprix',
  round: 'R19',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: -99.0969, lat0: 19.4064, kxLat: 19.4017 },
  tz: { off: -6, abbr: 'CST', name: '멕시코시티 시간', utc: 'UTC-6' },
  day0: [2026, 9, 30],
  days: [{d:'10.30',w:'금',en:'FRI'},{d:'10.31',w:'토',en:'SAT'},{d:'11.01',w:'일',en:'SUN'}],
  title: '멕시코시티 그랑프리',
  heroEn: 'Formula 1 Gran Premio de la Ciudad de México',
  markup: { aria: '멕시코시티 아우토드로모 에르마노스 로드리게스 지도', circuit: '아우토드로모 에르마노스 로드리게스', dates: '10.30–11.01' },
  overtake: [1],
  geoBox: [-800, 2000, -500, 1550],
  /* zone-gated access: 'La puerta de acceso depende de la Grada, Hospitalidad y zona indicada en tu boleto' (2026 /accesos) */
  zones: Z,
  zoneNote: {
    verde: 'Zona Verde · Grada 1·2와 Zona Accesible(Verde) 티켓 구역이에요. Puerta 4·6·7로 들어가요',
    naranja: 'Zona Naranja · Grada 2A 티켓 구역이에요. Puerta 8로만 들어가요',
    azul: 'Zona Azul · Grada 3A·4·5·5A·6·6A·6B와 Zona Accesible(Azul) 티켓 구역이에요. Puerta 9·12로 들어가요',
    rosa: 'Zona Rosa · Grada 8·9 티켓 구역이에요. Puerta 12로 들어가요',
    amarilla: 'Zona Amarilla · Grada 7·10·11 티켓 구역이에요. Puerta 13·14로 들어가요',
    gris: 'Zona Gris · Grada 14(Foro Sol Sur)와 Boxes Oro Sur 티켓 구역이에요. Palacio de los Deportes 쪽 Puerta 2로 들어가요',
    cafe: 'Zona Café · Grada 15(Foro Sol Norte)와 Boxes Oro Norte 티켓 구역이에요. Palacio de los Deportes 쪽 Puerta 1로 들어가요'
  },
  /* guide grandstands (2026 public tickets). Outline = 2026 official map block (Foro Sol: OSM stand buildings), see NOTES.md */
  spots: [
    {id:'g1',name:'Grada 1',zone:'verde',xy:[343.0,-15.8],R:160,L:190,tags:['start'],desc:'메인 직선의 Main Grandstand 1이에요. 개막 행사, 출발, 피트 스톱, 체커기를 한자리에서 봐요. 반지붕이 있어요.'},
    {id:'g2',name:'Grada 2',zone:'verde',xy:[483.6,3.8],R:160,L:114,tags:['start'],desc:'메인 직선의 Main Grandstand 2예요. 개막 행사, 출발, 피트 스톱, 체커기를 한자리에서 봐요. 반지붕이 있어요.'},
    {id:'accv',name:'Zona Accesible (Zona Verde)',kind:'장애인석',zone:'verde',xy:[635.2,24.7],R:140,L:60,tags:['start'],desc:'장애인 전용 좌석이에요. 메인 직선과 피트가 보이고, 출발과 피트 스톱, 체커기를 봐요. 지붕은 없어요.'},
    {id:'g2a',name:'Grada 2A',zone:'naranja',xy:[976.6,58.8],R:460,L:223,tags:[],desc:'메인 직선 한가운데 좌석이에요. 1번 코너까지 보이고, 시속 360km로 달리는 차를 느껴요. 지붕은 없어요.'},
    {id:'g3a',name:'Grada 3A',zone:'azul',xy:[1360.2,116.1],R:160,L:84,tags:['mrt'],desc:'1번 코너 앞, 메인 직선 끝 좌석이에요. 시속 300km 넘는 속도에서 브레이크를 밟는 순간을 봐요. 지붕은 없어요.'},
    {id:'g4',name:'Grada 4',zone:'azul',xy:[1500.3,150.1],R:200,L:79,tags:['mrt'],desc:'Complejo Moisés Solana(1~3번 코너)를 옆에서 봐요. 메인 직선 끝 브레이킹부터 백 스트레이트 진입까지 보여요. 지붕은 없어요.'},
    {id:'g5',name:'Grada 5',zone:'azul',xy:[1541.9,221.0],R:200,L:90,tags:['overtake','mrt'],desc:'메인 직선 끝과 1~3번 코너, 백 스트레이트 진입을 정면에서 봐요. 지붕은 없어요.'},
    {id:'g5a',name:'Grada 5A',zone:'azul',xy:[1378.3,280.6],R:140,L:177,tags:[],desc:'Complejo Moisés Solana 안쪽 좌석이에요. 1~3번 코너와 백 스트레이트가 보여요. 지붕은 없어요.'},
    {id:'g6',name:'Grada 6',zone:'azul',xy:[1502.0,323.6],R:200,L:107,tags:[],desc:'1~3번 코너를 정면에서 보고, 백 스트레이트로 풀 스피드로 나가는 차를 봐요. 지붕은 없어요.'},
    {id:'g6b',name:'Grada 6B',zone:'azul',xy:[1474.1,384.4],R:160,L:50,tags:[],desc:'시속 300km 넘는 차의 속도를 느끼는 좌석이에요. 지붕은 없어요.'},
    {id:'acca',name:'Zona Accesible (Zona Azul)',kind:'장애인석',zone:'azul',xy:[1437.8,458.6],R:200,L:36,tags:[],desc:'장애인 전용 좌석이에요. 트랙과 같은 높이에서 레이스를 봐요. 지붕은 없어요.'},
    {id:'g6a',name:'Grada 6A',zone:'azul',xy:[1320.0,672.4],R:310,L:135,tags:[],desc:'백 스트레이트 좌석이에요. 시속 300km 넘는 차가 4번 코너에 들어가려고 감속하는 모습을 가까이서 봐요. 지붕은 없어요.'},
    {id:'g7',name:'Grada 7',zone:'amarilla',xy:[1213.6,919.7],R:260,L:87,tags:[],desc:'시속 300km에서 브레이크를 밟고 4번 코너로 들어가는 차를 가장 먼저 봐요. 백 스트레이트와 4~8번 코너가 보여요. 지붕은 없어요.'},
    {id:'g8',name:'Grada 8',zone:'rosa',xy:[1167.8,778.6],R:270,L:85,tags:['overtake'],desc:'백 스트레이트와 4~8번 코너가 보여요. 추월 기회가 많은 구간이에요. 지붕은 없어요.'},
    {id:'g9',name:'Grada 9',zone:'rosa',xy:[1114.2,780.8],R:120,L:68,tags:[],desc:'서킷에서 가장 기술적인 구간 가운데 하나예요. 스타디움 구역 쪽으로 달려가는 차를 봐요. 지붕은 없어요.'},
    {id:'g10',name:'Grada 10',zone:'amarilla',xy:[1024.3,1056.8],R:250,L:84,tags:[],desc:'백 스트레이트를 정면에서 보고, 4~8번 코너에서 감속하는 차를 봐요. 반지붕이 있어요.'},
    {id:'g11',name:'Grada 11',zone:'amarilla',xy:[1015.2,946.7],R:260,L:144,tags:[],desc:'백 스트레이트와 4~8번 코너가 보이는 기술적인 구간 좌석이에요. 반지붕이 있어요.'},
    {id:'g14',name:'Grada 14 (Foro Sol Sur)',zone:'gris',xy:[68.6,197.6],R:180,L:163,tags:['podium','overtake','stage'],desc:'Estadio GNP Seguros 남쪽 관람석이에요. 스타디움 코너와 추월, 포디움 세리머니를 봐요. 반지붕이 있어요.'},
    {id:'g15',name:'Grada 15 (Foro Sol Norte)',zone:'cafe',xy:[81.0,71.5],R:150,L:164,tags:['podium','overtake','stage'],desc:'Estadio GNP Seguros 북쪽 관람석이에요. 바로 앞 코너와 추월, 포디움 세리머니를 봐요. 지붕은 없어요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands) */
  standOf: {g1:'g1',g2:'g2',accv:'accv',g2a:'g2a',g3a:'g3a',g4:'g4',g5:'g5',g5a:'g5a',g6:'g6',g6b:'g6b',acca:'acca',g6a:'g6a',g7:'g7',g8:'g8',g9:'g9',g10:'g10',g11:'g11',g14:'g14',g15:'g15'},
  extraStands: ['plpa','ppb','g3','ppss','splss'],   // on the 2026 map and named in 2026 official text, not sold as public grandstands
  stages: [
    {id:'aftershow',name:'After Show · Estadio GNP Seguros',short:'After Show',zone:null,xy:[145.0,170.0],desc:'Estadio GNP Seguros에서 열리는 México GP 2026 마무리 공연이에요. 날짜와 시각, 입장할 수 있는 티켓은 아직 발표되지 않았어요. 무대 위치도 발표되지 않아 스타디움 안에 표시했어요.'}
  ],
  /* entrance gates (Puertas): positions = 2025 official access map icons; which tickets use them = 2026 /accesos page.
     Puerta 2 (Zona Gris) and Puerta 11 (Sports Lounge) are in the 2026 text but have no published position. */
  gates: [
    {id:'g1',n:'',name:'Puerta 1',side:'cafe',desc:'Zona Café(Grada 15, Boxes Oro Norte, Boxes Diamante Norte) 입구예요. Palacio de los Deportes에 있어요.'},
    {id:'g4',n:'',name:'Puerta 4',side:'verde',desc:'Platino Plus A 등 Zona Verde 일부 상품의 입구예요.'},
    {id:'g6',n:'',name:'Puerta 6',side:'verde',desc:'Main Grandstand(Grada 1·2)와 Paddock Club 등 Zona Verde 대부분이 이 게이트로 들어가요. 2025 매표소 안내 기준 Sala de Armas 앞이에요.'},
    {id:'g7',n:'',name:'Puerta 7',side:'verde',desc:'Zona Accesible(Verde)와 Paddock Club 입구예요.'},
    {id:'g8',n:'',name:'Puerta 8',side:'naranja',desc:'Zona Naranja(Grada 2A)는 이 게이트로만 들어가요. Platino Plus S도 여기로 들어가요.'},
    {id:'g9',n:'',name:'Puerta 9',side:'azul',desc:'Grada 3·3A·4·5와 Zona Plus(3A·4·5) 입구예요. 2025 매표소 안내 기준 Metro Puebla역 바로 옆이에요.'},
    {id:'g12',n:'',name:'Puerta 12',side:'azul',desc:'Grada 5A·6·6A·6B(Zona Azul)와 Grada 8·9(Zona Rosa) 입구예요. 2025 매표소 안내 기준 Av. Canal de Churubusco에 있어요.'},
    {id:'g13',n:'',name:'Puerta 13',side:'amarilla',desc:'Grada 7 입구예요. 2025 매표소 안내 기준 Av. Canal de Churubusco와 Añil 교차로 가까이에 있어요.'},
    {id:'g14',n:'',name:'Puerta 14',side:'amarilla',desc:'Grada 10·11과 Speed Lounge Amarillo 입구예요. 2025 매표소 안내 기준 Av. Añil에 있어요.'}
  ],
  gateDesc: g => g.desc + ' 위치는 2025 공식 출입구 지도 기준이에요. 게이트는 8시쯤 열리고, 한 번 나가면 다시 들어올 수 없어요.',
  transit: {
    items: [
    {id:'velodromo',name:'Velódromo',codes:['Línea 9']},
    {id:'cdeportiva',name:'Ciudad Deportiva',codes:['Línea 9']},
    {id:'puebla',name:'Puebla',codes:['Línea 9'],note:'Metro 9호선 역이에요. 2025 매표소 안내 기준 Puerta 9가 역 바로 옆에 있어요.'},
    {id:'iztacalco',name:'Iztacalco',codes:['Metrobús Línea 2'],note:'Metrobús 2호선 정류장이에요. 요금은 6페소예요.'},
    {id:'upiicsa',name:'UPIICSA',codes:['Metrobús Línea 2'],note:'Metrobús 2호선 정류장이에요. 요금은 6페소예요.'}
  ],
    xy: {velodromo:[-648,-239],cdeportiva:[583,-229],puebla:[1515,-90],iztacalco:[100,1091],upiicsa:[684,1379]},   // OSM station / stop nodes
    layer: 'Metro·Metrobús', kicker: 'Metro·Metrobús', short: 'Metro', near: '메트로와 가까운', suffix: '역', aria: ' 역 ',
    note: 'Metro 9호선(Línea 9) 역은 게이트에서 가까워요. 요금은 5페소예요. 경기장 바깥을 도는 무료 셔틀(2025 지도 표기 Autobús Periferia)이 7~20시에 다니고, 경기 티켓이 있어야 타요.',
    icon: 'train'
  },
  village: {
    items: [
    {id:'palacio',name:'Palacio de los Deportes',label:'Palacio de los Deportes',zone:null,xy:[-305.0,123.0],desc:'Zona Gris·Zona Café 티켓을 위한 서비스 구역이에요. 푸드코트, Beer Garden, 공식 굿즈, F1 Game Zone이 있어요.'}
  ],
    label: '서비스 구역', desc: ''
  },
  /* landmarks — OpenStreetMap positions (metres). r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'Palacio de los Deportes',xy:[-305,123],r:1},
    {t:'Estadio GNP Seguros',xy:[100,270],r:1},
    {t:'Estadio Alfredo Harp Helú',xy:[1224,301],r:2},
    {t:'Velódromo Olímpico Agustín Melgar',xy:[-681,-374],r:3}
  ],
  /* schedule (local time CST, as published): [day, start, end, series, English, Korean, note] */
  track: [
    [0,'08:40','09:15','gtm','GTM Super Copa · Practice Session','GTM 슈퍼 코파 연습',''],
    [0,'09:40','10:05','mh','Masters Historic · Practice Session','마스터스 히스토릭 연습',''],
    [0,'10:30','10:55','f4','Formula 4 NACAM Championship · Practice Session','F4 NACAM 챔피언십 연습',''],
    [0,'12:30','13:30','f1','Formula 1 · First Practice Session','F1 연습 주행 1',''],
    [0,'14:00','14:25','gtm','GTM Super Copa · Qualifying Session','GTM 슈퍼 코파 예선',''],
    [0,'16:00','17:00','f1','Formula 1 · Second Practice Session','F1 연습 주행 2',''],
    [0,'17:30','17:55','mh','Masters Historic · Qualifying Session','마스터스 히스토릭 예선',''],
    [1,'09:25','09:50','f4','Formula 4 NACAM Championship · Qualifying Session','F4 NACAM 챔피언십 예선',''],
    [1,'10:15','10:45','gtm','GTM Super Copa · First Race','GTM 슈퍼 코파 레이스 1','25분'],
    [1,'11:30','12:30','f1','Formula 1 · Third Practice Session','F1 연습 주행 3',''],
    [1,'12:55','13:25','mh','Masters Historic · First Race','마스터스 히스토릭 레이스 1','25분'],
    [1,'15:00','16:00','f1','Formula 1 · Qualifying Session','F1 예선',''],
    [1,'16:45','17:15','f4','Formula 4 NACAM Championship · First Race','F4 NACAM 챔피언십 레이스 1','25분'],
    [2,'09:15','09:45','gtm','GTM Super Copa · Second Race','GTM 슈퍼 코파 레이스 2','25분'],
    [2,'10:10','10:40','mh','Masters Historic · Second Race','마스터스 히스토릭 레이스 2','25분'],
    [2,'11:05','11:35','f4','Formula 4 NACAM Championship · Second Race','F4 NACAM 챔피언십 레이스 2','25분'],
    [2,'12:00','12:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [2,'13:44','13:46','cer','National Anthem','국가 연주',''],
    [2,'14:00','16:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','71랩 또는 120분']
  ],
  /* stage acts: [day, stage, artist, start, end | null] — no act has a published time */
  acts: [],
  /* stages whose acts have no published times */
  tba: [
    {stage:'aftershow', name:'After Show · Estadio GNP Seguros', days:'날짜 미발표', acts:['Disclosure DJ-Set']}
  ],
  quietTitles: ['국가 연주'],
  series: {f1:{code:'F1', cls:'f1'}, gtm:{code:'GTM', cls:'', noRound:true}, mh:{code:'MASTERS', cls:'', noRound:true}, f4:{code:'F4 NACAM', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'g1',name:'Grada 1 (Main Grandstand 1)',badge:'ZONA VERDE',zl:'VERDE',zones:['verde'],seat:'g1',sub:'출발·피니시 직선 · 반지붕 지정석'},
    {id:'g2',name:'Grada 2 (Main Grandstand 2)',badge:'ZONA VERDE',zl:'VERDE',zones:['verde'],seat:'g2',sub:'출발·피니시 직선 · 반지붕 지정석'},
    {id:'accv',name:'Zona Accesible · Zona Verde',badge:'ZONA VERDE',zl:'VERDE',zones:['verde'],seat:'accv',sub:'장애인 전용 · 메인 직선과 피트'},
    {id:'g2a',name:'Grada 2A',badge:'ZONA NARANJA',zl:'NARANJA',zones:['naranja'],seat:'g2a',sub:'메인 직선 한가운데 · 지붕 없음'},
    {id:'g3a',name:'Grada 3A',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:'g3a',sub:'1번 코너 앞 · 지붕 없음'},
    {id:'g4',name:'Grada 4',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:'g4',sub:'1~3번 코너 옆 · 지붕 없음'},
    {id:'g5',name:'Grada 5',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:'g5',sub:'1~3번 코너 정면 · 지붕 없음'},
    {id:'g5a',name:'Grada 5A',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:'g5a',sub:'1~3번 코너 안쪽 · 지붕 없음'},
    {id:'g6',name:'Grada 6',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:'g6',sub:'1~3번 코너 정면 · 지붕 없음'},
    {id:'g6a',name:'Grada 6A',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:'g6a',sub:'백 스트레이트 · 지붕 없음'},
    {id:'g6b',name:'Grada 6B',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:'g6b',sub:'지붕 없음'},
    {id:'acca',name:'Zona Accesible · Zona Azul',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:'acca',sub:'장애인 전용 · 트랙과 같은 높이'},
    {id:'zplus',name:'Zona Plus Banamex (Grada 3A·4·5·6)',badge:'ZONA AZUL',zl:'AZUL',zones:['azul'],seat:null,sub:'Grada 3A·4·5·6 업그레이드 · 반지붕 라운지(9~18:30)'},
    {id:'g7',name:'Grada 7',badge:'ZONA AMARILLA',zl:'AMARILLA',zones:['amarilla'],seat:'g7',sub:'4번 코너 브레이킹 · 지붕 없음'},
    {id:'g8',name:'Grada 8',badge:'ZONA ROSA',zl:'ROSA',zones:['rosa'],seat:'g8',sub:'백 스트레이트·4~8번 코너 · 지붕 없음'},
    {id:'g9',name:'Grada 9',badge:'ZONA ROSA',zl:'ROSA',zones:['rosa'],seat:'g9',sub:'스타디움 쪽으로 가는 구간 · 지붕 없음'},
    {id:'g10',name:'Grada 10',badge:'ZONA AMARILLA',zl:'AMARILLA',zones:['amarilla'],seat:'g10',sub:'백 스트레이트·4~8번 코너 · 반지붕'},
    {id:'g11',name:'Grada 11',badge:'ZONA AMARILLA',zl:'AMARILLA',zones:['amarilla'],seat:'g11',sub:'백 스트레이트·4~8번 코너 · 반지붕'},
    {id:'g14',name:'Grada 14 (Foro Sol Sur)',badge:'ZONA GRIS',zl:'GRIS',zones:['gris'],seat:'g14',sub:'Estadio GNP Seguros·포디움 · 반지붕'},
    {id:'bos',name:'Boxes Oro Sur',badge:'ZONA GRIS',zl:'GRIS',zones:['gris'],seat:null,sub:'Estadio GNP Seguros 남쪽 박스석'},
    {id:'g15',name:'Grada 15 (Foro Sol Norte)',badge:'ZONA CAFÉ',zl:'CAFÉ',zones:['cafe'],seat:'g15',sub:'Estadio GNP Seguros·포디움 · 지붕 없음'},
    {id:'bon',name:'Boxes Oro Norte',badge:'ZONA CAFÉ',zl:'CAFÉ',zones:['cafe'],seat:null,sub:'Estadio GNP Seguros 북쪽 박스석 · 음식과 오픈 바 포함'},
    {id:'gtour',name:'Grand Tour (Diamond·Platinum·Gold A)',badge:'GRAND TOUR',zl:'TOUR',zones:['amarilla','azul','gris'],seat:null,sub:'사흘 동안 Grada 7·Grada 4·Box Oro Sur에 하루씩 · 상품마다 요일 순서가 달라요'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '들어갈 수 있는 구역과 내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 México GP 티켓 페이지와 출입 안내 기준이에요. 티켓에 적힌 구역(Zona)과 게이트로만 들어갈 수 있고, 한 번 나가면 다시 들어올 수 없어요. 구역 경계는 2026 공식 지도의 색 구역을 따랐어요.',
  tl: { from: 8*60, to: 19*60, rows: [], names: {}, trackTag: '<span class="stag f1">F1 <span class="rd">외 3</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>내 티켓 구역에서 보이는지 현장 안내를 확인하세요.',
  searchPh: '아티스트, 무대, 관람석, 게이트, 역',
  quick: ['Disclosure','Grada 14','Grada 2A','Palacio de los Deportes','Puerta 6','Puebla','1번 코너'],
  presets: [
    {d:0,t:'08:00',l:'게이트 오픈'}, {d:0,t:'12:20',l:'연습 주행 1 · 10분 전'},
    {d:1,t:'14:50',l:'예선 · 10분 전'}, {d:1,t:'15:30',l:'예선 진행 중'},
    {d:2,t:'13:30',l:'결승 · 30분 전'}, {d:2,t:'14:40',l:'결승 진행 중'}
  ],
  demoRange: [7*60, 20*60],
  amen: {wc:['wc','화장실'],fnb:['food','먹거리'],bar:['bar','음료·바'],water:['drop','물'],aid:['aid','의료 지원'],info:['info','안내'],merch:['shirt','F1 굿즈'],screen:['screen','대형 스크린']},
  amenLegend: [['wc','화장실'],['food','먹거리'],['bar','음료·바'],['drop','물'],['aid','의료 지원'],['info','안내'],['shirt','굿즈'],['screen','대형 스크린']],
  info: {
    title: '멕시코시티 그랑프리 서킷 맵',
    sub: '아우토드로모 에르마노스 로드리게스 · 4.304km · 17개 코너 · 결승 71랩 · 시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 중앙값 1m 차이예요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-09-27판에서 건물·도로·물가·풀밭·피트레인·Metro 출구를 그대로 그렸어요'],
      ['코너 번호·출발선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요'],
      ['트랙 세션 시간', 'Formula 1 공식 타임테이블(2026)과 México GP 주최측 일정 · 멕시코시티 시간(CST · UTC-6) · 바뀔 수 있어요'],
      ['무대 공연', 'México GP 2026 After Show 발표(10월 1일) · 날짜와 시각은 아직 발표되지 않았어요'],
      ['구역·관람석', 'México GP 2026 공식 지도(2026-07-31 게시)의 색 구역과 관람석을 트랙에 맞춰 실측 지도 위로 옮겼어요. 2026 지도에는 이름이 없어 어느 블록이 어느 관람석인지는 2025 공식 출입구 지도로 확인했어요. Grada 14·15는 OpenStreetMap의 Foro Sol 관람석 건물 윤곽이에요. 관람석에서 보이는 구간은 추정치예요'],
      ['게이트·셔틀 정류장', '위치는 2025 공식 출입구 지도(Mapa de accesos) 기준이에요. 게이트별 입장 구역은 2026 출입 안내 기준이고, 위치가 발표되지 않은 Puerta 2·11은 넣지 않았어요'],
      ['편의시설', '2025 공식 서비스 지도(Mapa de servicios) 기준이에요. 2026 서비스 지도는 아직 나오지 않았어요'],
      ['티켓', 'México GP 2026 티켓 페이지(boletos)와 출입 안내(accesos) 기준이에요'],
      ['Metro·Metrobús', '역 위치는 OpenStreetMap · 노선과 요금, 무료 셔틀은 주최측 2026 교통 안내(Cómo llegar) 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
