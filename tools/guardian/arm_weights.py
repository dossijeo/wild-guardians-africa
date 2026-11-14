"""Spatially relax shoulder weights so short triangulation edges do not tear."""
import math
from mathutils.kdtree import KDTree

def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def influence(v):
 x,y,z=v.co;return smooth(.055,.095,abs(x))*(1-smooth(.175,.235,abs(x)))*smooth(-.18,-.12,z)*(1-smooth(.075,.13,z))
def relax_shoulders(body):
 tree=KDTree(len(body.data.vertices))
 for v in body.data.vertices:tree.insert(v.co,v.index)
 tree.balance();skin=[{g.group:g.weight for g in v.groups} for v in body.data.vertices]
 for iteration in range(2):
  result=[]
  for v in body.data.vertices:
   strength=influence(v)
   if strength<=0:result.append(skin[v.index]);continue
   neighbours=tree.find_range(v.co,.024);weights={};total=0
   for _,index,distance in neighbours:
    factor=math.exp(-(distance/.012)**2);total+=factor
    for group,weight in skin[index].items():weights[group]=weights.get(group,0)+weight*factor
   groups=set(weights)|set(skin[v.index]);result.append({g:skin[v.index].get(g,0)*(1-strength)+weights.get(g,0)/total*strength for g in groups})
  skin=result
 for v in body.data.vertices:
  if influence(v)<=0:continue
  ranked=sorted(skin[v.index].items(),key=lambda p:-p[1]);cutoff=ranked[4][1] if len(ranked)>4 else 0;weights=[(g,max(0,w-cutoff)) for g,w in ranked[:4]];total=sum(w for g,w in weights)
  for group in body.vertex_groups:group.remove([v.index])
  for g,w in weights:
   if w:body.vertex_groups[g].add([v.index],w/total,'REPLACE')
