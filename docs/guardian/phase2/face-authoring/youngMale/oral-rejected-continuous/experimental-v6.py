"""Recessed worker oral cavity following the reviewed lip incision."""
import argparse,bisect,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
p=argparse.ArgumentParser()
for n in ('input','seam','source-glb','output'):p.add_argument('--'+n,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
body=bpy.data.objects['Mesh0'];world=body.matrix_world.copy();inv=world.inverted()
report=json.loads(Path(a.seam).read_text(encoding='utf-8'))
def key(v):return tuple(round(x,6) for x in v)
adj={}
for edge in report['seam']:
 l,r=map(key,edge);adj.setdefault(l,set()).add(r);adj.setdefault(r,set()).add(l)
ends=[v for v,n in adj.items() if len(n)==1]
assert len(ends)==2 and all(len(n)<=2 for n in adj.values()),'Expected one open lip contour'
chain=[];previous=None;current=ends[0]
while current is not None:
 chain.append(Vector(current));following=next((n for n in adj[current] if n!=previous),None);previous,current=current,following
assert len(chain)==len(adj)
def smooth(l,r,x):
 t=max(0,min(1,(x-l)/(r-l)));return t*t*(3-2*t)
def jaw(v):return smooth(1.13,1.19,v.z)*(1-smooth(-.23,-.185,v.y))*(1-smooth(.06,.095,abs(v.x)))
pivot=Vector(report['pivot']);rot=Matrix.Rotation(report['angle'],3,'X')
verts=[];opened=[];anchors=[];faces=[];colors=[]
def vertex(v,anchor,amount):
 verts.append(inv@v);opened.append(inv@v.lerp(pivot+rot@(v-pivot),amount));anchors.append(anchor.copy());return len(verts)-1
def face(ids,color,direction=None):
 if direction is not None:
  points=[world@verts[i] for i in ids]
  normal=(points[1]-points[0]).cross(points[2]-points[0])
  if normal.dot(Vector(direction))<0:ids=ids[::-1]
 faces.append(ids);colors.append((*color,1))
profile=report['profile']
def lip_height(y):
 j=max(1,min(len(profile)-1,bisect.bisect_right([p[0] for p in profile],y)))
 l,r=profile[j-1],profile[j]
 return l[1]+(r[1]-l[1])*(y-l[0])/(r[0]-l[0])
front_y=min(v.y for v in chain);back_y=max(v.y for v in chain)
rear=Vector((0,-.165,lip_height(0)));grids=[]
for lower in (False,True):
 grid=[]
 for row in range(9):
  d=row/8;line=[]
  for anchor in chain:
   v=anchor.lerp(rear,.025+d*.825)
   v.z+=(-1 if lower else 1)*(.001+.012*math.sin(math.pi*d))
   line.append(vertex(v,anchor,jaw(anchor)*(1-d*.7) if lower else 0))
  grid.append(line)
 for row in range(8):
  for col in range(len(chain)-1):
   ids=[grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]]
   face(ids,(.20,.045,.055) if lower else (.13,.023,.03),(0,0,1 if lower else -1))
 grids.append(grid)
upper,lower=grids
# Rolled lip rims bridge the authored exterior seam to the recessed mucosa.
# The opening stays empty; upper and lower rims never span across each other.
for is_lower,inside in ((False,upper),(True,lower)):
 rim=[]
 for row in range(4):
  t=row/3;line=[]
  for anchor in chain:
   v=anchor.lerp(rear,.012+.013*t)
   v.z+=(-1 if is_lower else 1)*(.001*t+.0006*math.sin(math.pi*t))
   line.append(vertex(v,anchor,jaw(anchor) if is_lower else 0))
  rim.append(line)
 for row in range(3):
  for col in range(len(chain)-1):
   face([rim[row][col],rim[row][col+1],rim[row+1][col+1],rim[row+1][col]],(.12,.075,.065),(0,0,1 if is_lower else -1))

# Buccal strips use the exact palate/floor entrance anchors at both ends.
# The middle bows inward, retaining a genuinely open front aperture.
for side in (-1,1):
 contour=sorted([v for v in chain if v.x*side>.008],key=lambda v:v.y)
 cheek=[]
 for row in range(17):
  t=row/16;line=[]
  for anchor in contour:
   v=anchor.lerp(rear,.025+.045*math.sin(math.pi*t))
   v.z+=.001*(1-2*t)
   line.append(vertex(v,anchor,jaw(anchor)*t))
  cheek.append(line)
 for row in range(16):
  for col in range(len(contour)-1):
   face([cheek[row][col],cheek[row][col+1],cheek[row+1][col+1],cheek[row+1][col]],(.16,.027,.038),(-side,0,0))

