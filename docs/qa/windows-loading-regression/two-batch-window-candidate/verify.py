"""Verify the CPU freeze, not native readiness or a performance benefit."""
import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
receipt = json.loads((HERE / 'source-receipt.json').read_text(encoding='utf-8'))
sha = lambda data: hashlib.sha256(data).hexdigest()
for group in ('changedSourceSha256', 'unchangedSourceSha256'):
    for name, digest in receipt[group].items():
        assert sha((ROOT / name).read_bytes()) == digest, name
for name, digest in receipt['unchangedSourceSha256'].items():
    original = subprocess.check_output(['git', 'show', f"{receipt['baseline']}:{name}"], cwd=ROOT)
    assert sha(original) == digest, name
for check in receipt['checks']:
    assert check['exitCode'] == 0, check
    if 'log' in check:
        assert sha((HERE / check['log']).read_bytes()) == check['sha256'], check['log']
text = (ROOT / 'src/rendering/loading-programs.js').read_text(encoding='utf-8')
original = subprocess.check_output(['git', 'show', f"{receipt['baseline']}:src/rendering/loading-programs.js"], cwd=ROOT).decode('utf-8')
def serial(source):
    start = source.index(' const yieldWork=loadingYieldBudget')
    return source[start:source.index('\n}\n', start)+2]
def core(source):
    start = source.index('export function compileLoadingPrograms(')
    return source[start:source.index('\n}\n')+2]
assert serial(text) == serial(original)
assert core(text) == core(original)
assert sha(serial(text).encode()) == receipt['originalSerialLoopSha256']
assert sha(core(text).encode()) == receipt['originalCompileFunctionSha256']
assert receipt['nativeEvidence'] is False
assert receipt['finalWrapper']['exitCode'] == 0
print('PASS: source hashes, original serial/core paths, check logs and CPU-only scope')
