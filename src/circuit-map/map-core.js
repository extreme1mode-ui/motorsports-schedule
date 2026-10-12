/* eslint-disable */
// Live circuit map core. Venue-agnostic: everything that differs per race (VN) comes from venues/<id>.js,
// the measured base (D) from base.json. Mounted by CircuitMap.jsx; the app owns clock, theme and exit.
export function GantryMap(HOST, D, VN){
'use strict';
/* ════════════════════════════════════════════════════════════
   Gantry · Live Circuit Map
   ════════════════════════════════════════════════════════════ */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ico = (id, cls) => `<svg class="ico ${cls||''}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const mqDesk = window.matchMedia('(min-width:900px)');

/* ── storage ── */
const store = HOST.store;

/* global listeners are recorded so another venue's map can replace this one (destroy) */
const OFF = [];
const onG = (t, type, fn, o) => { t.addEventListener(type, fn, o); OFF.push(() => t.removeEventListener(type, fn, o)); };

/* ── projection (metres, north-up) ── */
const LON0 = VN.proj.lon0, LAT0 = VN.proj.lat0, KX = Math.cos(VN.proj.kxLat*Math.PI/180)*111320, KY = 110574;
const P = (lon, lat) => ({x:(lon-LON0)*KX, y:(LAT0-lat)*KY});

/* ════════ TRACK ════════ */
const TP = D.track.pts;              // race order, closed (last == first)
const TL = D.track.L;
const cum = [0];
for(let i=1;i<TP.length;i++) cum.push(cum[i-1] + Math.hypot(TP[i][0]-TP[i-1][0], TP[i][1]-TP[i-1][1]));
const LEN = cum[cum.length-1];
function ptAt(s){
  s = ((s % LEN) + LEN) % LEN;
  let lo = 0, hi = cum.length-1;
  while(hi-lo>1){ const m=(lo+hi)>>1; if(cum[m] <= s) lo=m; else hi=m; }
  const t = (s-cum[lo])/((cum[hi]-cum[lo])||1);
  return {x: TP[lo][0]+(TP[hi][0]-TP[lo][0])*t, y: TP[lo][1]+(TP[hi][1]-TP[lo][1])*t};
}
function tanAt(s, h){ h=h||6; const a=ptAt(s-h), b=ptAt(s+h); const l=Math.hypot(b.x-a.x,b.y-a.y)||1; return {x:(b.x-a.x)/l, y:(b.y-a.y)/l}; }
const STEP = 4, NS_ = Math.floor(LEN/STEP);
const SAMP = []; for(let i=0;i<NS_;i++){ const p=ptAt(i*STEP); SAMP.push([p.x,p.y,i*STEP]); }
const pathD = pts => 'M' + pts.map(p => (p[0]!=null?p[0]:p.x).toFixed(1)+' '+(p[1]!=null?p[1]:p.y).toFixed(1)).join('L');
const TRACK_D = pathD(TP) + 'Z';
function arcPts(s0, s1){ const out=[]; if(s1<s0) s1+=LEN; for(let s=s0;s<=s1;s+=STEP) out.push(ptAt(s)); out.push(ptAt(s1)); return out; }

/* turns */
const OVERTAKE_T = VN.overtake;
const TURNS = Object.keys(D.track.turns).map(k => {
  const n=+k, s=D.track.turns[k], p=ptAt(s);
  const t1=tanAt(s-22,8), t2=tanAt(s+22,8);
  const cross = t1.x*t2.y - t1.y*t2.x;
  const tm = {x:t1.x+t2.x, y:t1.y+t2.y}; const l=Math.hypot(tm.x,tm.y)||1; tm.x/=l; tm.y/=l;
  const nrm = cross>0 ? {x:tm.y, y:-tm.x} : {x:-tm.y, y:tm.x};   // outside of the corner
  return {n, s, x:p.x, y:p.y, nx:nrm.x, ny:nrm.y, ot: OVERTAKE_T.includes(n)};
});

/* pit lane: OSM 'Pit Lane' (raceway) when the base has it; otherwise an offset of the start/finish straight */
const BM = D.bm || null, EVT = D.evt || null;
const PIT_D = BM && BM.pit ? pathD(BM.pit) : (() => {
  const s0 = VN.pitFallback[0], s1 = LEN + VN.pitFallback[1], out=[];
  for(let s=s0; s<=s1; s+=STEP){
    const u = s-s0, v = s1-s; const off = 24*Math.min(1, u/70, v/70);
    const p=ptAt(s), t=tanAt(s); out.push({x:p.x + t.y*off, y:p.y - t.x*off});
  }
  return pathD(out);
})();

/* ════════ PLACES ════════ */
const SPOTS = VN.spots.map(o => Object.assign({}, o));
const STAGES = VN.stages.map(o => Object.assign({}, o));
const GATES = VN.gates.map(o => Object.assign({}, o));
/* gates: number and name are both optional (some official maps print neither) — gname is what '… 게이트' reads */
const gNum = n => /^\d/.test(n) ? n+'번' : n;
GATES.forEach(g => { g.n = g.n || ''; g.name = g.name || ''; g.gname = g.name || (g.n ? gNum(g.n) : g.st ? g.st+' 쪽' : '입장'); g.short = g.n && g.name ? g.n+'번 · '+g.name : g.gname; })
const MRTS = VN.transit.items.map(o => Object.assign({}, o));
const VILLAGES = VN.village.items.map(o => Object.assign({}, o));
const LANDMARKS = VN.landmarks.map(o => Object.assign({}, o));
const TR = VN.transit, ZONES = VN.zones || null;
[SPOTS,STAGES,GATES,MRTS,VILLAGES,LANDMARKS].forEach(a => a.forEach(o => Object.assign(o, o.xy ? {x:o.xy[0], y:o.xy[1]} : o.ll ? P(o.ll[0], o.ll[1]) : {})));
/* official positions — the venue's official map moved onto the measured map (track-anchored warp), OSM where a place is mapped */
const STAND_OF = VN.standOf || {};
const EXTRA_STANDS = VN.extraStands || [];
const MRT_XY = TR.xy || {};
if(EVT){
  SPOTS.forEach(sp => { const st = EVT.stands[STAND_OF[sp.id]]; if(st){ sp.x = st.c[0]; sp.y = st.c[1]; sp.official = st; } });
  const byId = (arr, id) => (arr || []).find(o => o.id===id);
  STAGES.forEach(o => { const e = byId(EVT.stages, o.id); if(e){ o.x = e.xy[0]; o.y = e.xy[1]; } });
  VILLAGES.forEach(o => { const e = byId(EVT.villages, o.id); if(e){ o.x = e.xy[0]; o.y = e.xy[1]; } });
  GATES.forEach(o => { const e = byId(EVT.gates, o.id); if(e){ o.x = e.xy[0]; o.y = e.xy[1]; } });
}
MRTS.forEach(o => { const q = MRT_XY[o.id]; if(q){ o.x = q[0]; o.y = q[1]; } });
const BYID = {};
SPOTS.forEach(o => BYID['spot:'+o.id]=Object.assign(o,{type:'spot'}));
STAGES.forEach(o => BYID['stage:'+o.id]=Object.assign(o,{type:'stage'}));
GATES.forEach(o => BYID['gate:'+o.id]=Object.assign(o,{type:'gate'}));
MRTS.forEach(o => BYID['mrt:'+o.id]=Object.assign(o,{type:'mrt'}));
VILLAGES.forEach(o => BYID['village:'+o.id]=Object.assign(o,{type:'village'}));
TURNS.forEach(o => BYID['turn:'+o.n]=Object.assign(o,{type:'turn',id:String(o.n),name:o.n+'번 코너'}));
const stageName = id => { const s=BYID['stage:'+id]; return s.short || s.name; };

/* stand structure: a slim block parallel to the closest part of the track */
SPOTS.forEach(sp => {
  if(sp.official){ sp.standD = sp.official.d; sp.ends = sp.official.ends.map(q => ({x:q[0], y:q[1]})); return; }
  let bi=0, bd=1e12; SAMP.forEach((q,i) => { const d=(q[0]-sp.x)**2+(q[1]-sp.y)**2; if(d<bd){bd=d;bi=i;} });
  const t = tanAt(SAMP[bi][2], 14); const L = sp.L, W = 10;
  const ux=t.x, uy=t.y, vx=-t.y, vy=t.x;
  const c = (a,b) => (sp.x+ux*a+vx*b).toFixed(1)+' '+(sp.y+uy*a+vy*b).toFixed(1);
  sp.standD = `M${c(-L/2,-W/2)}L${c(L/2,-W/2)}L${c(L/2,W/2)}L${c(-L/2,W/2)}Z`;
  sp.ends = [{x:sp.x-ux*L/2, y:sp.y-uy*L/2}, {x:sp.x+ux*L/2, y:sp.y+uy*L/2}];
});
/* spot coverage — the part of the track within sight radius (estimate) */
SPOTS.forEach(sp => {
  const inR = SAMP.map(q => Math.hypot(q[0]-sp.x, q[1]-sp.y) <= sp.R);
  const ranges=[]; let start=-1;
  for(let i=0;i<=inR.length;i++){
    const v = i<inR.length && inR[i];
    if(v && start<0) start=i;
    if(!v && start>=0){ ranges.push([start*STEP,(i-1)*STEP]); start=-1; }
  }
  if(ranges.length>1 && ranges[0][0]===0 && ranges[ranges.length-1][1]>=LEN-STEP*2){ const last=ranges.pop(); ranges[0]=[last[0], ranges[0][1]+LEN]; }
  sp.cov = ranges;
  sp.covLen = Math.round(ranges.reduce((a,r)=>a+(r[1]-r[0]),0));
  const inCov = s => ranges.some(r => (s>=r[0]&&s<=r[1]) || (s+LEN>=r[0]&&s+LEN<=r[1]));
  sp.turns = TURNS.filter(t => inCov(t.s)).map(t => t.n);
  if(!sp.turns.length){   // nothing within sight radius (stand on a long straight): the corner nearest along the lap from the closest track point
    let bi=0, bd=1e12; SAMP.forEach((q,i) => { const d=(q[0]-sp.x)**2+(q[1]-sp.y)**2; if(d<bd){bd=d;bi=i;} });
    const s0 = SAMP[bi][2]; let best=null, bs=1e9; TURNS.forEach(t => { const d = Math.abs(((t.s - s0) % LEN + LEN*1.5) % LEN - LEN/2); if(d<bs){bs=d;best=t;} }); sp.turns=[best.n]; }
});

/* ════════ TIME ════════ */
const H = 36e5, M = 6e4;
const TZ = VN.tz.off, TZA = VN.tz.abbr;
const DAY0 = Date.UTC(VN.day0[0], VN.day0[1], VN.day0[2]) - TZ*H;   // first day, 00:00 local
const DAYS = VN.days, ND = DAYS.length, DIDX = DAYS.map((_,i)=>i);
const tm = (day, hhmm) => { const [h,m]=hhmm.split(':').map(Number); return DAY0 + day*864e5 + (h*60+m)*M; };
const sg = ms => new Date(ms + TZ*H);
const hm = ms => { const d=sg(ms); return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0'); };
const hms = ms => hm(ms)+':'+String(sg(ms).getUTCSeconds()).padStart(2,'0');
const kst = ms => hm(ms + (9-TZ)*H);
const dayOf = ms => Math.floor((ms - DAY0)/864e5);
const dLabel = d => DAYS[d] ? DAYS[d].d+' '+DAYS[d].w : '';
function dur(min){
  min = Math.max(0, Math.round(min));
  if(min < 60) return min+'분';
  const h=Math.floor(min/60), m=min%60; return h+'시간'+(m?' '+m+'분':'');
}
function until(ms, t){
  const m = (ms - t)/M;
  if(m < 1) return '1분 안에';
  if(m >= 60*24){ const dd = dayOf(ms) - dayOf(t); return dd===1 ? '내일' : dd+'일 뒤'; }
  return dur(Math.ceil(m))+' 뒤';
}
const dayTag = d => DAYS[d] ? DAYS[d].w : '';

/* ════════ SCHEDULE (local time, as published) ════════ */
const TRACK_RAW = VN.track, ACT_RAW = VN.acts || [];
/* stages whose line-up has no times yet (one object or a list) */
const TBAS = [].concat(VN.tba || []), tbaOf = id => TBAS.find(b => b.stage===id) || null;
const ITEMS = [];
TRACK_RAW.forEach((r,i) => ITEMS.push({id:'t'+i, kind:'track', day:r[0], s:tm(r[0],r[1]), e:tm(r[0],r[2]), series:r[3], en:r[4], title:r[5], note:r[6], endMax:!!r[7]}));   // r[7]: end not published, e = start + max race time
ACT_RAW.forEach((r,i) => { const open = r[4]==null || r[4]==='';   // end time not published: shown as a start only
  ITEMS.push({id:'a'+i, kind:'act', day:r[0], stage:r[1], title:r[2], s:tm(r[0],r[3]), e:tm(r[0], open ? r[3] : r[4]), approx:!!r[5], open}); });
ITEMS.sort((a,b)=>a.s-b.s || a.e-b.e);
const IT = {}; ITEMS.forEach(x => IT[x.id]=x);
/* timeline width for an act with no published end: up to the next act on the same stage (20–60 min), drawn fading out */
const openSpan = it => { const nx = ITEMS.find(x => x.kind==='act' && x.stage===it.stage && x.day===it.day && x.s > it.s); return nx ? Math.max(20, Math.min(60, (nx.s-it.s)/M)) : 45; };
const TRACK = ITEMS.filter(x=>x.kind==='track');
const EV_START = tm(0,'00:00'), EV_END = tm(ND-1,'23:59')+M;
const QUIET = VN.quietTitles || [];
const isQuiet = it => QUIET.includes(it.title);
const st = (it, t) => t < it.s ? 'next' : it.open ? 'open' : t < it.e ? 'live' : 'past';
const itemPlace = it => it.kind==='act' ? BYID['stage:'+it.stage] : (S.seat ? BYID['spot:'+S.seat] : null);
const placeName = it => it.kind==='act' ? stageName(it.stage) : (S.seat ? BYID['spot:'+S.seat].name+' (내 자리)' : '트랙');

/* ════════ TICKETS ════════ */
const TICKETS = VN.tickets;

/* ════════ STATE ════════ */
const S = {
  tab:'now', detail:null, stack:[], sel:null,
  ticket: store.get('ticket', null),
  seat: null,
  me: store.get('me', null),
  saved: new Set(store.get('saved', [])),
  layers: Object.assign({spot:1,stage:1,village:1,mrt:1,gate:1,turn:1,amen:1}, store.get('layers', {})),
  schedDay:null, planDay:null, intent:'all', q:'',
  sheet:'peek', placing:false
};
const tk = () => TICKETS.find(t => t.id===S.ticket) || null;
S.seat = store.get('seat', undefined);
if(S.seat === undefined) S.seat = tk() ? tk().seat : null;
function canEnter(zone){ const t=tk(); if(zone==null || !t || !t.zones) return null; return t.zones.includes(zone); }

/* ── clock ── */
/* the clock belongs to the app (demo clock shim) — the map reads it and asks the app to move it */
const CK = HOST.CK;
function now(){ return Date.now(); }
function setClock(t, speed, demo){ HOST.setClock(t, speed, demo); }
{ const un = HOST.onClock(() => { lastPhase = null; lastSig = ''; lastMin = -1; tick(true); if(HOST.active()) renderSheet(); }); if(typeof un === 'function') OFF.push(un); }

/* ════════ WALKING ESTIMATE ════════ */
function segX(a,b,c,d){
  const d1=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x), d2=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);
  const d3=(d.x-c.x)*(a.y-c.y)-(d.y-c.y)*(a.x-c.x), d4=(d.x-c.x)*(b.y-c.y)-(d.y-c.y)*(b.x-c.x);
  return (d1*d2<0)&&(d3*d4<0);
}
function crossings(a,b){
  let n=0;
  for(let i=1;i<TP.length;i++){ if(segX(a,b,{x:TP[i-1][0],y:TP[i-1][1]},{x:TP[i][0],y:TP[i][1]})) n++; }
  return Math.min(n,2);
}
function walk(a,b){
  if(!a||!b) return null;
  const d = Math.hypot(a.x-b.x, a.y-b.y), cr = crossings(a,b);
  return {m: Math.max(1, Math.round(d*1.35/72 + cr*3)), cr, d};
}
const nearest = (p, arr, n) => arr.map(o => ({o, w:walk(p,o)})).sort((a,b)=>a.w.d-b.w.d).slice(0,n||1);

/* ════════════════════════════════════════
   MAP
   ════════════════════════════════════════ */
const wrap = $('#mapwrap'), world = $('#world'), ovG = $('#ov-g'), pinsEl = $('#pins');
/* The measured base map is heavy (≈30k vertices). It lives in its own <svg> that the compositor moves and scales
   during a gesture (CSS transform, no repaint) and is re-drawn crisp for the new view once the map comes to rest —
   the 'raster while moving, vector at rest' pattern of big map apps. The track stays vector every frame. */
const SVGNS = 'http://www.w3.org/2000/svg';
const bmap = (() => {
  let b = $('#bmap'); if(b) return b;
  const mapSvg = $('#map'), bg = document.createElementNS(SVGNS,'svg');
  bg.id = 'mbg'; bg.setAttribute('aria-hidden','true');
  const defs = mapSvg.querySelector('defs'); if(defs) bg.appendChild(defs);
  const dots = $('#m-dots'); if(dots) bg.appendChild(dots);
  const land = mapSvg.querySelector('.m-land'); if(land) land.remove();
  b = document.createElementNS(SVGNS,'svg'); b.id = 'bmap'; b.setAttribute('aria-hidden','true');
  const g = $('#base'); if(g) b.appendChild(g);
  wrap.insertBefore(bg, mapSvg); wrap.insertBefore(b, mapSvg);
  return b;
})();
const BR = {k0:0, x0:0, y0:0, t:0};   // last crisp render of the base: scale and world origin
const V = {k:.3, tx:0, ty:0, w:1, h:1, kMin:.1, kMax:3.2};
const BB = (() => { let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; TP.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}); return {x0,y0,x1,y1}; })();
const w2s = (x,y) => [x*V.k+V.tx, y*V.k+V.ty];
const s2w = (sx,sy) => [(sx-V.tx)/V.k, (sy-V.ty)/V.k];

function buildBase(){
  const b = D;
  if(BM && !$('#cm-attr')){ const at = document.createElement('div'); at.id = 'cm-attr'; at.setAttribute('aria-hidden','true'); at.textContent = '© OpenStreetMap 기여자'; $('#mapui').appendChild(at); }
  let h = '';
  if(BM){
    const R = BM.roads || {}, RB = BM.rbridge || {};
    const road = (k, src, cls) => src[k] ? `<path class="${cls} r-${k}" d="${src[k]}"/>` : '';
    const ORDER = ['path','step','svc','min','ter','sec','pri','hw'];
    // zones are tinted under the water so the bay never takes a zone colour; their edge is clipped to land
    const zones = EVT && EVT.zones ? Object.keys(EVT.zones).map(z => `<path class="m-zone" data-z="${zKey(z)}" d="${EVT.zones[z]}"/>`).join('') : '';
    h += `<defs><clipPath id="cm-land"><path clip-rule="evenodd" d="M-6000 -6000H9000V9000H-6000Z${BM.water}"/></clipPath>`
       + `<pattern id="cm-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="m-hatch" width="3" height="9"/></pattern></defs>`;
    h += `<path class="m-green" d="${BM.green}"/>`;
    h += `<g id="m-zones">${zones}</g>`;
    h += `<path class="m-water" d="${BM.water}"/><path class="m-shore" d="${BM.shore}"/>`;
    h += `<path class="m-pier" d="${BM.pier}"/><path class="m-deck" d="${BM.deck}"/>`;
    h += `<g class="m-rcase">${ORDER.map(k => road(k, R, 'rc')).join('')}</g>`;
    h += `<g class="m-roads">${ORDER.map(k => road(k, R, 'rd')).join('')}</g>`;
    h += `<path class="m-bldg b0" d="${BM.b0}"/><path class="m-bldg b1" d="${BM.b1}"/><path class="m-bldg b2" d="${BM.b2}"/>`;
    h += `<g class="m-bridges">${ORDER.map(k => road(k, RB, 'bc')).join('')}${ORDER.map(k => road(k, RB, 'rd')).join('')}</g>`;
    h += `<g class="m-exits">${(BM.exits||[]).map(q => `<rect x="${q[0]-2.6}" y="${q[1]-2.6}" width="5.2" height="5.2" rx="1"/>`).join('')}</g>`;
    if(EVT && EVT.zones) h += `<g id="m-zline" clip-path="url(#cm-land)">${Object.keys(EVT.zones).map(z => `<path class="m-zline" d="${EVT.zones[z]}"/>`).join('')}</g>`;
    if(EVT) h += `<g class="m-xstand">${EXTRA_STANDS.map(id => EVT.stands[id] ? `<path class="m-stand x" d="${EVT.stands[id].d}"/>` : '').join('')}</g>`;
    if(EVT) h += `<g class="m-plat">${(EVT.platforms||[]).map(p => `<circle cx="${p.xy[0]}" cy="${p.xy[1]}" r="5"/>`).join('')}</g>`;
  } else {
    h = `<path class="m-river" d="${b.river}"/><path class="m-water" d="${b.water}"/>`;
    b.parks.forEach(p => h += `<path class="m-park" d="${p}"/>`);
    b.bridges.forEach(p => h += `<path class="m-bridge" d="${p}"/>`);
    b.bld.forEach(o => h += o.t==='e' ? `<ellipse class="m-bldg" cx="${o.cx}" cy="${o.cy}" rx="${o.rx}" ry="${o.ry}"/>` : `<rect class="m-bldg" x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="3"/>`);
  }
  $('#base').innerHTML = h;
  $('#stands').innerHTML = SPOTS.map(sp => `<path class="m-stand" data-k="spot:${sp.id}" d="${sp.standD}" rx="2"/>`).join('');
  $('#t-case').setAttribute('d', TRACK_D);
  $('#t-main').setAttribute('d', TRACK_D);
  $('#t-live').setAttribute('d', TRACK_D);
  $('#t-pit').setAttribute('d', PIT_D);
}
/* base map: crisp render for the current view (+40% margin each side), then compositor-only moves until the next rest */
function renderBase(){
  const m = .4, k = V.k, ww = V.w/k, wh = V.h/k;
  let x0 = -V.tx/k - ww*m, y0 = -V.ty/k - wh*m, w = ww*(1+2*m), h = wh*(1+2*m);
  const cap = 4096; if(w*k > cap){ const c = (w - cap/k)/2; x0 += c; w = cap/k; } if(h*k > cap){ const c = (h - cap/k)/2; y0 += c; h = cap/k; }
  bmap.setAttribute('viewBox', `${x0.toFixed(2)} ${y0.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  bmap.setAttribute('width', (w*k).toFixed(0)); bmap.setAttribute('height', (h*k).toFixed(0));
  bmap.style.setProperty('--px', (1/k).toFixed(4));                       // one screen pixel in map units (minimum road widths)
  const lod = k < .42 ? 0 : k < 1.05 ? 1 : 2;                             // 0 overview · 1 district · 2 street
  if(wrap.dataset.lod !== String(lod)) wrap.dataset.lod = lod;
  Object.assign(BR, {k0:k, x0, y0, w, h, t:performance.now()});
  placeBase();
}
function placeBase(){
  if(!BR.k0){ renderBase(); return; }
  const s = V.k/BR.k0;
  bmap.style.transform = `matrix(${s.toFixed(5)},0,0,${s.toFixed(5)},${(BR.x0*V.k + V.tx).toFixed(2)},${(BR.y0*V.k + V.ty).toFixed(2)})`;
  // a pan inside the drawn margin needs nothing; a zoom (or running past the margin) is redrawn crisp once the map rests
  const out = -V.tx/V.k < BR.x0 || -V.ty/V.k < BR.y0 || (V.w - V.tx)/V.k > BR.x0 + BR.w || (V.h - V.ty)/V.k > BR.y0 + BR.h;
  const zoomed = Math.abs(s - 1) > 1e-4;
  clearTimeout(placeBase._t);
  if(zoomed || out) placeBase._t = setTimeout(renderBase, out && !zoomed ? 60 : 140);
}

/* road names — screen-space labels along the measured roads (upright, decluttered, lowest priority) */
const ROADLAB = (D.roadlab || []).map(r => ({t:r[0], x:r[1], y:r[2], a:r[3], p:r[4], w:r[0].length*6.1+6}));
const TRK_MARK = EVT && EVT.trackmarks ? EVT.trackmarks : {start:0, finish:0};
const OVERPASS = EVT && EVT.overpass ? EVT.overpass : [];

/* visible map area (excludes header, layer chips and sheet) */
function visArea(){
  const r = wrap.getBoundingClientRect();
  if(mqDesk.matches) return {x0:24, y0:24, x1:r.width-84, y1:r.height-24};
  const fitMode = visArea.fit;
  const top = $('#cap').getBoundingClientRect().bottom - r.top + 10;
  const bottom = r.height - sheetY(S.sheet) - 14;
  return {x0:fitMode?4:14, y0:top, x1:r.width-(fitMode?4:66), y1:Math.max(top+120, bottom)};
}
function fit(animate){
  visArea.fit = true; const a = visArea(); visArea.fit = false; const pad = mqDesk.matches ? 28 : 10;
  const bw = BB.x1-BB.x0, bh = BB.y1-BB.y0;
  const k = Math.min((a.x1-a.x0-pad*2)/bw, (a.y1-a.y0-pad*2)/bh);
  const cx = (BB.x0+BB.x1)/2, cy=(BB.y0+BB.y1)/2;
  const tgt = {k, tx:(a.x0+a.x1)/2 - cx*k, ty:(a.y0+a.y1)/2 - cy*k};
  V.kMin = k*.65; V.kMax = Math.max(3.2, k*9);
  go(tgt, animate);
}
function focusOn(x, y, k, animate){
  const a = visArea();
  k = clamp(k || Math.max(V.k, .9), V.kMin, V.kMax);
  go({k, tx:(a.x0+a.x1)/2 - x*k, ty:(a.y0+a.y1)/2 - y*k}, animate);
}
let anim = null;
/* cubic-bezier(.2,.8,.25,1) — --gt-ease-out */
function easeOut(x){ let lo=0, hi=1, t=x; for(let i=0;i<14;i++){ t=(lo+hi)/2; const bx=3*(1-t)*(1-t)*t*.2+3*(1-t)*t*t*.25+t*t*t; if(bx<x) lo=t; else hi=t; } return 3*(1-t)*(1-t)*t*.8+3*(1-t)*t*t+t*t*t; }
function go(t, animate){
  if(anim) cancelAnimationFrame(anim.raf), anim=null;
  if(!animate || reduceMotion){ Object.assign(V,t); clampView(); draw(); return; }
  const f = {k:V.k, tx:V.tx, ty:V.ty}, t0 = performance.now(), dur = 340;
  const step = now => {
    const p = Math.min(1,(now-t0)/dur), e = easeOut(p);
    // interpolate in world-center space for a natural zoom
    const a = visArea(), cx=(a.x0+a.x1)/2, cy=(a.y0+a.y1)/2;
    const wf = [(cx-f.tx)/f.k, (cy-f.ty)/f.k], wt=[(cx-t.tx)/t.k, (cy-t.ty)/t.k];
    const k = Math.exp(Math.log(f.k)+(Math.log(t.k)-Math.log(f.k))*e);
    const wx = wf[0]+(wt[0]-wf[0])*e, wy = wf[1]+(wt[1]-wf[1])*e;
    V.k=k; V.tx=cx-wx*k; V.ty=cy-wy*k; draw();
    if(p<1) anim={raf:requestAnimationFrame(step)}; else { anim=null; Object.assign(V,t); clampView(); draw(); }
  };
  anim = {raf:requestAnimationFrame(step)};
}
function clampView(){
  V.k = clamp(V.k, V.kMin, V.kMax);
  const m = 260;
  const [wx0,wy0] = s2w(0,0), [wx1,wy1] = s2w(V.w,V.h);
  const cx=(wx0+wx1)/2, cy=(wy0+wy1)/2;
  const ncx = clamp(cx, BB.x0-m, BB.x1+m), ncy = clamp(cy, BB.y0-m-200, BB.y1+m+200);
  V.tx -= (ncx-cx)*V.k; V.ty -= (ncy-cy)*V.k;
}
function zoomAt(f, sx, sy, animate){
  const nk = clamp(V.k*f, V.kMin, V.kMax);
  const [wx,wy] = s2w(sx,sy);
  const t = {k:nk, tx:sx - wx*nk, ty:sy - wy*nk};
  if(animate) go(t, true); else { Object.assign(V,t); clampView(); requestDraw(); }
}

/* ── pins ── */
let PINS = [];
function lockOf(o){
  if(o.type==='spot'||o.type==='stage'||o.type==='village'){ const c=canEnter(o.zone); return c===false; }
  return false;
}
function liveAct(stageId, t){ return ITEMS.find(x => x.kind==='act' && x.stage===stageId && st(x,t)==='live'); }
function nextAct(stageId, t, within){ const x = ITEMS.find(x => x.kind==='act' && x.stage===stageId && x.s>t && x.day===dayOf(t)); return x && (!within || x.s - t <= within) ? x : null; }
function liveTrack(t){ return TRACK.find(x => st(x,t)==='live'); }
function nextTrack(t){ return TRACK.find(x => x.s > t); }

function buildPins(){
  const t = now(); const out=[]; pinsEl.innerHTML='';
  const mk = (kind, o, html, pri, opts) => {
    const el = document.createElement(kind==='lm'||kind==='sf'||kind==='live'||kind==='zn'||kind==='stl'||kind==='am'?'div':'button');
    if(el.tagName==='BUTTON') el.type='button';
    el.className = 'pin k-'+kind + (opts&&opts.cls?' '+opts.cls:'');
    el.innerHTML = html;
    if(opts && opts.aria) el.setAttribute('aria-label', opts.aria);
    if(o && o.type) el.dataset.key = o.type+':'+o.id;
    pinsEl.appendChild(el);
    const p = {el, lb:el.querySelector('.lb'), x:o.x, y:o.y, kind, pri, minK:(opts&&opts.minK)||0, lw:0, lh:0, off:(opts&&opts.off)||null, o};
    // pinned to its map point once: #pins moves with the map camera, scale(var(--inv)) keeps the pin at screen size
    el.style.transform = `translate(${p.x}px,${p.y}px) scale(var(--inv))` + (p.off ? ` translate(${p.off.x*p.off.px}px,${p.off.y*p.off.px}px)` : '');
    out.push(p); return p;
  };
  const selKey = S.sel ? S.sel.type+':'+S.sel.id : '';
  const lockI = `<span class="lk">${ico('lock')}</span>`;
  // landmarks
  LANDMARKS.forEach(l => mk('lm', l, `<span class="lb">${esc(l.w ? l.en || l.t : l.t)}</span>`, 10 - l.r, {cls:l.w?'water':'', minK: l.r===1?0:l.r===2?.4:.7}));
  // start/finish
  if(TRK_MARK.finish && Math.abs(TRK_MARK.finish - TRK_MARK.start) > 40){
    const ps = ptAt(TRK_MARK.start), pf = ptAt(TRK_MARK.finish);
    mk('sf', {x:ps.x+18, y:ps.y}, `<span class="lb">START</span>`, 30, {minK:.7});
    mk('sf', {x:pf.x+18, y:pf.y}, `<span class="lb">FINISH</span>`, 30, {minK:.9});
  } else { const sf = ptAt(0); mk('sf', {x:sf.x+18, y:sf.y}, `<span class="lb">START · FINISH</span>`, 30, {minK:.7}); }
  if(EVT){
    Object.keys(EVT.zlab||{}).forEach(z => { const q = EVT.zlab[z], n = zKey(z), lk = canEnter(n) === false;
      mk('zn', {x:q[0], y:q[1]}, `<span class="lb">${lk?ico('lock'):''}${zBadge(n)}</span>`, 12, {cls:lk?'lock':'', minK:.22}); });
    EXTRA_STANDS.forEach(id => { const st = EVT.stands[id]; if(st) mk('stl', {x:st.c[0], y:st.c[1]}, `<span class="lb">${esc(st.name)}</span>`, 8, {minK:.95}); });
    (EVT.platforms||[]).forEach(p => mk('stl', {x:p.xy[0], y:p.xy[1]}, `<span class="lb">${esc(p.name)}</span>`, 7, {minK:1.3}));
  }
  // live track session
  const lt = liveTrack(t);
  if(lt && !isQuiet(lt)){ const p=ptAt(LEN-150); mk('live', {x:p.x, y:p.y}, `<span class="lb">${lightRow(0,'live','s')}지금 진행 중 · ${esc(lt.title)}</span>`, 95); }
  if(S.layers.turn) TURNS.forEach(tn => {
    const vis = S.sel && S.sel.type==='spot' && BYID['spot:'+S.sel.id].turns.includes(tn.n);
    const sel = selKey==='turn:'+tn.n;
    mk('turn', tn, `<span class="b">${tn.n}</span>`, 20, {cls:(tn.ot?'ot ':'')+(vis?'vis ':'')+(sel?'sel':''), minK: vis||sel ? 0 : .5, off:{x:tn.nx, y:tn.ny, px:16}, aria:tn.n+'번 코너'+(tn.ot?', 주요 추월 지점':'')});
  });
  if(S.layers.gate) GATES.forEach(g => {
    const sel = selKey==='gate:'+g.id;
    mk('gate', g, `<span class="b">${ico('gate')}</span><span class="lb">${g.n?`<b class="gn">${g.n}</b>`:''}${esc(g.name || (g.n ? '' : g.gname))}</span>`, 30, {cls:sel?'sel':'', minK: sel?0:.5, aria: g.n && g.name ? g.n+'번 게이트 '+g.name : g.gname+' 게이트'});
  });
  if(S.layers.mrt) MRTS.forEach(m => {
    const sel = selKey==='mrt:'+m.id;
    mk('mrt', m, `<span class="b">${ico(TR.icon||'train')}${m.codes.join(' · ')}</span><span class="lb">${esc(m.name)}</span>`, 40, {cls:sel?'sel':'', minK: sel?0:.34, aria:m.name+TR.aria+m.codes.join(' ')});
  });
  if(S.layers.village) VILLAGES.forEach(v => {
    const sel = selKey==='village:'+v.id, lk = lockOf(v);
    mk('village', v, `<span class="b">${ico('village')}${lk?lockI:''}</span><span class="lb">${esc(v.label||VN.village.label)}${v.zone!=null?`<small>${zName(v.zone)}</small>`:''}</span>`, 50, {cls:(sel?'sel ':'')+(lk?'lock':''), aria:v.name, minK:.3});
  });
  if(S.layers.spot) SPOTS.forEach(sp => {
    const sel = selKey==='spot:'+sp.id, lk = lockOf(sp), seat = S.seat===sp.id;
    mk('spot', sp, `<span class="b"></span><span class="lb">${seat?'<span class="me-tag">MY SEAT</span>':''}${esc(sp.name)}</span>`, seat?85:sel?99:58, {cls:(sel?'sel ':'')+(lk?'lock ':'')+(seat?'seat':''), minK: seat||sel ? 0 : .45, aria:sp.name+' '+(sp.kind||'그랜드스탠드')+(sp.zone!=null?', '+zName(sp.zone):'')+(seat?', 내 자리':'')});
  });
  if(S.layers.stage) STAGES.forEach(sg => {
    const sel = selKey==='stage:'+sg.id, lk = lockOf(sg);
    const la = liveAct(sg.id, t), na = !la && nextAct(sg.id, t, 30*M);
    let lab;
    if(la) lab = `<span class="tg tl">LIVE</span><b>${esc(la.title)}</b><small>${esc(sg.short||sg.name)}</small>`;
    else if(na) lab = `<span class="tg tn">${hm(na.s)}</span>${esc(na.title)}<small>${esc(sg.short||sg.name)}</small>`;
    else lab = `${esc(sg.short||sg.name)}`;
    mk('stage', sg, `<span class="b">${ico('music')}${lk?lockI:''}</span><span class="lb">${lab}</span>`, la?90:na?70:55, {cls:(sel?'sel ':'')+(lk?'lock ':'')+(la?'live':''), aria:(sg.name)+(la?', 지금 '+la.title+' 공연 중':na?', '+hm(na.s)+' '+TZA+' '+na.title:'')});
  });
  if(S.layers.amen && EVT && EVT.amen){
    const AM = VN.amen;
    Object.keys(AM).forEach(c => (EVT.amen[c]||[]).forEach(q => mk('am', {x:q[0], y:q[1]}, `<span class="b">${ico(AM[c][0])}</span>`, 4, {cls:'am-'+c, minK:1.25})));
  }
  if(S.me){ const p = mk('me', S.me, `<span class="me"></span>`, 100, {aria:'내 위치'}); p.el.setAttribute('aria-label','내 위치'); }
  // zone tint follows the ticket: a zone this ticket can't enter is hatched
  $$('#m-zones .m-zone').forEach(el => el.classList.toggle('lock', canEnter(zKey('z'+el.dataset.z)) === false));
  // stand structures mirror the pin state
  $$('#stands .m-stand').forEach(el => { const id = el.dataset.k.split(':')[1], sp = BYID[el.dataset.k];
    el.setAttribute('class', 'm-stand' + (S.seat===id?' seat':'') + (selKey===el.dataset.k?' sel':'') + (lockOf(sp)?' lock':'')); });
  // measure labels once
  out.forEach(p => { if(p.lb){ p.lw = p.lb.offsetWidth; p.lh = p.lb.offsetHeight; } });
  PINS = out;
  requestDraw();
}

/* ── per-frame draw ── */
let drawQueued = false;
function requestDraw(){ if(!drawQueued){ drawQueued=true; requestAnimationFrame(()=>{ drawQueued=false; draw(); }); } }
function draw(){
  world.setAttribute('transform', `matrix(${V.k} 0 0 ${V.k} ${V.tx} ${V.ty})`);
  // pins ride the same camera in the same frame as the track and base map (one transform for the layer, not one per pin)
  pinsEl.style.transform = `matrix(${V.k},0,0,${V.k},${V.tx},${V.ty})`;
  pinsEl.style.setProperty('--inv', 1/V.k);
  const lod = V.k < .42 ? 0 : V.k < 1.05 ? 1 : 2;
  placeBase();
  const mbg = $('#mbg'); if(mbg) mbg.style.transform = `translate(${(V.tx % 12).toFixed(1)}px,${(V.ty % 12).toFixed(1)}px)`;   // light grid: compositor-only
  const tw = clamp(V.k*12, 4.4, 17) + Math.max(0, V.k - 1.45)*10.5;   // street level: the track widens with the real road (~12 m)
  const compact = V.k < .42; pinsEl.classList.toggle('compact', compact);
  $('#t-case').style.strokeWidth = tw+3.5;
  $('#t-main').style.strokeWidth = tw;
  $('#t-pit').style.strokeWidth = Math.max(1.6, tw*.32);
  $('#t-live').style.strokeWidth = Math.max(2, tw*.34);
  $$('#t-hi path').forEach(p => p.style.strokeWidth = tw+2.5);
  $('#t-route').style.strokeWidth = 2.5;
  // overlay: direction chevrons + start line
  let o = '';
  if(tw >= 6){
    const sz = tw*.42;
    for(let s=120; s<LEN; s+=260){
      const p = ptAt(s), t = tanAt(s,10); const [x,y] = w2s(p.x,p.y);
      if(x<-20||y<-20||x>V.w+20||y>V.h+20) continue;
      const nx=-t.y, ny=t.x;
      o += `<path class="ov-chev" d="M${(x-t.x*sz+nx*sz).toFixed(1)} ${(y-t.y*sz+ny*sz).toFixed(1)}L${(x+t.x*sz*.4).toFixed(1)} ${(y+t.y*sz*.4).toFixed(1)}L${(x-t.x*sz-nx*sz).toFixed(1)} ${(y-t.y*sz-ny*sz).toFixed(1)}" style="stroke-width:${Math.max(1.4,tw*.14)}"/>`;
    }
  }
  // temporary footbridges over the track (official map) — a deck across the road, drawn once zoomed in
  if(tw >= 7) OVERPASS.forEach(s => {
    const p = ptAt(s), t = tanAt(s,8); const [x,y] = w2s(p.x,p.y);
    if(x<-30||y<-30||x>V.w+30||y>V.h+30) return;
    const hw = tw/2 + 5, hl = Math.max(2.2, tw*.26), nx=-t.y, ny=t.x;
    const c = (u,v) => (x+nx*u+t.x*v).toFixed(1)+' '+(y+ny*u+t.y*v).toFixed(1);
    o += `<path class="ov-op" d="M${c(-hw,-hl)}L${c(hw,-hl)}L${c(hw,hl)}L${c(-hw,hl)}Z"/>`;
  });
  // start and finish are separate lines on this circuit (official map); both chequered
  [TRK_MARK.start, TRK_MARK.finish].filter((v,i,a) => a.indexOf(v)===i).forEach(s0 => { const p=ptAt(s0), t=tanAt(s0,6); const [x,y]=w2s(p.x,p.y); const hw=(tw+3)/2; const nx=-t.y*hw, ny=t.x*hw;
    o += `<line class="ov-sf-a" x1="${x-nx}" y1="${y-ny}" x2="${x+nx}" y2="${y+ny}" style="stroke-width:${Math.max(3,tw*.32)}"/><line class="ov-sf-b" x1="${x-nx}" y1="${y-ny}" x2="${x+nx}" y2="${y+ny}" style="stroke-width:${Math.max(3,tw*.32)};stroke-dasharray:${Math.max(2,tw*.18)} ${Math.max(2,tw*.18)}"/>`; });
  // road names (lowest priority): only from the district level, never over the track, pins or chrome
  if(lod >= 1 && ROADLAB.length){
    const minP = lod === 1 ? 3 : 1, rl = [];
    ROADLAB.forEach(r => { if(r.p < minP) return; const [x,y] = w2s(r.x, r.y); if(x<20||y<20||x>V.w-20||y>V.h-20) return; rl.push({r, x, y}); });
    rl.sort((a,b) => b.r.p - a.r.p);
    const taken = [];
    rl.forEach(q => { const w = q.r.w, a = q.r.a*Math.PI/180, hw = Math.abs(Math.cos(a))*w/2 + 6, hh = Math.abs(Math.sin(a))*w/2 + 6;
      const bx = {x:q.x-hw, y:q.y-hh, w:hw*2, h:hh*2};
      if(taken.some(t => !(bx.x+bx.w < t.x || t.x+t.w < bx.x || bx.y+bx.h < t.y || t.y+t.h < bx.y))) return;
      taken.push(bx); q.ok = 1; });
    draw._rl = taken;
    rl.forEach(q => { if(q.ok) o += `<text class="ov-rd" transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(${q.r.a})">${esc(q.r.t)}</text>`; });
  }
  ovG.innerHTML = o;
  // pins — UI chrome (header, chips, controls, scale, sheet) blocks labels so text never sits under controls
  const wr = wrap.getBoundingClientRect();
  const chrome = [];
  const addR = el => { if(!el || el.offsetParent===null) return; const r = el.getBoundingClientRect(); if(r.width && r.height) chrome.push({x:r.left-wr.left-4, y:r.top-wr.top-4, w:r.width+8, h:r.height+8}); };
  $$('#ctrl .cgrp').forEach(addR); ['#clock','#cap','.tbar'].forEach(s => addR($(s)));
  if($('#layerpop').classList.contains('on')) addR($('#layerpop'));
  let chromeTop = -8;
  if(!mqDesk.matches){
    const sr = $('#sheet').getBoundingClientRect(); chrome.push({x:0, y:sr.top-wr.top, w:V.w, h:V.h});
  }
  const boxes = [];
  const vis = [];
  PINS.forEach(p => {
    let [x,y] = w2s(p.x,p.y);
    if(p.off){ x += p.off.x*p.off.px; y += p.off.y*p.off.px; }
    let show = V.k >= p.minK && x>4 && x<V.w-4 && y>chromeTop && y<V.h+20 && (p.kind!=='live' || mqDesk.matches);
    let box = null;
    if(show && p.kind!=='lm' && p.kind!=='sf' && p.kind!=='live' && p.kind!=='zn' && p.kind!=='stl'){
      const big = p.el.classList.contains('live')||p.el.classList.contains('sel')||p.el.classList.contains('seat');
      const r = p.kind==='spot' ? 8 : p.kind==='am' ? 11 : compact && !big && p.kind!=='mrt' ? 6 : p.kind==='turn'?9:p.kind==='gate'?10:15;
      const w = p.kind==='mrt' ? (p._bw || (p._bw = p.el.querySelector('.b').offsetWidth) || 40) : r*2;
      box = {x:x-r, y:y-r, w:w, h:r*2, p};
      // a pin hidden under the controls can't be tapped — leave it out unless it is the selection
      if(!p.el.classList.contains('sel') && chrome.some(q => !(box.x+box.w < q.x || q.x+q.w < box.x || box.y+box.h < q.y || q.y+q.h < box.y))) show = false;
    }
    if(p._hid !== !show){ p._hid = !show; p.el.hidden = !show; }
    if(!show) return;
    p.sx=x; p.sy=y;
    vis.push(p);
    if(box) boxes.push(box);
  });
  // declutter: a lower-priority pin that sits on top of a higher-priority one steps aside until the map is zoomed in
  { const cp = b => { const c = b.p.el.classList; return c.contains('sel')||b.p.kind==='me' ? 200 : c.contains('live') ? 95 : c.contains('seat') ? 90 : b.p.kind==='turn' ? 45 : b.p.pri; };
    const keep = [];
    boxes.filter(b => b.p.kind!=='spot').sort((a,b)=>cp(b)-cp(a)).forEach(b => {
      const hit = keep.some(q => !(b.p.kind==='turn' && q.p.kind==='turn') && !(b.x+b.w < q.x+2 || q.x+q.w < b.x+2 || b.y+b.h < q.y+2 || q.y+q.h < b.y+2));
      if(hit && cp(b) < 200){ b.p.el.hidden = true; b.p._hid = true; const i = vis.indexOf(b.p); if(i>=0) vis.splice(i,1); b.dead = true; }
      else keep.push(b);
    });
    for(let i=boxes.length-1;i>=0;i--) if(boxes[i].dead) boxes.splice(i,1);
  }
  // greedy label placement by priority — tries right, left, above, below
  const trkS = []; for(let i=0;i<SAMP.length;i+=4){ trkS.push(SAMP[i][0]*V.k+V.tx, SAMP[i][1]*V.k+V.ty); }
  const placed = [];
  const hitR = (r,q) => !(r.x+r.w < q.x || q.x+q.w < r.x || r.y+r.h < q.y || q.y+q.h < r.y);
  vis.slice().sort((a,b)=>b.pri-a.pri).forEach(p => {
    if(!p.lb) return;
    const cl = p.el.classList;
    const force = cl.contains('sel') || p.kind==='live';
    const isLive = cl.contains('live');
    let cands;
    if(p.kind==='lm' || p.kind==='zn' || p.kind==='stl') cands = [{x:p.sx-p.lw/2, y:p.sy-p.lh/2, w:p.lw, h:p.lh}];
    else if(p.kind==='live'){ const x0 = clamp(p.sx-p.lw/2, 8, V.w-p.lw-8); cands = [{x:x0, y:p.sy-p.lh*1.4, w:p.lw, h:p.lh}]; const dx = Math.round(x0-(p.sx-p.lw/2)); if(p._dx!==dx){ p._dx=dx; p.lb.style.marginLeft = dx+'px'; } }
    else if(p.kind==='sf') cands = [{x:p.sx+10, y:p.sy-p.lh/2, w:p.lw, h:p.lh}];
    else if(p.kind==='mrt'){ const bw = p._bw || 40, lw = p.lb.offsetWidth || p.lw; cands = [{x:p.sx-11+bw+4, y:p.sy-9, w:lw, h:p.lh, l:-11+bw+4, t:-9}, {x:p.sx-11-lw-4, y:p.sy-9, w:lw, h:p.lh, l:-11-lw-4, t:-9}]; }
    else if(p.kind==='spot'){
      const lw = p.lb.offsetWidth || p.lw, lh = p.lb.offsetHeight || p.lh, sp = p.o;
      const e0 = w2s(sp.ends[0].x, sp.ends[0].y), e1 = w2s(sp.ends[1].x, sp.ends[1].y);
      const bx0 = Math.min(e0[0],e1[0]) - 4, bx1 = Math.max(e0[0],e1[0]) + 4, by0 = Math.min(e0[1],e1[1]) - 4, by1 = Math.max(e0[1],e1[1]) + 4;
      const cx = (bx0+bx1)/2, cy = (by0+by1)/2;
      const mk2 = (X, Y) => ({x:X, y:Y, w:lw, h:lh, l:X-p.sx, t:Y-p.sy});
      cands = [mk2(bx1+4, cy-lh/2), mk2(bx0-4-lw, cy-lh/2), mk2(cx-lw/2, by0-2-lh), mk2(cx-lw/2, by1+2)];
    }
    else {
      const big = isLive || cl.contains('sel') || cl.contains('seat');
      const L = p.kind==='spot' ? 10 : cl.contains('sel') ? 24 : compact && !big ? 10 : p.kind==='gate'?13:18;
      const lw = p.lb.offsetWidth || p.lw, lh = p.lb.offsetHeight || p.lh;
      cands = [
        {x:p.sx+L, y:p.sy-9, w:lw, h:lh, l:L, t:-9},
        {x:p.sx-L-lw, y:p.sy-9, w:lw, h:lh, l:-L-lw, t:-9},
        {x:p.sx-lw/2, y:p.sy-L-lh-2, w:lw, h:lh, l:-lw/2, t:-L-lh-2},
        {x:p.sx-lw/2, y:p.sy+L+2, w:lw, h:lh, l:-lw/2, t:L+2}
      ];
    }
    let pick = null, best = 1e9;
    for(const r of cands){
      if(r.x < 2 || r.x+r.w > V.w-2) continue;
      if(placed.some(q=>hitR(r,q)) || chrome.some(q=>hitR(r,q))) continue;
      if(boxes.some(b => b.p!==p && (!isLive || b.p.el.classList.contains('live')) && hitR(r,b))) continue;
      let cost = isLive ? boxes.filter(b => b.p!==p && hitR(r,b)).length*100 : 0; for(let i=0;i<trkS.length;i+=2){ const x=trkS[i], y=trkS[i+1]; if(x>=r.x-2 && x<=r.x+r.w+2 && y>=r.y-2 && y<=r.y+r.h+2) cost++; }
      if(cost < best){ best = cost; pick = r; if(!cost) break; }
    }
    if(!pick && force) pick = cands[0];
    p.lb.classList.toggle('off', !pick);
    if(pick){
      placed.push(pick);
      if(pick.l!=null){ const k = pick.l+','+pick.t; if(p._lp!==k){ p._lp=k; p.lb.style.left=pick.l+'px'; p.lb.style.top=pick.t+'px'; } }
      else if(pick.dx!=null){ const k='m'+pick.dx; if(p._lp!==k){ p._lp=k; p.lb.style.transform = pick.dx?`translateX(${pick.dx}px)`:''; } }
    }
  });
  // scale bar
  const target = 100 * Math.pow(2, Math.round(Math.log2(90/(V.k*100))));
  const m = clamp(target, 25, 800);
  $('#scale-b').style.width = (m*V.k).toFixed(0)+'px';
  $('#scale-t').textContent = (m>=1000? (m/1000)+' km' : m+' m') + ' · 도보 약 ' + Math.max(1,Math.round(m*1.35/72)) + '분';
  if(draw._k !== undefined && Math.abs(draw._k - V.k) > 1e-6){ const sc=$('#scale'); sc.classList.add('on'); clearTimeout(draw._st); draw._st = setTimeout(()=>sc.classList.remove('on'), 1200); }
  draw._k = V.k;
}

