import bpy, json, hashlib
import numpy as np
from pathlib import Path
from mathutils import Matrix, Vector

root=Path(__file__).resolve().parents[2]
source=Path(r'C:/Users/PC/Desktop/Wild Guardians New/cc0___holly_fern_cyrtomium_sp..glb')
out=root/'public/assets/visual-lab/holly-fern-frond-20261023';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
# Object_4 is the 24-vertex photogrammetry color calibration cube, not vegetation.
for o in list(objects):
 if o.name=='Object_4' and len(o.data.vertices)==24:
  objects.remove(o);bpy.data.objects.remove(o,do_unlink=True)
# Keep one complete connected frond (glTF splits it into six mesh primitives).
for o in list(objects):
 if o.name not in {'Object_6','Object_7','Object_8','Object_9','Object_10','Object_11'}:
  objects.remove(o);bpy.data.objects.remove(o,do_unlink=True)
points=[]
for o in objects:
 a=np.empty(len(o.data.vertices)*3);o.data.vertices.foreach_get('co',a);a=a.reshape(-1,3)
 m=np.array(o.matrix_world);points.append(a@m[:3,:3].T+m[:3,3])
points=np.concatenate(points);center=points.mean(0)
_,vectors=np.linalg.eigh(np.cov((points-center).T))
x=vectors[:,1];y=vectors[:,2];z=np.cross(x,y)
rot=np.stack([x,y,z]);projected=(points-center)@rot.T
lo=projected.min(0);hi=projected.max(0);scale=2.0/max(hi[0]-lo[0],hi[1]-lo[1])
mid=(lo+hi)/2
transform=np.eye(4);transform[:3,:3]=rot*scale;transform[:3,3]=(-rot@center-mid)*scale
# Detach before world-transform assignment to avoid parent transform propagation.
worlds=[o.matrix_world.copy() for o in objects]
for o,m in zip(objects,worlds):o.parent=None;o.matrix_world=Matrix(transform.tolist())@m
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.cycles.use_denoising=False;scene.render.film_transparent=True
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.image_settings.color_depth='8';scene.view_settings.view_transform='Standard'
scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
camera_data=bpy.data.cameras.new('Bake orthographic');camera=bpy.data.objects.new('Bake orthographic',camera_data);scene.collection.objects.link(camera)
camera.location=(0,0,5);camera.rotation_euler=(0,0,0);camera_data.type='ORTHO';camera_data.ortho_scale=2.12;scene.camera=camera
materials=set(m for o in objects for m in o.data.materials if m)
for m in materials:
 nodes=m.node_tree.nodes;links=m.node_tree.links
 emission=next(n for n in nodes if n.type=='EMISSION')
 output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
 links.new(emission.outputs[0],output.inputs['Surface'])
scene.render.filepath=str(out/'color.png');bpy.ops.render.render(write_still=True)
normal=bpy.data.materials.new('Module space normals');normal.use_nodes=True
nodes=normal.node_tree.nodes;nodes.clear();links=normal.node_tree.links
geo=nodes.new('ShaderNodeNewGeometry');sep=nodes.new('ShaderNodeSeparateXYZ');links.new(geo.outputs['Normal'],sep.inputs[0])
combine=nodes.new('ShaderNodeCombineXYZ')
# Camera image horizontal/vertical becomes runtime card X/Z, source +Z becomes up.
for dest,src in [('X','X'),('Y','Z'),('Z','Y')]:
 mul=nodes.new('ShaderNodeMath');mul.operation='MULTIPLY_ADD';mul.inputs[1].default_value=.5;mul.inputs[2].default_value=.5
 links.new(sep.outputs[src],mul.inputs[0]);links.new(mul.outputs[0],combine.inputs[dest])
em=nodes.new('ShaderNodeEmission');output=nodes.new('ShaderNodeOutputMaterial');links.new(combine.outputs[0],em.inputs['Color']);links.new(em.outputs[0],output.inputs['Surface'])
for o in objects:
 for i in range(len(o.data.materials)):o.data.materials[i]=normal
scene.view_settings.view_transform='Raw';scene.render.filepath=str(out/'normal.png');bpy.ops.render.render(write_still=True)
(out/'source.json').write_text(json.dumps(dict(source=str(source),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),author='ffish.asia / floraZia.com',license='CC0-1.0',url='https://sketchfab.com/3d-models/cc0-holly-fern-cyrtomium-sp-709a2e45225a405d96c3a3fa43601f79',sourceVertices=len(points),cardWidth=2.12,orientation=rot.tolist(),normalSpace='runtime X/up/Z, encoded linear XYZ',colorSpace='sRGB',note='Single frond, mesh pieces Object_6 through Object_11. Front/back and stem orientation require visual inspection. Other frond preserved in original user file.'),indent=2)+'\n',encoding='utf-8')
