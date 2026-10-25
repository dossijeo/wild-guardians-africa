"""Coverage evidence only: no image-quality or GPU-performance claim."""
import json, sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs
p=Path(sys.argv[1])
d=json.loads((p/'active-play.json').read_text(encoding='utf-8'))
assert {r['phase'] for r in d['records']}=={'day','night'}
rows=[]
for r in d['records']:
 assert r['biome']=='gran-canon' and r['motionPath']=='canyon-z'
 assert parse_qs(urlparse(r['captureUrl']).query).get('horizonHandoff')==['atomic']
 assert not r['errors'] and r['finalGlError']==0
 frames=r['frames']
 assert frames and frames[-1]['wallMs']>=40000
 for f in frames:
  assert f['horizonRegion'] is not None
  assert isinstance(f['horizonMissing'],list)
  assert isinstance(f['horizonWaiting'],bool)
  region=f['horizonRegion'];keys=set(f['chunkKeys'])
  absent={f'{x},{z}' for z in range(region['cz']-region['range'],region['cz']+region['range']+1) for x in range(region['cx']-region['range'],region['cx']+region['range']+1)}-keys
  assert absent<=set(f['horizonMissing']), 'Capture missed absent chunks'
 missing=[f for f in frames if f['horizonMissing']]
 waiting=[f for f in frames if f['horizonWaiting']]
 rows.append(dict(phase=r['phase'],frames=len(frames),uncoveredFrames=len(missing),waitingFrames=len(waiting),maxInstalledChunks=max(len(f['chunkKeys']) for f in frames),firstUncovered=missing[0] if missing else None))
(p/'coverage-check.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(rows,indent=2))
assert all(not r['uncoveredFrames'] for r in rows), 'Horizon hole uncovered'
assert sum(r['waitingFrames'] for r in rows)>0, 'No deferred adoption exercised'