/* highlight layers for the current selection */
function drawSelection(){
  const hi = $('#t-hi'); let h=''; let wedge='';
  const sel = S.sel && BYID[S.sel.type+':'+S.sel.id];
  if(sel && sel.type==='spot'){
    sel.cov.forEach(r => { const pts = arcPts(r[0], r[1]); h += `<path class="t-hi" d="${pathD(pts)}"/>`;
      const sub = pts.filter((_,i)=>i%3===0); sub.push(pts[pts.length-1]);
      wedge += 'M'+sel.x.toFixed(1)+' '+sel.y.toFixed(1)+'L'+sub.map(p=>p.x.toFixed(1)+' '+p.y.toFixed(1)).join('L')+'Z'; });
  } else if(sel && sel.type==='turn'){
    h = `<path class="t-hi" d="${pathD(arcPts(sel.s-70, sel.s+70))}"/>`;
  }
  hi.innerHTML = h; $('#t-wedge').setAttribute('d', wedge);
  // route from me
  const r = $('#t-route');
  if(S.me && sel && sel.type!=='turn') r.setAttribute('d', `M${S.me.x} ${S.me.y}L${sel.x} ${sel.y}`); else r.setAttribute('d','');
  requestDraw();
}

/* ── gestures ── */
const ptrs = new Map(); let gest = null, moved = false, downAt = 0;
wrap.addEventListener('pointerdown', e => {
  if(e.button!==0 && e.pointerType==='mouse') return;
  ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
  moved = false; downAt = performance.now();
  if(anim) cancelAnimationFrame(anim.raf), anim=null;
  startGest();
});
function startGest(){
  const r = wrap.getBoundingClientRect(); const a = [...ptrs.values()];
  if(a.length===1) gest = {mode:'pan', x:a[0].x, y:a[0].y, tx:V.tx, ty:V.ty, r};
  else if(a.length>=2){ const [p,q]=a; gest = {mode:'pinch', d:Math.hypot(p.x-q.x,p.y-q.y), cx:(p.x+q.x)/2-r.left, cy:(p.y+q.y)/2-r.top, k:V.k, tx:V.tx, ty:V.ty, r}; }
}
onG(window, 'pointermove', e => {
  if(!ptrs.has(e.pointerId) || !gest) return;
  ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
  const a = [...ptrs.values()];
  if(gest.mode==='pan' && a.length===1){
    const dx=a[0].x-gest.x, dy=a[0].y-gest.y;
    if(!moved && Math.hypot(dx,dy) < 6) return;
    if(!moved){ moved = true; wrap.classList.add('dragging'); }
    V.tx = gest.tx+dx; V.ty = gest.ty+dy; clampView(); requestDraw();
  } else if(gest.mode==='pinch' && a.length>=2){
    moved = true;
    const [p,q]=a; const d=Math.hypot(p.x-q.x,p.y-q.y); const cx=(p.x+q.x)/2-gest.r.left, cy=(p.y+q.y)/2-gest.r.top;
    const nk = clamp(gest.k*d/gest.d, V.kMin, V.kMax);
    const wx=(gest.cx-gest.tx)/gest.k, wy=(gest.cy-gest.ty)/gest.k;
    V.k=nk; V.tx=cx-wx*nk; V.ty=cy-wy*nk; clampView(); requestDraw();
  }
}, {passive:true});
function endPtr(e){
  if(!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  wrap.classList.remove('dragging');
  if(ptrs.size) startGest(); else gest = null;
  if(S.placing) updatePlaceCross();
}
onG(window, 'pointerup', endPtr); onG(window, 'pointercancel', endPtr);
wrap.addEventListener('click', e => {
  if(moved){ e.stopPropagation(); e.preventDefault(); return; }
  if(S.placing) return;
  const stand = e.target.closest && e.target.closest('.m-stand');
  if(stand){ const [type,id] = stand.dataset.k.split(':'); select(type, id, {fly:false}); return; }
  const pin = e.target.closest('.pin[data-key]');
  if(pin){ const [type,id] = pin.dataset.key.split(':'); select(type, id, {fly:false}); return; }
  if(e.target.closest('.pin.k-me')){ toastMe(); return; }
  if(S.sel){ clearSel(); }
}, true);
wrap.addEventListener('dblclick', e => { const r=wrap.getBoundingClientRect(); zoomAt(2, e.clientX-r.left, e.clientY-r.top, true); });
wrap.addEventListener('wheel', e => {
  e.preventDefault();
  const r = wrap.getBoundingClientRect();
  const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022));
  zoomAt(f, e.clientX-r.left, e.clientY-r.top, false);
}, {passive:false});
$('#b-zin').onclick = () => { const a=visArea(); zoomAt(1.8,(a.x0+a.x1)/2,(a.y0+a.y1)/2,true); };
$('#b-zout').onclick = () => { const a=visArea(); zoomAt(1/1.8,(a.x0+a.x1)/2,(a.y0+a.y1)/2,true); };
$('#b-fit').onclick = () => fit(true);
$('#b-me').onclick = () => { if(!S.me) startPlacing(); else { focusOn(S.me.x, S.me.y, Math.max(V.k,1.1), true); toastMe(); } };
function toastMe(){ toast('locate', `<span class="lbl">My location</span><b>내 위치</b><span>도보 시간을 이 위치 기준으로 계산해요</span>`, `<button class="btn sm ghost" data-act="place">다시 지정</button>`); }

