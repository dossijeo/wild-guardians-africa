"""Original body accessor ranges, read-only; no pose, view or repair selection."""
import hashlib,json,sys
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='youngMale')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='Mesh_0') if any(n.get('name')=='Mesh_0' for n in doc['nodes']) else next(n for n in doc['nodes'] if n.get('name')=='Mesh0')
prim=doc['meshes'][node['mesh']]['primitives'][0]
arrays={name:accessor(doc,binary,index) for name,index in prim['attributes'].items()}
rows={name:dict(dtype=str(a.dtype),count=len(a),lanes=a.shape[1],finite=bool(np.isfinite(a).all()),minimum=a.min(axis=0).tolist(),maximum=a.max(axis=0).tolist()) for name,a in arrays.items()}
N=arrays['NORMAL'].astype(float);norm=np.linalg.norm(N,axis=1)
normal=dict(zeroLength=int((norm==0).sum()),nonfinite=int((~np.isfinite(norm)).sum()),minLength=float(norm.min()),maxLength=float(norm.max()),unitErrorThreshold=1e-4,nonunitBeyondThreshold=int((np.abs(norm-1)>1e-4).sum()))
tangent=None
if 'TANGENT' in arrays:
    T=arrays['TANGENT'].astype(float);length=np.linalg.norm(T[:,:3],axis=1)
    crossLength=np.linalg.norm(np.cross(N,T[:,:3]),axis=1)
    tangent=dict(zeroLength=int((length==0).sum()),nonfinite=int((~np.isfinite(T)).sum()),minLength=float(length.min()),maxLength=float(length.max()),maxAbsNormalDot=float(np.abs(np.einsum('ij,ij->i',N,T[:,:3])).max()),minNormalTangentCrossLength=float(crossLength.min()),handednessValues=np.unique(T[:,3]).tolist())
ix=accessor(doc,binary,prim['indices']).reshape(-1,3);uv=arrays['TEXCOORD_0'][ix].astype(float);a=uv[:,1]-uv[:,0];b=uv[:,2]-uv[:,0];det=a[:,0]*b[:,1]-a[:,1]*b[:,0]
weights=arrays.get('WEIGHTS_0');skinWeights=None
if weights is not None:
    w=weights.astype(float);descriptor=doc['accessors'][prim['attributes']['WEIGHTS_0']]
    if descriptor.get('normalized'):w/=np.iinfo(weights.dtype).max
    sums=w.sum(axis=1);skinWeights=dict(normalizedAccessor=descriptor.get('normalized',False),minWeight=float(w.min()),maxWeight=float(w.max()),minSum=float(sums.min()),maxSum=float(sums.max()),sumErrorThreshold=1e-4,sumErrorBeyondThreshold=int((np.abs(sums-1)>1e-4).sum()))
report=dict(status='ORIGINAL_BODY_CPU_INPUT_RANGES_NOT_APPROVAL',sourceSha256=receipt['sourceSha256'],node=node['name'],skin=node.get('skin'),bodyAlreadyFrontSideInRuntime=True,triangles=len(ix),attributes=rows,normal=normal,tangent=tangent,uvTriangles=dict(zeroDeterminant=int((det==0).sum()),minAbsDeterminant=float(np.abs(det).min()),maxAbsDeterminant=float(np.abs(det).max())),skinWeights=skinWeights,limitations=['Original lossless GLB accessors only, not posed/skinned/interpolated GPU values or actual texture texels.', 'No source geometry, weights, joint indices, shaders, materials, rig or clips changed.', 'No heldout view or face-specific mask used; whole raw body inventory only.', 'Finite/nonzero raw normal/tangent data cannot rule out per-fragment TBN/normal-map/environment singularities or driver behavior.', 'Body already uses FrontSide in the actual game; it cannot be credited as a new culling gain.'])
(folder/'worker-original-body-input-ranges.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['node','triangles','normal','tangent','uvTriangles','skinWeights']}))
