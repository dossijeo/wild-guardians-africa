import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path.cwd();bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202.glb'))
o=bpy.data.objects['Mesh0.001'];m=o.data;world=o.matrix_world
keys={v.index:tuple(round(c,5) for c in world@v.co) for v in m.vertices};edges={};rows=[]
for p in m.polygons:
 c=world@p.center
 if not(abs(c.x)<.21 and -.34<c.y<-.15 and 1.08<c.z<1.32):continue
 ns=[m.corner_normals[i].vector for i in p.loop_indices];angles=[p.normal.angle(n) for n in ns]
 rows.append({'face':p.index,'center':list(c),'normalDisagreement':max(angles),'area':p.area})
 for a,b in zip(p.vertices,list(p.vertices[1:])+[p.vertices[0]]):edges.setdefault(tuple(sorted((keys[a],keys[b]))),[]).append(p.index)
r={'faceCount':len(rows),'edgesByIncidence':{str(n):sum(len(v)==n for v in edges.values()) for n in range(1,6)},'worstNormalDisagreement':sorted(rows,key=lambda r:r['normalDisagreement'],reverse=True)[:20]};(root/'test-results/olderMale-topology.json').write_text(json.dumps(r,indent=2));print(json.dumps(r)[:1800])
