/* design/photomap.js를 그대로 이식한 것. 여기서 고치지 말고 원본을 고친 뒤 다시 옮긴다.
 * 검증: node design/photo-check.mjs
 *
 * photomap — 경기 사진 매핑 (2026, 1:1 고정 배정)
 *
 * 설계
 * 1. 79경기에 79장을 1:1로 고정 배정한다. 같은 사진이 두 경기에 나오지 않는다.
 *    (해시로 풀에서 뽑던 이전 방식은 아무리 풀을 키워도 중복이 남았다)
 * 2. 차종이 시리즈와 맞는 것이 장소보다 우선한다.
 *    이전 버전은 장소를 먼저 매칭해서 WEC 경기에 F1 차 사진이 나갔다.
 * 3. 장소 사진은 차가 안 보이고 그 장소가 한눈에 읽히는 상징적인 컷만 쓴다.
 * 4. 전부 Pexels. Unsplash는 링크가 죽는 사례가 확인돼 쓰지 않는다.
 *    (구 매핑의 Unsplash 4장이 전부 404였고 13경기가 깨진 이미지였다)
 * 5. 모든 id는 실제 로딩과 화면 내용을 직접 확인했다. 추가·교체할 때도 반드시 확인할 것.
 *
 * 고치는 법: MAP에서 해당 줄의 id만 바꾼다. 새 id는 다른 줄과 겹치지 않아야 한다.
 *            검증은 design/photo-check.mjs 로.
 */

var PX_ = 'https://images.pexels.com/photos/';
/* 용도별 프리셋. 같은 용도는 같은 URL이어야 브라우저 캐시가 걸린다.
 * 실측 렌더 크기(2026-09):
 *   데스크탑 히어로 1102x428 · 모바일 히어로 356x450 → 'hero'
 *   상세 헤더 모바일 390x219(DPR2 = 780x438) · 데스크탑 드로어 559x198 → 'card'
 * 'card'는 헤더 비율(16:9)로 잘라서 받는다. 안 보이는 픽셀까지 받지 않도록 (원본 비율 800w = 38~90KB → 33~59KB). */
var SIZES = {
  hero: 'w=1600',
  card: 'w=800&h=450&fit=crop',
};
function px(id, size) {
  var q = SIZES[size] || (typeof size === 'number' ? 'w=' + size : 'w=1400');
  return PX_ + id + '/pexels-photo-' + id + '.jpeg?auto=compress&cs=tinysrgb&' + q;
}

