import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
import json, math
HERE=WORK
D=json.load(open(HERE+'gantry-osm-marina-bay.json'))
Z=D['z']; E=D['extent']; NE=(2**Z)*E
LON0, LAT0 = 103.8495, 1.2965
KX = math.cos(math.radians(1.29))*111320.0; KY = 110574.0
def ll(X,Y):
    lon = X/NE*360-180
    n = math.pi*(1-2*Y/NE)
    lat = math.degrees(math.atan(math.sinh(n)))
    return lon,lat
def P(lon,lat): return ((lon-LON0)*KX, (LAT0-lat)*KY)
def G(X,Y): return P(*ll(X,Y))
SEAMX={12919*E}; SEAMY={8133*E}
BX0,BY0,BX1,BY1=D['bbox']
def rings(f):
    out=[]
    for r in f['g']:
        out.append([(r[i],r[i+1]) for i in range(0,len(r),2)])
    return out
def on_cut(a,b):
    # edge lies on a tile seam or bbox edge (artificial edge)
    for X in list(SEAMX)+[BX0,BX1]:
        if abs(a[0]-X)<0.01 and abs(b[0]-X)<0.01: return True
    for Y in list(SEAMY)+[BY0,BY1]:
        if abs(a[1]-Y)<0.01 and abs(b[1]-Y)<0.01: return True
    return False
