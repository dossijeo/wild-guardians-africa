"""Read-only independent recomputation from all retained controller samples."""
from pathlib import Path
import hashlib
import gzip
import json
import math

root = Path(__file__).resolve().parent.parent
folder = root / 'docs/qa/raid-exterior-render-prewarming/advanced-controller-cpu'
receipt = json.loads((folder / 'receipt.json').read_text(encoding='utf8'))
for group in ('sourceHashes', 'payloadHashes'):
    for path, expected in receipt[group].items():
        assert hashlib.sha256((root / path).read_bytes()).hexdigest() == expected, path
report = json.loads(gzip.decompress((folder / 'original/samples.json.gz').read_bytes()))
input_path = root / report['inputPath']
assert hashlib.sha256(input_path.read_bytes()).hexdigest() == report['inputGzipSHA256'] == '1b0f1a153aaf9c7adcb91b394d232886016124316570f3e90df01bb280bb4a0b'
assert report['initialStateSHA256'] == report['finalStateSHA256']
assert report['implementationSource'] == receipt['implementationSource']
assert report['walls'] == 103 and report['livingCrops'] == 865
assert report['geometryStats']['jobs'] == report['geometryStats']['adopted'] == 1
assert report['geometryStats']['steps'] == 89220
rows = report['rows']
assert [r['index'] for r in rows] == list(range(len(rows)))
for stage, field in [('preparation', 'preparation'), ('already-prepared', 'alreadyPrepared')]:
    selected = [r for r in rows if r['stage'] == stage]
    assert selected
    for metric in ('frame', 'update', 'pump'):
        values = [r[metric + 'Ms'] for r in selected]
        assert all(math.isfinite(v) and v >= 0 for v in values)
        ordered = sorted(values)
        expected = report[field][metric]
        assert expected['samples'] == len(values)
        assert expected['soft2msViolations'] == sum(v > 2 for v in values)
        for name, actual in [('totalMs', sum(values)), ('maxMs', max(values))] + [(f'p{int(p*100)}Ms', ordered[math.ceil(p * len(ordered)) - 1]) for p in (.5, .9, .95, .99)]:
            assert abs(actual - expected[name]) < 1e-8, (stage, metric, name)
steady = [r for r in rows if r['stage'] == 'already-prepared']
assert len(steady) == 120
assert all(r['statusBefore'] == r['statusAfter'] == 'prepared' and r['stepsBefore'] == r['stepsAfter'] == 89220 for r in steady)
assert receipt['exitCode'] == 0 and receipt['renderExecuted'] is False
print(json.dumps({'verified': True, 'sources': len(receipt['sourceHashes']), 'payloads': len(receipt['payloadHashes']), 'rows': len(rows), 'productionReady': False}))
