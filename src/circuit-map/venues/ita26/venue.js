// 이탈리아 GP 2026 (아우토드로모 나치오날레 몬차) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
export default {
  id: 'ita26',
  raceId: 'f1-2026-13-italiangrandprix',
  round: 'R13',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: 9.2807, lat0: 45.6314, kxLat: 45.6234 },
  tz: { off: 2, abbr: 'CEST', name: '몬차 시간', utc: 'UTC+2' },
  day0: [2026, 8, 4],
  days: [{d:'09.04',w:'금',en:'FRI'},{d:'09.05',w:'토',en:'SAT'},{d:'09.06',w:'일',en:'SUN'}],
  title: '이탈리아 그랑프리',
  heroEn: 'Formula 1 Pirelli Gran Premio d’Italia',
  markup: { aria: '아우토드로모 나치오날레 몬차 서킷 지도', circuit: '아우토드로모 나치오날레 몬차', dates: '09.04–06' },
  overtake: [1],   // formula1.com 2026 circuit page: Variante del Rettifilo (T1–T2) "one of the track's best overtaking spots"
  /* no pitFallback: OSM raceway 381687472 'Pit Lane' (east of the main straight) is in base.json */
  geoBox: [-500, 1750, -500, 2650],   // bacinger it-1922 bbox + 500 m; holds all 10 gates and Biassono-Lesmo Parco station
  /* no zone-gated access: numbered grandstands are reserved seats, GA (Circolare Prato) = the 6 'P' lawns of the 2026 map */
  zones: null,
  /* grandstands of the 2026 official price-list map (GP_F1_2026_LISTINO_PREZZI_6_17.pdf), code + official name.
     Roof and giant-screen flags: the TRIBUNA COPERTA / MAXISCHERMO icons of the same price list. R tuned in NOTES.md */
  spots: [
    {id:'s1',name:'1 Centrale',zone:null,R:220,L:80,tags:['start'],desc:'메인 직선 바깥쪽 메인 관람석이에요. 2026 지도의 출발선(START / GRID) 바로 옆이에요. 지붕이 있고 대형 스크린이 있어요.'},
    {id:'s2',name:'Gradinate Traguardo 2',zone:null,R:200,L:70,tags:['start'],desc:'출발선과 1번 코너 사이 메인 직선 바깥쪽, 맨 앞줄 계단식 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s3',name:'Gradinate Traguardo 3',zone:null,R:200,L:71,tags:['start'],desc:'출발선과 1번 코너 사이 메인 직선 바깥쪽, 맨 앞줄 계단식 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s4',name:'4 Laterale Sinistra',zone:null,R:200,L:147,tags:['start'],desc:'Gradinate Traguardo 2·3 뒤쪽, 메인 직선 바깥쪽 관람석이에요. 지붕이 있고 대형 스크린이 있어요.'},
    {id:'s5',name:'5 Piscina',zone:null,R:180,L:94,tags:[],desc:'1번 코너로 가는 메인 직선 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s6a',name:'6A Alta Velocità A',zone:null,R:180,L:90,tags:['landmark'],desc:'1번 코너 앞 직선 안쪽, 옛 고속 오벌 옆 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s6b',name:'6B Alta Velocità B',zone:null,R:180,L:90,tags:['overtake','landmark'],desc:'1번 코너 앞 직선 안쪽, 옛 고속 오벌 옆이에요. 첫 랩 혼전을 잘 볼 수 있는 자리예요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s6c',name:'6C Alta Velocità C',zone:null,R:180,L:93,tags:['overtake','landmark'],desc:'1번 코너를 바로 앞에서 보는 고속 오벌 옆 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s7',name:'7 Biassono',zone:null,R:180,L:103,tags:[],desc:'1번 코너 앞 직선 바깥쪽, Ex-Camping 구역 옆이에요. 걸을 수 있는 장애인 관람객을 위한 전용 구역이 있고, Gate B에서 200m예요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s8a',name:'8A Prima Variante Esterna A',zone:null,R:170,L:194,tags:['overtake'],desc:'1·2번 코너(Prima Variante) 바깥쪽 관람석이에요. 추월이 잦고 첫 랩 경합이 몰리는 곳이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s8b',name:'8B Prima Variante Esterna B',zone:null,R:170,L:192,tags:['overtake'],desc:'1·2번 코너(Prima Variante) 바깥쪽, 트랙 쪽 관람석이에요. 추월이 잦고 첫 랩 경합이 몰리는 곳이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s8bis',name:'8 BIS Uscita Prima Variante',zone:null,R:275,L:102,tags:['overtake'],desc:'Prima Variante를 빠져나가는 2번 코너 출구 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s9',name:'9 Seconda Variante',zone:null,R:170,L:65,tags:[],desc:'4·5번 코너(Seconda Variante) 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s10',name:'10 Roggia',zone:null,R:170,L:80,tags:[],desc:'4·5번 코너(Variante della Roggia)를 빠져나가는 곳 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s10bis',name:'10 BIS Lesmo 2 Interno',zone:null,R:160,L:67,tags:[],desc:'7번 코너(Seconda Curva di Lesmo) 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s11',name:'11 Serraglio',zone:null,R:170,L:75,tags:[],desc:'Lesmo와 Ascari 사이 Curva del Serraglio 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s12',name:'12 Ascari 3',zone:null,R:250,L:43,tags:[],desc:'Variante Ascari(8~10번 코너)로 들어가는 직선 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s13',name:'13 Ascari 4',zone:null,R:180,L:78,tags:[],desc:'Variante Ascari로 들어가는 직선 안쪽, 8번 코너 앞 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s14',name:'14 Ascari 2',zone:null,R:180,L:39,tags:[],desc:'Variante Ascari(8~10번 코너) 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s16',name:'16 Ascari',zone:null,R:200,L:91,tags:[],desc:'Variante Ascari를 빠져나가는 9·10번 코너 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s17a',name:'17A Ascari Esterna A',zone:null,R:210,L:76,tags:[],desc:'Variante Ascari 출구 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s17b',name:'17B Ascari Esterna B',zone:null,R:180,L:146,tags:[],desc:'Variante Ascari 출구 뒤 백 스트레이트 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s18',name:'18 Uscita Ascari A',zone:null,R:180,L:179,tags:[],desc:'Variante Ascari 출구 뒤 백 스트레이트 안쪽 관람석이에요. Fans Club 호스피탈리티 좌석이 여기 있어요. 지붕이 있고 대형 스크린이 있어요.'},
    {id:'s20',name:'20 Rettilineo Parabolica Esterna',zone:null,R:180,L:77,tags:[],desc:'Parabolica로 가는 백 스트레이트 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s21a',name:'21A Laterale Parabolica A',zone:null,R:190,L:77,tags:[],desc:'Parabolica(11번 코너) 앞 백 스트레이트 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s21b',name:'21B Laterale Parabolica B',zone:null,R:190,L:77,tags:[],desc:'Parabolica(11번 코너) 앞 백 스트레이트 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s21c',name:'21C Laterale Parabolica C',zone:null,R:190,L:78,tags:[],desc:'Parabolica(11번 코너) 앞 백 스트레이트 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s21d',name:'21D Laterale Parabolica D',zone:null,R:190,L:77,tags:[],desc:'Parabolica(11번 코너) 앞 백 스트레이트 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s21e',name:'21E Laterale Parabolica E',zone:null,R:190,L:77,tags:[],desc:'Parabolica(11번 코너) 앞 백 스트레이트 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s22',name:'22 Parabolica',zone:null,R:200,L:106,tags:[],desc:'11번 코너 Curva Alboreto(Parabolica) 바깥쪽 관람석이에요. 지붕이 있고 대형 스크린이 있어요.'},
    {id:'s23a',name:'23A Parabolica Interna A',zone:null,R:190,L:77,tags:[],desc:'Parabolica를 빠져나온 메인 직선 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s23b',name:'23B Parabolica Interna B',zone:null,R:190,L:78,tags:[],desc:'Parabolica를 빠져나온 메인 직선 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s24',name:'24 Vedano',zone:null,R:190,L:190,tags:[],desc:'Parabolica를 빠져나온 메인 직선 바깥쪽, Vedano A~C 뒤쪽 관람석이에요. 지붕이 있고 대형 스크린이 있어요.'},
    {id:'s25',name:'25 Uscita Parabolica',zone:null,R:190,L:66,tags:[],desc:'Parabolica 출구 쪽 메인 직선 바깥쪽 관람석이에요. 지붕은 없어요.'},
    {id:'s26a',name:'26A Laterale Destra A',zone:null,R:200,L:94,tags:['start'],desc:'Gradinate Traguardo 27~30 뒤쪽, 메인 직선 바깥쪽 관람석이에요. 지붕이 있고 대형 스크린이 있어요.'},
    {id:'s26b',name:'26B Laterale Destra B',zone:null,R:200,L:93,tags:['start'],desc:'Gradinate Traguardo 27~30 뒤쪽, 메인 직선 바깥쪽 관람석이에요. 지붕이 있고 대형 스크린이 있어요.'},
    {id:'s26c',name:'26C Laterale Destra C',zone:null,R:200,L:92,tags:['start','podium'],desc:'Gradinate Traguardo 30 뒤쪽 관람석이에요. 2026 지도의 FINISH / PODIUM 표시 바로 앞이에요. 지붕이 있고 대형 스크린이 있어요.'},
    {id:'s27',name:'Gradinate Traguardo 27',zone:null,R:200,L:70,tags:['start'],desc:'피니시 라인과 출발선 사이 메인 직선 바깥쪽, 맨 앞줄 계단식 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s28',name:'Gradinate Traguardo 28',zone:null,R:200,L:70,tags:['start'],desc:'피니시 라인과 출발선 사이 메인 직선 바깥쪽, 맨 앞줄 계단식 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s29',name:'Gradinate Traguardo 29',zone:null,R:200,L:70,tags:['start'],desc:'피니시 라인과 출발선 사이 메인 직선 바깥쪽, 맨 앞줄 계단식 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s30',name:'Gradinate Traguardo 30',zone:null,R:200,L:71,tags:['start','podium'],desc:'메인 직선 바깥쪽 맨 앞줄 계단식 관람석이에요. 2026 지도의 FINISH / PODIUM 표시 바로 앞이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s32',name:'32 Junior Interna',zone:null,R:180,L:81,tags:[],desc:'1번 코너로 가는 메인 직선 안쪽 관람석이에요. 지붕은 없어요.'},
    {id:'s33a',name:'33A Seconda Variante 1',zone:null,R:170,L:63,tags:[],desc:'4·5번 코너(Seconda Variante)로 가는 직선 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s33b',name:'33B Seconda Variante 2',zone:null,R:170,L:63,tags:[],desc:'4·5번 코너(Seconda Variante)로 가는 직선 안쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s34',name:'34 Lesmo 1 Esterna',zone:null,R:160,L:81,tags:[],desc:'6번 코너(Prima Curva di Lesmo) 바깥쪽 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s35a',name:'35A Vedano A',zone:null,R:190,L:59,tags:[],desc:'Parabolica를 빠져나온 메인 직선 바깥쪽, 맨 앞줄 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s35b',name:'35B Vedano B',zone:null,R:190,L:59,tags:[],desc:'Parabolica를 빠져나온 메인 직선 바깥쪽, 맨 앞줄 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'s35c',name:'35C Vedano C',zone:null,R:190,L:59,tags:[],desc:'Parabolica를 빠져나온 메인 직선 바깥쪽, 맨 앞줄 관람석이에요. 지붕은 없고 대형 스크린이 있어요.'},
    {id:'sgf',name:'GF Gradinate Interno Parabolica',zone:null,R:200,L:447,tags:[],desc:'11번 코너 Parabolica 안쪽을 따라 이어진 계단식 자리예요. 좌석 번호가 없어요. 지붕은 없고 대형 스크린이 있어요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands): 2026 price-list map outlines, depth-corrected onto the
     OSM grandstand buildings (NOTES.md) */
  standOf: {s1:'s1',s2:'s2',s3:'s3',s4:'s4',s5:'s5',s6a:'s6a',s6b:'s6b',s6c:'s6c',s7:'s7',s8a:'s8a',s8b:'s8b',s8bis:'s8bis',s9:'s9',s10:'s10',s10bis:'s10bis',s11:'s11',s12:'s12',s13:'s13',s14:'s14',s16:'s16',s17a:'s17a',s17b:'s17b',s18:'s18',s20:'s20',s21a:'s21a',s21b:'s21b',s21c:'s21c',s21d:'s21d',s21e:'s21e',s22:'s22',s23a:'s23a',s23b:'s23b',s24:'s24',s25:'s25',s26a:'s26a',s26b:'s26b',s26c:'s26c',s27:'s27',s28:'s28',s29:'s29',s30:'s30',s32:'s32',s33a:'s33a',s33b:'s33b',s34:'s34',s35a:'s35a',s35b:'s35b',s35c:'s35c',sgf:'sgf'},
  extraStands: ['s31'],   // Tribuna 31 (wheelchair users, accreditation only, not sold) — 2026 Ex-Camping map
  /* no stage: no 2026 map or text gives a position for the Fanzone or any stage (NOTES.md) */
  stages: [],
  /* the ten entrances of the 2026 F1 map (it-2026-mappa.pdf). Names only where official: A Vedano (monzanet 2026),
     B Santa Maria delle Selve and B/C Costa Alta (2026 map legend), G Mirabello (monzanet 2024/2025, Viale Mirabello on the map) */
  gates: [
    {id:'gA',n:'A',name:'Vedano',side:null,desc:'Parco di Monza의 Porta Vedano 자리예요. 204번 버스가 Ingresso Autodromo A 정류장에 서요.'},
    {id:'gAB',n:'A/B',name:'',side:null,desc:'Vedano al Lambro 쪽, 메인 직선 바깥쪽 게이트예요.'},
    {id:'gB',n:'B',name:'Santa Maria delle Selve',side:null,desc:'Porta di Santa Maria alle Selve 자리의 보행자 게이트예요. 걸을 수 있는 장애인 관람객에게 권하는 게이트로, 7번 관람석까지 200m, 31번 관람석까지 250m예요. 221번 버스가 Ingresso Autodromo B 정류장에 서요.'},
    {id:'gBC',n:'B/C',name:'Costa Alta',side:null,desc:'Via Costa Alta의 차량 게이트예요. 내부 주차 패스가 있는 휠체어 이용 관람객만 차로 들어가고, 주차장까지 250m예요.'},
    {id:'gC',n:'C',name:'',side:null,desc:'Biassono 쪽 Porta di Biassono 자리 게이트예요.'},
    {id:'gD',n:'D',name:'',side:null,desc:'6번 코너(Lesmo 1) 바깥쪽 게이트예요. Biassono-Lesmo Parco역에서 약 100m예요.'},
    {id:'gE',n:'E',name:'',side:null,desc:'서킷 동쪽 Villasanta 쪽 게이트예요.'},
    {id:'gF',n:'F',name:'',side:null,desc:'Villasanta 쪽 Porta di San Giorgio 자리 게이트예요.'},
    {id:'gG',n:'G',name:'Mirabello',side:null,desc:'Viale Mirabello의 게이트예요. Monza역에서 오는 Navetta Nera 셔틀이 여기에 내려요(Trenord 2026). 2024·2025 공식 안내에서는 Fanzone 입구였어요.'},
    {id:'gH',n:'H',name:'',side:null,desc:'Monza 쪽, 서킷 남동쪽 게이트예요.'}
  ],
  gateDesc: g => g.desc + ' 위치는 2026 공식 지도 기준이에요. 언론 안내(2026)에 따르면 금 7:30, 토·일 7:00에 열고 20:00에 닫아요.',
  transit: {
    items: [
    {id:'biassono',name:'Biassono-Lesmo Parco',codes:['S7'],ll:[9.2982906,45.6321958],note:'Trenord가 서킷에서 가장 가까운 역으로 안내한 곳이에요. 결승 날(일)에는 Milano Porta Garibaldi에서 직행 열차 21편이 다녀요(Trenord 2026). Gate D가 가장 가까워요.'}
  ],
    xy: {biassono:[1369.5,-88.0]},   // OSM railway halt 23966887231
    layer: '기차역', kicker: '기차역', short: '기차역', near: '기차역과 가까운', suffix: '역', aria: ' 기차역 ',
    note: 'Monza역(via Arosio)에서 Gate G까지 Navetta Nera 셔틀이 다녀요. Trenord "Treno+Navetta Nera" 티켓(€10) 하나로 기차와 셔틀을 함께 타요(2026).',
    icon: 'train'
  },
  village: {
    items: [],
    label: '팬 존', desc: ''
  },
  /* landmarks — OpenStreetMap positions (metres); Ex-Camping = label of the 2026 map at the OSM plaza. r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'고속 오벌 북쪽 뱅킹',xy:[549,648],r:1},
    {t:'고속 오벌 남쪽 뱅킹',xy:[380,2360],r:1},
    {t:'Ex-Camping',xy:[-4,841],r:2},
    {t:'패독',xy:[112,1561],r:2},
    {t:'Biassono',xy:[-434,46],r:2},
    {t:'Vedano al Lambro',xy:[-438,2200],r:2},
    {t:'Golf Club Milano',xy:[857,2242],r:3},
    {t:'Piazzale Parabolica',xy:[90,2022],r:3},
    {t:'San Giorgio al Lambro',xy:[1179,1776],r:3},
    {t:'람브로강',en:'Lambro',xy:[1250,1300],r:3,w:1}
  ],
  track: [
    [0,'08:35','09:20','f3','FIA Formula 3 · Practice Session','F3 연습',''],
    [0,'10:00','10:45','f2','FIA Formula 2 · Practice Session','F2 연습',''],
    [0,'12:30','13:30','f1','Formula 1 · First Practice Session','F1 연습 주행 1',''],
    [0,'14:00','14:10','f3','FIA Formula 3 · Qualifying Session - Group A','F3 예선 A조',''],
    [0,'14:20','14:30','f3','FIA Formula 3 · Qualifying Session - Group B','F3 예선 B조',''],
    [0,'14:55','15:25','f2','FIA Formula 2 · Qualifying Session','F2 예선',''],
    [0,'16:00','17:00','f1','Formula 1 · Second Practice Session','F1 연습 주행 2',''],
    [0,'17:30','18:15','psc','Porsche Mobil 1 Supercup · Practice Session','포르쉐 슈퍼컵 연습',''],
    [0,'18:25','18:40','cer','Formula 1 · Historic F1 Cars Demonstration','F1 히스토릭 머신 데모 주행',''],
    [1,'09:30','10:15','f3','FIA Formula 3 · Sprint Race','F3 스프린트 레이스','18랩 또는 40분 +1랩'],
    [1,'10:25','10:40','cer','Formula 1 · Historic F1 Cars Demonstration','F1 히스토릭 머신 데모 주행',''],
    [1,'10:50','11:20','psc','Porsche Mobil 1 Supercup · Qualifying Session','포르쉐 슈퍼컵 예선',''],
    [1,'12:30','13:30','f1','Formula 1 · Third Practice Session','F1 연습 주행 3',''],
    [1,'14:15','15:05','f2','FIA Formula 2 · Sprint Race','F2 스프린트 레이스','21랩 또는 45분 +1랩'],
    [1,'16:00','17:00','f1','Formula 1 · Qualifying Session','F1 예선',''],
    [1,'17:15','17:35','cer','Formula 1 · Historic Car Demonstration','히스토릭 카 데모 주행',''],
    [1,'17:35','17:45','cer','Formula 1 · Schumacher Legacy Celebration Run','슈마허 레거시 기념 주행',''],
    [2,'08:15','09:05','f3','FIA Formula 3 · Feature Race','F3 피처 레이스','22랩 또는 45분 +1랩'],
    [2,'09:45','10:50','f2','FIA Formula 2 · Feature Race','F2 피처 레이스','30랩 또는 60분 +1랩'],
    [2,'11:00','11:15','cer','Formula 1 · Historic F1 Cars Demonstration','F1 히스토릭 머신 데모 주행',''],
    [2,'11:45','12:20','psc','Porsche Mobil 1 Supercup · Race','포르쉐 슈퍼컵 레이스','15랩 또는 30분 +1랩'],
    [2,'12:35','12:50','cer','Formula 1 · Schumacher Legacy Celebration Run','슈마허 레거시 기념 주행',''],
    [2,'13:00','13:30','cer','Formula 1 · Drivers’ Parade','F1 드라이버 퍼레이드',''],
    [2,'14:44','14:46','cer','National Anthem','국가 연주','Francesco Meli 노래 · 이어서 Frecce Tricolori 비행'],
    [2,'15:00','17:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','53랩 또는 120분']
  ],
  /* no stage acts: the only 2026 programme item with a time is the Saturday 17:30 'Cars' screening in the Fanzone, and the
     Fanzone has no published position (NOTES.md) */
  acts: [],
  tba: [],
  quietTitles: ['국가 연주'],
  series: {f1:{code:'F1', cls:'f1'}, f2:{code:'F2', cls:'', noRound:true}, f3:{code:'F3', cls:'', noRound:true}, psc:{code:'SUPERCUP', cls:'', noRound:true}, cer:{code:'F1', cls:'f1'}},
  /* 2026 price list: every numbered grandstand is a reserved seat; GF is 'non numerate'; P = Circolare Prato (GA) */
  /* 2026 price list: every numbered grandstand is a reserved seat; GF is 'non numerate'; P = Circolare Prato (GA) */
  tickets: [
    {id:'s1',name:'1 Centrale',zl:'',zones:null,seat:'s1',sub:'출발선 옆 메인 관람석 · 지붕 있음'},
    {id:'s2',name:'Gradinate Traguardo 2',zl:'',zones:null,seat:'s2',sub:'출발선~1번 코너 맨 앞줄 · 지붕 없음'},
    {id:'s3',name:'Gradinate Traguardo 3',zl:'',zones:null,seat:'s3',sub:'출발선~1번 코너 맨 앞줄 · 지붕 없음'},
    {id:'s4',name:'4 Laterale Sinistra',zl:'',zones:null,seat:'s4',sub:'출발선~1번 코너 · 지붕 있음'},
    {id:'s5',name:'5 Piscina',zl:'',zones:null,seat:'s5',sub:'1번 코너 앞 직선 바깥쪽 · 지붕 없음'},
    {id:'s6a',name:'6A Alta Velocità A',zl:'',zones:null,seat:'s6a',sub:'1번 코너 앞 직선 안쪽 · 지붕 없음'},
    {id:'s6b',name:'6B Alta Velocità B',zl:'',zones:null,seat:'s6b',sub:'1번 코너 앞 · 첫 랩 혼전 · 지붕 없음'},
    {id:'s6c',name:'6C Alta Velocità C',zl:'',zones:null,seat:'s6c',sub:'1번 코너 바로 앞 · 지붕 없음'},
    {id:'s7',name:'7 Biassono',zl:'',zones:null,seat:'s7',sub:'1번 코너 앞 직선 바깥쪽 · 지붕 없음'},
    {id:'s8a',name:'8A Prima Variante Esterna A',zl:'',zones:null,seat:'s8a',sub:'1·2번 코너 바깥쪽 · 지붕 없음'},
    {id:'s8b',name:'8B Prima Variante Esterna B',zl:'',zones:null,seat:'s8b',sub:'1·2번 코너 바깥쪽 · 지붕 없음'},
    {id:'s8bis',name:'8 BIS Uscita Prima Variante',zl:'',zones:null,seat:'s8bis',sub:'2번 코너 출구 · 지붕 없음'},
    {id:'s9',name:'9 Seconda Variante',zl:'',zones:null,seat:'s9',sub:'4·5번 코너 안쪽 · 지붕 없음'},
    {id:'s10',name:'10 Roggia',zl:'',zones:null,seat:'s10',sub:'4·5번 코너 출구 안쪽 · 지붕 없음'},
    {id:'s10bis',name:'10 BIS Lesmo 2 Interno',zl:'',zones:null,seat:'s10bis',sub:'7번 코너 안쪽 · 지붕 없음'},
    {id:'s11',name:'11 Serraglio',zl:'',zones:null,seat:'s11',sub:'Curva del Serraglio · 지붕 없음'},
    {id:'s12',name:'12 Ascari 3',zl:'',zones:null,seat:'s12',sub:'Variante Ascari 입구 · 지붕 없음'},
    {id:'s13',name:'13 Ascari 4',zl:'',zones:null,seat:'s13',sub:'Variante Ascari 입구 · 지붕 없음'},
    {id:'s14',name:'14 Ascari 2',zl:'',zones:null,seat:'s14',sub:'Variante Ascari 안쪽 · 지붕 없음'},
    {id:'s16',name:'16 Ascari',zl:'',zones:null,seat:'s16',sub:'9·10번 코너 안쪽 · 지붕 없음'},
    {id:'s17a',name:'17A Ascari Esterna A',zl:'',zones:null,seat:'s17a',sub:'Variante Ascari 출구 바깥쪽 · 지붕 없음'},
    {id:'s17b',name:'17B Ascari Esterna B',zl:'',zones:null,seat:'s17b',sub:'Variante Ascari 출구 바깥쪽 · 지붕 없음'},
    {id:'s18',name:'18 Uscita Ascari A',zl:'',zones:null,seat:'s18',sub:'Variante Ascari 출구 안쪽 · 지붕 있음'},
    {id:'s20',name:'20 Rettilineo Parabolica Esterna',zl:'',zones:null,seat:'s20',sub:'백 스트레이트 바깥쪽 · 지붕 없음'},
    {id:'s21a',name:'21A Laterale Parabolica A',zl:'',zones:null,seat:'s21a',sub:'11번 코너 앞 백 스트레이트 바깥쪽 · 지붕 없음'},
    {id:'s21b',name:'21B Laterale Parabolica B',zl:'',zones:null,seat:'s21b',sub:'11번 코너 앞 백 스트레이트 바깥쪽 · 지붕 없음'},
    {id:'s21c',name:'21C Laterale Parabolica C',zl:'',zones:null,seat:'s21c',sub:'11번 코너 앞 백 스트레이트 바깥쪽 · 지붕 없음'},
    {id:'s21d',name:'21D Laterale Parabolica D',zl:'',zones:null,seat:'s21d',sub:'11번 코너 앞 백 스트레이트 바깥쪽 · 지붕 없음'},
    {id:'s21e',name:'21E Laterale Parabolica E',zl:'',zones:null,seat:'s21e',sub:'11번 코너 앞 백 스트레이트 바깥쪽 · 지붕 없음'},
    {id:'s22',name:'22 Parabolica',zl:'',zones:null,seat:'s22',sub:'11번 코너 바깥쪽 · 지붕 있음'},
    {id:'s23a',name:'23A Parabolica Interna A',zl:'',zones:null,seat:'s23a',sub:'Parabolica 출구 안쪽 · 지붕 없음'},
    {id:'s23b',name:'23B Parabolica Interna B',zl:'',zones:null,seat:'s23b',sub:'Parabolica 출구 안쪽 · 지붕 없음'},
    {id:'s24',name:'24 Vedano',zl:'',zones:null,seat:'s24',sub:'Parabolica 출구 쪽 직선 · 지붕 있음'},
    {id:'s25',name:'25 Uscita Parabolica',zl:'',zones:null,seat:'s25',sub:'Parabolica 출구 쪽 직선 · 지붕 없음'},
    {id:'s26a',name:'26A Laterale Destra A',zl:'',zones:null,seat:'s26a',sub:'메인 직선 · 지붕 있음'},
    {id:'s26b',name:'26B Laterale Destra B',zl:'',zones:null,seat:'s26b',sub:'메인 직선 · 지붕 있음'},
    {id:'s26c',name:'26C Laterale Destra C',zl:'',zones:null,seat:'s26c',sub:'피니시·포디움 앞 · 지붕 있음'},
    {id:'s27',name:'Gradinate Traguardo 27',zl:'',zones:null,seat:'s27',sub:'메인 직선 맨 앞줄 · 지붕 없음'},
    {id:'s28',name:'Gradinate Traguardo 28',zl:'',zones:null,seat:'s28',sub:'메인 직선 맨 앞줄 · 지붕 없음'},
    {id:'s29',name:'Gradinate Traguardo 29',zl:'',zones:null,seat:'s29',sub:'메인 직선 맨 앞줄 · 지붕 없음'},
    {id:'s30',name:'Gradinate Traguardo 30',zl:'',zones:null,seat:'s30',sub:'피니시·포디움 앞 맨 앞줄 · 지붕 없음'},
    {id:'s32',name:'32 Junior Interna',zl:'',zones:null,seat:'s32',sub:'1번 코너 앞 직선 안쪽 · 지붕 없음'},
    {id:'s33a',name:'33A Seconda Variante 1',zl:'',zones:null,seat:'s33a',sub:'4번 코너 앞 직선 안쪽 · 지붕 없음'},
    {id:'s33b',name:'33B Seconda Variante 2',zl:'',zones:null,seat:'s33b',sub:'4번 코너 앞 직선 안쪽 · 지붕 없음'},
    {id:'s34',name:'34 Lesmo 1 Esterna',zl:'',zones:null,seat:'s34',sub:'6번 코너 바깥쪽 · 지붕 없음'},
    {id:'s35a',name:'35A Vedano A',zl:'',zones:null,seat:'s35a',sub:'Parabolica 출구 쪽 직선 맨 앞줄 · 지붕 없음'},
    {id:'s35b',name:'35B Vedano B',zl:'',zones:null,seat:'s35b',sub:'Parabolica 출구 쪽 직선 맨 앞줄 · 지붕 없음'},
    {id:'s35c',name:'35C Vedano C',zl:'',zones:null,seat:'s35c',sub:'Parabolica 출구 쪽 직선 맨 앞줄 · 지붕 없음'},
    {id:'sgf',name:'GF Gradinate Interno Parabolica',zl:'',zones:null,seat:'sgf',sub:'11번 코너 안쪽 계단식 자리 · 좌석 번호 없음'},
    {id:'ga',name:'Circolare Prato (General Admission)',zl:'',zones:null,seat:null,sub:'지도의 P 구역 잔디에서 자유 관람 · 지정석 없음'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 몬차 공식 가격표(2026-06-17판) 기준이에요. 번호가 있는 관람석은 지정석이고, GF는 좌석 번호가 없어요. GA(Circolare Prato)는 지도의 P 구역 잔디에서 자유롭게 봐요. 관람석 티켓으로 GA 구역에도 갈 수 있는지는 발표되지 않았어요.',
  tl: { from: 8*60, to: 19*60, rows: [], names: {}, trackTag: '<span class="stag f1">F1 <span class="rd">외 3</span></span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>GA(Circolare Prato) 구역에서 볼 수 있는지 현장 안내를 확인하세요.',
  searchPh: '관람석 이름이나 번호, 게이트, 역',
  quick: ['Parabolica','Ascari','Lesmo','Centrale','Alta Velocità','Mirabello','Biassono','1번 코너'],
  presets: [
    {d:0,t:'12:20',l:'연습 주행 1 · 10분 전'}, {d:1,t:'14:40',l:'F2 스프린트 레이스 진행 중'},
    {d:1,t:'15:50',l:'예선 · 10분 전'}, {d:2,t:'09:50',l:'F2 피처 레이스 진행 중'},
    {d:2,t:'14:30',l:'결승 · 30분 전'}, {d:2,t:'15:50',l:'결승 진행 중'}
  ],
  demoRange: [7*60, 21*60],
  /* only what the 2026 official material shows: the 6 'P' GA lawns of the price-list map, the Ex-Camping services of the
     2026 F1 map p.2 (accessibility area by the first chicane), water points of the 2026 BrianzAcque list placed at the named
     stands. The price list marks a giant screen per stand (in the spot text), not screen positions. */
  amen: {walk:['eye','GA 관람 구역 (Circolare Prato)'],wc:['wc','화장실'],fnb:['food','식음료'],water:['drop','물 보급'],aid:['aid','응급 처치'],info:['info','안내'],tix:['ticket','티켓 확인']},
  amenLegend: [['eye','GA 관람 구역'],['wc','화장실'],['food','식음료'],['drop','물 보급'],['aid','응급 처치'],['info','안내'],['ticket','티켓 확인']],
  info: {
    title: '이탈리아 그랑프리 서킷 맵',
    sub: '아우토드로모 나치오날레 몬차 · 5.793km · 11개 코너 · 결승 53랩 · 시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 중앙값 1m, 95%가 3m 안에서 맞아요(1번 코너 탈출로 제외)'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-10-04판에서 건물·도로·물가·풀밭·피트레인과 옛 고속 오벌을 그대로 그렸어요'],
      ['코너 번호·출발선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요. 피니시 라인은 이 지도의 체커기, 출발선은 몬차 2026 관람석 지도의 START / GRID 표시예요'],
      ['트랙 세션 시간', 'Formula 1 공식 타임테이블(2026) · 몬차 시간(CEST · UTC+2) · 바뀔 수 있어요'],
      ['관람석·GA 구역', '몬차 2026 공식 관람석 지도(가격표 2026-06-17판)의 관람석 모양과 순서를 트랙에 맞춰 옮겼어요. 이 지도는 관람석을 트랙에서 실제보다 멀리 그려서, 트랙과의 거리를 OpenStreetMap 관람석 건물에 맞춰 줄였어요. 관람석에서 보이는 구간은 추정치예요. 지붕·대형 스크린 표시는 같은 가격표 기준이고, 6B·6C 설명은 F1 공식 티켓 판매처(tickets.formula1.com, 2027 판매 페이지) 문구예요'],
      ['게이트', '몬차 2026 F1 공식 지도(접근성 안내)의 게이트 10곳이에요. 위치는 같은 자리의 OpenStreetMap 게이트에 맞췄어요. 이름은 지도에 있는 B·B/C와 몬차 공식 안내의 A(Vedano)·G(Mirabello)만 붙였어요. 여는 시각은 공식 발표가 없어 언론 안내(sicurauto.it, 2026)를 따랐어요'],
      ['Ex-Camping·31번 관람석', '몬차 2026 F1 공식 지도 2쪽(Ex-Camping 구역 안내)의 시설 아이콘과 31번 관람석이에요. 그림 지도라 위치 오차가 10~20m쯤 있어요'],
      ['기차역·셔틀', 'Trenord 2026 GP 안내(2026-08-28) 기준이에요. 역 위치는 OpenStreetMap 기준이에요'],
      ['물 보급', 'BrianzAcque·몬차 2026 발표(2026-08-25) 기준이에요. 관람석 이름으로만 발표돼 24·26·11번 관람석 옆에 표시했고, Ex-Camping 물 보급은 2026 공식 지도 위치예요'],
      ['랜드마크', '옛 고속 오벌, 패독, 마을, 강 위치는 OpenStreetMap 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
