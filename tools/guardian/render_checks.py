import bpy,pathlib,math
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[2];bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/guardian.blend'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.world.color=(.22,.22,.22)
for loc,power in [((2,-3,3),400),((-2,-1,1),180),((0,2,2),300)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=4;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-2,.26));cam=bpy.context.object;cam.rotation_euler=(math.pi/2,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=.32;scene.camera=cam
body=bpy.data.objects['GuardianFace']
for name in ['neutral','blink_L']+['viseme_'+s for s in 'ABCDEFGHX']:
 for k in body.data.shape_keys.key_blocks:k.value=0
 if name!='neutral':body.data.shape_keys.key_blocks[name].value=1
 if name=='blink_L':body.data.shape_keys.key_blocks['blink_R'].value=1
 scene.render.filepath=str(root/('docs/guardian/face-'+name+'.png'));bpy.ops.render.render(write_still=True)
