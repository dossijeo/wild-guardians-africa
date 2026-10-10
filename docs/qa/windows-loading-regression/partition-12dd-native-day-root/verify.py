from pathlib import Path
import gzip
import hashlib
import json

folder = Path(__file__).resolve().parent
receipt = json.loads((folder / 'receipt.json').read_text(encoding='utf-8'))
for name, row in receipt['files'].items():
    raw = (folder / name).read_bytes()
    assert len(raw) == row['bytes']
    assert hashlib.sha256(raw).hexdigest() == row['sha256'], name
    if 'originalSha256' in row:
        original = gzip.decompress(raw)
        assert len(original) == row['originalBytes']
        assert hashlib.sha256(original).hexdigest() == row['originalSha256'], name
ci = json.loads(gzip.decompress((folder / 'ci/desktop-smoke.json.gz').read_bytes()))
local = json.loads(gzip.decompress((folder / 'local/desktop-smoke.json.gz').read_bytes()))
assert ci['ok'] is False and ci['checks']['loadingAtFinish']['readyGateReached'] is False
assert local['ok'] is True and local['checks']['loadingAtFinish']['readyGateReached'] is True
assert [frame['label'] for frame in local['checks']['loadingVisual']['frames']] == ['initial', 'middle', 'late', 'mature']
assert local['checks']['loadingVisual']['closed'] is True
assert not local['checks']['loadingVisual']['errors']
print('PASS original CI failure, local native success and exact canvas evidence bytes')
