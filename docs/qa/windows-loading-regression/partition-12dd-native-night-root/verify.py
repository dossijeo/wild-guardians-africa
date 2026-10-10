from pathlib import Path
import gzip
import hashlib
import json

folder = Path(__file__).resolve().parent
receipt = json.loads((folder / 'receipt.json').read_text(encoding='utf-8'))
for name, row in receipt['files'].items():
    raw = (folder / name).read_bytes()
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256'], name
    if 'originalSha256' in row:
        original = gzip.decompress(raw)
        assert len(original) == row['originalBytes']
        assert hashlib.sha256(original).hexdigest() == row['originalSha256']
report = json.loads(gzip.decompress((folder / 'desktop-smoke.json.gz').read_bytes()))
assert report['ok'] is True and report['errors'] == []
visibility = report['checks']['visibility']
assert visibility['passed'] and visibility['hiddenMs'] >= 300000
assert len(visibility['hiddenStart']) == 21 and visibility['hiddenStart'] == visibility['hiddenEnd']
assert visibility['visibleMenuPauses'] == ['menu'] and visibility['resumedSimulatedSeconds'] > 0
frames = report['checks']['loadingVisual']['frames']
assert [f['label'] for f in frames] == ['initial', 'middle', 'late', 'mature']
assert frames[0]['night'] == 0 and all(f['night'] == 1 for f in frames[1:])
assert all(len(f['plants']) == 4 for f in frames)
print('PASS native night/visibility evidence and retained first-frame coverage limitation')
