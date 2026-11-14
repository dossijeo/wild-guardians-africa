import bpy,pathlib,json,math
from mathutils import Vector
root=pathlib.Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(root/'art/guardian/guardian.blend'));o=bpy.data.objects['Guardian'];center=(o.data.vertices[5134].co+o.data.vertices[5135].co)*.5
original=[{g.group:g.weight for g in v.groups} for v in o.data.vertices];changes=[]
for v in o.data.vertices:
 distance=(v.co-center).length
 if distance>=.018:continue
 if not any(o.vertex_groups[g].name in ['Hand.R','Forearm.R'] and w>.1 for g,w in original[v.index].items()):continue
 neighbors=[n for n in o.data.vertices if (n.co-v.co).length<.008 and any(o.vertex_groups[g].name in ['Hand.R','Forearm.R'] and w>.1 for g,w in original[n.index].items())]
 blend=.75*(1-distance/.018)**.5;target={}
 for n in neighbors:
  for g,w in original[n.index].items():target[g]=target.get(g,0)+w/len(neighbors)
 values={g:original[v.index].get(g,0)*(1-blend)+target.get(g,0)*blend for g in set(original[v.index])|set(target)};values=dict(sorted(values.items(),key=lambda x:-x[1])[:4]);total=sum(values.values());values={g:w/total for g,w in values.items()}
 for g in list(original[v.index]):o.vertex_groups[g].remove([v.index])
 for g,w in values.items():o.vertex_groups[g].add([v.index],w,'REPLACE')
 changes.append(v.index)
bpy.ops.wm.save_as_mainfile(filepath='C:/tmp/guardian-hand-weights.blend');(root/'docs/guardian/wind-wide/hand-weight-trial.json').write_text(json.dumps({'scope':'isolated spatial smoothing candidate; not installed','vertices':changes,'radius':.018,'neighborRadius':.008},indent=2));print('changed',len(changes))
