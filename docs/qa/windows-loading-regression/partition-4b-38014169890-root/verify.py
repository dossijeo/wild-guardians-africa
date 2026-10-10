from pathlib import Path
import json,hashlib,gzip
p=Path(__file__).resolve().parent
r=json.loads((p/'receipt.json').read_bytes())
for name,expected in r['files'].items():
    b=(p/name).read_bytes()
    assert len(b)==expected['bytes'] and hashlib.sha256(b).hexdigest()==expected['sha256'],name
meta=json.loads((p/'artifacts-original.json').read_bytes())
for name in ['desktop-smoke.json','desktop-visibility.json','windows-canyon.png']:
    a=next(a for a in meta['artifacts'] if a['name']==name);b=(p/name).read_bytes()
    assert a['size_in_bytes']==len(b) and a['digest']=='sha256:'+hashlib.sha256(b).hexdigest()
run=json.loads((p/'run-original.json').read_bytes());job=json.loads((p/'job-original.json').read_bytes())
assert run['head_sha']==r['commit'] and run['status']=='completed' and run['conclusion']=='success'
assert job['id']==r['job'] and job['conclusion']=='success'
for name in ['Smoke test the packaged game in WebView2','Check genuine native minimization and restoration']:
    assert next(s for s in job['steps'] if s['name']==name)['conclusion']=='success'
log=gzip.decompress((p/'full-original.log.gz').read_bytes())
assert len(log)==r['originalLogBytes'] and hashlib.sha256(log).hexdigest()==r['originalLogSha256']
s=json.loads((p/'desktop-smoke.json').read_bytes());v=json.loads((p/'desktop-visibility.json').read_bytes())
assert s['ok'] and not s['errors'] and v['ok'] and not v['errors']
recipe=s['checks']['loadingRecipe'];assert recipe['cropPartition'] and sum(bool(x) for x in recipe.values())==1
a=s['checks']['loadingAtFinish'];assert a['readyGateReached'] and a['worldWaitMs']==70924
x=v['checks']['visibility'];assert x['passed'] and x['hiddenMs']>=300000 and x['resumedSimulatedSeconds']>0
print('PASS original API digests, exact run, native readiness and genuine hidden/restoration; bounded single-run evidence')
