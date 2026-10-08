"""Offline soil-only derivative; original stem/leaves remain byte-exact.

No image input, production export, new bridge mapping or FrontSide activation.
Native Double-only quality must precede any culling or growth approval.
"""
import argparse,hashlib,json,sys
from collections import defaultdict,Counter
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from mathutils.bvhtree import BVHTree
from frontside_model_pilot import ROOT,read_glb,accessor
parser=argparse.ArgumentParser();parser.add_argument('--boundary-weight',choices=['NONE','HIGH_BOUNDARY','HIGH_INTERIOR'],default='NONE')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])

folder=ROOT/'docs/qa/frontside-model-pilot'
source=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/source['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==source['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_05_maduro');prim=doc['meshes'][node['mesh']]['primitives'][0]
p,n,u=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])
soil=np.flatnonzero(labels==0);fixed=np.flatnonzero(labels!=0);stem=np.flatnonzero(labels==1)
maximum=int(len(ix)*1.1)-len(fixed)-len(stem);ratio=maximum/len(soil)
assert 0<ratio<1
old=np.unique(ix[soil]);local=np.searchsorted(old,ix[soil]);lookup=defaultdict(dict);tri_lookup=defaultdict(dict)
for vertex in old:
    key=np.concatenate([p[vertex],u[vertex]]).astype(np.float32).tobytes();lookup[key][n[vertex].tobytes()]=n[vertex].copy()
for face in soil:
    keys=np.concatenate([p[ix[face]],u[ix[face]]],axis=1).astype(np.float32)
    for rotate in range(3):
        order=np.roll(np.arange(3),-rotate);tri_lookup[keys[order].tobytes()][n[ix[face]][order].tobytes()]=n[ix[face]][order].copy()
def pkey(v):return np.asarray(v[:3],np.float32).tobytes()
def edge(a,b):return tuple(sorted((a,b)))
counts=Counter(edge(pkey(a),pkey(b)) for tri in p[ix[soil]] for a,b in zip(tri,np.roll(tri,-1,axis=0)))
boundary={e for e,count in counts.items() if count!=2}
mesh=bpy.data.meshes.new('original-soil');mesh.from_pydata(p[old].tolist(),[],local.tolist());mesh.update()
uv=mesh.uv_layers.new(name='OriginalAtlas');field=mesh.attributes.new(name='OriginalNormalField',type='FLOAT_VECTOR',domain='POINT')
for vertex in range(len(old)):field.data[vertex].vector=n[old[vertex]].tolist()
for poly in mesh.polygons:
    poly.use_smooth=True
    for loop in poly.loop_indices:uv.data[loop].uv=u[old[mesh.loops[loop].vertex_index]].tolist()
obj=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(obj)
modifier=obj.modifiers.new('Soil-only resource proposal','DECIMATE');modifier.ratio=ratio;modifier.use_collapse_triangulate=True
if args.boundary_weight!='NONE':
    boundary_points={point for pair in boundary for point in pair}
    boundary_vertices={i for i,v in enumerate(p[old]) if pkey(v) in boundary_points}
    high=boundary_vertices if args.boundary_weight=='HIGH_BOUNDARY' else set(range(len(old)))-boundary_vertices
    group=obj.vertex_groups.new(name='SoilBoundaryDiagnostic')
    if high:group.add(sorted(high),1.0,'REPLACE')
    modifier.vertex_group=group.name;modifier.vertex_group_factor=1000
evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());reduced=evaluated.to_mesh();reduced.calc_loop_triangles()
transported=reduced.attributes.get('OriginalNormalField');assert transported is not None
tree=BVHTree.FromPolygons(p[old].tolist(),local.tolist(),all_triangles=True)
rows=[];restored_tri=restored_anchor=ambiguous=unmapped=0;distances=[]
for triangle in reduced.loop_triangles:
    row=[]
    for loop in triangle.loops:
        vertex=reduced.loops[loop].vertex_index;position=reduced.vertices[vertex].co
        normal=np.asarray(transported.data[vertex].vector,np.float32);length=np.linalg.norm(normal);assert np.isfinite(normal).all() and length>1e-8
        row.append([*position,*(normal/length),*reduced.uv_layers['OriginalAtlas'].data[loop].uv]);distances.append(tree.find_nearest(position)[3])
    row=np.asarray(row,np.float32);matches=tri_lookup.get(row[:,[0,1,2,6,7]].tobytes(),{})
    if len(matches)==1:row[:,3:6]=next(iter(matches.values()));restored_tri+=3
    else:
        for corner in row:
            values=lookup.get(corner[[0,1,2,6,7]].tobytes(),{})
            if len(values)==1:corner[3:6]=next(iter(values.values()));restored_anchor+=1
            elif values:ambiguous+=1
            else:unmapped+=1
    rows.append(row)
