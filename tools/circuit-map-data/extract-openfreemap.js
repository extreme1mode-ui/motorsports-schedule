// OpenFreeMap(OSM) z14 벡터 타일 → gantry-osm-<venue>.json (경기마다 하나)
// 사용: https://openfreemap.org 를 브라우저로 열고 개발자 콘솔에 이 파일 내용을 붙여 넣는다. 끝나면 JSON 파일이 경기 수만큼 내려받아진다.
//   특정 경기만: 붙여 넣기 전에 window.GANTRY_ONLY = ['cota'] 처럼 지정한다.
// 범위는 아래 VENUES의 [서경, 남위, 동경, 북위]. 좌표는 z14 전역 픽셀(정수 + 1/4) 그대로 둔다.
// 라이선스: © OpenStreetMap contributors (ODbL) · 지도에 출처를 표시해야 한다.
const VENUES = [
  ['marina-bay', [103.8440, 1.2770, 103.8720, 1.3045]],     // 싱가포르 (2026-09-27판으로 만든 base.json의 범위)
  ['cota',       [-97.6650, 30.1150, -97.6150, 30.1520]],  // 미국 · Circuit of the Americas
  ['mexicocity', [-99.1080, 19.3920, -99.0750, 19.4150]],  // 멕시코 · Autódromo Hermanos Rodríguez
  ['interlagos', [-46.7170, -23.7160, -46.6840, -23.6820]],// 브라질 · Interlagos
  ['lasvegas',   [-115.1850, 36.1000, -115.1450, 36.1340]],// 라스베이거스 · Strip Circuit
  ['lusail',     [51.4350, 25.4750, 51.4700, 25.5050]],    // 카타르 · Lusail
  ['yasmarina',  [54.5850, 24.4500, 54.6200, 24.4920]],    // 아부다비 · Yas Marina
];
(async () => { for (const [VID, BBOX] of VENUES) { if (window.GANTRY_ONLY && !window.GANTRY_ONLY.includes(VID)) continue; await extract(VID, BBOX); } })();
async function extract(VID, BBOX) {
  function Reader(buf){ this.b=buf; this.p=0; }
  Reader.prototype.varint=function(){ let r=0,s=0,b; do{ b=this.b[this.p++]; r+=(b&0x7f)*Math.pow(2,s); s+=7; }while(b>=0x80); return r; };
  Reader.prototype.svarint=function(){ const v=this.varint(); return (v%2===1)? -(v+1)/2 : v/2; };
  Reader.prototype.bytes=function(){ const l=this.varint(); const s=this.p; this.p+=l; return this.b.subarray(s,s+l); };
  Reader.prototype.skip=function(wt){ if(wt===0) this.varint(); else if(wt===1) this.p+=8; else if(wt===2){ const l=this.varint(); this.p+=l; } else if(wt===5) this.p+=4; else throw new Error('wt '+wt); };
  const td=new TextDecoder();
  const readValue=buf=>{ const r=new Reader(buf); let v=null; while(r.p<buf.length){ const k=r.varint(), f=k>>3, wt=k&7;
    if(f===1) v=td.decode(r.bytes()); else if(f===2){ v=new DataView(buf.buffer,buf.byteOffset+r.p,4).getFloat32(0,true); r.p+=4; }
    else if(f===3){ v=new DataView(buf.buffer,buf.byteOffset+r.p,8).getFloat64(0,true); r.p+=8; }
    else if(f===4||f===5) v=r.varint(); else if(f===6) v=r.svarint(); else if(f===7) v=!!r.varint(); else r.skip(wt); } return v; };
  const packed=buf=>{ const r=new Reader(buf), out=[]; while(r.p<buf.length) out.push(r.varint()); return out; };
  const geom=cmds=>{ const rings=[]; let x=0,y=0,i=0,cur=null; while(i<cmds.length){ const c=cmds[i++], id=c&7, n=c>>3;
    if(id===1||id===2){ for(let k=0;k<n;k++){ const dx=cmds[i++], dy=cmds[i++]; x+=(dx%2? -(dx+1)/2: dx/2); y+=(dy%2? -(dy+1)/2: dy/2); if(id===1){ cur=[]; rings.push(cur);} cur.push([x,y]); } } }
    return rings; };
  const decode=ab=>{ const buf=new Uint8Array(ab), r=new Reader(buf), layers={};
    while(r.p<buf.length){ const k=r.varint(), f=k>>3, wt=k&7; if(f!==3){ r.skip(wt); continue; }
      const lb=r.bytes(), lr=new Reader(lb); let name='', extent=4096; const keys=[], vals=[], feats=[];
      while(lr.p<lb.length){ const kk=lr.varint(), ff=kk>>3, ww=kk&7;
        if(ff===1) name=td.decode(lr.bytes()); else if(ff===2) feats.push(lr.bytes()); else if(ff===3) keys.push(td.decode(lr.bytes())); else if(ff===4) vals.push(readValue(lr.bytes())); else if(ff===5) extent=lr.varint(); else lr.skip(ww); }
      layers[name]={extent, features:feats.map(fb=>{ const fr=new Reader(fb); let id=null,type=0,tags=[],g=[]; while(fr.p<fb.length){ const kk=fr.varint(), ff=kk>>3, ww=kk&7;
          if(ff===1) id=fr.varint(); else if(ff===2) tags=packed(fr.bytes()); else if(ff===3) type=fr.varint(); else if(ff===4) g=packed(fr.bytes()); else fr.skip(ww); }
        const props={}; for(let t=0;t<tags.length;t+=2) props[keys[tags[t]]]=vals[tags[t+1]]; return {id,type,props,rings:geom(g)}; })}; }
    return layers; };
  const tj=await (await fetch('https://tiles.openfreemap.org/planet')).json();
  const url=tj.tiles[0], Z=14, E=4096, N=2**Z;
  const gx=lon=>(lon+180)/360*N*E, gy=lat=>{ const r=lat*Math.PI/180; return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*N*E; };
  const BX0=Math.floor(gx(BBOX[0])), BX1=Math.ceil(gx(BBOX[2])), BY0=Math.floor(gy(BBOX[3])), BY1=Math.ceil(gy(BBOX[1]));
  const clipPoly=(ring,x0,y0,x1,y1)=>{ let pts=ring;
    const E2=[[p=>p[0]>=x0,(a,b)=>{const t=(x0-a[0])/(b[0]-a[0]);return [x0,a[1]+t*(b[1]-a[1])];}],[p=>p[0]<=x1,(a,b)=>{const t=(x1-a[0])/(b[0]-a[0]);return [x1,a[1]+t*(b[1]-a[1])];}],
              [p=>p[1]>=y0,(a,b)=>{const t=(y0-a[1])/(b[1]-a[1]);return [a[0]+t*(b[0]-a[0]),y0];}],[p=>p[1]<=y1,(a,b)=>{const t=(y1-a[1])/(b[1]-a[1]);return [a[0]+t*(b[0]-a[0]),y1];}]];
    for(const [ins,isect] of E2){ const out=[]; if(!pts.length) break; for(let i=0;i<pts.length;i++){ const cur=pts[i], prev=pts[(i+pts.length-1)%pts.length];
      if(ins(cur)){ if(!ins(prev)) out.push(isect(prev,cur)); out.push(cur);} else if(ins(prev)) out.push(isect(prev,cur)); } pts=out; } return pts; };
  const clipLine=(line,x0,y0,x1,y1)=>{ const parts=[]; let cur=null;
    const seg=(a,b)=>{ let t0=0,t1=1; const dx=b[0]-a[0], dy=b[1]-a[1]; const ps=[-dx,dx,-dy,dy], qs=[a[0]-x0,x1-a[0],a[1]-y0,y1-a[1]];
      for(let i=0;i<4;i++){ if(ps[i]===0){ if(qs[i]<0) return null; } else { const t=qs[i]/ps[i]; if(ps[i]<0){ if(t>t1) return null; if(t>t0) t0=t; } else { if(t<t0) return null; if(t<t1) t1=t; } } }
      return [[a[0]+t0*dx,a[1]+t0*dy],[a[0]+t1*dx,a[1]+t1*dy],t0>0,t1<1]; };
    for(let i=1;i<line.length;i++){ const s=seg(line[i-1],line[i]); if(!s){ cur=null; continue; } if(!cur||s[2]){ cur=[s[0]]; parts.push(cur); } cur.push(s[1]); if(s[3]) cur=null; }
    return parts.filter(p=>p.length>1); };
  const KEEP={water:['class','intermittent','brunnel'],waterway:['class','name','name:en','brunnel'],landcover:['class','subclass'],landuse:['class'],park:['class','name','name:en'],
    building:['render_height','render_min_height','hide_3d','colour'],transportation:['class','subclass','brunnel','ramp','oneway','service','layer','level','indoor','network','surface','access'],
    transportation_name:['name','name:en','ref','class','subclass','brunnel','layer','level','network'],poi:['name','name:en','class','subclass','rank','level','layer','indoor'],
    water_name:['name','name:en','class'],place:['name','name:en','class','rank']};
  const out={bbox:[BX0,BY0,BX1,BY1],z:Z,extent:E,src:'OpenFreeMap planet '+url.split('/')[4]+' (OpenStreetMap contributors, ODbL)',layers:{}};
  const txs=[Math.floor(BX0/E),Math.floor(BX1/E)], tys=[Math.floor(BY0/E),Math.floor(BY1/E)];
  for(let tx=txs[0];tx<=txs[1];tx++) for(let ty=tys[0];ty<=tys[1];ty++){
    const t=decode(await (await fetch(url.replace('{z}',Z).replace('{x}',tx).replace('{y}',ty))).arrayBuffer());
    const ox=tx*E, oy=ty*E, cx0=Math.max(ox,BX0), cy0=Math.max(oy,BY0), cx1=Math.min(ox+E,BX1), cy1=Math.min(oy+E,BY1);
    for(const [ln,l] of Object.entries(t)){ if(!KEEP[ln]) continue; const arr=out.layers[ln]||(out.layers[ln]=[]);
      for(const f of l.features){ const props={}; KEEP[ln].forEach(k=>{ if(f.props[k]!==undefined) props[k]=f.props[k]; });
        const G=f.rings.map(r=>r.map(p=>[p[0]+ox,p[1]+oy])); let g=[];
        if(f.type===1) g=G.flat().filter(p=>p[0]>=cx0&&p[0]<=cx1&&p[1]>=cy0&&p[1]<=cy1).map(p=>[p]);
        else if(f.type===2) G.forEach(line=>clipLine(line,cx0,cy0,cx1,cy1).forEach(pp=>g.push(pp)));
        else if(f.type===3) G.forEach(r=>{ const c=clipPoly(r,cx0,cy0,cx1,cy1); if(c.length>=3) g.push(c); });
        if(!g.length) continue;
        arr.push({id:f.id,t:f.type,k:tx+'/'+ty,p:props,g:g.map(r=>r.map(p=>[Math.round(p[0]*4)/4,Math.round(p[1]*4)/4]).flat())}); } } }
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(out)],{type:'application/json'})); a.download='gantry-osm-'+VID+'.json'; a.click();
  await new Promise(r=>setTimeout(r,1500));
}
