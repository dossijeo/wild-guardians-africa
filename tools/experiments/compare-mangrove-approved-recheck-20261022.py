from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
root=Path('docs/qa/global-visual-lab')
a=root/'mangrove-additive-fringe-20261022'
b=root/'mangrove-approved-recheck-20261022'
old=json.loads((a/'captures.json').read_text(encoding='utf-8'))
new=json.loads((b/'captures.json').read_text(encoding='utf-8'))
rows=[]
for r in new['records']:
 p=next(x for x in old['records'] if all(x[k]==r[k] for k in ['treatment','quality','biome','variant','phase']))
 assert not r['errors']
 for f,g in zip(p['frames'],r['frames']):
  for k in ['camera','target','time']: assert f[k]==g[k],k
  name=f"original/manglares-media-{r['variant']}-{r['phase']}/{f['i']:04d}.png"
  im1=Image.open(a/name).convert('RGB');im2=Image.open(b/name).convert('RGB')
  diff=np.abs(np.asarray(im1).astype(int)-np.asarray(im2).astype(int))
  rows.append(dict(variant=r['variant'],phase=r['phase'],view=f['i'],changedPixels=int(np.any(diff,axis=2).sum()),maxChannelDifference=int(diff.max()),oldCoverage=f['coverage'],newCoverage=g['coverage']))
  if r['variant']=='native' and f['i']==0:
   panel=Image.new('RGB',(1280,382),'#111111');panel.paste(im1.resize((640,360)),(0,22));panel.paste(im2.resize((640,360)),(640,22));d=ImageDraw.Draw(panel);d.text((10,5),'APPROVED ORIGINAL',fill='white');d.text((650,5),'CURRENT - SAME CAMERA',fill='white');panel.save(b/f"approved-vs-current-{r['phase']}.jpg",quality=95)
(b/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
print([(r['variant'],r['phase'],r['view'],r['changedPixels'],r['maxChannelDifference']) for r in rows])
