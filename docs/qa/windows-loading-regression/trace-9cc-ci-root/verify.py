from pathlib import Path
import gzip
import hashlib
import json

folder = Path(__file__).resolve().parent
receipt = json.loads((folder / 'receipt.json').read_text(encoding='utf-8'))
for name, expected in receipt['files'].items():
    packed = (folder / name).read_bytes()
    assert len(packed) == expected['bytes']
    assert hashlib.sha256(packed).hexdigest() == expected['sha256']
    raw = gzip.decompress(packed)
    assert len(raw) == expected['originalBytes']
    assert hashlib.sha256(raw).hexdigest() == expected['originalSha256']

def read(name):
    return json.loads(gzip.decompress((folder / (name + '.gz')).read_bytes()))

run = read('run-original.json')
assert run['head_sha'] == receipt['source']
assert run['id'] == receipt['run']
assert run['status'] == 'completed' and run['conclusion'] == 'failure'
artifact = next(a for a in read('artifacts-original.json')['artifacts'] if a['id'] == receipt['reportArtifact'])
original = receipt['files']['desktop-smoke.json.gz']
assert artifact['size_in_bytes'] == original['originalBytes']
assert artifact['digest'] == 'sha256:' + original['originalSha256']
report = read('desktop-smoke.json')
assert report['ok'] is False
assert report['checks']['loadingAtFinish']['readyGateReached'] is False
trace = report['checks']['nativeLoadingTrace']
assert trace['droppedLabels'] == trace['droppedPending'] == 0
assert {p['label'] for p in trace['pending']} == {'initial-far-region-worker', 'load-hands-ready'}
assert 'Microsoft Basic Render Driver' in trace['graphics']['unmasked']['renderer']
assert not any('warm-animal-gpu' in p['label'] for p in trace['completed'])
print('PASS original source, artifact digest and terminal negative phase evidence; no performance acceptance')
