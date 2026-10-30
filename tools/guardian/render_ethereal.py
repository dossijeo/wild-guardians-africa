import bpy, pathlib, math
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[2]
source=(root/'tools/guardian/render_checks.py').read_text(encoding='utf8');exec(source.split("for name in ['neutral'")[0])
scene.cycles.samples=8;scene.render.resolution_x=480;scene.render.resolution_y=600
cam.data.ortho_scale=1.12
rig=bpy.data.objects['GuardianRig']
for track in rig.animation_data.nla_tracks:track.mute=track.name not in ['Idle','Float','Mantle_Breeze']
folder=root/'docs/guardian/ethereal';folder.mkdir(exist_ok=True)
for angle in ['front','side']:
 cam.location=(0,-2,.02) if angle=='front' else (.9,-1.7,.05)
 cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
 for frame in [1,73,145,217]:
  scene.frame_set(frame);rig.data.pose_position='REST';bpy.context.view_layer.update();rig.data.pose_position='POSE';rig.update_tag(refresh={'OBJECT','DATA','TIME'});bpy.context.view_layer.update()
  scene.render.filepath=str(folder/f'{angle}-{frame:03d}.png');bpy.ops.render.render(write_still=True)
