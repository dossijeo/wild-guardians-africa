"""Freeze already terminal experimental CPU results; never run simulation."""
import hashlib, json, shutil
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'docs/qa/raid-worker-local-continuations'
raw=out/'original'
raw.mkdir(parents=True,exist_ok=False)
files={
 'unit-final.tap':'.cache/local-unit-final.tap',
 'worker-final.tap':'.cache/local-node-final-04.tap',
 'preparer-final.tap':'.cache/local-preparer-final.tap',
 'physical-final.tap':'.cache/local-physical-final.tap',
 'advanced-samples.json.gz':'.cache/local-node-final-04/samples.json.gz',
 'initial-state.json.gz':'.cache/local-physical-final/initial-state.json.gz',
 'final-state.json.gz':'.cache/local-physical-final/final-state.json.gz',
 'route-samples.json.gz':'.cache/local-physical-final/route-samples.json.gz',
 'fair-first-samples.json.gz':'.cache/local-node-fair-03/samples.json.gz',
 'fair-first.tap':'.cache/local-node-fair-03.tap',
}
for name,source in files.items():shutil.copyfile(root/source,raw/name)
for folder in ('local-timer-negative','local-port-negative'):shutil.copytree(root/'.cache'/folder,raw/folder)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources=sorted(p for folder in ('src','content','public/content','tests/fixtures/native-boundary-81943608') for p in (root/folder).rglob('*') if p.is_file())
sources += [root/p for p in (
 'tests/raid-worker-local-node.test.js','tests/raid-worker-local-continuations.test.js',
 'tests/raid-shared-worker-physical.test.js','tests/raid-shared-worker.test.js',
 'tests/raid-exterior-frame-prewarming.test.js','tests/raid-entry-preparer.test.js',
 'tools/qa-shared-raid-worker-node.mjs','tools/qa-raid-entry-worker-node.mjs',
 'tools/archive_raid_worker_local.py','tools/verify_raid_worker_local.py')]
r={
 'base':'6d885581','control':'7900a94bbbe84bf839fed9ca0a52ae62846d2d2b',
 'scope':'One actual Node Worker with local continuous geometry tasks; CPU descriptive only, OFF, not browser/frame/deadline/net-performance acceptance',
 'sourceHashes':{p.relative_to(root).as_posix():sha(p) for p in sources},
 'payloadHashes':{p.relative_to(out).as_posix():sha(p) for p in raw.rglob('*') if p.is_file()},
 'commands':[
  {'command':'node --test tests/raid-worker-local-continuations.test.js tests/raid-shared-worker.test.js tests/raid-exterior-frame-prewarming.test.js','tests':17,'exitCode':0,'log':'original/unit-final.tap'},
  {'command':'node --test tests/raid-worker-local-node.test.js','tests':2,'exitCode':0,'log':'original/worker-final.tap'},
  {'command':'node --test tests/raid-entry-preparer.test.js','tests':15,'exitCode':0,'log':'original/preparer-final.tap'},
  {'command':'RAID_SHARED_PHYSICAL_EVIDENCE=.cache/local-physical-final node --test tests/raid-shared-worker-physical.test.js','tests':1,'exitCode':0,'log':'original/physical-final.tap'},
 ],
 'productionReady':False,
 'negativeArchives':['docs/qa/raid-shared-worker-candidate/original/negative-first.tap','docs/qa/raid-shared-worker-priority/roundtrip-negative','original/local-timer-negative','original/local-port-negative'],
}
(out/'receipt.json').write_bytes((json.dumps(r,indent=2)+'\n').encode())
print(json.dumps({'sources':len(r['sourceHashes']),'payloads':len(r['payloadHashes'])}))
