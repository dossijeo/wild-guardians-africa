"""Authored low savanna grass fans: folded leaves, no texture/billboard/random noise."""
from pathlib import Path
import bpy,math,json
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/grass-beds';O.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# angle, height, half width, outward tip reach: asymmetric fans around an open centre.
leaves=[(5,.18,.021,.14),(24,.15,.024,.18),(48,.13,.022,.20),(79,.20,.019,.13),(108,.16,.024,.17),(129,.14,.022,.20),(159,.19,.021,.15),(187,.15,.024,.18),(212,.13,.023,.21),(241,.20,.020,.14),(267,.16,.023,.18),(293,.14,.022,.20),(322,.18,.021,.16),(347,.15,.022,.18),(40,.23,.017,.08),(140,.22,.018,.09),(230,.24,.017,.08),(310,.21,.018,.10)]
verts=[];faces=[];colors=[];palette=[(.40,.335,.135),(.46,.39,.17),(.37,.33,.14)]
for j,(degrees,height,width,reach) in enumerate(leaves):
 angle=math.radians(degrees);ca,sa=math.cos(angle),math.sin(angle);base=len(verts);radius=.025 if j>=14 else .055
 for row,t in enumerate((0,.55)):
  distance=radius+reach*t*t;span=width*(.55 if row==0 else 1);z=height*t
  for across,ridge in [(-1,0),(0,.004),(1,0)]:verts.append((ca*distance-sa*span*across,sa*distance+ca*span*across,z+ridge))
 # Tapered tip bends out and slightly down, not an inverted ribbon ending.
 verts.append((ca*(radius+reach),sa*(radius+reach),height*.79))
 local=[(0,1,3),(1,4,3),(1,2,4),(2,5,4),(3,4,6),(4,5,6)]
 for index,face in enumerate(local):
  faces.append(tuple(base+x for x in face));shade=.70 if index<4 else .96;colors.append(tuple(c*shade for c in palette[j%3]))
mesh=bpy.data.meshes.new('Low folded savanna leaf fans');mesh.from_pydata(verts,[],faces);mesh.update();attribute=mesh.color_attributes.new(name='GroundDetailColor',type='BYTE_COLOR',domain='CORNER')
for face,color in zip(mesh.polygons,colors):
 face.use_smooth=False
 for loop in face.loop_indices:attribute.data[loop].color=(*color,1)
obj=bpy.data.objects.new('Savanna authored low grass bed',mesh);bpy.context.collection.objects.link(obj);obj.select_set(True);bpy.context.view_layer.objects.active=obj
mat=bpy.data.materials.new('Dry olive straw');mat.use_nodes=True;mat.use_backface_culling=False;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.96;node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='GroundDetailColor';mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color']);mesh.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=str(O/'savanna-low-grass.blend'))
path=R/'public/assets/visual-lab/savanna-low-grass-beds.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True)
(O/'mesh-audit.json').write_text(json.dumps({'leaves':leaves,'triangles':len(faces),'verticesBeforeExport':len(verts),'bytes':path.stat().st_size,'textureCount':0,'materials':1,'geometry':'18 folded and tapered leaf fans'},indent=2)+'\n',newline='\n')
