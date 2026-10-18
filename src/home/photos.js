/* design/photomap.js를 그대로 이식한 것. 여기서 고치지 말고 원본을 고친 뒤 다시 옮긴다.
 * 검증: node design/photo-check.mjs
 *
 * photomap — 경기 사진 매핑 (2026, 1:1 고정 배정)
 *
 * 설계
 * 1. 79경기에 79장을 1:1로 고정 배정한다. 같은 사진이 두 경기에 나오지 않는다.
 * 2. 시리즈마다 그 시리즈 차만 쓴다(F1 경기에는 F1 차). 차가 잘 보이는 것이 서킷 배경보다 우선한다.
 * 3. 전부 Wikimedia Commons의 자유 라이선스(CC BY · CC BY-SA · CC0 · 퍼블릭 도메인) 사진.
 *    내려받아 public/photos/races/에 WebP로 둔다(외부 이미지 서버를 부르지 않는다).
 *      <slug>.webp      1600px 폭 — 홈 히어로('hero')
 *      <slug>-card.webp  800px 폭 — 경기 상세 헤더('card')
 * 4. 사진을 고르는 순서: A 이번 시즌 이 경기(아직 안 열렸으면 2025) → B 같은 경기 이전 해
 *    → C 같은 서킷 다른 대회(같은 차급) → D 같은 시리즈 최근 차, 다른 장소. 각 줄 주석의 첫 글자.
 * 5. CC BY · BY-SA는 화면에 작가와 라이선스를 밝혀야 한다 → CREDIT, photoCredit(). 지우지 말 것.
 * 6. 세로·정사각 원본 4장은 가로 4:3으로 잘라 썼다(주석 '편집'). 나머지는 크기만 줄였다.
 *
 * 고치는 법: 새 사진을 public/photos/races/에 같은 규격 두 장으로 넣고, MAP 줄의 slug·위치와 CREDIT을 바꾼다.
 *            slug는 다른 줄과 겹치지 않아야 한다. 검증은 design/photo-check.mjs 로.
 */

var BASE = '/photos/races/';
/* 용도별 파일. 같은 용도는 같은 URL이어야 브라우저 캐시가 걸린다.
 * 실측 렌더 크기(2026-09):
 *   데스크탑 히어로 1102x428 · 모바일 히어로 356x450 → 'hero'(1600w)
 *   상세 헤더 모바일 390x219(DPR2 = 780x438) · 데스크탑 드로어 559x198 → 'card'(800w) */
function file(slug, size) {
  return BASE + slug + (size === 'card' ? '-card' : '') + '.webp';
}

