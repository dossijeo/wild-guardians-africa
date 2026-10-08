"""Geometry-only reconstruction draft with immutable source shading tables.

No renderable GLB is exported: UV parameterization, field evaluation, growth,
coverage, shadow and resource/GPU acceptance are deliberately unresolved.
Only regular opposite-winding geometric edge adjacency connects source faces.
Non-manifold/coincident junctions become chart interfaces, never caps.
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
node=next(n for n in d['nodes'] if n.get('name')=='maiz_05_maduro')
prim=d['meshes'][node['mesh']]['primitives'][0]
p,n,u=[accessor(d,b,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
ix=accessor(d,b,prim['indices']).reshape(-1,3)
labels=np.asarray(json.loads((ROOT/'public/content/crop-bridges.json').read_text())['models'][4]['faceLabels'])
assert len(labels)==len(ix)
pointids={};vertexpoints={};representatives=[]
for v,point in enumerate(p):
    key=tuple(map(float,point))
    if key not in pointids:pointids[key]=len(pointids);representatives.append(v)
    vertexpoints[v]=pointids[key]
sourceFaceChart=np.full(len(ix),-1,dtype=np.int32);charts=[];proxyP=[];proxyIx=[];proxyFaceChart=[];offset=0
for label in sorted(set(map(int,labels[labels>=2]))):
    faces=set(map(int,np.flatnonzero(labels==label)));edges=defaultdict(list);adj=defaultdict(set)
    for f in faces:
        verts=[vertexpoints[int(v)] for v in ix[f]]
        for a,c in zip(verts,verts[1:]+verts[:1]):edges[tuple(sorted((a,c)))].append((f,a,c))
    for owners in edges.values():
        if len(owners)==2 and owners[0][1:]==owners[1][1:][::-1] and owners[0][1]!=owners[0][2]:
            a,c=owners[0][0],owners[1][0];adj[a].add(c);adj[c].add(a)
    while faces:
        seed=min(faces);faces.remove(seed);part={seed};pending=[seed]
        while pending:
            for f in adj[pending.pop()]:
                if f in faces:faces.remove(f);part.add(f);pending.append(f)
        original=sorted(part);chartId=len(charts);sourceFaceChart[original]=chartId
        points=sorted({vertexpoints[int(v)] for f in original for v in ix[f]});local={v:i for i,v in enumerate(points)}
        P=p[[representatives[v] for v in points]]
        triangles=[[local[vertexpoints[int(v)]] for v in ix[f]] for f in original]
        # Collapsed-position input faces are retained in the source field table,
        # but cannot be sent through Blender's simplifier as valid surfaces.
        if any(len(set(t))<3 for t in triangles):
            charts.append(dict(chart=chartId,label=label,sourceFaces=original,status='UNSUPPORTED_POSITION_DEGENERACY',proxyFaces=0));continue
        mesh=bpy.data.meshes.new('DRAFT_CHART');mesh.from_pydata(P.tolist(),[],triangles);mesh.update()
        obj=bpy.data.objects.new('DRAFT_CHART',mesh);bpy.context.collection.objects.link(obj)
        modifier=obj.modifiers.new('GEOMETRY_ONLY_HALF','DECIMATE');modifier.ratio=.5
        deps=bpy.context.evaluated_depsgraph_get();evaluated=obj.evaluated_get(deps);result=evaluated.to_mesh();result.calc_loop_triangles()
        Q=np.asarray([v.co[:] for v in result.vertices],dtype=np.float32).reshape(-1,3)
        J=np.asarray([t.vertices[:] for t in result.loop_triangles],dtype=np.uint32).reshape(-1,3)
        proxyP.append(Q);proxyIx.append(J+offset);proxyFaceChart.extend([chartId]*len(J));offset+=len(Q)
        charts.append(dict(chart=chartId,label=label,sourceFaces=original,status='GEOMETRY_DRAFT_UNVALIDATED',sourceVertices=len(P),proxyVertices=len(Q),proxyFaces=len(J)))
        evaluated.to_mesh_clear();bpy.data.objects.remove(obj,do_unlink=True);bpy.data.meshes.remove(mesh)
assert hashlib.sha256((ROOT/'public'/receipt['source'].lstrip('/')).read_bytes()).hexdigest()==receipt['sourceSha256']
cache=ROOT/'.cache/frontside-model-pilot/chart-proxy';cache.mkdir(parents=True,exist_ok=True)
payload=cache/'maize-mature-geometry-draft.npz'
np.savez_compressed(payload,originalPosition=p,originalNormal=n,originalUv=u,originalIndices=ix,originalLabels=labels,
    sourceFaceChart=sourceFaceChart,proxyPosition=np.concatenate(proxyP),proxyIndices=np.concatenate(proxyIx),proxyFaceChart=np.asarray(proxyFaceChart,dtype=np.int32))
report=dict(status='GEOMETRY_DRAFT_NO_SHADING_NO_ACCEPTANCE',sourceSha256=receipt['sourceSha256'],blender=bpy.app.version_string,
    payloadRelative=str(payload.relative_to(ROOT)).replace('\\','/'),payloadSha256=hashlib.sha256(payload.read_bytes()).hexdigest(),payloadBytes=payload.stat().st_size,
    originalLeafFaces=int((labels>=2).sum()),proxyLeafFaces=sum(c['proxyFaces'] for c in charts),charts=charts,
    limitations=['Source stem/soil/bridge tables remain immutable; payload includes original source lanes and chart IDs, not a replacement runtime model.',
    'Decimation is a geometry draft, not quality evidence. Boundaries may move; no correspondence/UV atlas/normal field has been evaluated.',
    'Cut chart interfaces are not holes to cap. Source seam field identities must be recovered separately.',
    'Growth, silhouette, material/UV/normal maps, DoubleSide quality, FrontSide coverage, shadows and net GPU benefit remain untested.',
    'Compressed NPZ byte size is not web GLB size or resident GPU memory; no source shading-field texture or lookup program exists.'])
(out/'crop-maize-chart-proxy-draft.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps({k:report[k] for k in ['status','originalLeafFaces','proxyLeafFaces','payloadBytes','payloadSha256']}))
