"""Blender headless local topology inspection; emits proposals, never source assets.

blender.exe -b --factory-startup --python tools/frontside_blender_pilot.py
This deliberately bypasses glTF import/export: polygon IDs remain source face IDs.
"""
import bpy, bmesh, json, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tools'))
from frontside_model_pilot import read_glb, accessor

crop=json.loads((root/'public/content/models.json').read_text(encoding='utf8'))
crop=next(m['url'] for m in crop if 'Cultivos' in m['source'])
worker=json.loads((root/'public/content/worker-actions.json').read_text(encoding='utf8'))['youngMale']['url']
reports=[]
for category,url,names in [('crops',crop,{'maiz_05_maduro','platano_05_maduro'}),('youngMale',worker,{'Mesh0'})]:
    _,doc,binary=read_glb(root/'public'/url.lstrip('/'))
    for node in doc['nodes']:
        if node.get('name') not in names: continue
        primitive=doc['meshes'][node['mesh']]['primitives'][0]
        p=accessor(doc,binary,primitive['attributes']['POSITION'])
        ix=accessor(doc,binary,primitive['indices']).reshape(-1,3)
        me=bpy.data.meshes.new(node['name']); me.from_pydata(p.tolist(),[],ix.tolist()); me.update()
        bm=bmesh.new(); bm.from_mesh(me)
        provenance=bm.faces.layers.int.new('sourceFace')
        for face in bm.faces: face[provenance]=face.index
        original=dict(vertices=len(bm.verts),faces=len(bm.faces),boundaryEdges=sum(e.is_boundary for e in bm.edges),
            nonManifoldEdges=sum(not e.is_manifold and not e.is_boundary for e in bm.edges),
            nonContiguousEdges=sum(e.is_manifold and not e.is_contiguous for e in bm.edges))
        # Welded mesh is a diagnostic scratch copy. Never carried into candidate skin/UV data.
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-5); bm.normal_update()
        welded=dict(vertices=len(bm.verts),faces=len(bm.faces),boundaryEdges=sum(e.is_boundary for e in bm.edges),
            nonManifoldEdges=sum(not e.is_manifold and not e.is_boundary for e in bm.edges),
            nonContiguousEdges=sum(e.is_manifold and not e.is_contiguous for e in bm.edges))
        # Components via shared manifold/non-manifold edges; intersections without shared edges stay separate.
        unseen=set(bm.faces); components=[]
        while unseen:
            seed=unseen.pop(); component={seed}; pending=[seed]
            while pending:
                face=pending.pop()
                for edge in face.edges:
                    for other in edge.link_faces:
                        if other in unseen: unseen.remove(other); component.add(other); pending.append(other)
            edges={e for f in component for e in f.edges}
            components.append(dict(faces=len(component),boundaryEdges=sum(e.is_boundary for e in edges),
                nonManifoldEdges=sum(not e.is_manifold and not e.is_boundary for e in edges),
                sourceFaceIds=sorted(f[provenance] for f in component),
                area=sum(f.calc_area() for f in component)))
        before={f[provenance]:f.normal.copy() for f in bm.faces}
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.normal_update()
        flips=sorted(f[provenance] for f in bm.faces if before[f[provenance]].dot(f.normal)<-.99)
        reports.append(dict(category=category,name=node['name'],source=url,original=original,weldedScratch=welded,
            components=sorted(components,key=lambda c:-c['faces']),recalcWindingProposal=flips,
            warning='Weld/recalc scratch is not an approved repair; UV, weights and per-face provenance must be preserved by a controlled writer.'))
        bm.free()
out=root/'docs/qa/frontside-model-pilot/blender-inspection.json'
out.write_text(json.dumps(dict(blender=bpy.app.version_string,status='INSPECTION_ONLY',meshes=reports),indent=2)+'\n',encoding='utf8')
print(json.dumps([dict(name=r['name'],original=r['original'],welded=r['weldedScratch'],components=len(r['components']),proposedFlips=len(r['recalcWindingProposal'])) for r in reports]))
