"""Matched-camera comparison of one entire twelve-second breeze loop, 6 fps."""
import bpy,pathlib
from mathutils import Vector
root=pathlib.Path.cwd();out=pathlib.Path('C:/tmp/guardian-mantle-cycle');out.mkdir(exist_ok=True)
target=None
for label,path in [('original',root/'art/guardian/guardian.blend'),('weights',pathlib.Path('C:/tmp/guardian-mantle-weights.blend'))]:
 bpy.ops.wm.open_mainfile(filepath=str(path));s=bpy.context.scene;rig=bpy.data.objects['GuardianRig'];body=bpy.data.objects['Guardian']
 for tr in rig.animation_data.nla_tracks:tr.mute=tr.name not in ['Idle','Float','Mantle_Breeze']
 s.frame_set(13);bpy.context.view_layer.update()
 if target is None:
  ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();target=body.matrix_world@((mesh.vertices[98].co+mesh.vertices[10610].co)*.5);ev.to_mesh_clear()
 for o in list(s.objects):
  if o.type in ['CAMERA','LIGHT']:bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.object.camera_add(location=target+Vector((.28,-.4,.12)));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.42;s.camera=cam
 for offset,power,size in [((.15,-.2,.3),12,.3),((-.2,.1,.2),6,.25)]:
  bpy.ops.object.light_add(type='AREA',location=target+Vector(offset));o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
 s.render.engine='CYCLES';s.cycles.samples=8;s.render.resolution_x=384;s.render.resolution_y=384;s.render.resolution_percentage=100;s.world.color=(.15,.15,.15)
 folder=out/label;folder.mkdir(exist_ok=True)
 for i,frame in enumerate(range(1,290,4)):
  s.frame_set(frame);s.render.filepath=str(folder/f'{i:03}.png');bpy.ops.render.render(write_still=True)
