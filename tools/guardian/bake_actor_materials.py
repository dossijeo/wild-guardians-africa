"""Bake authored base-color node graphs into their original UV layout.

Blender -- --input candidate.blend --output baked.blend [--export-glb]
Keeps the editable input intact. This is a material bake, not a new texture design.
"""
import argparse
import json
import sys
from pathlib import Path
import bpy

p = argparse.ArgumentParser()
p.add_argument('--input', required=True)
p.add_argument('--output', required=True)
p.add_argument('--export-glb', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
out = Path(a.output).resolve()
out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.render.bake.margin = 8
scene.render.bake.use_clear = True
report = []
for obj in list(scene.objects):
    if obj.type != 'MESH' or not obj.data.uv_layers.get('MuzzleRepairProjection'):
        continue
    uv = obj.data.uv_layers['UVMap']
    original_uvs = [tuple(v.uv) for v in uv.data]
    obj.data.uv_layers.active = uv
    uv.active_render = True
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    changes = []
    for mat in obj.data.materials:
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bs = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
        output = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
        source = bs.inputs['Base Color'].links[0].from_socket if bs.inputs['Base Color'].is_linked else None
        images = [n.image for n in nodes if n.type == 'TEX_IMAGE' and n.image]
        size = max((max(img.size) for img in images), default=32)
        image = bpy.data.images.new(mat.name + ' baked base color', width=size, height=size, alpha=False)
        image.colorspace_settings.name = 'sRGB'
        emit = nodes.new('ShaderNodeEmission')
        if source:
            links.new(source, emit.inputs['Color'])
        else:
            emit.inputs['Color'].default_value = bs.inputs['Base Color'].default_value
        old = output.inputs['Surface'].links[0].from_socket
        links.new(emit.outputs[0], output.inputs['Surface'])
        target = nodes.new('ShaderNodeTexImage')
        target.image = image
        nodes.active = target
        target.select = True
        changes.append((mat, bs, output, old, emit, target, image, bool(source)))
    bpy.ops.object.bake(type='EMIT')
    for mat, bs, output, old, emit, target, image, textured in changes:
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        links.new(old, output.inputs['Surface'])
        nodes.remove(emit)
        if textured:
            coords = nodes.new('ShaderNodeUVMap')
            coords.uv_map = 'UVMap'
            links.new(coords.outputs['UV'], target.inputs['Vector'])
            links.new(target.outputs['Color'], bs.inputs['Base Color'])
            image.filepath_raw = str(out.with_name(out.stem + '-albedo.png'))
            image.file_format = 'PNG'
            image.save()
            image.pack()
            report.append({'mesh': obj.name, 'material': mat.name, 'size': list(image.size), 'image': image.filepath_raw})
        else:
            nodes.remove(target)
            bpy.data.images.remove(image)
    assert original_uvs == [tuple(v.uv) for v in uv.data], 'Bake changed source UVs'
bpy.ops.wm.save_as_mainfile(filepath=str(out), compress=True)
out.with_suffix('.bake.json').write_text(json.dumps(report, indent=2) + '\n')
if a.export_glb:
    bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')), export_format='GLB',
        export_animations=True, export_animation_mode='NLA_TRACKS', export_nla_strips=True,
        export_force_sampling=True, export_frame_range=False, export_yup=True,
        export_skins=True, export_all_influences=False, export_extras=True)
