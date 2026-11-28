import bpy,json,struct,sys,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path.cwd()
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,default=Path('C:/tmp/sabana-original.glb'))
parser.add_argument('--donor',type=Path,required=True)
parser.add_argument('--output',type=Path,default=ROOT/'docs/lighting/tree-hd-transfer/original-transfer')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
HD=args.donor

def components(path, reset=True):
 if reset:bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(path))
 result=[]
 for ob in list(bpy.context.scene.objects):
  if ob.type!='MESH':continue
  vs=[ob.matrix_world@v.co for v in ob.data.vertices];parent=list(range(len(vs)))
  def root(i):
   while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
   return i
  def union(a,b):parent[root(b)]=root(a)
  same={}
  for i,v in enumerate(vs):
   key=tuple(round(x,5) for x in v)
   if key in same:union(i,same[key])
   else:same[key]=i
  for f in ob.data.polygons:
   for i in f.vertices[1:]:union(f.vertices[0],i)
  groups={}
  for f in ob.data.polygons:groups.setdefault(root(f.vertices[0]),[]).append(f)
  for faces in groups.values():
   ids=sorted(set(i for f in faces for i in f.vertices));remap={old:i for i,old in enumerate(ids)}
   verts=[vs[i] for i in ids];lo=Vector(tuple(min(v[k] for v in verts) for k in range(3)));hi=Vector(tuple(max(v[k] for v in verts) for k in range(3)))
   center=(lo+hi)*.5;center.z=lo.z;h=hi.z-lo.z
   if h<=1e-8:continue
   result.append({'verts':[(v-center)/h for v in verts],'faces':[tuple(remap[i] for i in f.vertices) for f in faces],'normals':[[list((ob.matrix_world.to_3x3().inverted().transposed()@ob.data.corner_normals[li].vector).normalized()) for li in f.loop_indices] for f in faces],'uv':[[list(ob.data.uv_layers.active.data[li].uv) for li in f.loop_indices] for f in faces],'center':list(center),'bounds':list((hi-lo)/h),'vertices':len(ids),'object':ob.name,'polygonIndices':[f.index for f in faces]})
 return sorted(result,key=lambda c:c['center'][0])
