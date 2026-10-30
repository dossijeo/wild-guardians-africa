import bpy,json,pathlib
from mathutils.kdtree import KDTree
root=pathlib.Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/guardian.blend'));body=bpy.data.objects['Guardian']
points=[]
for i in [98,10610,5134,5135]:
 v=body.data.vertices[i];points.append({'sourceIndex':i,'position':list(body.matrix_world@v.co),'weights':{body.vertex_groups[g.group].name:g.weight for g in v.groups}})
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'public/content/guardian/guardian.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];entries=[]
for o in meshes:
 for v in o.data.vertices:entries.append((o,v,o.matrix_world@v.co))
k=KDTree(len(entries))
for n,(_,_,co) in enumerate(entries):k.insert(co,n)
k.balance()
for point in points:
 co,n,d=k.find(point['position']);o,v,_=entries[n];point.update(runtimeMesh=o.name,runtimeIndex=v.index,distance=d,runtimeWeights={o.vertex_groups[g.group].name:g.weight for g in v.groups})
out=root/'docs/guardian/wind-wide/source-runtime-landmarks.json';out.write_text(json.dumps(points,indent=2));print(json.dumps(points,indent=2))
