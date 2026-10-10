from pathlib import Path
import hashlib
import json
import math
import subprocess

folder = Path(__file__).resolve().parent
root = folder.parents[3]
report = json.loads((folder / 'report.json').read_text(encoding='utf-8'))
assert report['schema'] == 'wg-animal-rig-cpu-attribution/1'
for name, expected in report['sources'].items():
    raw = (root / name).read_bytes()
    if name.startswith('src/'):
        frozen = subprocess.check_output(['git', 'show', report['source'] + ':' + name], cwd=root)
        assert frozen.replace(b'\r\n', b'\n') == raw.replace(b'\r\n', b'\n'), name
    assert hashlib.sha256(raw).hexdigest() == expected, name
assert {r['species'] for r in report['records']} == {'warthog', 'hyena', 'buffalo', 'lion', 'rhino'}
for record in report['records']:
    raw = (root / 'public' / record['url'].lstrip('/')).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == record['assetSha256']
    assert record['skins'] > 0 and record['vertices'] > 0
    assert len(record['samples']) == 8
    for index, sample in enumerate(record['samples']):
        assert sample['repetition'] == index
        assert all(math.isfinite(sample[k]) and sample[k] >= 0 for k in ['clipMs', 'rigMs'])
        assert sample['groundSamples'] > 0 and sample['boundActions'] > 0
print('PASS source/assets and bounded CPU evidence; no browser or GPU acceptance')
