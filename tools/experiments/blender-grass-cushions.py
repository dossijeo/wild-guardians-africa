"""QA dry grass cushions: closed triangular blades, five unequal growth centres.
No cards, original model replacement, textures, or external assets.
"""
from pathlib import Path
import bpy, math, json
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/qa/global-visual-lab/grass-cushions';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
verts=[];faces=[];colors=[]
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
# Explicit crown layout, with shorter peripheral growth and an asymmetric opening.
centres=[(-.23,-.07,.19,7),(.05,.02,.28,9),(.23,.14,.17,6),(-.04,.25,.16,5),(.12,-.22,.20,6)]
palette=[(.67,.53,.25),(.76,.63,.34),(.58,.49,.24),(.82,.71,.43)]
for crown,(cx,cy,height,count) in enumerate(centres):
 for j in range(count):
  angle=2*math.pi*(j/count+crown*.173);ca,sa=math.cos(angle),math.sin(angle)
  h=height*(.76+.24*math.sin(j*2.3+crown)**2);reach=.14+.07*math.sin(j*1.7+crown)**2
  width=.009+.006*math.cos(j*2.1+crown)**2;base=len(verts)
  for t in (0,.55):
   distance=.025+reach*t*t;w=width*(.55 if t==0 else 1)
   z=h*math.sin(t*math.pi*.68)
   for side,ridge in [(-1,0),(1,0),(0,w*.45)]:
    verts.append((cx+ca*distance-sa*w*side,cy+sa*distance+ca*w*side,z+ridge))
  verts.append((cx+ca*(.025+reach),cy+sa*(.025+reach),h*.82))
  local=[(0,2,1),(0,1,3),(1,4,3),(1,2,4),(2,5,4),(2,0,5),(0,3,5),(3,4,6),(4,5,6),(5,3,6)]
  for n,face in enumerate(local):
   faces.append(tuple(base+k for k in face));rgb=palette[(j+crown)%len(palette)]
   shade=.68 if n==0 else .83 if n<7 else 1
   colors.append(tuple(linear(c*shade) for c in rgb))
mesh=bpy.data.meshes.new('Closed folded grass blades');mesh.from_pydata(verts,[],faces);mesh.update()
attr=mesh.color_attributes.new(name='GrassColor',type='BYTE_COLOR',domain='CORNER')
for face,col in zip(mesh.polygons,colors):
 for loop in face.loop_indices:attr.data[loop].color=(*col,1)
obj=bpy.data.objects.new('GrassCushion',mesh);bpy.context.collection.objects.link(obj);obj.select_set(True);bpy.context.view_layer.objects.active=obj
mat=bpy.data.materials.new('Warm dry grass');mat.use_nodes=True;mat.use_backface_culling=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.96
node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='GrassColor';mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color']);mesh.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'grass-cushion.blend'))
path=ROOT/'public/assets/visual-lab/grass-cushion.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True)
(OUT/'mesh-audit.json').write_text(json.dumps({'blades':sum(c[3] for c in centres),'triangles':len(faces),'bytes':path.stat().st_size,'materials':1,'textures':0,'source':'Authored in Blender by this script; no external assets; original models untouched'},indent=2)+'\n')
