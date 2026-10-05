import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
REPO=os.path.abspath(TOOLS+'../..')+'/'
exec(open(TOOLS+'evt.py').read())
A=json.load(open(HERE+'amen_pdf.json'))
A['wc']=A['wc']+A.pop('wca')      # accessible restrooms sit with the rest (same need)
out={k:[[round(float(v),1) for v in F([p])[0]] for p in pts] for k,pts in A.items()}
json.dump(out,open(HERE+'amen_real.json','w'))
print({k:len(v) for k,v in out.items()})
