"""Remove the two reviewed, disconnected source debris islands only."""
import argparse,json,sys
from pathlib import Path
import bpy
from mathutils import Vector
p=argparse.ArgumentParser()
for n in ('input','vertices','source-glb','output'):p.add_argument('--'+n,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);assert Path(a.input).resolve()!=Path(a.output).resolve()
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
m=bpy.data.objects['Mesh_0'];rows=json.loads(Path(a.vertices).read_text(encoding='utf-8'));ids={r['i'] for r in rows};assert len(ids)==173
for r in rows:
 v=m.data.vertices[r['i']];assert (m.matrix_world@v.co-Vector(r['p'])).length<1e-6
 assert len(v.groups)==1 and m.vertex_groups[v.groups[0].group].name=='Neck' and v.groups[0].weight>.99999
for face in m.data.polygons:
 overlap=ids.intersection(face.vertices);assert not overlap or len(overlap)==len(face.vertices),'Selection cuts a connected surface'
before=len(m.data.vertices);keys=[k.name for k in m.data.shape_keys.key_blocks]
bpy.ops.object.select_all(action='DESELECT');m.select_set(True);bpy.context.view_layer.objects.active=m
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_mode(type='VERT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
for v in m.data.vertices:v.select=v.index in ids
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.delete(type='VERT');bpy.ops.object.mode_set(mode='OBJECT')
assert len(m.data.vertices)==before-173 and [k.name for k in m.data.shape_keys.key_blocks]==keys
out=Path(a.output).resolve();bpy.ops.wm.save_as_mainfile(filepath=str(out),compress=True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_source_animations import restore
restore(a.source_glb,out.with_suffix('.glb'))
out.with_suffix('.json').write_text(json.dumps({'removedVertices':173,'before':before,'after':len(m.data.vertices),'shapeKeys':keys,'selection':'two fully disconnected, reviewed source debris islands; no face crosses selection'},indent=2),encoding='utf-8')
