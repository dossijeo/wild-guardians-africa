"""Verify retained native Windows reports; does not rerun Windows or prove mobile QA."""
from pathlib import Path
import hashlib
import json

folder = Path(__file__).resolve().parent
expected = {
    'desktop-smoke.json': (2649, 'fd5e9432e0298fa88ffc2223a0347b5b224d7517d2ca682e452dd4210359dd1b'),
    'desktop-visibility.json': (110024, '68d343da7f24843f9a1e969736e9cf01b4b4e6d5bb7cb895248d49a692c8b78c'),
}
reports = {}
for name, (size, digest) in expected.items():
    payload = (folder / name).read_bytes()
    assert len(payload) == size and hashlib.sha256(payload).hexdigest() == digest, name
    report = reports[name] = json.loads(payload)
    assert report['ok'] is True and report['errors'] == [], name
    checks = report['checks']
    assert checks['webgl2'] is True and checks['worker'] is True and checks['storage'] is True
    assert checks['world']['biome'] == 'gran-canon'
    assert checks['world']['culture'] == 'mapungubwe'
    assert all(url.startswith('assets/web/') and url.endswith('.glb') for url in checks['models'])

visibility = reports['desktop-visibility.json']['checks']['visibility']
assert visibility['passed'] is True
assert visibility['hiddenMs'] >= 300_000
assert len(visibility['hiddenStart']) == 21
assert visibility['hiddenStart'] == visibility['hiddenEnd']
assert visibility['visibleMenuPauses'] == ['menu']
assert abs(visibility['resumedSimulatedSeconds'] - 1) < 1e-8
assert [entry['state'] for entry in visibility['transitions']] == ['hidden', 'visible']
print('PASS original Windows hashes, native smoke, 21 unchanged simulation fields during 300.650s hidden, retained menu pause and 1s resumed simulation.')