/* ── placing "my location" ── */
function updatePlaceCross(){ const a=visArea(); const c=$('#cross'); c.style.left=((a.x0+a.x1)/2)+'px'; c.style.top=((a.y0+a.y1)/2)+'px'; }
function startPlacing(){
  S.placing = true; $('#app').classList.add('placing'); hideToast();
  if(S.sheet!=='peek') setSheet('peek');
  setTimeout(()=>{ updatePlaceCross(); if(S.me) focusOn(S.me.x,S.me.y,Math.max(V.k,1),true); }, 30);
  // try real geolocation once; most of the time it's outside the circuit (or unavailable in a preview)
  try{
    navigator.geolocation && navigator.geolocation.getCurrentPosition(pos => {
      if(!S.placing) return;
      const p = P(pos.coords.longitude, pos.coords.latitude);
      const gb = VN.geoBox; if(p.x > gb[0] && p.x < gb[1] && p.y > gb[2] && p.y < gb[3]){ setMe(p); toast('check', `<b>현재 위치를 찾았어요</b>`); }
      else toast('locate', `<b>지금은 서킷 밖에 있어요</b><span>지도를 움직여 위치를 직접 지정해 주세요</span>`);
    }, ()=>{}, {timeout:5000, maximumAge:60000});
  }catch(e){}
}
function endPlacing(){ S.placing=false; $('#app').classList.remove('placing'); }
function setMe(p){ S.me = {x:Math.round(p.x), y:Math.round(p.y)}; store.set('me', S.me); endPlacing(); buildPins(); drawSelection(); renderSheet(); $('#b-me').setAttribute('aria-pressed','true'); }
$('#b-place-ok').onclick = () => { const a=visArea(); const [x,y]=s2w((a.x0+a.x1)/2,(a.y0+a.y1)/2); setMe({x,y}); toast('check', `<b>내 위치를 지정했어요</b><span>이제 도보 시간과 출발 시각을 함께 보여드려요</span>`); };
$('#b-place-cancel').onclick = () => endPlacing();

