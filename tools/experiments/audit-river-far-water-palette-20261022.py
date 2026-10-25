import json,os
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=Path(os.environ.get('WG_REVIEW_OUT','docs/qa/global-visual-lab/river-far-water-palette-20261022'));d=json.loads((p/'captures.json').read_text());rows=[]
for r in d['records']:
 assert not r['errors'];base=r['frames'][0]
 a=np.array(Image.open(p/f"{r['biome']}-{r['quality']}-before-{r['phase']}/{r['i']:04d}.png").convert('RGB'))
 sheet=Image.new('RGB',(1280,2*384));draw=ImageDraw.Draw(sheet)
 for n,f in enumerate(r['frames']):
  assert not f['glError'] and f['farEnabled'] and f['mountainsVisible'];assert f['camera']==base['camera'] and f['time']==base['time']
  assert f['calls']==base['calls'] and f['triangles']==base['triangles'] and f['memory']==base['memory']
  image=Image.open(p/f"{r['biome']}-{r['quality']}-{f['variant']}-{r['phase']}/{r['i']:04d}.png").convert('RGB');delta=np.abs(a.astype(int)-np.array(image).astype(int));row=dict(phase=r['phase'],view=r['i'],variant=f['variant'],pixels=int(np.any(delta,axis=2).sum()),mean=float(delta.mean()),max=int(delta.max()));rows.append(row)
  sheet.paste(image.resize((640,360)),((n%2)*640,(n//2)*384+24));draw.text(((n%2)*640+8,(n//2)*384+6),f['variant'],fill='white')
 sheet.save(p/f"{r['phase']}-{r['i']}-comparison.jpg",quality=94)
(p/'audit.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf8',newline='\n');print(json.dumps(rows,indent=2));assert len(rows)==24
if all(r['frames'][0]['color']==[.30,.44,.48] for r in d['records']):
 selected=[r for r in rows if r['variant']=='blue'];(p/'native-parity.json').write_text(json.dumps(selected,indent=2)+'\n',encoding='utf8',newline='\n');assert all(r['pixels']==0 for r in selected),'Native differs from selected QA color'
assert all(r['pixels']==0 for r in rows if r['variant']=='return'),'Return not RGB exact'
