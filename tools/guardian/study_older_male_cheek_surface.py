"""REJECTED olderMale cheek surface experiment; preserves source and detail images."""
import bpy,sys,json,math,hashlib
from pathlib import Path
from mathutils import Vector
root=Path.cwd();source=root/'public/assets/e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202.glb'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202', 'Unreviewed source'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source))
o=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));m=o.data
points=[o.matrix_world@v.co for v in m.vertices];groups={}
for i,p in enumerate(points):groups.setdefault(tuple(round(v,6) for v in p),[]).append(i)
keys=list(groups);lookup={i:k for k,ids in enumerate(groups.values()) for i in ids};positions=[points[ids[0]].copy() for ids in groups.values()];original=[p.copy() for p in positions];neighbors=[set() for p in positions]
for e in m.edges:
 a,b=[lookup[i] for i in e.vertices]
 if a!=b:neighbors[a].add(b);neighbors[b].add(a)
weights=[]
for p in positions:
 r=((abs(p.x)-.135)/.085)**2+((p.y+.23)/.09)**2+((p.z-1.135)/.065)**2
 weights.append(max(0,1-r)**2)
for step in range(12):
 updated=[p.copy() for p in positions]
 for i,p in enumerate(positions):
  if weights[i] and neighbors[i]:
   average=sum((positions[j] for j in neighbors[i]),Vector())/len(neighbors[i]);updated[i]=p.lerp(average,.5*weights[i])
 positions=updated
inverse=o.matrix_world.inverted();changes=[]
for k,ids in enumerate(groups.values()):
 if (positions[k]-original[k]).length>1e-9:
  changes.append((positions[k]-original[k]).length)
  for i in ids:m.vertices[i].co=inverse@positions[k]
# Existing normals retained in this trial to avoid confounding geometry with frame edits.
m.update();output=root/'test-results/olderMale-cheek-surface-trial.blend';bpy.ops.wm.save_as_mainfile(filepath=str(output))
(root/'test-results/olderMale-cheek-surface-trial.json').write_text(json.dumps({'source':str(source),'mesh':o.name,'changedPositionGroups':len(changes),'maximumDisplacement':max(changes,default=0),'iterations':12,'status':'REJECTED: excessive shape change and residual shading cuts; not installed'},indent=2))
