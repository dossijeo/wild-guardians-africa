"""Read-only verifier; never writes into the frozen payloads or receipt."""
from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parent.parent
receipt = json.loads((root / 'docs/qa/raid-exterior-cooperative-prototype/receipt.json').read_text())
for group in ('sourceHashes', 'payloadHashes'):
    for path, expected in receipt[group].items():
        actual = hashlib.sha256((root / path).read_bytes()).hexdigest()
        assert actual == expected, (group, path, actual, expected)
for path, expected in receipt['originalBaselineBlobSHA256'].items():
    original = subprocess.check_output(['git', 'show', receipt['base'] + ':' + path], cwd=root)
    assert hashlib.sha256(original).hexdigest() == expected, path
assert sum(c['tests'] for c in receipt['commands']) == 52
assert all(c['exitCode'] == 0 for c in receipt['commands'])
assert receipt['advancedFinalSample']['stats']['adopted'] == 1
assert receipt['advancedFinalSample']['productionReady'] is False
assert receipt['physicalFinalSample']['initialStateSHA256'] == '20566cb86fdeca91548ecf997195eb5938e099182ee93cf9ea81d76035a9f376'
assert receipt['physicalFinalSample']['finalStateSHA256'] == '7cc578fb4475b3e5148c629f991d66bed7256ce670153d1c5197ccd975d20416'
print(json.dumps({'verified': True, 'sources': len(receipt['sourceHashes']), 'payloads': len(receipt['payloadHashes']), 'productionReady': False}))
