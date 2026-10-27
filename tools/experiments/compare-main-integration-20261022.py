from pathlib import Path
import json,numpy as np
from PIL import Image
root=Path('docs/qa/global-visual-lab');out=root/'main-integration-20261022';rows=[]
for biome in ['sabana','gran-rio','manglares','volcanes','desierto','gran-canon']:
 p=out/f'{biome}-visual';old=root/(f'{biome}-aligned-review-20261022' if biome!='volcanes' else 'volcanes-populated-frozen-20261022')
 if not (p/'captures.json').exists():continue
 a=json.loads((old/'captures.json').read_text());b=json.loads((p/'captures.json').read_text())
 for r in b['records']:
  s=next(x for x in a['records'] if all(x.get(k)==r.get(k) for k in ['phase','variant','quality']))
  for f,g in zip(s['frames'],r['frames']):
   assert all(f[k]==g[k] for k in ['camera','target','time','elapsed','workers']),(biome,r['phase'],f['i'])
   rel=f"{biome}-media-{r['variant']}-{r['phase']}/{f['i']:04d}.png"
   if not (old/rel).exists():print('missing reference',old/rel);continue
   d=np.abs(np.array(Image.open(old/rel).convert('RGB')).astype(int)-np.array(Image.open(p/rel).convert('RGB')).astype(int))
   rows.append(dict(biome=biome,phase=r['phase'],variant=r['variant'],view=f['i'],changedPixels=int(np.any(d,axis=2).sum()),maximum=int(d.max()),beforeTriangles=f['triangles'],afterTriangles=g['triangles'],errors=r['errors']))
(out/'populated-comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print([(b,len([x for x in rows if x['biome']==b]),max(x['changedPixels'] for x in rows if x['biome']==b)) for b in sorted(set(x['biome'] for x in rows))])
