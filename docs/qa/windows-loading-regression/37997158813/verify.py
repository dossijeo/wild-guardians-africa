import hashlib
import gzip
import json
from pathlib import Path

root = Path(__file__).resolve().parent
raw = (root / 'desktop-smoke.json').read_bytes()
assert len(raw) == 3132
assert hashlib.sha256(raw).hexdigest() == 'ef2cc5850216ce29044c21d9f30d88768f098e9cf6bd84bb4a4d9baea6d48ddc'
report = json.loads(raw)
run = json.loads((root / 'run.json').read_bytes())
assert run['databaseId'] == 37997158813
assert run['headSha'] == 'ea5370cd3e446dd368b1d102a93bbc4427935c10'
assert run['status'] == 'completed' and run['conclusion'] == 'failure'
assert report['ok'] is False
assert report['checks']['loadingAtFinish']['readyGateReached'] is False
assert report['checks']['loadingAtFinish']['worldWaitMs'] == 90131.40000000002
assert report['checks']['loadingAtFinish']['displayedProgress'] == '88'
assert 'Error: Production world did not finish loading' in report['errors']
steps = {step['name']: step['conclusion'] for step in run['jobs'][0]['steps']}
assert steps['Run npm run desktop:build'] == 'success'
assert steps['Check Windows executable and installer'] == 'success'
assert steps['Smoke test the packaged game in WebView2'] == 'failure'
assert steps['Check genuine native minimization and restoration'] == 'skipped'
artifacts = json.loads((root / 'artifacts.json').read_bytes())['artifacts']
assert any(a['id'] == 11648067433 and a['name'] == 'desktop-smoke.json' and a['size_in_bytes'] == 3132 for a in artifacts)
log = gzip.decompress((root / 'full.log.gz').read_bytes())
assert len(log) == 94052
assert hashlib.sha256(log).hexdigest() == 'ba1d154c72b4330e3f86d0aed4997e1893daa19bf5d5d61f8be2849e5ad9cab0'
print('PASS: original normal-main readiness failure preserved; no visibility/GPU acceptance')
