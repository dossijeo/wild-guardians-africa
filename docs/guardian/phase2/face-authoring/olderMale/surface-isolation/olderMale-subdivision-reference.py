import bpy,bmesh
from pathlib import Path
root=Path.cwd();bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202.glb'))
o=bpy.data.objects['Mesh0.001'];m=o.data
bm=bmesh.new();bm.from_mesh(m);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bm.to_mesh(m);bm.free()
m.normals_split_custom_set([(0,0,0)]*len(m.loops))
for p in m.polygons:p.use_smooth=True
for e in m.edges:e.use_edge_sharp=False
sub=o.modifiers.new('Diagnostic smooth reference','SUBSURF');sub.levels=2;sub.render_levels=2
bpy.ops.wm.save_as_mainfile(filepath=str(root/'test-results/olderMale-subdivision-reference.blend'))
