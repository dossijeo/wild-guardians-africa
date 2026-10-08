"""Source-only semantic stem component audit, no candidate selection by views."""
import hashlib,json,sys
from pathlib import Path
from collections import defaultdict
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
bridge=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
rows=[]
for stage in range(1,6):
    node=next(n for n in doc['nodes'] if n.get('extras',{}).get('cropIndex')==4 and n['extras'].get('stage')==stage)
    prim=doc['meshes'][node['mesh']]['primitives'][0]
    p,n=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL']];ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
    labels=np.asarray(bridge['models'][20+stage-1]['faceLabels']);assert len(labels)==len(ix)
    edges=defaultdict(list)
    for face,tri in enumerate(ix):
        for a,b in zip(tri,np.roll(tri,-1)):
            ka,kb=tuple(map(float,p[a])),tuple(map(float,p[b]))
            edges[tuple(sorted((ka,kb)))].append((face,1 if ka<kb else -1))
    faces=set(map(int,np.flatnonzero(labels==1)));adj=defaultdict(set)
    for owners in edges.values():
        local=[f for f,_ in owners if f in faces]
        for f in local:adj[f].update(set(local)-{f})
    remaining=set(faces);components=[]
    while remaining:
        start=min(remaining);pending=[start];component=set()
        while pending:
            face=pending.pop()
            if face in component:continue
            component.add(face);remaining.discard(face);pending.extend(adj[face]-component)
        local_edges=[(key,owners) for key,owners in edges.items() if any(f in component for f,_ in owners)]
        whole_boundary=sum(len(owners)==1 for _,owners in local_edges)
        whole_conflict=sum(len(owners)>2 or len(owners)==2 and owners[0][1]==owners[1][1] for _,owners in local_edges)
        regional_boundary=sum(sum(f in component for f,_ in owners)==1 for _,owners in local_edges)
        nn=n[ix[sorted(component)]].astype(np.float64);pos=p[ix[sorted(component)]].astype(np.float64)
        geometric=np.cross(pos[:,1]-pos[:,0],pos[:,2]-pos[:,0]);areas=np.linalg.norm(geometric,axis=1)
        dots=np.sum(nn*geometric[:,None,:],axis=2)
        components.append(dict(sourceFaceIds=sorted(component),triangles=len(component),wholeBoundaryEdges=whole_boundary,
            wholeJunctionOrWindingConflictEdges=whole_conflict,regionalBoundaryEdges=regional_boundary,
            zeroAreaTriangles=int(np.sum(areas==0)),zeroOrNonfiniteNormalCorners=int(np.sum(~np.isfinite(nn).all(axis=2)|(np.linalg.norm(nn,axis=2)==0))),
            oppositeGeometricNormalCorners=int(np.sum(dots<0)),
            isolatedClosedRegion=regional_boundary==0 and whole_conflict==0 and bool(np.all(areas>0))))
    rows.append(dict(stage=stage,node=node['name'],sourceTriangles=len(ix),stemTriangles=len(faces),stemComponents=components,
        allStemReverseTrianglePercent=100*len(faces)/len(ix),
        componentsWithActualWholeBoundary=sum(c['wholeBoundaryEdges']>0 for c in components),
        trianglesInComponentsWithActualWholeBoundary=sum(c['triangles'] for c in components if c['wholeBoundaryEdges']>0)))
report=dict(status='SOURCE_TOPOLOGY_DIAGNOSTIC_NOT_SELECTION_OR_APPROVAL',blender=bpy.app.version_string,sourceSha256=receipt['sourceSha256'],species='sorgo',states=rows,
    limitations=['Exact numeric POSITION incidence, source face IDs/driver labels retained; no weld, normal edit, cap, asset export or view mask.',
        'Regional attachment boundaries are not physical holes. Component closure alone does not establish FrontSide visual/UV/shadow/growth quality.',
        'Reversing all stem triangles would retain bilateral coverage but increases vertex/index/draw work and cannot inherit rawFront GPU savings. Costs and net benefit remain separate gates.',
        'Native states only; procedural bridges and nonlinear growth/wind interpolation require separate preservation.'])
(folder/'sorgo-stem-face-components.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps([dict(stage=r['stage'],components=len(r['stemComponents']),stem=r['stemTriangles'],boundaryComponentTriangles=r['trianglesInComponentsWithActualWholeBoundary']) for r in rows]))