/* [시리즈, 장소·대회 매칭, [사진 id, 배경위치?]] — 위에서부터 첫 일치를 쓴다. */
var MAP = [
  /* ---------------- F1 (24) ---------------- */
  [/^F1$/, /앨버트 파크|Albert Park/i,                    ['29320659']],   /* 호주 */
  [/^F1$/, /상하이|Shanghai/i,                            ['36920232']],   /* 중국 */
  [/^F1$/, /스즈카|Suzuka/i,                              ['8766268']],    /* 일본 */
  [/^F1$/, /제다|Jeddah/i,                                ['4614473']],    /* 사우디 — 코니시 */
  [/^F1$/, /마이애미|Miami/i,                             ['35219022']],   /* 마이애미 */
  [/^F1$/, /질 빌뇌브|Gilles Villeneuve/i,                ['31204633']],   /* 캐나다 */
  [/^F1$/, /모나코/i,                                     ['5507255']],    /* 모나코 — 항구 */
  [/^F1$/, /카탈루냐|Catalunya/i,                         ['29309759']],   /* 바르셀로나-카탈루냐 */
  [/^F1$/, /레드불 링|Red Bull Ring|슈필베르크/i,          ['11482791']],   /* 오스트리아 */
  [/^F1$/, /실버스톤|Silverstone/i,                       ['36920243']],   /* 영국 */
  [/^F1$/, /스파|Spa-Francorchamps/i,                     ['29309760']],   /* 벨기에 */
  [/^F1$/, /헝가로링|Hungaroring/i,                       ['14079603']],   /* 헝가리 */
  [/^F1$/, /잔드보르트|Zandvoort/i,                       ['31204632']],   /* 네덜란드 */
  [/^F1$/, /몬차|Monza/i,                                 ['29320675']],   /* 이탈리아 */
  [/^F1$/, /마드링|Madring|Madrid/i,                      ['29320677']],   /* 스페인 */
  [/^F1$/, /바쿠|Baku/i,                                  ['28403116']],   /* 아제르바이잔 — 플레임 타워 */
  [/^F1$/, /세팡|Sepang|바레인|Bahrain|사키르/i,           ['29255759']],   /* 바레인 — 피트레인 */
  [/^F1$/, /마리나 베이|Marina Bay|싱가포르|Singapore/i,   ['2880607']],    /* 싱가포르 — 야경 */
  [/^F1$/, /아메리카스|Americas|오스틴|Austin/i,           ['13857975']],   /* 미국 */
  [/^F1$/, /에르마노스|멕시코시티|Mexico City/i,           ['3525540']],    /* 멕시코 — 서킷 항공 */
  [/^F1$/, /인터라고스|Interlagos|상파울루|Sao Paulo/i,    ['14685022']],   /* 상파울루 */
  [/^F1$/, /라스베이거스|Las Vegas/i,                      ['33466033', 'center 58%']], /* 라스베이거스 */
  [/^F1$/, /루사일|Lusail/i,                              ['5895248']],    /* 카타르 — 도하 야경 */
  [/^F1$/, /야스 마리나|Yas Marina/i,                      ['6697875']],    /* 아부다비 — 일몰 */

  /* ---------------- WEC (10) — 전부 하이퍼카·LMP 프로토타입 ---------------- */
  [/^WEC$/, /이몰라|Imola|엔초 에 디노/i,                  ['13237906']],
  [/^WEC$/, /스파|Spa-Francorchamps/i,                    ['13409604']],
  [/^WEC$/, /사르트|Sarthe|르망 24시/i,                    ['17192814']],   /* 토요타 GR010 하이브리드 */
  [/^WEC$/, /인터라고스|Interlagos|파시|상파울루/i,         ['13409660']],
  [/^WEC$/, /아메리카스|Americas|론스타/i,                 ['13409636']],
  [/^WEC$/, /후지|Fuji/i,                                 ['17192893']],
  [/^WEC$/, /카탈루냐|Catalunya|바르셀로나/i,              ['13409672']],
  [/^WEC$/, /몬차|Monza/i,                                ['32543846']],
  [/^WEC$/, /루사일|Lusail|카타르|Qatar/i,                 ['14401748']],
  [/^WEC$/, /바레인|Bahrain|사키르/i,                      ['10105640']],

  /* ---------------- IMSA (11) — 북미 프로토타입·GT ---------------- */
  [/^IMSA$/, /데이토나|Daytona/i,                          ['13237912']],
  [/^IMSA$/, /세브링|Sebring/i,                            ['6694230']],
  [/^IMSA$/, /롱비치|Long Beach/i,                         ['11076204']],
  [/^IMSA$/, /라구나 세카|Laguna Seca/i,                    ['38029396']],
  [/^IMSA$/, /디트로이트|Detroit/i,                         ['15397464']],
  [/^IMSA$/, /왓킨스|Watkins|글렌|Glen/i,                   ['13237554']],
  [/^IMSA$/, /모터스포트 파크|Mosport|모스포트/i,           ['38029391']],
  [/^IMSA$/, /로드 아메리카|Road America|Elkhart/i,        ['34388832']],
  [/^IMSA$/, /버지니아|Virginia|VIR/i,                     ['38029383']],
  [/^IMSA$/, /인디애나폴리스|Indianapolis/i,               ['31434821']],
  [/^IMSA$/, /로드 애틀랜타|Road Atlanta|프티 르망/i,       ['38029380']],

  /* ---------------- GTWC (20) — 전부 GT3 ---------------- */
  [/^GTWC$/, /파노라마|Panorama|바투스트|Bathurst/i,        ['28944070']],
  [/^GTWC$/, /세팡|Sepang/i,                               ['10373682']],
  [/^GTWC$/, /폴 리카르|Paul Ricard/i,                      ['28944064']],
  [/^GTWC$/, /브랜즈 해치|Brands Hatch/i,                   ['28944057']],
  [/^GTWC$/, /스파|Spa-Francorchamps/i,                    ['31032661']],
  [/^GTWC$/, /뉘르부르크링 24시|Nürburgring 24/i,           ['18959173']],
  [/^GTWC$/, /몬차|Monza/i,                                ['11064665']],
  [/^GTWC$/, /미사노|Misano/i,                             ['31032526']],
  [/^GTWC$/, /만달리카|Mandalika/i,                         ['10373665']],
  [/^GTWC$/, /마니쿠르|Magny-Cours|느베르/i,                ['32993069']],
  [/^GTWC$/, /뉘르부르크링|Nürburgring|Nurburgring/i,       ['18959174']],
  [/^GTWC$/, /스즈카|Suzuka/i,                             ['13207679']],
  [/^GTWC$/, /잔드보르트|Zandvoort/i,                      ['18959178']],
  [/^GTWC$/, /후지|Fuji/i,                                 ['169176']],
  [/^GTWC$/, /카탈루냐|Catalunya|바르셀로나/i,              ['11876746']],
  [/^GTWC$/, /인디애나폴리스|Indianapolis/i,               ['11006001']],
  [/^GTWC$/, /알가르브|Algarve|포르티망|Portimao|Portimão/i, ['10373676']],
  [/^GTWC$/, /오카야마|Okayama/i,                           ['10373677']],
  [/^GTWC$/, /베이징|Beijing/i,                            ['10993429']],
  [/^GTWC$/, /상하이|Shanghai/i,                           ['28944058']],

  /* ---------------- WRC (14) — 노면에 맞춘 랠리카 ---------------- */
  [/^WRC$/, /몬테카를로|Monte-?Carlo|갑|Gap/i,              ['11098152']],   /* 눈 */
  [/^WRC$/, /스웨덴|Sweden|우메오|Ume/i,                    ['11097899']],   /* 눈 */
  [/^WRC$/, /사파리|Safari|나이바샤|Naivasha|케냐|Kenya/i,   ['9197967']],    /* 아프리카 붉은 흙 */
  [/^WRC$/, /크로아티아|Croatia|리예카|Rijeka/i,            ['11320610']],   /* 타막 */
  [/^WRC$/, /카나리아|Canarias|라스팔마스|Las Palmas/i,      ['5371645']],    /* 타막 */
  [/^WRC$/, /포르투갈|Portugal|마토지뉴스|Matosinhos/i,      ['9609133']],
  [/^WRC$/, /재팬|Japan|도요타|Toyota City|아이치/i,         ['17140848']],   /* 타막 */
  [/^WRC$/, /아크로폴리스|Acropolis|루트라키|Loutraki/i,     ['9609130']],
  [/^WRC$/, /에스토니아|Estonia|타르투|Tartu/i,             ['9609129']],
  [/^WRC$/, /핀란드|Finland|위배스퀼래|Jyv/i,               ['9609128']],
  [/^WRC$/, /파라과이|Paraguay|엔카르나시온|Encarnacion/i,   ['9609137']],
  [/^WRC$/, /칠레|Chile|탈카우아노|Talcahuano/i,            ['9609131']],
  [/^WRC$/, /사르데냐|Sardegna|알게로|Alghero|올비아/i,      ['26978202']],
  [/^WRC$/, /사우디|Saudi|제다|Jeddah/i,                    ['9609223']]
];

