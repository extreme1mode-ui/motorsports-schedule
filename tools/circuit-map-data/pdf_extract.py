import os
TOOLS=os.path.dirname(os.path.abspath(__file__))+'/'
WORK=os.environ.get('MAPWORK', TOOLS+'work')+'/'
# 공식 서킷 파크 맵 PDF → 300dpi 렌더 · 단어 위치 · 트랙 중심선(벡터) · 구역/관람석 색 마스크
import json, subprocess, numpy as np, cv2
subprocess.run(['pdftoppm','-r','300','-png',WORK+'circuit-park-map-08.pdf',WORK+'cpm300'],check=True)
exec(open(TOOLS+'pdfobj.py').read())
words=pg.extract_words(keep_blank_chars=False, use_text_flow=False, extra_attrs=['size'])
json.dump([[w['text'],round(w['x0'],1),round(w['top'],1),round(w['x1'],1),round(w['bottom'],1),round(w['size'],1)] for w in words],open(WORK+'cpm_words.json','w'))
tr=[o for o in OBJ if str(o['sc'])=='(0.969, 0.957, 0.945)' and o['lw']>=7.9][0]     # the track: 8 pt off-white stroke
json.dump(tr['path'],open(WORK+'cpm_track_path.json','w'))
im=cv2.imread(WORK+'cpm300-1.png'); hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
H,S,V=[hsv[...,i].astype(int) for i in range(3)]
M={'z1':(H>=14)&(H<=34)&(S>60)&(V>170),'z4':(H>=62)&(H<=82)&(S>120)&(V>120),'z2':(H>=127)&(H<=140)&(S>150)&(V>150),
   'z3':(H>=148)&(H<=165)&(S>150)&(V>150),'red':((H>=170)|(H<=4))&(S>170)&(V>150),'navy':(H>=116)&(H<=128)&(S>180)&(V>70)&(V<170)}
np.savez_compressed(WORK+'masks.npz',**M)
print('pdf extracted', len(words), 'words')
