"""Read-only diagnostic: highlight existing dental cavity boundaries on original hyena.
Run with Blender from repository root. Does not author or overwrite model geometry.
"""
import bpy,bmesh,json,sys,math
from pathlib import Path
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='public/assets/e45d7ac086ba07a8c3948fa0695fc41267914a95e1ab243cee608aa7ca4ec472.glb')
for o in bpy.context.scene.objects:
 if o.animation_data:o.animation_data_clear()
 if o.type=='ARMATURE':o.data.pose_position='REST'
m=next(o for o in bpy.context.scene.objects if o.type=='MESH');bm=bmesh.new();bm.from_mesh(m.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
edges=set(e for e in bm.edges if e.is_boundary);loops=[]
while edges:
 todo=[edges.pop()];group=[]
 while todo:
  e=todo.pop();group.append(e)
  for v in e.verts:
   for n in v.link_edges:
    if n in edges:edges.remove(n);todo.append(n)
 ps=[m.matrix_world@v.co for e in group for v in e.verts]
 if min(p.z for p in ps)>1.36 and max(p.z for p in ps)<1.47 and min(p.y for p in ps)<-.65:loops.append(group)
mat=bpy.data.materials.new('Diagnostic boundary magenta');mat.diffuse_color=(1,0,.3,1);mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,0,.3,1);bs.inputs['Emission Color'].default_value=(1,0,.3,1);bs.inputs['Emission Strength'].default_value=.4
coords=[]
for group in loops:
 for e in group:
  p,q=[m.matrix_world@v.co for v in e.verts];coords.append([list(p),list(q)])
  curve=bpy.data.curves.new('Existing boundary','CURVE');curve.dimensions='3D';curve.bevel_depth=.0013;curve.bevel_resolution=2;s=curve.splines.new('POLY');s.points.add(1)
  for dst,src in zip(s.points,[p,q]):dst.co=(*src,1)
  ob=bpy.data.objects.new('Existing mouth boundary diagnostic',curve);bpy.context.collection.objects.link(ob);curve.materials.append(mat)
Path('C:/tmp/guardian-faces/mouth-boundary.json').write_text(json.dumps(coords,indent=2))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('Inspection');scene.world.color=(.2,.2,.2);scene.view_settings.view_transform='Standard'
center=Vector((0,-.56,1.47));extent=.55
for pos,power in [((2,-3,4),350),((-3,-2,2),250),((0,3,4),300)]:
 bpy.ops.object.light_add(type='AREA',location=Vector(pos));o=bpy.context.object;o.data.energy=power;o.data.size=3;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=extent;scene.camera=cam
for name,direction in [('side',(1,0,0)),('quarter',(1,-1,0)),('front',(0,-1,0)),('other-side',(-1,0,0))]:
 cam.location=center+Vector(direction).normalized()*3;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath='C:/tmp/guardian-faces/boundary-'+name+'.png';bpy.ops.render.render(write_still=True)
