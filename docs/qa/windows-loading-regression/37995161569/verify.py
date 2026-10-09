import json,hashlib
from pathlib import Path
p=Path(__file__).resolve().parent
for name,record in json.loads((p/'receipt.json').read_text(encoding='utf-8')).items():
 data=(p/name).read_bytes();assert len(data)==record['bytes'],name;assert hashlib.sha256(data).hexdigest()==record['sha256'],name
raw=(p/'desktop-smoke.json').read_bytes();assert len(raw)==36598;assert hashlib.sha256(raw).hexdigest()=='89e518e1ea4a5e67f93c4f8bc9051373d46a9b2afc99f2e46b7e153e82a4669a'
r=json.loads(raw);run=json.loads((p/'run.json').read_text());assert run['databaseId']==37995161569 and run['status']=='completed' and run['conclusion']=='failure';assert run['headSha']=='077987008d30075cdec9061b87a3387d0263dbd3'
assert r['ok'] is False and r['errors']==['Error: Production world did not finish loading']
c=r['checks'];f=c['loadingAtFinish'];s=c['loadingReadinessAtFinish']['readiness'];assert f['readyGateReached'] is False and f['displayedProgress']=='85' and 90000<f['worldWaitMs']<91000
assert f['focused'] and f['visibility']=='visible' and f['stageBusy']=='true'
e=s['spans']['early'];assert e['dropped']==0 and len(e['rows'])==16;assert all(row['completed']==1 and row['failed']==0 for row in e['rows']);labels={row['label']:row for row in e['rows']}
assert labels['app-prepared-pending']['lastDuration']==27108;assert abs(labels['app-pre-world-setup']['lastDuration']-5774.6)<.01
assert labels['diorama-prepare-maize-model']['firstStart']<labels['diorama-prepare-maize-bridges']['lastEnd'] and labels['diorama-prepare-maize-bridges']['firstStart']<labels['diorama-prepare-maize-model']['lastEnd']
j=s['compilation']['active'][0];assert j['phase']=='warm-compile-world' and j['pendingIds']==[19] and j['pendingCount']==1;assert j['context']['batch']['ordinal']==6 and j['context']['batch']['batches']==80 and j['context']['batch']['objects']==637
assert (s['compilation']['started'],s['compilation']['completed'],s['compilation']['droppedJobs'],s['compilation']['droppedIdentities'],s['compilation']['faults'])==(10,9,0,0,0)
assert all(not row['cacheKeyTruncated'] for row in j['associations']);assert len([row for row in j['associations'] if row['programId']==19 and 'bioma-local-bridge-pbr-v3|' in row['cacheKey']])==6
assert s['transfers']['count']==242 and s['transfers']['pending']==s['transfers']['failed']==0;assert s['chunks']['desired']==25 and s['chunks']['queued']==0 and s['chunks']['busy'] is False
assert 'Microsoft Basic Render Driver' in c['loadingReadinessAtFinish']['context']['unmaskedRenderer']
steps=run['jobs'][0]['steps'];assert next(row for row in steps if row['name']=='Smoke test the packaged game in WebView2')['conclusion']=='failure';assert next(row for row in steps if row['name']=='Check genuine native minimization and restoration')['conclusion']=='skipped'
print('PASS: official raw/hash/source, original90s failure, early16/dropped0, overlapping models, bounded pending job and archive receipts')