/* MAP에 없는 경기(데이터가 늘어난 경우)를 위한 예비. 여기서만 중복이 날 수 있다. */
var SPARE = {
  F1:   ['29255760', '29255722', '29255726', '10807493', '11213248', '12989709', '13857977', '14079604'],
  WEC:  ['32628853', '13237631'],
  IMSA: ['13237911', '13237913'],
  GTWC: ['28944060', '13207717', '11876812', '11876806', '11876747', '31411920',
         '17187855', '17187908', '17192752', '31032532', '31032651', '8359934', '28942316',
         '18956551', '18959179', '10373686', '11876706', '19201051', '31032527'],
  WRC:  ['9609125', '9609126', '9609127', '9609135', '9609144', '9609220', '17186559',
         '35334279', '11320524', '11097904', '11097915', '11098156', '11098157', '36378930', '9197927']
};

/* --------------------------------------------------------------------------- */
function hash(s) { var h = 0x811c9dc5, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0); }

/* 장소 매칭용 키. 한글·영문 필드를 전부 넣는다. */
function venueKey(e) {
  return [e.circuit, e.circuitKo, e.circuitEn, e.city, e.cityKo, e.cityEn,
          e.country, e.countryKo, e.countryEn,
          e.name, e.nameKo, e.nameEn, e.officialName, e.displayName]
         .filter(Boolean).join(' ');
}

function photoOf(e) {
  var key = venueKey(e), i;
  for (i = 0; i < MAP.length; i++) {
    if (MAP[i][0].test(e.series) && MAP[i][1].test(key)) return MAP[i][2];
  }
  var spare = SPARE[e.series] || SPARE.F1;
  return [spare[hash(String(e.id || key)) % spare.length]];
}

function photo(e, size) { return px(photoOf(e)[0], size); }
function photoPos(e) { return photoOf(e)[1] || 'center 42%'; }
function photoCredit() { return 'PEXELS'; }

export { photo, photoCredit, photoPos, photoOf, MAP, SPARE };
