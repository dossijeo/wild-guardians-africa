"""Partial geometry draft with explicit original fallback and source domains.

No camera-driven face selection, shader implementation or runtime promotion.
"""
import sys,json,hashlib,math
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT
from frontside_surface_charts import collapse_interior_geometry

folder=ROOT/'docs/qa/frontside-model-pilot'
seams=json.loads((folder/'crop-maize-seam-domain-audit.json').read_text())
geometry=json.loads((folder/'crop-maize-global-boundary-draft.json').read_text())
source_file=folder/'maize-mature-global-boundary-draft.npz'
domain_file=folder/'maize-mature-seam-domains.npz'
assert hashlib.sha256(source_file.read_bytes()).hexdigest()==geometry['payloadSha256']
assert hashlib.sha256(domain_file.read_bytes()).hexdigest()==seams['payloadSha256']
with np.load(source_file,allow_pickle=False) as data:
    original={k:data[k].copy() for k in ['originalPosition','originalNormal','originalUv','originalIndices','originalLabels','sourceFaceChart']}
with np.load(domain_file,allow_pickle=False) as data:
    domain=data['sourceDomain'].copy();supported=data['sourceSupported'].copy()
p=original['originalPosition'];ix=original['originalIndices']
fallback=np.flatnonzero(supported==0).astype(np.uint32)
target=(math.floor(len(ix)*1.1)-len(fallback))//2
Q=[];U=[];J=[];corners=[];input_source_faces=[];input_charts=[]
for chart in seams['charts']:
    if chart.get('parameterization',{}).get('status')!='DISK_PARAMETER_DRAFT_NOT_FIELD_ACCEPTANCE':continue
    offset=len(Q)
    for identities in chart['originalCorners']:
        f,lane,sv=identities[0];position=p[sv];coordinate=domain[f,lane]
        assert all(np.array_equal(position,p[v]) and np.array_equal(coordinate,domain[face,corner]) for face,corner,v in identities)
        Q.append(tuple(map(float,position)));U.append(tuple(map(float,coordinate)));corners.append(identities)
    J.extend(tuple(v+offset for v in tri) for tri in chart['domainSourceTriangles'])
    input_source_faces.extend(chart['sourceFaces']);input_charts.extend([chart['chart']]*len(chart['sourceFaces']))
assert sorted(input_source_faces)==list(np.flatnonzero(supported)), 'Every supported source face must be represented once'
output,operation=collapse_interior_geometry(Q,J,target,U)
used=sorted({v for tri in output for v in tri});remap={v:i for i,v in enumerate(used)}
positions=np.asarray([Q[v] for v in used],dtype=np.float32)
coordinates=np.asarray([U[v] for v in used],dtype=np.float32)
indices=np.asarray([[remap[v] for v in tri] for tri in output],dtype=np.uint32)
retained=operation['retainedInputFaces']
face_charts=np.asarray([input_charts[f] for f in retained],dtype=np.int32)
assert set(input_charts)==set(map(int,face_charts)), 'A supported chart vanished'
cache=ROOT/'.cache/frontside-model-pilot/chart-proxy';cache.mkdir(parents=True,exist_ok=True)
payload=cache/'maize-mature-supported-domain-proxy.npz'
np.savez_compressed(payload,**original,sourceDomain=domain,sourceSupported=supported,fallbackOriginalFaces=fallback,
    proxyPosition=positions,proxyDomain=coordinates,proxyIndices=indices,proxyFaceChart=face_charts)
total=len(fallback)+2*len(output)
result=dict(status='PARTIAL_DOMAIN_GEOMETRY_DRAFT_NO_FIELD_SHADER_OR_APPROVAL',blender=bpy.app.version_string,
    inputGeometrySha256=geometry['payloadSha256'],inputDomainSha256=seams['payloadSha256'],
    payloadRelative=str(payload.relative_to(ROOT)).replace('\\','/'),payloadSha256=hashlib.sha256(payload.read_bytes()).hexdigest(),payloadBytes=payload.stat().st_size,
    supportedSourceFaces=len(J),fallbackOriginalFaces=len(fallback),targetProxyFaces=target,proxyFaces=len(output),proxyVertices=len(used),
    hypotheticalBilateralTriangles=total,hypotheticalTriangleIncrease=total/len(ix)-1,triangleBudgetSatisfied=total<=math.floor(len(ix)*1.1),
    operation=operation,proxyVertexOriginalCorners=[corners[v] for v in used],
    limitations=['Fallback preserves original soil/stem/unsupported leaf faces explicitly DoubleSide; body-wide FrontSide is not claimed.',
        'Supported subset is determined by source topology/domain feasibility, independent of cameras.',
        'Bilateral count is prospective; physical reverse selection/orientation, source fields, shaders and shadows are not validated.',
        'Only count/finite/domain/boundary checks exist; no continuous growth, UV/normal material, visual, resource or GPU acceptance.'])
(folder/'crop-maize-supported-domain-proxy.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps({k:result[k] for k in ['status','supportedSourceFaces','fallbackOriginalFaces','proxyFaces','proxyVertices','hypotheticalBilateralTriangles','triangleBudgetSatisfied','payloadBytes','payloadSha256']}))
