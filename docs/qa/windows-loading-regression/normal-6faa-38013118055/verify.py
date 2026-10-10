from pathlib import Path
import json,hashlib,gzip
f=Path(__file__).resolve().parent
r=json.loads((f/'receipt.json').read_bytes())
raw=(f/'desktop-smoke-original.json').read_bytes()
assert len(raw)==r['artifactBytes'] and hashlib.sha256(raw).hexdigest()==r['artifactSha256']
a=next(a for a in json.loads((f/'artifacts-original.json').read_bytes())['artifacts'] if a['id']==r['artifact'])
assert a['size_in_bytes']==len(raw) and a['digest']=='sha256:'+r['artifactSha256']
z=(f/'full-original.log.gz').read_bytes();log=gzip.decompress(z)
assert hashlib.sha256(z).hexdigest()==r['compressedLogSha256']
assert len(log)==r['originalLogBytes'] and hashlib.sha256(log).hexdigest()==r['originalLogSha256']
run=json.loads((f/'run-original.json').read_bytes())
assert run['status']=='completed' and run['conclusion']=='failure' and run['headSha']==r['commit']
steps={s['name']:s for j in run['jobs'] for s in j['steps']}
assert steps['Run npm run desktop:build']['conclusion']=='success'
assert steps['Smoke test the packaged game in WebView2']['conclusion']=='failure'
s=json.loads(raw);p=s['checks']['loadingAtFinish']
assert not s['ok'] and not p['readyGateReached'] and p['worldWaitMs']==r['worldWaitMs']
print('PASS original artifact/API digest, retained log and terminal build/readiness state; Windows readiness failed')
