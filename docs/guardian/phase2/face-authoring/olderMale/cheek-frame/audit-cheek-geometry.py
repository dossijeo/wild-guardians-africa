import bpy,hashlib,json
from pathlib import Path
r=Path.cwd()
def signature(path):
 bpy.ops.wm.open_mainfile(filepath=str(path));result={}
 for o in bpy.data.objects:
  if o.type!='MESH':continue
  m=o.data;data={'positions':[list(v.co) for v in m.vertices],'faces':[list(p.vertices) for p in m.polygons],'weights':[[(g.group,g.weight) for g in v.groups] for v in m.vertices],'groups':[g.name for g in o.vertex_groups],'shapes':{k.name:[list(v.co) for v in k.data] for k in m.shape_keys.key_blocks} if m.shape_keys else {},'uv':[[list(v.uv) for v in layer.data] for layer in m.uv_layers]}
  result[o.name]=hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()
 return result
a=signature(r/'content/source/actors/olderMale/expressive-candidate.blend');b=signature(r/'test-results/olderMale-cheek-frame.blend');assert a==b,(a,b)
(r/'test-results/olderMale-cheek-geometry.json').write_text(json.dumps({'passed':True,'scope':'Exact mesh positions, face indices, UVs, groups, skin weights and all shape positions','meshHashes':a},indent=2));print('Geometry/morph/weight/UV parity passed:',len(a),'meshes')
