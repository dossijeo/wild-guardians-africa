"""Build tiny visual-only ground-detail GLBs; run with Blender -b --python this file.

No source game mesh is opened or changed. Vertex colours carry root occlusion and
blade variation; all blades share one double-sided material and one draw per batch.
"""
import bpy
import math
import os
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'assets' / 'visual-lab'
PREVIEW = ROOT / 'docs' / 'qa' / 'global-visual-lab' / 'blender-preview'
OUT.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)

PRESETS = {
    'savanna': dict(seed=71, blades=10, height=(.22, .43), width=(.023, .048),
                    colours=((.32,.27,.13),(.50,.39,.18),(.68,.55,.27))),
    'grand-river': dict(seed=72, blades=18, height=(.28, .53), width=(.023, .052),
                        colours=((.12,.25,.09),(.23,.43,.12),(.39,.56,.20))),
    'mangrove': dict(seed=73, blades=13, height=(.24, .47), width=(.030, .064),
                     colours=((.14,.26,.12),(.29,.43,.22),(.43,.56,.31))),
    'volcanoes': dict(seed=74, blades=11, height=(.17, .37), width=(.021, .047),
                      colours=((.25,.23,.16),(.45,.39,.25),(.61,.49,.30))),
    'canyons': dict(seed=75, blades=12, height=(.19, .38), width=(.022, .045),
                    colours=((.32,.25,.12),(.50,.37,.19),(.64,.48,.29))),
    'desert': dict(seed=76, blades=9, height=(.16, .33), width=(.022, .048),
                   colours=((.35,.29,.15),(.52,.43,.24),(.66,.56,.34))),
}

def make_tuft(name, preset):
    rng = random.Random(preset['seed'])
    verts, faces, face_colours = [], [], []
    for blade in range(preset['blades']):
        a = (blade + rng.uniform(-.28,.28)) * 2 * math.pi / preset['blades']
        spread = rng.uniform(.02,.11)
        h = rng.uniform(*preset['height'])
        w = rng.uniform(*preset['width'])
        bend = rng.uniform(.10,.29)
        ca, sa = math.cos(a), math.sin(a)
        side = (-sa,ca)
        base = len(verts)
        for level, t in enumerate((0,.27,.61,1)):
            # Tapered, bowed ribbon; no camera-facing billboard or overdraw texture.
            reach = spread + bend * t*t
            width = w * (1-.92*t)
            twist = .17 * math.sin((blade+1)*2.3+t*2.7)
            for sign in (-1,1):
                verts.append((ca*reach+side[0]*width*sign,
                              sa*reach+side[1]*width*sign,
                              h*t + twist*t*(1-t)))
        tint = preset['colours'][blade % len(preset['colours'])]
        for band in range(3):
            i=base+band*2
            faces.extend(((i,i+1,i+2),(i+1,i+3,i+2)))
            shade = (.61,.79,1)[band]
            face_colours.extend([tuple(min(1,c*shade) for c in tint)]*2)
    mesh = bpy.data.meshes.new(name+'-mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    colour = mesh.color_attributes.new(name='GroundDetailColor', type='BYTE_COLOR', domain='CORNER')
    for poly, rgb in zip(mesh.polygons, face_colours):
        for li in poly.loop_indices:
            colour.data[li].color = (*rgb,1)
        poly.use_smooth = True
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    mat=bpy.data.materials.new(name+'-vertex-colour')
    mat.use_nodes=True
    mat.use_backface_culling=False
    nodes=mat.node_tree.nodes
    principled=nodes.get('Principled BSDF')
    principled.inputs['Roughness'].default_value=.96
    vc=nodes.new('ShaderNodeVertexColor')
    vc.layer_name='GroundDetailColor'
    mat.node_tree.links.new(vc.outputs['Color'], principled.inputs['Base Color'])
    mesh.materials.append(mat)
    return obj, len(faces)

def preview(obj, name):
    bpy.ops.mesh.primitive_plane_add(size=3)
    ground=bpy.context.object
    ground.name='preview-only-ground'
    ground.data.materials.append(bpy.data.materials.new('warm-ground'))
    ground.active_material.diffuse_color=(.49,.39,.25,1)
    ground.location.z=-.012
    bpy.ops.object.light_add(type='AREA', location=(-2,-3,4))
    light=bpy.context.object
    light.data.energy=420
    light.data.shape='DISK'
    light.data.size=2
    bpy.ops.object.camera_add(location=(1.1,-1.7,1.05))
    camera=bpy.context.object
    direction=(-camera.location).to_track_quat('-Z','Y')
    camera.rotation_euler=direction.to_euler()
    camera.data.type='ORTHO'
    camera.data.ortho_scale=1.7
    bpy.context.scene.camera=camera
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=24
    scene.render.resolution_x=512
    scene.render.resolution_y=512
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(PREVIEW/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(ground,do_unlink=True)
    bpy.data.objects.remove(light,do_unlink=True)
    bpy.data.objects.remove(camera,do_unlink=True)

for name,preset in PRESETS.items():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    obj, triangles=make_tuft(name,preset)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'-ground-detail.glb')),
                              export_format='GLB',use_selection=True,
                              export_apply=False)
    if name=='savanna':
        preview(obj,name)
    print(f'{name}: {triangles} triangles, {os.path.getsize(OUT/(name+"-ground-detail.glb"))} bytes')
