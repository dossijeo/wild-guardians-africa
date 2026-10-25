import json,os
from pathlib import Path
import numpy as np
from PIL import Image

control=os.environ.get('WG_RESET_CONTROL')=='1'
root=Path(f"docs/qa/global-visual-lab/volcano-group-{'control' if control else 'reset'}-20261022")
records=json.loads((root/'geometries.json').read_text(encoding='utf-8'))['records']
rows=[]
for i,r in enumerate(records):
    prefix=f"{i}-{r['quality']}-{r['phase']}"
    a=np.asarray(Image.open(root/f'{prefix}-before.png').convert('RGB')).astype('int16')
    b=np.asarray(Image.open(root/f'{prefix}-after.png').convert('RGB')).astype('int16')
    delta=np.abs(a-b)
    rows.append(dict(quality=r['quality'],phase=r['phase'],
        before=r['first']['count'],after=r['late']['count'],
        changedPixels=int(np.any(delta,axis=2).sum()),maximumDelta=int(delta.max())))
    assert not r['errors']
report=dict(complete=len(records)==8,rows=rows)
(root/'comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(report,indent=2))
assert report['complete']
assert all(r['changedPixels']==0 for r in rows), 'Reset changes rendered image: investigate before timing'
for quality in ['media','baja']:
    for phase in ['day','night']:
        pair=[r for r in rows if r['quality']==quality and r['phase']==phase]
        assert pair[0]['after']==pair[1]['after'], 'Reset residency still differs'
