from pathlib import Path
import gzip
import hashlib
import json

folder = Path(__file__).resolve().parent
receipt = json.loads((folder / 'receipt.json').read_text())
for name, row in receipt['files'].items():
    raw = (folder / name).read_bytes()
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], name
    if 'originalSha256' in row:
        original = gzip.decompress(raw)
        assert len(original) == row['originalBytes'] and hashlib.sha256(original).hexdigest() == row['originalSha256'], name

def read(name):
    return json.loads(gzip.decompress((folder / (name + '.gz')).read_bytes()))

run = read('run-original.json')
assert run['head_sha'] == receipt['source'] and run['id'] == receipt['run']
assert run['status'] == 'completed' and run['conclusion'] == 'success'
job = read('job-original.json')
assert job['id'] == receipt['job'] and job['conclusion'] == 'success'
artifacts = read('artifacts-original.json')['artifacts']
for name in ['desktop-smoke.json', 'desktop-visibility.json', 'windows-canyon.png']:
    artifact = next(a for a in artifacts if a['name'] == name)
    assert artifact['workflow_run']['head_sha'] == receipt['source']
    row = receipt['files'].get(name + '.gz', receipt['files'].get(name))
    assert artifact['digest'] == 'sha256:' + row.get('originalSha256', row['sha256'])
    assert artifact['size_in_bytes'] == row.get('originalBytes', row['bytes'])
smoke = read('desktop-smoke.json')
visibility = read('desktop-visibility.json')
for report in [smoke, visibility]:
    assert report['ok'] is True and not report['errors']
    assert report['checks']['loadingAtFinish']['readyGateReached'] is True
trace = smoke['checks']['nativeLoadingTrace']
assert smoke['checks']['loadingRecipe']['cropPairOverlap'] is True
assert trace['droppedLabels'] == trace['droppedPending'] == 0
assert trace['graphics']['available'] is True
join = [p for p in trace['completed'] if p['label'] == 'load-crop-pair-join']
assert len(join) == 1 and join[0]['failed'] == 0
assert visibility['checks']['loadingRecipe']['cropPairOverlap'] is False
hidden = visibility['checks']['visibility']
assert hidden['passed'] is True and hidden['hiddenMs'] >= 300000
assert len(hidden['hiddenStart']) == 21 and hidden['hiddenStart'] == hidden['hiddenEnd']
assert hidden['visibleMenuPauses'] == ['menu'] and hidden['resumedSimulatedSeconds'] > 0
print('PASS official source/digests, selected join and unchanged native visibility; no causal AB performance claim')
