"""Graft authored worker facial meshes into the full gameplay library, preserving tools/rig."""
import bpy,sys,argparse
from pathlib import Path
p=argparse.ArgumentParser()
for n in ('library','face-blend','output'):p.add_argument('--'+n,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(Path(a.library).resolve()))
body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Mesh0'));rig=next(m.object for m in body.modifiers if m.type=='ARMATURE');parent=body.parent
world=body.matrix_world.copy();bpy.data.objects.remove(body,do_unlink=True)
with bpy.data.libraries.load(str(Path(a.face_blend).resolve()),link=False) as (src,dst):dst.objects=['Mesh0','ActorFacialLids','WorkerOralAnatomy']
for obj in dst.objects:
 assert obj is not None
 bpy.context.scene.collection.objects.link(obj)
 old_world=obj.matrix_world.copy();source_rig=next(m.object for m in obj.modifiers if m.type=='ARMATURE')
 common=[b.name for b in source_rig.data.bones if b.name in rig.data.bones]
 assert len(common)==28,'Worker skeleton mismatch'
 name=common[0]
 bridge=(rig.matrix_world@rig.data.bones[name].matrix_local)@(source_rig.matrix_world@source_rig.data.bones[name].matrix_local).inverted()
 for name in common:
  expected=rig.matrix_world@rig.data.bones[name].matrix_local
  actual=bridge@source_rig.matrix_world@source_rig.data.bones[name].matrix_local
  assert max(abs(actual[i][j]-expected[i][j]) for i in range(4) for j in range(4))<1e-4,'Nonrigid skeleton mismatch: '+name
 obj.parent=parent;obj.matrix_world=bridge@old_world
 for mod in obj.modifiers:
  if mod.type=='ARMATURE':mod.object=rig

out=Path(a.output);bpy.ops.wm.save_as_mainfile(filepath=str(out.resolve()),compress=True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb').resolve()),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_source_animations import restore
restore(a.library,out.with_suffix('.glb'))
