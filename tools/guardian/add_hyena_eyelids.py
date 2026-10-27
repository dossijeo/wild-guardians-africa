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
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.render.film_transparent=True
for rig in scene.objects:
 if rig.type=='ARMATURE':rig.data.pose_position='REST'
bpy.ops.object.camera_add(location=(0,-3,1.62));camera=bpy.context.object;camera.rotation_euler=(math.pi/2,0,0);camera.data.type='ORTHO';camera.data.ortho_scale=.7;scene.camera=camera
atlasPath=str(Path(a.output).with_suffix('.atlas.png'));scene.render.filepath=atlasPath;bpy.ops.render.render(write_still=True)
atlas=bpy.data.images.load(atlasPath);atlas.pack();mesh.data.materials[0]=original;bpy.data.objects.remove(camera,do_unlink=True)
for rig in scene.objects:
 if rig.type=='ARMATURE':rig.data.pose_position='POSE'
lidMaterial=bpy.data.materials.new('Original fur eyelid atlas');lidMaterial.use_nodes=True;node=lidMaterial.node_tree.nodes.new('ShaderNodeTexImage');node.image=atlas;bs=lidMaterial.node_tree.nodes.get('Principled BSDF');lidMaterial.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.85
verts=[];closed=[];tex=[];faces=[];sides=[]
for side,eye in zip(['L','R'],profile['eyes']):
 cx,cy,cz=eye;start=len(verts)
 for row in range(6):
  t=row/5
  for col in range(25):
   u=col/24*2-1;x=cx+u*.065;arch=math.sqrt(max(0,1-u*u));top=cz+.035*arch;bottom=cz-.035*arch
   initial,unused=surface(x,top);initial.y-=.002
   final,unused=surface(x,top+(bottom-top)*t);final.y-=.009*arch
   coord=Vector(((x+.35)/.7,(cz+.10+.025*t-1.27)/.7,0))
   verts.append(tuple(inv@initial));closed.append(tuple(inv@final));tex.append((coord.x,coord.y));sides.append(side)
 for row in range(5):
  for col in range(24):
   i=start+row*25+col;faces.append((i,i+1,i+26,i+25))
data=bpy.data.meshes.new('Expressive fur lids');data.from_pydata(verts,[],faces);data.update();lids=bpy.data.objects.new('FacialLids',data);bpy.context.collection.objects.link(lids);lids.matrix_world=world.copy()
data.materials.append(lidMaterial);layer=data.uv_layers.new(name='UVMap')
for poly in data.polygons:
 poly.use_smooth=True
 for li in poly.loop_indices:layer.data[li].uv=tex[data.loops[li].vertex_index]
group=lids.vertex_groups.new(name=next(g.name for g in mesh.vertex_groups if g.index in head));group.add(list(range(len(verts))),1,'REPLACE')
for modifier in mesh.modifiers:
 if modifier.type=='ARMATURE':lids.modifiers.new('Face skeleton','ARMATURE').object=modifier.object
lids.shape_key_add(name='Basis')
for side in ['L','R']:
 key=lids.shape_key_add(name='blink'+side)
 for i,dst in enumerate(key.data):
  if sides[i]==side:dst.co=closed[i]
bpy.ops.wm.save_as_mainfile(filepath=str(Path(a.output).resolve()),compress=True)
bpy.ops.export_scene.gltf(filepath=str(Path(a.output).with_suffix('.glb').resolve()),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True)
