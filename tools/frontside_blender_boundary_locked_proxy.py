"""Geometry draft with exact chart boundaries and separate original fields.

Endpoint collapses are ranked by original geometric plane quadrics. Shading
seams no longer force geometry sampling, but every original field is retained.
This is not an approved/model-ready simplification: field lookup is pending.
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
source_path=folder/'maize-mature-chart-geometry-draft.npz'
assert hashlib.sha256(source_path.read_bytes()).hexdigest()==prior['payloadSha256']
with np.load(source_path,allow_pickle=False) as archive:
    originals={k:archive[k].copy() for k in ['originalPosition','originalNormal','originalUv','originalIndices','originalLabels','sourceFaceChart']}
p=originals['originalPosition'];ix=originals['originalIndices'];labels=originals['originalLabels']
source_leaf=int((labels>=2).sum());stem=int((labels==1).sum());soil=int((labels==0).sum())
# Budget-derived prospective target, never a camera/heldout-face selection.
maximum_leaf=(math.floor(len(ix)*1.1)-soil-2*stem)//2
positions=[];triangles=[];facecharts=[];charts=[];vertex_origins=[];offset=0
for chart in prior['charts']:
    faces=chart['sourceFaces'];source_tri=[tuple(map(int,ix[f])) for f in faces]
    points,fan_tri,corners=split_vertex_fans(p,source_tri)
    before=topology_summary(fan_tri)
    target=max(1,math.floor(maximum_leaf*len(faces)/source_leaf))
    if before['nonManifoldEdges'] or before['boundaryJunctions']:
        output=fan_tri;operation=dict(status='UNSUPPORTED_TOPOLOGY_RETAINED',outputFaces=len(output),targetFaces=target,originalBoundaryPreserved=True)
    else:
        output,operation=collapse_interior_geometry(points,fan_tri,target)
        operation['status']='GEOMETRY_APPROXIMATION_FIELDS_PENDING'
    used=sorted({v for tri in output for v in tri});remap={v:j for j,v in enumerate(used)}
    Q=np.asarray([points[v] for v in used],dtype=np.float32);J=np.asarray([[remap[v]+offset for v in t] for t in output],dtype=np.uint32)
    positions.append(Q);triangles.append(J);facecharts.extend([chart['chart']]*len(output));offset+=len(Q)
    vertex_origins.extend([dict(chart=chart['chart'],sourceCorners=[[faces[f],lane,sv] for f,lane,sv in corners[v]]) for v in used])
    charts.append(dict(chart=chart['chart'],label=chart['label'],sourceFaces=faces,fanTopology=before,outputTopology=topology_summary(output),proxyVertices=len(Q),proxyFaces=len(output),operation=operation))
cache=ROOT/'.cache/frontside-model-pilot/chart-proxy';cache.mkdir(parents=True,exist_ok=True)
payload=cache/'maize-mature-boundary-locked-draft.npz'
np.savez_compressed(payload,**originals,proxyPosition=np.concatenate(positions),proxyIndices=np.concatenate(triangles),proxyFaceChart=np.asarray(facecharts,dtype=np.int32))
leaf=sum(c['proxyFaces'] for c in charts);bilateral=soil+2*stem+2*leaf
report=dict(status='BOUNDARY_LOCKED_GEOMETRY_DRAFT_FIELDS_AND_QUALITY_PENDING',sourceSha256=prior['sourceSha256'],inputDraftSha256=prior['payloadSha256'],blender=bpy.app.version_string,
    payloadRelative=str(payload.relative_to(ROOT)).replace('\\','/'),payloadSha256=hashlib.sha256(payload.read_bytes()).hexdigest(),payloadBytes=payload.stat().st_size,
    originalLeafFaces=source_leaf,proxyLeafFaces=leaf,targetLeafFaces=maximum_leaf,hypotheticalBilateralTriangles=bilateral,hypotheticalTriangleIncrease=bilateral/len(ix)-1,
    triangleBudgetSatisfied=bilateral<=math.floor(len(ix)*1.1),charts=charts,proxyVertexOriginalCorners=vertex_origins,
    limitations=['Only source geometric endpoint positions are retained; no camera, pixel mask, normal averaging, UV averaging or cap is used.',
    'Original chart boundary edges/positions are hard-preserved. Source normals/UV are separate immutable tables, not evaluated proxy fields.',
    'Vertex fan splitting changes topological bookkeeping only; coincident field identities remain explicit.',
    'QEM ranking and positive facet orientation do not establish surface error, source-field correspondence, UV parametrization or continuous growth.',
    'Budget count excludes auxiliary field representation and is not resource or GPU acceptance.',
    'No renderable GLB, source edit, runtime import, DoubleSide image gate, FrontSide quality, shadow test or net GPU benchmark.'])
(folder/'crop-maize-boundary-locked-draft.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps({k:report[k] for k in ['status','originalLeafFaces','proxyLeafFaces','targetLeafFaces','hypotheticalBilateralTriangles','triangleBudgetSatisfied','payloadBytes','payloadSha256']}))
