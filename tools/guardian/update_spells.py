import bpy,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'tools/guardian'))
bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/guardian.blend'))
from spell_actions import create_spells
rig=bpy.data.objects['GuardianRig'];create_spells(rig)
for track in rig.animation_data.nla_tracks:track.mute=track.name not in ['Idle','Float','Mantle_Breeze']
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/guardian/guardian.blend'))
for track in rig.animation_data.nla_tracks:track.mute=False
bpy.ops.export_scene.gltf(filepath=str(root/'public/content/guardian/guardian.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_morph=True,export_skins=True,export_image_format='JPEG',export_jpeg_quality=88,export_extras=True,export_tangents=True)
exec((root/'tools/guardian/finalize_glb.py').read_text(encoding='utf-8-sig'),{'__file__':str(root/'tools/guardian/finalize_glb.py')})
