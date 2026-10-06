import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
exec(open(TOOLS+'load.py').read())
import numpy as np
import collections
L=D['layers']
SX=12919*E; SY=8133*E; EXT=0.7  # global px (~0.4 m) overlap across tile seams
def tile_of(f): tx,ty=map(int,f['k'].split('/')); return tx,ty
def ext_ring(r,f):
    tx,ty=tile_of(f); out=[]
    for X,Y in r:
        if abs(X-SX)<0.01: X = X+EXT if tx==12918 else X-EXT
        if abs(Y-SY)<0.01: Y = Y+EXT if ty==8132 else Y-EXT
        out.append((X,Y))
    return out
def dp(pts, tol, closed=False):
    if len(pts)<3: return pts
    if closed and pts[0]==pts[-1]: pts=pts[:-1]
    P=np.array(pts,float)
    keep=np.zeros(len(P),bool); keep[0]=keep[-1]=True
    stack=[(0,len(P)-1)]
    while stack:
        a,b=stack.pop()
        if b<=a+1: continue
        A,B=P[a],P[b]; AB=B-A; L2=AB@AB
        seg=P[a+1:b]
        if L2==0: d=np.hypot(*(seg-A).T)
        else:
            t=np.clip(((seg-A)@AB)/L2,0,1); proj=A+t[:,None]*AB; d=np.hypot(*(seg-proj).T)
        i=int(np.argmax(d))
        if d[i]>tol: keep[a+1+i]=True; stack+=[(a,a+1+i),(a+1+i,b)]
    out=[tuple(p) for p in P[keep]]
    if closed and len(out)<3: return []
    return out
def enc(rings, closed, prec=1):
    s=[]
    f=10**prec
    for r in rings:
        if len(r)<2: continue
        R=[(round(x*f),round(y*f)) for x,y in r]
        # drop consecutive dups
        RR=[R[0]]
        for q in R[1:]:
            if q!=RR[-1]: RR.append(q)
        if closed and len(RR)<3: continue
        if len(RR)<2: continue
        def n(v):
            t=('%.1f'%(v/f)) if prec else str(v)
            t=t.rstrip('0').rstrip('.') if '.' in t else t
            if t=='-0': t='0'
            return t
        parts=['M'+n(RR[0][0])+' '+n(RR[0][1])+'l']
        prev=RR[0]; ds=[]
        for q in RR[1:]:
            dx,dy=q[0]-prev[0],q[1]-prev[1]; prev=q
            a,b=n(dx),n(dy)
            ds.append(a+('' if b.startswith('-') else ' ')+b)
        body=''
        for d_ in ds:
            body += d_ if (d_.startswith('-') or body=='') else ' '+d_
        parts.append(body)
        if closed: parts.append('z')
        s.append(''.join(parts))
    return ''.join(s)
def on_cut(a,b):
    for X in (SX,BX0,BX1):
        if abs(a[0]-X)<1.0 and abs(b[0]-X)<1.0: return True
    for Y in (SY,BY0,BY1):
        if abs(a[1]-Y)<1.0 and abs(b[1]-Y)<1.0: return True
    return False
def polys(feats, tol, extend=True):
    out=[]
    for f in feats:
        for r in rings(f):
            rr=ext_ring(r,f) if extend else r
            pts=[G(*q) for q in rr]
            pts=dp(pts,far(tol,pts),True)
            if len(pts)>=3 and area_(pts)>=8: out.append(pts)
    return out
def lines(feats, tol):
    out=[]
    for f in feats:
        for r in rings(f):
            raw=[G(*q) for q in r]
            pts=dp(raw,far(tol,raw,500,3.0),False)
            if len(pts)>=2: out.append(pts)
    return out
TRK=np.array(json.load(open(REPO+'src/circuit-map/venues/sgp26/base.json'))['track']['pts'])[::3]
def dist_trk(pts):
    P=np.array(pts); c=P.mean(0)
    return float(np.min(np.hypot(*(TRK-c).T)))
def far(t, pts, near=450.0, mul=3.0):
    return t if dist_trk(pts)<near else t*mul
def area_(pts):
    P=np.array(pts); x,y=P[:,0],P[:,1]; return abs(0.5*(x@np.roll(y,-1)-y@np.roll(x,-1)))
BM={}
# ---- water
WATER=[f for f in L['water'] if f['p'].get('class') not in ('swimming_pool',) and f['p'].get('brunnel')!='tunnel']
BM['water']=enc(polys(WATER,0.5),True)
# shoreline: non-artificial edges, as polylines
shore=[]
for f in WATER:
    for r in rings(f):
        cur=[]
        for i in range(len(r)):
            a,b=r[i],r[(i+1)%len(r)]
            if on_cut(a,b):
                if len(cur)>=2: shore.append(cur)
                cur=[]
            else:
                if not cur: cur=[G(*a)]
                cur.append(G(*b))
        if len(cur)>=2: shore.append(cur)
