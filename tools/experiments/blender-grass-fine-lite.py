"""Authored closed, curved grass blades. No texture cards or external assets."""
from pathlib import Path
import bpy, bmesh, math, json, random
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/qa/global-visual-lab/grass-fine-lite';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(712);verts=[];faces=[];colors=[]
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
for j in range(72):
 a=j*2.399963;radius=.58*math.sqrt((j+.5)/72);cx=math.cos(a)*radius;cy=math.sin(a)*radius
 angle=a+rng.uniform(-.8,.8);ca,sa=math.cos(angle),math.sin(angle)
 h=rng.uniform(.22,.43)*(1.-radius*.3);reach=rng.uniform(.13,.32);width=rng.uniform(.006,.011);base=len(verts)
 for t in (0,.62):
  distance=reach*t*t;w=width*(1.-t*.72);z=h*math.sin(t*math.pi*.72)
  for side,ridge in [(-1,0),(1,0),(0,w*.32)]:
   verts.append((cx+ca*distance-sa*w*side,cy+sa*distance+ca*w*side,z+ridge))
 verts.append((cx+ca*reach,cy+sa*reach,h*.72))
 local=[(0,2,1)]
 for ring in range(1):
  b=ring*3
  for side in range(3):
   n=(side+1)%3;local.extend([(b+side,b+n,b+3+side),(b+n,b+3+n,b+3+side)])
 local.extend([(3,4,6),(4,5,6),(5,3,6)])
 rgb=rng.choice([(.76,.65,.36),(.84,.73,.44),(.67,.59,.29),(.73,.68,.35)])
 for face in local:
  faces.append(tuple(base+k for k in face));colors.append(rgb)
mesh=bpy.data.meshes.new('Curved closed thin leaves');mesh.from_pydata(verts,[],faces);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);bm.to_mesh(mesh);bm.free()
attr=mesh.color_attributes.new(name='GrassColor',type='BYTE_COLOR',domain='CORNER')
for face,col in zip(mesh.polygons,colors):
 for loop in face.loop_indices:
  z=mesh.vertices[mesh.loops[loop].vertex_index].co.z;shade=.70+.30*min(1,z/.25)
  attr.data[loop].color=(*(linear(c*shade) for c in col),1)
obj=bpy.data.objects.new('FineGrassPatch',mesh);bpy.context.collection.objects.link(obj);obj.select_set(True);bpy.context.view_layer.objects.active=obj
mat=bpy.data.materials.new('Dry fine grass');mat.use_nodes=True;mat.use_backface_culling=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.96
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='GrassColor';mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color']);mesh.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'grass-fine-lite.blend'))
path=ROOT/'public/assets/visual-lab/grass-fine-lite.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True)
(OUT/'mesh-audit.json').write_text(json.dumps({'blades':72,'triangles':len(faces),'boundaryEdges':boundary,'nonmanifoldEdges':nonmanifold,'bytes':path.stat().st_size,'materials':1,'textures':0,'source':'Authored in Blender by this script; original models untouched'},indent=2)+'\n')
