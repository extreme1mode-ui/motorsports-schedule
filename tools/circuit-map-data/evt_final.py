import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
exec(open(TOOLS+'evt.py').read())
SEL={'z1':[85,22,34],'z2':[16,14,20],'z3':[29,16],'z4':[57,41,58,43,37,19]}
def zone_polys(z):
    m=M[z].astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(41,41)))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    out=[]
    for i in SEL[z]:
        c=cs[i]; ap=cv2.approxPolyDP(c,1.0*k,True)[:,0,:]/k
        # densify long edges so the warp bends them
        dens=[]
        for j in range(len(ap)):
            a,b=ap[j],ap[(j+1)%len(ap)]; n=max(1,int(np.hypot(*(b-a))/4))
            for t in range(n): dens.append(a+(b-a)*t/n)
        out.append(F(np.array(dens)))
    return out
def area(p): x,y=p[:,0],p[:,1]; return 0.5*(x@np.roll(y,-1)-y@np.roll(x,-1))
def centroid(p):
    x,y=p[:,0],p[:,1]; xs=np.roll(x,-1); ys=np.roll(y,-1); cr=x*ys-xs*y; A=cr.sum()/2
    return np.array([((x+xs)*cr).sum()/(6*A), ((y+ys)*cr).sum()/(6*A)])
EV={'zones':{}, 'zlab':{}}
for z in SEL:
    ps=zone_polys(z); EV['zones'][z]=[p.round(1).tolist() for p in ps]
    big=max(ps,key=lambda p:abs(area(p))); EV['zlab'][z]=centroid(big).round(1).tolist()
# stands
ST={}
for s in IT['stands']:
    polys=[comp_poly_at(M['red'],s['c'],0.5)]+[comp_poly_at(M['red'],q,0.5) for q in s.get('also',[])]
    polys=[F(p) for p in polys if p is not None]
    allp=np.vstack(polys); c=allp.mean(0)
    # principal axis ends
    u,sv,vt=np.linalg.svd(allp-c); ax=vt[0]; pr=(allp-c)@ax
    ends=[(c+ax*pr.min()).round(1).tolist(),(c+ax*pr.max()).round(1).tolist()]
    ST[s['id']]={'name':s['name'],'polys':[p.round(1).tolist() for p in polys],'c':c.round(1).tolist(),'ends':ends}
EV['stands']=ST
# point features
for key in ('gates','stages','villages','platforms'):
    EV[key]=[dict(g,xy=F([g['pt']])[0].round(1).tolist()) for g in IT[key]]
EV['underpass']=[dict(u,xy=F([u['pt']])[0].round(1).tolist()) for u in IT['underpass']]
# overpasses as arc positions on the real track
def pdf2real_s(sp):
    # invert real2pdf by bisection on monotone mapping
    lo,hi=0.0,RL
    target=sp
    # unwrap: find s with real2pdf(s)%PC[-1] closest
    best=None
    for s in np.arange(0,RL,2.0):
        d=abs(((real2pdf(s)-target+PC[-1]/2)%PC[-1])-PC[-1]/2)
        if best is None or d<best[0]: best=(d,s)
    return best[1]
EV['overpass']=[]
for p in IT['overpass']:
    sp,off=project(PT,PC,np.array(p)); EV['overpass'].append(round(pdf2real_s(sp),1))
EV['trackmarks']={}
for kk,p in IT['track'].items():
    sp,off=project(PT,PC,np.array(p)); EV['trackmarks'][kk]=round(pdf2real_s(sp),1)
json.dump(EV,open(HERE+'evt.json','w'))
for s,v in ST.items(): print(s, v['c'], len(v['polys']))
print('gates',[(g['id'],g['xy']) for g in EV['gates']])
print('stages',[(g['id'],g['xy']) for g in EV['stages']])
print('vill',[(g['id'],g['xy']) for g in EV['villages']], 'plat',[(g['id'],g['xy']) for g in EV['platforms']])
print('overpass s',EV['overpass'],'marks',EV['trackmarks'], 'RL',RL)
print('zlab',EV['zlab'])
