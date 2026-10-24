import json
from collections import Counter
from pathlib import Path
p=Path('docs/qa/global-visual-lab/canyon-texture-lifetime-20261022');d=json.loads((p/'textures.json').read_text(encoding='utf-8'));rows=[]
assert len(d['records'])==8
for r in d['records']:
 assert not r['errors'];a=r['first'];b=r['late'];m=[t for t in a['textures'] if t.get('width')==35 and t.get('height')==35]
 assert len(m)==25 and a['memory']==b['memory']
 rows.append({'quality':r['quality'],'phase':r['phase'],'memory':a['memory'],'residentMaskReferences':len(m),'uploadedMasks':sum(t['uploaded'] for t in m),'skeletonSizedAllocations':sum(t.get('width')==12 and t.get('height')==12 for t in a['active']),'referencesVisited':a['visits']})
for quality in ['media','baja']:
 for phase in ['day','night']:
  a,b=[r for r in d['records'] if r['quality']==quality and r['phase']==phase]
  ca=Counter((t.get('width'),t.get('height')) for t in a['first']['active']);cb=Counter((t.get('width'),t.get('height')) for t in b['first']['active']);assert ca-cb=={(35,35):1} and not cb-ca
(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n');print('All repeated allocation differences are one unuploaded resident 35x35 mask; no change over180 extra frames.')
