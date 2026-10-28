"""Isolated Guardian lid study; never overwrites production assets."""
import bpy,math,argparse,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[2];bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/guardian.blend'))
o=bpy.data.objects['GuardianFace'];mesh=o.data;keys=mesh.shape_keys.key_blocks
slot=next(i for i,m in enumerate(mesh.materials) if m.name=='Painted wooden eyelids')
ids=sorted({v for f in mesh.polygons if f.material_index==slot for v in f.vertices});assert len(ids)==462,len(ids)
for side,cx,cz,subset in [('L',-.067,.27,ids[:231]),('R',.052,.286,ids[231:])]:
 for j,idx in enumerate(subset):
  row,col=divmod(j,33);r=row/6;u=-1+col/16;arc=math.sqrt(max(0,1-u*u));x=cx+.042*u
  top=cz-.006+.034*arc+.14*(x-cx);bottom=cz-.006-.028*arc+.14*(x-cx)
  k=keys['blink_'+side].data[idx];k.co.z=top*(1-r)+bottom*r
  k.co.y=keys['Basis'].data[idx].co.y*(1-r)+(-.121+.007*u*u)*r-.010*arc*math.sin(math.pi*r)
# The prior body blink excavates the eye surround; preserve the carved rim.
for body in [x for x in bpy.data.objects if x.type=='MESH' and x!=o and x.data.shape_keys]:
 for key in body.data.shape_keys.key_blocks:
  if key.name.startswith('blink_'):
   for v,base in zip(key.data,body.data.shape_keys.key_blocks['Basis'].data):v.co=base.co
for rig in [x for x in bpy.data.objects if x.type=='ARMATURE']:
 if rig.animation_data:
  for track in rig.animation_data.nla_tracks:track.mute=True
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'guardian-lids.blend'),compress=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.world.color=(.22,.22,.22)
from mathutils import Vector
for loc,power in [((2,-3,3),400),((-2,-1,1),180)]:
 bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=4;lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-2,.28));cam=bpy.context.object;cam.rotation_euler=(math.pi/2,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=.25;scene.camera=cam
for value in [0,.5,1]:
 for obj in [x for x in bpy.data.objects if x.type=='MESH']:
  if obj and obj.data.shape_keys:
   for key in obj.data.shape_keys.key_blocks:
    if key.name.startswith('blink_'):key.value=value
 scene.render.filepath=str(out/f'blink-{value}.png');bpy.ops.render.render(write_still=True)
