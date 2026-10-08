"""Disabled maize stem derivative, no visibility masks or source modification.

The proposed bilateral stem uses ALL reduced faces plus their actual reverses;
this removes reliance on discrete reverse-face selection during growth bridges.
Original soil/leaves remain exact. Visual/continuous bridge/GPU gates are pending.
"""
import hashlib
import json
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from mathutils.bvhtree import BVHTree
from frontside_model_pilot import ROOT, read_glb, accessor

folder = ROOT / 'docs/qa/frontside-model-pilot'
receipt = next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw, doc, binary = read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest() == receipt['sourceSha256']
name = 'maiz_05_maduro'
node = next(n for n in doc['nodes'] if n.get('name') == name)
prim = doc['meshes'][node['mesh']]['primitives'][0]
assert 'skin' not in node and not prim.get('targets') and set(prim['attributes']) == {'POSITION','NORMAL','TEXCOORD_0'}
p, n, uv = [accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
ix = accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges = json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
model = node['extras']['cropIndex']*5+node['extras']['stage']-1
labels = np.asarray(bridges['models'][model]['faceLabels'])
assert len(labels) == len(ix)
stem = np.flatnonzero(labels == 1)
kept = np.flatnonzero(labels != 1)
old = np.unique(ix[stem])
local = np.searchsorted(old, ix[stem])
tree = BVHTree.FromPolygons(p[old].tolist(), local.tolist(), all_triangles=True)
rows = []
for ratio in [.75, .6, .5, .4]:
    mesh = bpy.data.meshes.new(f'{name}-stem-{ratio}')
    mesh.from_pydata(p[old].tolist(), [], local.tolist())
    mesh.update()
    layer = mesh.uv_layers.new(name='OriginalAtlas')
    for poly in mesh.polygons:
        poly.use_smooth = True
        for loop in poly.loop_indices:
            layer.data[loop].uv = uv[old[mesh.loops[loop].vertex_index]].tolist()
    mesh.normals_split_custom_set_from_vertices(n[old].tolist())
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.collection.objects.link(obj)
    modifier = obj.modifiers.new('Stem bilateral-budget proposal', 'DECIMATE')
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    reduced = evaluated.to_mesh()
    reduced.calc_loop_triangles()
    corners = np.concatenate([p[ix[kept]], n[ix[kept]], uv[ix[kept]]], axis=2).tolist()
    output_labels = labels[kept].astype(int).tolist()
    distances = []
    for triangle in reduced.loop_triangles:
        row = []
        for loop in triangle.loops:
            vertex = reduced.loops[loop].vertex_index
            position = reduced.vertices[vertex].co
            distances.append(tree.find_nearest(position)[3])
            row.append([*position, *reduced.corner_normals[loop].vector, *reduced.uv_layers['OriginalAtlas'].data[loop].uv])
        center = sum((reduced.vertices[v].co for v in triangle.vertices), start=reduced.vertices[triangle.vertices[0]].co*0)/3
        distances.append(tree.find_nearest(center)[3])
        corners.append(row)
        output_labels.append(1)
    array = np.asarray(corners, dtype=np.float32)
    assert np.isfinite(array).all()
    assert array[:len(kept)].tobytes() == np.concatenate([p[ix[kept]], n[ix[kept]], uv[ix[kept]]], axis=2).tobytes()
    stem_count = len(reduced.loop_triangles)
    payload = dict(status='BLENDER_STEM_REMODELLING_TRAINING_NOT_APPROVED',
        sourceSha256=receipt['sourceSha256'], mesh=name, ratio=ratio,
        cornerLanes=['POSITIONxyz','NORMALxyz','UVxy'], faceLabels=output_labels,
        corners=corners, originalUnchangedFaceIds=kept.astype(int).tolist(),
        limitations=['Stem geometry and UV/normal interpolation changed; surface-distance samples are not raster gates.',
            'Every soil/leaf corner bit is original; only driver1 stem is simplified.',
            'ALL reduced stem faces need geometric reverses, never saved visibility masks.',
            'New face labels/bridge mappings must be regenerated and validated over continuous growth.',
            'No GLB, production model or runtime bridge data changed; no GPU benefit inferred.'])
    data = (json.dumps(payload,separators=(',',':'))+'\n').encode()
    sha = hashlib.sha256(data).hexdigest()
    archive = ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.json')
    archive.write_bytes(data)
    # Shared forward/reverse attribute streams; separate private reverse material
    # retains source DoubleSide normal/TBN back-facing recipe. No flag/N duplication.
    unique = len({corner.tobytes() for corner in array.reshape(-1,8)})
    triangles = len(kept)+2*stem_count
    proposed_bytes = unique*32+triangles*3*(2 if unique<=65535 else 4)
    source_bytes = p.nbytes+n.nbytes+uv.nbytes+ix.nbytes
    rows.append(dict(ratio=ratio,sourceStemTriangles=len(stem),derivedStemTriangles=stem_count,
        sourceTriangles=len(ix),proposedBilateralTriangles=triangles,
        triangleGrowthPercent=100*(triangles/len(ix)-1),triangleBudgetPass=triangles<=len(ix)*1.1,
        sourceStateBytes=source_bytes,proposedSharedStateBytes=proposed_bytes,
        bufferGrowthPercent=100*(proposed_bytes/source_bytes-1),bufferBudgetPass=proposed_bytes<=source_bytes*1.1,
        maxSampledSurfaceDistance=max(distances,default=0),meanSampledSurfaceDistance=sum(distances)/max(len(distances),1),
        sampledCornersAndCentroids=len(distances),archive=str(archive.relative_to(ROOT)).replace('\\','/'),archiveSha256=sha,
        limitations=payload['limitations']))
    evaluated.to_mesh_clear()
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
report = dict(status='STEM_REMODELLING_OFFLINE_COST_ONLY_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],
    blenderVersion=bpy.app.version_string,blenderBuildHash=bpy.app.build_hash.decode(),rows=rows,
    limitations=['Single mature maize state; complete category/bridges, web bytes, real buffers and vertex invocations remain unmeasured.',
        'No visual acceptance, shadow acceptance or GPU timing; original files unchanged.'])
(folder/'maize-blender-stem-reduction-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
