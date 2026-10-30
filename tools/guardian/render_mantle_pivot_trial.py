import bpy,pathlib
from mathutils import Vector
root=pathlib.Path.cwd();out=root/'docs/guardian/wind-wide/mantle-review';out.mkdir(exist_ok=True)
for label,offset in [('pivot-front',(.28,-.4,.12)),('pivot-side',(.4,.1,.12)),('pivot-back',(.2,.4,.12))]:
 path=pathlib.Path('C:/tmp/guardian-mantle-pivots.blend')
 bpy.ops.wm.open_mainfile(filepath=str(path));s=bpy.context.scene;rig=bpy.data.objects['GuardianRig'];body=bpy.data.objects['Guardian']
 for tr in rig.animation_data.nla_tracks:tr.mute=tr.name not in ['Idle','Float','Mantle_Breeze']
 s.frame_set(13);bpy.context.view_layer.update();ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();target=body.matrix_world@((mesh.vertices[98].co+mesh.vertices[10610].co)*.5);ev.to_mesh_clear()
 for o in list(s.objects):
  if o.type in ['CAMERA','LIGHT']:bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.object.camera_add(location=target+Vector(offset));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.32;s.camera=cam
 for offset,power,size in [((.15,-.2,.3),12,.3),((-.2,.1,.2),6,.25)]:
  bpy.ops.object.light_add(type='AREA',location=target+Vector(offset));o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
 s.render.engine='CYCLES';s.cycles.samples=24;s.render.resolution_x=640;s.render.resolution_y=640;s.render.resolution_percentage=100;s.world.color=(.15,.15,.15);s.render.filepath=str(out/(label+'.png'));bpy.ops.render.render(write_still=True)
