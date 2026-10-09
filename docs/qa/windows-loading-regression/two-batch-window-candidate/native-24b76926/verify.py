import hashlib
import json
import pathlib

here = pathlib.Path(__file__).resolve().parent
receipt = json.loads((here / 'receipt.json').read_text(encoding='utf-8'))
for name, record in receipt['files'].items():
    raw = (here / name).read_bytes()
    assert len(raw) == record['bytes'], name
    assert hashlib.sha256(raw).hexdigest() == record['sha256'], name
report = json.loads((here / 'desktop-smoke.json.payload').read_bytes())
run = json.loads((here / 'run.json').read_bytes())
assert run['id'] == receipt['runId'] == 38005088945
assert run['head_sha'] == receipt['source'] == '24b76926d108d39a3d8496ecd9fef063b60454bb'
assert run['status'] == 'completed' and run['conclusion'] == 'failure'
assert report['ok'] is False
assert report['checks']['loadingRecipe'] == {'compileWindow': True, 'resourceOverlap': False}
ready = report['checks']['loadingReadinessAtFinish']['readiness']
assert ready['compilation']['started'] == 0
assert ready['compilation']['windowHighWater'] == 0
assert ready['transfers']['pending'] == 56 and ready['transfers']['failed'] == 0
assert ready['spans']['early']['dropped'] == 0
assert len(ready['spans']['early']['rows']) == 16
assert report['checks']['loadingAtFinish']['readyGateReached'] is False
print('PASS: original raw/log/metadata hashes, exact source/flags, failure and unexercised window')