/* ════════ SELECTION ════════ */
function select(type, id, opt){
  opt = opt || {};
  S.sel = {type, id};
  const o = BYID[type+':'+id];
  openDetail({type, id}, opt.keepStack);
  buildPins(); drawSelection();
  if(opt.fly !== false){ const k = type==='turn'||type==='gate' ? Math.max(V.k, 1.05) : Math.max(V.k, .7); focusOn(o.x, o.y, k, true); }
  else { // make sure it's not hidden under the sheet
    const [x,y] = w2s(o.x,o.y); const a = visArea();
    if(y > a.y1-10 || y < a.y0 || x < a.x0 || x > a.x1) focusOn(o.x, o.y, V.k, true);
  }
}
function clearSel(){ S.sel=null; if(S.detail && S.detail.type!=='item' && S.detail.type!=='search'){ S.detail=null; S.stack=[]; } buildPins(); drawSelection(); renderSheet(); }

/* ════════════════════════════════════════
   SHEET
   ════════════════════════════════════════ */
const sheet = $('#sheet'), body = $('#body');
function sheetY(state){
  const hgt = sheet.offsetHeight; const peek = parseFloat(getComputedStyle(sheet).getPropertyValue('--peek')) || 196;
  return state==='full' ? hgt : state==='half' ? hgt*.54 : peek;
}
function setSheet(s){ S.sheet = s; sheet.classList.toggle('half', s==='half'); sheet.classList.toggle('full', s==='full'); }
let dragEndAt = 0;
(() => { // drag to resize (mobile)
  let d = null;
  const start = e => { if(mqDesk.matches) return; if(e.target.closest('.tab,.srch') && e.pointerType==='mouse') return; d = {y:e.clientY, t0:performance.now(), base: sheet.getBoundingClientRect().top, moved:false, id:e.pointerId, el:e.currentTarget}; };
  const move = e => {
    if(!d || e.pointerId!==d.id) return;
    const dy = e.clientY - d.y;
    if(!d.moved && Math.abs(dy) < 8) return;
    if(!d.moved){ d.moved = true; sheet.classList.add('nodrag'); }
    const H = window.innerHeight, top = clamp(d.base + dy, H - sheet.offsetHeight, H - 120);
    sheet.style.transform = `translateY(${top - (H - sheet.offsetHeight)}px)`;
  };
  const end = e => {
    if(!d || e.pointerId!==d.id) return;
    if(d.moved){
      const dy = e.clientY - d.y, v = dy/(performance.now()-d.t0);
      sheet.classList.remove('nodrag'); sheet.style.transform='';
      const H = window.innerHeight, top = d.base + dy;
      const order = ['full','half','peek'];
      const pos = {full:H - sheetY('full'), half:H - sheetY('half'), peek:H - sheetY('peek')};
      let best = order.reduce((a,b)=> Math.abs(pos[a]-top) < Math.abs(pos[b]-top) ? a : b);
      if(v > .6) best = S.sheet==='full' ? 'half' : 'peek';
      else if(v < -.6) best = S.sheet==='peek' ? 'half' : 'full';
      setSheet(best);
      dragEndAt = performance.now();
    }
    d = null;
  };
  [$('#grip'), $('#tabs')].forEach(el => el.addEventListener('pointerdown', start));
  onG(window, 'pointermove', move); onG(window, 'pointerup', end); onG(window, 'pointercancel', end);
  $('#grip').addEventListener('click', () => performance.now()-dragEndAt > 350 && setSheet(S.sheet==='peek' ? 'half' : S.sheet==='half' ? 'full' : 'peek'));
  $('#grip').addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); $('#grip').click(); } });
})();

$('#tabs').addEventListener('click', e => {
  if(performance.now()-dragEndAt < 350) return;
  const b = e.target.closest('.tab'); if(!b) return;
  S.detail = null; S.stack = [];
  if(S.tab === b.dataset.tab && S.sheet==='peek') setSheet('half');
  S.tab = b.dataset.tab;
  if(S.sel){ S.sel=null; buildPins(); drawSelection(); }
  if(S.sheet==='peek') setSheet('half');
  renderSheet(true);
});
$('#b-search').onclick = () => { openDetail({type:'search'}); if(S.sheet!=='full') setSheet('full'); setTimeout(()=>{ const i=$('#q'); i && i.focus(); }, 60); };

function openDetail(d, keepStack){
  if(S.detail && !keepStack && !(S.detail.type===d.type && S.detail.id===d.id)) S.stack.push(S.detail);
  if(!keepStack && !S.detail) S.stack = [];
  S.detail = d;
  if(S.sheet==='peek' && !mqDesk.matches) setSheet('half');
  renderSheet(true);
}
function back(){
  S.detail = S.stack.pop() || null;
  if(S.detail && S.detail.type!=='item' && S.detail.type!=='search') S.sel = {type:S.detail.type, id:S.detail.id};
  else S.sel = null;
  buildPins(); drawSelection(); renderSheet(true);
}

/* ════════════════════════════════════════
   SHEET RENDERING
   ════════════════════════════════════════ */
let viewKey = '';
const KEEP = {};
body.addEventListener('scroll', e => { const el = e.target; if(el.dataset && el.dataset.keep) KEEP[viewKey+'|'+el.dataset.keep] = el.scrollLeft; }, true);
function renderSheet(fresh){
  const t = now();
  let html, key;
  if(S.detail){ key = 'd:'+S.detail.type+':'+(S.detail.id||''); html = vDetail(S.detail, t); }
  else { key = 't:'+S.tab+':'+(S.tab==='sched'?S.schedDay:S.tab==='plan'?S.planDay:S.tab==='guide'?S.intent:''); html = ({now:vNow, sched:vSched, guide:vGuide, plan:vPlan})[S.tab](t); }
  const same = key === viewKey && !fresh;
  const st0 = body.scrollTop;
  const focusQ = document.activeElement && document.activeElement.id === 'q';
  const selR = focusQ ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  body.innerHTML = `<div class="view${same?'':' anim'}">${html}</div>`;
  viewKey = key;
  let restored = false;
  $$('[data-keep]', body).forEach(el => { const v = KEEP[key+'|'+el.dataset.keep]; if(v!=null){ el.scrollLeft = v; restored = true; } });
  if(same) body.scrollTop = st0;
  else { body.scrollTop = 0; if(!restored) afterRender(t); }
  wireTimeline();
  if(focusQ){ const i=$('#q'); if(i){ i.focus(); try{ i.setSelectionRange(selR[0], selR[1]); }catch(e){} } }
  $$('.tab').forEach(b => b.setAttribute('aria-selected', String(!S.detail && b.dataset.tab===S.tab)));
  const n = S.saved.size; $('.tab[data-tab="plan"]').innerHTML = '내 계획' + (n?`<span class="bdg">${n}</span>`:'');
  moveThumb();
}
/* timeline: keep a block's title readable when its start scrolls under the label column */
function stickBlocks(sc){
  const L = sc.scrollLeft + LABW;
  $$('.blk', sc).forEach(b => {
    const x = b.offsetLeft, w = b.offsetWidth;
    const sh = x < L && x + w > L ? Math.min(L - x, Math.max(0, w - 64)) : 0;
    if(sh !== (+b.dataset.sh||0)){ b.dataset.sh = sh; b.style.setProperty('--sh', sh+'px'); }
    b.classList.toggle('tiny', x < L && x + w - L < 60);
  });
}
function wireTimeline(){
  const sc = $('.tl-sc', body); if(!sc) return;
  stickBlocks(sc);
  sc.addEventListener('scroll', () => stickBlocks(sc), {passive:true});
}
function afterRender(t){
  const sc = $('.tl-sc', body);
  if(sc){ const nl = $('.nowl', sc); const target = nl ? parseFloat(nl.style.left) - LABW - 100 : 0; sc.scrollLeft = Math.max(0, target); }
}
function moveThumb(){
  const th = $('#thumb'), b = $(`.tab[data-tab="${S.tab}"]`);
  if(!b || !th) return;
  th.style.opacity = S.detail ? '0' : '1';
  th.style.width = b.offsetWidth+'px';
  th.style.transform = `translateX(${b.offsetLeft-3}px)`;
}

