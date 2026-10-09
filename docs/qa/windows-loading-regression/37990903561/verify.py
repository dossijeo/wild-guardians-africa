import hashlib,json
from pathlib import Path
p=Path(__file__).resolve().parent
for name,record in json.loads((p/'receipt.json').read_text()).items():
 data=(p/name).read_bytes()
 assert len(data)==record['bytes'],name
 assert hashlib.sha256(data).hexdigest()==record['sha256'],name
raw=(p/'desktop-smoke.json').read_bytes()
assert len(raw)==30435
assert hashlib.sha256(raw).hexdigest()=='6e1751ed5b9ec4645c2930ea8888ebb040393c5921ec2d59038e7efde1d6c81c'
r=json.loads(raw);run=json.loads((p/'run.json').read_text())
assert run['databaseId']==37990903561 and run['status']=='completed' and run['conclusion']=='failure'
assert run['headSha']=='1cc3d0b730fa24c7ad23dd2ffe7534c2c7a9d276'
assert r['ok'] is False and r['errors']==['Error: Production world did not finish loading']
c=r['checks'];f=c['loadingAtFinish'];s=c['loadingReadinessAtFinish']['readiness']
assert f['readyGateReached'] is False and f['displayedProgress']=='85'
assert 90000<=f['worldWaitMs']<91000 and f['visibility']=='visible' and f['focused'] is True
assert s['transfers']['count']==242 and s['transfers']['pending']==s['transfers']['failed']==0
assert s['chunks']['desired']==25 and s['chunks']['queued']==s['chunks']['failed']==0 and s['chunks']['busy'] is False
x=s['compilation'];assert (x['started'],x['completed'],x['rejected'],x['droppedJobs'],x['droppedIdentities'],x['faults'])==(10,9,0,0,0,0)
j=x['active'][0];assert len(x['active'])==1 and j['phase']=='warm-compile-world'
b=j['context']['batch'];assert (b['ordinal'],b['batches'],b['start'],b['end'],b['objects'])==(6,78,40,48,617)
assert j['pendingIds']==[19] and j['pendingCount']==1 and j['pendingIdsOmitted']==j['associationOmitted']==b['namesOmitted']==0
assert len(j['associations'])==8 and all(a['cacheKeyTruncated'] is False for a in j['associations'])
pending=[a for a in j['associations'] if a['programId']==19]
assert len(pending)==6 and all(a['materialType']=='MeshStandardMaterial' and 'bioma-local-bridge-pbr-v3|' in a['cacheKey'] and a['cacheKey'].endswith('|resident') for a in pending)
assert s['spans']['lastCompleted']['label']=='loading-compile-submit'
assert s['actors'] is None and s['far'] is None
assert 'Microsoft Basic Render Driver' in c['loadingReadinessAtFinish']['context']['unmaskedRenderer']
print('PASS: official bytes, source/run, original failure, bounded job/recipe associations and archive hashes')
