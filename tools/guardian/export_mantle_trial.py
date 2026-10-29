import bpy,pathlib
root=pathlib.Path.cwd()
bpy.ops.wm.open_mainfile(filepath='C:/tmp/guardian-mantle-weights.blend')
bpy.ops.object.select_all(action='DESELECT')
rig=bpy.data.objects['GuardianRig'];rig.select_set(True)
for track in rig.animation_data.nla_tracks:track.mute=False
for o in bpy.context.scene.objects:
 if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers):o.select_set(True)
out=root/'test-results/guardian-mantle-weights.glb';out.parent.mkdir(exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_morph=True,export_skins=True,export_image_format='JPEG',export_jpeg_quality=88,export_extras=True,export_tangents=True)
exec((root/'tools/guardian/finalize_glb.py').read_text(encoding='utf-8-sig'),{'__file__':str(root/'tools/guardian/finalize_glb.py'),'guardian_glb':out,'guardian_metrics':root/'docs/guardian/wind-wide/mantle-review/weight-export.json'})
