"""Exact cost inventory for a geometry-preserving partial-sidedness alternative.

No asset change: source indices/UV/normals/faceLabels stay intact. Alternative A
uses contiguous draw groups, B filters forward index order into two groups and
needs explicit face provenance. Leaves would remain selectively DoubleSide;
this is a design alternative, not approved geometric leaf repair.
"""
import hashlib,json,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot';data=json.loads((ROOT/'public/content/crop-bridges.json').read_text())
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
names=['maiz_03_adulto','maiz_04_desarrollo','maiz_05_maduro','platano_05_maduro'];rows=[]
for name in names:
    node=next(n for n in doc['nodes'] if n.get('name')==name);model=node['extras']['cropIndex']*5+node['extras']['stage']-1
    labels=np.asarray(data['models'][model]['faceLabels']);prim=doc['meshes'][node['mesh']]['primitives'][0]
    ix=accessor(doc,binary,prim['indices']).reshape(-1,3);position=accessor(doc,binary,prim['attributes']['POSITION'])
    assert len(labels)==len(ix) and data['models'][model]['vertices']==len(position)
    front=labels<2;runs=int(1+np.count_nonzero(front[1:]!=front[:-1]))
    pairs=[]
    for pair in data['pairs']:
        if model not in [pair['a'],pair['b']]:continue
        combined=np.concatenate([np.asarray(data['models'][i]['faceLabels']) for i in [pair['a'],pair['b']]])<2
        vertices=len(combined)*3;index_width=2 if vertices<=65535 else 4
        pairs.append(dict(a=pair['a'],b=pair['b'],triangles=len(combined),frontCoreTriangles=int(combined.sum()),doubleLeafTriangles=int((~combined).sum()),
            originalOrderDrawGroups=int(1+np.count_nonzero(combined[1:]!=combined[:-1])),twoGroupAddedIndexBytes=vertices*index_width,
            originalBridgeVertexBytes=vertices*88,twoGroupBufferGrowthPercent=100*index_width/88))
    rows.append(dict(mesh=name,sourceTriangles=len(ix),frontBaseCoreTriangles=int(front.sum()),doubleLeafTriangles=int((~front).sum()),
        sourceOrderGroups=runs,twoGroupDrawCalls=2 if np.any(front) and np.any(~front) else 1,
        newTriangles=0,stateActiveGpuIndexDeltaBytes=0,stateNewIndexArrayBytes=accessor(doc,binary,prim['indices']).nbytes,bridgePairs=pairs))
out=dict(status='DESIGN_COST_DIAGNOSIS_NOT_APPROVAL',sourceSha256=receipt['sourceSha256'],bridgeDataSha256=hashlib.sha256((ROOT/'public/content/crop-bridges.json').read_bytes()).hexdigest(),meshes=rows,alternatives=[
    dict(name='Preserve source face priority',trianglesAdded=0,attributeOrIndexBytesAdded=0,drawCalls='One per contiguous Front/Double run; exact counts above.'),
    dict(name='Two draw groups',trianglesAdded=0,attributeBytesAdded=0,stateActiveGpuIndexDeltaBytes=0,newCpuIndexArrays='State replacement arrays and bridge indices counted above; keeping original owners retains old arrays too.',bridgeIndexBytes='Uint16/32 sequential index stream to partition unindexed bridge; exact counts above.',risk='Changes cross-group face priority; must reconstruct faceLabels/provenance and test coincident interfaces.')],
    limitations=['Labels0/1 designate ground/core, not proof of geometric closure or FrontSide visual correctness.',
    'True leaf surfaces would remain selectively DoubleSide; design acceptance requires user scope and GPU benefit, not topology alone.',
    'Material/program allocations and disposal of previously uploaded indices require runtime measurement; buffer counts do not establish total GPU memory.',
    'The measured GPU ceiling for all originals forced FrontSide cannot be attributed to this partial alternative.',
    'No material/group/index/asset change and no benchmark.'])
(folder/'crop-side-partition-budget.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps([dict(mesh=r['mesh'],frontTriangles=r['frontBaseCoreTriangles'],leafTriangles=r['doubleLeafTriangles'],sourceOrderGroups=r['sourceOrderGroups']) for r in rows]))
