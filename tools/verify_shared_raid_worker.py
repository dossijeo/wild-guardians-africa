"""Read-only archive verification. Prints only; no self-referential output input."""
import gzip, hashlib, json, math, subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / 'docs/qa/raid-shared-worker-candidate'
r = json.loads((out / 'receipt.json').read_text(encoding='utf8'))
sha = lambda b: hashlib.sha256(b).hexdigest()
for name, expected in r['sourceHashes'].items():
    assert sha((root / name).read_bytes()) == expected, name
for name, expected in r['payloadHashes'].items():
    assert sha((out / name).read_bytes()) == expected, name
for c in r['commands']:
    tap = (out / c['log']).read_text(encoding='utf8')
    assert f"# tests {c['tests']}" in tap and '# fail 0' in tap and c['exitCode'] == 0
negative = (out / r['negative']['log']).read_text(encoding='utf8')
assert '# pass 1' in negative and '# fail 1' in negative
samples = json.loads(gzip.decompress((out / 'original/advanced-samples.json.gz').read_bytes()))
assert samples['workerCountPerRun'] == 1 and len(samples['runs']) == 3
assert samples['canonicalRadii'] == [1.1, .9, .97, .85, 1.55]
assert samples['originalNightPlanUnmodified'] and not samples['productionReady']
assert sha((root / samples['inputPath']).read_bytes()) == samples['inputGzipSHA256']
for run in samples['runs']:
    assert run['stateSHA256'] == '746c086e2df46a2857adc528eca4b56ad60baff968459964f6546f6e715aa999'
    assert run['geometryStats']['steps'] == 0 and run['geometryStats']['adopted'] == 1
    assert run['transportStats']['posted'] == run['transportStats']['replied'] == 2
    assert [x['kind'] for x in run['records']] == ['geometry', 'entry']
    assert run['records'][1]['geometryReused']
    assert all(math.isfinite(x['computeMs']) and x['computeMs'] >= 0 for x in run['records'])
    w = run['warmthDifference']
    assert all(w[k] for k in ('entryCoreExact', 'walkSegmentsPathsExact', 'individualChunksCanonical'))
    assert len(w['actualChunkKeys']) == 4 and len(w['referenceChunkKeys']) == 8
    assert w['actualChunksJsonBytes'] == 14842 and w['referenceChunksJsonBytes'] == 26484
    assert len(run['cacheMissProbes']) == 4
initial = gzip.decompress((out / 'original/initial-state.json.gz').read_bytes())
final = gzip.decompress((out / 'original/final-state.json.gz').read_bytes())
assert sha(initial) == '20566cb86fdeca91548ecf997195eb5938e099182ee93cf9ea81d76035a9f376'
assert sha(final) == '7cc578fb4475b3e5148c629f991d66bed7256ce670153d1c5197ccd975d20416'
routes = json.loads(gzip.decompress((out / 'original/route-samples.json.gz').read_bytes()))
assert len(routes) == 41 and [x['tick'] for x in routes] == list(range(41))
assert routes[-1]['snapshotSHA256'] == sha(final) and not routes[-1]['animals']
assert len(json.loads(initial)['raid']['animals']) == 12
assert json.loads(final)['raid'] is None
# Game, navigation, balance and their generated files must remain unmodified.
diff = subprocess.check_output(['git', 'diff', r['base'], '--', 'src/simulation', 'src/world/navigation.js', 'content', 'public/content'], cwd=root)
assert not diff, 'Gameplay/Navigation/balance changed'
assert not r['productionReady']
print(json.dumps({'verified': True, 'sources': len(r['sourceHashes']), 'payloads': len(r['payloadHashes']), 'finalTests': 30, 'originalExactReplyNegativeRetained': True, 'productionReady': False}))
