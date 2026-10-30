import sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'tools/trees'))
from tree_transfer_common import *
original=components(args.source)
out=args.output
report=json.loads((out/'verification.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(out/'sabana-original-hd.blend'))
scene=bpy.context.scene;source=next(o for o in scene.objects if o.type=='MESH');low=source.data.materials[0];high=source.data.materials[-1]
views=[]
for k,row in enumerate(report['trees']):
 c=original[row['originalComponent']];uvHD=[[list(source.data.uv_layers.active.data[li].uv) for li in source.data.polygons[i].loop_indices] for i in c['polygonIndices']]
 for label,uv,mat in [('original',c['uv'],low),('transferred',uvHD,high)]:
  mesh=bpy.data.meshes.new(label);mesh.from_pydata([v*7.5 for v in c['verts']],[],c['faces']);mesh.update()
  for f in mesh.polygons:f.use_smooth=True
  mesh.normals_split_custom_set([n for face in c['normals'] for n in face]);layer=mesh.uv_layers.new()
  for f,values in zip(mesh.polygons,uv):
   for li,value in zip(f.loop_indices,values):layer.data[li].uv=value
  mesh.materials.append(mat);ob=bpy.data.objects.new(label+str(k),mesh);scene.collection.objects.link(ob);ob.location.x=k*12;views.append((label,ob))
source.hide_render=True
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1600;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.color=(.3,.3,.3)
bpy.ops.object.light_add(type='AREA',location=(17,-14,24));bpy.context.object.data.energy=4500;bpy.context.object.data.size=20
bpy.ops.object.camera_add(location=(18,-47,16));camera=bpy.context.object;camera.rotation_euler=(Vector((18,0,3.8))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=47;scene.camera=camera
for label in ['original','transferred']:
 for group,ob in views:ob.hide_render=group!=label
 scene.render.filepath=str(out/(label+'.png'));bpy.ops.render.render(write_still=True)

# Close views of every transferred tree, including the opposite side.
scene.render.resolution_x=800;scene.render.resolution_y=800;camera.data.ortho_scale=9.5
for group,ob in views:ob.hide_render=group!='transferred'
for k in range(4):
 for side in [-1,1]:
  center=Vector((k*12,0,3.8));camera.location=center+Vector((side*11,side*-18,5));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=str(out/('tree-'+str(k+1)+('-front' if side==1 else '-rear')+'.png'));bpy.ops.render.render(write_still=True)
