"""Disabled planar stem reconstruction, original UV/normals kept per corner.

Exact-coordinate geometric welding allows a dissolve topology experiment while
retaining separate original UV/custom normal loop values. Never reads images.
Native planar geometry does not prove equality after nonlinear growth shaders.
"""
import hashlib,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from mathutils.bvhtree import BVHTree
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_05_maduro')
prim=doc['meshes'][node['mesh']]['primitives'][0]
assert 'skin' not in node and not prim.get('targets')
p,n,uv=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])
stem=np.flatnonzero(labels==1);kept=np.flatnonzero(labels!=1)
table={};points=[];triangles=[]
for face in stem:
    triangle=[]
    for vertex in ix[face]:
        key=tuple(p[vertex])
        if key not in table:table[key]=len(points);points.append(p[vertex].tolist())
        triangle.append(table[key])
    triangles.append(triangle)
tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
rows=[]
for angle in [.000001,.0001,.001]:
    mesh=bpy.data.meshes.new(f'maize-stem-planar-{angle}')
    mesh.from_pydata(points,[],triangles);mesh.update()
    layer=mesh.uv_layers.new(name='OriginalAtlas');custom=[]
    for polygon,face in zip(mesh.polygons,stem):
        polygon.use_smooth=True
        for corner,loop in enumerate(polygon.loop_indices):
            vertex=ix[face,corner];layer.data[loop].uv=uv[vertex].tolist();custom.append(n[vertex].tolist())
    mesh.normals_split_custom_set(custom)
    obj=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(obj)
    modifier=obj.modifiers.new('Planar UV-normal delimited stem','DECIMATE')
    modifier.decimate_type='DISSOLVE';modifier.angle_limit=angle;modifier.delimit={'NORMAL','UV'}
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());reduced=evaluated.to_mesh();reduced.calc_loop_triangles()
    corners=np.concatenate([p[ix[kept]],n[ix[kept]],uv[ix[kept]]],axis=2).tolist()
    output_labels=labels[kept].astype(int).tolist();distances=[]
    for triangle in reduced.loop_triangles:
        row=[]
        for loop in triangle.loops:
            vertex=reduced.loops[loop].vertex_index;position=reduced.vertices[vertex].co
            distances.append(tree.find_nearest(position)[3])
            row.append([*position,*reduced.corner_normals[loop].vector,*reduced.uv_layers['OriginalAtlas'].data[loop].uv])
        center=sum((reduced.vertices[v].co for v in triangle.vertices),start=reduced.vertices[triangle.vertices[0]].co*0)/3
        distances.append(tree.find_nearest(center)[3]);corners.append(row);output_labels.append(1)
    array=np.asarray(corners,np.float32);assert np.isfinite(array).all()
    assert array[:len(kept)].tobytes()==np.concatenate([p[ix[kept]],n[ix[kept]],uv[ix[kept]]],axis=2).tobytes()
    payload=dict(status='BLENDER_STEM_REMODELLING_TRAINING_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],mesh=node['name'],method='DISSOLVE_NORMAL_UV',angleLimit=angle,cornerLanes=['POSITIONxyz','NORMALxyz','UVxy'],faceLabels=output_labels,corners=corners,originalUnchangedFaceIds=kept.astype(int).tolist(),limitations=['Soil/leaf corner bits exact; new stem topology/normal/UV interpolation unapproved.', 'Exact-coordinate weld retains separate original normal/UV loop values before modifier; no epsilon.', 'All new stem faces require actual reverses, no visibility masks.', 'Planarity before deformation does not establish continuous nonlinear growth equality.', 'No GLB, runtime asset, bridge labels or material changed.'])
    data=(json.dumps(payload,separators=(',',':'))+'\n').encode();sha=hashlib.sha256(data).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.json');archive.write_bytes(data)
    unique=len({v.tobytes() for v in array.reshape(-1,8)});stem_count=len(reduced.loop_triangles);total=len(kept)+stem_count*2
    source_bytes=p.nbytes+n.nbytes+uv.nbytes+ix.nbytes;proposed_bytes=unique*32+total*3*(2 if unique<=65535 else 4)
    rows.append(dict(angleLimit=angle,sourceStemTriangles=len(stem),derivedStemTriangles=stem_count,sourceTriangles=len(ix),proposedBilateralTriangles=total,triangleGrowthPercent=100*(total/len(ix)-1),triangleBudgetPass=total<=len(ix)*1.1,sourceStateBytes=source_bytes,proposedSharedStateBytes=proposed_bytes,bufferGrowthPercent=100*(proposed_bytes/source_bytes-1),bufferBudgetPass=proposed_bytes<=source_bytes*1.1,maxSampledSurfaceDistance=max(distances,default=0),archive=str(archive.relative_to(ROOT)).replace('\\','/'),archiveSha256=sha,limitations=payload['limitations']))
    evaluated.to_mesh_clear();bpy.data.objects.remove(obj,do_unlink=True);bpy.data.meshes.remove(mesh)
report=dict(status='PLANAR_STEM_RECONSTRUCTION_OFFLINE_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],blenderVersion=bpy.app.version_string,blenderBuildHash=bpy.app.build_hash.decode(),rows=rows)
(folder/'maize-blender-stem-planar-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
