"""Read-only terminal/source verifier; no generated output is an input."""
import gzip,hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'docs/qa/raid-worker-local-continuations'
r=json.loads((out/'receipt.json').read_bytes())
sha=lambda b:hashlib.sha256(b).hexdigest()
for p,h in r['sourceHashes'].items():assert sha((root/p).read_bytes())==h,p
for p,h in r['payloadHashes'].items():assert sha((out/p).read_bytes())==h,p
for c in r['commands']:
 t=(out/c['log']).read_text(encoding='utf8');assert f"# tests {c['tests']}" in t and '# fail 0' in t and c['exitCode']==0
# Verify earlier frozen payloads against their immutable receipts, not current
# modules. No historical failure is made passing by the supplemental tests.
for folder,source in [('raid-shared-worker-candidate',r['control']),('raid-shared-worker-priority/roundtrip-negative',r['base'])]:
 old=root/'docs/qa'/folder;receipt=json.loads((old/'receipt.json').read_bytes())
 for p,h in receipt['payloadHashes'].items():assert sha((old/p).read_bytes())==h,p
 for p,h in receipt['sourceHashes'].items():assert sha(subprocess.check_output(['git','show',source+':'+p],cwd=root))==h,p
for folder in ('local-timer-negative','local-port-negative'):
 old=out/'original'/folder;manifest=json.loads((old/'hashes.json').read_bytes())
 for p,h in manifest.items():assert sha((old/p).read_bytes())==h,p
 t=(old/'node.tap').read_text(encoding='utf8');assert '# pass 1' in t and '# fail 1' in t
d=json.loads(gzip.decompress((out/'original/advanced-samples.json.gz').read_bytes()))
assert d['workerCountPerRun']==1 and len(d['runs'])==3 and not d['productionReady']
assert d['canonicalRadii']==[1.1,.9,.97,.85,1.55]
assert sha((root/d['inputPath']).read_bytes())==d['inputGzipSHA256']
for q in d['runs']:
 assert q['stateSHA256']=='746c086e2df46a2857adc528eca4b56ad60baff968459964f6546f6e715aa999'
 assert q['geometryStats']['steps']==0 and q['geometryStats']['adopted']==1
 assert q['transportStats']['posted']==q['transportStats']['replied']==2
 assert q['transportStats']['suspensions']==1 and q['transportStats']['resumes']==0
 assert [a['kind'] for a in q['records']]==['entry','geometry']
 assert not q['records'][0]['geometryReused']
 m=q['records'][1]['geometryMetrics'];assert m['steps']==89220
 assert sum(m['stepHistogram'].values())==m['steps'] and sum(m['sliceHistogram'].values())==m['slices']
 assert m['maxStepPhase']=='boundary-props-scatter' and m['maxStepMs']>2
 w=q['warmthDifference'];assert w['fullReplyExact'] and w['individualChunksCanonical'] and w['entryCoreExact'] and w['walkSegmentsPathsExact']
 assert w['actualChunkKeys']==w['referenceChunkKeys'] and len(w['actualChunkKeys'])==8
 assert w['actualChunksJsonBytes']==w['referenceChunksJsonBytes']==26484
 assert not q['cacheMissProbes']
initial=gzip.decompress((out/'original/initial-state.json.gz').read_bytes());final=gzip.decompress((out/'original/final-state.json.gz').read_bytes())
assert sha(initial)=='20566cb86fdeca91548ecf997195eb5938e099182ee93cf9ea81d76035a9f376'
assert sha(final)=='7cc578fb4475b3e5148c629f991d66bed7256ce670153d1c5197ccd975d20416'
routes=json.loads(gzip.decompress((out/'original/route-samples.json.gz').read_bytes()));assert len(routes)==41 and [a['tick'] for a in routes]==list(range(41))
assert routes[-1]['snapshotSHA256']==sha(final) and not routes[-1]['animals']
assert len(json.loads(initial)['raid']['animals'])==12 and json.loads(final)['raid'] is None
assert not subprocess.check_output(['git','diff',r['control'],'--','src/simulation','src/world/navigation.js','content','public/content'],cwd=root)
assert not r['productionReady']
print(json.dumps({'verified':True,'sources':len(r['sourceHashes']),'payloads':len(r['payloadHashes']),'finalTests':35,'negativeArchivesRetained':True,'productionReady':False}))
