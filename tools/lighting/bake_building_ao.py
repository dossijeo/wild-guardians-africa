"""Bake geometric ambient visibility into the original GLB UV atlas.
Usage: blender --background --python bake_building_ao.py -- source.glb output.png
No source geometry or materials are written. Requires Blender Cycles.
"""
import argparse, sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output');p.add_argument('--size',type=int,default=1024);p.add_argument('--samples',type=int,default=32)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(a.source).resolve()))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if len(meshes)!=1: raise RuntimeError('Expected one original building mesh')
obj=meshes[0];height=obj.dimensions.z
# glTF import may retain a rotated root; use evaluated world dimensions.
coords=[obj.matrix_world @ v.co for v in obj.data.vertices]
height=max(v.z for v in coords)-min(v.z for v in coords)
radius=max(height*.12,.01)
image=bpy.data.images.new('GeometricAmbientVisibility',width=a.size,height=a.size,alpha=False)
image.colorspace_settings.name='Non-Color'
for slot in obj.material_slots:
 mat=slot.material.copy();slot.material=mat;mat.use_nodes=True
 nodes=mat.node_tree.nodes;links=mat.node_tree.links
 nodes.clear();ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=radius;ao.samples=16
 emission=nodes.new('ShaderNodeEmission');links.new(ao.outputs['AO'],emission.inputs['Color'])
 output=nodes.new('ShaderNodeOutputMaterial');links.new(emission.outputs[0],output.inputs['Surface'])
 target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target;target.select=True
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=a.samples
scene.render.bake.margin=12;scene.render.bake.use_clear=True
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.object.bake(type='EMIT')
output=Path(a.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
image.filepath_raw=str(output);image.file_format='PNG';image.save()
print('AO_BAKE_COMPLETE',str(output),'radius',radius,'vertices',len(obj.data.vertices))