/* ── brand components ── */
function lightRow(on, mode, size){ let h=''; for(let i=0;i<5;i++) h += `<i class="${i<on?'on':''}"></i>`; return `<span class="lr ${size||''} ${mode||''}" aria-hidden="true">${h}</span>`; }
const sym = cls => `<svg class="sym ${cls||''}" viewBox="0 0 1330 708" aria-hidden="true"><use href="#g-sym"/></svg>`;
const SERIES = VN.series;
const stag = it => { const s = SERIES[it.series]; return `<span class="stag ${s.cls}">${s.code}${!s.noRound?` <span class="rd">${VN.round}</span>`:''}</span>`; };
const sh = (title, aux) => `<div class="sh"><h2>${title}</h2>${aux?`<span class="aux">${aux}</span>`:''}</div>`;
/* zones: keys are numbers (Singapore 1–4) or strings; evt keys are 'z'+key */
const zKey = z => { const k = String(z).replace(/^z/,''); return /^\d+$/.test(k) ? +k : k; };
const zBadge = z => ZONES && ZONES[z] ? ZONES[z].badge : 'ZONE '+z;
const zShort = z => ZONES && ZONES[z] ? ZONES[z].short : 'Z'+z;
const zName = z => ZONES && ZONES[z] ? ZONES[z].name : 'Zone '+z;
const zb = zone => { if(zone==null) return ''; const c = canEnter(zone); return `<span class="zb ${c?'ok':c===false?'no':''}">${c===false?ico('lock'):''}${zBadge(zone)}</span>`; };
const starBtn = id => `<button class="star" data-act="save" data-id="${id}" aria-pressed="${S.saved.has(id)}" aria-label="${S.saved.has(id)?'내 계획에서 빼기':'내 계획에 담기'}">${ico('star')}</button>`;
const tzT = (ms, zone) => `<span class="tz">${hm(ms)}<small>${zone||TZA}</small></span>`;
const lockedAct = it => it.kind==='act' && canEnter(BYID['stage:'+it.stage].zone)===false;
const isLightsOut = it => it.kind==='track' && /스프린트$|결승/.test(it.title);
const WEEKDAY_EN = DAYS.map(d => d.en);

/* mini circuit — the whole lap in miniature, with the part that matters lit */
const MT_VB = (() => { const p=60; return `${(BB.x0-p).toFixed(0)} ${(BB.y0-p).toFixed(0)} ${(BB.x1-BB.x0+p*2).toFixed(0)} ${(BB.y1-BB.y0+p*2).toFixed(0)}`; })();
function miniTrack(o){
  o = o || {};
  let h = `<svg class="mt" viewBox="${MT_VB}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path class="a" d="${TRACK_D}"/>`;
  if(o.live) h += `<path class="lv" d="${TRACK_D}"/>`;
  (o.arcs||[]).forEach(r => h += `<path class="h" d="${pathD(arcPts(r[0], r[1]))}"/>`);
  if(o.turn){ const tn = BYID['turn:'+o.turn]; h += `<path class="h" d="${pathD(arcPts(tn.s-70, tn.s+70))}"/>`; }
  const sf = ptAt(0); h += `<circle class="sf" cx="${sf.x}" cy="${sf.y}" r="34"/>`;
  if(o.dot) h += `<circle class="d" cx="${o.dot.x}" cy="${o.dot.y}" r="46"/>`;
  return h + `</svg>`;
}

/* hero state for the weekend (08.7 time states) — subject is the live or next F1 session */
function heroState(t){
  const f1 = TRACK.filter(x => x.series==='f1');
  const live = f1.find(x => st(x,t)==='live');
  if(live) return {state:'live', it:live, on:0, mode:'live', text:`지금 진행 중 · ${live.title}`};
  const nx = f1.find(x => x.s > t);
  if(!nx) return {state:'done', it:null, on:0, mode:'', text:'레이싱 위켄드 종료'};
  if(nx.s - t <= 24*H){
    const same = dayOf(nx.s) === dayOf(t);
    return {state:'soon', it:nx, on:5, mode:'soon', text:`${same?'오늘 ':''}${until(nx.s,t)} · ${nx.title}`};
  }
  const dl = dayOf(nx.s) - dayOf(t);
  return {state:'upcoming', it:nx, on:clamp(5-dl,0,5), mode:'', text:`다음 레이싱 위켄드 · D-${dl}`};
}

/* session row (08.10): bar · title · meta · time on the right edge */
function row(it, t, o){
  o = o || {};
  const s = st(it,t); const lk = lockedAct(it);
  const cls = s==='live' ? 'live' : s==='past' ? 'past' : (o.nextId===it.id ? 'next' : '');
  const pl = itemPlace(it); const w = S.me && pl && !o.noWalk ? walk(S.me, pl) : null;
  let meta = o.meta != null ? o.meta : esc(placeName(it));
  if(lk && !o.noLock) meta = `${ico('lock','s')} ${meta} · ${zName(BYID['stage:'+it.stage].zone)} 필요`;
  else if(w && o.meta == null) meta += ` · 도보 ${w.m}분`;
  const sub = s==='live' ? `<span class="tlive">LIVE</span>` : it.open ? `<small>${o.showDay?dayTag(it.day)+' · ':''}시작</small>` : `<small>${o.showDay?dayTag(it.day)+' · ':''}${it.approx?'약 ':''}–${it.endMax?'최대 ':''}${hm(it.e)}</small>`;
  const bar = it.kind==='track' ? it.series : '';
  return `<div class="row ${cls}"><button class="main" data-act="item" data-id="${it.id}" aria-label="${esc(it.title)}, ${hm(it.s)} ${TZA}${s==='live'?', 진행 중':s==='past'?', 종료':''}">
      <span class="bar ${bar}"></span>
      <span class="tx"><b>${esc(it.title)}</b><span class="m">${meta}</span></span>
      <span class="tm">${hm(it.s)}${sub}</span></button>${starBtn(it.id)}</div>`;
}
const nextIdOf = (list, t) => { const n = list.find(x => x.s > t); return n ? n.id : null; };
const stat = (k, v, sm) => `<div><span class="k">${k}</span><span class="v">${v}${sm?`<small>${sm}</small>`:''}</span></div>`;

/* ════════ VIEW: 지금 ════════ */
function vNow(t){
  if(t < EV_START){
    const first = TRACK[0]; const dl = dayOf(first.s) - dayOf(t);
    return `<div class="sec"><div class="hero">
        <div class="top">${lightRow(clamp(5-dl,0,5),'','m')}<span style="font-size:13px;font-weight:600;color:var(--text2)">다음 레이싱 위켄드 · D-${dl}</span></div>
        <div class="ttl">${esc(VN.title)}</div>
        <div class="en">${esc(VN.heroEn)}</div>
        <div class="main"><div><span class="lbl">First session</span>${tzT(first.s)}</div>${miniTrack({})}</div>
        <div class="stats" style="--n:2">${stat('날짜', dLabel(0))}${stat('한국 시간', kst(first.s), 'KST')}</div>
        <button class="hint" data-act="demo">${ico('clock')}<span>레이싱 위켄드가 시작되면 트랙과 무대 상황을 지도에 바로 보여드려요. <b>데모 시계로 미리 보기</b></span>${ico('next')}</button>
      </div></div>` + upNext(t, true);
  }
  if(t >= EV_END) return `<div class="empty">${sym()}<b>레이싱 위켄드가 끝났어요</b>다음 레이싱 위켄드에서 다시 불을 켤게요.<div class="acts"><button class="btn" data-act="demo">데모 시계로 다시 보기</button></div></div>`;
  let h = '';
  const lt = liveTrack(t), nt = nextTrack(t);
  const seat = S.seat && BYID['spot:'+S.seat];
  const seatArc = seat ? seat.cov : [];
  const seatCta = `<button class="hint" data-act="tab" data-id="guide">${ico('seat')}<span><b>어디서 볼지 고르기</b> · 추월, 출발, 무대 근처 관람석</span>${ico('next')}</button>`;
  if(lt && !isQuiet(lt)){
    const p = (t-lt.s)/(lt.e-lt.s)*100;
    h += `<div class="sec"><div class="hero live">
      <div class="top">${stag(lt)}<span class="st live">LIVE</span></div>
      <div class="ttl">${esc(lt.title)}</div>
      ${lt.note?`<div class="en">${esc(lt.note)}</div>`:''}
      <div class="main"><div><span class="lbl">종료까지</span><span class="tz">${dur((lt.e-t)/M)}</span></div>${miniTrack({live:true, arcs:seatArc, dot: seat})}</div>
      <div class="prog" role="progressbar" aria-label="세션 진행" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p.toFixed(1)}%"></i></div>
      <div class="stats" style="--n:2">${stat('진행 시간', `${hm(lt.s)}–${hm(lt.e)}`, TZA)}${stat('한국 시간', `${kst(lt.s)}–${kst(lt.e)}`, 'KST')}</div>
      ${seat ? `<div class="hint">${ico('eye')}<span>내 자리 <b>${esc(seat.name)}</b>에서는 ${seat.turns.map(n=>n+'번').join('·')} 코너가 보여요</span></div>` : seatCta}
    </div></div>`;
  } else if(nt){
    const today = nt.day === dayOf(t);
    const w = seat && S.me ? walk(S.me, seat) : null;
    let hint = '';
    if(seat && today){
      if(w){ const leave = nt.s - (w.m+5)*M; hint = (leave - t) <= 0
          ? `<div class="hint">${ico('walk')}<span><b>지금 출발하면 맞춰 도착해요</b> · ${esc(seat.name)}까지 도보 약 ${w.m}분</span></div>`
          : `<div class="hint">${ico('walk')}<span><b>${hm(leave)} ${TZA}까지 출발</b>하면 ${esc(seat.name)}에 5분 여유 있게 도착해요</span></div>`; }
      else hint = `<button class="hint" data-act="place">${ico('locate')}<span><b>내 위치 지정하기</b> · 언제 출발할지 알려드려요</span>${ico('next')}</button>`;
    } else if(!seat && today) hint = seatCta;
    const saved = S.saved.has(nt.id);
    h += `<div class="sec"><div class="hero">
      <div class="top">${stag(nt)}<span class="st next">NEXT</span><span class="sp"></span>${today?'':`<span class="lbl" style="color:var(--text3)">${WEEKDAY_EN[nt.day]} · ${DAYS[nt.day].d}</span>`}</div>
      <div class="ttl">${esc(nt.title)}</div>
      ${nt.note?`<div class="en">${esc(nt.note)}</div>`:''}
      <div class="main"><div><span class="lbl">${isLightsOut(nt)?'Lights out':'Session start'}</span>${tzT(nt.s)}</div>${miniTrack({arcs:seatArc, dot:seat})}</div>
      <div class="stats" style="--n:2">${stat('시작까지', until(nt.s,t).replace(' 뒤',''))}${stat('한국 시간', kst(nt.s), 'KST')}</div>
      ${hint}
      <div class="acts"><button class="btn ${saved?'':'pri'} flex" data-act="save" data-id="${nt.id}" aria-pressed="${saved}">${ico(saved?'check':'bell')}${saved?'담았어요 · 30분 전 알림':'내 계획에 담기 · 30분 전 알림'}</button><button class="link" data-act="item" data-id="${nt.id}">상세</button></div>
    </div></div>`;
  } else {
    h += `<div class="sec"><div class="empty" style="padding:26px 16px 20px">${sym()}<b>오늘 트랙 일정이 모두 끝났어요</b>무대 공연은 아래에서 이어져요.</div></div>`;
  }
  const mine = ITEMS.find(x => S.saved.has(x.id) && x.e > t && x.day===dayOf(t) && x.id !== (lt||nt||{}).id);
  if(mine){
    const pl = itemPlace(mine), w = S.me && pl ? walk(S.me, pl) : null;
    let meta = esc(placeName(mine));
    if(st(mine,t)!=='live' && w){ const leave = mine.s - (w.m+5)*M; meta += leave - t <= 0 ? ` · 지금 출발하세요` : ` · ${hm(leave)}까지 출발`; }
    h += `<div class="sec">${sh('내 다음 일정', `<button data-act="tab" data-id="plan">전체 보기</button>`)}<div class="grp">${row(mine, t, {meta, nextId:mine.id})}</div></div>`;
  }
  const live = ITEMS.filter(x => x.kind==='act' && st(x,t)==='live');
  const meW = it => S.me ? walk(S.me, BYID['stage:'+it.stage]) : null;
  live.sort((a,b) => { const la = lockedAct(a), lb = lockedAct(b); if(la!==lb) return la?1:-1; const wa=meW(a), wb=meW(b); return wa&&wb ? wa.m-wb.m : 0; });
  h += `<div class="sec">${sh(live.length ? '지금 무대' : '무대', live.length ? `${live.length}곳에서 공연 중` : '')}`;
  if(live.length){
    h += `<div class="hs" data-keep="live">` + live.map(it => {
      const sgd = BYID['stage:'+it.stage]; const lk = lockedAct(it); const w = meW(it); const p = (t-it.s)/(it.e-it.s)*100;
      return `<button class="lv${lk?' lock':''}" data-act="sel" data-type="stage" data-id="${it.stage}">
        <div class="hd">${lk?`<span class="zb no">${ico('lock')}${zBadge(sgd.zone)}</span>`:`<span class="st live">LIVE</span>`}<span class="sp"></span><span>${esc(sgd.short||sgd.name)}</span></div>
        <div class="ar">${esc(it.title)}</div>
        <div class="prog"><i style="width:${p.toFixed(1)}%"></i></div>
        <div class="ft"><span>종료까지 ${dur((it.e-t)/M)}</span><span class="sp"></span>${!lk && w ? `${ico('walk','s')} ${w.m}분` : ''}</div></button>`;
    }).join('') + `</div>`;
  } else {
    const na = ITEMS.find(x => x.kind==='act' && x.s > t && x.day===dayOf(t));
    const inUp = na && na.s <= t + 2*H;
    h += na ? (inUp ? `<p class="note" style="margin-top:0">지금 공연 중인 무대는 없어요.</p>` : `<div class="grp">${row(na, t, {nextId:na.id})}</div>`) : `<p class="note" style="margin-top:0">오늘 남은 공연이 없어요.</p>`;
  }
  h += `</div>`;
  return h + upNext(t, false, [(lt||nt||{}).id, mine && mine.id]);
}
function upNext(t, pre, skip){
  const from = pre ? EV_START : t;
  const ups = ITEMS.filter(x => x.s > from && x.s <= from + (pre ? 864e5 : 2*H) && !(skip||[]).includes(x.id)).slice(0, 6);
  if(!ups.length) return '';
  return `<div class="sec">${sh(pre?'첫날 일정':'2시간 안에 시작', TZA+' 현지 시각')}<div class="grp">${ups.map(x => row(x,t,{nextId:ups[0].id})).join('')}
    <button class="more" data-act="tab" data-id="sched">전체 일정 보기 ${ico('next','s')}</button></div></div>`;
}

/* ════════ VIEW: 일정 (timeline) ════════ */
const TL0 = VN.tl.from, TL1 = VN.tl.to, PPM = 3.6, LABW = 104;
const TL_NAME = VN.tl.names;
function curDay(){ return clamp(dayOf(now()), 0, ND-1); }
function daySeg(cur, act){
  const td = dayOf(now());
  return `<div class="seg" role="tablist" aria-label="날짜">${DAYS.map((d,i)=>`<button role="tab" data-act="${act}" data-id="${i}" aria-selected="${i===cur}"><span class="dt">${d.d}</span>${d.w}${i===td?'<span class="td" aria-label="오늘"></span>':''}</button>`).join('')}</div>`;
}
function vSched(t){
  const day = S.schedDay==null ? curDay() : S.schedDay;
  const rows = [{id:'track'}].concat(VN.tl.rows.map(id => BYID['stage:'+id]));
  const W = (TL1-TL0)*PPM, x = min => LABW + (min-TL0)*PPM;
  const mins = ms => { const d = sg(ms); return d.getUTCHours()*60 + d.getUTCMinutes(); };
  let hd = `<div class="tl-hd"><div class="tl-lab"><span class="lbl" style="color:var(--text3)">${TZA}</span></div>`;
  for(let m=TL0; m<=TL1; m+=60) hd += `<span style="left:${x(m)}px">${String(m/60%24).padStart(2,'0')}:00</span>`;
  hd += `</div>`;
  let rowsH = '';
  rows.forEach(r => {
    const items = ITEMS.filter(it => it.day===day && (r.id==='track' ? it.kind==='track' : it.stage===r.id));
    const lk = r.zone && canEnter(r.zone)===false;
    let h = `<div class="tl-row"><div class="tl-lab" ${r.id!=='track'?`role="button" tabindex="0" data-act="sel" data-type="stage" data-id="${r.id}" aria-label="${esc(r.name)} 지도에서 보기"`:''}><b>${r.id==='track'?'트랙':esc(TL_NAME[r.id])}</b>${r.zone!=null?zb(r.zone).replace(zBadge(r.zone), zShort(r.zone)):r.id==='track'?VN.tl.trackTag:''}</div>`;
    for(let m=TL0; m<=TL1; m+=30) h += `<span class="tl-gl${m%60?' h':''}" style="left:${x(m)}px"></span>`;
    items.forEach(it => {
      const s = st(it,t), a = mins(it.s), b = it.open ? Math.min(TL1, a + openSpan(it)) : it.e > tm(day,'23:59') ? TL1 : mins(it.e);
      const w = Math.max(6, (b-a)*PPM - 4), sv = S.saved.has(it.id);
      h += `<button class="blk ${it.kind==='track'?it.series:''} ${sv?'saved':''} ${s} ${lk?'lock':''}" style="left:${x(a)+2}px;width:${w}px" data-act="item" data-id="${it.id}" aria-label="${esc(it.title)} ${it.open?hm(it.s)+' 시작, 끝나는 시각 미발표':hm(it.s)+'부터 '+hm(it.e)+'까지'} ${TZA}${s==='live'?', 진행 중':''}${sv?', 내 계획에 담음':''}">
        ${sv?`<svg class="sv" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg>`:''}<span class="bi"><b>${esc(it.title)}</b><span class="m">${s==='live'?'LIVE · ':''}${it.open?hm(it.s)+' 시작':(it.approx?'약 ':'')+hm(it.s)+'–'+hm(it.e)}</span></span></button>`;
    });
    rowsH += h + `</div>`;
  });
  let nowl = '';
  if(dayOf(t)===day){ const m = mins(t); if(m>=TL0 && m<=TL1) nowl = `<span class="nowl" data-t="${hm(t)}" style="left:${x(m)}px"></span>`; }
  return `${daySeg(day,'sday')}
    <div class="tl"><div class="tl-sc" data-keep="tl"><div class="tl-in" style="width:${LABW+W+24}px">${hd}<div style="position:relative">${rowsH}${nowl}</div></div></div></div>
    ${TBAS.map(b => `<p class="note"><b>${esc(b.name)}</b> · ${b.acts.join(', ')} · ${b.days} · 시작 시각 미정 · 확정되면 알려드립니다</p>`).join('')}
`;
}

