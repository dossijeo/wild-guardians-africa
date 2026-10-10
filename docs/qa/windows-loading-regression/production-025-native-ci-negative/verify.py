from pathlib import Path
import gzip
import hashlib
import json

p = Path(__file__).resolve().parent
manifest = json.loads((p / 'archive.json').read_text())
raw = {}
for entry in manifest['files']:
    packed = (p / entry['name']).read_bytes()
    assert hashlib.sha256(packed).hexdigest() == entry['gzipSha256']
    content = gzip.decompress(packed)
    assert len(content) == entry['rawBytes']
    assert hashlib.sha256(content).hexdigest() == entry['rawSha256']
    raw[entry['name'][:-3]] = content
run, job, report = (json.loads(raw[name]) for name in ('run.json', 'job.json', 'desktop-smoke.json'))
assert run['id'] == manifest['runId'] and job['id'] == manifest['jobId']
assert run['head_sha'] == job['head_sha'] == manifest['source']
assert run['status'] == job['status'] == 'completed'
assert run['conclusion'] == job['conclusion'] == 'failure'
assert report['ok'] is False
assert report['errors'] == ['Error: Production world did not finish loading']
loading = report['checks']['loadingAtFinish']
assert loading['worldWaitMs'] >= 90000 and loading['displayedProgress'] == '85'
assert loading['readyGateReached'] is False and loading['stageBusy'] == 'true'
assert len(report['checks']['models']) == 24
steps = {step['name']: step['conclusion'] for step in job['steps']}
assert steps['Run npm run desktop:build'] == 'success'
assert steps['Check Windows executable and installer'] == 'success'
assert steps['Smoke test the packaged game in WebView2'] == 'failure'
assert steps['Check genuine native minimization and restoration'] == 'skipped'
artifact = next(item for item in json.loads(raw['artifacts.json'])['artifacts'] if item['name'] == 'desktop-smoke.json')
assert artifact['digest'] == 'sha256:' + hashlib.sha256(raw['desktop-smoke.json']).hexdigest()
print('PASS exact production025 native readiness negative; preflight causal effect unmeasured')
