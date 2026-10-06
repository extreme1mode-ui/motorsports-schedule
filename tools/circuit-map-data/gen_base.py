import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
exec(open(TOOLS+'load.py').read())
import numpy as np, collections
exec(open(TOOLS+'helpers.py').read())
BM=json.load(open(HERE+'bm.json'))
EV=json.load(open(HERE+'evt.json'))
OLD=json.load(open(REPO+'src/circuit-map/venues/sgp26/base.json'))
L=D['layers']
# ---- road labels: anchors along named roads
PRI={'motorway':5,'trunk':5,'primary':4,'secondary':3,'tertiary':2,'minor':1}
byname=collections.defaultdict(list)
for f in L['transportation_name']:
    p=f['p']; c=p.get('class')
    if c not in PRI: continue
    n=p.get('name:en') or p.get('name')
    if not n: continue
    for r in rings(f):
        pts=[G(*q) for q in r]
        if len(pts)>=2: byname[(n,c)].append(pts)
anchors=[]
for (n,c),parts in byname.items():
    pl=[]
    for pts in parts:
        segs=[(pts[i],pts[i+1]) for i in range(len(pts)-1)]
        L_=sum(math.dist(a,b) for a,b in segs)
        if L_<90: continue
        step=420; s=min(L_/2, 160.0)
        while s<L_:
            acc=0
            for a,b in segs:
                d=math.dist(a,b)
                if acc+d>=s:
                    t=(s-acc)/d; x=a[0]+(b[0]-a[0])*t; y=a[1]+(b[1]-a[1])*t
                    # angle from a 60 m window
                    def at_(ss):
                        ss=max(0,min(L_,ss)); ac=0
                        for A,B in segs:
                            dd=math.dist(A,B)
                            if ac+dd>=ss: tt=(ss-ac)/dd if dd else 0; return (A[0]+(B[0]-A[0])*tt, A[1]+(B[1]-A[1])*tt)
                            ac+=dd
                        return segs[-1][1]
                    p0,p1=at_(s-35),at_(s+35)
                    ang=math.degrees(math.atan2(p1[1]-p0[1],p1[0]-p0[0]))
                    if ang>90: ang-=180
                    if ang<-90: ang+=180
                    pl.append((x,y,ang)); break
                acc+=d
            s+=step
    # thin same-name anchors closer than 260 m
    keep=[]
    for a in pl:
        if all(math.dist(a[:2],b[:2])>=260 for b in keep): keep.append(a)
    for x,y,ang in keep:
        if -700<x<2550 and -900<y<2200: anchors.append([n.upper().replace("SAINT ","ST ").replace("'",'’'), round(x), round(y), round(ang,1), PRI[c]])
print('road labels', len(anchors))
# compact the event layer: simplified path strings
EV2=dict(EV)
EV2['zones']={z:enc([dp([tuple(q) for q in p],1.2,True) for p in ps],True) for z,ps in EV['zones'].items()}
EV2['stands']={k:{'name':v['name'],'d':enc([dp([tuple(q) for q in p],0.4,True) for p in v['polys']],True),'c':v['c'],'ends':v['ends']} for k,v in EV['stands'].items()}
for g_ in EV2['gates']:
    if g_['id']=='g8': g_['xy']=[1214.0,872.0]   # north landing of the Helix (official map is not to scale; the bay is compressed)
for s_ in EV2['stages']:
    if s_['id']=='dbsot': s_['xy']=[725.0,843.0]   # OSM: DBS Foundation Outdoor Theatre
# Zone 1 strip (review): the warp put three items on Republic Blvd/Ave — move them onto the strip between the road and the shore
for g_ in EV2['gates']:
    if g_['id']=='g1': g_['xy']=[1494.0,-48.0]          # east kerb of Republic Blvd, on the zone edge
for s_ in EV2['stages']:
    if s_['id']=='wharf': s_['xy']=[1585.0,-270.0]      # north-east end of the strip, toward the water
for v_ in EV2['villages']:
    if v_['id']=='v1': v_['xy']=[1560.0,-160.0]         # middle of the strip, between Republic Ave and Marina Promenade
EV2['amen']=json.load(open(HERE+'amen_real.json'))
OUT={'track':OLD['track'], 'bm':BM, 'evt':EV2, 'roadlab':anchors,
     'src':{'osm':D['src'],'cpm':'Formula 1 Singapore Airlines Singapore Grand Prix 2026 · Circuit Park Map (as of 10 Sep 2026)'}}
s=json.dumps(OUT,separators=(',',':'))
open(REPO+'src/circuit-map/venues/sgp26/base.json','w').write(s)
print('base.json bytes', len(s))
