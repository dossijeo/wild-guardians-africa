"""Read-only original field comparison of two pilot archives, no image input."""
import hashlib,json,sys
from collections import defaultdict
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
source=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,d,b=read_glb(ROOT/'public'/source['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==source['sourceSha256']
node=next(n for n in d['nodes'] if n.get('name')=='maiz_05_maduro');p=d['meshes'][node['mesh']]['primitives'][0]
P,N,U=[accessor(d,b,p['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']];ix=accessor(d,b,p['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'));labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels']);stem=np.flatnonzero(labels==1)
tree=BVHTree.FromPolygons(P.tolist(),ix[stem].tolist(),all_triangles=True)
original_positions=defaultdict(list)
for vertex in np.unique(ix[stem]):original_positions[tuple(map(float,P[vertex]))].append(int(vertex))
rows=[]
for receipt_name in ['maize-blender-stem-reduction-diagnostic.json','maize-blender-stem-budget-max-diagnostic.json']:
    receipt=json.loads((folder/receipt_name).read_text(encoding='utf8'));row=next((r for r in receipt['rows'] if r.get('ratio')==.75),receipt['rows'][0]);data=(ROOT/row['archive']).read_bytes();assert hashlib.sha256(data).hexdigest()==row['archiveSha256']
    payload=json.loads(data);assert payload['sourceSha256']==source['sourceSha256'];corners=np.asarray(payload['corners'],np.float32)[np.asarray(payload['faceLabels'])==1].reshape(-1,8)
    exact_positions=exact_position_uv=exact_normal_numeric=exact_normal_bits=ambiguous_uv_normal=0;fixed_angles=[];fixed_uv_distances=[];nearest_angles=[];nearest_uv_distances=[];distances=[]
    for v in corners:
        candidates=original_positions.get(tuple(map(float,v[:3])),[])
        if candidates:
            exact_positions+=1;fixed_uv_distances.append(min(float(np.linalg.norm(U[c].astype(float)-v[6:])) for c in candidates))
            uv_matches=[c for c in candidates if np.array_equal(U[c],v[6:])]
            if uv_matches:
                exact_position_uv+=1
                unique={N[c].tobytes() for c in uv_matches};ambiguous_uv_normal+=len(unique)>1
                exact_normal_numeric+=any(np.array_equal(N[c],v[3:6]) for c in uv_matches);exact_normal_bits+=any(N[c].tobytes()==v[3:6].tobytes() for c in uv_matches)
                fixed_angles.append(min(float(np.arccos(np.clip(np.dot(N[c].astype(float),v[3:6])/(np.linalg.norm(N[c])*np.linalg.norm(v[3:6])),-1,1))) for c in uv_matches))
        nearest,_,face,distance=tree.find_nearest(Vector(v[:3].tolist()));distances.append(distance)
        triangle=P[ix[stem[face]]].astype(float);q=np.asarray(nearest,float);a=triangle[1]-triangle[0];bb=triangle[2]-triangle[0];w=q-triangle[0]
        aa=np.dot(a,a);ab=np.dot(a,bb);b2=np.dot(bb,bb);den=aa*b2-ab*ab
        if den==0:continue
        beta=(np.dot(w,a)*b2-np.dot(w,bb)*ab)/den;gamma=(np.dot(w,bb)*aa-np.dot(w,a)*ab)/den;weights=np.asarray([1-beta-gamma,beta,gamma])
        normal=weights@N[ix[stem[face]]].astype(float);uv=weights@U[ix[stem[face]]].astype(float);length=np.linalg.norm(normal)*np.linalg.norm(v[3:6])
        if length:nearest_angles.append(float(np.arccos(np.clip(np.dot(normal,v[3:6])/length,-1,1))))
        nearest_uv_distances.append(float(np.linalg.norm(uv-v[6:])))
    def stats(values):return dict(count=len(values),maximum=max(values,default=0),mean=float(np.mean(values)) if values else 0,p99=float(np.quantile(values,.99)) if values else 0)
    rows.append(dict(receipt=receipt_name,archiveSha256=row['archiveSha256'],stemCorners=len(corners),exactOriginalPositionCorners=exact_positions,exactOriginalPositionAndUvCorners=exact_position_uv,normalNumericExactAtPositionUv=exact_normal_numeric,normalBitsExactAtPositionUv=exact_normal_bits,ambiguousOriginalNormalAtPositionUvCorners=ambiguous_uv_normal,fixedPositionUvNormalAngleRadians=stats(fixed_angles),fixedPositionNearestOriginalUvDistance=stats(fixed_uv_distances),nearestOriginalSurfaceDistance=stats(distances),nearestSingleTriangleNormalAngleRadians=stats(nearest_angles),nearestSingleTriangleUvDistance=stats(nearest_uv_distances)))
report=dict(status='STEM_ATTRIBUTE_FIELD_DIAGNOSTIC_NOT_APPROVED',sourceSha256=source['sourceSha256'],blenderVersion=bpy.app.version_string,rows=rows,limitations=['Only .75 and658 mature maize pilots, original archives remain immutable; no candidate exported or altered.', 'Exact position/UV comparisons inspect original raw field values; no arbitrary normal correction is applied.', 'Nearest original triangle is one BVH tie winner; charts/coincident interfaces can be ambiguous and it is not a verified UV correspondence.', 'Barycentric field diagnostics are not shader evaluation, TBN/map/raster bounds, causal attribution or image approval.', 'GPU objectNormal normalization, wind deformation, normal-map derivatives and occlusion remain separate native concerns.'])
(folder/'maize-stem-field-transfer-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report))
