"""Verify frozen opt-in integration sources and original CPU evidence, read-only."""
from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parent.parent
receipt = json.loads((root / 'docs/qa/raid-exterior-render-prewarming/receipt.json').read_text(encoding='utf8'))
for group in ('sourceHashes', 'payloadHashes'):
    for path, expected in receipt[group].items():
        actual = hashlib.sha256((root / path).read_bytes()).hexdigest()
        assert actual == expected, (group, path, actual, expected)
for path, expected in receipt['mainReadOnlyHashes'].items():
    data = subprocess.check_output(['git', 'show', receipt['mainReadOnlyInspected'] + ':' + path], cwd=root)
    assert hashlib.sha256(data).hexdigest() == expected, path
assert sum(c['tests'] for c in receipt['commands']) == 30
assert all(c['exitCode'] == 0 for c in receipt['commands'])
assert receipt['optionDefault'] is False and receipt['renderExecuted'] is False
assert receipt['physicalSnapshotParity']['initialStateSHA256'] == '20566cb86fdeca91548ecf997195eb5938e099182ee93cf9ea81d76035a9f376'
assert receipt['physicalSnapshotParity']['finalStateSHA256'] == '7cc578fb4475b3e5148c629f991d66bed7256ce670153d1c5197ccd975d20416'
print(json.dumps({'verified': True, 'sources': len(receipt['sourceHashes']), 'payloads': len(receipt['payloadHashes']), 'productionReady': False}))
