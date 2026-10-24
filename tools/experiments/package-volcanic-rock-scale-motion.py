from pathlib import Path
import json,subprocess
from PIL import Image
p=Path('docs/qa/global-visual-lab/volcanic-rock-scale/motion')
d=json.loads((p/'captures.json').read_text());assert len(d['records'])==4
rows=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 assert not a['errors'] and not b['errors'] and len(a['frames'])==len(b['frames'])==72
 for x,y in zip(a['frames'],b['frames']):
  for key in ['camera','target','time','calls','triangles']:assert x[key]==y[key],(phase,x['i'],key)
  assert x['glError']==y['glError']==0
 rows.append({'phase':phase,'pairs':72,'cameraGeometryEqual':True})
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','12','-i',str(p/f'volcanes-media-base-{phase}/%04d.png'),'-framerate','12','-i',str(p/f'volcanes-media-combined-{phase}/%04d.png'),'-filter_complex','hstack=inputs=2','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(p/f'{phase}-pair.mp4')],check=True)
 for i in [0,24,36,48,71]:
  pair=Image.new('RGB',(2560,720))
  for col,v in enumerate(['base','combined']):pair.paste(Image.open(p/f'volcanes-media-{v}-{phase}/{i:04}.png'),(1280*col,0))
  pair.save(p/f'{phase}-{i}-pair.webp',lossless=True)
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
print(rows)
