"""Audit whole-triangle P/UV correspondence without resolving ambiguous corners.

Exact cyclic winding is required; nearest geometry or reversed winding is never
used to assign a source face. Original and candidate archives remain unchanged.
"""
import hashlib, json, sys
from collections import defaultdict
sys.dont_write_bytecode = True
import numpy as np
from frontside_model_pilot import ROOT, read_glb, accessor

folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=json.loads((folder/'maize-stem-anchor-normal-restoration-diagnostic.json').read_text(encoding='utf8'))
source=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/source['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_05_maduro')
prim=doc['meshes'][node['mesh']]['primitives'][0]
p,n,u=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])
lookup=defaultdict(list)
for face in np.flatnonzero(labels==1):
    rows=np.concatenate([p[ix[face]],u[ix[face]]],axis=1).astype(np.float32)
    for rotation in range(3):
        order=np.roll(np.arange(3),-rotation)
        lookup[rows[order].tobytes()].append((int(face),n[ix[face]][order].copy()))
data=(ROOT/receipt['archive']).read_bytes(); assert hashlib.sha256(data).hexdigest()==receipt['archiveSha256']
payload=json.loads(data);corners=np.asarray(payload['corners'],np.float32)
matches={};counts=dict(uniqueNormalField=0,ambiguousNormalField=0,unmapped=0)
for face in np.flatnonzero(np.asarray(payload['faceLabels'])==1):
    rows=corners[face][:,[0,1,2,6,7]]
    hits=lookup.get(rows.tobytes(),[])
    distinct={normals.tobytes() for _,normals in hits}
    counts['unmapped' if not hits else 'uniqueNormalField' if len(distinct)==1 else 'ambiguousNormalField']+=1
    matches[int(face)]=dict(sourceFaceIds=sorted({f for f,_ in hits}),distinctOriginalCornerNormalFields=len(distinct))
ambiguousFaces=sorted({c['derivedFace'] for c in receipt['ambiguousDerivedCorners']})
report=dict(status='EXACT_TRIANGLE_CORRESPONDENCE_DIAGNOSTIC_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],candidateSha256=receipt['archiveSha256'],stemTriangleCounts=counts,ambiguousAnchorTriangleCorrespondence=[dict(derivedFace=f,**matches[f]) for f in ambiguousFaces],limitations=['No normal or geometry changes applied; unresolved anchor candidate remains immutable.', 'Only exact all-three-corner P/UV and cyclic forward winding qualify as source triangle identity.', 'No nearest-chart choice and no view/visibility masks; new/retriangulated faces remain unmapped.', 'Source triangle matching does not prove shader, raster, maps, bridge or GPU acceptance.'])
(folder/'maize-stem-triangle-correspondence-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
