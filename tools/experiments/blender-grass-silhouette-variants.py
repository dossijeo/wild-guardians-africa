"""Two optional, real-geometry Savanna grass silhouettes for the visual lab.

Run after fetch-polyhaven-grass.py and bake-polyhaven-grass-atlas.py:
  blender -b --python tools/experiments/blender-grass-silhouette-variants.py

The structured variant derives from Poly Haven Grass Medium 01 (CC0); the
sculpted variant is authored here with vertex colours and no alpha cards.
"""
import bpy
import math
import random
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/assets/visual-lab'
SOURCE=Path(tempfile.gettempdir())/'wg-grass-medium-01/grass_medium_01_1k.gltf'
ATLAS=OUT/'savanna-polyhaven-dry-atlas.png'

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def structured():
    clear()
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    names=('grass_medium_01_tall_a_LOD0','grass_medium_01_tiny_a_LOD0')
    chosen=[bpy.data.objects[name] for name in names]
    for obj in list(bpy.data.objects):
        if obj.type=='MESH' and obj not in chosen:bpy.data.objects.remove(obj,do_unlink=True)
    tall,tiny=chosen
    tall.location=(-.025,0,0)
    tiny.location=(.07,.04,0)
    tiny.rotation_euler[2]=1.5
    tiny.scale=(1.25,1.25,1.25)
    modifier=tall.modifiers.new('preserve-tall-outline','DECIMATE')
    modifier.ratio=.48
    bpy.context.view_layer.objects.active=tall
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in chosen:obj.select_set(True)
    bpy.context.view_layer.objects.active=tall
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name='savanna-ph-structured'
    material=obj.active_material
    material.name='Poly Haven Grass Medium 01 structured dry experimental'
    dry=bpy.data.images.load(str(ATLAS),check_existing=True)
    if material.use_nodes:
        for node in material.node_tree.nodes:
            if node.type=='TEX_IMAGE' and 'diff' in (node.image.name if node.image else '').lower():
                node.image=dry
        principled=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        for node in material.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image==dry:
                material.node_tree.links.new(node.outputs['Alpha'],principled.inputs['Alpha'])
    export(obj,'savanna-ph-structured.glb')

def sculpted():
    clear()
    rng=random.Random(712)
    vertices=[]
    faces=[]
    shades=[]
    for blade in range(22):
        angle=(blade+rng.uniform(-.36,.36))*2*math.pi/22
        heading=angle+rng.uniform(-.24,.24)
        radius=rng.uniform(.015,.15)
        height=rng.uniform(.17,.38)*(1.15 if blade%7==0 else 1)
        width=rng.uniform(.016,.041)
        lean=rng.uniform(.08,.25)
        base=len(vertices)
        for t in (0,.22,.47,.73,1):
            drift=radius+lean*t*t
            curve=.035*math.sin(t*math.pi)*math.sin(blade*1.79)
            dx=math.cos(heading)*drift+math.cos(heading+math.pi/2)*curve
            dy=math.sin(heading)*drift+math.sin(heading+math.pi/2)*curve
            span=width*math.sin(.16+(.84-t)*math.pi*.85)
            for sign in (-1,1):
                vertices.append((dx-sign*math.sin(angle)*span,dy+sign*math.cos(angle)*span,height*t))
        tint=(.36+rng.random()*.15,.29+rng.random()*.10,.12+rng.random()*.09)
        for segment in range(4):
            k=base+2*segment
            faces.extend(((k,k+1,k+2),(k+1,k+3,k+2)))
            shade=.52+.12*segment
            shades.extend([tuple(min(1,value*shade) for value in tint)]*2)
    mesh=bpy.data.meshes.new('savanna-sculpted-mesh')
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    color=mesh.color_attributes.new(name='GroundDetailColor',type='BYTE_COLOR',domain='CORNER')
    for face,rgb in zip(mesh.polygons,shades):
        face.use_smooth=True
        for loop in face.loop_indices:color.data[loop].color=(*rgb,1)
    obj=bpy.data.objects.new('savanna-sculpted',mesh)
    bpy.context.collection.objects.link(obj)
    material=bpy.data.materials.new('Savanna sculpted grass vertex color')
    material.use_nodes=True
    material.use_backface_culling=False
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value=.97
    vertex=material.node_tree.nodes.new('ShaderNodeVertexColor')
    vertex.layer_name='GroundDetailColor'
    material.node_tree.links.new(vertex.outputs['Color'],shader.inputs['Base Color'])
    mesh.materials.append(material)
    export(obj,'savanna-sculpted-ground-detail.glb')

def export(obj,name):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    path=OUT/name
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True)
    print(name,len(obj.data.polygons),'triangles',path.stat().st_size,'bytes')

structured()
sculpted()
