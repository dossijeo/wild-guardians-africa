"""Freeze original QA bytes; never execute simulation or replace an archive."""
import hashlib, json, shutil, subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / 'docs/qa/raid-shared-worker-candidate'
raw = out / 'original'
raw.mkdir(parents=True, exist_ok=False)
payloads = {
    'negative-first.tap': '.cache/shared-worker-node-first.tap',
    'negative-first-test.js': '.cache/shared-worker-first-source.test.js',
    'unit-final.tap': '.cache/shared-worker-unit-final.tap',
    'worker-final.tap': '.cache/shared-worker-node-final.tap',
    'preparer-final.tap': '.cache/shared-worker-preparer-final.tap',
    'physical-final.tap': '.cache/shared-worker-physical-final.tap',
    'advanced-samples.json.gz': '.cache/shared-worker-node-final-03/samples.json.gz',
    'initial-state.json.gz': '.cache/shared-worker-physical-final-04/initial-state.json.gz',
    'final-state.json.gz': '.cache/shared-worker-physical-final-04/final-state.json.gz',
    'route-samples.json.gz': '.cache/shared-worker-physical-final-04/route-samples.json.gz',
}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for name, source in payloads.items():
    shutil.copyfile(root / source, raw / name)
paths = sorted(p for folder in ('src', 'content', 'public/content') for p in (root / folder).rglob('*') if p.is_file())
paths += [root / p for p in (
    'tests/raid-shared-worker.test.js', 'tests/raid-shared-worker-node.test.js',
    'tests/raid-shared-worker-physical.test.js', 'tests/raid-exterior-frame-prewarming.test.js',
    'tests/raid-entry-preparer.test.js', 'tools/qa-shared-raid-worker-node.mjs',
    'tools/qa-raid-entry-worker-node.mjs', 'tools/archive_shared_raid_worker.py',
    'tools/verify_shared_raid_worker.py',
)]
receipt = {
    'base': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
    'inspectedMain': 'fdb91dd5fec45cfae3ae53aafb38478c5caeecde',
    'scope': 'CPU-only experimental shared Worker, default OFF; no browser/GPU/CI/campaign/deadline acceptance',
    'sourceHashes': {p.relative_to(root).as_posix(): sha(p) for p in paths},
    'payloadHashes': {f'original/{name}': sha(raw / name) for name in payloads},
    'commands': [
        {'command': 'node --test tests/raid-shared-worker.test.js tests/raid-exterior-frame-prewarming.test.js', 'exitCode': 0, 'tests': 12, 'log': 'original/unit-final.tap'},
        {'command': 'node --test tests/raid-shared-worker-node.test.js', 'exitCode': 0, 'tests': 2, 'log': 'original/worker-final.tap'},
        {'command': 'node --test tests/raid-entry-preparer.test.js', 'exitCode': 0, 'tests': 15, 'log': 'original/preparer-final.tap'},
        {'command': 'RAID_SHARED_PHYSICAL_EVIDENCE=.cache/shared-worker-physical-final-04 node --test tests/raid-shared-worker-physical.test.js', 'exitCode': 0, 'tests': 1, 'log': 'original/physical-final.tap'},
    ],
    'negative': {'tests': 2, 'passed': 1, 'failed': 1, 'log': 'original/negative-first.tap', 'test': 'original/negative-first-test.js', 'limitation': 'First full-reply parity failure preserved. No complete early runtime provenance or separate returned reply retained; TAP contains expected/actual diff. Supplemental functional parity does not make this equality pass.'},
    'productionReady': False,
}
(out / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf8')
print(json.dumps({'sources': len(receipt['sourceHashes']), 'payloads': len(payloads), 'out': str(out)}))
