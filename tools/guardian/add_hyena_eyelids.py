"""Add calibrated hyena eyelids to the corrected dental authoring source.
Separate from the rejected historical mouth builder; preserves existing morphs.
"""
import bpy,math,argparse,sys
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
assert not bpy.data.objects.get('FacialLids'), 'Lids already exist'
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.uv_layers.get('MuzzleRepairProjection'))
world=mesh.matrix_world.copy();inv=world.inverted()
head={g.index for g in mesh.vertex_groups if g.name.replace('mixamorig:','')=='Head'}
profile={'eyes':[[-.115,-.565,1.59],[.115,-.565,1.59]]}
# A fur-covered lid moves over the unchanged eyeball. Flattening an entire
# socket stretches the brow atlas and is intentionally not used.
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
mesh.data.calc_loop_triangles();tris=list(mesh.data.loop_triangles)
tree=BVHTree.FromPolygons([world@v.co for v in mesh.data.vertices],[list(t.vertices) for t in tris],all_triangles=True)
uv=mesh.data.uv_layers.active.data
def surface(x,z):
 hit,normal,index,d=tree.ray_cast(Vector((x,-3,z)),Vector((0,1,0)))
 if hit is None:return Vector((x,-.56,z)),Vector((.5,.5,0))
 tri=tris[index];vs=[world@mesh.data.vertices[i].co for i in tri.vertices];us=[Vector((*uv[i].uv,0)) for i in tri.loops]
 return hit,barycentric_transform(hit,*vs,*us)
# Bake a continuous frontal color atlas to avoid interpolating across the
# original UV islands when creating new eyelid polygons.
original=mesh.data.materials[0];bake=original.copy();nodes=bake.node_tree.nodes;links=bake.node_tree.links
bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED');output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');emission=nodes.new('ShaderNodeEmission')
if bs.inputs['Base Color'].is_linked:links.new(bs.inputs['Base Color'].links[0].from_socket,emission.inputs['Color'])
else:emission.inputs['Color'].default_value=bs.inputs['Base Color'].default_value
links.new(emission.outputs[0],output.inputs['Surface']);mesh.data.materials[0]=bake
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.resolution_x=2048;scene.render.resolution_y=2048;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.render.film_transparent=True
for rig in scene.objects:
 if rig.type=='ARMATURE':rig.data.pose_position='REST'
bpy.ops.object.camera_add(location=(0,-3,1.62));camera=bpy.context.object;camera.rotation_euler=(math.pi/2,0,0);camera.data.type='ORTHO';camera.data.ortho_scale=.7;scene.camera=camera
atlasPath=str(Path(a.output).with_suffix('.atlas.png'));scene.render.filepath=atlasPath;bpy.ops.render.render(write_still=True)
atlas=bpy.data.images.load(atlasPath);atlas.pack();mesh.data.materials[0]=original;bpy.data.objects.remove(camera,do_unlink=True)
for rig in scene.objects:
 if rig.type=='ARMATURE':rig.data.pose_position='POSE'
lidMaterial=bpy.data.materials.new('Original fur eyelid atlas');lidMaterial.use_nodes=True;node=lidMaterial.node_tree.nodes.new('ShaderNodeTexImage');node.image=atlas;bs=lidMaterial.node_tree.nodes.get('Principled BSDF');lidMaterial.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.85
verts=[];closed=[];tex=[];faces=[];sides=[];columns=33;rows=13
# The eye sockets turn away from the frontal plane toward the temples.
# A symmetric frontal sphere floated 18-40 mm in front of the actual eye.
# Follow that depth gradient while retaining a continuous surface for morphs.
def lid_depth(x,z,cx,cz):
 u=(x-cx)/.070
 radial=max(0,1-u*u-((z-cz)/.052)**2)
 return (-.546 if cx<0 else -.538)+.35*(abs(x)-.115)-.057*math.sqrt(radial)
upperBounds={};lowerBounds={}
for side,eye in zip(['L','R'],profile['eyes']):
 cx,cy,cz=eye;bounds=[];lowerBounds[side]=[]
 for col in range(columns):
  u=(col/(columns-1)*2-1)*.995;x=cx+u*.070;arch=math.sqrt(max(0,1-u*u));upper=cz+.052*arch;lower=cz-.052*arch;visible=[]
  for sample in range(81):
   z=cz+.052*arch*(1-2*sample/80)
   envelope=lid_depth(x,z,cx,cz)
   skin,_=surface(x,z)
   if envelope<skin.y-.001:
    visible.append(z)
  if visible:upper=min(upper,visible[0]+.003);lower=max(lower,visible[-1]-.003)
  bounds.append(upper);lowerBounds[side].append(lower)
 upperBounds[side]=bounds
