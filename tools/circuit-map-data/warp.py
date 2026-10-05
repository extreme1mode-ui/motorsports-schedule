import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
import json, math, numpy as np
HERE=WORK
path=json.load(open(HERE+'cpm_track_path.json'))
def flatten(path, n=12):
    pts=[]; cur=None; start=None
    for op in path:
        t=op[0]; a=op[1:]
        if t=='m': cur=a[0]; start=cur; pts.append(cur)
        elif t=='l': cur=a[0]; pts.append(cur)
        elif t in ('c','v','y'):
            if t=='c': c1,c2,p=a
            elif t=='v': c1=cur; c2,p=a
            else: c1,p=a; c2=p
            for i in range(1,n+1):
                u=i/n; v=1-u
                x=v**3*cur[0]+3*v*v*u*c1[0]+3*v*u*u*c2[0]+u**3*p[0]
                y=v**3*cur[1]+3*v*v*u*c1[1]+3*v*u*u*c2[1]+u**3*p[1]
                pts.append((x,y))
            cur=p
        elif t=='h': pts.append(start)
    return pts
PT=np.array(flatten(path))
def cumlen(P):
    d=np.hypot(*np.diff(P,axis=0).T); return np.concatenate([[0],np.cumsum(d)])
def project(P, C, q):
    best=(1e18,0)
    for i in range(1,len(P)):
        a,b=P[i-1],P[i]; ab=b-a; L2=ab@ab
        t=0 if L2==0 else max(0,min(1,((q-a)@ab)/L2)); pp=a+t*ab; d=np.hypot(*(q-pp))
        if d<best[0]: best=(d,C[i-1]+t*np.sqrt(L2))
    return best[1],best[0]
def at(P,C,s):
    s=s%C[-1]; i=np.searchsorted(C,s); i=max(1,min(len(C)-1,i)); a,b=P[i-1],P[i]; t=(s-C[i-1])/max(1e-9,C[i]-C[i-1]); return a+t*(b-a)
words=json.load(open(HERE+'cpm_words.json'))
import re
PC=cumlen(PT)
TL={int(w[0][1:]):np.array([(w[1]+w[3])/2,(w[2]+w[4])/2]) for w in words if re.fullmatch(r'T\d{1,2}',w[0])}
spdf={k:project(PT,PC,q)[0] for k,q in TL.items()}
B=json.load(open(REPO+'src/circuit-map/base.json'))
RT=np.array(B['track']['pts'],float); RC=cumlen(RT); RL=RC[-1]
sreal={int(k):v for k,v in B['track']['turns'].items()}
# piecewise mapping real s -> pdf s, cyclic through turns 1..19
ks=sorted(sreal)
def real2pdf(s):
    s=s%RL
    seq=[(sreal[k],spdf[k]) for k in ks]
    # extend cyclically
    seq2=[(a-RL,b-PC[-1]) for a,b in seq]+seq+[(a+RL,b+PC[-1]) for a,b in seq]
    for i in range(1,len(seq2)):
        a0,b0=seq2[i-1]; a1,b1=seq2[i]
        if a0<=s<=a1: return b0+(s-a0)/(a1-a0)*(b1-b0)
def tps_fit(src,dst,lam=0.0):
    n=len(src); r2=lambda a,b: ((a[:,None,:]-b[None,:,:])**2).sum(-1)
    def U(d2): 
        with np.errstate(divide='ignore',invalid='ignore'): u=d2*np.log(d2); 
        u[~np.isfinite(u)]=0; return u
    K=U(r2(src,src))+lam*np.eye(n); Pm=np.hstack([np.ones((n,1)),src])
    A=np.zeros((n+3,n+3)); A[:n,:n]=K; A[:n,n:]=Pm; A[n:,:n]=Pm.T
    bvec=np.zeros((n+3,2)); bvec[:n]=dst
    w=np.linalg.solve(A,bvec)
    def f(q):
        q=np.atleast_2d(np.asarray(q,float)); return U(r2(q,src))@w[:n]+np.hstack([np.ones((len(q),1)),q])@w[n:]
    return f
def build(extra=[] , step=15.0, lam=0.0, scale=100.0):
    src=[];dst=[]
    s=0.0
    while s<RL:
        sp=real2pdf(s); src.append(at(PT,PC,sp)); dst.append(at(RT,RC,s)); s+=step
    for a,b in extra: src.append(np.array(a)); dst.append(np.array(b))
    src=np.array(src)/scale; dst=np.array(dst)
    f=tps_fit(src,dst,lam)
    return lambda q: f(np.asarray(q,float)/scale)
