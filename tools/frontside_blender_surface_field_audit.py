"""Read-only geometric/shading correspondence audit; no derived asset/export.

Exact position welding diagnoses physical connectivity independently of UV/normal
seams. UV-corner collisions are sufficient counterexamples to a UV-only field;
absence of such collisions does NOT establish triangle-interior injectivity.
"""
import sys,json,hashlib
from pathlib import Path
from collections import defaultdict
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
out=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((out/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,d,b=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
models=json.loads((ROOT/'public/content/crop-bridges.json').read_text())['models']
rows=[]
for node in d['nodes']:
    meta=node.get('extras',{})
    if meta.get('cropIndex')!=0 or 'stage' not in meta:continue
    prim=d['meshes'][node['mesh']]['primitives'][0]
    p,n,u=[accessor(d,b,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
    ix=accessor(d,b,prim['indices']).reshape(-1,3)
    labels=np.asarray(models[meta['stage']-1]['faceLabels']);assert len(labels)==len(ix)
    leaves=[]
    for label in sorted(set(map(int,labels[labels>=2]))):
        faces=np.flatnonzero(labels==label);used=np.unique(ix[faces]);ids={};vid={}
        positions=defaultdict(set);uvs=defaultdict(set);uv_witness=defaultdict(list)
        for v in used:
            v=int(v);pk=tuple(map(float,p[v]));uk=tuple(map(float,u[v]));nk=n[v].tobytes()
            ids.setdefault(pk,len(ids));vid[v]=ids[pk]
            positions[pk].add((uk,nk));uvs[uk].add((pk,nk));uv_witness[uk].append(v)
        edges=defaultdict(list);adj=defaultdict(set)
        geometric_degenerate=[]
        for f in faces:
            verts=[vid[int(v)] for v in ix[f]]
            if len(set(verts))<3:geometric_degenerate.append(int(f))
            for a,c in zip(verts,verts[1:]+verts[:1]):edges[tuple(sorted((a,c)))].append((int(f),a,c))
        for owners in edges.values():
            for a in owners:
                adj[a[0]].update(v[0] for v in owners if v[0]!=a[0])
        unseen=set(map(int,faces));components=[]
        while unseen:
            seed=unseen.pop();component={seed};todo=[seed]
            while todo:
                for f in adj[todo.pop()]:
                    if f in unseen:unseen.remove(f);component.add(f);todo.append(f)
            components.append(len(component))
        boundary=[owners[0][1:] for owners in edges.values() if len(owners)==1]
        boundary_degree=defaultdict(int)
        for a,c in boundary:boundary_degree[a]+=1;boundary_degree[c]+=1
        conflicts=[owners for owners in edges.values() if len(owners)==2 and owners[0][1:]==owners[1][1:]]
        ambiguous=[(uk,fields) for uk,fields in uvs.items() if len(fields)>1]
        # Witness corners retain exact source IDs; no guessed correspondence.
        witnesses=[dict(uv=list(uk),sourceVertices=uv_witness[uk],distinctPositionNormalFields=len(fields)) for uk,fields in ambiguous[:16]]
        leaves.append(dict(label=label,sourceFaces=len(faces),sourceAttributeVertices=len(used),geometricVertices=len(ids),
            geometricComponents=sorted(components,reverse=True),boundaryEdges=len(boundary),
            boundaryJunctions=sum(v!=2 for v in boundary_degree.values()),nonManifoldEdges=sum(len(o)>2 for o in edges.values()),
            windingConflictEdges=len(conflicts),collapsedPositionFaces=geometric_degenerate,
            positionCornersWithDistinctUvNormalFields=sum(len(s)>1 for s in positions.values()),
            uvCornersWithDistinctPositionNormalFields=len(ambiguous),uvOnlyFieldCounterexamples=witnesses))
    rows.append(dict(mesh=node['name'],stage=meta['stage'],leaves=leaves))
report=dict(status='SURFACE_FIELD_CORRESPONDENCE_AUDIT_NOT_ASSET',blender=bpy.app.version_string,sourceSha256=receipt['sourceSha256'],models=rows,
    limitations=['Exact position connectivity is diagnostic, not authorization to weld shading seams or close semantic interfaces.',
    'UV corner counterexamples only; triangle interior overlap/injectivity, barycentric charts and posed fields remain unproved.',
    'Neither no winding conflicts nor closedness proves visual FrontSide equivalence.',
    'No geometry, UV, normal, material, bridge, runtime or source file edited; no candidate generated.',
    'No texture-field resolution, resident memory, derivative parity or net GPU benefit established.'])
(out/'crop-maize-surface-field-audit.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps(dict(status=report['status'],models=[dict(mesh=m['mesh'],leafFaces=sum(l['sourceFaces'] for l in m['leaves']),uvCornerAmbiguities=sum(l['uvCornersWithDistinctPositionNormalFields'] for l in m['leaves']),components=sum(len(l['geometricComponents']) for l in m['leaves'])) for m in rows])))
