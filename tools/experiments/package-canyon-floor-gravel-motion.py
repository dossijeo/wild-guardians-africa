import json
import subprocess
from pathlib import Path
from PIL import Image
p=Path('docs/qa/global-visual-lab/canyon-floor-gravel-motion')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));pairs=[]
for quality in ['media','baja']:
 for phase in ['day','night']:
  a,b=[next(r for r in d['records'] if r['quality']==quality and r['phase']==phase and r['variant']==v) for v in ['original','candidate']]
  assert not a['errors'] and not b['errors']
  assert len(a['frames'])==len(b['frames'])==36
  for i,(aa,bb) in enumerate(zip(a['frames'],b['frames'])):
   for key in ['camera','target','time','calls','triangles']:assert aa[key]==bb[key],(quality,phase,i,key)
   assert aa['glError']==bb['glError']==0
   if i in [0,17,35]:
    pair=Image.new('RGB',(2560,720))
    for x,v in [(0,'original'),(1280,'candidate')]:pair.paste(Image.open(p/f'gran-canon-{quality}-{v}-{phase}/{i:04}.png'),(x,0))
    pair.resize((1920,540)).save(p/f'{quality}-{phase}-{i:03}-pair.webp',quality=94)
   pairs.append(dict(quality=quality,phase=phase,frame=i,calls=aa['calls'],triangles=aa['triangles']))
  subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-y','-loglevel','error','-framerate','12','-i',str(p/f'gran-canon-{quality}-original-{phase}/%04d.png'),'-framerate','12','-i',str(p/f'gran-canon-{quality}-candidate-{phase}/%04d.png'),'-filter_complex','hstack,scale=1920:540','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(p/f'{quality}-{phase}.mp4')],check=True)
(p/'comparison.json').write_text(json.dumps(dict(pairs=pairs,errors=0,note='Fixed-step camera approach, not realtime performance.'),indent=2)+'\n',encoding='utf-8',newline='\n')
print('144 matched pairs, zero errors')