/* ════════ VIEW: 관람 ════════ */
const INTENTS = [
  {id:'all', t:'전체'},
  {id:'overtake', t:'추월 포인트', f:sp=>sp.tags.includes('overtake')},
  {id:'start', t:'출발·피트', f:sp=>sp.tags.includes('start')},
  {id:'podium', t:'포디움', f:sp=>sp.tags.includes('podium')},
  {id:'stage', t:'무대와 가까운', sort:sp=>nearest(sp, STAGES)[0].w.d},
  {id:'mrt', t:TR.near, sort:sp=>nearest(sp, MRTS)[0].w.d}
];
function seatCard(seat){
  return `<button class="seat-card" data-act="sel" data-type="spot" data-id="${seat.id}">${miniTrack({arcs:seat.cov, dot:seat})}
    <span class="tx"><span class="lbl">My seat</span><b>${esc(seat.name)} ${zb(seat.zone)}</b><span class="m">${seat.turns.map(n=>n+'번').join('·')} 코너 · 약 ${seat.covLen}m 구간이 보여요</span></span>${ico('next')}</button>`;
}
function vGuide(t){
  const it = INTENTS.find(i=>i.id===S.intent) || INTENTS[0];
  let list = SPOTS.slice();
  if(it.f) list = list.filter(it.f);
  if(it.sort) list.sort((a,b)=>it.sort(a)-it.sort(b));
  else list.sort((a,b)=> { const la=canEnter(a.zone)===false, lb=canEnter(b.zone)===false; return la===lb ? 0 : la?1:-1; });
  const seat = S.seat && BYID['spot:'+S.seat];
  let h = '';
  h += `<div class="sec"><div class="intents" data-keep="intents" role="toolbar" aria-label="관람 목적">${INTENTS.map(i=>`<button class="chip" data-act="intent" data-id="${i.id}" aria-pressed="${i.id===it.id}">${i.t}</button>`).join('')}</div></div>`;
  h += `<div class="sec" style="margin-top:18px">${sh(it.id==='all'?'관람석':it.t, `${list.length}곳`)}<div class="grp">` + list.map(sp => {
    const lk = canEnter(sp.zone)===false; const w = S.me ? walk(S.me, sp) : null;
    let why = '';
    if(it.id==='stage'){ const n=nearest(sp, STAGES)[0]; why = `<b>${esc(n.o.short||n.o.name)} 도보 ${n.w.m}분</b> · `; }
    else if(it.id==='mrt'){ const n=nearest(sp, MRTS)[0]; why = `<b>${esc(n.o.name)}${TR.suffix} 도보 ${n.w.m}분</b> · `; }
    return `<button class="spot${lk?' lock':''}" data-act="sel" data-type="spot" data-id="${sp.id}">${miniTrack({arcs:sp.cov, dot:sp})}
      <span class="tx"><span class="nm">${esc(sp.name)} ${zb(sp.zone)}${S.seat===sp.id?'<span class="st next">MY SEAT</span>':''}</span><p>${why}${esc(sp.desc)}</p></span>
      ${w?`<span class="rt"><b>${w.m}분</b>도보</span>`:`<span class="rt tns" aria-label="${sp.turns.map(n=>n+'번').join(', ')} 코너">${sp.turns.map(n=>`<i>${n}</i>`).join('')}</span>`}</button>`;
  }).join('') + `</div></div>`;
  if(!S.me) h += `<button class="hint" style="margin-top:12px" data-act="place">${ico('locate')}<span><b>내 위치 지정하기</b> · 관람석까지 도보 시간을 함께 보여드려요</span>${ico('next')}</button>`;
  return h;
}

/* ════════ VIEW: 내 계획 ════════ */
function vPlan(t){
  const day = S.planDay==null ? curDay() : S.planDay;
  const seat = S.seat && BYID['spot:'+S.seat];
  let h = `<div class="sec">${seat ? seatCard(seat) : `<div class="seat-card"><span class="ic">${ico('ticket')}</span><span class="tx"><span class="lbl">My ticket</span><b>${tk()?esc(tk().name):'티켓 미선택'}</b><span class="m">${tk()&&tk().zones?'지정석 없음 · '+(tk().zones.every(z=>typeof z==='number') ? 'Zone '+tk().zones.join('·') : tk().zones.map(zName).join('·')):tk()&&tk().planSub?esc(tk().planSub):'티켓을 고르면 들어갈 수 있는 곳을 표시해요'}</span></span><button class="btn sm ghost" data-act="ticket">변경</button></div>`}</div>`;
  h += `<div class="sec" style="margin-top:18px">${daySeg(day,'pday')}</div>`;
  const items = ITEMS.filter(x => x.day===day && S.saved.has(x.id));
  if(!items.length){
    const anyF1 = ITEMS.some(x=>x.kind==='track'&&x.series==='f1'&&!S.saved.has(x.id));
    return h + `<div class="sec" style="margin-top:18px"><div class="empty">${sym()}<b>${dLabel(day)}에 담은 일정이 없어요</b>☆를 눌러 담으면 이동 시간과<br>겹치는 일정을 함께 챙겨드려요.
      <div class="acts">${anyF1?'<button class="btn pri" data-act="saveF1">F1 세션 모두 담기</button>':''}<button class="btn" data-act="tab" data-id="sched">일정 보기</button></div></div></div>`;
  }
  h += `<div class="sec" style="margin-top:22px">${sh(`${items.length}개 일정`, TZA+' 현지 시각')}<div class="grp">`;
  const nid = nextIdOf(items, t);
  items.forEach((it,i) => {
    if(i>0){
      const prev = items[i-1]; const gap = (it.s - prev.e)/M;
      const a = itemPlace(prev), b = itemPlace(it); const w = a && b && a!==b ? walk(a,b) : null;
      let txt, warn=false;
      if(gap < 0){ txt = `${ico('warn','s')} ${dur(-gap)} 겹쳐요 · 하나를 골라야 해요`; warn=true; }
      else if(w && w.m > gap){ txt = `${ico('warn','s')} 이동 ${w.m}분이 필요한데 ${dur(gap)}뿐이에요`; warn=true; }
      else if(w) txt = `${ico('walk','s')} 이동 ${w.m}분${w.cr?' · 트랙 횡단 포함':''} · 여유 ${dur(gap - w.m)}`;
      else txt = `${ico('clock','s')} ${gap? dur(gap)+' 쉬는 시간' : '바로 이어서'}`;
      h += `<div class="pl-con${warn?' warn':''}">${txt}</div>`;
    }
    h += row(it, t, {nextId:nid});
  });
  h += `</div><p class="note">이동 시간은 직선 거리 기준 예상치예요.</p></div>`;
  return h;
}

