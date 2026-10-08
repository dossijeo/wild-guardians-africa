"""Restore unambiguous original normal bits at exact P+UV anchors only.

No image/view/face masks. New positions and ambiguous source fields are NOT
resolved by an arbitrary BVH winner, normal approximation or normal zeroing.
"""
import hashlib,json,sys
from collections import defaultdict
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot';receipt=json.loads((folder/'maize-blender-stem-budget-max-diagnostic.json').read_text(encoding='utf8'));row=receipt['rows'][0]
source=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/source['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']==source['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_05_maduro');prim=doc['meshes'][node['mesh']]['primitives'][0]
P,N,U=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']];ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridge=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'));labels=np.asarray(bridge['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])
lookup=defaultdict(dict);provenance=defaultdict(lambda:defaultdict(list))
for vertex in np.unique(ix[labels==1]):
    key=np.concatenate([P[vertex],U[vertex]]).astype(np.float32).tobytes();lookup[key][N[vertex].tobytes()]=N[vertex].copy()
    provenance[key][N[vertex].tobytes()].append(int(vertex))
original=(ROOT/row['archive']).read_bytes();assert hashlib.sha256(original).hexdigest()==row['archiveSha256'];payload=json.loads(original);before=np.asarray(payload['corners'],np.float32)
after=before.copy();restored=[];ambiguous=[];unmapped=[]
for face,label in enumerate(payload['faceLabels']):
    if label!=1:continue
    for corner,v in enumerate(before[face]):
        values=lookup.get(v[[0,1,2,6,7]].tobytes())
        if not values:unmapped.append([face,corner]);continue
        if len(values)!=1:
            key=v[[0,1,2,6,7]].tobytes()
            variants=[]
            for bits in values:
                vertices=provenance[key][bits]
                faces=np.flatnonzero((labels==1)&np.isin(ix,vertices).any(axis=1))
                variants.append(dict(normalBits=bits.hex(),originalVertexIds=vertices,originalStemFaceIds=faces.tolist()))
            ambiguous.append(dict(derivedFace=face,corner=corner,originalNormalVariants=variants));continue
        normal=next(iter(values.values()));assert np.isfinite(normal).all() and abs(np.linalg.norm(normal)-1)<1e-4
        if v[3:6].tobytes()!=normal.tobytes():after[face,corner,3:6]=normal;restored.append([face,corner])
assert before[:,:,[0,1,2,6,7]].tobytes()==after[:,:,[0,1,2,6,7]].tobytes()
assert before[np.asarray(payload['faceLabels'])!=1].tobytes()==after[np.asarray(payload['faceLabels'])!=1].tobytes()
for item in ambiguous:assert before[item['derivedFace'],item['corner']].tobytes()==after[item['derivedFace'],item['corner']].tobytes()
for face,corner in unmapped:assert before[face,corner].tobytes()==after[face,corner].tobytes()
payload['corners']=after.tolist();payload['normalFieldMethod']='ORIGINAL_NORMAL_BITS_AT_UNAMBIGUOUS_EXACT_P_UV_ANCHORS';payload['inputArchiveSha256']=row['archiveSha256'];payload['normalFieldLimitations']=['Ambiguous P+UV source normals remain original candidate values, explicitly unresolved.', 'New/moved P or UV corners retain input candidate field, not nearest-chart guesses.', 'Native normal/TBN/maps, original interpolation and image quality remain unapproved.', 'All original candidate P/UV bits, topology, labels and soil/leaf corner bits remain exact.']
data=(json.dumps(payload,separators=(',',':'))+'\n').encode();sha=hashlib.sha256(data).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.json');archive.write_bytes(data)
unique=len({v.tobytes() for v in after.reshape(-1,8)});triangles=row['proposedBilateralTriangles'];state_bytes=unique*32+triangles*3*(2 if unique<=65535 else 4)
report=dict(status='STEM_UNAMBIGUOUS_ANCHOR_NORMAL_RESTORATION_NOT_APPROVED',sourceSha256=source['sourceSha256'],inputArchiveSha256=row['archiveSha256'],archiveSha256=sha,archive=str(archive.relative_to(ROOT)).replace('\\','/'),archiveBytes=len(data),stemTriangles=row['derivedStemTriangles'],restoredCornerCount=len(restored),restoredDerivedCorners=restored,ambiguousCornerCount=len(ambiguous),ambiguousDerivedCorners=ambiguous,unmappedCornerCount=len(unmapped),unmappedDerivedCorners=unmapped,allCandidatePositionUvBitsPreserved=True,allSoilLeafBitsPreserved=True,ambiguousAndUnmappedCornersPreserved=True,proposedBilateralTriangles=triangles,triangleBudgetPass=triangles<=len(ix)*1.1,sourceStateBytes=row['sourceStateBytes'],proposedSharedStateBytes=state_bytes,uniqueFullAttributeRows=unique,indexComponentBytes=2 if unique<=65535 else 4,bufferGrowthPercent=100*(state_bytes/row['sourceStateBytes']-1),bufferBudgetPass=state_bytes<=row['sourceStateBytes']*1.1,resourceScope='One mature state P/N/UV and shared bilateral indices only; excludes category, bridges, compressed web assets, GPU allocations and draw costs.',limitations=payload['normalFieldLimitations'])
(folder/'maize-stem-anchor-normal-restoration-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps({k:report[k] for k in ['archiveSha256','restoredCornerCount','ambiguousCornerCount','unmappedCornerCount','proposedBilateralTriangles','proposedSharedStateBytes','bufferGrowthPercent']}))
