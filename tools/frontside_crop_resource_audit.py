"""Count the actual indexed-state and unindexed procedural-bridge allocations.

No renderer or assets are modified. GPU allocation estimates are buffer payloads,
not driver residency measurements or evidence of frame-time improvement.
"""
import json,sys
sys.dont_write_bytecode=True
from frontside_model_pilot import ROOT,read_glb,DTYPES,LANES
import numpy as np
source=json.loads((ROOT/'public/content/crop-bridges.json').read_text())
candidate=json.loads((ROOT/'.cache/frontside-model-pilot/candidates/crops-selective-bridges-NOT-APPROVED.json').read_text())
receipt=next(r for r in json.loads((ROOT/'docs/qa/frontside-model-pilot/selective-candidate-receipts.json').read_text()) if r['category']=='crops')
assert source['pairs']==candidate['pairs']
rows=[]
for pair in source['pairs']:
    before=sum(source['models'][i]['faces'] for i in [pair['a'],pair['b']])
    after=sum(candidate['models'][i]['faces'] for i in [pair['a'],pair['b']])
    rows.append(dict(a=pair['a'],b=pair['b'],trianglesBefore=before,trianglesAfter=after,
        bufferBytesBefore=before*3*22*4,bufferBytesAfter=after*3*22*4))
bridge_before=sum(r['bufferBytesBefore'] for r in rows)
bridge_after=sum(r['bufferBytesAfter'] for r in rows)
# All 40 indexed states and 32 bridges reserve instanceMatrix + iGrowth/iBridge.
instance_bytes=72*128*(16+4)*4
before=receipt['activeGeometryBytesBefore']+bridge_before+instance_bytes
after=receipt['activeGeometryBytesAfter']+bridge_after+instance_bytes
_,sd,_=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
_,cd,_=read_glb(ROOT/receipt['candidate'])
names={c['name'] for c in receipt['changes']}
indices={n['extras']['cropIndex']*5+n['extras']['stage']-1 for n in sd['nodes'] if n.get('name') in names}
def pilot_bytes(doc):
    accessors=set()
    for node in doc['nodes']:
        if node.get('name') not in names:continue
        for prim in doc['meshes'][node['mesh']]['primitives']:
            accessors.update([prim['indices'],*prim['attributes'].values()])
    return sum(doc['accessors'][i]['count']*np.dtype(DTYPES[doc['accessors'][i]['componentType']]).itemsize*LANES[doc['accessors'][i]['type']] for i in accessors)
pilot_rows=[r for r in rows if r['a'] in indices or r['b'] in indices]
pilot_before=pilot_bytes(sd)+sum(r['bufferBytesBefore'] for r in pilot_rows)+(len(names)+len(pilot_rows))*128*80
pilot_after=pilot_bytes(cd)+sum(r['bufferBytesAfter'] for r in pilot_rows)+(len(names)+len(pilot_rows))*128*80
report=dict(status='RESOURCE_ESTIMATE_NOT_GPU_BENCHMARK',runtime='src/rendering/crop-batch.js',
    assumptions=['MAX_PLANTS=128, all 40 indexed states and 32 bridges are allocated eagerly',
        'Bridge vertex attributes have 22 float32 lanes, 3 vertices per triangle',
        'Each source state contributes to one or two adjacent bridge buffers',
        'Texture payloads unchanged; omitted GPU driver overhead and texture allocations'],
    bridgeBytesBefore=bridge_before,bridgeBytesAfter=bridge_after,
    bridgeGrowthPercent=100*(bridge_after/bridge_before-1),
    instanceBufferBytesUnchanged=instance_bytes,
    indexedAndBridgeBufferBytesBefore=before,indexedAndBridgeBufferBytesAfter=after,
    totalBufferGrowthPercent=100*(after/before-1),pairs=rows,
    pilotSpeciesBufferBytesBefore=pilot_before,pilotSpeciesBufferBytesAfter=pilot_after,
    pilotSpeciesBufferGrowthPercent=100*(pilot_after/pilot_before-1),
    limitations=['Actual GPU residency and full renderer time remain required.',
        'A category aggregate can mask a large local transition cost; report both.',
        'This diagnoses the current union-selection approach, not all possible repairs.'])
(ROOT/'docs/qa/frontside-model-pilot/crop-runtime-buffer-estimate.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['pairs','assumptions','limitations']}))
