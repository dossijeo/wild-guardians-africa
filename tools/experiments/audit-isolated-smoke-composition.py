from pathlib import Path
import json
from PIL import Image
import numpy as np
p=Path('docs/qa/global-visual-lab/obstruction-isolated-smoke-composition');d=json.loads((p/'probe.json').read_text())
assert all(not r['glError'] for r in d['images'])
rows=[]
for smoke in [False,True]:
 rowsrc=[next(r for r in d['images'] if r['depth']==skip and r['marker']==smoke) for skip in [False,True]]
 imgs=[Image.open(p/f'depth-{str(skip).lower()}-marker-{str(smoke).lower()}.png').convert('RGB') for skip in [False,True]]
 a,b=[np.asarray(im) for im in imgs];assert np.array_equal(a,b),('composition differs',smoke)
 before,after=[r['depthDraws'] for r in rowsrc]
 assert before>0 and (before==after*2 if smoke else before==after)
 rows.append({'smoke':smoke,'pixelExact':True,'redundantDepthDraws':before,'filteredDepthDraws':after})
 pair=Image.new('RGB',(2560,720));pair.paste(imgs[0]);pair.paste(imgs[1],(1280,0));pair.save(p/f'composition-smoke-{str(smoke).lower()}.webp',lossless=True)
(p/'analysis.json').write_text(json.dumps(rows,indent=2)+'\n');print(rows)
