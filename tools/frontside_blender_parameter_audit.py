"""Audit source-defined chart domains before constructing a shading-field asset.

This produces no GLB and uses no camera. Unsupported charts stay unsupported.
Original UVs/normals are never overwritten with geometric domain coordinates.
"""
import sys,json,hashlib
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT
from frontside_surface_charts import split_vertex_fans
from frontside_parameterization import disk_parameters

folder=ROOT/'docs/qa/frontside-model-pilot'
report=json.loads((folder/'crop-maize-global-boundary-draft.json').read_text())
payload=folder/'maize-mature-global-boundary-draft.npz'
assert hashlib.sha256(payload.read_bytes()).hexdigest()==report['payloadSha256']
with np.load(payload,allow_pickle=False) as data:
    p=data['originalPosition'].copy();ix=data['originalIndices'].copy()
    proxy_ix=data['proxyIndices'].copy();proxy_ch=data['proxyFaceChart'].copy()

source_domain=np.zeros((len(ix),3,2),dtype=np.float32)
proxy_domain=np.zeros((len(report['proxyVertexOriginalCorners']),2),dtype=np.float32)
supported=np.zeros(len(ix),dtype=np.uint8);results=[]
for chart in report['charts']:
    faces=chart['sourceFaces']
    Q,J,C=split_vertex_fans(p,[tuple(map(int,ix[f])) for f in faces])
    domain,summary=disk_parameters(Q,J)
    item=dict(chart=chart['chart'],sourceFaces=len(faces),proxyFaces=chart['proxyFaces'],parameterization=summary)
    if domain is not None:
        mapping={}
        for v,corners in enumerate(C):
            for f,lane,sv in corners:
                mapping[(faces[f],lane,sv)]=domain[v]
                source_domain[faces[f],lane]=domain[v]
        supported[faces]=1
        for v,entry in enumerate(report['proxyVertexOriginalCorners']):
            if entry['chart']!=chart['chart']:continue
            values=[mapping[tuple(corner)] for corner in entry['sourceCorners']]
            assert values and all(np.array_equal(values[0],value) for value in values)
            proxy_domain[v]=values[0]
        triangles=proxy_domain[proxy_ix[proxy_ch==chart['chart']]].astype(float)
        a=triangles[:,1]-triangles[:,0];b=triangles[:,2]-triangles[:,0]
        det=a[:,0]*b[:,1]-a[:,1]*b[:,0]
        item['proxyParameterTriangles']=dict(nonpositive=int((det<=0).sum()),minDoubleArea=float(det.min()),maxDoubleArea=float(det.max()))
        item['domainCompatible']=bool(np.all(det>0))
    else:item['domainCompatible']=False
    results.append(item)
cache=ROOT/'.cache/frontside-model-pilot/chart-proxy';cache.mkdir(parents=True,exist_ok=True)
output=cache/'maize-mature-parameter-audit.npz'
np.savez_compressed(output,sourceDomain=source_domain,sourceSupported=supported,proxyDomain=proxy_domain)
result=dict(status='PARAMETERIZATION_AUDIT_NOT_RENDERABLE_OR_ACCEPTED',blender=bpy.app.version_string,
    inputPayloadSha256=report['payloadSha256'],payloadRelative=str(output.relative_to(ROOT)).replace('\\','/'),
    payloadSha256=hashlib.sha256(output.read_bytes()).hexdigest(),payloadBytes=output.stat().st_size,
    charts=results,compatibleCharts=sum(c['domainCompatible'] for c in results),
    supportedSourceFaces=int(supported.sum()),
    limitations=['Coordinates are a new geometric domain, never replacement authored UV/normal values.',
        'Closed/non-disk charts require an explicit separate representation; they are not capped or omitted.',
        'Positive domain orientation is not surface, growth, shader derivative, silhouette or shadow fidelity.',
        'Proxy folds identify a missing structural constraint in this draft, not permission to change quality gates.',
        'No texture atlas/field lookup/GLB/runtime change, visual comparison or GPU benchmark exists.'])
(folder/'crop-maize-parameter-audit.json').write_bytes((json.dumps(result,indent=2)+'\n').encode())
print(json.dumps({k:result[k] for k in ['status','compatibleCharts','supportedSourceFaces','payloadBytes','payloadSha256']}))
