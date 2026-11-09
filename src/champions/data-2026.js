// 2026 시즌 챔피언 — 시리즈마다 한 덩어리. 값은 출처 기사에 적힌 그대로 옮긴다(이름 표기·차 번호·팀 이름).
// 기사에 없는 값은 넣지 않는다(빈칸). F1 점수·승수는 여기 적지 않고 결과 데이터(src/results/f1-2026.json, Jolpica)에서 읽는다.
//
// 상태는 시각으로 정해진다(champions.js)
//  - decidedBy: 확정된 경기 id. 그 경기의 결정 시각(at: 'start' | 'end', 기본 end)이 지나야 '확정'으로 보인다.
//  - deciding: 아직 결정 전이고 마지막 경기에서 정해지는 경우. 그 주말 동안만 '결정 중'으로 보이고, 경기가 끝나면
//    결과를 여기 옮겨 적기 전까지 숨는다(지어내지 않는다).
// 확인: 2026-11-09 기준.
//
// stats: 시즌 기록 칸(점수 · 우승 · 2·3위 · 2위와 차이). 출처에 있는 값만 넣고 없으면 그 칸을 뺀다. F1은 큰 카드의 결과 띠가 같은 일을 한다.
//  - k: 'pts' | 'wins' | 'p23' | 'gap'. 2위 이름은 주석에만 둔다(화면에 싣지 않는다)
//
// photo: 카드 사진. 저장소에 이미 있는 Commons 사진(public/photos/races/<slug>.webp, 출처는 src/home/photos.js CREDIT)을 slug로 다시 쓴다.
//  - pos · zoom: object-fit cover로 채운 뒤 pos 점을 기준으로 zoom만큼 키운다(그 점이 transform-origin). 띠 비율 약 16:9 기준
//  - tpos · tzoom: 홈 한 줄 작은 사진(4:3 남짓). 없으면 pos · zoom
//  - team: 챔피언의 차가 아니라 같은 팀 차(화면엔 표시하지 않는다 — 출처만 싣는다). 번호가 안 보이게 잘랐다.
//    챔피언 차 사진은 Commons에서 받을 수 있게 되면 바꾼다(DEV-NOTES '사진').
//  - 챔피언용 사진을 따로 넣을 때: public/photos/champions/<slug>.webp(1600w) · <slug>-card.webp(800w)에 두고
//    { slug, dir: '/photos/champions/', credit: [작가, 라이선스, Commons 파일 페이지], pos, zoom }. team은 뺀다

export const SEASON = 2026;