array=np.asarray(rows,np.float32);output_edges={edge(pkey(a),pkey(b)) for tri in array for a,b in zip(tri,np.roll(tri,-1,axis=0))}
fixed_corners=np.concatenate([p[ix[fixed]],n[ix[fixed]],u[ix[fixed]]],axis=2).astype(np.float32)
source_soil_corners=np.concatenate([p[ix[soil]],n[ix[soil]],u[ix[soil]]],axis=2).astype(np.float32)
source_boundary_fields={edge(a.tobytes(),b.tobytes()) for tri in source_soil_corners for a,b in zip(tri,np.roll(tri,-1,axis=0)) if edge(pkey(a),pkey(b)) in boundary}
output_fields={edge(a.tobytes(),b.tobytes()) for tri in array for a,b in zip(tri,np.roll(tri,-1,axis=0))}
all_corners=np.concatenate([fixed_corners,array]);assert all_corners[:len(fixed)].tobytes()==fixed_corners.tobytes()
out_labels=labels[fixed].tolist()+[0]*len(array);unique=len({v.tobytes() for v in all_corners.reshape(-1,8)})
bilateral=len(all_corners)+len(stem);state_bytes=unique*32+bilateral*3*(2 if unique<=65535 else 4);source_bytes=p.nbytes+n.nbytes+u.nbytes+ix.nbytes
payload=dict(status='SOIL_ONLY_DERIVATIVE_NOT_APPROVED',sourceSha256=source['sourceSha256'],mesh=node['name'],ratio=ratio,boundaryWeight=args.boundary_weight,
    originalFixedFaceIds=fixed.tolist(),corners=all_corners.tolist(),faceLabels=out_labels,
    limitations=['All original stem/leaf PN/UV and driver labels are byte-exact; only soil is derived.',
    'Original atlas is retained; new interpolated UV/NN fields are not yet verified equivalent.',
    'No original assets, growth states or bridges replaced; new soil topology requires explicit bridge-contract validation.',
    'All original stem reverses are included only in a prospective cost calculation; no Front material exported.',
    'Missing original soil boundary edges are a structural warning and prevent assuming attachment preservation.',
    'Double-only native training, independent multiview, complete growth/shadow and net GPU gates remain pending.'])
data=(json.dumps(payload,separators=(',',':'))+'\n').encode();sha=hashlib.sha256(data).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.json');archive.write_bytes(data)
report=dict(status=payload['status'],sourceSha256=source['sourceSha256'],blenderVersion=bpy.app.version_string,blenderBuildHash=bpy.app.build_hash.decode(),
    archive=str(archive.relative_to(ROOT)).replace('\\','/'),archiveSha256=sha,archiveBytes=len(data),ratio=ratio,boundaryWeight=args.boundary_weight,
    sourceSoilTriangles=len(soil),maximumSoilTriangles=maximum,derivedSoilTriangles=len(array),fixedOriginalTriangles=len(fixed),
    prospectiveBilateralTriangles=bilateral,triangleBudgetPass=bilateral<=len(ix)*1.1,sourceStateBytes=source_bytes,prospectiveStateBytes=state_bytes,bufferBudgetPass=state_bytes<=source_bytes*1.1,
    sourceVertices=len(p),derivedUniqueVertices=unique,derivedAttributeBytes=unique*32,
    forwardIndexEntries=len(all_corners)*3,prospectiveIndexEntries=bilateral*3,
    indexElementBytes=2 if unique<=65535 else 4,
    exactOriginalBoundaryEdges=len(boundary),missingOriginalBoundaryEdges=len(boundary-output_edges),
    originalBoundaryFieldEdges=len(source_boundary_fields),missingOriginalBoundaryFieldEdges=len(source_boundary_fields-output_fields),
    boundaryFieldPass=not (source_boundary_fields-output_fields),
    restoredOriginalTriangleCorners=restored_tri,restoredUniqueAnchorCorners=restored_anchor,ambiguousAnchorCorners=ambiguous,newUnmappedCorners=unmapped,
    maxSampledDistance=max(distances,default=0),limitations=payload['limitations'])
(folder/('maize-soil-budget-'+args.boundary_weight.lower().replace('_','-')+'-diagnostic.json')).write_bytes((json.dumps(report,indent=2)+'\n').encode('utf8'))
print(json.dumps(report))
