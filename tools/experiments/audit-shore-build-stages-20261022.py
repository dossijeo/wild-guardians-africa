import json
from pathlib import Path
r=Path('docs/qa/global-visual-lab/shore-build-stages-20261022');d=json.loads((r/'captures.json').read_text(encoding='utf8'));out=[]
for record in d['records']:
 assert not record['errors']
 samples=[s for f in record['frames'] for s in (f['shoreProfile'] or {}).get('samples',[])]
 stages={k:round(sum(x[k] for x in samples),3) for k in ['boundaryMs','heightMs','packMs','materialMs']}
 out.append(dict(biome=record['biome'],phase=record['phase'],builds=len(samples),**stages))
(r/'summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8',newline='\n');print(json.dumps(out,indent=2))
