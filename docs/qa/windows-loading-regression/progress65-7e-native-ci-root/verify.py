from pathlib import Path
import json,gzip,hashlib
p=Path(__file__).resolve().parent;m=json.loads((p/'archive.json').read_text());raw={}
for f in m['files']:
 b=(p/f['path']).read_bytes();assert hashlib.sha256(b).hexdigest()==f['gzipSha256'];d=gzip.decompress(b);assert len(d)==f['rawBytes'] and hashlib.sha256(d).hexdigest()==f['rawSha256'];raw[f['path'][:-3]]=d
r=json.loads(raw['run.json']);j=json.loads(raw['job.json']);s=json.loads(raw['desktop-smoke.json'])
assert r['head_sha']==m['source'] and r['id']==m['runId'] and r['conclusion']=='failure'
assert j['id']==m['jobId'] and j['conclusion']=='failure'
assert not s['ok'] and s['errors']==['Error: Production world did not finish loading']
a=s['checks']['loadingAtFinish'];assert a['worldWaitMs']>=90000 and not a['readyGateReached'] and a['displayedProgress']=='76'
assert s['checks']['loadingRecipe']['cropPairOverlap'] is False
art=json.loads(raw['artifacts.json'])['artifacts'];official=next(a for a in art if a['name']=='desktop-smoke.json')
assert official['digest']=='sha256:'+hashlib.sha256(raw['desktop-smoke.json']).hexdigest()
print('PASS exact original negative Windows7e CI; no readiness or hidden acceptance')
