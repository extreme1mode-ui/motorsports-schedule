import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
import numpy as np
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
