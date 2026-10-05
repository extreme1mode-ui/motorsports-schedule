import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
exec(open(TOOLS+'warp.py').read())
import cv2
LON0, LAT0 = 103.8495, 1.2965
KX = math.cos(math.radians(1.29))*111320.0; KY = 110574.0
FLY=((103.86306-LON0)*KX,(LAT0-1.28944)*KY)
ANCH=[((753.89,224.05),(1046.33,191.95)),((828.75,662.06),FLY)]
F=build(extra=ANCH, step=12.0, lam=0.0)
IT=json.load(open(TOOLS+'cpm_items.json'))
M=np.load(HERE+'masks.npz'); k=300/72
def mask_polys(m, close_px=41, min_area_pt=300, eps_pt=1.2):
    m=m.astype(np.uint8)*255
    ker=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(close_px,close_px))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,ker)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    out=[]
    for c in cs:
        a=cv2.contourArea(c)/(k*k)
        if a<min_area_pt: continue
        ap=cv2.approxPolyDP(c,eps_pt*k,True)[:,0,:]/k
        out.append(ap)
    return out
def comp_poly_at(m, pt, eps_pt=0.6):
    m=m.astype(np.uint8)*255
    n,lab=cv2.connectedComponents(m,8)
    x,y=int(pt[0]*k),int(pt[1]*k)
    # nearest labelled pixel
    best=None
    for r in range(0,40,2):
        sub=lab[y-r:y+r+1,x-r:x+r+1]
        v=sub[sub>0]
        if len(v): best=np.bincount(v).argmax(); break
    if best is None: return None
    mm=(lab==best).astype(np.uint8)*255
    mm=cv2.morphologyEx(mm,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea)
    return cv2.approxPolyDP(c,eps_pt*k,True)[:,0,:]/k
