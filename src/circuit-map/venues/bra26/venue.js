// 상파울루 GP 2026 (인터라고스, 아우토드로무 조제 카를루스 파시) — 라이브 서킷 맵 경기 데이터.
// 코어(map-core.js)는 경기와 무관하다. 경기마다 달라지는 값은 모두 여기 있다. 위치(ll·xy)는 base.json(evt)이 있으면 그 값으로 덮인다.
// 출처와 판단 근거는 같은 폴더의 NOTES.md에 있다.
export default {
  id: 'bra26',
  raceId: 'f1-2026-20-sopaulograndprix',
  round: 'R20',
  /* projection (metres, north-up): x = (lon-lon0)·cos(kxLat)·111320, y = (lat0-lat)·110574 */
  proj: { lon0: -46.7005, lat0: -23.6970, kxLat: -23.7017 },
  tz: { off: -3, abbr: 'BRT', name: '상파울루 시간', utc: 'UTC-3' },
  day0: [2026, 10, 6],
  days: [{d:'11.06',w:'금',en:'FRI'},{d:'11.07',w:'토',en:'SAT'},{d:'11.08',w:'일',en:'SUN'}],
  title: '상파울루 그랑프리',
  heroEn: 'Formula 1 MSC Cruises Grande Prêmio de São Paulo',
  markup: { aria: '상파울루 인터라고스 서킷 지도', circuit: '인터라고스 서킷', dates: '11.06–08' },
  overtake: [],   // 2026 기준 공식 추월 지점 안내가 없어 비워 둠 (FIA 2022 프리뷰는 DRS 구간 기준이라 쓰지 않음)
  geoBox: [-550, 1350, -550, 1600],
  /* sector-gated access: 'each Ticket grants access exclusively to the areas indicated on it' (2026 T&C).
     One zone per sold sector/product; F1 Fanzone (Kartódromo) is open to G·H·R·Porto Bank tickets and to Fanzone tickets.
     No official sector boundaries are published, so there are no zone polygons (evt.zones is empty). */
  zones: {
    A: {badge:'SETOR A', short:'A', name:'Setor A'}, B: {badge:'SETOR B', short:'B', name:'Setor B'},
    D: {badge:'SETOR D', short:'D', name:'Setor D'}, G: {badge:'SETOR G', short:'G', name:'Setor G'},
    H: {badge:'SETOR H', short:'H', name:'Setor H'}, M: {badge:'SETOR M', short:'M', name:'Setor M'},
    R: {badge:'SETOR R', short:'R', name:'Setor R'},
    PB: {badge:'PORTO BANK', short:'PB', name:'Arquibancada Porto Bank'},
    OTC: {badge:'ORANGE TREE', short:'OTC', name:'Orange Tree Club'},
    PSC: {badge:'PIT STOP', short:'PSC', name:'Pit Stop Club'},
    GPC: {badge:'GP CLUB', short:'GPC', name:'Grand Prix Club'},
    HV: {badge:'HEINEKEN', short:'HV', name:'Heineken Village'},
    FZ: {badge:'FANZONE', short:'FZ', name:'F1 Fanzone'}
  },
  zoneNote: {
    HV: 'Heineken Village 티켓이 있어야 들어갈 수 있어요. 18세 이상만 입장할 수 있어요',
    FZ: 'F1 Fanzone 티켓이나 Setor G·H·R·Porto Bank 티켓으로 들어갈 수 있어요. 수용 인원에 따라 입장이 제한될 수 있어요'
  },
  spots: [
    {id:'a',name:'Setor A',zone:'A',xy:[-24.7,435.1],R:200,L:478,tags:['start'],desc:'메인 직선과 피트 입구로 이어지는 마지막 코너 쪽 관람석이에요. 서킷 안쪽 인필드도 잘 보이고, 지붕은 없어요.'},
    {id:'b',name:'Setor B',zone:'B',xy:[16.8,707.0],R:130,L:115,tags:['start','podium'],desc:'출발 그리드와 체커기, 포디움 세리머니가 잘 보이는 자리예요. 지붕 있는 지정석이에요.'},
    {id:'psc',name:'Pit Stop Club',kind:'프리미엄 관람석',zone:'PSC',xy:[30.8,792.8],R:120,L:65,tags:['start','podium'],desc:'출발 그리드와 피트, 포디움이 보이는 라운지와 지붕 있는 관람석이에요. 뷔페, 오픈 바, F1 시뮬레이터가 있어요.'},
    {id:'m',name:'Setor M',zone:'M',xy:[75.6,933.6],R:140,L:230,tags:['start'],desc:'메인 직선에서 피트(boxes) 바로 앞에 있어요. 지붕 있는 지정석이에요.'},
    {id:'d',name:'Setor D',zone:'D',xy:[230.8,1082.4],R:160,L:200,tags:[],desc:'S do Senna(1~2번 코너)가 시작되는 곳에 있어요. 지붕이 있어요.'},
    {id:'h',name:'Setor H',zone:'H',xy:[412.8,1061.2],R:200,L:144,tags:[],desc:'S do Senna 끝에서 Curva do Sol 사이에 있어요. 지붕이 있어요.'},
    {id:'r',name:'Setor R',zone:'R',xy:[555.2,853.3],R:220,L:151,tags:[],desc:'Curva do Sol과 Reta Oposta가 시작되는 곳의 지붕 있는 관람석이에요. 순위 다툼과 피트 스톱 뒤 합류하는 차를 볼 수 있어요.'},
    {id:'g',name:'Setor G',zone:'G',xy:[630.2,554.8],R:280,L:430,tags:[],desc:'Reta Oposta 끝, F1 머신이 최고 속도를 내는 구간이에요. 지붕은 없어요.'},
    {id:'pb',name:'Arquibancada Porto Bank',zone:'PB',xy:[680.9,269.2],R:160,L:102,tags:[],desc:'Reta Oposta 끝에 있는 지붕 있는 관람석이에요. 대형 스크린과 Porto 체험 부스가 있어요.'},
    {id:'otc',name:'Orange Tree Club',kind:'프리미엄 관람석',zone:'OTC',xy:[65.9,603.1],R:120,L:63,tags:[],desc:'Curva do Laranjinha가 잘 보이는 라운지와 지붕 있는 관람석이에요. 뷔페와 오픈 바가 포함돼요.'},
    {id:'gpc',name:'Grand Prix Club',kind:'VIP 구역',zone:'GPC',xy:[304.4,591.2],R:250,L:103,tags:[],desc:'Pinheirinho·Bico de Pato·Laranjinha를 포함해 서킷이 넓게 보이는 VIP 구역이에요. 사흘 모두 피트레인에 들어갈 수 있어요.'}
  ],
  /* official stand outline per guide spot (base.json evt.stands, 2026 Eventim sector map) */
  standOf: {a:'a',b:'b',psc:'psc',m:'m',d:'d',h:'h',r:'r',g:'g',pb:'pb',otc:'otc',gpc:'gpc'},
  extraStands: [],
  stages: [
    {id:'fanzone',name:'F1 Fanzone',short:'Fanzone',zone:'FZ',xy:[757.8,715.5],desc:'Kartódromo Ayrton Senna에 있는 팬존이에요. 트랙 화면을 띄우는 대형 스크린 무대에서 매일 레이스가 끝난 뒤 공연이 열려요.'}
  ],
  /* entrance gates: OpenStreetMap gate nodes. 2026-confirmed: Portão G (Fanzone gate beside it) and Portão 7 (ticket office beside it);
     the other notes come from the promoter's 2025 visitor guide. n is empty (no number badge); the signed code (G, 7, E/H/N…) is in code and in the name. */
  gates: [
    {id:'gG',n:'',code:'G',name:'Portão G',side:null,xy:[888.6,616.0],y:2026,desc:'2026 F1 Fanzone 입구가 이 게이트 옆(Av. Jacinto Júlio)에 있어요. Autódromo역에서 약 900m예요(2025 CET 안내).'},
    {id:'g7',n:'',code:'7',name:'Portão 7',side:null,xy:[-35.4,755.1],y:2026,desc:'2026 매표소가 이 게이트 옆 Av. Senador Teotônio Vilela에 있어요.'},
    {id:'gB',n:'',code:'B',name:'Portão B',side:null,xy:[-38.7,736.6],y:2025,desc:'2025 안내 기준 차량 호출 승하차 지점은 Praça Moscou예요.'},
    {id:'g8',n:'',code:'8',name:'Portão 8',side:null,xy:[-13.0,865.9],y:2025,desc:'2025 안내 기준 차량 호출 승하차 지점은 Praça Moscou예요.'},
    {id:'gM',n:'',code:'M',name:'Portão M',side:null,xy:[12.1,993.5],y:2025,desc:'2025 안내에서 Setor D·M 입구였어요. 차량 호출 승하차 지점은 Praça Moscou예요(2025).'},
    {id:'gD',n:'',code:'D',name:'Portão D',side:null,xy:[13.8,1022.3],y:2025,desc:'2025 안내에서 Setor D·M 입구였어요. 차량 호출 승하차 지점은 Praça Moscou예요(2025).'},
    {id:'gEHN',n:'',code:'E/H/N',name:'Portão E/H/N',side:null,xy:[542.5,1091.3],y:2025,desc:'2025 안내에서는 Setor H·K·N·R 입구를 Portão HKNR로 안내했어요. 차량 호출 승하차 지점은 Praça Piemonte예요(2025).'},
    {id:'gKRF',n:'',code:'K/R/F',name:'Portão K/R/F',side:null,xy:[551.3,1079.3],y:2025,desc:'2025 안내에서는 Setor H·K·N·R 입구를 Portão HKNR로 안내했어요. 차량 호출 승하차 지점은 Praça Piemonte예요(2025).'},
    {id:'gTL',n:'',code:'T/L',name:'Portão T/L',side:null,xy:[3.9,123.9],y:2025,desc:'2025 안내에서 Setor T 입구였어요. Setor T는 2026년에는 판매하지 않아요.'}
  ],
  gateDesc: g => g.desc + ' 게이트는 사흘 모두 8시~15시에 열리고, 한 번 나가면 다시 들어올 수 없어요.',
  transit: {
    items: [
    {id:'autodromo',name:'Autódromo',codes:['Linha 9'],ll:[-46.6883218,-23.7059751]}
  ],
    xy: {autodromo:[1241.3,992.4]},   // OSM station node 41445716011
    layer: '기차역', kicker: '기차역', short: '기차역', near: '기차역과 가까운', suffix: '역', aria: ' 기차역 ',
    note: 'Linha 9–Esmeralda(ViaMobilidade) 역이에요. Portão G까지 약 900m예요(2025 CET 안내). 2026 Trem Expresso(왕복 R$35)는 Cidade Dutra역에 내리고, 시간표는 아직 발표되지 않았어요.',
    icon: 'train'
  },
  village: {
    items: [
    {id:'hv',name:'Heineken Village',zone:'HV',xy:[296.9,99.6],desc:'Bico de Pato·Mergulho·Junção·Subida do Café 사이 인필드로, 트랙에서 30m 거리예요. 18세 이상만 들어갈 수 있고 DJ 공연과 짚라인(tirolesa)이 있어요.'}
  ],
    label: '빌리지', desc: ''
  },
  /* landmarks — OpenStreetMap positions (metres). r: 1 always · 2 from k .4 · 3 from k .75 */
  landmarks: [
    {t:'Kartódromo Ayrton Senna',xy:[691.8,759.4],r:3},
    {t:'Praça Enzo Ferrari',xy:[-124.0,421.6],r:2},
    {t:'Praça Moscou',xy:[-212.6,927.2],r:3},
    {t:'Praça Piemonte',xy:[420.6,1279.7],r:3},
    {t:'Praça Ramiro Cabral da Silva',xy:[-302.8,-324.7],r:3}
  ],
  /* schedule (local time BRT, as published): [day, start, end, series, English, Korean, note, endNotPublished?]
     Only F1 sessions are published for 2026 (support races, drivers' parade, anthem: not yet). The race end is not published:
     16:00 = start + the 2-hour maximum race time; flagged with an 8th element (1). See NOTES.md. */
  track: [
    [0,'12:30','13:30','f1','Formula 1 · Practice 1','F1 연습 주행 1',''],
    [0,'16:00','17:00','f1','Formula 1 · Practice 2','F1 연습 주행 2',''],
    [1,'11:30','12:30','f1','Formula 1 · Practice 3','F1 연습 주행 3',''],
    [1,'15:00','16:00','f1','Formula 1 · Qualifying','F1 예선',''],
    [2,'14:00','16:00','f1','Formula 1 · Grand Prix','F1 그랑프리 결승','71랩 · 끝나는 시각 미발표(최대 2시간 기준)',1]
  ],
  /* stage acts: [day, stage, artist, start, end | null] — none has a published time yet */
  acts: [],
  /* stages whose acts have no published times */
  tba: [
    {stage:'fanzone', name:'F1 Fanzone', days:'금·토 레이스 뒤', acts:['João Gomes (금)','Os Paralamas do Sucesso (토)']}
  ],
  quietTitles: [],
  series: {f1:{code:'F1', cls:'f1'}},
  tickets: [
    {id:'a',name:'Setor A 관람석',zl:'A',zones:['A'],seat:'a',sub:'마지막 코너~출발선 · 지붕 없음 · 결승 뒤 Track Celebration(열릴 때)'},
    {id:'b',name:'Setor B 관람석',zl:'B',zones:['B'],seat:'b',sub:'출발 그리드·포디움 · 지붕 있는 지정석'},
    {id:'m',name:'Setor M 관람석',zl:'M',zones:['M'],seat:'m',sub:'피트 맞은편 · 지붕 있는 지정석'},
    {id:'d',name:'Setor D 관람석',zl:'D',zones:['D'],seat:'d',sub:'S do Senna 입구 · 지붕 있음'},
    {id:'h',name:'Setor H 관람석',zl:'H',zones:['H','FZ'],seat:'h',sub:'S do Senna 끝~Curva do Sol · 지붕 있음 · F1 Fanzone 입장 가능'},
    {id:'r',name:'Setor R 관람석',zl:'R',zones:['R','FZ'],seat:'r',sub:'Curva do Sol~Reta Oposta · 지붕 있음 · F1 Fanzone 입장 가능'},
    {id:'g',name:'Setor G 관람석',zl:'G',zones:['G','FZ'],seat:'g',sub:'Reta Oposta 끝 · 지붕 없음 · F1 Fanzone 입장 가능'},
    {id:'pb',name:'Arquibancada Porto Bank',zl:'PB',zones:['PB','FZ'],seat:'pb',sub:'Reta Oposta 끝 · 지붕 있음 · F1 Fanzone 입장 가능'},
    {id:'otc',name:'Orange Tree Club',zl:'OTC',zones:['OTC'],seat:'otc',sub:'Curva do Laranjinha · 라운지와 지붕 있는 관람석'},
    {id:'psc',name:'Pit Stop Club',zl:'PSC',zones:['PSC'],seat:'psc',sub:'그리드·피트·포디움 · 라운지와 지붕 있는 관람석'},
    {id:'gpc',name:'Grand Prix Club',zl:'GPC',zones:['GPC'],seat:'gpc',sub:'VIP 구역 · 사흘 모두 피트레인 입장'},
    {id:'hvg',name:'Heineken Village – Gramado',zl:'HV',zones:['HV'],seat:null,sub:'트랙 옆 잔디 구역 자유 관람 · 18세 이상'},
    {id:'hve',name:'Heineken Village – Estrela',zl:'HV',zones:['HV'],seat:null,sub:'별 모양 높은 데크 + Gramado 구역 · 18세 이상'},
    {id:'fz',name:'F1 Fanzone',zl:'FZ',zones:['FZ'],seat:null,sub:'Kartódromo 팬존만 입장 · 서킷에는 들어갈 수 없어요'},
    {id:'none',name:'티켓 없음 · 둘러보기',zl:'',zones:null,seat:null,sub:'입장 제한 없이 모든 장소를 같은 방식으로 보여줘요'}
  ],
  ticketSub: '들어갈 수 있는 구역과 내 자리를 지도에 표시해요. 언제든 바꿀 수 있어요.',
  ticketNote: '2026 GP São Paulo 티켓 안내 기준이에요. 티켓에 적힌 구역에만 들어갈 수 있고, 한 번 나가면 다시 들어올 수 없어요. Setor G·H·R·Porto Bank 티켓으로는 F1 Fanzone에도 들어갈 수 있어요(수용 인원 제한).',
  tl: { from: 8*60, to: 18*60, rows: [], names: {}, trackTag: '<span class="stag f1">F1</span>' },
  turnEmpty: '이 코너 가까이에 표시된 관람석이 없어요.<br>내 티켓 구역에서 보이는지 현장 안내를 확인하세요.',
  searchPh: '아티스트, 무대, 관람석, 게이트, 역',
  quick: ['João Gomes','Paralamas','F1 Fanzone','Heineken Village','Setor A','Portão G','Autódromo','1번 코너'],
  presets: [
    {d:0,t:'08:00',l:'게이트 오픈'}, {d:0,t:'12:20',l:'연습 주행 1 · 10분 전'},
    {d:1,t:'14:50',l:'예선 · 10분 전'}, {d:2,t:'13:30',l:'결승 · 30분 전'},
    {d:2,t:'14:40',l:'결승 진행 중'}
  ],
  demoRange: [7*60, 22*60],
  amen: {tix:['ticket','매표소']},
  amenLegend: [['ticket','매표소']],
  info: {
    title: '상파울루 그랑프리 서킷 맵',
    sub: '인터라고스 서킷 · 4.309km · 15개 코너 · 결승 71랩 · 반시계 방향',
    src: [
      ['트랙 형상', 'bacinger/f1-circuits (MIT) 좌표를 실측 비율 그대로 사용해요. OSM 레이스웨이와 평균 4m, 최대 11m 차이예요'],
      ['바탕 지도', '© OpenStreetMap 기여자 (ODbL) · OpenFreeMap 2026-09-27판에서 건물·도로·물가·풀밭·피트레인을 그대로 그렸어요. 트랙에서 900m 넘게 떨어진 작은 건물은 뺐어요'],
      ['코너 번호·출발선', 'Formula 1 2026 서킷 지도(formula1.com) 기준이에요. 출발선과 피니시 라인은 같은 선이에요(FIA 2024 서킷 지도)'],
      ['트랙 세션 시간', 'Formula 1 공식 시간표(2026)와 GP São Paulo 주최측 일정 · 상파울루 시간(BRT · UTC-3) · 서포트 레이스와 드라이버 퍼레이드 시간은 아직 발표되지 않았어요 · 바뀔 수 있어요'],
      ['무대 공연', 'GP São Paulo 2026 F1 Fanzone 라인업 발표 · 일요일 공연과 모든 공연 시각은 아직 발표되지 않았어요 · 바뀔 수 있어요'],
      ['관람석·구역', 'GP São Paulo 2026 공식 섹터 지도(Eventim·주최측 3D 일러스트)를 트랙에 맞춰 실측 지도 위로 옮겼어요. 입체 그림이라 트랙에서 먼 곳일수록 오차가 커요. 관람석에서 보이는 구간은 추정치예요'],
      ['게이트·매표소', '게이트 이름과 위치는 OpenStreetMap 표기 기준이에요. 2026에 확인된 곳은 Portão G(Fanzone 입구 옆)와 Portão 7(매표소 옆)이고, 나머지 안내는 2025 주최측 안내 기준이에요'],
      ['티켓', 'GP São Paulo 고객센터 2026 티켓 안내와 Eventim 2026 판매 페이지 기준이에요'],
      ['기차역', 'Autódromo역 위치는 OpenStreetMap 기준이에요'],
      ['도보 시간', '직선 거리 × 1.35, 분당 72m, 트랙 횡단 1회당 3분을 더한 예상치예요'],
      ['알림', '이 화면을 열어 두었을 때 담은 일정 시작 30분 전에 떠요']
    ]
  }
};
