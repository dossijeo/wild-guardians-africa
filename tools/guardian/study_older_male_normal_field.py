"""Local smooth-normal field trial; positions, UVs and skin detail maps untouched."""
import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(root/'content/source/actors/olderMale/expressive-candidate.blend'));o=bpy.data.objects['Mesh0.001'];m=o.data
keys={};lookup={};groups=[]
for v in m.vertices:
 key=tuple(round(c,6) for c in v.co)
 if key not in keys:keys[key]=len(groups);groups.append([])
 lookup[v.index]=keys[key];groups[keys[key]].append(v.index)
neighbors=[set() for g in groups];normals=[Vector() for g in groups]
original=[n.vector.copy() for n in m.corner_normals]
for p in m.polygons:
 for i in p.loop_indices:normals[lookup[m.loops[i].vertex_index]]+=original[i]
 for a,b in zip(p.vertices,list(p.vertices[1:])+[p.vertices[0]]):
  a,b=lookup[a],lookup[b];neighbors[a].add(b);neighbors[b].add(a)
for n in normals:n.normalize()
for iteration in range(5):
 normals=[(n*.5+sum((normals[j] for j in neighbors[i]),Vector())*(.5/max(1,len(neighbors[i])))).normalized() for i,n in enumerate(normals)]
changes=[];output=[]
for i,loop in enumerate(m.loops):
 point=o.matrix_world@m.vertices[loop.vertex_index].co
 # Restrict to lower cheeks and nose; don't change eyes, mouth or forehead.
 r=min(((abs(point.x)-.13)/.09)**2+((point.z-1.13)/.065)**2, (point.x/.09)**2+((point.z-1.16)/.075)**2)
 weight=max(0,1-r)**.5 if point.y<-.18 else 0
 n=original[i].lerp(normals[lookup[loop.vertex_index]],weight).normalized();output.append(n)
 if weight:changes.append(original[i].angle(n))
m.normals_split_custom_set(output);m.update();bpy.ops.wm.save_as_mainfile(filepath=str(root/'test-results/olderMale-normal-field.blend'),compress=True)
(root/'test-results/olderMale-normal-field.json').write_text(json.dumps({'affectedCorners':len(changes),'maximumAngleRadians':max(changes),'positionEdits':0,'imageEdits':0,'status':'isolated trial'},indent=2))
