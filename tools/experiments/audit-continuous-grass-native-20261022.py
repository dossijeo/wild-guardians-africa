from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
import json
p=Path('docs/qa/global-visual-lab/continuous-grass-native-20261022');records=json.loads((p/'captures.json').read_text())['records'];rows=[]
for phase in ['day','night']:
 a=next(r for r in records if r['phase']==phase and r['variant']=='qa');b=next(r for r in records if r['phase']==phase and r['variant']=='native')
 assert not a['errors'] and not b['errors']
 for i,(x,y) in enumerate(zip(a['frames'],b['frames'])):
  for field in ['camera','target','time','calls','triangles']:assert x[field]==y[field],(field,x[field],y[field])
  for field in ['near','far','triangles','leaves','bufferBytes']:assert x['coverage'][field]==y['coverage'][field]
  im=[Image.open(p/f'sabana-media-{v}-{phase}/{i:04}.png').convert('RGB') for v in ['qa','native']]
  d=ImageChops.difference(*im);h=d.histogram();rows.append(dict(phase=phase,view=i,identical=d.getbbox() is None,maxChannel=max(e[1] for e in d.getextrema()),meanChannel=sum((j%256)*n for j,n in enumerate(h))/(1280*720*3)))
  sheet=Image.new('RGB',(1280,384));sheet.paste(im[0].resize((640,360)),(0,24));sheet.paste(im[1].resize((640,360)),(640,24));draw=ImageDraw.Draw(sheet);draw.text((8,6),'Retained QA',fill='white');draw.text((648,6),'Native continuous coverage',fill='white');sheet.save(p/f'comparison-{phase}-{i}.jpg')
(p/'equivalence.json').write_bytes(json.dumps(rows,indent=2).encode());print(rows)
