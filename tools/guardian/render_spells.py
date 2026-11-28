import pathlib
root=pathlib.Path(__file__).resolve().parents[2]
source=(root/'tools/guardian/render_checks.py').read_text(encoding='utf8');exec(source.split("for name in ['neutral'")[0])
rig=bpy.data.objects['GuardianRig'];scene.cycles.samples=8
folder=root/'docs/guardian/phase2';folder.mkdir(exist_ok=True)
for clip,frame in [('Spell_Grow',25),('Spell_Multiply',17),('Spell_Shield',25),('Spell_Attack',15)]:
 for track in rig.animation_data.nla_tracks:track.mute=track.name not in [clip,'Float','Mantle_Spell']
 scene.frame_set(frame);rig.data.pose_position='REST';bpy.context.view_layer.update();rig.data.pose_position='POSE';rig.update_tag(refresh={'OBJECT','DATA','TIME'});bpy.context.view_layer.update()
 cam.location=(.65,-2,.12);cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=1.12
 scene.render.filepath=str(folder/(clip+'.png'));bpy.ops.render.render(write_still=True)
