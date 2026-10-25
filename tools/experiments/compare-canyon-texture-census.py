import json
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/current-review-20261025'
rows=[]
for variant in ['control','calm']:
 data=json.loads((root/('canyon-census-'+variant)/'captures.json').read_text())
 frame=next(r for r in data['records'] if r['variant']=='native' and r['phase']=='day')['frames'][0]
 textures=frame['textureCensus'][0]['textures']
 counts=Counter(json.dumps(t['uploads'],sort_keys=True) for t in textures)
 rows.append((variant,frame['memory'],counts))
a,b=rows
result={'controlMemory':a[1],'calmMemory':b[1],'onlyControl':[{'count':v,'uploads':json.loads(k)} for k,v in (a[2]-b[2]).items()],'onlyCalm':[{'count':v,'uploads':json.loads(k)} for k,v in (b[2]-a[2]).items()]}
(root/'canyon-texture-census-diff.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2))
