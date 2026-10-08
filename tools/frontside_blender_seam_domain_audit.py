"""Source corner-preserving seams; no proxy, GLB, camera or shading changes."""
import sys,json,hashlib
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT
from frontside_surface_charts import split_vertex_fans
from frontside_chart_seams import cut_boundary_loops
from frontside_parameterization import disk_parameters

folder=ROOT/'docs/qa/frontside-model-pilot'
report=json.loads((folder/'crop-maize-global-boundary-draft.json').read_text())
payload=folder/'maize-mature-global-boundary-draft.npz'
assert hashlib.sha256(payload.read_bytes()).hexdigest()==report['payloadSha256']
with np.load(payload,allow_pickle=False) as data:
    p=data['originalPosition'].copy();ix=data['originalIndices'].copy()
domain=np.zeros((len(ix),3,2),dtype=np.float32);supported=np.zeros(len(ix),dtype=np.uint8);results=[]
for chart in report['charts']:
    faces=chart['sourceFaces'];Q,J,C=split_vertex_fans(p,[tuple(map(int,ix[f])) for f in faces])
    cut,seams=cut_boundary_loops(Q,J)
    item=dict(chart=chart['chart'],sourceFaces=faces,seams=seams)
    if cut:
        Q,J,C=cut;coordinates,summary=disk_parameters(Q,J);item['parameterization']=summary
        if coordinates is not None:
            for v,corners in enumerate(C):
                for f,lane,_ in corners:domain[faces[f],lane]=coordinates[v]
            supported[faces]=1
            item['domainVertices']=len(Q)
            item['originalCorners']=[[[faces[f],lane,int(ix[faces[f],lane])] for f,lane,_ in corners] for corners in C]
            # New seam fan coordinates and triangles allow a separately constrained
            # proxy generation. No current proxy is silently retessellated here.
            item['domainSourceTriangles']=[list(tri) for tri in J]
    results.append(item)
cache=ROOT/'.cache/frontside-model-pilot/chart-proxy';cache.mkdir(parents=True,exist_ok=True)
output=cache/'maize-mature-seam-domains.npz'
np.savez_compressed(output,sourceDomain=domain,sourceSupported=supported)
result=dict(status='SEAM_DOMAIN_AUDIT_NO_RENDERABLE_CANDIDATE',blender=bpy.app.version_string,
    inputPayloadSha256=report['payloadSha256'],payloadRelative=str(output.relative_to(ROOT)).replace('\\','/'),payloadSha256=hashlib.sha256(output.read_bytes()).hexdigest(),payloadBytes=output.stat().st_size,
    supportedSourceFaces=int(supported.sum()),charts=results,
    limitations=['No face removed/added or point/UV/normal changed; coincident seam corner fans are explicit.',
        'Closed/non-genus-zero charts remain unsupported; no cap or physical hole closure.',
        'Shortest edge paths are deterministic greedy geometry criteria, not a globally minimum seam proof.',
        'No constrained coarse geometry/field lookup/shader/GLB/visual/GPU validation.'])
(folder/'crop-maize-seam-domain-audit.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps({k:result[k] for k in ['status','supportedSourceFaces','payloadBytes','payloadSha256']}))
