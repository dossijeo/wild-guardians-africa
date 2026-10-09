from pathlib import Path
import json,hashlib
root=Path(__file__).parent
receipt=json.loads((root/'receipt.json').read_bytes())
for name,row in receipt['files'].items():
 data=(root/name).read_bytes();assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256'],name
run=json.loads((root/'run.json').read_bytes());raw=json.loads((root/'desktop-smoke.json').read_bytes())
assert run['headSha']==receipt['source'] and run['status']=='completed' and run['conclusion']=='failure'
assert raw['ok'] is False and raw['errors']==['Error: Production world did not finish loading']
assert raw['checks']['loadingAtFinish']['readyGateReached'] is False
if receipt['runId']==38002516951:
 dispatch=json.loads((root/'dispatch.json').read_bytes());assert dispatch['source']==receipt['source'] and dispatch['inputs']=={'resource_overlap':False}
 r=raw['checks']['loadingReadinessAtFinish']['readiness'];assert r['transfers']['gltf']['count']==8 and r['transfers']['gltf']['omitted']==0
 assert r['hands']['loaded']==6 and r['chunks']['queued']==0 and r['chunks']['waiterCount']==0
 assert r['compilation']['active'][0]['pendingIds']==[20]
 for row in r['transfers']['gltf']['rows']:
  assert row['association']=='heuristic-url-window' and row['unknownReason'] is None
  assert abs(row['duration']-row['untilResponseEnd']-row['afterResponseEnd'])<.001
print('PASS: exact official bytes, source, terminal failure and scoped observed evidence')
