from pathlib import Path
import json
from PIL import Image, ImageDraw
root=Path('docs/qa/global-visual-lab/sky-twilight-20261021')
d=json.loads((root/'captures.json').read_text())
r={(a['variant'],a['phase']):a for a in d['records']}
phases=['day','quarter','half','three-quarter','night']
assert len(r)==10
checks=[]
for pose in range(3):
 sheet=Image.new('RGB',(1280,1910),(20,20,20));draw=ImageDraw.Draw(sheet)
 for row,phase in enumerate(phases):
  a,b=[r[v,phase]['frames'][pose] for v in ['base','combined']]
  for key in ['camera','target','time','triangles']:assert a[key]==b[key],(phase,pose,key)
  checks.append(dict(phase=phase,pose=pose,callsBefore=a['calls'],callsAfter=b['calls']))
  for col,v in enumerate(['base','combined']):
   assert not r[v,phase]['errors']
   im=Image.open(root/f'sabana-media-{v}-{phase}/{pose:04}.png')
   sheet.paste(im.resize((640,360)),(640*col,382*row+22))
   draw.text((640*col+8,382*row+4),f'{v} | {phase} | pose {pose}',fill='white')
 sheet.save(root/f'comparison-{pose}.webp',quality=92)
(root/'audit.json').write_bytes((json.dumps(checks,indent=2)+'\n').encode())
print('15 matched camera/time/triangle pairs; draw counts recorded.')
