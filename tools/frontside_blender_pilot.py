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
        vertex_ids=bm.verts.layers.int.new('sourceVertex')
        for vertex in bm.verts: vertex[vertex_ids]=vertex.index
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
        # Inspect small boundary loops. A fill proposal must be compact and have
        # one crop bridge driver; large garment/leaf openings are left untouched.
        boundary={e for e in bm.edges if e.is_boundary}; loops=[]
        while boundary:
            seed=boundary.pop(); edges={seed}; pending=[seed]
            while pending:
                edge=pending.pop()
                for vertex in edge.verts:
                    for other in vertex.link_edges:
                        if other in boundary: boundary.remove(other); edges.add(other); pending.append(other)
            vertices={v for e in edges for v in e.verts}
            loops.append((edges,vertices))
        bridges=json.loads((root/'public/content/crop-bridges.json').read_text(encoding='utf8'))
        labels=None
        if category=='crops':
            extras=node['extras']; labels=bridges['models'][extras['cropIndex']*5+extras['stage']-1]['faceLabels']
        cap_proposals=[]; excluded=[]
        envelope=(p.max(axis=0)-p.min(axis=0)); area_budget=float(max(envelope)**2*.0005)
        for edges,vertices in loops:
            linked={f for e in edges for f in e.link_faces}
            face_ids=[f[provenance] for f in linked]
            label_set={labels[i] for i in face_ids} if labels else set()
            closed_loop=all(sum(e in edges for e in v.link_edges)==2 for v in vertices)
            if not closed_loop or len(edges)>24 or (labels and len(label_set)!=1):
                excluded.append(dict(edges=len(edges),reason='Branch/large loop/mixed regional drivers')); continue
            # Compute a conservative fan area before modifying scratch.
            centroid=sum((v.co for v in vertices),vertices.copy().pop().co*0)/len(vertices)
            area=sum((e.verts[0].co-centroid).cross(e.verts[1].co-centroid).length*.5 for e in edges)
            if area>area_budget:
                excluded.append(dict(edges=len(edges),area=area,reason='Closure exceeds local area budget')); continue
            if category!='crops':
                excluded.append(dict(edges=len(edges),area=area,reason='Worker cap needs animated seam/UV inspection')); continue
            result=bmesh.ops.holes_fill(bm,edges=list(edges),sides=24)
            filled=result.get('faces',[])
            if not filled: continue
            triangles=bmesh.ops.triangulate(bm,faces=filled).get('faces',[])
            for face in triangles:
                cap_proposals.append(dict(indices=[v[vertex_ids] for v in face.verts],driver=next(iter(label_set)),area=face.calc_area()))
        reports.append(dict(category=category,name=node['name'],source=url,original=original,weldedScratch=welded,
            components=sorted(components,key=lambda c:-c['faces']),recalcWindingProposal=flips,
            capProposals=cap_proposals,excludedBoundaryLoops=excluded,
            warning='Weld/recalc scratch is not an approved repair; UV, weights and per-face provenance must be preserved by a controlled writer.'))
        bm.free()
out=root/'docs/qa/frontside-model-pilot/blender-inspection.json'
out.write_text(json.dumps(dict(blender=bpy.app.version_string,status='INSPECTION_ONLY',meshes=reports),indent=2)+'\n',encoding='utf8')
print(json.dumps([dict(name=r['name'],original=r['original'],welded=r['weldedScratch'],components=len(r['components']),proposedFlips=len(r['recalcWindingProposal'])) for r in reports]))
