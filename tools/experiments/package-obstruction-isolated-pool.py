from pathlib import Path
import json,subprocess
from PIL import Image
import numpy as np
p=Path('docs/qa/global-visual-lab/obstruction-isolated-pool')
d=json.loads((p/'captures.json').read_text());assert len(d['records'])==4
rows=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 assert not a['errors'] and not b['errors'] and len(a['frames'])==len(b['frames'])==36
 for x,y in zip(a['frames'],b['frames']):
  for key in ['camera','target','time','windTime','partial','opacities']:assert x[key]==y[key],(phase,x['i'],key,x[key],y[key])
  assert x['glError']==y['glError']==0
  arrays=[np.asarray(Image.open(p/f'sabana-baja-{v}-{phase}/{x["i"]:04}.png').convert('RGB'),dtype=np.float32) for v in ['base','combined']]
  assert all(z.std()>5 for z in arrays)
  # Record discrepancies rather than silently declaring pixel parity.
  changed=int(np.any(arrays[0]!=arrays[1],axis=2).sum())
  assert y['isolated']['targets']<=x['isolated']['targets']
  rows.append({'phase':phase,'frame':x['i'],'partial':x['partial'],'opacities':x['opacities'],'changedPixels':changed,'exact':changed==0,'mae':float(np.abs(arrays[0]-arrays[1]).mean()),'isolated':y['isolated']})
 subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-hide_banner','-loglevel','error','-y','-framerate','30','-i',str(p/f'sabana-baja-base-{phase}/%04d.png'),'-framerate','30','-i',str(p/f'sabana-baja-combined-{phase}/%04d.png'),'-filter_complex','hstack=inputs=2','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(p/f'{phase}-pair.mp4')],check=True)
 for i in [0,9,17,26,35]:
  pair=Image.new('RGB',(2560,720))
  for col,v in enumerate(['base','combined']):pair.paste(Image.open(p/f'sabana-baja-{v}-{phase}/{i:04}.png'),(1280*col,0))
  pair.save(p/f'{phase}-{i}-pair.webp',lossless=True)
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pairs':len(rows),'activePairs':sum(r['partial']>0 for r in rows),'maxTargets':max(r['isolated']['targets'] for r in rows),'maxMAE':max(r['mae'] for r in rows)}))