BM['shore']=enc([dp(c,0.5) for c in shore],False)
# ---- green
GREEN_LC={'grass','wood','farmland','sand'}
greens=[f for f in L['landcover'] if f['p'].get('class') in ('grass','wood')]
greens+=[f for f in L['landuse'] if f['p'].get('class') in ('pitch','playground','cemetery','park','recreation_ground','garden')]
BM['green']=enc(polys(greens,0.9),True)
# ---- piers & bridge decks (areas)
BM['pier']=enc(polys([f for f in L['transportation'] if f['p'].get('class')=='pier' and f['t']==3],0.3),True)
BM['deck']=enc(polys([f for f in L['transportation'] if f['p'].get('class')=='bridge' and f['t']==3],0.3),True)
# ---- buildings: merge multi-piece ids by dropping seam edges and chaining
byid=collections.defaultdict(list)
for f in L['building']: byid[f['id']].append(f)
def merged_rings(fs):
    if len(fs)==1: return [rings(fs[0])[i] for i in range(len(fs[0]['g']))]
    edges=[]
    for f in fs:
        for r in rings(f):
            for i in range(len(r)):
                a,b=r[i],r[(i+1)%len(r)]
                if abs(a[0]-SX)<0.01 and abs(b[0]-SX)<0.01: continue
                if abs(a[1]-SY)<0.01 and abs(b[1]-SY)<0.01: continue
                if a!=b: edges.append((a,b))
    # chain
    key=lambda p:(round(p[0],1),round(p[1],1))
    starts=collections.defaultdict(list)
    for e in edges: starts[key(e[0])].append(e)
    used=set(); out=[]
    for e in edges:
        if id(e) in used: continue
        ring=[e[0]]; cur=e; ok=True
        while True:
            used.add(id(cur)); ring.append(cur[1])
            if key(cur[1])==key(ring[0]): break
            nxt=[x for x in starts[key(cur[1])] if id(x) not in used]
            if not nxt: ok=False; break
            cur=nxt[0]
        if ok and len(ring)>=4: out.append(ring[:-1])
        else: return None
    return out
tiers={'b0':[], 'b1':[], 'b2':[]}
fails=0
for bid,fs in byid.items():
    h=max(f['p'].get('render_height',0) or 0 for f in fs)
    t='b2' if h>=100 else 'b1' if h>=30 else 'b0'
    rs=merged_rings(fs)
    if rs is None:
        fails+=1; rs=[ext_ring(r,f) for f in fs for r in rings(f)]
    for r in rs:
        raw=[G(*q) for q in r]
        A_=area_(raw); per=sum(math.dist(raw[i],raw[(i+1)%len(raw)]) for i in range(len(raw)))
        if A_<25 or A_/per<1.4: continue   # kiosks, covered linkways (building=roof strips)
        pts=dp(raw,far(0.45,raw,520,3.0),True)
        if len(pts)>=3: tiers[t].append((pts,h))
# drop rings that sit inside a larger building ring (building:part pieces under an outline)
from matplotlib.path import Path as MPath
allr=[(t,i,r[0],r[1]) for t,v in tiers.items() for i,r in enumerate(v)]
info=[]
for t,i,r,hh in allr:
    PP=np.array(r); info.append((PP.min(0),PP.max(0),area_(r),MPath(PP)))
drop=set()
order=sorted(range(len(allr)),key=lambda j:-info[j][2])
for jj,j in enumerate(order):
    if j in drop: continue
    mn,mx,a,path=info[j]
    for k in order[jj+1:]:
        if k in drop: continue
        if allr[k][3]-allr[j][3]>=20 and area_(allr[k][2])>=150: continue   # a real tower on a podium stays (depth); roof bits go
        mn2,mx2,a2,_=info[k]
        if mn2[0]>=mn[0]-0.5 and mn2[1]>=mn[1]-0.5 and mx2[0]<=mx[0]+0.5 and mx2[1]<=mx[1]+0.5:
            P2=np.array(allr[k][2])
            c2=P2.mean(0); P2s=c2+(P2-c2)*0.88
            if path.contains_points(P2s).mean()>0.7: drop.add(k)
nt={k:[] for k in tiers}
for j,(t,i,r,hh) in enumerate(allr):
    if j not in drop: nt[t].append(r)
print('dropped contained parts',len(drop))
tiers=nt
print('bldg merge fails',fails, {k:len(v) for k,v in tiers.items()})
for k,v in tiers.items(): BM[k]=enc(v,True)
# ---- roads
CLS={'motorway':'hw','trunk':'hw','primary':'pri','secondary':'sec','tertiary':'ter','minor':'min','service':'svc','path':'path','pier':'pierl','track':'svc'}
R=collections.defaultdict(list); RB=collections.defaultdict(list)
for f in L['transportation']:
    p=f['p']; c=p.get('class','')
    if f['t']!=2 or c not in CLS: continue
    if p.get('brunnel')=='tunnel' or p.get('indoor') or p.get('subclass') in ('corridor',): continue
    if c=='path' and p.get('subclass')=='steps': k='step'
    else: k=CLS[c]
    if p.get('brunnel')=='bridge' and k in ('hw','pri','sec','ter','min','svc','path','step'): RB[k].append(f)
    else: R[k].append(f)
R['svc']=[f for f in R['svc'] if dist_trk([G(*q) for q in rings(f)[0]])<700]
R['path']=[f for f in R['path'] if dist_trk([G(*q) for q in rings(f)[0]])<900]
BM['roads']={k:enc(lines(v,0.7),False) for k,v in R.items()}
BM['rbridge']={k:enc(lines(v,0.5),False) for k,v in RB.items()}
print({k:len(v) for k,v in R.items()}, {k:len(v) for k,v in RB.items()})
# ---- pit lane (OSM 'Pit Lane')
pit=[f for f in L['transportation'] if f['p'].get('class')=='raceway' and f['id'] in (1004842872,6863358072)]
pl=[G(*q) for q in rings(pit[0])[0]]
BM['pit']=[[round(x,1),round(y,1)] for x,y in dp(pl,0.3)]
# ---- MRT exits
ex=[]
for f in L['poi']:
    if f['p'].get('subclass')=='subway_entrance':
        x,y=G(*rings(f)[0][0]); ex.append([round(x),round(y)])
BM['exits']=ex
json.dump(BM,open(HERE+'bm.json','w'),separators=(',',':'))
sz={k:(len(v) if isinstance(v,str) else len(json.dumps(v))) for k,v in BM.items()}
print(sz, 'total', len(json.dumps(BM,separators=(',',':'))))
