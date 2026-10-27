"""Map pixels from inspect_actor_face orthographic renders onto source geometry.

Read-only calibration: uses the inspection JSON's camera, never estimates depth
from a screenshot. Pixel coordinates use a top-left origin and pixel centers.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--input', required=True)
p.add_argument('--inspection', required=True)
p.add_argument('--landmarks', required=True)
p.add_argument('--output', required=True)
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = Path(a.input).resolve()
inspection = json.loads(Path(a.inspection).read_text(encoding='utf-8'))
requests = json.loads(Path(a.landmarks).read_text(encoding='utf-8'))
if inspection.get('expression'):
    raise ValueError('Use neutral inspection renders to calibrate anatomical landmarks')
if source.suffix.lower() != '.glb':
    raise ValueError('This calibration tool currently imports GLB sources only')
if Path(inspection['input']).resolve() != source:
    raise ValueError('Inspection and raycast must use the same source model')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
for obj in bpy.context.scene.objects:
    if obj.animation_data:
        obj.animation_data_clear()
    if obj.type == 'ARMATURE':
        for bone in obj.pose.bones:
            bone.matrix_basis.identity()
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
center = Vector(inspection['center'])
extent = inspection['extent']
directions = {'front': (0, -1, .05), 'quarter': (1, -1, .08),
              'side': (1, 0, .05), 'other-side': (-1, 0, .05)}
result = {'source': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'inspection': inspection, 'landmarks': []}
for request in requests:
    camera = center + Vector(directions[request['view']]).normalized() * extent * 4
    rotation = (center - camera).to_track_quat('-Z', 'Y')
    x, y = request['pixel']
    if not (0 <= x < 768 and 0 <= y < 768):
        raise ValueError('Landmark lies outside the 768 x 768 inspection render')
    origin = camera + rotation @ Vector(((x + .5) / 768 * extent - extent / 2,
                                         extent / 2 - (y + .5) / 768 * extent, 0))
    direction = rotation @ Vector((0, 0, -1))
    hit, position, normal, index, obj, matrix = bpy.context.scene.ray_cast(
        depsgraph, origin, direction)
    row = dict(request, hit=hit)
    if hit:
        row.update(object=obj.name, face=index, position=list(position), normal=list(normal))
    result['landmarks'].append(row)
output = Path(a.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result['landmarks'], indent=2))
