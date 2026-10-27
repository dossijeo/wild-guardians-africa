"""Diagnostic jaw-only candidate; not a finished mouth or a runtime asset.

Uses the active visual-lab lion, keeping its mane/cloth/rig/animations. The
piecewise surface comes from side-view lip landmarks, not a horizontal chin cut.
Must pass anatomical review before interior, dentition and runtime integration.
"""
import argparse
import bisect
import hashlib
import json
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree

p = argparse.ArgumentParser()
p.add_argument('--input', required=True)
p.add_argument('--output', required=True)
p.add_argument('--oral-cavity', action='store_true')
p.add_argument('--export-glb', action='store_true')
p.add_argument('--fur-material', action='store_true')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = Path(a.input).resolve()
expected = '539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968'
digest = hashlib.sha256(source.read_bytes()).hexdigest()
assert digest == expected, 'Profile only calibrated to the inspected lion source'
output = Path(a.output).resolve()
assert output != source and output.suffix == '.blend'
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
# prepare_lion.py authored the current source at 96 Hz. Set FPS before import
# so its fractional-second keys retain that time grid on sampled GLB export.
bpy.context.scene.render.fps = 96
# All six source clips begin at 1/24 s, i.e. frame 4 at 96 Hz. The glTF
# importer stashes NLA strips at scene.frame_start; its default 1 shifts clips.
bpy.context.scene.frame_start = 4
bpy.ops.import_scene.gltf(filepath=str(source))
material_changes = []
if a.fur_material:
    for name in ['Material_0', 'Rear cloth']:
        material = bpy.data.materials[name]
        bsdf = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        old_roughness = bsdf.inputs['Roughness'].default_value
        bsdf.inputs['Roughness'].default_value = .85
        bsdf.inputs['Specular IOR Level'].default_value = .18
        for node in material.node_tree.nodes:
            if node.type == 'NORMAL_MAP': node.inputs['Strength'].default_value = .55
        material_changes.append({'name': name, 'originalRoughness': old_roughness,
            'roughness': .85, 'specularIORLevel': .18, 'normalStrength': .55,
            'textures': 'unchanged; shared atlas includes ornaments'})
mesh = bpy.data.objects['Mesh_0']
world = mesh.matrix_world.copy()
inverse = world.inverted()
bm = bmesh.new()
bm.from_mesh(mesh.data)
# Preserve authored corner normals through topology operations. Welding the
# GLB's split vertices without these normals changes unrelated eyes and fur.
normals_layer = bm.loops.layers.float_vector.new('authoredNormal')
bm.faces.ensure_lookup_table()
for face, polygon in zip(bm.faces, mesh.data.polygons):
    for loop, index in zip(face.loops, polygon.loop_indices):
        loop[normals_layer] = mesh.data.corner_normals[index].vector
for v in bm.verts:
    v.co = world @ v.co

# Weld a disposable copy for connectivity only. The production mesh retains
# its authored split vertices everywhere outside the oral editing region.
topology = bm.copy()
bmesh.ops.remove_doubles(topology, verts=list(topology.verts), dist=1e-5)
seen = set()
groups = []
for seed in topology.verts:
    if seed in seen:
        continue
    todo = [seed]
    seen.add(seed)
    group = []
    while todo:
        v = todo.pop()
        group.append(v)
        for edge in v.link_edges:
            other = edge.other_vert(v)
            if other not in seen:
                seen.add(other)
                todo.append(other)
    groups.append(group)
body = set(max(groups, key=len))
body_tree = KDTree(len(body))
for index, vertex in enumerate(body):
    body_tree.insert(vertex.co, index)
body_tree.balance()
tag = bm.faces.layers.int.new('lionBodySurface')
for f in bm.faces:
    f[tag] = int(all(body_tree.find(v.co)[2] < 2e-5 for v in f.verts))
topology.free()

def oral_vertices():
    return [v for v in bm.verts if abs(v.co.x) < .08 and -.27 < v.co.y < -.14
            and 1.45 < v.co.z < 1.6]

bmesh.ops.remove_doubles(bm, verts=oral_vertices(), dist=1e-5)

profile = [(-.25, 1.564), (-.226, 1.5614), (-.2167, 1.5547),
           (-.2042, 1.5512), (-.1908, 1.5481), (-.177, 1.5485),
           (-.1623, 1.5528), (-.15, 1.554)]

def lip(y):
    j = max(1, min(len(profile) - 1, bisect.bisect_right([v[0] for v in profile], y)))
    left, right = profile[j - 1], profile[j]
    return left[1] + (right[1] - left[1]) * (y - left[0]) / (right[0] - left[0])

def region():
    return [f for f in bm.faces if f[tag] and abs(f.calc_center_median().x) < .075
            and -.255 < f.calc_center_median().y < -.15
            and 1.49 < f.calc_center_median().z < 1.59]

def geometry(faces):
    return list({v for f in faces for v in f.verts}) + list({e for f in faces for e in f.edges}) + faces

