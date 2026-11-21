"""Repair two raycast-confirmed misplaced UV islands; preserve mesh and morphs."""
import argparse,json,sys,hashlib
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.geometry import barycentric_transform
p=argparse.ArgumentParser()
for n in ('input','output','source-glb'):p.add_argument('--'+n,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
assert hashlib.sha256(Path(a.source_glb).read_bytes()).hexdigest()=='0ab73565649737fc15d853aa9d52a9ecacff3fbf9f5664cc21ec4e54452ef894','Unexpected source library'
m=bpy.data.objects['Mesh0.001'];uv=m.data.uv_layers.active.data
key=lambda i:tuple(round(x,6) for x in m.data.vertices[i].co)
faces=list(m.data.polygons);report=[]
for index in (12586,16118):
 f=faces[index];keys={key(i) for i in f.vertices}
 assert len(f.vertices)==3 and max(uv[i].uv.y for i in f.loop_indices)<.1,'Unexpected source UV patch'
 candidates=[g for g in faces if g.index!=index and len(g.vertices)==3 and len(keys&{key(i) for i in g.vertices})>=2 and min(uv[i].uv.y for i in g.loop_indices)>.1]
 assert candidates,'No adjacent main-island face'
 g=max(candidates,key=lambda g:g.normal.dot(f.normal))
 positions=[m.data.vertices[i].co for i in g.vertices]
 coords=[Vector((*uv[i].uv,0)) for i in g.loop_indices]
 before=[list(uv[i].uv) for i in f.loop_indices]
 for loop in f.loop_indices:
  v=m.data.vertices[m.data.loops[loop].vertex_index].co
  uv[loop].uv=barycentric_transform(v,*positions,*coords).xy
 report.append({'face':index,'neighbor':g.index,'before':before,'after':[list(uv[i].uv) for i in f.loop_indices]})
bpy.ops.file.pack_all();out=Path(a.output).resolve();bpy.ops.wm.save_as_mainfile(filepath=str(out),compress=True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
sys.path.insert(0,str(Path(__file__).resolve().parent));from restore_source_animations import restore
restore(a.source_glb,out.with_suffix('.glb'));out.with_suffix('.uv.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
