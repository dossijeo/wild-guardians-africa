"""Compare unchanged lion face corners, UVs, normals and skin weights in neutral."""
import argparse, json, sys
from pathlib import Path
import bpy

p=argparse.ArgumentParser()
p.add_argument('--source',required=True)
p.add_argument('--candidate',required=True)
p.add_argument('--output',required=True)
p.add_argument('--check',action='store_true')
p.add_argument('--allow-facial-skinning',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])

def snapshot(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if path.endswith('.blend'): bpy.ops.wm.open_mainfile(filepath=str(Path(path).resolve()))
    else: bpy.ops.import_scene.gltf(filepath=str(Path(path).resolve()))
    for obj in bpy.context.scene.objects:
        if obj.animation_data: obj.animation_data_clear()
        if obj.type=='ARMATURE':
            for bone in obj.pose.bones: bone.matrix_basis.identity()
        if obj.type=='MESH' and obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks: key.value=0
    bpy.context.view_layer.update()
    obj=bpy.data.objects['Mesh_0']; mesh=obj.data
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    uv=mesh.uv_layers.active.data
    groups={g.index:g.name for g in obj.vertex_groups}
    result={}; duplicates=0
    for face in mesh.polygons:
        points=[obj.matrix_world@mesh.vertices[i].co for i in face.vertices]
        # Exclude the whole authoring region, including faces crossing its edge.
        if any(abs(v.x)<.08 and -.27<v.y<-.14 and 1.45<v.z<1.6 for v in points): continue
        corners=[]
        for index in face.loop_indices:
            vertex=mesh.vertices[mesh.loops[index].vertex_index]
            point=obj.matrix_world@vertex.co
            key=tuple(round(v,5) for v in point)
            corners.append((key, {'position':list(point),'uv':list(uv[index].uv),
                'normal':list(mesh.corner_normals[index].vector),
                'evaluatedNormal':list(evaluated.corner_normals[index].vector),
                'evaluatedPosition':list(obj.matrix_world@evaluated.vertices[vertex.index].co),
                'weights':{groups[g.group]:g.weight for g in vertex.groups}}))
        # Preserve winding and UV identity: coincident front/back triangles
        # must not silently overwrite each other in the correspondence map.
        signature=[(key,tuple(round(v,6) for v in row['uv'])) for key,row in corners]
        facekey=(face.material_index,min(tuple(signature[i:]+signature[:i]) for i in range(len(signature))))
        if facekey in result: duplicates+=1
        result[facekey]={key:row for key,row in corners}
    return result,duplicates

source,source_duplicates=snapshot(a.source); candidate,candidate_duplicates=snapshot(a.candidate)
report={'source':a.source,'candidate':a.candidate,'sourceFaces':len(source),
        'candidateFaces':len(candidate),'duplicateFaceKeys':[source_duplicates,candidate_duplicates],
        'missingFaces':0,'corners':0,'max':{},'examples':{}}
report['facialSkinning']={'allowed':a.allow_facial_skinning,'changedCorners':0,'maxWeightChange':0,
    'scope':'Only weights may change at |world X| < .075, world Y < -.10, world Z > 1.45; geometry/UV/normals still compared outside the original oral editing box'}
for key,corners in source.items():
    if key not in candidate:
        report['missingFaces']+=1; continue
    for point,row in corners.items():
        other=candidate[key][point];report['corners']+=1
        for field in ['position','uv','normal','evaluatedNormal','evaluatedPosition','weights']:
            if field=='weights': error=max([abs(row[field].get(k,0)-other[field].get(k,0)) for k in row[field].keys()|other[field].keys()] or [0])
            else: error=max(abs(x-y) for x,y in zip(row[field],other[field]))
            x,y,z=row['position']
            if field=='weights' and a.allow_facial_skinning and abs(x)<.075 and y<-.10 and z>1.45:
                if error>1e-6:report['facialSkinning']['changedCorners']+=1
                report['facialSkinning']['maxWeightChange']=max(report['facialSkinning']['maxWeightChange'],error)
                continue
            if error>report['max'].get(field,-1):
                report['max'][field]=error; report['examples'][field]={'position':row['position'],'source':row[field],'candidate':other[field]}
Path(a.output).write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
if a.check:
    assert source_duplicates==candidate_duplicates==0, 'Ambiguous face correspondence'
    assert report['missingFaces']==0 and len(source)==len(candidate), 'Untouched faces changed'
    for field in ['position','uv','evaluatedPosition','weights']:
        assert report['max'][field]<1e-6, f'Unrelated {field} changed'
    for field in ['normal','evaluatedNormal']:
        assert report['max'][field]<.001, f'Unrelated {field} changed'
