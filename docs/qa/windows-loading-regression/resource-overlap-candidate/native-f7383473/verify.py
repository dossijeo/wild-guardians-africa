from pathlib import Path
import json,hashlib
p=Path(__file__).resolve().parent
receipt=json.loads((p/'receipt.json').read_text(encoding='utf-8'))
for row in receipt['files']:
 data=(p/row['path']).read_bytes()
 assert len(data)==row['bytes'],row['path']
 assert hashlib.sha256(data).hexdigest()==row['sha256'],row['path']
run=json.loads((p/'run.json').read_text(encoding='utf-8'));raw=json.loads((p/'desktop-smoke.json').read_text(encoding='utf-8'))
assert run['headSha']=='f7383473745c7fdf0be4551ecf3547989e9d34b1'
assert run['status']=='completed' and run['conclusion']=='failure'
assert raw['ok'] is False and raw['errors']==['Error: Production world did not finish loading']
c=raw['checks'];assert c['loadingRecipe']=={'resourceOverlap':True}
s=c['loadingReadinessAtFinish']['readiness'];e=s['spans']['early'];assert e['dropped']==0 and len(e['rows'])==16
assert all(row['completed']==1 and row['failed']==0 for row in e['rows'])
assert s['compilation']['started']==0 and s['compilation']['droppedJobs']==0
assert s['chunks']['busy'] is True and s['chunks']['queued']==9
assert s['transfers']['pending']==0 and s['transfers']['failed']==0
steps=run['jobs'][0]['steps'];assert next(x for x in steps if x['name']=='Smoke test the packaged game in WebView2')['conclusion']=='failure'
assert next(x for x in steps if x['name']=='Check genuine native minimization and restoration')['conclusion']=='skipped'
print('PASS: original bytes, source/input selection, native failure and bounded observation scope; no promotion.')
