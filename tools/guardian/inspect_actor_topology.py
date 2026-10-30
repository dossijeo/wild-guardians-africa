"""Read-only welded topology inventory in world coordinates for facial authoring."""
import argparse,sys,json,hashlib
from pathlib import Path
import bpy,bmesh
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(Path(a.input).resolve()))
def bounds(points):
    return {'min':[min(v[i] for v in points) for i in range(3)],'max':[max(v[i] for v in points) for i in range(3)]}
report={'source':a.input,'sha256':hashlib.sha256(Path(a.input).read_bytes()).hexdigest(),'meshes':[]}
for mesh in bpy.context.scene.objects:
    if mesh.type!='MESH':continue
    bm=bmesh.new();bm.from_mesh(mesh.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-5)
    bm.verts.ensure_lookup_table();bm.verts.index_update();row={'name':mesh.name,'vertices':len(bm.verts),'components':[],'boundaries':[]}
    seen=set()
    for v in bm.verts:
        if v in seen:continue
        todo=[v];seen.add(v);part=[]
        while todo:
            q=todo.pop();part.append(q)
            for e in q.link_edges:
                n=e.other_vert(q)
                if n not in seen:seen.add(n);todo.append(n)
        row['components'].append({'vertices':len(part),**bounds([mesh.matrix_world@q.co for q in part])})
    edges=set(e for e in bm.edges if e.is_boundary)
    while edges:
        todo=[edges.pop()];group=[]
        while todo:
            e=todo.pop();group.append(e)
            for v in e.verts:
                for n in v.link_edges:
                    if n in edges:edges.remove(n);todo.append(n)
        vertices={v for e in group for v in e.verts};points=[mesh.matrix_world@v.co for v in vertices]
        row['boundaries'].append({'vertices':len(vertices),**bounds(points),'segments':[[list(mesh.matrix_world@v.co) for v in e.verts] for e in group]})
    report['meshes'].append(row);bm.free()
Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(report,indent=2),encoding='utf-8')