for y, z in profile[1:-1]:
    bmesh.ops.bisect_plane(bm, geom=geometry(region()), dist=1e-7,
                           plane_co=(0, y, 0), plane_no=(0, 1, 0))
for left, right in zip(profile, profile[1:]):
    faces = [f for f in region() if left[0] - 1e-6 < f.calc_center_median().y < right[0] + 1e-6]
    slope = (right[1] - left[1]) / (right[0] - left[0])
    bmesh.ops.bisect_plane(bm, geom=geometry(faces), dist=1e-7,
                           plane_co=(0, left[0], left[1]), plane_no=(0, -slope, 1))
bmesh.ops.remove_doubles(bm, verts=oral_vertices(), dist=1e-6)
lower = bm.faces.layers.int.new('lionLowerJaw')
for f in bm.faces:
    f[lower] = int(sum(v.co.z - lip(v.co.y) for v in f.verts) < -1e-7)
seam = []
for edge in bm.edges:
    if len(edge.link_faces) != 2 or not all(f[tag] for f in edge.link_faces):
        continue
    if edge.link_faces[0][lower] == edge.link_faces[1][lower]:
        continue
    point = (edge.verts[0].co + edge.verts[1].co) / 2
    if abs(point.x) < .075 and -.255 < point.y < -.15 and 1.49 < point.z < 1.59:
        seam.append(edge)
assert seam, 'No lip seam found'
segments = [[list(v.co) for v in edge.verts] for edge in seam]
bmesh.ops.split_edges(bm, edges=seam)

def smooth(left, right, value):
    t = max(0, min(1, (value - left) / (right - left)))
    return t * t * (3 - 2 * t)

bm.verts.ensure_lookup_table()
bm.verts.index_update()
weights = []
deform = bm.verts.layers.deform.verify()
head_group = mesh.vertex_groups['Head'].index
skin_changes = []
for v in bm.verts:
    point = v.co
    allowed = bool(v.link_faces) and all(f[lower] and f[tag] for f in v.link_faces)
    weight = float(allowed) * smooth(1.46, 1.49, point.z)
    weight *= (1 - smooth(-.18, -.15, point.y)) * (1 - smooth(.06, .075, abs(point.x)))
    weights.append(weight)
    # The original lower muzzle follows Neck while the new cavity follows Head.
    # Give the rigid facial core a shared frame, with a soft transition confined
    # to the main body surface. Separate mane/necklace islands are excluded.
    blend = smooth(1.45, 1.49, point.z) * (1 - smooth(-.18, -.10, point.y))
    blend *= 1 - smooth(.04, .075, abs(point.x))
    if not v.link_faces or not all(f[tag] for f in v.link_faces):
        blend = 0
    if blend > 0 and v[deform].get(head_group, 0) < .999999:
        original = dict(v[deform])
        combined = {group: value * (1 - blend) for group, value in original.items()}
        combined[head_group] = combined.get(head_group, 0) + blend
        strongest = sorted(combined.items(), key=lambda item: item[1], reverse=True)[:4]
        total = sum(value for _, value in strongest)
        for group in list(v[deform].keys()): del v[deform][group]
        for group, value in strongest:
            if value > 1e-8: v[deform][group] = value / total
        skin_changes.append({'position': list(point), 'blend': blend})
    v.co = inverse @ point
corner_normals = [tuple(loop[normals_layer].normalized()) for face in bm.faces for loop in face.loops]
bm.to_mesh(mesh.data)
bm.free()
mesh.data.update()
assert len(corner_normals) == len(mesh.data.loops)
mesh.data.normals_split_custom_set(corner_normals)
mesh.shape_key_add(name='Basis')
key = mesh.shape_key_add(name='mouthOpen')
pivot = Vector((0, -.14, 1.55))
rotation = Matrix.Rotation(.4, 3, 'X')
for v, dest in zip(mesh.data.vertices, key.data):
    point = world @ v.co
    dest.co = inverse @ point.lerp(pivot + rotation @ (point - pivot), weights[v.index])
oral = None
if a.oral_cavity:
    sys.path.insert(0,str(Path(__file__).parent))
    from lion_oral_cavity import add_cavity
    oral = add_cavity(mesh, lip)
bpy.ops.wm.save_as_mainfile(filepath=str(output))
if a.export_glb:
    bpy.ops.export_scene.gltf(filepath=str(output.with_suffix('.glb')),export_format='GLB',
        export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,
        export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,
        export_all_influences=False,export_extras=True)
output.with_suffix('.json').write_text(json.dumps({
    'status': 'authoring candidate; NOT installed', 'oralCavity': oral,
    'materialChanges': material_changes,
    'source': str(source), 'sha256': digest, 'profile': profile,
    'seam': segments, 'movingVertices': sum(w > 0 for w in weights),
    'vertices': len(mesh.data.vertices), 'pivot': list(pivot), 'angleRadians': .4,
    'facialSkinning': {'changedVertices': len(skin_changes), 'changes': skin_changes,
        'scope': 'main body only; Head core with cheek/neck transition; separate accessories excluded'},
}, indent=2), encoding='utf-8')
