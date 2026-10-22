import json,os
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=Path(os.environ.get('WG_REVIEW_OUT','docs/qa/global-visual-lab/mangrove-far-transition-order-20261022'))
d=json.loads((p/'captures.json').read_text());rows=[]
for r in d['records']:
 folder=p/f"{r['biome']}-{r['quality']}-{r['variant']}-{r['phase']}"
 x=np.array(Image.open(folder/'original.png').convert('RGB'))
 for order in ['reversed','restored']:
  y=np.array(Image.open(folder/f'{order}.png').convert('RGB'));delta=np.abs(x.astype(int)-y.astype(int))
  row=dict(phase=r['phase'],variant=r['variant'],order=order,pixels=int(np.any(delta,axis=2).sum()),mean=float(delta.mean()),max=int(delta.max()))
  rows.append(row)
  if order=='restored':assert row['pixels']==0,row
 assert not r['errors'] and all(not s['glError'] for s in r['shots'])
 assert len(set((s['calls'],s['triangles']) for s in r['shots']))==1
 if r['variant']=='after':
  sheet=Image.new('RGB',(1280,744));sheet.paste(Image.fromarray(x),(0,24));sheet.paste(Image.open(folder/'reversed.png').resize((640,360)),(640,384));ImageDraw.Draw(sheet).text((8,6),'Original full view; reversed ordering inset bottom right',fill='white');sheet.save(p/f"{r['phase']}-order.jpg",quality=94)
(p/'audit.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(rows,indent=2))
