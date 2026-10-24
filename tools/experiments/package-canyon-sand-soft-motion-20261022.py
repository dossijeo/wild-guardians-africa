from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
import json,subprocess
r=Path('docs/qa/global-visual-lab/canyon-sand-soft-motion-20261022')
d=json.loads((r/'captures.json').read_text(encoding='utf-8'));audit=[]
for phase in ['day','night']:
 a=next(x for x in d['records'] if x['variant']=='baseline' and x['phase']==phase)
 b=next(x for x in d['records'] if x['variant']=='depth' and x['phase']==phase)
 assert len(a['frames'])==len(b['frames'])==60
 for x,y in zip(a['frames'],b['frames']):
  for key in ['camera','target','time','calls','triangles']:assert x[key]==y[key],(phase,x['i'],key)
 audit.append({'phase':phase,'matchedFrames':60,'errors':a['errors']+b['errors']})
 paths=[r/f'gran-canon-media-{v}-{phase}/%04d.jpg' for v in ['baseline','depth']]
 subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-y','-loglevel','error','-framerate','30','-i',str(paths[0]),'-framerate','30','-i',str(paths[1]),'-filter_complex','[0:v][1:v]hstack=inputs=2[v]','-map','[v]','-c:v','libx264','-crf','19','-pix_fmt','yuv420p',str(r/f'{phase}-comparison.mp4')],check=True)
 canvas=Image.new('RGB',(1280,1820),'#202020');draw=ImageDraw.Draw(canvas)
 for row,i in enumerate([0,15,30,45,59]):
  for col,v in enumerate(['baseline','depth']):
   im=Image.open(r/f'gran-canon-media-{v}-{phase}/{i:04}.jpg');im=ImageOps.contain(im,(640,360));canvas.paste(im,(col*640,row*364+4));draw.text((col*640+4,row*364),f'{v} frame {i}',fill='white')
 canvas.save(r/f'{phase}-keyframes.webp',quality=90)
(r/'motion-audit.json').write_bytes(json.dumps(audit,indent=2).encode());print(json.dumps(audit))
