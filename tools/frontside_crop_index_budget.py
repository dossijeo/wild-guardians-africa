"""Read-only conservative indexing budget for real procedural crop bridges.

Key=(role, source vertex ID, exact faceLabel, reverse flag): equal keys imply
identical 22 float32 shader inputs, even when different regions have coincident
positions. No welding, mesh export, state reorder or production mutation.
This is a payload estimate; map compensation and GPU time remain unverified.
"""
import hashlib,json,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

receipt=next(r for r in json.loads((ROOT/'docs/qa/frontside-model-pilot/selective-candidate-receipts.json').read_text()) if r['category']=='crops')
source_path=ROOT/'public'/receipt['source'].lstrip('/')
raw,doc,binary=read_glb(source_path)
bridge_path=ROOT/'public/content/crop-bridges.json'
bridges=json.loads(bridge_path.read_text())
selection_path=ROOT/'docs/qa/frontside-model-pilot/runtime-visibility-crop-pairs-selection.json'
selection=json.loads(selection_path.read_text())
models={}
for node in doc['nodes']:
    meta=node.get('extras',{})
    if 'cropIndex' not in meta:continue
    index=meta['cropIndex']*5+meta['stage']-1
    primitives=doc['meshes'][node['mesh']]['primitives']
    assert len(primitives)==1,'Multiple primitives require runtime-equivalent flattening'
    primitive=primitives[0]
    indices=accessor(doc,binary,primitive['indices']).reshape(-1,3)
    attrs={k:accessor(doc,binary,v) for k,v in primitive['attributes'].items()}
    assert set(attrs)=={'POSITION','NORMAL','TEXCOORD_0'}
    metadata=bridges['models'][index]
    assert len(indices)==metadata['faces'] and len(attrs['POSITION'])==metadata['vertices']
    models[index]=(indices,attrs,metadata)
assert len(models)==40

def count_pair(pair,reverse_faces):
    keys=[];triangle_provenance=[]
    for role,model in enumerate([pair['a'],pair['b']]):
        indices,attrs,meta=models[model]
        for face,vertices in enumerate(indices):
            label=meta['faceLabels'][face]
            keys.extend((role,int(v),label,0) for v in vertices)
            triangle_provenance.append((model,face,False))
    source_keys=list(keys)
    source_triangles=list(triangle_provenance)
    for model,face in reverse_faces:
        role=0 if model==pair['a'] else 1
        indices,attrs,meta=models[model]
        keys.extend((role,int(v),meta['faceLabels'][face],1) for v in indices[face,[0,2,1]])
        triangle_provenance.append((model,face,True))
    # Stable insertion keeps triangle/index order and role/faceLabel boundaries.
    def indexed_payload(sequence):
        unique={};indices=[]
        for key in sequence:
            if key not in unique:unique[key]=len(unique)
            indices.append(unique[key])
        inverse=list(unique)
        assert all(inverse[i]==key for i,key in zip(indices,sequence))
        index_width=2 if len(unique)<=65536 else 4
        return dict(vertices=len(unique),indices=len(indices),indexComponentBytes=index_width,
                    bytes=len(unique)*22*4+len(indices)*index_width)
    assert keys[:len(source_keys)]==source_keys
    assert triangle_provenance[:len(source_triangles)]==source_triangles
    return dict(a=pair['a'],b=pair['b'],sourceTriangles=len(source_triangles),
                reverseTriangles=len(reverse_faces),originalUnindexedBytes=len(source_keys)*88,
                pairUnindexedBytes=len(keys)*88,sourceIndexed=indexed_payload(source_keys),
                pairIndexed=indexed_payload(keys))

rows=[]
for pair in bridges['pairs']:
    key=f"bridgeSource/{pair['a']}-{pair['b']}"
    reverse=[tuple(map(int,s.split(':'))) for s in selection['selected'].get(key,[])]
    assert len(reverse)==len(set(reverse))
    assert all(model in (pair['a'],pair['b']) and 0<=face<len(models[model][0]) for model,face in reverse)
    row=count_pair(pair,reverse);row['selectedPilotPair']=key in selection['selected'];rows.append(row)
pilot=[r for r in rows if r['selectedPilotPair']]
def totals(group):
    original=sum(r['originalUnindexedBytes'] for r in group)
    source_indexed=sum(r['sourceIndexed']['bytes'] for r in group)
    pair_indexed=sum(r['pairIndexed']['bytes'] for r in group)
    return dict(originalUnindexedBytes=original,sourceIndexedBytes=source_indexed,
                pairIndexedBytes=pair_indexed,pairIndexedVersusOriginalPercent=100*(pair_indexed/original-1),
                cullingIncrementVersusIndexedSourcePercent=100*(pair_indexed/source_indexed-1))
report=dict(status='CONSERVATIVE_INDEX_ESTIMATE_NOT_GPU_BENCHMARK',
    sourceSha256=hashlib.sha256(raw).hexdigest(),bridgeSha256=hashlib.sha256(bridge_path.read_bytes()).hexdigest(),
    selectionSha256=hashlib.sha256(selection_path.read_bytes()).hexdigest(),allPairs=totals(rows),pilotPairs=totals(pilot),pairs=rows,
    guarantees=['Role/sourceVertexID/faceLabel/reverse tuple reconstructed exactly after stable indexing.',
        'Original triangles remain a prefix in original order; source data is not modified.',
        'No merging across source IDs, organ labels, roles or side flags, even for coincident coordinates.'],
    limitations=['This does not construct a runtime candidate or verify rendered maps/poses/states.',
        'Normal-frame XY compensation is required independently for indexed states and bridges.',
        'Float32 attribute payloads estimated from runtime 22 lanes; driver overhead and GPU residency omitted.',
        'No GPU timing: sourceIndexed must be a separate DoubleSide control to isolate the culling benefit.',
        'Source states/instance buffers/textures are excluded; full pilot budget must include them.'])
out=ROOT/'docs/qa/frontside-model-pilot/crop-index-buffer-estimate.json'
out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['status','allPairs','pilotPairs']}))