for col in range(len(chain)-1):face([upper[-1][col],upper[-1][col+1],lower[-1][col+1],lower[-1][col]],(.085,.012,.02))
# Side walls are at the commissures; the front aperture remains open.
for col in (0,len(chain)-1):
 for row in range(8):face([upper[row][col],upper[row+1][col],lower[row+1][col],lower[row][col]],(.16,.027,.038))
# Rounded, recessed tongue follows the lower jaw, never a sheet across the opening.
rings=[]
for row in range(13):
 t=row/12;y=front_y+.022+(-.18-front_y-.022)*t;width=.035*math.sin(math.pi*(.06+.88*t));ring=[]
 for col in range(16):
  angle=math.tau*col/16;v=Vector((width*math.cos(angle),y,lip_height(0)-.005+.005*math.sin(angle)))
  anchor=min(chain,key=lambda q:(q-v).length_squared)
  ring.append(vertex(v,anchor,jaw(anchor)))
 rings.append(ring)
for row in range(12):
 for col in range(16):face([rings[row][col],rings[row+1][col],rings[row+1][(col+1)%16],rings[row][(col+1)%16]],(.32,.075,.085))
face(rings[0],(.3,.06,.075),(0,-1,0));face(rings[-1],(.22,.035,.045),(0,1,0))
# Small curved dental rows recessed behind the lips. Closed neutral stays hidden.
for is_lower in (False,True):
 for tooth in range(6):
  x=(tooth-2.5)*.012
  anchor=min(chain,key=lambda q:abs(q.x-x))
  y=anchor.y+.018;z=lip_height(x)+(-.004 if is_lower else .004)
  ids=[]
  for dz in (-.004,.004):
   for dy in (-.003,.003):
    for dx in (-.0055,.0055):
     v=Vector((x+dx,y+dy,z+dz))
     ids.append(vertex(v,anchor,jaw(anchor) if is_lower else 0))
  for face_ids in ((0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)):
   face([ids[i] for i in face_ids],(.62,.55,.43))
data=bpy.data.meshes.new('WorkerOralAnatomy');data.from_pydata(verts,[],faces);data.update()
obj=bpy.data.objects.new('WorkerOralAnatomy',data);bpy.context.collection.objects.link(obj);obj.parent=body.parent;obj.matrix_world=world
for mod in body.modifiers:
 if mod.type=='ARMATURE':obj.modifiers.new('Oral skeleton','ARMATURE').object=mod.object
for g in body.vertex_groups:obj.vertex_groups.new(name=g.name)
body.data.calc_loop_triangles();tris=list(body.data.loop_triangles)
tree=BVHTree.FromPolygons([world@v.co for v in body.data.vertices],[list(t.vertices) for t in tris],all_triangles=True)
for i,anchor in enumerate(anchors):
 hit,_,index,_=tree.find_nearest(anchor);tri=tris[index]
 bary=barycentric_transform(hit,*[world@body.data.vertices[v].co for v in tri.vertices],Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
 weights={}
 for vi,factor in zip(tri.vertices,bary):
  for g in body.data.vertices[vi].groups:weights[g.group]=weights.get(g.group,0)+max(0,factor)*g.weight
 strongest=sorted(weights.items(),key=lambda x:x[1],reverse=True)[:4];total=sum(w for _,w in strongest);assert total>0
 for g,w in strongest:obj.vertex_groups[g].add([i],w/total,'REPLACE')
obj.shape_key_add(name='Basis');morph=obj.shape_key_add(name='mouthOpen')
for dest,v in zip(morph.data,opened):dest.co=v
color=data.color_attributes.new(name='OralColor',type='FLOAT_COLOR',domain='CORNER')
data.color_attributes.active_color=color
for poly,c in zip(data.polygons,colors):
 poly.use_smooth=True
 for i in poly.loop_indices:
  point=world@data.vertices[data.loops[i].vertex_index].co
  # Authored cavity shading: deeper tissue receives less indirect light.
  # This preserves volume in the inexpensive, shadow-free strategic renderer.
  front=max(0,min(1,(-point.y-.165)/.09))
  shade=.10+.42*front*front
  if c[0]>.25:shade*=1.15+.20*max(-1,min(1,(point.z-lip_height(0)+.005)/.005))
  color.data[i].color=(*[v*(.8 if c[0]>.5 else shade) for v in c[:3]],c[3])
mat=bpy.data.materials.new('Worker oral tissue');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.75
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='OralColor';mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);data.materials.append(mat)
out=Path(a.output).resolve();bpy.ops.wm.save_as_mainfile(filepath=str(out),compress=True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_source_animations import restore
restore(a.source_glb,out.with_suffix('.glb'))
out.with_suffix('.json').write_text(json.dumps({'status':'oral candidate, requires visual validation; not installed','vertices':len(verts),'faces':len(faces),'lipVertices':len(chain),'binding':'barycentric source lip weights, four normalized influences','aperture':'open front; recessed palate, floor, tongue, rear and commissure walls'},indent=2),encoding='utf-8')
