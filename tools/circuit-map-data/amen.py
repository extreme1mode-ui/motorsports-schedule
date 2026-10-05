import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
exec(open(TOOLS+'pdfobj.py').read())
import math, json
CAT={
 'wc':   [('(0.004, 0.008, 0.012)',(8,13),(8,13))],
 'wca':  [('(0.176, 0.373, 1.0)',(17,21),(9,13))],
 'fnb':  [('(1.0, 0.0, 0.745)',(8,13),(8,13))],
 'bar':  [('(1.0, 0.498, 0.0)',(8,13),(8,13))],
 'water':[('(0.0, 1.0, 1.0)',(8,13),(8,13))],
 'aid':  [('(0.0, 0.314, 0.078)',(8,13),(8,13))],
 'info': [('(0.0, 0.58, 0.851)',(8,13),(8,13))],
 'merch':[('(1.0, 0.949, 0.0)',(8,13),(8,13))],
 'tix':  [('(0.982, 0.658, 0.1)',(10,14),(10,14))],
 'walk': [('(0.255, 0.251, 0.259)',(8,13),(8,13))],
 'screen':[('(0.929, 0.11, 0.141)',(13,16),(8,11))],
}
def legend(x,y): return (x<470 and y>685) or y<60 or (x>870 and y<110)
out={}
for cat,specs in CAT.items():
    pts=[]
    for col,(w0,w1),(h0,h1) in specs:
        for o in OBJ:
            if o['k']!='curve' or str(o['fc'])!=col: continue
            w=o['x1']-o['x0']; h=o['bottom']-o['top']
            if w0<=w<=w1 and h0<=h<=h1:
                c=((o['x0']+o['x1'])/2,(o['top']+o['bottom'])/2)
                if legend(*c): continue
                if all(math.dist(c,q)>4 for q in pts): pts.append(c)
    out[cat]=pts
for k,v in out.items(): print(k,len(v))
json.dump(out,open(WORK+'amen_pdf.json','w'))
