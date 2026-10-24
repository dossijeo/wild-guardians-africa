from pathlib import Path
from PIL import Image
import json,hashlib,numpy as np
ROOT=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/continuous-grass'
controls=[]
for quality in ['media','baja']:
 manifest=ROOT/f'captures-{quality}.json';data=json.loads(manifest.read_text(encoding='utf-8'))
 for r in data['records']:
  source=ROOT/r.get('rawCaptureFile',r['file']);target=source.with_suffix('.webp')
  image=Image.open(source).convert('RGB');image.save(target,lossless=True,method=6)
  assert np.array_equal(np.asarray(image),np.asarray(Image.open(target)))
  r['rawCaptureFile']=source.name;r['file']=target.name
 manifest.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8',newline='\n')
 for view in ['close','game','elevated']:
  for phase in ['day','night']:
   a=ROOT/f'{quality}-{view}-{phase}-A.png';b=ROOT/f'{quality}-{view}-{phase}-A2.png'
   controls.append(dict(quality=quality,view=view,phase=phase,identical=a.read_bytes()==b.read_bytes(),sha256=hashlib.sha256(a.read_bytes()).hexdigest()))
assert all(r['identical']for r in controls)
(ROOT/'original-return.json').write_text(json.dumps(controls,indent=2)+'\n',encoding='utf-8',newline='\n')
for name in ['pilot-v1','pilot-v2']:
 source=ROOT/name/'media-close-day-C.png';Image.open(source).save(source.with_suffix('.webp'),lossless=True,method=6)
source=ROOT/'pilot-low-refined/baja-game-day-C.png';Image.open(source).save(source.with_suffix('.webp'),lossless=True,method=6)
print('48 lossless captures; 12/12 exact original controls; retained 3 discarded-pilot images.')
