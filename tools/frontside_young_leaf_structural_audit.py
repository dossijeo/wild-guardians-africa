"""Targeted structural diagnostics; quantized boundaries are not repair gates."""
import sys,json,gzip,hashlib
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor,topology
folder=ROOT/'docs/qa/frontside-model-pilot/maize-young-leaf-pilot'
receipt=json.loads((folder/'receipt.json').read_text(encoding='utf-8-sig'))
raw,doc,bin=read_glb(ROOT/'public/assets'/(receipt['sourceSha256']+'.glb'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_02_joven');prim=doc['meshes'][node['mesh']]['primitives'][0]
p=accessor(doc,bin,prim['attributes']['POSITION']);n=accessor(doc,bin,prim['attributes']['NORMAL']);uv=accessor(doc,bin,prim['attributes']['TEXCOORD_0']);ix=accessor(doc,bin,prim['indices']).reshape(-1,3)
bridge=json.loads((ROOT/'public/content/crop-bridges.json').read_text());labels=np.array(bridge['models'][1]['faceLabels'])
data=gzip.decompress((folder/'blender-payload.json.gz').read_bytes());assert hashlib.sha256(data).hexdigest()==receipt['blenderPayloadSha256']
payload=json.loads(data);corners=np.array(payload['corners'],dtype=np.float32);new_labels=np.array(payload['faceLabels']);out=[]
for label in sorted(set(labels.tolist())):
 old=ix[labels==label];c=corners[new_labels==label];flat=c.reshape(-1,8);order=np.arange(len(flat)).reshape(-1,3)
 def details(pos,norm,index):
  used=np.unique(index);local=np.searchsorted(used,index);pos=pos[used];norm=norm[used]
  result=topology(pos,norm,local);result['zeroNormals']=int(np.sum(np.linalg.norm(norm,axis=1)<1e-8));return result
 out.append(dict(label=int(label),source=details(p,n,old),derivedForward=details(flat[:,:3],flat[:,3:6],order)))
core=np.array(payload['originalCoreFaceIds']);assert corners[:len(core)].tobytes()==np.concatenate([p[ix[core]],n[ix[core]],uv[ix[core]]],axis=2).tobytes()
report=dict(status='YOUNG_STRUCTURE_DIAGNOSIS_NOT_APPROVAL',sourceSha256=receipt['sourceSha256'],payloadSha256=receipt['blenderPayloadSha256'],sourceTargetHasSkin='skin' in node,sourceTargetMorphTargets=len(prim.get('targets',[])),sourceCorePnUvExact=True,quantizedPositionToleranceMeters=1e-5,degenerateCrossLengthDiagnostic=1e-10,regions=out,limitations=['Regional interfaces can be open internally; no caps inferred from these boundary numbers.','Quantized edge counts are diagnostics, not proof of actual coincident connectivity or FrontSide appearance.','Reversed leaves and shader back recipe are evaluated separately in runtime; this audit only inspects forward geometry.','Source region vertices are indexed and derived are per-corner; both counts exclude unreferenced lanes, but vertex totals differ by representation.'])
(folder/'structural-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps([dict(label=r['label'],sourceTriangles=r['source']['triangles'],derivedTriangles=r['derivedForward']['triangles'],sourceDegenerate=r['source']['degenerateTriangles'],derivedDegenerate=r['derivedForward']['degenerateTriangles'],sourceOpposed=r['source']['normalOpposedTriangles'],derivedOpposed=r['derivedForward']['normalOpposedTriangles']) for r in out]))