/* [시리즈, 장소·대회 매칭, [사진 slug, 배경위치]] — 위에서부터 첫 일치를 쓴다. */
var MAP = [
  /* ---------------- F1 (24) ---------------- */
  [/^F1$/, /앨버트 파크|Albert Park/i,                            ['f1-albert-park', '50% 55%']],  /* A · 2026 호주 GP · 페르스타펜 RB22 */
  [/^F1$/, /상하이|Shanghai/i,                                  ['f1-shanghai', '51% 60%']],  /* A · 2026 중국 GP · 르클레르 SF-26 */
  [/^F1$/, /스즈카|Suzuka/i,                                    ['f1-suzuka', '50% 59%']],  /* A · 2026 일본 GP · 안토넬리 W17 */
  [/^F1$/, /제다|Jeddah/i,                                     ['f1-jeddah', '50% 55%']],  /* D · 2026 중국 GP · 알론소 AMR26 */
  [/^F1$/, /마이애미|Miami/i,                                    ['f1-miami', '50% 50%']],  /* B · 2022 마이애미 GP · 페레스 RB18 */
  [/^F1$/, /질 빌뇌브|Gilles Villeneuve/i,                       ['f1-gilles-villeneuve', '50% 55%']],  /* D · 2026 오스트리아 GP · 로슨 VCARB 03 */
  [/^F1$/, /모나코/i,                                           ['f1-monaco', '50% 55%']],  /* D · 2026 중국 GP · 노리스 MCL40 */
  [/^F1$/, /카탈루냐|Catalunya/i,                                ['f1-barcelona', '50% 45%']],  /* B · 2025 스페인 GP · 알론소 AMR25 */
  [/^F1$/, /레드불 링|Red Bull Ring|슈필베르크/i,                     ['f1-red-bull-ring', '50% 55%']],  /* A · 2026 오스트리아 GP · 가슬리 A526 */
  [/^F1$/, /실버스톤|Silverstone/i,                              ['f1-silverstone', '55% 62%']],  /* A · 2026 영국 GP · 레드불 RB22 */
  [/^F1$/, /스파|Spa-Francorchamps/i,                          ['f1-spa-francorchamps', '38% 62%']],  /* A · 2026 벨기에 GP · 베어먼 VF-26 */
  [/^F1$/, /헝가로링|Hungaroring/i,                              ['f1-hungaroring', '50% 55%']],  /* D · 2026 중국 GP · 알본 FW48 */
  [/^F1$/, /잔드보르트|Zandvoort/i,                               ['f1-zandvoort', '50% 52%']],  /* B · 2024 네덜란드 GP · 노리스 MCL38 */
  [/^F1$/, /몬차|Monza/i,                                      ['f1-monza', '52% 48%']],  /* A · 2026 이탈리아 GP · 페레스 MAC-26 */
  [/^F1$/, /마드링|Madring|Madrid/i,                            ['f1-madring', '50% 55%']],  /* D · 2026 중국 GP · 콜라핀토 A526 */
  [/^F1$/, /바쿠|Baku/i,                                       ['f1-baku', '58% 78%']],  /* A · 2026 아제르바이잔 GP · 알본 FW48 */
  [/^F1$/, /세팡|Sepang|바레인|Bahrain|사키르/i,                     ['f1-bahrain', '52% 48%']],  /* A · 2026 바레인 GP · 휠켄베르크 R26 */
  [/^F1$/, /마리나 베이|Marina Bay|싱가포르|Singapore/i,              ['f1-marina-bay', '51% 57%']],  /* B · 2024 싱가포르 GP · 보타스 C44 */
  [/^F1$/, /아메리카스|Americas|오스틴|Austin/i,                     ['f1-cota', '50% 55%']],  /* D · 2026 오스트리아 GP · 보타스 MAC-26 */
  [/^F1$/, /에르마노스|멕시코시티|Mexico City/i,                       ['f1-mexico-city', '50% 55%']],  /* D · 2026 호주 GP · 러셀 W17 */
  [/^F1$/, /인터라고스|Interlagos|상파울루|Sao Paulo/i,               ['f1-interlagos', '52% 58%']],  /* B · 2022 상파울루 GP · 노리스 MCL36 */
  [/^F1$/, /라스베이거스|Las Vegas/i,                              ['f1-las-vegas', '53% 53%']],  /* A · 2025 라스베이거스 GP · 르클레르 SF-25 */
  [/^F1$/, /루사일|Lusail/i,                                    ['f1-lusail', '50% 55%']],  /* D · 2026 오스트리아 GP · 해밀턴 SF-26 */
  [/^F1$/, /야스 마리나|Yas Marina/i,                             ['f1-yas-marina', '50% 55%']],  /* D · 2026 호주 GP · 피아스트리 MCL40 */

  /* ---------------- WEC (10) — 전부 하이퍼카 ---------------- */
  [/^WEC$/, /이몰라|Imola|엔초 에 디노/i,                            ['wec-imola', '50% 60%']],  /* B · 2025 이몰라 6시간 · #83 페라리 499P */
  [/^WEC$/, /스파|Spa-Francorchamps/i,                         ['wec-spa-francorchamps', '52% 52%']],  /* A · 2026 스파 6시간 · #35 알핀 A424 */
  [/^WEC$/, /사르트|Sarthe|르망 24시/i,                            ['wec-le-mans', '50% 48%']],  /* A · 2026 르망 24시 · #51 페라리 499P */
  [/^WEC$/, /인터라고스|Interlagos|파시|상파울루/i,                     ['wec-interlagos', '50% 55%']],  /* D · 2026 스파 6시간 · #93 푸조 9X8 */
  [/^WEC$/, /아메리카스|Americas|론스타/i,                           ['wec-cota', '50% 55%']],  /* D · 2026 르망 24시 · #007 애스턴마틴 발키리 */
  [/^WEC$/, /후지|Fuji/i,                                      ['wec-fuji', '50% 55%']],  /* D · 2026 스파 6시간 · #7 토요타 TR010 */
  [/^WEC$/, /카탈루냐|Catalunya|바르셀로나/i,                         ['wec-barcelona', '50% 55%']],  /* D · 2026 스파 6시간 · #20 BMW M 하이브리드 V8 */
  [/^WEC$/, /몬차|Monza/i,                                     ['wec-monza', '50% 55%']],  /* D · 2026 르망 24시 · #101 캐딜락 V-시리즈.R */
  [/^WEC$/, /루사일|Lusail|카타르|Qatar/i,                         ['wec-lusail', '45% 55%']],  /* D · 2026 르망 24시 (야간) · #12 캐딜락 V-시리즈.R */
  [/^WEC$/, /바레인|Bahrain|사키르/i,                              ['wec-bahrain', '50% 55%']],  /* D · 2026 르망 24시 · #19 제네시스 GMR-001 */

  /* ---------------- IMSA (11) — VIR만 GTD(그 경기에 GTP가 없다) ---------------- */
  [/^IMSA$/, /데이토나|Daytona/i,                                ['imsa-daytona', '52% 55%']],  /* B · 2023 데이토나 24시 · #6 포르쉐 963 */
  [/^IMSA$/, /세브링|Sebring/i,                                 ['imsa-sebring', '58% 68%']],  /* B · 2024 세브링 12시간 · #40 어큐라 ARX-06 */
  [/^IMSA$/, /롱비치|Long Beach/i,                              ['imsa-long-beach', '50% 60%']],  /* D · 2025 글렌 6시간 · #60 어큐라 ARX-06 */
  [/^IMSA$/, /라구나 세카|Laguna Seca/i,                          ['imsa-laguna-seca', '50% 62%']],  /* D · 2025 글렌 6시간 · #25 BMW M 하이브리드 V8 */
  [/^IMSA$/, /디트로이트|Detroit/i,                               ['imsa-detroit', '50% 60%']],  /* D · 2025 글렌 6시간 · #31 캐딜락 V-시리즈.R */
  [/^IMSA$/, /왓킨스|Watkins|글렌|Glen/i,                         ['imsa-watkins-glen', '46% 70%']],  /* A · 2026 글렌 6시간 · #10 캐딜락 V-시리즈.R */
  [/^IMSA$/, /모터스포트 파크|Mosport|모스포트/i,                       ['imsa-mosport', '50% 60%']],  /* D · 2026 글렌 6시간 · #7 포르쉐 963 */
  [/^IMSA$/, /로드 아메리카|Road America|Elkhart/i,                ['imsa-road-america', '55% 64%']],  /* B · 2025 로드 아메리카 · BMW M 하이브리드 V8 */
  [/^IMSA$/, /버지니아|Virginia|VIR/i,                           ['imsa-virginia', '50% 60%']],  /* D · 2026 글렌 6시간 · #4 코르벳 Z06 GT3.R (GTD) */
  [/^IMSA$/, /인디애나폴리스|Indianapolis/i,                        ['imsa-indianapolis', '50% 62%']],  /* D · 2025 글렌 6시간 · #63 람보르기니 SC63 */
  [/^IMSA$/, /로드 애틀랜타|Road Atlanta|프티 르망/i,                  ['imsa-road-atlanta', '48% 47%']],  /* B · 2025 프티 르망 · #23 애스턴마틴 발키리 */

  /* ---------------- GTWC (20) — 전부 GT3 ---------------- */
  [/^GTWC$/, /파노라마|Panorama|바투스트|Bathurst/i,                 ['gtwc-mount-panorama', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #46 BMW M4 GT3 */
  [/^GTWC$/, /세팡|Sepang/i,                                   ['gtwc-sepang', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #51 페라리 296 GT3 */
  [/^GTWC$/, /폴 리카르|Paul Ricard/i,                           ['gtwc-paul-ricard', '54% 53%']],  /* C · 2024 ELMS 르카스텔레 · #85 포르쉐 911 GT3 R */
  [/^GTWC$/, /브랜즈 해치|Brands Hatch/i,                         ['gtwc-brands-hatch', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #159 맥라렌 720S GT3 */
  [/^GTWC$/, /스파|Spa-Francorchamps/i,                        ['gtwc-spa-24h', '53% 47%']],  /* B · 2025 스파 24시 우승 · #63 람보르기니 */
  [/^GTWC$/, /뉘르부르크링 24시|Nürburgring 24/i,                   ['gtwc-nurburgring-24h', '58% 54%']],  /* C · 2024 NLS 2라운드 · #786 람보르기니 우라칸 GT3 */
  [/^GTWC$/, /몬차|Monza/i,                                    ['gtwc-monza', '49% 42%']],  /* A · 2026 GTWC 몬차 · BMW M4 GT3 (막스 헤세) */
  [/^GTWC$/, /미사노|Misano/i,                                  ['gtwc-misano', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #64 포드 머스탱 GT3 */
  [/^GTWC$/, /만달리카|Mandalika/i,                              ['gtwc-mandalika', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #63 람보르기니 우라칸 GT3 */
  [/^GTWC$/, /마니쿠르|Magny-Cours|느베르/i,                        ['gtwc-magny-cours', '50% 51%']],  /* B · 2022 GTWC 마니쿠르 · #89 메르세데스-AMG GT3 */
  [/^GTWC$/, /뉘르부르크링|Nürburgring|Nurburgring/i,              ['gtwc-nurburgring', '50% 52%']],  /* B · 2024 GTWC 뉘르부르크링 · #36 GT3 */
  [/^GTWC$/, /스즈카|Suzuka/i,                                  ['gtwc-suzuka', '52% 50%']],  /* C · 2024 스즈카 GT 3시간 · BMW M4 GT3 */
  [/^GTWC$/, /잔드보르트|Zandvoort/i,                             ['gtwc-zandvoort', '57% 52%']],  /* C · 2025 DTM 잔드보르트 · 포르쉐 911 GT3 R */
  [/^GTWC$/, /후지|Fuji/i,                                     ['gtwc-fuji', '50% 55%']],  /* C · 2024 슈퍼GT 후지 · 렉서스 RC F GT3 */
  [/^GTWC$/, /카탈루냐|Catalunya|바르셀로나/i,                        ['gtwc-barcelona', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #911 포르쉐 911 GT3 R */
  [/^GTWC$/, /인디애나폴리스|Indianapolis/i,                        ['gtwc-indianapolis', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #99 아우디 R8 LMS GT3 */
  [/^GTWC$/, /알가르브|Algarve|포르티망|Portimao|Portimão/i,         ['gtwc-portimao', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #48 메르세데스-AMG GT3 */
  [/^GTWC$/, /오카야마|Okayama/i,                                ['gtwc-okayama', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #2 메르세데스-AMG GT3 */
  [/^GTWC$/, /베이징|Beijing/i,                                 ['gtwc-beijing', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #007 애스턴마틴 밴티지 GT3 */
  [/^GTWC$/, /상하이|Shanghai/i,                                ['gtwc-shanghai', '50% 55%']],  /* D · 2024 GTWC 뉘르부르크링 · #333 페라리 296 GT3 */

  /* ---------------- WRC (14) — 전부 Rally1(스웨덴만 2019 WRC) ---------------- */
  [/^WRC$/, /몬테카를로|Monte-?Carlo|갑|Gap/i,                     ['wrc-monte-carlo', '50% 50%']],  /* D · 2026 크로아티아 · 뇌빌 i20 N Rally1 (편집) */
  [/^WRC$/, /스웨덴|Sweden|우메오|Ume/i,                           ['wrc-sweden', '50% 55%']],  /* B · 2019 스웨덴 · 라피 C3 WRC */
  [/^WRC$/, /사파리|Safari|나이바샤|Naivasha|케냐|Kenya/i,            ['wrc-safari', '50% 50%']],  /* D · 2026 아크로폴리스 · 세스크스 퓨마 Rally1 (편집) */
  [/^WRC$/, /크로아티아|Croatia|리예카|Rijeka/i,                     ['wrc-croatia', '64% 50%']],  /* A · 2026 크로아티아 · 맥얼린 퓨마 Rally1 */
  [/^WRC$/, /카나리아|Canarias|라스팔마스|Las Palmas/i,               ['wrc-canarias', '53% 52%']],  /* B · 2025 카나리아 · 로반페라 GR 야리스 Rally1 */
  [/^WRC$/, /포르투갈|Portugal|마토지뉴스|Matosinhos/i,               ['wrc-portugal', '55% 60%']],  /* D · 2026 핀란드 · 오지에 GR 야리스 Rally1 */
  [/^WRC$/, /재팬|Japan|도요타|Toyota City|아이치/i,                 ['wrc-japan', '52% 52%']],  /* B · 2024 랠리 재팬 · 가쓰타 GR 야리스 Rally1 */
  [/^WRC$/, /아크로폴리스|Acropolis|루트라키|Loutraki/i,               ['wrc-acropolis', '43% 39%']],  /* A · 2026 아크로폴리스 · 뇌빌 i20 N Rally1 */
  [/^WRC$/, /에스토니아|Estonia|타르투|Tartu/i,                      ['wrc-estonia', '55% 62%']],  /* D · 2026 핀란드 · 파야리 GR 야리스 Rally1 */
  [/^WRC$/, /핀란드|Finland|위배스퀼래|Jyv/i,                        ['wrc-finland', '65% 57%']],  /* A · 2026 핀란드 · 푸르모 i20 N Rally1 (편집) */
  [/^WRC$/, /파라과이|Paraguay|엔카르나시온|Encarnacion/i,             ['wrc-paraguay', '55% 58%']],  /* D · 2026 핀란드 · 세스크스 퓨마 Rally1 */
  [/^WRC$/, /칠레|Chile|탈카우아노|Talcahuano/i,                    ['wrc-chile', '50% 62%']],  /* D · 2026 아크로폴리스 · 솔베르그 GR 야리스 Rally1 */
  [/^WRC$/, /사르데냐|Sardegna|알게로|Alghero|올비아/i,                ['wrc-sardegna', '50% 65%']],  /* D · 2026 아크로폴리스 · 세르데리디스 퓨마 Rally1 */
  [/^WRC$/, /사우디|Saudi|제다|Jeddah/i,                          ['wrc-saudi', '50% 50%']]   /* D · 2026 아크로폴리스 · 암스트롱 퓨마 Rally1 (편집) */
];

/* 사진 출처: slug → [작가, 라이선스, Commons 파일 페이지]. 값은 Commons에 적힌 그대로다. */
var CREDIT = {
  'f1-albert-park': ["Yu Chu Chin", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:Red_Bull_Racing_RB22_of_Max_Verstappen_(028A8078).jpg"],
  'f1-bahrain': ["Liauzh", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2026_Bahrain_GP_-_Audi_-_Nico_Hulkenberg_-_FP1.jpg"],
  'f1-baku': ["Press Service of the President of the Republic of Azerbaijan", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Formula_1_2026_Azerbaijan_Grand_Prix_5.jpg"],
  'f1-barcelona': ["Roro00713", 'CC0', "https://commons.wikimedia.org/wiki/File:Fernand_Alonso_GP_Espagna2025_Pratice_3.jpg"],
  'f1-cota': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._77_Bottas_(3).jpg"],
  'f1-gilles-villeneuve': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._30_Lawson_(3).jpg"],
  'f1-hungaroring': ["Liauzh", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Williams_-_Alex_Albon_-_Qualifying.jpg"],
  'f1-interlagos': ["Leandro Neumann Ciuffo", 'CC BY 2.0', "https://commons.wikimedia.org/wiki/File:Lando_Norris_-_McLaren_(52499307604).jpg"],
  'f1-jeddah': ["Liauzh", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Aston_Martin_-_Fernando_Alonso_-_Qualifying.jpg"],
  'f1-las-vegas': ["DHSgov", 'Public domain', "https://commons.wikimedia.org/wiki/File:Las_Vegas_Grand_Prix_(54942077481).jpg"],
  'f1-lusail': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._44_Hamilton_(3).jpg"],
  'f1-madring': ["Liauzh", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Alpine_-_Franco_Colapinto_-_Qualifying.jpg"],
  'f1-marina-bay': ["Henrikkoh333", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Valtteri_Bottas_on_track,_Singapore_Grand_Prix_2024.jpg"],
  'f1-mexico-city': ["Yu Chu Chin", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:Mercedes-AMG_F1_W17_E_Performance_of_George_Russell_(028A8068).jpg"],
  'f1-miami': ["Dcmaradiaga", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2022_Miami_GP_-_Red_Bull_RB18_of_Sergio_P%C3%A9rez.jpg"],
  'f1-monaco': ["Liauzh", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_McLaren_-_Lando_Norris_-_Qualifying.jpg"],
  'f1-monza': ["Eustace Bagge", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Sergio_Perez_2026_Italian_Grand_Prix_qualifying.jpg"],
  'f1-red-bull-ring': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._10_Gasly_(3).jpg"],
  'f1-shanghai': ["Liauzh", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:2026_Chinese_GP_-_Ferrari_-_Charles_Leclerc_-_FP1.jpg"],
  'f1-silverstone': ["Jason Puddephatt", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:Red_Bull_F1_Car_(55383927464).jpg"],
  'f1-spa-francorchamps': ["Der Alf", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:F1_2026,_TGR_Haas_F1_Team,_Haas_VF-26,_Oliver_Bearman,_Spa_Francorchamps_(55425959105).jpg"],
  'f1-suzuka': ["Martin Lee from London, UK", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:Mercedes_W17_-_Kimi_Antonelli_approaches_Spoon_Curve_at_Suzuka_during_the_2026_Japanese_GP_(55194289192).jpg"],
  'f1-yas-marina': ["Yu Chu Chin", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:McLaren_MCL40_of_Oscar_Piastri_(028A8489).jpg"],
  'f1-zandvoort': ["Steffen Prößdorf", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2024-08-24_Motorsport,_Formel_1,_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3334_by_Stepro.jpg"],
  'gtwc-barcelona': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._911_Bachler,_Malykhin,_Sturm_(1).jpg"],
  'gtwc-beijing': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._007_Drudi,_S%C3%B8rensen,_Thiim.jpg"],
  'gtwc-brands-hatch': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._159_Gamble,_Goethe,_MacDonald_(1).jpg"],
  'gtwc-fuji': ["Abarabone1206", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:K-tunes_RC_F_GT3_2024_rd.2_FUJI.jpg"],
  'gtwc-indianapolis': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._99_Aka,_Feller,_Haase_(1).jpg"],
  'gtwc-magny-cours': ["nabtifal", 'CC BY 2.0', "https://commons.wikimedia.org/wiki/File:2022_GT_World_Challenge_Europe_Magny-Cours_(52127889868)_(cropped).png"],
  'gtwc-mandalika': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._63_Bortolotti,_Cairoli,_Caldarelli.jpg"],
  'gtwc-misano': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._64_Mies,_Olsen,_Vervisch.jpg"],
  'gtwc-monza': ["Fr16reda", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:Max_Hesse_all%27uscita_della_curva_Ascari_a_Monza.jpg"],
  'gtwc-mount-panorama': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._46_Marciello,_Martin,_Rossi.jpg"],
  'gtwc-nurburgring': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._36_Creswick,_Green,_Jansen_(1).jpg"],
  'gtwc-nurburgring-24h': ["SunflowerYuri", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:Lamborghini_786_NLS_2._2024.jpg"],
  'gtwc-okayama': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._2_Gounon,_Schiller,_Stolz.jpg"],
  'gtwc-paul-ricard': ["kallerna", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2024_4_Hours_of_Le_Castellet_23.jpg"],
  'gtwc-portimao': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._48_Auer,_Engel,_Morad_(1).jpg"],
  'gtwc-sepang': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._51_Pier_Guidi,_Rigon,_Rovera.jpg"],
  'gtwc-shanghai': ["Lukas Raich", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._333_Abbelen,_Fernandez_Laser,_Perel_(1).jpg"],
  'gtwc-spa-24h': ["Pitchdobrasil", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:La_Lamborghini_n%C2%B063_(Grasser_Racing_Team)_vainqueur_des_24_Heures_de_Spa_2025.jpg"],
  'gtwc-suzuka': ["Tokumeigakarinoaoshima", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:No.7_Studie_BMW_M4_at_2024_Suzuka_GT_3_Hours_Race_(4).jpg"],
  'gtwc-zandvoort': ["Roro00713", 'CC0', "https://commons.wikimedia.org/wiki/File:G%C3%BCven_Zandvoort_DTM_Race_2.jpg"],
  'imsa-daytona': ["Osajus Photography from Asheville, NC, United States", 'CC BY 2.0', "https://commons.wikimedia.org/wiki/File:DSC2044_(52679559658).jpg"],
  'imsa-detroit': ["SmackJam", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:Whelen_GTP_WGI25_02.jpg"],
  'imsa-indianapolis': ["SmackJam", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:Lambo_GTP_WGI25_02.jpg"],
  'imsa-laguna-seca': ["SmackJam", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:BMW_GTP_25_WGI25_02.jpg"],
  'imsa-long-beach': ["SmackJam", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:MSR_GTP_60_WGI25_01.jpg"],
  'imsa-mosport': ["SmackJam", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:PPM_GTP_7_WGI26_03.jpg"],
  'imsa-road-america': ["Sam Cobb", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:IMSA_Road_America_2025.jpg"],
  'imsa-road-atlanta': ["Osajus Photography from Oconee, SC, United States", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Aston_Martin_Valkyrie_(54852545205).jpg"],
  'imsa-sebring': ["Rick Flores from USA", 'CC BY 2.0', "https://commons.wikimedia.org/wiki/File:IMSA_Sebring_12H_2024_-i---i-_(53910493009).jpg"],
  'imsa-virginia': ["SmackJam", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:PrattMiller_Corvette_4_WGI26_02.jpg"],
  'imsa-watkins-glen': ["SmackJam", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:WTR_GTP_WGI26_03.jpg"],
  'wec-bahrain': ["T GOUREAU", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:24_Heures_du_Mans_2026_Hypercar_No._19_Genesis_GMR-001-Hypercar.jpg"],
  'wec-barcelona': ["MarcelX42", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2026_6_Hours_of_Spa-Francorchamps_BMW_M_Team_WRT_BMW_M_Hybrid_V8_No.20_(DSC09038).jpg"],
  'wec-cota': ["T GOUREAU", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:24_Heures_du_Mans_2026_Hypercar_No._007_Aston_Martin_Valkyrie.jpg"],
  'wec-fuji': ["MarcelX42", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2026_6_Hours_of_Spa-Francorchamps_Toyota_Racing_Toyota_TR010_Hybrid_No.7_(DSC09480).jpg"],
  'wec-imola': ["Road Atlanta Turn 5", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2025_6_Hours_of_Imola_AF_Corse_Ferrari_499P_No.83_-_Hanson,_Kubica,_Ye.jpg"],
  'wec-interlagos': ["MarcelX42", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2026_6_Hours_of_Spa-Francorchamps_Peugeot_TotalEnergies_Peugeot_9X8_No.93_(DSC01465).jpg"],
  'wec-le-mans': ["T GOUREAU", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:24_Heures_du_Mans_2026_Hypercar_No._51_Ferrari_499P.jpg"],
  'wec-lusail': ["T GOUREAU", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:24_Heures_du_Mans_2026_Hypercar_No._12_Cadillac_V-Series.R_(night).jpg"],
  'wec-monza': ["T GOUREAU", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:24_Heures_du_Mans_2026_Hypercar_No._101_Cadillac_V-Series.R.jpg"],
  'wec-spa-francorchamps': ["MarcelX42", 'CC BY-SA 4.0', "https://commons.wikimedia.org/wiki/File:2026_6_Hours_of_Spa-Francorchamps_Alpine_Endurance_Team_Alpine_A424_No.35_(DSC07629).jpg"],
  'wrc-acropolis': ["Geonich", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:I20N_Hyundai.jpg"],
  'wrc-canarias': ["Respinya", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Kalle_ROVANPER%C3%84_-_Rally_Islas_Canarias_2025.jpg"],
  'wrc-chile': ["Geonich", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:SSS_Toyota_Yaris_Rally_1.jpg"],
  'wrc-croatia': ["AnDr0 Gr0zNy", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:FordWRC.jpg"],
  'wrc-estonia': ["Antti Leppänen", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Sami_Pajari_Rally_Finland_2026_Leustu.jpg"],
  'wrc-finland': ["Antti Leppänen", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Adrien_Fourmaux_Rally_Finland_2026_Leustu.jpg"],
  'wrc-japan': ["TTTNIS", 'CC0', "https://commons.wikimedia.org/wiki/File:2024_Toyota_GR_Yaris_Rally_1_Katsuta.jpg"],
  'wrc-monte-carlo': ["AnDr0 Gr0zNy", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:HyundaiRally1.jpg"],
  'wrc-paraguay': ["Antti Leppänen", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:M%C4%81rti%C5%86%C5%A1_Sesks_Rally_Finland_2026_Leustu.jpg"],
  'wrc-portugal': ["Antti Leppänen", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:S%C3%A9bastien_Ogier_Rally_Finland_2026_Leustu.jpg"],
  'wrc-safari': ["Geonich", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Ford_Puma_WRC.jpg"],
  'wrc-sardegna': ["Geonich", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Jourdan_Serderidis_2026_Rally_Acropolis.jpg"],
  'wrc-saudi': ["Geonich", 'CC BY 4.0', "https://commons.wikimedia.org/wiki/File:Armstrong_2026_Rally_Acropolis.png"],
  'wrc-sweden': ["SSauma", 'Public domain', "https://commons.wikimedia.org/wiki/File:2019_Rally_Sweden_-_Lappi.jpg"],
};

/* MAP에 없는 경기(데이터가 늘어난 경우)를 위한 예비. 같은 시리즈 사진을 다시 쓴다 — 여기서만 중복이 날 수 있다. */
var SPARE = {
  IMSA: ['imsa-daytona', 'imsa-sebring', 'imsa-long-beach', 'imsa-laguna-seca', 'imsa-detroit', 'imsa-watkins-glen', 'imsa-mosport', 'imsa-road-america', 'imsa-virginia', 'imsa-indianapolis', 'imsa-road-atlanta'],
  WRC:  ['wrc-monte-carlo', 'wrc-sweden', 'wrc-safari', 'wrc-croatia', 'wrc-canarias', 'wrc-portugal', 'wrc-japan', 'wrc-acropolis', 'wrc-estonia', 'wrc-finland', 'wrc-paraguay', 'wrc-chile', 'wrc-sardegna', 'wrc-saudi'],
  GTWC: ['gtwc-mount-panorama', 'gtwc-sepang', 'gtwc-paul-ricard', 'gtwc-mandalika', 'gtwc-brands-hatch', 'gtwc-nurburgring-24h', 'gtwc-monza', 'gtwc-spa-24h', 'gtwc-fuji', 'gtwc-misano', 'gtwc-magny-cours', 'gtwc-okayama', 'gtwc-nurburgring', 'gtwc-suzuka', 'gtwc-zandvoort', 'gtwc-barcelona', 'gtwc-beijing', 'gtwc-indianapolis', 'gtwc-portimao', 'gtwc-shanghai'],
  F1:   ['f1-albert-park', 'f1-shanghai', 'f1-suzuka', 'f1-jeddah', 'f1-miami', 'f1-gilles-villeneuve', 'f1-monaco', 'f1-barcelona', 'f1-red-bull-ring', 'f1-silverstone', 'f1-spa-francorchamps', 'f1-hungaroring', 'f1-zandvoort', 'f1-monza', 'f1-madring', 'f1-baku', 'f1-bahrain', 'f1-marina-bay', 'f1-cota', 'f1-mexico-city', 'f1-interlagos', 'f1-las-vegas', 'f1-lusail', 'f1-yas-marina'],
  WEC:  ['wec-imola', 'wec-spa-francorchamps', 'wec-le-mans', 'wec-interlagos', 'wec-cota', 'wec-fuji', 'wec-barcelona', 'wec-lusail', 'wec-bahrain', 'wec-monza']
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

function photo(e, size) { return file(photoOf(e)[0], size); }
function photoPos(e) { return photoOf(e)[1] || 'center 42%'; }
/* { by, license, url } — 화면 표기는 i18n 'photo.credit'. */
function photoCredit(e) {
  var c = CREDIT[photoOf(e)[0]];
  return c ? { by: c[0], license: c[1], url: c[2] } : null;
}

export { photo, photoCredit, photoPos, photoOf, MAP, SPARE, CREDIT };
