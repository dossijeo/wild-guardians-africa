"""Read-only Blender scratch audit, never exports or changes GLBs.

blender -b --factory-startup --python tools/inspect_worker_frontside_blender.py
Exact-position reconstruction resolves authored UV seams only in scratch meshes.
"""
import bpy, bmesh, json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from audit_worker_frontside import SELECTED, read_glb, accessor, sha

record = json.loads((ROOT / 'public/content/worker-actions.json').read_text(encoding='utf8'))['youngMale']
raw, doc, binary = read_glb(ROOT / 'public' / record['url'].lstrip('/'))
rows = []
for node in doc['nodes']:
    if node.get('name') not in SELECTED: continue
    primitive = doc['meshes'][node['mesh']]['primitives'][0]
    positions = accessor(doc, binary, primitive['attributes']['POSITION'])
    indices = accessor(doc, binary, primitive['indices']).reshape(-1, 3)
    # No tolerance weld: reconstruct exact source-coordinate adjacency while
    # keeping source triangle order. Authored UV/normal lanes remain in GLB.
    points, remap = [], {}
    vertex_map = []
    for position in positions:
        key = tuple(map(float, position))
        if key not in remap: remap[key] = len(points); points.append(key)
        vertex_map.append(remap[key])
    mesh = bpy.data.meshes.new(node['name'])
    mesh.from_pydata(points, [], [[vertex_map[int(i)] for i in face] for face in indices])
    mesh.update()
    bm = bmesh.new(); bm.from_mesh(mesh)
    row = dict(name=node['name'], sourceFaces=len(indices), blenderFaces=len(bm.faces),
        exactCoordinateVertices=len(points), boundaryEdges=sum(e.is_boundary for e in bm.edges),
        nonManifoldEdges=sum(not e.is_manifold for e in bm.edges),
        nonContiguousEdges=sum(e.is_manifold and not e.is_contiguous for e in bm.edges),
        signedVolume=bm.calc_volume(signed=True))
    assert row['sourceFaces'] == row['blenderFaces'] and row['boundaryEdges'] == row['nonManifoldEdges'] == row['nonContiguousEdges'] == 0 and row['signedVolume'] > 0
    rows.append(row)
    bm.free(); bpy.data.meshes.remove(mesh)
assert len(rows) == 5
report = dict(status='READ_ONLY_STRUCTURAL_FILTER_NOT_ACCEPTANCE', blender=bpy.app.version_string,
    sourceSha256=sha(raw), coordinateTolerance=0, exports=0, meshes=rows)
output = ROOT / 'docs/qa/workers-frontside/blender-audit.json'
output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print(json.dumps(report))
