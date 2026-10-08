"""Single geometry-error queue across independent source charts, no cameras.

Avoid arbitrary per-chart face quotas; all hard boundary/fan constraints remain.
Original shading tables and bridges are unchanged. No renderable model exists.
"""
import sys,json,hashlib,math
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT
from frontside_surface_charts import split_vertex_fans,collapse_interior_geometry,topology_summary
folder=ROOT/'docs/qa/frontside-model-pilot'
prior=json.loads((folder/'crop-maize-chart-proxy-draft.json').read_text())
path=folder/'maize-mature-chart-geometry-draft.npz';assert hashlib.sha256(path.read_bytes()).hexdigest()==prior['payloadSha256']
with np.load(path,allow_pickle=False) as archive:
    originals={k:archive[k].copy() for k in ['originalPosition','originalNormal','originalUv','originalIndices','originalLabels','sourceFaceChart']}
p=originals['originalPosition'];ix=originals['originalIndices'];labels=originals['originalLabels']
stem=int((labels==1).sum());soil=int((labels==0).sum());target=(math.floor(len(ix)*1.1)-soil-2*stem)//2
points=[];source_tri=[];input_chart=[];source_corners=[];charts=[]
for chart in prior['charts']:
    faces=chart['sourceFaces'];Q,J,C=split_vertex_fans(p,[tuple(map(int,ix[f])) for f in faces]);offset=len(points)
    top=topology_summary(J)
    # Do not silently omit an unsupported patch. Abort this proposed draft.
    assert not top['nonManifoldEdges'] and not top['boundaryJunctions'],(chart['chart'],top)
    points.extend(Q);source_tri.extend(tuple(v+offset for v in tri) for tri in J);input_chart.extend([chart['chart']]*len(J))
    source_corners.extend([dict(chart=chart['chart'],sourceCorners=[[faces[f],lane,sv] for f,lane,sv in corner]) for corner in C])
    charts.append(dict(chart=chart['chart'],label=chart['label'],sourceFaces=faces,fanTopology=top))
J,operation=collapse_interior_geometry(points,source_tri,target)
used=sorted({v for tri in J for v in tri});remap={v:i for i,v in enumerate(used)}
Q=np.asarray([points[v] for v in used],dtype=np.float32);J=np.asarray([[remap[v] for v in tri] for tri in J],dtype=np.uint32)
face_chart=np.asarray([input_chart[f] for f in operation['retainedInputFaces']],dtype=np.int32)
for chart in charts:
    chart['proxyFaces']=int((face_chart==chart['chart']).sum())
assert all(c['proxyFaces']>0 for c in charts),'A source chart was eliminated'
cache=ROOT/'.cache/frontside-model-pilot/chart-proxy';cache.mkdir(parents=True,exist_ok=True)
payload=cache/'maize-mature-global-boundary-draft.npz'
np.savez_compressed(payload,**originals,proxyPosition=Q,proxyIndices=J,proxyFaceChart=face_chart)
total=soil+2*stem+2*len(J)
report=dict(status='GLOBAL_BOUNDARY_GEOMETRY_DRAFT_FIELDS_AND_QUALITY_PENDING',sourceSha256=prior['sourceSha256'],inputDraftSha256=prior['payloadSha256'],blender=bpy.app.version_string,
    payloadRelative=str(payload.relative_to(ROOT)).replace('\\','/'),payloadSha256=hashlib.sha256(payload.read_bytes()).hexdigest(),payloadBytes=payload.stat().st_size,
    originalLeafFaces=int((labels>=2).sum()),proxyLeafFaces=len(J),proxyVertices=len(Q),targetLeafFaces=target,hypotheticalBilateralTriangles=total,hypotheticalTriangleIncrease=total/len(ix)-1,
    triangleBudgetSatisfied=total<=math.floor(len(ix)*1.1),operation=operation,charts=charts,proxyVertexOriginalCorners=[source_corners[v] for v in used],
    limitations=['No source/bridge/UV/normal/material edit, camera mask or cap; every original chart remains represented.',
    'Only geometry endpoints and hard boundaries are retained. Original shading fields are tables, not evaluated proxy fields.',
    'Geometric quadrics and positive facet orientation are not visual, surface-distance, tangent-map, growth-continuum or shadow evidence.',
    'The bilateral count assumes every stem/leaf would need geometric reverses; selection and final topology are not approved.',
    'Auxiliary encoding/memory/shader fetches/draw calls and net GPU benefit remain unknown. No GLB/runtime asset/PR.'])
(folder/'crop-maize-global-boundary-draft.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps({k:report[k] for k in ['status','proxyLeafFaces','proxyVertices','targetLeafFaces','hypotheticalBilateralTriangles','triangleBudgetSatisfied','payloadBytes','payloadSha256']}))