/* ════════ DETAIL — place cards ════════ */
function dNav(){ return S.stack.length ? `<div class="dt-nav"><button class="bk" data-act="back">${ico('back')}뒤로</button></div>` : ''; }
const xBtn = `<button class="dt-x" data-act="close" aria-label="닫기">${ico('x')}</button>`;
const approx = '';
function accLine(zone, what){
  if(zone==null) return '';
  const c = canEnter(zone);
  if(c===null){ const nt = VN.zoneNote && VN.zoneNote[zone]; return nt ? `<div class="acc">${ico('ticket')}<span>${nt}</span></div>` : ''; }
  return c ? ''
           : `<div class="acc no">${ico('lock')}<span>${zName(zone)} 입장 티켓이 있어야 들어갈 수 있어요</span></div>`;
}
function walkTile(p){
  if(S.me){ const w = walk(S.me, p); return `<button class="tile pri" data-act="route">${ico('walk')}도보 ${w.m}분<small>${Math.round(w.d)}m 직선${w.cr?' · 횡단 포함':''}</small></button>`; }
  return `<button class="tile" data-act="place">${ico('locate')}내 위치<small>지정하면 도보 시간</small></button>`;
}
function nearTile(p, arr, type, label){
  const n = nearest(p, arr, 1)[0];
  return `<button class="tile" data-act="sel" data-type="${type}" data-id="${n.o.id}">${ico(type==='mrt'?(TR.icon||'train'):type==='gate'?'gate':'music')}${esc(n.o.short||n.o.name)}<small>${label} · ${n.w.m}분</small></button>`;
}
function kvNear(p, arr, label, type){
  const n = nearest(p, arr, 1)[0];
  return `<button class="gi" data-act="sel" data-type="${type}" data-id="${n.o.id}"><span class="k">${label}</span><span class="v">${esc(n.o.short||n.o.name)}${type==='gate'?' 게이트':''}${type==='mrt'?' '+n.o.codes.map(c=>`<span class="mrt-c">${c}</span>`).join(' '):''}<small>도보 약 ${n.w.m}분</small></span>${ico('next','go')}</button>`;
}
function vDetail(d, t){
  if(d.type==='search') return vSearch(t);
  if(d.type==='item') return dItem(IT[d.id], t);
  const o = BYID[d.type+':'+d.id];
  return dNav() + ({spot:dSpot, stage:dStage, gate:dGate, mrt:dMrt, village:dVillage, turn:dTurn})[d.type](o, t);
}
function dSpot(sp, t){
  const isSeat = S.seat===sp.id, lt = liveTrack(t);
  let h = `<div class="pc-hd"><div class="kicker">${ico('seat','s')}${sp.kind||'그랜드스탠드'}${sp.zone!=null?' · '+zb(sp.zone):''}${isSeat?'<span class="st next">MY SEAT</span>':''}</div><h3>${esc(sp.name)}</h3>${xBtn}</div>`;
  h += `<div class="tiles" style="--n:2">${walkTile(sp)}<button class="tile" data-act="${isSeat?'unseat':'seat'}" data-id="${sp.id}" aria-pressed="${isSeat}">${ico(isSeat?'check':'seat')}${isSeat?'내 자리':'내 자리로'}<small>${isSeat?'눌러서 해제':'출발 시각 계산'}</small></button></div>`;
  h += accLine(sp.zone, '이 구역에 입장');
  h += `<div class="pc-map">${miniTrack({arcs:sp.cov, dot:sp, live: !!(lt && !isQuiet(lt))})}<div class="tx"><span class="lbl">보이는 구간 · 추정</span><b>약 ${sp.covLen}m</b><div class="tcs">${sp.turns.map(n=>`<button class="tchip" data-act="sel" data-type="turn" data-id="${n}" aria-label="${n}번 코너 보기">T${n}</button>`).join('')}</div></div></div>`;
  h += `<p class="desc">${esc(sp.desc)}</p>`;
  h += `<div class="sec" style="margin-top:22px">${sh('가는 길')}<div class="grp kv">${GATES.length?kvNear(sp, GATES, '게이트', 'gate'):''}${MRTS.length?kvNear(sp, MRTS, TR.short, 'mrt'):''}${STAGES.length?kvNear(sp, STAGES, '가까운 무대', 'stage'):''}</div></div>`;
  h += approx;
  return h;
}
function dStage(sgd, t){
  const la = liveAct(sgd.id, t);
  let h = `<div class="pc-hd"><div class="kicker">${ico('music','s')}무대${sgd.zone!=null?' · '+zb(sgd.zone):''}${la?'<span class="st live">LIVE</span>':''}</div><h3>${esc(sgd.name)}</h3>${xBtn}</div>`;
  h += `<div class="tiles">${walkTile(sgd)}${GATES.length?nearTile(sgd, GATES, 'gate', '게이트'):''}${MRTS.length?nearTile(sgd, MRTS, 'mrt', TR.short):''}</div>`;
  h += accLine(sgd.zone);
  if(sgd.desc) h += `<p class="desc">${esc(sgd.desc)}</p>`;
  const TBA = tbaOf(sgd.id);
  if(TBA){
    h += `<div class="sec" style="margin-top:22px">${sh('라인업',TBA.days)}<div class="grp">${TBA.acts.map(a=>`<div class="row"><div class="main" style="min-height:54px"><span class="bar"></span><span class="tx"><b>${esc(a)}</b><span class="m">${esc(TBA.name)}</span></span><span class="tm" style="font-size:12px;font-weight:600;color:var(--text3)">시작 시각 미정</span></div></div>`).join('')}</div><p class="note">시작 시각이 확정되면 알려드립니다.</p></div>`;
  }
  if(!TBA || ITEMS.some(x=>x.kind==='act'&&x.stage===sgd.id)){
    const acts = ITEMS.filter(x=>x.kind==='act'&&x.stage===sgd.id);
    const nid = nextIdOf(acts, t);
    const td = dayOf(t); const order = td<0||td>ND-1 ? DIDX : [td].concat(DIDX.filter(x=>x>td), DIDX.filter(x=>x<td));
    order.forEach(dd => {
      const a = acts.filter(x=>x.day===dd); if(!a.length) return;
      h += `<div class="sec" style="margin-top:22px">${sh(dLabel(dd), dd===td ? '오늘 · '+TZA : dd<td ? '지난 공연' : TZA)}<div class="grp">${a.map(x=>row(x,t,{meta: st(x,t)==='live' ? `종료까지 ${dur((x.e-t)/M)}` : x.open ? '끝나는 시각 미발표' : (x.approx?'약 ':'')+dur((x.e-x.s)/M), nextId:nid, noWalk:true, noLock:true})).join('')}</div></div>`;
    });
  }
  return h + approx;
}
function dGate(g, t){
  let h = `<div class="pc-hd"><div class="kicker">${ico('gate','s')}입장 게이트${g.side!=null?` · <span class="zb">${zBadge(g.side)} 쪽</span>`:''}</div><h3>${esc(g.gname)} 게이트</h3>${xBtn}</div>`;
  h += `<div class="tiles" style="--n:${MRTS.length?2:1}">${walkTile(g)}${MRTS.length?nearTile(g, MRTS, 'mrt', TR.short):''}</div>`;
  { const gd = VN.gateDesc(g); if(gd) h += `<p class="desc">${gd}</p>`; }
  const spots = nearest(g, SPOTS, 3);
  h += `<div class="sec" style="margin-top:22px">${sh('가까운 관람석')}<div class="grp">${spots.map(n=>`<button class="spot${canEnter(n.o.zone)===false?' lock':''}" data-act="sel" data-type="spot" data-id="${n.o.id}">${miniTrack({arcs:n.o.cov, dot:n.o})}<span class="tx"><span class="nm">${esc(n.o.name)} ${zb(n.o.zone)}</span><p>${n.o.turns.map(x=>x+'번').join('·')} 코너</p></span><span class="rt"><b>${n.w.m}분</b>도보</span></button>`).join('')}</div></div>` + approx;
  return h;
}
function dMrt(m, t){
  let h = `<div class="pc-hd"><div class="kicker">${ico(TR.icon||'train','s')}${TR.kicker}${m.codes.length?' · ':''}${m.codes.map(c=>`<span class="mrt-c">${c}</span>`).join(' ')}</div><h3>${esc(m.name)}</h3>${xBtn}</div>`;
  const gs = nearest(m, GATES, 2);
  h += `<div class="tiles" style="--n:1">${walkTile(m)}</div>`;
  h += `<div class="sec" style="margin-top:22px">${sh('가까운 게이트')}<div class="grp kv">${gs.map(n=>`<button class="gi" data-act="sel" data-type="gate" data-id="${n.o.id}"><span class="k">${n.o.side!=null?zBadge(n.o.side)+' 쪽':n.o.n?n.o.n+'번 게이트':'게이트'}</span><span class="v">${esc(n.o.gname)} 게이트<small>도보 약 ${n.w.m}분</small></span>${ico('next','go')}</button>`).join('')}</div></div>`;
  if(m.note || TR.note) h += `<p class="note">${esc(m.note || TR.note)}</p>`;
  h += approx;
  return h;
}
function dVillage(v, t){
  let h = `<div class="pc-hd"><div class="kicker">${ico('village','s')}${esc(v.label||VN.village.label)}${v.zone!=null?' · '+zb(v.zone):''}</div><h3>${esc(v.name)}</h3>${xBtn}</div>`;
  h += `<div class="tiles">${walkTile(v)}${STAGES.length?nearTile(v, STAGES, 'stage', '무대'):''}${GATES.length?nearTile(v, GATES, 'gate', '게이트'):''}</div>`;
  h += accLine(v.zone) + ((v.desc||VN.village.desc) ? `<p class="desc">${esc(v.desc||VN.village.desc)}</p>` : '') + approx;
  return h;
}
function dTurn(tn, t){
  const spots = SPOTS.filter(sp => sp.turns.includes(tn.n));
  let h = `<div class="pc-hd"><div class="kicker">${ico('flag','s')}코너${tn.ot?' · <span class="st next">OVERTAKING</span>':''}</div><h3>${tn.n}번 코너</h3>${xBtn}</div>`;
  h += `<div class="pc-map">${miniTrack({turn:tn.n})}<div class="tx"><span class="lbl">출발선에서</span><b>${(tn.s/1000).toFixed(2)} km</b></div></div>`;
  h += `<div class="sec" style="margin-top:22px">${sh('이 코너가 보이는 관람석', `${spots.length}곳`)}`;
  h += spots.length ? `<div class="grp">${spots.map(sp=>{ const w=S.me?walk(S.me,sp):null; return `<button class="spot${canEnter(sp.zone)===false?' lock':''}" data-act="sel" data-type="spot" data-id="${sp.id}">${miniTrack({arcs:sp.cov, dot:sp})}<span class="tx"><span class="nm">${esc(sp.name)} ${zb(sp.zone)}</span><p>${esc(sp.desc)}</p></span><span class="rt">${w?`<b>${w.m}분</b>도보`:''}</span></button>`; }).join('')}</div>`
    : `<div class="empty" style="padding:22px 16px">${VN.turnEmpty}</div>`;
  return h + `</div>`;
}
function dItem(it, t){
  const s = st(it,t); const pl = itemPlace(it); const lk = lockedAct(it); const saved = S.saved.has(it.id);
  const sgd = it.kind==='act' ? BYID['stage:'+it.stage] : null;
  let h = dNav();
  h += `<div class="pc-hd"><div class="kicker">${it.kind==='track'?stag(it):`${ico('music','s')}${esc(sgd.short||sgd.name)}`}${s==='live'?'<span class="st live">LIVE</span>':s==='past'?'<span class="st done">DONE</span>':''}</div><h3>${esc(it.title)}</h3>${it.kind==='track'&&it.note?`<p>${esc(it.note)}</p>`:''}${xBtn}</div>`;
  h += `<div class="sec" style="margin-top:18px"><div class="hero ${s==='live'?'live':''}" style="padding:16px 18px">
    <div class="main" style="margin-top:0"><div><span class="lbl">${WEEKDAY_EN[it.day]} · ${DAYS[it.day].d}</span>${it.approx?`<span class="tz"><span style="font-size:.42em;font-weight:600;color:var(--text2);margin:.6em .25em 0 0;letter-spacing:0">약</span>${hm(it.s)}<small>${TZA}</small></span>`:tzT(it.s)}</div>
      ${it.kind==='track' ? miniTrack({live:s==='live', arcs: pl ? pl.cov : [], dot: pl}) : ''}</div>
    ${s==='live'?`<div class="prog"><i style="width:${((t-it.s)/(it.e-it.s)*100).toFixed(1)}%"></i></div>`:''}
    <div class="stats">${stat(s==='live'?'종료까지':s==='past'||s==='open'?'상태':'시작까지', s==='live'?dur((it.e-t)/M):s==='past'?'종료':s==='open'?'시작함':until(it.s,t).replace(' 뒤',''))}${it.open?stat('끝나는 시각', '미발표'):stat('끝나는 시각', (it.endMax?'최대 ':'')+hm(it.e), TZA)}${stat('한국 시간', `${kst(it.s)}`, 'KST')}</div>
  </div></div>`;
  const placeTile = it.kind==='act' ? `<button class="tile" data-act="sel" data-type="stage" data-id="${sgd.id}">${ico('music')}${esc(sgd.short||sgd.name)}<small>지도에서 보기</small></button>`
                  : pl ? `<button class="tile" data-act="sel" data-type="spot" data-id="${pl.id}">${ico('seat')}${esc(pl.name)}<small>내 자리</small></button>`
                       : `<button class="tile" data-act="tab" data-id="guide">${ico('seat')}자리 고르기<small>관람 가이드</small></button>`;
  const tgt = it.kind==='act' ? sgd : pl;
  h += `<div class="tiles">${s!=='past'?`<button class="tile ${saved?'':'pri'}" data-act="save" data-id="${it.id}" aria-pressed="${saved}">${ico(saved?'check':'bell')}${saved?'담았어요':'내 계획에 담기'}<small>30분 전 알림</small></button>`:''}${placeTile}${tgt?walkTile(tgt).replace('tile pri','tile'):''}</div>`;
  if(lk) h += `<div class="acc no">${ico('lock')}<span>이 무대는 ${zName(sgd.zone)} 티켓이 있어야 들어갈 수 있어요</span></div>`;
  const clashes = ITEMS.filter(x => x.id!==it.id && S.saved.has(x.id) && x.s < it.e && x.e > it.s);
  if(clashes.length) h += `<div class="acc warn">${ico('warn')}<span>담아 둔 일정과 시간이 겹쳐요 · ${clashes.map(c=>`<b>${esc(c.title)}</b> ${hm(c.s)}–${hm(c.e)}`).join(', ')}</span></div>`;
  return h;
}
function vSearch(t){
  const q = S.q.trim().toLowerCase();
  let h = `<div class="dt-nav"><button class="bk" data-act="close">${ico('back')}닫기</button></div>
    <label class="sbox">${ico('search')}<input id="q" type="search" placeholder="${esc(VN.searchPh)}" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search" aria-label="검색">${S.q?`<button class="clr" data-act="q" data-id="" aria-label="지우기">${ico('x','s')}</button>`:''}</label>`;
  if(!q) return h + `<div class="sgrp">${sh('빠른 찾기')}<div class="qchips">${VN.quick.map(x=>`<button class="chip" data-act="q" data-id="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`;
  const m = s => s.toLowerCase().includes(q);
  const acts = ITEMS.filter(x => m(x.title) || (x.en && m(x.en)));
  const places = [].concat(SPOTS.filter(x=>m(x.name)), STAGES.filter(x=>m(x.name)), GATES.filter(x=>m(x.gname)||m(x.gname+' 게이트')), MRTS.filter(x=>m(x.name)||x.codes.some(c=>m(c))), VILLAGES.filter(x=>m(x.name)||m(String(x.label||VN.village.label).toLowerCase())||m('빌리지')));
  const tnm = q.match(/^t?(\d{1,2})(번)?( ?코너)?$/); const turns = tnm && BYID['turn:'+(+tnm[1])] ? [BYID['turn:'+(+tnm[1])]] : [];
  const garage = TBAS.map(b => ({b, a:b.acts.filter(a=>m(a))})).filter(x => x.a.length);
  if(!acts.length && !places.length && !turns.length && !garage.length) return h + `<div class="sgrp"><div class="empty">${sym()}<b>찾는 결과가 없어요</b>영문 이름으로도 검색해 보세요.</div></div>`;
  if(acts.length) h += `<div class="sgrp">${sh('일정', TZA)}<div class="grp">${acts.slice(0,12).map(x=>row(x,t,{showDay:true})).join('')}</div></div>`;
  garage.forEach(({b, a}) => { h += `<div class="sgrp">${sh(esc(b.name))}<div class="grp"><button class="spot" data-act="sel" data-type="stage" data-id="${b.stage}"><span class="ic rd">${ico('music')}</span><span class="tx"><span class="nm">${a.map(esc).join(', ')}</span><p>${esc(b.name)} · ${b.days} · 시작 시각 미정</p></span></button></div></div>`; });
  const icon = {spot:'seat',stage:'music',gate:'gate',mrt:TR.icon||'train',village:'village'};
  const lab = {spot:'그랜드스탠드',stage:'무대',gate:'게이트',mrt:TR.layer,village:VN.village.label,turn:'코너'};
  if(places.length||turns.length) h += `<div class="sgrp">${sh('장소')}<div class="grp">${places.concat(turns).map(o=>`<button class="spot" data-act="sel" data-type="${o.type}" data-id="${o.id}">${o.type==='spot'?miniTrack({arcs:o.cov, dot:o}):o.type==='turn'?miniTrack({turn:o.n}):`<span class="ic ${o.type==='stage'?'rd':''}">${ico(icon[o.type])}</span>`}<span class="tx"><span class="nm">${esc(o.type==='gate'?o.gname:o.name)}${o.type==='gate'?' 게이트':''}${o.zone?' '+zb(o.zone):''}</span><p>${o.type==='spot'&&o.kind?o.kind:lab[o.type]}</p></span><span class="rt">${S.me?`<b>${walk(S.me,o).m}분</b>도보`:''}</span></button>`).join('')}</div></div>`;
  return h;
}
body.addEventListener('input', e => { if(e.target.id==='q'){ S.q = e.target.value; renderSheet(); } });

/* ════════ ACTIONS ════════ */
function toggleSave(id){
  if(S.saved.has(id)) S.saved.delete(id); else S.saved.add(id);
  store.set('saved', [...S.saved]);
  const it = IT[id];
  if(S.saved.has(id)){
    const clash = ITEMS.find(x => x.id!==id && S.saved.has(x.id) && x.s < it.e && x.e > it.s);
    toast(clash?'warn':'bell', `<span class="lbl">My plan</span><b>${esc(it.title)} · 담았어요</b><span>${clash?`담아 둔 일정과 겹쳐요 · ${esc(clash.title)} ${hm(clash.s)} ${TZA}`:`${dLabel(it.day)} ${hm(it.s)} ${TZA} · 30분 전에 알려드려요`}</span>`, `<button class="btn sm ghost" data-act="goplan" data-id="${it.day}">보기</button>`);
  }
  phaseInit();
  renderSheet();
}
function goTab(id){ S.detail=null; S.stack=[]; S.tab=id; if(S.sel){ S.sel=null; buildPins(); drawSelection(); } if(S.sheet==='peek') setSheet('half'); renderSheet(true); }
function onAct(e){
  const b = e.target.closest('[data-act]'); if(!b) return;
  const a = b.dataset.act, id = b.dataset.id;
  e.stopPropagation();
  switch(a){
    case 'sel': select(b.dataset.type, id, {}); break;
    case 'item': S.sel=null; buildPins(); drawSelection(); openDetail({type:'item', id}); break;
    case 'save': toggleSave(id); break;
    case 'tab': closeModal(); goTab(id); break;
    case 'goplan': S.planDay=+id; hideToast(); goTab('plan'); break;
    case 'back': back(); break;
    case 'close': S.detail=null; S.stack=[]; S.sel=null; buildPins(); drawSelection(); renderSheet(true); break;
    case 'intent': S.intent=id; renderSheet(true); break;
    case 'sday': S.schedDay=+id; renderSheet(true); break;
    case 'pday': S.planDay=+id; renderSheet(true); break;
    case 'seat': S.seat=id; store.set('seat', id); buildPins(); renderSheet(); renderTop(); toast('check', `<span class="lbl">My seat</span><b>${esc(BYID['spot:'+id].name)} · 내 자리로 지정했어요</b><span>출발 시각과 이동 시간을 이 자리 기준으로 계산해요</span>`); break;
    case 'unseat': S.seat=null; store.set('seat', null); buildPins(); renderSheet(); renderTop(); break;
    case 'place': hideToast(); closeModal(); startPlacing(); break;
    case 'route': if(S.sel){ const o = BYID[S.sel.type+':'+S.sel.id]; fitPoints([S.me, o]); } break;
    case 'ticket': openTicket(); break;
    case 'demo': openDemo(); break;
    case 'saveF1': { const f1 = ITEMS.filter(x=>x.kind==='track'&&x.series==='f1'); f1.forEach(x=>S.saved.add(x.id)); store.set('saved',[...S.saved]); phaseInit(); renderSheet(true); toast('bell', `<span class="lbl">My plan</span><b>F1 세션 ${f1.length}개를 담았어요</b><span>시작 30분 전에 알려드려요</span>`); break; }
    case 'q': S.q=id; renderSheet(); if(!id){ const i=$('#q'); i&&i.focus(); } break;
  }
}
function fitPoints(pts){
  const a = visArea(); let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  pts.forEach(p => { x0=Math.min(x0,p.x); y0=Math.min(y0,p.y); x1=Math.max(x1,p.x); y1=Math.max(y1,p.y); });
  const pad = 70, k = clamp(Math.min((a.x1-a.x0-pad*2)/Math.max(60,x1-x0), (a.y1-a.y0-pad*2)/Math.max(60,y1-y0)), V.kMin, V.kMax);
  go({k, tx:(a.x0+a.x1)/2 - (x0+x1)/2*k, ty:(a.y0+a.y1)/2 - (y0+y1)/2*k}, true);
}
body.addEventListener('click', onAct);
$('#toast').addEventListener('click', onAct);
body.addEventListener('keydown', e => { if((e.key==='Enter'||e.key===' ') && e.target.matches('[role="button"][data-act]')){ e.preventDefault(); e.target.click(); } });

/* ════════ TOAST ════════ */
let toastT = 0;
function toast(icon, html, action, ms){
  const el = $('#toast');
  el.innerHTML = `<div class="tst glass"><span class="ti ${icon==='clock'?'sg':''}">${ico(icon,'s')}</span><div class="tx">${html}</div>${action||''}<button class="x" data-x aria-label="알림 닫기">${ico('x','s')}</button></div>`;
  el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(hideToast, ms||5200);
  el.querySelector('[data-x]').onclick = hideToast;
}
function hideToast(){ $('#toast').classList.remove('on'); }

/* ════════ MODALS ════════ */
const modal = $('#modal'), dlg = $('#dlg');
let lastFocus = null;
function openModal(html){ closeLayers(); lastFocus = document.activeElement; dlg.innerHTML = `<div class="gp"><span></span></div>`+html; modal.classList.add('on'); modal.setAttribute('aria-hidden','false'); dlg.setAttribute('tabindex','-1'); dlg.scrollTop = 0; setTimeout(()=>{ (dlg.querySelector('[autofocus]') || dlg).focus({preventScroll:true}); }, 30); }
function closeModal(){ if(!modal.classList.contains('on')) return; modal.classList.remove('on'); modal.setAttribute('aria-hidden','true'); if(lastFocus && lastFocus.focus) lastFocus.focus(); }
modal.addEventListener('click', e => { if(e.target.matches('[data-close]')) { if(!S.ticket) pickTicket('none'); closeModal(); } });
onG(document, 'keydown', e => {
  if(e.key!=='Escape' || !HOST.active()) return;
  e.stopImmediatePropagation();
  const sp = $('#splash'); if(sp && !sp.hidden) return;
  if($('#layerpop').classList.contains('on')) closeLayers();
  else if(modal.classList.contains('on')){ if(!S.ticket) pickTicket('none'); closeModal(); }
  else if(S.placing) endPlacing();
  else if(S.detail){ S.detail=null; S.stack=[]; S.sel=null; buildPins(); drawSelection(); renderSheet(true); }
  else HOST.exit();
}, true);

function openTicket(first){
  const cur = S.ticket;
  openModal(`${first?`<div class="head">${sym()}<span class="lbl">Live circuit map</span></div>`:''}<h3>${first?'어떤 티켓으로 가세요?':'내 티켓'}</h3><p class="sub">${esc(VN.ticketSub)}</p>
    <div class="grp opts" role="radiogroup" aria-label="티켓">${TICKETS.map(x=>`<button class="opt" role="radio" aria-checked="${cur===x.id}" data-tk="${x.id}"><span class="tx"><b>${esc(x.name)}${x.zl?` <span class="zb">${x.zl==='ALL'?'ALL ZONES':x.badge||(x.zones&&ZONES&&ZONES[x.zones[0]]?ZONES[x.zones[0]].badge:x.zl.replace('Z','ZONE '))}</span>`:''}</b><span>${esc(x.sub)}</span></span><span class="rd"></span></button>`).join('')}</div>
    ${VN.ticketNote?`<p class="note">${esc(VN.ticketNote)}</p>`:''}`);
  $$('[data-tk]', dlg).forEach(b => b.onclick = () => { $$('[data-tk]', dlg).forEach(x=>x.setAttribute('aria-checked', String(x===b))); setTimeout(()=>{ pickTicket(b.dataset.tk); closeModal(); }, 160); });
}
function pickTicket(id){
  const was = S.ticket; S.ticket = id; store.set('ticket', id);
  const t = tk(); S.seat = t ? t.seat : null; store.set('seat', S.seat);
  renderTop(); buildPins(); renderSheet(true);
  HOST.onTicket(t ? {id:t.id, name:t.name, zl:t.zl} : null);
  if(was !== id && t) toast('ticket', `<span class="lbl">Ticket</span><b>${esc(t.name)}</b><span>${t.zones?'자물쇠가 붙은 곳은 이 티켓으로 들어갈 수 없어요':t.toast||'모든 장소를 제한 없이 보여줘요'}</span>`);
}
$('#b-ticket').onclick = () => openTicket();
$('#b-ticket-d').onclick = () => openTicket();

