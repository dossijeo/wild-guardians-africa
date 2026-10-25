import json
import numpy as np
import subprocess
from pathlib import Path
from PIL import Image
p=Path('docs/qa/global-visual-lab/grass-wind-motion-20261021')
d=json.loads((p/'captures.json').read_text(encoding='utf-8'));pairs=[]
for quality in ['media']:
 for phase in ['day','night']:
  a,b=[next(r for r in d['records'] if r['quality']==quality and r['phase']==phase and r['variant']==v) for v in ['base','combined']]
  assert not a['errors'] and not b['errors']
  assert len(a['frames'])==len(b['frames'])==36
  for i,(aa,bb) in enumerate(zip(a['frames'],b['frames'])):
   for key in ['camera','target','time','windTime','calls','triangles']:assert aa[key]==bb[key],(quality,phase,i,key)
   assert aa['glError']==bb['glError']==0
   for v in ['base','combined']:
    pixels=np.asarray(Image.open(p/f'sabana-{quality}-{v}-{phase}/{i:04}.png').convert('RGB'))
    assert pixels.max()-pixels.min()>20,(quality,phase,i,'empty frame')
   if i in [0,17,35]:
    pair=Image.new('RGB',(2560,720))
    for x,v in [(0,'base'),(1280,'combined')]:pair.paste(Image.open(p/f'sabana-{quality}-{v}-{phase}/{i:04}.png'),(x,0))
    pair.resize((1920,540)).save(p/f'{quality}-{phase}-{i:03}-pair.webp',quality=94)
   delta=abs(np.array(Image.open(p/f'sabana-{quality}-base-{phase}/{i:04}.png').convert('RGB')).astype(int)-np.array(Image.open(p/f'sabana-{quality}-combined-{phase}/{i:04}.png').convert('RGB')).astype(int))
   pairs.append(dict(quality=quality,phase=phase,frame=i,calls=aa['calls'],triangles=aa['triangles'],changedPixels=int(np.any(delta,axis=2).sum()),maxDelta=int(delta.max())))
  subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-y','-loglevel','error','-framerate','12','-i',str(p/f'sabana-{quality}-base-{phase}/%04d.png'),'-framerate','12','-i',str(p/f'sabana-{quality}-combined-{phase}/%04d.png'),'-filter_complex','hstack,scale=1920:540','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(p/f'{quality}-{phase}.mp4')],check=True)
(p/'comparison.json').write_text(json.dumps(dict(pairs=pairs,errors=0,note='Fixed-step camera approach, not realtime performance.'),indent=2)+'\n',encoding='utf-8',newline='\n')
print('72 matched pairs, zero errors')

probes=[]
for quality in ['media']:
 for phase in ['day','night']:
  clip=p/f'{quality}-{phase}.mp4'
  info=json.loads(subprocess.check_output(['C:/ffmpeg/bin/ffprobe.exe','-v','error','-show_streams','-of','json',str(clip)]))['streams'][0]
  assert int(info['nb_frames'])==36 and abs(float(info['duration'])-3)<.01
  probes.append(dict(file=clip.name,frames=int(info['nb_frames']),duration=float(info['duration']),fps=info['r_frame_rate'],width=info['width'],height=info['height']))
(p/'video-metadata.json').write_text(json.dumps(probes,indent=2)+'\n',encoding='utf-8',newline='\n')
for phase in ['day','night']:
 sheet=Image.new('RGB',(960,540))
 for j,i in enumerate([0,4,8,13,17,21,26,30,35]):
  im=Image.open(p/f'sabana-media-combined-{phase}/{i:04}.png').convert('RGB').resize((320,180));sheet.paste(im,((j%3)*320,(j//3)*180))
 sheet.save(p/f'media-{phase}-contact.webp',quality=94)
