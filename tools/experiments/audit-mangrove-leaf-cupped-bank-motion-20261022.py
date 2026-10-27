from pathlib import Path
import json,subprocess
p=Path('docs/qa/global-visual-lab/mangrove-leaf-cupped-bank-motion-20261022')
r=json.loads((p/'captures.json').read_text())['records'];rows=[]
for phase in ['day','night']:
 a,b=[x for x in r if x['phase']==phase]
 assert len(a['frames'])==len(b['frames'])==240
 assert all(f['camera']==g['camera'] for f,g in zip(a['frames'],b['frames']))
 assert all(f['coverage']['near']==g['coverage']['near'] and f['coverage']['far']==g['coverage']['far'] for f,g in zip(a['frames'],b['frames']))
 assert all(not f['coverage']['stats']['overflow'] and not f['glError'] for x in [a,b] for f in x['frames'])
 for x in [a,b]:
  path=p/f"manglares-media-{x['variant']}-{phase}"/'motion.webm'
  probe=json.loads(subprocess.check_output(['C:/ffmpeg/bin/ffprobe.exe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=nb_read_frames','-of','json',str(path)]))
  rows.append(dict(phase=phase,variant=x['variant'],requestedFrames=len(x['frames']),encodedFrames=int(probe['streams'][0]['nb_read_frames']),nearRange=[min(f['coverage']['near'] for f in x['frames']),max(f['coverage']['near'] for f in x['frames'])],farRange=[min(f['coverage']['far'] for f in x['frames']),max(f['coverage']['far'] for f in x['frames'])]))
(p/'motion-audit.json').write_text(json.dumps(dict(records=rows,note='Camera and leaf counts exact across variants; video uses wall-clock timestamps and can drop frames. Not a timing benchmark or a proof of pixel equality.'),indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(rows,indent=2))
