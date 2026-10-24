from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab');out=root/'mangrove-mud-moss-single-normal';pairs=[]
original=json.loads((root/'mangrove-mud-moss-toon-interior/captures.json').read_text(encoding='utf-8'));current=json.loads((out/'captures.json').read_text(encoding='utf-8'))
for q in ['media','baja']:
 for phase in ['day','night']:
  a=next(r for r in original['records'] if r['quality']==q and r['phase']==phase and r['variant']=='candidate');b=next(r for r in current['records'] if r['quality']==q and r['phase']==phase and r['variant']=='candidate');assert not a['errors'] and not b['errors']
  for i in range(3):
   assert all(a['frames'][i][k]==b['frames'][i][k] for k in ['camera','target','time','calls','triangles'])
   aa=np.asarray(Image.open(root/f'mangrove-mud-moss-toon-interior/{q}-candidate-{phase}/{i:04}.png').convert('RGB')).astype(np.int16)
   image=Image.open(out/f'{q}-candidate-{phase}/{i:04}.png').convert('RGB');bb=np.asarray(image).astype(np.int16);diff=np.abs(aa-bb)
   dest=out/f'{q}-{phase}-{i}.webp';image.save(dest,lossless=True);assert Image.open(dest).convert('RGB').tobytes()==image.tobytes()
   pairs.append({'quality':q,'phase':phase,'view':i,'max':int(diff.max()),'mae':float(diff.mean()),'changedPixels':int(np.any(diff,axis=2).sum()),'samePoseAndGeometry':True})
(out/'comparison.json').write_text(json.dumps(pairs,indent=2)+'\n',encoding='utf-8',newline='\n');print(pairs)
