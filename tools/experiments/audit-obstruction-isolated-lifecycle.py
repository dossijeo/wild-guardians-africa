from pathlib import Path
import json
from PIL import Image
import numpy as np
p=Path('docs/qa/global-visual-lab/obstruction-isolated-lifecycle-v2')
d=json.loads((p/'captures.json').read_text());assert len(d['records'])==4
rows=[]
for phase in ['day','night']:
 a,b=[next(r for r in d['records'] if r['phase']==phase and r['variant']==v) for v in ['base','combined']]
 assert not a['errors'] and not b['errors']
 for x,y in zip(a['frames'],b['frames']):
  for key in ['camera','target','time','windTime','partial','opacities']:assert x[key]==y[key],(phase,x['i'],key)
  expected=[960,540] if 12<=x['i']<24 else [1280,720]
  assert [y['isolated']['width'],y['isolated']['height']]==expected
  assert x['glError']==y['glError']==0
  imgs=[Image.open(p/f'sabana-baja-{v}-{phase}/{x["i"]:04}.png').convert('RGB') for v in ['base','combined']]
  assert all(list(im.size)==expected for im in imgs)
  aa,bb=[np.asarray(im,dtype=np.float32) for im in imgs]
  rows.append({'phase':phase,'frame':x['i'],'changedPixels':int(np.any(aa!=bb,axis=2).sum()),'mae':float(abs(aa-bb).mean()),'partial':x['partial']})
  if x['i'] in [11,12,23,24]:
   pair=Image.new('RGB',(expected[0]*2,expected[1]));pair.paste(imgs[0],(0,0));pair.paste(imgs[1],(expected[0],0));pair.save(p/f'{phase}-{x["i"]}-pair.webp',lossless=True)
l=json.loads((p/'lifecycle.json').read_text());assert not l['glError'];assert l['disposed']['disposed'] and l['disposed']['targets']==0
assert l['trimmed']['pooled']==0 and l['trimmed']['assigned']==l['before']['assigned']
a,b=[np.asarray(Image.open(p/f'lifecycle-{k}.png')) for k in ['baseline','after']]
assert np.array_equal(a,b),'reinstallation changes image'
s={'pairs':len(rows),'exactPairs':sum(r['changedPixels']==0 for r in rows),'maxChangedPixels':max(r['changedPixels'] for r in rows),'lifecycle':l,'reinstallationPixelExact':True,'frames':rows}
(p/'summary.json').write_text(json.dumps(s,indent=2)+'\n')
print({k:v for k,v in s.items() if k!='frames'})
