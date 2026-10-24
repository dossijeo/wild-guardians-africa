from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageChops,ImageDraw
root=Path('docs/qa/global-visual-lab/desert-meso-stream-20261021');d=json.loads((root/'captures.json').read_text());r={(a['variant'],a['phase']):a for a in d['records']};out=[]
assert len(r)==4
for phase in ['day','night']:
 a,b=[r[v,phase] for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 for i,(fa,fb) in enumerate(zip(a['frames'],b['frames'])):
  for key in ['camera','target','time','calls','triangles','chunks','origin']:assert fa[key]==fb[key],(phase,i,key)
 for v in ['base','combined']:
  frames=r[v,phase]['frames'];first,last=frames[0],frames[2]
  for k in ['camera','target','time','chunks']:assert first[k]==last[k],(v,phase,k)
  assert first['origin']['x']!=frames[1]['origin']['x']
  assert last['origin']['revision']>first['origin']['revision']
  ia=Image.open(root/f'desierto-media-{v}-{phase}/0000.png').convert('RGB');ib=Image.open(root/f'desierto-media-{v}-{phase}/0002.png').convert('RGB')
  box=ImageChops.difference(ia,ib).getbbox()
  delta=np.abs(np.asarray(ia).astype(float)-np.asarray(ib).astype(float))
  out.append(dict(variant=v,phase=phase,returnPixelExact=box is None,meanAbsoluteNormalized=float(delta.mean()/255),changedPixels=int(np.any(delta>0,axis=2).sum()),pixelsAbove8=int(np.any(delta>8,axis=2).sum()),differenceBounds=box,origin=[f['origin'] for f in frames],returnCalls=[first['calls'],last['calls']],returnTriangles=[first['triangles'],last['triangles']]))
 sheet=Image.new('RGB',(1280,1146),(20,20,20));draw=ImageDraw.Draw(sheet)
 for i in range(3):
  for col,v in enumerate(['base','combined']):
   im=Image.open(root/f'desierto-media-{v}-{phase}/{i:04}.png');sheet.paste(im.resize((640,360)),(640*col,382*i+22));draw.text((640*col+8,382*i+4),f'{v} | {phase} | {i}',fill='white')
 sheet.save(root/f'comparison-{phase}.jpg',quality=93)
(root/'audit.json').write_bytes((json.dumps(out,indent=2)+'\n').encode());print(json.dumps(out,indent=2))
