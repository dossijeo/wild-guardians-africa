"""Inspect ONLY the localized spout's proposed solid wall in Blender headless.

Controlled writer retains all source contracts. This scratch welding is
topology diagnosis, never an exporter or visual approval.
"""
import bpy,bmesh,json,pathlib,sys,numpy as np
from mathutils.bvhtree import BVHTree
sys.dont_write_bytecode=True
root=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'tools'))
from frontside_model_pilot import read_glb,accessor
receipts=json.loads((root/'docs/qa/frontside-model-pilot/selective-candidate-receipts.json').read_text())
receipt=next(r for r in receipts if r['category']=='youngMale')
_,doc,binary=read_glb(root/receipt['candidate'])
node=next(n for n in doc['nodes'] if n.get('name')=='Prop_WateringCan_geometry_1')
prim=doc['meshes'][node['mesh']]['primitives'][0]
position=accessor(doc,binary,prim['attributes']['POSITION']);indices=accessor(doc,binary,prim['indices']).reshape(-1,3)
change=next(c for c in receipt['changes'] if c['name']==node['name'])
proposal=json.loads((root/'docs/qa/frontside-model-pilot/local-spout-shell-proposal.json').read_text())
source_faces=set(proposal['sourceFaces'])
reverse_ids=[change['trianglesBefore']+i for i,f in enumerate(change['sourceFaces']) if f in source_faces]
caps=list(range(change['trianglesBefore']+change['reverseFaces'],change['trianglesAfter']))
chosen=sorted(source_faces)+reverse_ids+caps
physical_points,physical_ids=np.unique(position[indices[chosen]].reshape(-1,3),axis=0,return_inverse=True)
mesh=bpy.data.meshes.new('localized_spout_shell');mesh.from_pydata(physical_points.tolist(),[],physical_ids.reshape(-1,3).tolist());mesh.update()
bm=bmesh.new();bm.from_mesh(mesh)
provenance=bm.faces.layers.int.new('candidateFace')
for face in bm.faces:face[provenance]=chosen[face.index]
used=[v for v in bm.verts if v.link_faces]
bm.faces.ensure_lookup_table();tree=BVHTree.FromBMesh(bm,epsilon=0)
overlaps=sorted({tuple(sorted((a,b))) for a,b in tree.overlap(tree) if a!=b and not set(bm.faces[a].verts)&set(bm.faces[b].verts)})
report=dict(status='BLENDER_LOCAL_SHELL_DIAGNOSTIC_NOT_APPROVED',blender=bpy.app.version_string,
    candidateSha256=receipt['candidateSha256'],sourceFaces=len(source_faces),innerFaces=len(reverse_ids),rimFaces=len(caps),
    wallThickness=proposal['thickness'],usedVertices=len(used),faces=len(bm.faces),
    boundaryEdges=sum(e.is_boundary for e in bm.edges),nonManifoldEdges=sum(not e.is_manifold and not e.is_boundary for e in bm.edges),
    inconsistentWindingEdges=sum(e.is_manifold and not e.is_contiguous for e in bm.edges),
    degenerateFaces=sum(f.calc_area()<=1e-12 for f in bm.faces),
    nonAdjacentBvhOverlapPairs=[[chosen[a],chosen[b]] for a,b in overlaps],
    interfaceMethod='Exact float32 positional identity, no tolerance; UV/normal seams remain separate in candidate',
    limitations=['Exact physical-interface scratch is diagnostic, original vertices/UV/skin remain untouched.',
        'Does not establish absence of self-intersection, visual equivalence or GPU improvement.'])
(root/'docs/qa/frontside-model-pilot/blender-local-spout-shell.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report));bm.free()
