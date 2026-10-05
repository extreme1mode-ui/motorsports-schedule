import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
import pdfplumber, collections, json
pdf=pdfplumber.open(WORK+'circuit-park-map-08.pdf'); pg=pdf.pages[0]
PH=pg.height
OBJ=[]
for k in ('curve','rect','line'):
    for o in pg.objects.get(k,[]):
        pts=o.get('pts') or ([(o['x0'],o['top']),(o['x1'],o['top']),(o['x1'],o['bottom']),(o['x0'],o['bottom'])] if k=='rect' else [])
        fc=o.get('non_stroking_color') if o.get('fill') else None
        sc=o.get('stroking_color') if o.get('stroke') else None
        OBJ.append(dict(k=k,pts=[(float(x),float(y)) for x,y in pts],fc=fc,sc=sc,lw=float(o.get('linewidth') or 0),x0=o['x0'],x1=o['x1'],top=o['top'],bottom=o['bottom'],path=o.get('path')))
CH=pg.chars
