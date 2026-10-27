"""Author localized facial shape keys on a locally edited skinned source mesh.
Blender headless: -- --input source.glb --output actor.blend --profile hyena
Initial calibration is deliberately kept outside the production manifest until
its full-close blink and jaw opening have been visually accepted.
"""
import bpy,math,argparse,sys,json
sys.path.insert(0,str(__import__('pathlib').Path(__file__).parent))
from actor_mouth import split_lip_seam
from pathlib import Path
from mathutils import Vector,Matrix
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--profile',choices=['hyena'],required=True);p.add_argument('--export-glb',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
Path(a.output).parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=a.input)
# Shape coordinates are in the authored bind mesh, independent of active clips.
profile={'eyes':[[-.115,-.565,1.59],[.115,-.565,1.59]],'eyeWidth':.093,'eyeHeight':.062,'jawPivot':[0,-.25,1.405],'jawAngle':.24}
report={'profile':a.profile,'source':a.input,'meshes':[]}
def smooth(lo,hi,x):
 t=max(0,min(1,(x-lo)/(hi-lo)));return t*t*(3-2*t)
for mesh in list(bpy.context.scene.objects):
 if mesh.type!='MESH':continue
 head={g.index for g in mesh.vertex_groups if g.name.replace('mixamorig:','')=='Head'}
 if not head:continue
 lowerLip,lipSegments=split_lip_seam(mesh)
 mesh.shape_key_add(name='Basis');world=mesh.matrix_world.copy();inv=world.inverted();counts={}
 key=mesh.shape_key_add(name='mouthOpen');pivot=Vector(profile['jawPivot']);rot=Matrix.Rotation(profile['jawAngle'],3,'X');count=0
 for v,dst in zip(mesh.data.vertices,key.data):
  w=world@v.co;x,y,z=w;headWeight=sum(g.weight for g in v.groups if g.group in head)
  lower=z<1.385-1e-5 or v.index in lowerLip
  influence=float(lower)*smooth(1.12,1.27,z)*(1-smooth(.10,.16,abs(x)))*(1-smooth(-.4,-.19,y))*smooth(.2,.8,headWeight)
  if influence>0:dst.co=inv@w.lerp(pivot+rot@(w-pivot),influence);count+=1
 # Close the opened seam with a recessed oral surface. Both edges follow
 # the same jaw delta as the outer skin; the middle recedes into the head.
 cavityBasis=[];cavityOpen=[];cavityFaces=[]
 lipPositions=[(world@mesh.data.vertices[i].co,world@key.data[i].co) for i in lowerLip]
 for segment in lipSegments:
  start=len(cavityBasis)
  for row in range(5):
   t=row/4
   for point in segment:
    top=Vector(point);closest=min(lipPositions,key=lambda pair:(pair[0]-top).length_squared);bottom=closest[1] if (closest[0]-top).length<1e-4 else top
    rest=top.copy();rest.y+=math.sin(math.pi*t)*.075
    opened=top.lerp(bottom,t);opened.y+=math.sin(math.pi*t)*.075
    cavityBasis.append(tuple(inv@rest));cavityOpen.append(tuple(inv@opened))
  for row in range(4):
   i=start+row*2;cavityFaces.append((i,i+1,i+3,i+2))
 # A closed inner mouth bag prevents seeing the background through the
 # corners when the lip surfaces separate in profile.
 start=len(cavityBasis)
 for row in range(13):
  theta=math.pi*row/12
  for col in range(24):
   phi=math.tau*col/24;dx=math.sin(theta)*math.cos(phi);dy=math.sin(theta)*math.sin(phi);dz=math.cos(theta)
   cavityBasis.append(tuple(inv@Vector((dx*.15,-.45+dy*.13,1.385+dz*.002))))
   cavityOpen.append(tuple(inv@Vector((dx*.105,-.55+dy*.09,1.35+dz*.045))))
 for row in range(12):
  for col in range(24):
   i=start+row*24+col;j=start+row*24+(col+1)%24;cavityFaces.append((i,j,j+24,i+24))
 cavityData=bpy.data.meshes.new('Oral cavity');cavityData.from_pydata(cavityBasis,[],cavityFaces);cavityData.update();cavity=bpy.data.objects.new('MouthInterior',cavityData);bpy.context.collection.objects.link(cavity);cavity.matrix_world=world.copy()
 oral=bpy.data.materials.new('Mouth interior');oral.use_nodes=True;bs=oral.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.006,.001,.0015,1);bs.inputs['Roughness'].default_value=1;bs.inputs['Specular IOR Level'].default_value=.08;cavityData.materials.append(oral)
 for poly in cavityData.polygons:poly.use_smooth=True
 group=cavity.vertex_groups.new(name=next(g.name for g in mesh.vertex_groups if g.index in head));group.add(list(range(len(cavityBasis))),1,'REPLACE')
 for modifier in mesh.modifiers:
  if modifier.type=='ARMATURE':cavity.modifiers.new('Face skeleton','ARMATURE').object=modifier.object
 cavity.shape_key_add(name='Basis');cavityKey=cavity.shape_key_add(name='mouthOpen')
 for dst,coord in zip(cavityKey.data,cavityOpen):dst.co=coord
 counts[key.name]=count;report['meshes'].append({'mesh':mesh.name,'counts':counts,'vertices':len(mesh.data.vertices),'lipSegments':len(lipSegments),'lowerLipVertices':len(lowerLip)})

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

out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(out));out.with_suffix('.json').write_text(json.dumps(report,indent=2))

if a.export_glb:
 bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_materials='EXPORT',export_image_format='AUTO',export_extras=True)
