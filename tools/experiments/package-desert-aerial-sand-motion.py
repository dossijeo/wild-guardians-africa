from pathlib import Path
import json, subprocess
import numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab/desert-aerial-sand/motion')
data=json.loads((root/'captures.json').read_text(encoding='utf-8'))
checks=[];loops=[];videos=[]
for quality in ['media','baja']:
 for phase in ['day','night']:
  a=next(r for r in data['records'] if r['quality']==quality and r['phase']==phase and r['variant']=='base')
  b=next(r for r in data['records'] if r['quality']==quality and r['phase']==phase and r['variant']=='candidate')
  for x,y in zip(a['frames'],b['frames']):
   for key in ['i','camera','target','time','calls','triangles']: assert x[key]==y[key],(quality,phase,x['i'],key)
  assert len(a['frames'])==len(b['frames'])==121
  checks.append(dict(quality=quality,phase=phase,matchedFrames=121))
  for variant in ['base','candidate']:
   folder=root/f'{quality}-{variant}-{phase}'
   records=[]
   for i in range(60):
    before=np.asarray(Image.open(folder/f'{i:04d}.png').convert('RGB'),dtype=np.int16)
    after=np.asarray(Image.open(folder/f'{120-i:04d}.png').convert('RGB'),dtype=np.int16)
    d=np.abs(before-after)
    source=a if variant=='base' else b;f0,f1=source['frames'][i],source['frames'][120-i]
    records.append(dict(sameGeometry=f0['calls']==f1['calls'] and f0['triangles']==f1['triangles'],samePose=f0['camera']==f1['camera'] and f0['target']==f1['target'],frame=i,returnFrame=120-i,changedPixels=int(np.any(d,axis=2).sum()),maxRGB=int(d.max()),meanRGB=float(d.mean())))
   same=[r for r in records if r['sameGeometry']];summary=dict(sameGeometryPairs=len(same),maxMeanRGB=max(r['meanRGB'] for r in same),maxRGB=max(r['maxRGB'] for r in same),maxChangedPixels=max(r['changedPixels'] for r in same))
   loops.append(dict(quality=quality,phase=phase,variant=variant,pairs=records,summary=summary))
   for i in [0,30,60,90,120]:
    im=Image.open(folder/f'{i:04d}.png').convert('RGB');dest=root/f'{quality}-{variant}-{phase}-{i:04d}.webp';im.save(dest,lossless=True)
    assert np.array_equal(np.asarray(im),np.asarray(Image.open(dest).convert('RGB')))
  output=root/f'{quality}-{phase}-comparison.mp4'
  subprocess.run(['C:/ffmpeg/bin/ffmpeg.exe','-hide_banner','-loglevel','error','-y','-framerate','30','-i',str(root/f'{quality}-base-{phase}/%04d.png'),'-framerate','30','-i',str(root/f'{quality}-candidate-{phase}/%04d.png'),'-filter_complex','hstack=inputs=2','-frames:v','121','-c:v','libx264','-preset','fast','-threads','2','-crf','18','-pix_fmt','yuv420p',str(output)],check=True)
  info=json.loads(subprocess.check_output(['C:/ffmpeg/bin/ffprobe.exe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,duration,r_frame_rate','-of','json',str(output)]))['streams'][0]
  assert int(info['nb_frames'])==121 and info['width']==2560 and info['height']==720
  videos.append(dict(file=output.name,**info));print(quality,phase,'packaged',flush=True)
(root/'comparison.json').write_text(json.dumps(dict(matches=checks,mirrorPairs=loops,videos=videos),indent=2)+'\n',encoding='utf-8',newline='\n')
