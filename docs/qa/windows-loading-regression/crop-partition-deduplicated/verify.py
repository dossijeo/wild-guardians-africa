import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
receipt = json.loads((HERE / 'receipt.json').read_text(encoding='utf-8'))
for row in receipt['files']:
    data = (ROOT / row['path']).read_bytes()
    assert len(data) == row['bytes'], row['path']
    assert hashlib.sha256(data).hexdigest() == row['sha256'], row['path']
descriptor = json.loads((ROOT / 'content/manifests/crop-partition-runtime.json').read_text(encoding='utf-8'))
for row in descriptor['runtimeAssets']:
    data = (ROOT / 'public' / row['path']).read_bytes()
    assert len(data) == row['bytes']
    assert hashlib.sha256(data).hexdigest() == row['sha256']
assert sum(row['bytes'] for row in descriptor['runtimeAssets']) == 40848807
assert sum(row['afterBytes'] for row in descriptor['replaced']) == 40844796
for row in descriptor['replaced']:
    for field, digest in [('source', 'sourceSha256'), ('runtime', 'runtimeSha256')]:
        data = (ROOT / 'public' / row[field]).read_bytes()
        # The historical manifest uses the original asset's stem as SHA.
        expected = row.get(digest) or Path(row['source']).stem
        assert hashlib.sha256(data).hexdigest() == expected
models = json.loads((ROOT / 'public/content/models.json').read_text(encoding='utf-8'))
meta = json.loads((ROOT / 'public/content/crop-bridges.json').read_text(encoding='utf-8'))
assert next(row for row in models if 'Cultivos' in row['source'])['url'] == descriptor['collections']['steady']
assert meta['bakedAsset'] == descriptor['collections']['bridges']
assert len(meta['models']) == 40 and len(meta['pairs']) == 32
assert receipt['tests']['passed'] == 84
diff = json.loads((HERE / 'package-diff.json').read_text(encoding='utf-8'))
assert diff['candidateBytes'] - sum(diff['baselineSource']['files'].values()) == diff['deltaBytes']
assert diff['deltaBytes'] == 82275
print('PASS: frozen deduplicated source, logs, original/partition bytes, catalogs and official package delta; native QA still pending')
