"""Offline authored basalt material study. Does not edit runtime assets.

The large forms are explicit sculpted slabs, not a noise/Voronoi shader. Wrap
copies keep the orthographic tile periodic. Existing rock microdetail may be
retained at reduced strength after baking; the original files stay untouched.
"""
import bpy, math, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/qa/global-visual-lab/basalt-plates'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Raw'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'
scene.world.color = (0, 0, 0)

# Individual outlines and compositional placement in an eight-metre tile.
# The offset rows avoid long parallel joints; large quiet surfaces alternate
# with smaller broken pieces. No random seed is involved.
OUTLINES = [
 [(-.91,-.48),(-.40,-.88),(.62,-.72),(1,.02),(.56,.82),(-.55,.77)],
 [(-.86,-.70),(.09,-.91),(.91,-.46),(.79,.58),(-.12,.93),(-.94,.24)],
 [(-.96,-.14),(-.49,-.87),(.58,-.81),(.95,.13),(.24,.91),(-.72,.62)],
 [(-.75,-.79),(.37,-.89),(.98,-.18),(.67,.73),(-.47,.89),(-.95,.17)]
]
SLABS = [
 # x, y, width, depth, angle, height, outline, palette
 (.05,.03,.19,.18,12,.074,0,0),(.32,.08,.18,.19,-18,.093,1,1),
 (.59,.02,.19,.18,8,.080,2,2),(.86,.09,.18,.18,31,.105,3,0),
 (.15,.31,.20,.18,-9,.096,2,1),(.43,.33,.18,.19,16,.071,3,2),
 (.72,.30,.21,.19,-22,.087,0,0),(.97,.35,.17,.19,5,.078,1,1),
 (.03,.60,.18,.20,-27,.091,3,2),(.29,.61,.20,.18,7,.103,0,0),
 (.56,.59,.18,.20,24,.075,1,1),(.84,.62,.20,.18,-12,.088,2,2),
 (.15,.86,.18,.18,18,.083,1,0),(.43,.87,.20,.18,-8,.095,2,1),
 (.71,.89,.19,.17,27,.081,3,2),(.98,.88,.17,.18,-19,.100,0,1)
]
PALETTE = [(.185,.171,.151),(.210,.191,.164),(.166,.159,.145)]
materials = []

def material(name, color, roughness, cavity):
 mat = bpy.data.materials.new(name)
 mat.use_nodes = True
 mat['base'] = color
 mat['roughness'] = roughness
 mat['ao'] = cavity
 materials.append(mat)
 return mat

stone_materials = [material('Warm charcoal '+str(i), c, .82+i*.025, .94) for i,c in enumerate(PALETTE)]
floor_material = material('Recessed dry fracture',(.085,.081,.073),.96,.66)
bpy.ops.mesh.primitive_plane_add(size=24, location=(4,4,0))
bpy.context.object.data.materials.append(floor_material)

for n,(x,y,rx,ry,angle,z,shape,color) in enumerate(SLABS):
 a = math.radians(angle)
 polygon = [(x*8+8*(px*rx*math.cos(a)-py*ry*math.sin(a)),y*8+8*(px*rx*math.sin(a)+py*ry*math.cos(a))) for px,py in OUTLINES[shape]]
 for dx in [-8,0,8]:
  for dy in [-8,0,8]:
   # A shallow crown plus chipped perimeter gives real bake normals, while
   # small height differences interrupt overlap edges instead of painted seams.
   verts=[(px+dx,py+dy,z*(.83+.035*(k%3))) for k,(px,py) in enumerate(polygon)]
   verts += [(px+dx,py+dy,.008) for px,py in polygon]
   verts += [(x*8+dx,y*8+dy,z)]
   faces=[(12,k,(k+1)%6) for k in range(6)]
   faces += [(k,k+6,(k+1)%6+6,(k+1)%6) for k in range(6)]
   mesh=bpy.data.meshes.new('Slab sculpt');mesh.from_pydata(verts,[],faces);mesh.update()
   obj=bpy.data.objects.new(f'Plate {n} wrap {dx},{dy}',mesh);scene.collection.objects.link(obj)
   obj.data.materials.append(stone_materials[color])
   bevel=obj.modifiers.new('Chipped perimeter','BEVEL');bevel.width=.025;bevel.segments=1

def output_material(mat, role):
 nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
 out=nodes.new('ShaderNodeOutputMaterial');em=nodes.new('ShaderNodeEmission');links.new(em.outputs[0],out.inputs['Surface'])
 if role=='base':em.inputs['Color'].default_value=(*mat['base'],1);return
 geo=nodes.new('ShaderNodeNewGeometry')
 if role=='normal':
  vector=nodes.new('ShaderNodeVectorMath');vector.operation='MULTIPLY_ADD'
  links.new(geo.outputs['Normal'],vector.inputs[0]);vector.inputs[1].default_value=(.5,.5,.5);vector.inputs[2].default_value=(.5,.5,.5)
  links.new(vector.outputs['Vector'],em.inputs['Color'])
 else:
  xyz=nodes.new('ShaderNodeSeparateXYZ');links.new(geo.outputs['Position'],xyz.inputs[0])
  height=nodes.new('ShaderNodeMath');height.operation='MULTIPLY_ADD';height.inputs[1].default_value=5; height.inputs[2].default_value=.15;links.new(xyz.outputs['Z'],height.inputs[0])
  rgb=nodes.new('ShaderNodeCombineXYZ');rgb.inputs['X'].default_value=mat['ao'];rgb.inputs['Y'].default_value=mat['roughness'];links.new(height.outputs[0],rgb.inputs['Z']);links.new(rgb.outputs[0],em.inputs['Color'])

bpy.ops.object.camera_add(location=(4,4,20))
scene.camera=bpy.context.object
scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=8
scene.camera.rotation_euler=(0,0,0)
for role in ['base','normal','arh']:
 for mat in materials:output_material(mat,role)
 scene.render.filepath=str(OUT/f'basalt-{role}.png')
 bpy.ops.render.render(write_still=True)
for mat in materials:output_material(mat,'base')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'basalt-plates.blend'))
(OUT/'design.json').write_text(json.dumps({'tileMetres':8,'resolution':[1024,1024],'slabs':SLABS,'outlines':OUTLINES,'palette':PALETTE,'runtimeGeometryChanged':False,'status':'unreviewed bake, not adopted'},indent=2)+'\n',encoding='utf-8',newline='\n')
