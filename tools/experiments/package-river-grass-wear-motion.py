import json
from pathlib import Path
from PIL import Image
p=Path('docs/qa/global-visual-lab/river-grass-wear-motion')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));pairs=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['quality']=='media' and r['phase']==phase and r['variant']==v) for v in ['original','candidate']]
 assert not a['errors'] and not b['errors']
 assert len(a['frames'])==len(b['frames'])==36
 for i,(aa,bb) in enumerate(zip(a['frames'],b['frames'])):
  for key in ['camera','target','time','windTime','calls','triangles']:assert aa[key]==bb[key],(phase,i,key)
  for key in ['near','far','bufferBytes']:assert aa['coverage'][key]==bb['coverage'][key],key
  assert aa['coverage']['stats']['overflow']==bb['coverage']['stats']['overflow']==0
  assert aa['glError']==bb['glError']==0
  if i in [0,17,35]:
   pair=Image.new('RGB',(2560,720))
   for x,v in [(0,'original'),(1280,'candidate')]:pair.paste(Image.open(p/f'gran-rio-media-{v}-{phase}/{i:04}.png'),(x,0))
   pair.resize((1920,540)).save(p/f'{phase}-{i:03}-pair.webp',quality=94)
  pairs.append(dict(phase=phase,frame=i,calls=aa['calls'],triangles=aa['triangles'],near=aa['coverage']['near'],far=aa['coverage']['far'],windTime=aa['windTime']))
(p/'comparison.json').write_text(json.dumps(dict(pairs=pairs,errors=0,note='Fixed-step capture, not realtime FPS or GPU benchmark.'),indent=2)+'\n',encoding='utf-8',newline='\n')
print('72 matched frames, same camera, time, wind, counts and buffers; zero errors')
