import pathlib
root=pathlib.Path(__file__).resolve().parents[2]
source=(root/'tools/guardian/render_checks.py').read_text(encoding='utf-8-sig');exec(source.split("for name in ['neutral'")[0])
rig=bpy.data.objects['GuardianRig']
for clip in ['Explain','Invoke','Cast']:
 for track in rig.animation_data.nla_tracks:track.mute=track.name not in [clip,'Mantle_Spell' if clip!='Explain' else 'Mantle_Breeze']
 scene.frame_set(37);rig.data.pose_position='REST';bpy.context.view_layer.update();rig.data.pose_position='POSE';rig.update_tag(refresh={'OBJECT','DATA','TIME'});bpy.context.view_layer.update()
 cam.location=(.75,-2,.15) if clip=='Cast' else (0,-2,.05);cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=1.12
 body.data.shape_keys.key_blocks['viseme_C'].value=.6
 scene.render.filepath=str(root/('docs/guardian/pose-'+clip+'.png'));bpy.ops.render.render(write_still=True)
