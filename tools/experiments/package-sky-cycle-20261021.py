from pathlib import Path
import json, subprocess
from PIL import Image, ImageDraw
root=Path('docs/qa/global-visual-lab/sky-cycle-20261021')
d=json.loads((root/'captures.json').read_text());r={(a['variant'],a['phase']):a for a in d['records']}
assert len(r)==4
checks=[]
for phase in ['dusk','dawn']:
 a,b=[r[v,phase] for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 assert len(a['frames'])==len(b['frames'])==24
 for i,(fa,fb) in enumerate(zip(a['frames'],b['frames'])):
  for key in ['camera','target','time','triangles']:assert fa[key]==fb[key],(phase,i,key)
 checks.append(dict(phase=phase,pairs=24,drawCallExceptions=[dict(frame=i,before=fa['calls'],after=fb['calls']) for i,(fa,fb) in enumerate(zip(a['frames'],b['frames'])) if fa['calls']!=fb['calls']]))
 sheet=Image.new('RGB',(1280,1528),(20,20,20));draw=ImageDraw.Draw(sheet)
 for row,i in enumerate([0,5,12,23]):
  for col,v in enumerate(['base','combined']):
   im=Image.open(root/f'sabana-media-{v}-{phase}/{i:04}.png')
   sheet.paste(im.resize((640,360)),(640*col,382*row+22));draw.text((640*col+8,382*row+4),f'{v} | {phase} | frame {i}',fill='white')
 sheet.save(root/f'comparison-{phase}.webp',quality=92)
 subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-y','-loglevel','error','-framerate','12','-i',str(root/f'sabana-media-base-{phase}/%04d.png'),'-framerate','12','-i',str(root/f'sabana-media-combined-{phase}/%04d.png'),'-filter_complex','[0:v]scale=640:360[a];[1:v]scale=640:360[b];[a][b]hstack','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(root/f'comparison-{phase}.mp4')],check=True)
(root/'audit.json').write_bytes((json.dumps(checks,indent=2)+'\n').encode())
print('48 camera/time/triangle pairs validated; draw-call exceptions recorded.')
