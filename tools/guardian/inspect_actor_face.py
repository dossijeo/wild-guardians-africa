"""Head inspection renders and weighted geometry bounds; no source mutation."""
import bpy,sys,json,math,argparse,bmesh
from pathlib import Path
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);p.add_argument('--expression',default='');p.add_argument('--amount',type=float,default=1);p.add_argument('--mouth-closeup',action='store_true');p.add_argument('--center',type=float,nargs=3);p.add_argument('--extent',type=float);p.add_argument('--samples',type=int,default=20);p.add_argument('--lower-views',action='store_true');p.add_argument('--clay',action='store_true');p.add_argument('--albedo',action='store_true');p.add_argument('--weld-distance',type=float,default=.000001);p.add_argument('--weld-diagnostic',action='store_true',help='Diagnostic only: merge coincident mesh vertices before smooth normal recompute');p.add_argument('--invert-normal-y',action='store_true',help='Diagnostic only: compare normal-map green-channel convention');p.add_argument('--matte-diagnostic',action='store_true',help='Diagnostic only: uniform nonmetal roughness, retaining normal and color');p.add_argument('--recompute-normals',action='store_true',help='Diagnostic only: discard imported custom normals');p.add_argument('--without-normal-map',action='store_true',help='Diagnostic render only; retains albedo and roughness');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
if a.input.endswith('.blend'):bpy.ops.wm.open_mainfile(filepath=a.input)
else:bpy.ops.import_scene.gltf(filepath=a.input)
if a.recompute_normals or a.weld_diagnostic:
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':
   if a.weld_diagnostic:
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=a.weld_distance);bm.to_mesh(obj.data);bm.free()
   obj.data.normals_split_custom_set([(0,0,0)]*len(obj.data.loops))
   for polygon in obj.data.polygons:polygon.use_smooth=True
   for edge in obj.data.edges:edge.use_edge_sharp=False
requested={name for name in a.expression.split(',') if name}
available={key.name for o in bpy.context.scene.objects if o.type=='MESH' and o.data.shape_keys for key in o.data.shape_keys.key_blocks if key.name!='Basis'}
if requested-available:
 raise ValueError('Unknown inspection morphs: '+', '.join(sorted(requested-available))+'; available: '+', '.join(sorted(available)))
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.data.shape_keys:
  for key in o.data.shape_keys.key_blocks:key.value=a.amount if key.name in a.expression.split(',') else 0
for o in bpy.context.scene.objects:
 if o.animation_data:o.animation_data_clear()
 if o.type=='ARMATURE':
  for b in o.pose.bones:b.matrix_basis.identity()
bpy.context.view_layer.update();points=[];info=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 ids={v.index for v in o.vertex_groups if v.name.replace('mixamorig:','').replace('mixamorig','')=='Head'}
 selected=[v for v in o.data.vertices if sum(g.weight for g in v.groups if g.group in ids)>.7]
 points.extend(o.matrix_world@v.co for v in selected);info.append({'mesh':o.name,'vertices':len(o.data.vertices),'headVertices':len(selected)})
if not points:points=[o.matrix_world@v.co for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices]
lo=Vector([sorted(v[k] for v in points)[int(len(points)*.08)] for k in range(3)]);hi=Vector([sorted(v[k] for v in points)[int(len(points)*.92)] for k in range(3)]);center=(lo+hi)*.5;extent=max(hi-lo)*1.8
if a.mouth_closeup:center=Vector((0,-.56,1.47));extent=.55
if a.center:center=Vector(a.center)
if a.extent:extent=a.extent
scene=bpy.context.scene;scene.render.film_transparent=False;scene.render.engine='CYCLES';scene.cycles.samples=a.samples;scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('Face inspection');scene.world.color=(.22,.22,.22);scene.view_settings.view_transform='Standard'
for pos,power,size in [((3,-4,5),700,4),((-4,-1,3),450,3),((0,4,4),550,3)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(pos)*extent);light=bpy.context.object;light.data.energy=power*extent*extent;light.data.shape='DISK';light.data.size=size*extent;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=extent
directions=[('front',(0,-1,.05)),('quarter',(1,-1,.08)),('side',(1,0,.05)),('other-side',(-1,0,.05))]
if a.lower_views:directions.extend([('lower-front',(0,-1,-.5)),('lower-quarter',(1,-1,-.5)),('lower-side',(1,0,-.5))])
if a.invert_normal_y:
 for material in bpy.data.materials:
  if not material.use_nodes:continue
  for node in list(material.node_tree.nodes):
   if node.type=='NORMAL_MAP' and node.inputs['Color'].links:
    socket=node.inputs['Color'].links[0].from_socket
    mul=material.node_tree.nodes.new('ShaderNodeVectorMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=(1,-1,1)
    add=material.node_tree.nodes.new('ShaderNodeVectorMath');add.operation='ADD';add.inputs[1].default_value=(0,1,0)
    material.node_tree.links.new(socket,mul.inputs[0]);material.node_tree.links.new(mul.outputs[0],add.inputs[0]);material.node_tree.links.new(add.outputs[0],node.inputs['Color'])
if a.matte_diagnostic:
 for material in bpy.data.materials:
  if not material.use_nodes:continue
  for node in material.node_tree.nodes:
   if node.type=='BSDF_PRINCIPLED':
    for name,value in [('Metallic',0),('Roughness',.85)]:
     for link in list(node.inputs[name].links):material.node_tree.links.remove(link)
     node.inputs[name].default_value=value
if a.without_normal_map:
 for material in bpy.data.materials:
  if not material.use_nodes:continue
  for node in material.node_tree.nodes:
   if node.type=='BSDF_PRINCIPLED':
    for link in list(node.inputs['Normal'].links):material.node_tree.links.remove(link)
if a.clay:
 material=bpy.data.materials.new('Inspection clay');material.diffuse_color=(.45,.45,.45,1);material.use_nodes=True;material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.45,.45,.45,1);material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.8
 for obj in scene.objects:
  if obj.type=='MESH':
   for i in range(len(obj.data.materials)):obj.data.materials[i]=material
if a.albedo:
 for material in bpy.data.materials:
  if not material.use_nodes:continue
  nodes=material.node_tree.nodes;links=material.node_tree.links
  bs=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
  output=next((n for n in nodes if n.type=='OUTPUT_MATERIAL'),None)
  if bs is None or output is None:continue
  emission=nodes.new('ShaderNodeEmission')
  if bs.inputs['Base Color'].links:links.new(bs.inputs['Base Color'].links[0].from_socket,emission.inputs['Color'])
  else:emission.inputs['Color'].default_value=bs.inputs['Base Color'].default_value
  links.new(emission.outputs[0],output.inputs['Surface'])
for name,direction in directions:
 cam.location=center+Vector(direction).normalized()*extent*4;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
(out/'inspection.json').write_text(json.dumps({'input':a.input,'expression':a.expression,'amount':a.amount,'meshes':info,'center':list(center),'extent':extent,'directions':dict(directions),'clay':a.clay,'albedo':a.albedo,'withoutNormalMap':a.without_normal_map,'recomputeNormals':a.recompute_normals,'weldDiagnostic':a.weld_diagnostic,'weldDistance':a.weld_distance,'matteDiagnostic':a.matte_diagnostic,'invertNormalY':a.invert_normal_y},indent=2))