export const CHAMPIONS = {
  F1: {
    title: 'f1.drivers',
    decidedBy: 'f1-2026-19-mexicocitygrandprix',
    // 이름·팀·색·사진·점수는 결과 데이터의 이 코드 줄을 쓴다
    code: 'ANT', number: '12',
    // 역대 최연소: 확정 당시 만 20세(20세 68일). 이전 기록 Sebastian Vettel 23세 133일(2010) — 화면엔 '만 20세'만
    story: { key: 'champ.story.youngest', p: { y: 20 } },
    sources: [
      'https://www.formula1.com/en/latest/article/f1s-youngest-world-champions-as-antonelli-smashes-the-record.4otUr4h4wmWd6VmIEaNjzV',
      'https://www.racefans.net/2026/11/01/antonelli-clinches-2026-title-and-smashes-record-for-youngest-formula-1-world-champion/',
    ],
  },
  WEC: {
    title: 'wec.hypercarDrivers',
    // 몬차 최종전(11/8)에서 #8이 11위로 들어와 확정. 경기가 끝나기 전에는 '결정 중'(바르셀로나 뒤 #8이 17점 앞서 있었다)
    decidedBy: 'wec-2026-8-6hoursofmonza',
    deciding: { race: 'wec-2026-8-6hoursofmonza', leader: { car: '8', team: 'Toyota', drivers: ['Buemi', 'Hartley', 'Hirakawa'] }, lead: 17 },
    drivers: [{ given: 'Sébastien', family: 'Buemi' }, { given: 'Brendon', family: 'Hartley' }, { given: 'Ryo', family: 'Hirakawa' }],
    car: '8', team: 'Toyota Racing',
    // 114점(마지막 경기 11위 0점) · 우승 3(이몰라 · 후지 · 바르셀로나, FIA) · 2위 #7 Toyota 97점, 17점 차
    stats: [{ k: 'pts', v: 114 }, { k: 'wins', v: 3 }, { k: 'gap', v: 17 }],
    others: [
      { title: 'wec.hypercarMakers', name: 'Toyota', decidedBy: 'wec-2026-7-6hoursofbarcelona' },
    ],
    // 2026 스파 6시간 #7 TR010(같은 팀 차)의 뒤쪽 — 날개 'TOYOTA RACING' · DENSO. 차 번호가 안 보이게 잘랐다
    photo: { slug: 'wec-fuji', pos: '100% 18%', zoom: 2.1, tpos: '85% 12%', tzoom: 2.2, team: true },
    sources: [
      'https://www.fiawec.com/en/news/breaking-news-cadillac-win-at-monza-8-crew-take-title/13932',
      'https://rnt-motorsports.com/wec-standings-2026/',
      'https://grandepremio.com/en/endurance/wec/hartley-and-hirakawa-lead-toyota-title-battle-heading-into-2026-wec-finale-at-monza/',
      'https://www.dailysportscar.com/2026/11/08/buemi-hartley-hirakawa-crowned-champions-as-toyota-caps-dominant-season.html',
      'https://racer.com/2026/11/08/quiet-wec-title-clinches-taste-just-as-sweet-for-toyota-tf-sport',
      'https://racingnews365.com/2026-wec-six-hours-of-barcelona-results',
      'https://www.circuitcat.com/en/news/wec-en/toyota-is-crowned-fia-wec-world-champion-with-a-one-two-finish-at-the-circuit/',
    ],
  },
  IMSA: {
    title: 'imsa.gtpDrivers',
    // 결승 출발과 함께 확정(147점 앞선 채 시작) → 결정 시각은 결승 시작
    decidedBy: 'imsa-2026-11-motulpetitlemans', at: 'start',
    drivers: [{ given: 'Jack', family: 'Aitken' }],
    car: '31', team: 'Cadillac Whelen · Action Express Racing',
    // 우승 2(디트로이트 · 왓킨스 글렌) · 포디움 7 → 2·3위 5. 최종 점수 · 2위와 차이는 출처마다 달라(147 · 151 · 161) 넣지 않는다
    stats: [{ k: 'wins', v: 2 }, { k: 'p23', v: 5 }],
    others: [
      { title: 'imsa.gtpTeams', name: 'No. 31 Cadillac Whelen', sub: 'Aitken · Bamber · Vesti' },
      { title: 'imsa.gtpMakers', name: 'Cadillac' },
    ],
    // 클래스별 드라이버 챔피언(IMSA 공식 발표 그대로). sub(팀 · 차)는 기록으로만 두고 화면엔 싣지 않는다
    classes: [
      { title: 'imsa.lmp2', name: 'Kurtz · Quinn', sub: 'No. 04 CrowdStrike Racing by APR' },
      { title: 'imsa.gtdPro', name: 'De Phillippi · Verhagen', sub: 'No. 1 Paul Miller Racing · Chevrolet' },
      { title: 'imsa.gtd', name: 'Ward · Ellis', sub: 'No. 57 Winward Racing · Mercedes-AMG' },
    ],
    // 2025 글렌 6시간 #31 캐딜락 V-시리즈.R — 챔피언 차
    photo: { slug: 'imsa-detroit', pos: '42% 100%', zoom: 1.45, tpos: '40% 100%', tzoom: 1.25 },
    sources: [
      'https://www.imsa.com/news/2026/october/05/imsa-honors-all-its-best-at-2026-weathertech-night-of-champions',
      'https://news.gm.com/home.detail.html/Pages/news/us/en/2026/oct/1005-cadillac-manufacturer-team-driver-petit-le-mans.html',
      'https://sports.yahoo.com/articles/cadillac-won-imsa-gtp-title-140447589.html',
      'https://en.wikipedia.org/wiki/2026_IMSA_SportsCar_Championship',
    ],
  },
  WRC: {
    title: 'wrc.drivers',
    decidedBy: 'wrc-2026-13-rallyitaliasardegna',
    drivers: [{ given: 'Elfyn', family: 'Evans' }],
    coDriver: 'Scott Martin',
    team: 'Toyota Gazoo Racing',
    // 243점 · 우승 2(스웨덴 · 재팬) · 2위 Solberg 238점, 5점 차(13경기, 사우디 취소)
    stats: [{ k: 'pts', v: 243 }, { k: 'wins', v: 2 }, { k: 'gap', v: 5 }],
    // 2026 랠리 핀란드 GR 야리스 Rally1(같은 팀 차)의 앞쪽. 차 번호 · 이름이 안 보이게 잘랐다
    photo: { slug: 'wrc-estonia', pos: '41% 66%', zoom: 2.2, tpos: '52% 66%', tzoom: 2.6, team: true },
    sources: [
      'https://www.wrc.com/en/news/evans-crowned-2026-wrc-champion-in-sardinia-thriller',
      'https://dirtfish.com/rally/wrc/evans-wins-wrc-title-after-solberg-powerstage-crash/',
      'https://racer.com/2026/10/04/last-gasp-solberg-error-gives-evans-wrc-title-in-dramatic-rally-sardinia-finale',
      'https://www.autohebdof1.com/news/rally/WRC-2026-final-championship-standings-after-the-Rally-of-Sardinia.html',
      'https://en.wikipedia.org/wiki/2026_World_Rally_Championship',
    ],
  },
  GTWC: {
    title: 'gtwc.euOverall',
    // 확정 시점은 출처마다 다르다(Pirelli: 포르티망 전날 항소 결과로 확정, Wikipedia 요약: 바르셀로나). 시즌 끝(포르티망) 뒤에만 보인다
    decidedBy: 'gtwc-2026-5-3hoursofportimo',
    drivers: [{ given: 'Maro', family: 'Engel' }, { given: 'Lucas', family: 'Auer' }],
    car: '48', team: 'Mercedes-AMG Team Mann-Filter',
    // 공식 순위표(10라운드): 131.5점 · 2위 Feller · Buus 120점, 11.5점 차. 우승 수는 출처에 없다
    stats: [{ k: 'pts', v: 131.5 }, { k: 'gap', v: 11.5 }],
    others: [
      { title: 'gtwc.euEndurance', name: 'Engel · Auer · Stolz', sub: '#48 Mercedes-AMG' },
      { title: 'gtwc.euSprint', name: 'Feller · Buus', sub: '#80 Lionspeed GP Porsche' },
      { title: 'gtwc.euTeams', name: 'Team WRT' },
    ],
    // 2024 GTWC 뉘르부르크링 #48 Mercedes-AMG GT3 — 챔피언 차(그때 Auer · Engel · Morad)
    photo: { slug: 'gtwc-portimao', pos: '55% 90%', zoom: 1.06, tpos: '40% 70%', tzoom: 1.4 },
    sources: [
      'https://press.pirelli.com/pirelli-record-breaking-gt-world-challenge-europe-season-draws-to-a-close-at-portimo/',
      'https://www.gt-world-challenge-europe.com/standings?filter_standing_type=0_0_drivers',
    ],
  },
};
