"""Render matched oblique lid poses from an isolated saved authoring candidate."""
import argparse, math, sys
from pathlib import Path
import bpy
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
for rig in [o for o in bpy.data.objects if o.type=='ARMATURE']:
 if rig.animation_data:
  for track in rig.animation_data.nla_tracks:track.mute=True
bpy.context.scene.frame_set(1)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.world.color=(.22,.22,.22)
for loc,power in [((2,-3,3),400),((-2,-1,1),180)]:
 bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=4;lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=.25;scene.camera=cam;target=Vector((0,0,.28))
for degrees in [-45,45]:
 angle=math.radians(degrees);cam.location=(2*math.sin(angle),-2*math.cos(angle),.28);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 for closure in [.5,1]:
  for obj in [o for o in bpy.data.objects if o.type=='MESH' and o.data.shape_keys]:
   for key in obj.data.shape_keys.key_blocks:
    if key.name.startswith('blink_'):key.value=int(key.name==('blink_'+key.name.split('_')[1]+('_50' if closure==.5 else '')))
  scene.render.filepath=str(out/f'angle-{degrees}-blink-{closure}.png');bpy.ops.render.render(write_still=True)
