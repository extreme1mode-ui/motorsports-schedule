// design/photomap.js를 그대로 이식한 것. 정규식 목록·선택 로직을 여기서 고치지 말 것 (원본을 고치고 다시 옮긴다).
// 스펙: design/HOME-SPEC.md 9장.

var PX_='https://images.pexels.com/photos/', US_='https://images.unsplash.com/photo-';
function px(id,w){return PX_+id+'/pexels-photo-'+id+'.jpeg?auto=compress&cs=tinysrgb&w='+(w||1400);}
function us(id,w){return US_+id+'?w='+(w||1400)+'&q=75&auto=format&fit=crop';}

/* 경기장이 화면에서 식별되는 컷만. 전부 직접 눈으로 확인했다. */
var VENUE=[
  [/바쿠|Baku/i,                                   ['px','28403116']],  /* 플레임 타워 */
  [/마리나 베이|Marina Bay|싱가포르|Singapore/i,     ['px','33839923']],  /* HOME OF F1 NIGHT RACING */
  [/인터라고스|Interlagos|상파울루|Sao Paulo|São Paulo/i, ['px','34722768']],  /* 만원 관중석 */
  [/야스 마리나|Yas Marina|아부다비|Abu Dhabi/i,     ['px','17424277']],  /* 야간 주행 */
  [/잔드보르트|Zandvoort/i,                         ['px','34025287']],  /* 그리드 */
  [/바르셀로나|Barcelona|카탈루냐|Catalunya/i,        ['px','17555047']],
  [/헝가로링|Hungaroring/i,                         ['px','30054754']],
  [/스파-프랑코르샹|Spa-Francorchamps/i,             ['px','39520687']],  /* 관중 + 오 루즈 */
  [/실버스톤|Silverstone/i,                         ['px','36920243']],  /* 만원 그랜드스탠드 */
  [/레드불 링|Red Bull Ring|슈필베르크|Spielberg/i,  ['px','25329321']],
  [/뉘르부르크링|Nürburgring|Nurburgring/i,          ['px','18956548']],  /* 노르트슐라이페 */
  [/이몰라|Imola/i,                                 ['px','32282040']],  /* 페라리 깃발 */
  [/몬차|Monza/i,                                   ['px','14809396']],
  [/포르티망|Portimao|Portimão|Algarve|알가르브/i,   ['px','10373664']],
  [/에르마노스 로드리게스|멕시코시티|Mexico City/i,   ['px','11482791']],
  [/라스베이거스|Las Vegas/i,                        ['px','33466033','center 58%']],  /* 스트립 야경 */
  [/바레인|Bahrain|사키르|Sakhir/i,                  ['px','32536579','center 38%']],  /* 조명 켜진 타워 */
  [/오스틴|Austin|서킷 오브 디 아메리카스|Circuit of The Americas/i, ['px','4340666']],
  [/인디애나폴리스|Indianapolis/i,                   ['px','13977427','center 66%']],  /* 파고다 */
  [/데이토나|Daytona/i,                              ['px','15397464']],  /* 야간 */
  [/세브링|Sebring/i,                                ['px','6694230']],
  [/디트로이트|Detroit/i,                            ['px','37886246']],
  [/모나코 서킷|Monaco Grand Prix|모나코 그랑프리/i,  ['px','8336589']],
  [/24 ?Hours of Le Mans|르망 24시|Sarthe|사르트/i,   ['px','32628853']],  /* 야간 피트 */
  [/후지|Fuji/i,                                     ['px','35040838','center 34%']],
  [/올비아|Olbia|Sardegna|사르데냐/i,                 ['px','26978202']],
  [/로드 아메리카|Road America|Elkhart/i,            ['px','11149057']]
];

/* 같은 경기장이라도 시리즈에 따라 다른 컷이 맞는 경우 */
var VENUE2=[
  [/^GTWC/, /몬차|Monza/i,                    ['px','31411920']],  /* GT 그리드 */
  [/^GTWC/, /바르셀로나|Barcelona|Catalunya/i, ['px','17555046']]
];

/* 랠리는 노면이 그림을 결정한다. 데이터에 노면 필드가 없어 대회별로 지정.
   id가 아니라 시리즈+라운드를 키로 쓴다 — id 형식이 바뀌어도 안 깨지게. */
var RALLY_SURFACE={
  'WRC-1':'snow',   /* Monte-Carlo */
  'WRC-2':'snow',   /* Sweden */
  'WRC-4':'tarmac', /* Croatia */
  'WRC-5':'tarmac', /* Islas Canarias */
  'WRC-7':'tarmac', /* Japan */
  'WRC-14':'tarmac' /* Saudi Arabia */
};
function roundKey(e){return e.series+'-'+(e.round!=null?e.round:(e.plannedRound!=null?e.plannedRound:e.id));}
var RALLY={
  snow:  [['px','11097899'],['px','36378930'],['px','11098117']],
  tarmac:[['px','17140848'],['px','11320524']],
  gravel:[['px','9609128'],['px','35334279'],['px','17186559']]
};

/* 경기장을 특정할 수 없을 때. 비어 있는 트랙 대신 현장감 있는 컷으로. */
var BUCKET={
  F1:  [['px','29320677'],['px','29309760'],['px','36920232'],['px','29309753']],
  WEC: [['px','14578663'],['us','1784026006678-746ddfccca7d'],['px','17308796']],
  IMSA:[['us','1740784771841-6d2188d21f20'],['px','8756272'],['px','13237913']],
  GTWC:[['us','1547025603-ef800f02690e'],['us','1786640779762-a6da2f08e231'],['px','31411920']],
  WRC: RALLY.gravel
};

function hash(s){var h=0,i;for(i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0;}return Math.abs(h);}
function pick(list,id){return list[hash(id)%list.length];}
function photoOf(e){
  /* 한글·영문 필드를 모두 넣는다. 어느 쪽 이름으로 와도 같은 경기장으로 걸리게. */
  var key=[e.circuit,e.circuitKo,e.city,e.cityKo,e.country,e.countryKo,
           e.name,e.nameKo,e.officialName,e.displayName].filter(Boolean).join(' ');
  var i,j;
  for(i=0;i<VENUE2.length;i++){
    if(VENUE2[i][0].test(e.series)&&VENUE2[i][1].test(key))return VENUE2[i][2];
  }
  for(j=0;j<VENUE.length;j++){ if(VENUE[j][0].test(key))return VENUE[j][1]; }
  if(e.series==='WRC') return pick(RALLY[RALLY_SURFACE[roundKey(e)]||'gravel'],roundKey(e));
  return pick(BUCKET[e.series]||BUCKET.F1,roundKey(e));
}
function photo(e,w){var p=photoOf(e);return p[0]==='px'?px(p[1],w):us(p[1],w);}
function photoCredit(e){return photoOf(e)[0]==='px'?'PEXELS':'UNSPLASH';}
function photoPos(e){return photoOf(e)[2]||'center 42%';}

export { photo, photoCredit, photoPos, photoOf, VENUE, VENUE2, RALLY_SURFACE, RALLY, BUCKET };
