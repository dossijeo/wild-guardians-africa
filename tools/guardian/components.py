import bpy,json,pathlib
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/inspection.blend'))
o=bpy.data.objects['Mesh_0'];m=o.data
# Connected components after joining only identical positions (UV seams remain in source).
parent=list(range(len(m.vertices)))
def find(a):
 while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
 return a
def union(a,b):parent[find(a)]=find(b)
positions={}
for v in m.vertices:
 key=tuple(round(c,5) for c in v.co)
 if key in positions:union(v.index,positions[key])
 else:positions[key]=v.index
for e in m.edges:union(*e.vertices)
groups={}
for v in m.vertices:groups.setdefault(find(v.index),[]).append(v)
result=[]
for vertices in groups.values():
 co=[o.matrix_world@v.co for v in vertices]
 result.append({'count':len(co),'min':[min(v[i] for v in co) for i in range(3)],'max':[max(v[i] for v in co) for i in range(3)]})
(root/'docs/guardian/components.json').write_text(json.dumps(sorted(result,key=lambda x:-x['count']),indent=2))
print(json.dumps(sorted(result,key=lambda x:-x['count'])[:30],indent=2))
