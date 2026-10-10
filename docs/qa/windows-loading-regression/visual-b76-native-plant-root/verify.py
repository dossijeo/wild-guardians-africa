from pathlib import Path
import gzip
import hashlib
import json

folder = Path(__file__).resolve().parent
root = folder.parents[3]
receipt = json.loads((folder / 'receipt.json').read_text(encoding='utf-8'))
for name, row in receipt['files'].items():
    raw = (root / name).read_bytes()
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], name
    if 'originalSha256' in row:
        original = gzip.decompress(raw)
        assert len(original) == row['originalBytes'] and hashlib.sha256(original).hexdigest() == row['originalSha256']
ci = json.loads(gzip.decompress((folder / 'ci-smoke.json.gz').read_bytes()))
local = json.loads(gzip.decompress((folder / 'local-smoke.json.gz').read_bytes()))
assert ci['ok'] is False and not ci['checks']['loadingAtFinish']['readyGateReached']
assert local['ok'] is True and not local['errors']
visual = local['checks']['loadingVisual']
action = visual['plantAction']
assert action['attempted'] and action['beforeCount'] == 4 and action['afterCount'] == 5
assert action['logicalPlantsUnchanged'] is True and action['result']['id'] == 'loading-maize-5'
assert [f['label'] for f in visual['frames']] == ['initial', 'additional-plant', 'middle', 'late', 'mature']
assert len(visual['frames'][0]['plants']) == 4 and all(len(f['plants']) == 5 for f in visual['frames'][1:])
assert all(p['growth'] >= .999 for p in visual['frames'][-1]['plants'])
print('PASS original CI failure and local native fifth-maize evidence; physical input remains unproven')
