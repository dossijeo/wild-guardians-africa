"""Read-only anatomical-region skinning and articulation inventory.

Regions are explicit world-space boxes; component welding is disposable.
No automatic classification is treated as permission to deform the source.
"""
import argparse, hashlib, json, sys
from pathlib import Path
import bpy, bmesh

sys.path.insert(0, str(Path(__file__).resolve().parent))
from actor_components import biconnected_regions

p = argparse.ArgumentParser()
p.add_argument('--input', required=True)
p.add_argument('--regions', required=True)
p.add_argument('--output', required=True)
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = Path(a.input).resolve()
regions = json.loads(Path(a.regions).read_text(encoding='utf-8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
sys.setrecursionlimit(100000)
report = {'source': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'scope': 'Original vertices and weights; disposable welded biconnected regions', 'meshes': []}
for mesh in bpy.context.scene.objects:
    if mesh.type != 'MESH':
        continue
    row = {'mesh': mesh.name, 'regions': {}, 'articulatedParts': []}
    for name, box in regions.items():
        selected = [v for v in mesh.data.vertices if all(
            box['min'][k] <= (mesh.matrix_world @ v.co)[k] <= box['max'][k] for k in range(3))]
        weights, dominant = {}, {}
        for v in selected:
            groups = [g for g in v.groups if g.weight > 0]
            for g in groups:
                bone = mesh.vertex_groups[g.group].name
                weights[bone] = weights.get(bone, 0) + g.weight
            if groups:
                bone = mesh.vertex_groups[max(groups, key=lambda g: g.weight).group].name
                dominant[bone] = dominant.get(bone, 0) + 1
        row['regions'][name] = {'vertices': len(selected), 'dominantCounts': dominant,
                                'meanWeights': {k: v / len(selected) for k, v in weights.items()}}
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
    for part in sorted(biconnected_regions(bm), key=len, reverse=True):
        if len(part) < 10:
            continue
        points = [mesh.matrix_world @ v.co for v in part]
        row['articulatedParts'].append({'vertices': len(part),
            'min': [min(v[k] for v in points) for k in range(3)],
            'max': [max(v[k] for v in points) for k in range(3)]})
    bm.free()
    report['meshes'].append(row)
output = Path(a.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps([{k: v for k, v in row.items() if k != 'articulatedParts'} for row in report['meshes']], indent=2))
