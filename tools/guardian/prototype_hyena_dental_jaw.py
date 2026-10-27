"""EXPERIMENTAL: curved dental seam calibrated to the visual-lab hyena.
Not approved for runtime: left canine, corners and partial-opening checks remain.
Includes an authoring-only projected texture that must be baked before GLB export.
"""
import bpy,bmesh,math,json,sys,argparse
from mathutils import Vector,Matrix
from mathutils.kdtree import KDTree
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);parser.add_argument('--output',required=True);parser.add_argument('--patch',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);output=Path(args.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(Path(__file__).parent));from hyena_muzzle_patch import apply_muzzle_patch
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(args.input).resolve()))
m=next(o for o in bpy.context.scene.objects if o.type=='MESH');world=m.matrix_world.copy();inv=world.inverted()
bm=bmesh.new();bm.from_mesh(m.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.verts.ensure_lookup_table();bm.verts.index_update()
ps=[world@v.co for v in bm.verts];neighbors=[[e.other_vert(v).index for e in v.link_edges] for v in bm.verts]
edges=set(e for e in bm.edges if e.is_boundary);mouth=None
while edges:
 todo=[edges.pop()];group=[]
 while todo:
  e=todo.pop();group.append(e)
  for v in e.verts:
   for n in v.link_edges:
    if n in edges:edges.remove(n);todo.append(n)
 vs={v.index for e in group for v in e.verts}
 if len(vs)==37 and min(ps[i].z for i in vs)>1.36 and max(ps[i].z for i in vs)<1.47:mouth=group;break
assert mouth,'Original dental boundary not found; refuse approximate cut'
adj={}
for e in mouth:
 a,b=[v.index for v in e.verts];adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
left=min(adj,key=lambda i:ps[i].x);right=max(adj,key=lambda i:ps[i].x)
paths=[]
for first in adj[left]:
 path=[left,first]
 while path[-1]!=right:
  nxt=next(i for i in adj[path[-1]] if i!=path[-2]);path.append(nxt)
 paths.append(path)
upper,lower=sorted(paths,key=lambda path:sum(ps[i].y for i in path)/len(path))
# Piecewise cutting surface follows the observed upper dental boundary.
# It is not a constant-height chin cut. The separate canine is left untouched.
import bisect
points=[(-.76,1.35),(-.70,1.377),(-.67,1.394),(-.64,1.404),(-.59,1.439),(-.55,1.453),(-.50,1.453)]
def lipZ(y):
 j=max(1,min(len(points)-1,bisect.bisect_right([p[0] for p in points],y)));a,b=points[j-1],points[j];return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0])
layer=bm.faces.layers.int.new('bodySurface');seen=set();groups=[]
for v in bm.verts:
 if v in seen:continue
 stack=[v];seen.add(v);group=[]
 while stack:
  q=stack.pop();group.append(q)
  for e in q.link_edges:
   n=e.other_vert(q)
   if n not in seen:seen.add(n);stack.append(n)
 groups.append(group)
body=set(max(groups,key=len))
for f in bm.faces:f[layer]=int(f.verts[0] in body)
for v in bm.verts:v.co=world@v.co
# Split at section boundaries first so a segment plane never cuts the next one.
def region():return [f for f in bm.faces if f[layer] and abs(f.calc_center_median().x)<.18 and -.79<f.calc_center_median().y<-.53 and 1.33<f.calc_center_median().z<1.48]
def geom(faces):return list({v for f in faces for v in f.verts})+list({e for f in faces for e in f.edges})+faces
for y,z in points[1:-1]:bmesh.ops.bisect_plane(bm,geom=geom(region()),dist=1e-7,plane_co=Vector((0,y,0)),plane_no=Vector((0,1,0)))
cut=[]
for a,b in zip(points,points[1:]):
 slope=(b[1]-a[1])/(b[0]-a[0]);faces=[f for f in region() if a[0]-1e-6<f.calc_center_median().y<b[0]+1e-6]
 result=bmesh.ops.bisect_plane(bm,geom=geom(faces),dist=1e-7,plane_co=Vector((0,a[0],a[1])),plane_no=Vector((0,-slope,1)))
 cut.extend(e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge))
bmesh.ops.split_edges(bm,edges=list({e for e in cut if e.is_valid and len(e.link_faces)==2}))
seamSegments=[[list(v.co) for v in e.verts] for e in cut if e.is_valid]
bm.verts.ensure_lookup_table();bm.verts.index_update();weights=[]
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for v in bm.verts:
 p=v.co;isLower=p.z<lipZ(p.y)-1e-6 or (abs(p.z-lipZ(p.y))<1e-5 and all(f.calc_center_median().z<lipZ(f.calc_center_median().y)+1e-6 for f in v.link_faces))
 value=float(isLower)*smooth(1.16,1.24,p.z)*(1-smooth(-.55,-.39,p.y))*(1-smooth(.15,.23,abs(p.x)))
 if v.link_faces and not v.link_faces[0][layer] and .05<p.x<.15 and -.68<p.y<-.57 and 1.37<p.z<1.51:value=1.
 weights.append(value);v.co=inv@p