const PRESETS = VN.presets;
function openDemo(){
  const t = now(); const d = clamp(dayOf(t),0,ND-1);
  const mins = Math.round(((t - DAY0 - d*864e5)/M));
  openModal(`<h3>데모 시계</h3><p class="sub">레이싱 위켄드의 원하는 순간으로 이동해 지도와 일정이 어떻게 바뀌는지 볼 수 있어요.</p>
    <div class="big-t"><span class="tz" id="dm-t">${hm(t)}<small>${TZA}</small></span><span class="d" id="dm-d">${dLabel(d)}</span></div>
    <div class="seg" style="margin-top:16px" role="tablist" aria-label="날짜">${DAYS.map((x,i)=>`<button role="tab" aria-selected="${i===d}" data-dd="${i}"><span class="dt">${x.d}</span>${x.w}</button>`).join('')}</div>
    <input class="rng" id="dm-r" type="range" min="${VN.demoRange[0]}" max="${VN.demoRange[1]}" step="5" value="${clamp(mins,VN.demoRange[0],VN.demoRange[1])}" aria-label="시각 (${TZA})">
    <div class="rng-l">${[0,1,2,3].map(i=>{ const m=VN.demoRange[0]+Math.round((VN.demoRange[1]+1-VN.demoRange[0])*i/3); return `<span>${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}</span>`; }).join('')}</div>
    <div class="sh"><h2>바로 가기</h2></div>
    <div class="pre">${PRESETS.map((p,i)=>`<button data-pre="${i}"><b>${DAYS[p.d].w} ${p.t} <span style="font-size:10px;color:var(--text3);letter-spacing:.06em">${TZA}</span></b>${esc(p.l)}</button>`).join('')}</div>
    <div class="sh"><h2>시계 속도</h2></div>
    <div class="seg" role="tablist" aria-label="시계 속도">${[[0,'정지'],[1,'실제 속도'],[60,'60배']].map(([v,l])=>`<button role="tab" aria-selected="${CK.demo && CK.speed===v}" data-sp="${v}">${l}</button>`).join('')}</div>
    <div class="acts"><button class="btn flex" data-real>실제 시각으로</button><button class="btn pri flex" data-close-dlg>완료</button></div>`);
  let dd = d;
  const apply = () => { const v = +$('#dm-r',dlg).value; const ms = DAY0 + dd*864e5 + v*M; setClock(ms, CK.demo ? CK.speed : 1, true); $('#dm-t',dlg).innerHTML = `${hm(ms)}<small>${TZA}</small>`; $('#dm-d',dlg).textContent = dLabel(dd); };
  $('#dm-r',dlg).oninput = apply;
  $$('[data-dd]',dlg).forEach(b => b.onclick = () => { dd=+b.dataset.dd; $$('[data-dd]',dlg).forEach(x=>x.setAttribute('aria-selected', String(x===b))); apply(); });
  $$('[data-pre]',dlg).forEach(b => b.onclick = () => { const p = PRESETS[+b.dataset.pre]; setClock(tm(p.d,p.t), CK.demo && CK.speed ? CK.speed : 1, true); S.schedDay=null; S.planDay=null; closeModal(); renderSheet(true); });
  $$('[data-sp]',dlg).forEach(b => b.onclick = () => { setClock(now(), +b.dataset.sp, true); $$('[data-sp]',dlg).forEach(x=>x.setAttribute('aria-selected', String(x===b))); });
  $('[data-real]',dlg).onclick = () => { S.schedDay=null; S.planDay=null; closeModal(); HOST.setReal(); };
  $('[data-close-dlg]',dlg).onclick = closeModal;
}
$('#clock').onclick = openDemo;
$('#clock-d').onclick = openDemo;
const openHero = () => { const hs = heroState(now()); if(hs.it){ S.sel=null; buildPins(); drawSelection(); openDetail({type:'item', id:hs.it.id}); if(!mqDesk.matches && S.sheet!=='full') setSheet('half'); } else openDemo(); };
$('#cap').onclick = openHero;
$('#hchip-d').onclick = openHero;

function openInfo(){
  const th = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  openModal(`<div class="head">${sym()}</div><h3>${esc(VN.info.title)}</h3><p class="sub">${esc(VN.info.sub)}</p>
    <div class="sh"><h2>화면 테마</h2></div>
    <div class="seg" role="tablist" aria-label="화면 테마">${[['dark','다크'],['light','라이트']].map(([v,l])=>`<button role="tab" aria-selected="${th===v}" data-th="${v}">${l}</button>`).join('')}</div>
    <div class="sh"><h2>데이터와 정확도</h2></div>
    <ul class="src grp">
      ${VN.info.src.map(([k,v])=>`<li><b>${k}</b>${v}</li>`).join('\n      ')}
    </ul>
    <div class="acts"><button class="btn flex" data-act2="place">${ico('locate')}내 위치 다시 지정</button><button class="btn flex" data-act2="reset">처음 상태로</button></div>
    <div class="acts" style="margin-top:8px"><button class="btn pri flex" data-close-dlg>닫기</button></div>`);
  $$('[data-th]',dlg).forEach(b => b.onclick = () => { const v=b.dataset.th; HOST.setTheme(v); $$('[data-th]',dlg).forEach(x=>x.setAttribute('aria-selected', String(x===b))); });
  $('[data-act2="place"]',dlg).onclick = () => { closeModal(); startPlacing(); };
  $('[data-act2="reset"]',dlg).onclick = () => { ['ticket','seat','me','saved','layers','clock'].forEach(k=>store.del(k)); S.ticket=null; S.seat=null; S.me=null; S.saved=new Set(); S.detail=null; S.stack=[]; S.sel=null; S.tab='now'; HOST.onTicket(null); closeModal(); buildPins(); drawSelection(); renderTop(); renderSheet(true); setTimeout(()=>openTicket(true), 200); };
  $('[data-close-dlg]',dlg).onclick = closeModal;
}
$('#b-info').onclick = openInfo;
$('#b-info-d').onclick = openInfo;


/* ════════ TOP, LAYERS, STATUS ════════ */
function renderTop(){
  const t = tk();
  const z0 = !t ? '' : !t.zones ? '' : t.zl==='ALL' ? 'ALL' : t.zl, z = z0.length <= 4 ? z0 : '';   // the button badge only fits a short code
  $('#b-ticket').innerHTML = `${ico('ticket')}${z?`<span class="zt">${z}</span>`:''}`;
  $('#b-ticket').setAttribute('aria-label', '내 티켓: ' + (t ? t.name : '선택 안 함'));
  $('#b-ticket-d').innerHTML = ico('ticket','s');
  $('#b-ticket-d').setAttribute('aria-label', '내 티켓: ' + (t ? t.name : '선택 안 함'));
}
const LAYERS = [['spot','관람석','seat'],['stage','무대','music'],['village',VN.village.label,'village'],['mrt',TR.layer,TR.icon||'train'],['gate','입장 게이트','gate'],['turn','코너 번호','flag'],['amen','편의시설','wc']].filter(([k]) => k==='spot'||k==='turn'||k==='amen' ? true : k==='stage' ? STAGES.length : k==='village' ? VILLAGES.length : k==='mrt' ? MRTS.length : GATES.length);
const AM_LEGEND = VN.amenLegend;
function renderLayers(){
  $('#layerpop').innerHTML = `<div class="hd lbl">지도에 표시</div>` + LAYERS.map(([k,l,i]) => `<button class="tg-row" role="switch" data-ly="${k}" aria-checked="${!!S.layers[k]}">${ico(i)}${l}<span class="sw"></span></button>`).join('')
    + (S.layers.amen && EVT && EVT.amen ? `<div class="am-lg"><p>거리 단계로 확대하면 지도에 보여요</p>${AM_LEGEND.map(([i,l]) => `<span>${ico(i)}${l}</span>`).join('')}</div>` : '');
}
$('#layerpop').addEventListener('click', e => { const b=e.target.closest('[data-ly]'); if(!b) return; const k=b.dataset.ly; S.layers[k]=S.layers[k]?0:1; store.set('layers', S.layers); b.setAttribute('aria-checked', String(!!S.layers[k])); if(k==='amen'){ renderLayers(); layoutPop(); const nb=$(`#layerpop [data-ly="amen"]`); nb && nb.focus(); } buildPins(); });
function closeLayers(){ $('#layerpop').classList.remove('on'); $('#b-layers').setAttribute('aria-expanded','false'); }
$('#b-layers').onclick = e => { e.stopPropagation(); const on = !$('#layerpop').classList.contains('on'); $('#layerpop').classList.toggle('on', on); $('#b-layers').setAttribute('aria-expanded', String(on)); layoutPop(); requestDraw(); };
onG(document, 'pointerdown', e => { if($('#layerpop').classList.contains('on') && !e.target.closest('#layerpop,#b-layers')) closeLayers(); });

let lastSig = '', lastMin = -1, lastPhase = null, lastHero = '', lastClock = '';
const REMIND = 30;
function phaseOf(it, t){ return t < it.s-REMIND*M ? 0 : t < it.s ? 1 : t < it.e ? 2 : 3; }
function phaseInit(){ const t=now(); lastPhase = {}; ITEMS.forEach(it => lastPhase[it.id] = phaseOf(it,t)); }
function tick(force){
  const t = now();
  const ck = `<span class="lamp"></span>${CK.demo&&!CK.speed?ico('pause','s'):''}<span class="t">${hm(t)}</span><span class="z">${TZA}</span>${CK.demo?'<span class="demo">DEMO</span>':''}`;
  if(ck !== lastClock || force){ lastClock = ck; ['#clock','#clock-d'].forEach(s => { $(s).innerHTML = ck; $(s).setAttribute('aria-label', `${VN.tz.name} ${hm(t)}, 한국 시간 ${kst(t)}${CK.demo?', 데모 시계 열기':''}`); }); }
  const hs = heroState(t);
  const hk = hs.state+hs.text+hs.on;
  if(hk !== lastHero || force){
    lastHero = hk;
    const cls = hs.state==='soon'?'soon':hs.state==='live'?'live':'';
    const cap = $('#cap');
    cap.className = 'cap glass ' + cls;
    cap.innerHTML = `<span class="r1"><b>${esc(VN.title)}</b></span><span class="r2">${lightRow(hs.on, hs.mode, '')}<span>${esc(hs.text)}</span></span>`;
    cap.setAttribute('aria-label', VN.title + ', ' + hs.text);
    const c = $('#hchip-d');
    c.className = 'lchip ' + cls;
    c.innerHTML = `${lightRow(hs.on, hs.mode, '')}<span>${esc(hs.text)}</span>`;
    c.setAttribute('aria-label', hs.text + (hs.it ? ', 세션 상세 보기' : ''));
  }
  { const cp = $('#cap'), ex = $('#b-exit'); if(cp.offsetHeight) ex.style.height = cp.offsetHeight+'px'; }
  const lt = liveTrack(t);
  $('#t-live').style.display = lt && !isQuiet(lt) ? '' : 'none';
  const sig = ITEMS.filter(x => { const s=st(x,t); return s==='live' || (x.kind==='act' && x.s>t && x.s-t<=30*M); }).map(x=>x.id+st(x,t)).join(',');
  if(sig !== lastSig || force){ lastSig = sig; buildPins(); }
  const mm = Math.floor(t/M);
  if(mm !== lastMin || force){ lastMin = mm; if(!(S.detail && S.detail.type==='search')) renderSheet(); }
  if(!lastPhase) phaseInit();
  else ITEMS.forEach(it => {
    const p = phaseOf(it,t), was = lastPhase[it.id];
    if(p === was) return;
    lastPhase[it.id] = p;
    const pl = itemPlace(it); const w = S.me && pl ? walk(S.me, pl) : null;
    if(p===1 && S.saved.has(it.id)) toast('bell', `<span class="lbl">${until(it.s,t)} 시작</span><b>${esc(it.title)}</b><span>${hm(it.s)} ${TZA} · ${esc(placeName(it))}${w?' · 도보 약 '+w.m+'분':''}</span>`, it.kind==='act'?`<button class="btn sm ghost" data-act="sel" data-type="stage" data-id="${it.stage}">지도</button>`:`<button class="btn sm ghost" data-act="item" data-id="${it.id}">보기</button>`, 9000);
    else if(p===2 && (S.saved.has(it.id) || (it.kind==='track' && it.series==='f1'))) toast('clock', `<span class="lbl sg">지금 진행 중</span><b>${esc(it.title)}</b><span>${esc(placeName(it))}</span>`, `<button class="btn sm ghost" data-act="item" data-id="${it.id}">보기</button>`, 9000);
  });
}

/* ════════ LAYOUT ════════ */
function layoutPop(){
  const pop = $('#layerpop'); if(!pop.classList.contains('on')) return;
  const wr = wrap.getBoundingClientRect(), g = $('#ctrl .cgrp').getBoundingClientRect();
  if(mqDesk.matches){ pop.style.bottom=''; pop.style.top = (g.top - wr.top)+'px'; }
  else { pop.style.top=''; pop.style.bottom = (wr.bottom - g.bottom)+'px'; }
}
function layout(){
  const r = wrap.getBoundingClientRect(); V.w = r.width; V.h = r.height;
  if(!mqDesk.matches){
    const peekTop = window.innerHeight - sheetY('peek');
    $('#ctrl').style.bottom = (window.innerHeight - peekTop + 14)+'px'; $('#ctrl').style.top='';
    $('#clock').style.bottom = (window.innerHeight - peekTop + 14)+'px';
    $('#scale').style.bottom = (window.innerHeight - peekTop + 60)+'px'; $('#scale').style.left = '16px';
    $('#toast').style.top = ($('#cap').getBoundingClientRect().bottom + 10)+'px';
    const at = $('#cm-attr'); if(at){ at.style.bottom = (window.innerHeight - peekTop + 18)+'px'; at.style.right = '74px'; }
  } else { ['#ctrl','#clock','#scale','#toast','#cm-attr'].forEach(s => { const e=$(s); if(e){ e.style.bottom=''; e.style.top=''; e.style.right=''; } }); }
  layoutPop(); moveThumb();
  requestDraw();
}
let rzT = 0;
onG(window, 'resize', () => { if(!HOST.active()) return; clearTimeout(rzT); rzT = setTimeout(() => { const [cx,cy] = s2w(V.w/2, V.h/2); layout(); V.tx = V.w/2 - cx*V.k; V.ty = V.h/2 - cy*V.k; clampView(); requestDraw(); }, 60); });
mqDesk.addEventListener && onG(mqDesk, 'change', () => { if(!HOST.active()) return; layout(); fit(false); renderSheet(true); });


/* ════════ BOOT ════════ */
sheet.addEventListener('transitionend', e => { if(e.target===sheet) requestDraw(); });
buildBase(); renderLayers(); renderTop();
setSheet('peek');
layout();
if(S.me) $('#b-me').setAttribute('aria-pressed','true');
fit(false);
tick(true); renderSheet(true);
const tickI = setInterval(() => tick(false), 1000); OFF.push(() => clearInterval(tickI));
$('#b-exit').onclick = () => HOST.exit();
$('#b-exit-d').onclick = () => HOST.exit();
let entered = 0;
function enter(){
  $('#b-exit-d .t').textContent = HOST.exitLabel();
  $('#b-exit').setAttribute('aria-label', HOST.exitAria());
  $('#b-exit-d').setAttribute('aria-label', HOST.exitAria());
  layout();
  if(!entered) fit(false); else clampView();
  tick(true); renderSheet(); requestDraw();
  if(!entered && !S.ticket) setTimeout(() => openTicket(true), 300);
  entered++;
}
function destroy(){ OFF.splice(0).forEach(f => { try{ f(); }catch(e){} }); if(anim) cancelAnimationFrame(anim.raf); clearTimeout(placeBase._t); clearTimeout(toastT); clearTimeout(rzT); clearTimeout(draw._st); if(window.__gantry && window.__gantry.S === S) delete window.__gantry; }
const API = {enter, closeOverlays(){ closeLayers(); closeModal(); }, destroy, S, tk, id: VN.id};
window.__gantry = {S, V, setClock, tm, select, fit, openTicket, pickTicket, setSheet, toggleSave, setMe, now, renderSheet, heroState};
return API;
}
