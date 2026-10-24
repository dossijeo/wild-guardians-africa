"""Blender headless CC0 tuft derivative from three tiny Grass Medium 01 meshes.

Run fetch-polyhaven-grass.py first; original source is temp-only. The source
models and textures remain unchanged, and this derivative is kept behind QA.
"""
import bpy
import math
import tempfile
from pathlib import Path

root=Path(__file__).resolve().parents[2]
source=Path(tempfile.gettempdir())/'wg-grass-medium-01'/'grass_medium_01_1k.gltf'
rgba=root/'public/assets/visual-lab/savanna-polyhaven-dry-atlas.png'
out=root/'public/assets/visual-lab/savanna-ph-compact.glb'
preview=root/'docs/qa/global-visual-lab/blender-preview/savanna-ph-compact.png'
bpy.ops.import_scene.gltf(filepath=str(source))
names=('grass_medium_01_small_a_LOD0','grass_medium_01_tall_a_LOD0')
selected=[]
for index,name in enumerate(names):
    obj=bpy.data.objects[name]
    obj.location=(.035*math.cos(index*math.tau/3),.035*math.sin(index*math.tau/3),0)
    obj.rotation_euler[2]=index*math.tau/3
    selected.append(obj)
for obj in list(bpy.data.objects):
    if obj.type=='MESH' and obj not in selected:bpy.data.objects.remove(obj,do_unlink=True)
for obj in bpy.context.selected_objects:obj.select_set(False)
for obj in selected:obj.select_set(True)
bpy.context.view_layer.objects.active=selected[0]
bpy.ops.object.join()
tuft=bpy.context.object
tuft.name='savanna-ph-compact'
modifier=tuft.modifiers.new('compact-card-decimation','DECIMATE')
modifier.ratio=.20
bpy.ops.object.modifier_apply(modifier=modifier.name)
print('triangles',len(tuft.data.polygons))
mat=tuft.active_material
mat.name='Poly Haven Grass Medium 01 compact dry experimental'
mat.diffuse_color=(.70,.60,.37,1)
if mat.use_nodes:
    dry=bpy.data.images.load(str(rgba),check_existing=True)
    for node in mat.node_tree.nodes:
        if node.type=='TEX_IMAGE' and 'diff' in (node.image.name if node.image else '').lower():
            node.image=dry
    principled=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if principled:
        principled.inputs['Base Color'].default_value=(1,1,1,1)
        for node in mat.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image==dry:
                mat.node_tree.links.new(node.outputs['Alpha'],principled.inputs['Alpha'])
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True)
print('export',out,out.stat().st_size)