bm.to_mesh(m.data);m.data.update();m.shape_key_add(name='Basis');key=m.shape_key_add(name='mouthOpen');pivot=Vector((0,-.41,1.43));rot=Matrix.Rotation(.32,3,'X')
for v,dst in zip(m.data.vertices,key.data):
 p=world@v.co;dst.co=inv@p.lerp(pivot+rot@(p-pivot),weights[v.index])
iteration=0
output.with_suffix('.report.json').write_text(json.dumps({'iterations':iteration,'upperBoundary':[list(ps[i]) for i in upper],'lowerBoundary':[list(ps[i]) for i in lower],'vertices':len(m.data.vertices),'method':'piecewise dental contour; experimental' },indent=2))
m=next(o for o in bpy.context.scene.objects if o.type=='MESH');apply_muzzle_patch(m,args.patch)
world=m.matrix_world.copy();inv=world.inverted();pivot=Vector((0,-.41,1.43));rot=Matrix.Rotation(.32,3,'X');points=[(-.76,1.35),(-.70,1.377),(-.67,1.394),(-.64,1.404),(-.59,1.439),(-.55,1.453),(-.45,1.453)]
def lipZ(y):
 import bisect
 j=max(1,min(len(points)-1,bisect.bisect_right([p[0] for p in points],y)));a,b=points[j-1],points[j];return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0])
base=[];opened=[];faces=[];n=48
for row in range(9):
 t=row/8
 for col in range(n):
  a=math.tau*col/n;x=.10*math.sin(a);y=-.56-.12*math.cos(a);z=lipZ(y)-.006
  top=Vector((x,y,z));bottom=pivot+rot@(top-pivot);rest=top.copy();rest.z-=t*.002
  p=top.lerp(bottom,t);p.x*=1-.12*math.sin(math.pi*t);p.y+=.012*math.sin(math.pi*t)
  base.append(tuple(inv@rest));opened.append(tuple(inv@p))
for row in range(8):
 for col in range(n):
  a=row*n+col;b=row*n+(col+1)%n;faces.append((a,b,b+n,a+n))
faces.append(tuple(reversed(range(n))));faces.append(tuple(8*n+i for i in range(n)))
# Bridge each actual cut edge to its paired lower-jaw edge, preventing light leaks.
lookup={}
for v in m.data.vertices:lookup.setdefault(tuple(round(c,5) for c in world@v.co),[]).append(v.index)
key=m.data.shape_keys.key_blocks['mouthOpen']
for segment in seamSegments:
 start=len(base);pairs=[]
 for point in segment:
  top=Vector(point);ids=lookup.get(tuple(round(c,5) for c in top),[])
  if not ids:break
  j=max(ids,key=lambda i:(key.data[i].co-m.data.vertices[i].co).length_squared);bottom=world@key.data[j].co
  pairs.append((top,bottom))
 if len(pairs)!=2:continue
 for row in range(5):
  t=row/4
  for top,bottom in pairs:
   rest=top.copy();rest.x*=.998;p=top.lerp(bottom,t);p.x*=1-.2*math.sin(math.pi*t);p.x*=.98
   base.append(tuple(inv@rest));opened.append(tuple(inv@p))
 for row in range(4):
  i=start+row*2;faces.append((i,i+1,i+3,i+2))

data=bpy.data.meshes.new('Closed oral lining');data.from_pydata(base,[],faces);data.update();o=bpy.data.objects.new('OralLining',data);bpy.context.collection.objects.link(o);o.matrix_world=world.copy()
mat=bpy.data.materials.new('Dark oral lining');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.012,.002,.003,1);bs.inputs['Roughness'].default_value=1;bs.inputs['Specular IOR Level'].default_value=.08;data.materials.append(mat)
for f in data.polygons:f.use_smooth=True
head=next(g.name for g in m.vertex_groups if g.name.replace('mixamorig:','')=='Head');o.vertex_groups.new(name=head).add(list(range(len(base))),1,'REPLACE')
for mod in m.modifiers:
 if mod.type=='ARMATURE':o.modifiers.new('Face skeleton','ARMATURE').object=mod.object
for name in ['Basis','mouthOpen']:key=o.shape_key_add(name=name)
for v,p in zip(key.data,opened):v.co=p
bpy.ops.wm.save_as_mainfile(filepath=str(output))
