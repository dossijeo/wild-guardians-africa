"""Inspect custom-normal transport independently of shader/raster observations.

This exports no mesh candidate and does not change the frozen native fixtures.
The generic POINT attribute is a diagnostic, not a proven chart correspondence.
"""
import hashlib, json, sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT, read_glb, accessor

folder = ROOT / 'docs/qa/frontside-model-pilot'
receipt = json.loads((folder/'maize-blender-stem-budget-max-diagnostic.json').read_text(encoding='utf8'))
source = next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw, doc, binary = read_glb(ROOT/'public'/source['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest() == receipt['sourceSha256']
node = next(n for n in doc['nodes'] if n.get('name') == 'maiz_05_maduro')
prim = doc['meshes'][node['mesh']]['primitives'][0]
p, n, uv = [accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
ix = accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges = json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels = np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])
old = np.unique(ix[labels == 1]); local = np.searchsorted(old, ix[labels == 1])
mesh = bpy.data.meshes.new('OriginalStemFieldAudit')
mesh.from_pydata(p[old].tolist(), [], local.tolist()); mesh.update()
layer = mesh.uv_layers.new(name='OriginalAtlas')
attribute = mesh.attributes.new(name='RawOriginalNormalDiagnostic', type='FLOAT_VECTOR', domain='POINT')
for vertex in range(len(old)):
    attribute.data[vertex].vector = n[old[vertex]].tolist()
for poly in mesh.polygons:
    poly.use_smooth = True
    for loop in poly.loop_indices:
        layer.data[loop].uv = uv[old[mesh.loops[loop].vertex_index]].tolist()
mesh.normals_split_custom_set_from_vertices(n[old].tolist())
obj = bpy.data.objects.new(mesh.name, mesh); bpy.context.collection.objects.link(obj)

def angles(a,b):
    lengths = np.linalg.norm(a,axis=1)*np.linalg.norm(b,axis=1)
    assert np.isfinite(a).all() and np.isfinite(b).all() and (lengths>0).all()
    v = np.arccos(np.clip((a*b).sum(axis=1)/lengths,-1,1))
    return dict(count=len(v), maximum=float(v.max()), mean=float(v.mean()), p99=float(np.quantile(v,.99)))

raw_loop = np.asarray([n[old[loop.vertex_index]] for loop in mesh.loops],float)
custom_before = np.asarray([x.vector[:] for x in mesh.corner_normals],float)
generic_before = np.asarray([attribute.data[loop.vertex_index].vector[:] for loop in mesh.loops],np.float32)
assert generic_before.tobytes() == raw_loop.astype(np.float32).tobytes()
before = angles(raw_loop, custom_before)
modifier = obj.modifiers.new('Stem max-budget diagnostic', 'DECIMATE')
modifier.ratio = receipt['rows'][0]['ratio']; modifier.use_collapse_triangulate = True
evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()); reduced = evaluated.to_mesh()
reduced.calc_loop_triangles()
generic = reduced.attributes.get('RawOriginalNormalDiagnostic')
assert generic is not None and generic.domain == 'POINT' and generic.data_type == 'FLOAT_VECTOR'
custom_after = np.asarray([reduced.corner_normals[i].vector[:] for t in reduced.loop_triangles for i in t.loops],float)
transported = np.asarray([generic.data[reduced.loops[i].vertex_index].vector[:] for t in reduced.loop_triangles for i in t.loops],float)
after = angles(transported, custom_after)
lengths = np.linalg.norm(transported,axis=1)
report = dict(status='CUSTOM_NORMAL_TRANSPORT_DIAGNOSTIC_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],blenderVersion=bpy.app.version_string,blenderBuildHash=bpy.app.build_hash.decode(),originalCustomNormalVersusRaw=before,genericOriginalNormalBitsBeforeModifierExact=True,reducedTriangles=len(reduced.loop_triangles),reducedCustomNormalVersusGenericPointField=after,genericFieldLengthRange=[float(lengths.min()),float(lengths.max())],limitations=['No candidate exported; original geometry and frozen native imports remain untouched.', 'Blender generic attribute interpolation is not verified original chart/normal correspondence at changed vertices.', 'Angular transport differences do not identify a native RGB or alpha cause.', 'Generic field is not automatically an acceptable unit normal field; original shader normalization/interpolation and multiview quality remain gates.'])
(folder/'maize-stem-normal-pipeline-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
evaluated.to_mesh_clear()
bpy.data.objects.remove(obj, do_unlink=True); bpy.data.meshes.remove(mesh)
print(json.dumps(report))
