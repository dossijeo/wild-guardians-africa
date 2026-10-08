"""Offline stem-only derivative budget from the original training selection.

Does not read guided RGB or withheld reports; does not export or approve assets.
Includes private reversed-normal vertices and the real 22-float bridge lanes.
"""
import hashlib,json,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot'
selection_path=folder/'runtime-visibility-selection.json'
selection=json.loads(selection_path.read_text(encoding='utf8'))
bridge_path=ROOT/'public/content/crop-bridges.json'
bridges=json.loads(bridge_path.read_text(encoding='utf8'))
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
rows=[];by_model={}
for node in doc['nodes']:
    if 'mesh' not in node:continue
    e=node['extras'];model=e['cropIndex']*5+e['stage']-1
    p=doc['meshes'][node['mesh']]['primitives'][0]
    ix=accessor(doc,binary,p['indices']).reshape(-1,3)
    labels=np.asarray(bridges['models'][model]['faceLabels'])
    assert len(labels)==len(ix)
    selected=set(selection['selected'].get(node['name'],[]))
    selected.update(int(v.split(':')[1]) for v in selection['selected'].get('bridgeSource',[]) if int(v.split(':')[0])==model)
    assert all(0<=f<len(ix) for f in selected)
    faces=sorted(f for f in selected if labels[f]==1)
    verts=np.unique(ix[faces].reshape(-1)) if faces else np.array([],dtype=np.int64)
    attrs=[accessor(doc,binary,a) for a in p['attributes'].values()]
    width=sum(a.dtype.itemsize*a.shape[1] for a in attrs)
    original_bytes=sum(a.nbytes for a in attrs)+accessor(doc,binary,p['indices']).nbytes
    vertex_count=len(attrs[0]);index_width=2 if vertex_count+len(verts)<=65535 else 4
    # Controlled writer can choose this legal index width independently of
    # the source's storage. Account for replacement of all forward indices.
    candidate_bytes=original_bytes-accessor(doc,binary,p['indices']).nbytes+(len(ix)+len(faces))*3*index_width+len(verts)*width
    row=dict(mesh=node['name'],model=model,sourceTriangles=len(ix),stemTriangles=int((labels==1).sum()),selectedStemReverseFaces=faces,privateVertices=len(verts),sourceBytes=original_bytes,proposedBytes=candidate_bytes,triangleGrowthPercent=100*len(faces)/len(ix),bufferGrowthPercent=100*(candidate_bytes/original_bytes-1),triangleBudgetPass=len(faces)<=len(ix)*.1,bufferBudgetPass=candidate_bytes<=original_bytes*1.1)
    rows.append(row);by_model[model]=row
pairs=[]
for pair in bridges['pairs']:
    a,b=pair['a'],pair['b'];triangles=sum(by_model[m]['sourceTriangles'] for m in [a,b])
    backs=sum(len(by_model[m]['selectedStemReverseFaces']) for m in [a,b])
    original_bytes=triangles*3*22*4
    # Current bridge builder is unindexed. Reverses add full driver lanes;
    # grouping adds an index stream for every forward and reverse corner.
    index_width=2 if (triangles+backs)*3<=65535 else 4
    proposed=(triangles+backs)*3*(22*4+index_width)
    pairs.append(dict(a=a,b=b,sourceTriangles=triangles,reverseTriangles=backs,sourceBytes=original_bytes,proposedBytes=proposed,triangleGrowthPercent=100*backs/triangles,bufferGrowthPercent=100*(proposed/original_bytes-1),triangleBudgetPass=backs<=triangles*.1,bufferBudgetPass=proposed<=original_bytes*1.1))
report=dict(status='STEM_DERIVATIVE_COST_ONLY_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],trainingSelectionSha256=hashlib.sha256(selection_path.read_bytes()).hexdigest(),bridgeSha256=hashlib.sha256(bridge_path.read_bytes()).hexdigest(),states=rows,pairs=pairs,limitations=['Training-selected reverses are not complete angular coverage or closedness proof.', 'Does not read withheld V2 or select from its failure pixels.', 'Original defined normal/UV/driver values would be retained; private normals reversed. Their real mapped shading is still unverified.', 'Private vertex count and decoded referenced buffer bytes are estimates, not complete GPU allocation, compressed web size or GPU timings.', 'Index width reduction is separate from culling and does not repair invalid source normals.', 'No exported model, runtime activation, bridge remapping, material change or acceptance.'])
(folder/'crop-stem-reverse-budget.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(states=len(rows),pairs=len(pairs),stateTriFailures=sum(not r['triangleBudgetPass'] for r in rows),stateBytesFailures=sum(not r['bufferBudgetPass'] for r in rows),pairTriFailures=sum(not r['triangleBudgetPass'] for r in pairs),pairBytesFailures=sum(not r['bufferBudgetPass'] for r in pairs),maize=[{k:r[k] for k in ['mesh','triangleGrowthPercent','bufferGrowthPercent','privateVertices']} for r in rows if r['mesh'].startswith('maiz')])) )
