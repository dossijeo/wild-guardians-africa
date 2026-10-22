from pathlib import Path
import json,statistics
from PIL import Image,ImageChops
r=Path('docs/qa/global-visual-lab/canyon-horizon-motion-20261022')
d=json.loads((r/'motion.json').read_text(encoding='utf-8'))
def stats(v):
 s=sorted(v)
 return {'median':statistics.median(s),'p95':s[int((len(s)-1)*.95)],'max':max(s)} if s else None
rows=[]
for rec in d['records']:
 rows.append({'run':rec['run'],'variant':rec['variant'],'cpuMs':stats([x['cpuMs'] for x in rec['samples']]),'rafIntervalMs':stats([x['intervalMs'] for x in rec['samples'][1:]]),'jobLatencyMs':stats([x['latencyMs'] for x in rec['jobs']]),'normalMs':stats([x['normalMs'] for x in rec['jobs']]),'triangleRange':[min(x['triangles'] for x in rec['samples']),max(x['triangles'] for x in rec['samples'])],'settled':rec['settled'],'workerActive':rec['workerActive']})
pairs=[]
if len(rows)==4:
 for a,b in [(0,2),(1,3)]:
  v=rows[a]['variant'];ims=[Image.open(r/f'{i}-{v}.png').convert('RGB') for i in [a,b]]
  pairs.append({'runs':[a,b],'settledImageIdentical':ImageChops.difference(*ims).getbbox() is None})
result={'runs':rows,'repeatImages':pairs,'note':'CPU submission and RAF intervals are not GPU timings. Live stream geometry residency must be considered before comparing performance.'}
(r/'summary.json').write_bytes(json.dumps(result,indent=2).encode());print(json.dumps(result))