for side,eye in zip(['L','R'],profile['eyes']):
 cx,cy,cz=eye;start=len(verts)
 for row in range(rows):
  t=row/(rows-1)
  for col in range(columns):
   u=(col/(columns-1)*2-1)*.995;x=cx+u*.070;arch=math.sqrt(max(0,1-u*u))
   top=upperBounds[side][col];bottom=lowerBounds[side][col]
   # A continuous eye envelope stays behind the brow instead of sampling
   # discontinuous brow/eyeball depths into a folded sheet.
   initialZ=top-.0001*t
   initial=Vector((x,lid_depth(x,initialZ,cx,cz),initialZ))
   z=top+(bottom-top)*t
   radial=max(0,1-u*u-((z-cz)/.052)**2)
   final=Vector((x,lid_depth(x,z,cx,cz),z))
   coord=Vector(((x+.35)/.7,(cz+.10+.060*t-1.27)/.7,0))
   verts.append(tuple(inv@initial));closed.append(tuple(inv@final));tex.append((coord.x,coord.y));sides.append(side)
 for row in range(rows-1):
  for col in range(columns-1):
   i=start+row*columns+col;faces.append((i,i+columns,i+columns+1,i+1))
data=bpy.data.meshes.new('Expressive fur lids');data.from_pydata(verts,[],faces);data.update();lids=bpy.data.objects.new('FacialLids',data);bpy.context.collection.objects.link(lids);lids.matrix_world=world.copy()
data.materials.append(lidMaterial);layer=data.uv_layers.new(name='UVMap')
for poly in data.polygons:
 poly.use_smooth=True
 for li in poly.loop_indices:layer.data[li].uv=tex[data.loops[li].vertex_index]
group=lids.vertex_groups.new(name=next(g.name for g in mesh.vertex_groups if g.index in head));group.add(list(range(len(verts))),1,'REPLACE')
for modifier in mesh.modifiers:
 if modifier.type=='ARMATURE':lids.modifiers.new('Face skeleton','ARMATURE').object=modifier.object
lids.shape_key_add(name='Basis')
# Intermediate poses follow the spherical surface. A single straight morph
# from a collapsed lid cuts through the eyeball during partial closure.
for side in ['L','R']:
 for amount in [.25,.5,.75,1]:
  name='blink'+side+('' if amount==1 else str(round(amount*100)))
  key=lids.shape_key_add(name=name)
  cx,cy,cz=profile['eyes'][0 if side=='L' else 1]
  for i,dst in enumerate(key.data):
   if sides[i]!=side:continue
   row=(i%(rows*columns))//columns;col=i%columns;t=row/(rows-1)
   u=(col/(columns-1)*2-1)*.995;x=cx+u*.070;arch=math.sqrt(max(0,1-u*u))
   top=upperBounds[side][col];bottom=lowerBounds[side][col]
   z=top+(bottom-top)*t*amount
   radial=max(0,1-u*u-((z-cz)/.052)**2)
   dst.co=inv@Vector((x,lid_depth(x,z,cx,cz),z))
# Oral surfaces differ only in base color. Pack that color per corner so
# palate/floor/throat/tongue share one runtime material and draw call.
oral=bpy.data.objects.get('OralCavity')
if oral and len(oral.data.materials)>1:
 colors=[mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value[:]
         for mat in oral.data.materials]
 attr=oral.data.color_attributes.new(name='OralColor',type='FLOAT_COLOR',domain='CORNER')
 for face in oral.data.polygons:
  for li in face.loop_indices:attr.data[li].color=colors[face.material_index]
  face.material_index=0
 material=bpy.data.materials.new('Oral surfaces');material.use_nodes=True
 bs=material.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.85;bs.inputs['Specular IOR Level'].default_value=.12
 vertex=material.node_tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name='OralColor'
 material.node_tree.links.new(vertex.outputs['Color'],bs.inputs['Base Color'])
 oral.data.materials.clear();oral.data.materials.append(material)
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
bpy.ops.export_scene.gltf(filepath=str(Path(a.output).with_suffix('.glb').resolve()),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
