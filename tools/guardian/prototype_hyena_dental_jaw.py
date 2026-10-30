"""EXPERIMENTAL: curved dental seam calibrated to the visual-lab hyena.
Not approved for runtime: oral corners, texture baking and runtime checks remain.
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
from actor_dentition import detach_hyena_dentition
layer=bm.faces.layers.int.new('bodySurface');rigid=bm.verts.layers.float.new('rigidCanine')
dentalTag,dentalReport=detach_hyena_dentition(bm,world)
seen=set();groups=[]
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
for v in bm.verts:v[rigid]=float(bool(v.link_faces) and all(f[dentalTag]>0 for f in v.link_faces))
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
# Consecutive bisects can leave nearly coincident vertices at section joins.
# Classify complete faces, then split their entire upper/lower interface. A
# coordinate-only vertex test left some lower faces stretched across the gap.
bmesh.ops.remove_doubles(bm,verts=[v for v in bm.verts if not any(f[dentalTag] for f in v.link_faces)],dist=1e-6)
side=bm.faces.layers.int.new('lowerJawSurface')
for f in bm.faces:f[side]=int(sum(v.co.z-lipZ(v.co.y) for v in f.verts)/len(f.verts)<-1e-7)
seam=[]
for e in bm.edges:
 if len(e.link_faces)!=2 or e.link_faces[0][side]==e.link_faces[1][side]:continue
 p=(e.verts[0].co+e.verts[1].co)*.5
 if abs(p.x)<.18 and -.79<p.y<-.53 and 1.33<p.z<1.48 and all(f[layer] for f in e.link_faces):seam.append(e)
seamSegments=[[list(v.co) for v in e.verts] for e in seam]
bmesh.ops.split_edges(bm,edges=seam)
bm.verts.ensure_lookup_table();bm.verts.index_update();weights=[]
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for v in bm.verts:
 p=v.co;isLower=bool(v.link_faces) and all(f[side] for f in v.link_faces)
 value=float(isLower)*smooth(1.16,1.24,p.z)*(1-smooth(-.60,-.545,p.y))*(1-smooth(.15,.23,abs(p.x)))
 if not any(f[layer] for f in v.link_faces):value=0.
 if v[rigid]>.99:value=1.
 weights.append(value);v.co=inv@p
bm.to_mesh(m.data);m.data.update();m.shape_key_add(name='Basis');key=m.shape_key_add(name='mouthOpen');pivot=Vector((0,-.41,1.43));rot=Matrix.Rotation(.32,3,'X')
for v,dst in zip(m.data.vertices,key.data):
 p=world@v.co;dst.co=inv@p.lerp(pivot+rot@(p-pivot),weights[v.index])
iteration=0
output.with_suffix('.report.json').write_text(json.dumps({'iterations':iteration,'dentition':dentalReport,'upperBoundary':[list(ps[i]) for i in upper],'lowerBoundary':[list(ps[i]) for i in lower],'vertices':len(m.data.vertices),'method':'piecewise dental contour; experimental' },indent=2))
m=next(o for o in bpy.context.scene.objects if o.type=='MESH');apply_muzzle_patch(m,args.patch,bilateral=True)
world=m.matrix_world.copy();inv=world.inverted();pivot=Vector((0,-.41,1.43));rot=Matrix.Rotation(.32,3,'X');points=[(-.76,1.35),(-.70,1.377),(-.67,1.394),(-.64,1.404),(-.59,1.439),(-.55,1.453),(-.45,1.453)]
def lipZ(y):
 import bisect
 j=max(1,min(len(points)-1,bisect.bisect_right([p[0] for p in points],y)));a,b=points[j-1],points[j];return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0])
# Recessed anatomical cavity. The dental entrance remains open: no sheets
# connect the front upper/lower lip contours across the aperture.
base=[];opened=[];faces=[];faceMaterials=[];columns=33;rows=9
for surface in ['palate','floor']:
 start=len(base)
 for row in range(rows):
  depth=row/(rows-1)
  for col in range(columns):
   theta=-math.pi/2+math.pi*col/(columns-1)
   x=.14*math.sin(theta);y=-.54-.12*math.cos(theta)
   rim=Vector((x*.91,y+.014,lipZ(y)-.006));back=Vector((x*.48,-.54,1.435))
   rest=rim.lerp(back,depth)
   if surface=='palate':rest.z+=.012+.018*math.sin(math.pi*depth);final=rest.copy()
   else:
    rest.x*=.7
    lipFloor=lipZ(y)-.023-.025*smooth(-.65,-.55,y)
    blend=smooth(0,.35,depth);rest.z=lipFloor*(1-blend)+(1.36+.025*depth)*blend
    influence=(1-smooth(.6,.95,abs(math.sin(theta)))*smooth(-.60,-.545,rest.y))*(1-.75*smooth(.5,1,depth))
    final=rest.lerp(pivot+rot@(rest-pivot),influence)
   base.append(tuple(inv@rest));opened.append(tuple(inv@final))
 for row in range(rows-1):
  for col in range(columns-1):
   i=start+row*columns+col;faces.append((i,i+1,i+1+columns,i+columns));faceMaterials.append(0 if surface=='palate' else 1)
# Only the recessed back of the cavity and posterior cheeks are enclosed.
# They sit behind the lip corners, not across the visible dental entrance.
floorStart=rows*columns
for col in range(columns-1):
 a=(rows-1)*columns+col;b=a+1;faces.append((a,b,floorStart+b,floorStart+a));faceMaterials.append(2)
for col in [0,columns-1]:
 for row in range(rows-1):
  a=row*columns+col;b=a+columns;faces.append((a,b,floorStart+b,floorStart+a));faceMaterials.append(1)
# Buccal walls run backwards into the head, along depth rather than across
# the aperture. Their curvature stays behind the canine/lip corners.
for col,sign in [(8,-1),(24,1)]:
 start=len(base)
 for step in range(9):
  t=step/8
  for row in range(rows):
   top=row*columns+col;bottom=floorStart+top
   rest=world@Vector(base[top]).lerp(Vector(base[bottom]),t)
   final=world@Vector(opened[top]).lerp(Vector(opened[bottom]),t)
   bulge=.012*math.sin(math.pi*t)*(1-row/(rows-1))
   rest.x+=sign*bulge;final.x+=sign*bulge
   # Round the cheek entrance back toward the oral commissure.
   recess=.025*math.sin(math.pi*t)*(1-row/(rows-1))
   rest.y+=recess;final.y+=recess
   base.append(tuple(inv@rest));opened.append(tuple(inv@final))
 for step in range(8):
  for row in range(rows-1):
   i=start+step*rows+row;faces.append((i,i+1,i+1+rows,i+rows));faceMaterials.append(1)

# A rounded tongue volume rests on the lower jaw; it is not an upright sheet.
start=len(base);tongueCols=32;tongueRows=13
for row in range(tongueRows):
 theta=math.pi*row/(tongueRows-1)
 for col in range(tongueCols):
  phi=math.tau*col/tongueCols
  rest=Vector((.055*math.sin(theta)*math.cos(phi),-.625+.035*math.sin(theta)*math.sin(phi),1.375+.012*math.cos(theta)))
  base.append(tuple(inv@rest));opened.append(tuple(inv@(pivot+rot@(rest-pivot))))
for row in range(tongueRows-1):
 for col in range(tongueCols):
  a=start+row*tongueCols+col;b=start+row*tongueCols+(col+1)%tongueCols;faces.append((a,b,b+tongueCols,a+tongueCols));faceMaterials.append(3)
frontUpper=set(range(1,columns-1));frontLower={floorStart+i for i in frontUpper}
assert not any(frontUpper.intersection(face) and frontLower.intersection(face) for face in faces), 'A face blocks the dental entrance'
data=bpy.data.meshes.new('Recessed palate gums floor tongue');data.from_pydata(base,[],faces);data.update();o=bpy.data.objects.new('OralCavity',data);bpy.context.collection.objects.link(o);o.matrix_world=world.copy()
for name,color in [('Palate',(.095,.018,.025,1)),('Oral floor and cheeks',(.07,.012,.02,1)),('Recessed throat',(.028,.004,.007,1)),('Tongue',(.22,.05,.06,1))]:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=.85;bs.inputs['Specular IOR Level'].default_value=.12;data.materials.append(mat)
for f,index in zip(data.polygons,faceMaterials):f.use_smooth=True;f.material_index=index
head=next(g.name for g in m.vertex_groups if g.name.replace('mixamorig:','')=='Head');o.vertex_groups.new(name=head).add(list(range(len(base))),1,'REPLACE')
for mod in m.modifiers:
 if mod.type=='ARMATURE':o.modifiers.new('Face skeleton','ARMATURE').object=mod.object
for name in ['Basis','mouthOpen']:key=o.shape_key_add(name=name)
for v,p in zip(key.data,opened):v.co=p
bpy.ops.wm.save_as_mainfile(filepath=str(output))
