"""Recessed buffalo oral cavity following the reviewed lip incision."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
p=argparse.ArgumentParser()
for n in ('input','seam','source-glb','output'):p.add_argument('--'+n,required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
body=bpy.data.objects['Mesh_0'];world=body.matrix_world.copy();inv=world.inverted()
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
def jaw(v):return smooth(1.50,1.57,v.z)*(1-smooth(-.405,-.365,v.y))*(1-smooth(.095,.135,abs(v.x)))
pivot=Vector(report['pivot']);rot=Matrix.Rotation(report['angle'],3,'X')
verts=[];opened=[];anchors=[];faces=[];colors=[]
def vertex(v,anchor,amount):
 verts.append(inv@v);opened.append(inv@v.lerp(pivot+rot@(v-pivot),amount));anchors.append(anchor.copy());return len(verts)-1
def face(ids,color):faces.append(ids);colors.append((*color,1))
rear=Vector((.008,-.325,1.678));grids=[]
for lower in (False,True):
 grid=[]
 for row in range(9):
  d=row/8;line=[]
  for anchor in chain:
   v=anchor.lerp(rear,d*.85)
   v.z+=(-1 if lower else 1)*(.001+.015*math.sin(math.pi*d))
   line.append(vertex(v,anchor,jaw(anchor)*(1-d*.7) if lower else 0))
  grid.append(line)
 for row in range(8):
  for col in range(len(chain)-1):
   ids=[grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]]
   face(ids if lower else ids[::-1],(.20,.045,.055) if lower else (.13,.023,.03))
 grids.append(grid)
upper,lower=grids
for col in range(len(chain)-1):face([upper[-1][col],upper[-1][col+1],lower[-1][col+1],lower[-1][col]],(.085,.012,.02))
# Side walls are at the commissures; the front aperture remains open.
for col in (0,len(chain)-1):
 for row in range(8):face([upper[row][col],upper[row+1][col],lower[row+1][col],lower[row][col]],(.16,.027,.038))
# Rounded, recessed tongue follows the lower jaw, never a sheet across the opening.
rings=[]
for row in range(13):
 t=row/12;y=-.444+.092*t;width=.045*math.sin(math.pi*(.06+.88*t));ring=[]
 for col in range(16):
  angle=math.tau*col/16;v=Vector((.006+width*math.cos(angle),y,1.666+.006*math.sin(angle)))
  anchor=min(chain,key=lambda q:(q-v).length_squared)
  ring.append(vertex(v,anchor,jaw(Vector((v.x,v.y,1.67)))))
 rings.append(ring)
for row in range(12):
 for col in range(16):face([rings[row][col],rings[row][(col+1)%16],rings[row+1][(col+1)%16],rings[row+1][col]],(.32,.075,.085))
face(rings[0][::-1],(.3,.06,.075));face(rings[-1],(.22,.035,.045))
data=bpy.data.meshes.new('BuffaloOralAnatomy');data.from_pydata(verts,[],faces);data.update()
obj=bpy.data.objects.new('BuffaloOralAnatomy',data);bpy.context.collection.objects.link(obj);obj.parent=body.parent;obj.matrix_world=world
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
for poly,c in zip(data.polygons,colors):
 poly.use_smooth=True
 for i in poly.loop_indices:color.data[i].color=c
mat=bpy.data.materials.new('Buffalo oral tissue');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.75
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='OralColor';mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);data.materials.append(mat)
out=Path(a.output).resolve();bpy.ops.wm.save_as_mainfile(filepath=str(out),compress=True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_source_animations import restore
restore(a.source_glb,out.with_suffix('.glb'))
out.with_suffix('.json').write_text(json.dumps({'status':'oral candidate, requires visual validation; not installed','vertices':len(verts),'faces':len(faces),'lipVertices':len(chain),'binding':'barycentric source lip weights, four normalized influences','aperture':'open front; recessed palate, floor, tongue, rear and commissure walls'},indent=2),encoding='utf-8')
