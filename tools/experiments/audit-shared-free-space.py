import json,numpy as np,cv2
from pathlib import Path
r=Path('.');v=next(v for v in json.load(open('public/content/villages.json')) if v['id']=='mapungubwe');a=np.fromfile(r/'public'/v['binary']['url'].lstrip('/'),dtype='<f4',count=v['vertexBytes']//4).reshape(-1,8);t=np.fromfile(r/'public'/v['binary']['url'].lstrip('/'),dtype='<u4',offset=v['vertexBytes']).reshape(-1,3)
k=json.load(open('docs/qa/global-visual-lab/workshop-art/refinement-audit.json'))['faceSelections'];skip=set(k['1']+k['2']+k['3']);mask=np.zeros((2048,2048),np.uint8)
for f,ids in enumerate(t):
 if f in skip:continue
 cv2.fillConvexPoly(mask,np.round(a[ids,6:8]*2047).astype(np.int32),1)
mask=cv2.dilate(mask,np.ones((5,5),np.uint8));print('Protected coverage',mask.mean())
for h,w in [(48,48),(32,64),(32,32),(16,64),(24,24)]:
 s=cv2.integral(mask);sums=s[h:,w:]-s[:-h,w:]-s[h:,:-w]+s[:-h,:-w];print(w,h,'free slots',int((sums==0).sum()))

result={'protectedCoverage':float(mask.mean()),'tests':[]}
for size in (64,48,40,32):
 m=mask.copy();slots=[]
 for n in range(18):
  s=cv2.integral(m);tot=s[size:,size:]-s[:-size,size:]-s[size:,:-size]+s[:-size,:-size];loc=np.argwhere(tot==0)
  if not len(loc):break
  y,x=map(int,loc[0]);slots.append([x,y,size,size]);m[y:y+size,x:x+size]=1
 result['tests'].append({'squareSize':size,'requested':18,'placed':len(slots),'innerSizeWith4PixelPadding':size-8,'slots':slots})
Path('docs/qa/global-visual-lab/workshop-shared/free-space-audit.json').write_text(json.dumps(result,indent=2)+'\n')
