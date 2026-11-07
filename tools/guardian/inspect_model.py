import bpy, pathlib, json, math
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'art/guardian/original.glb'))
objects=[]
for o in bpy.context.scene.objects:
 if o.type=='MESH':objects.append({'name':o.name,'vertices':len(o.data.vertices),'faces':len(o.data.polygons),'bounds':[list(o.matrix_world@Vector(v)) for v in o.bound_box]})
(root/'docs/guardian/inspection.json').write_text(json.dumps({'objects':objects,'images':[{'name':i.name,'size':list(i.size)} for i in bpy.data.images]},indent=2))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22)
for loc,power,size in [((2,-3,3),400,4),((-2,-1,1),180,3),((0,2,2),300,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-2.3,.05));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=1.12;scene.camera=camera
scene.render.filepath=str(root/'docs/guardian/original-front.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/guardian/inspection.blend'))
