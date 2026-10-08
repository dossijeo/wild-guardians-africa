"""Exact-coordinate component inventory, not universal FrontSide approval.

No epsilon weld/export/normal edit. Topology is a conservative candidate filter;
material opacity, rig deformation, overlaps, shadows and all-view QA remain.
"""
import hashlib,json,sys
sys.dont_write_bytecode=True
from collections import Counter,defaultdict
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot';receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='youngMale')
raw,d,b=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256'];rows=[]
for node in d['nodes']:
    if 'mesh' not in node:continue
    for pi,p in enumerate(d['meshes'][node['mesh']]['primitives']):
        P=accessor(d,b,p['attributes']['POSITION']);N=accessor(d,b,p['attributes']['NORMAL']);ix=accessor(d,b,p['indices']).reshape(-1,3);points=P[ix].astype(np.float64);crosses=np.cross(points[:,1]-points[:,0],points[:,2]-points[:,0]);valid=np.linalg.norm(crosses,axis=1)>0
        # Numeric Float32 coordinate equality only; seams are inspected, not
        # altered. IEEE signed zeros represent the same geometric coordinate.
        ids={};vertex_ids=[]
        for point in P:
            key=tuple(map(float,point));ids.setdefault(key,len(ids));vertex_ids.append(ids[key])
        welded=np.asarray(vertex_ids)[ix];parent=list(range(len(ix)));edge_faces=defaultdict(list)
        def find(i):
            while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
            return i
        for face in np.flatnonzero(valid):
            for a,c in [(0,1),(1,2),(2,0)]:edge_faces[tuple(sorted((int(welded[face,a]),int(welded[face,c]))))].append(int(face))
        for faces in edge_faces.values():
            for face in faces[1:]:parent[find(face)]=find(faces[0])
        components=defaultdict(list)
        for face in np.flatnonzero(valid):components[find(int(face))].append(int(face))
        groups=[]
        for faces in components.values():
            edges=Counter();directions=Counter()
            for face in faces:
                tri=welded[face]
                for a,c in [(0,1),(1,2),(2,0)]:
                    x,y=int(tri[a]),int(tri[c]);key=tuple(sorted((x,y)));edges[key]+=1;directions[key]+=1 if x<y else -1
            boundary=sum(n==1 for n in edges.values());nonmanifold=sum(n>2 for n in edges.values());conflicts=sum(n==2 and directions[e]!=0 for e,n in edges.items());closed=boundary==0 and nonmanifold==0 and conflicts==0
            q=points[faces];signed_volume=float(np.einsum('ij,ij->i',q[:,0],np.cross(q[:,1],q[:,2])).sum()/6) if closed else None
            norm=N[ix[faces]].astype(np.float64);lengths=np.linalg.norm(norm,axis=2);finite=bool(np.isfinite(norm).all());undefined=int(np.sum(lengths<1e-10));nonunit=int(np.sum(np.abs(lengths-1)>1e-4));dots=np.einsum('ij,ikj->ik',crosses[faces],norm);opposed=int(np.sum(dots<0));orthogonal=int(np.sum(dots==0))
            eligible=closed and signed_volume>0 and finite and not undefined and not nonunit and not opposed and not orthogonal
            groups.append(dict(sourceFaces=faces,triangles=len(faces),boundaryEdges=boundary,nonManifoldEdges=nonmanifold,windingConflictEdges=conflicts,closedConsistent=closed,signedVolume=signed_volume,undefinedCornerNormals=undefined,nonunitCornerNormals=nonunit,normalOpposedCorners=opposed,normalOrthogonalCorners=orthogonal,geometricFilterEligible=eligible))
        material=d['materials'][p['material']]
        rows.append(dict(mesh=node.get('name'),primitive=pi,triangles=len(ix),degenerateTriangles=int((~valid).sum()),skin=node.get('skin'),morphTargetCount=len(p.get('targets',[])),sourceDoubleSided=material.get('doubleSided',False),materialAlphaMode=material.get('alphaMode','OPAQUE'),eligibleTriangles=sum(g['triangles'] for g in groups if g['geometricFilterEligible']),components=groups))
report=dict(status='EXACT_COMPONENT_FILTER_NOT_APPROVAL',sourceSha256=receipt['sourceSha256'],meshes=rows,limitations=['Exact numeric coordinate adjacency diagnoses topology only; no seam welding, filtering or geometry export performed.', 'Closed consistent positive-volume components with finite unit normals aligned at every corner pass this strict filter only.', 'Closedness is not universally required for FrontSide and a failed conservative filter does not prove a surface unusable.', 'Skinned deformation, alpha maps, overlaps, source shader sidedness, all12clips/shadows and net GPU cost require separate validation.', 'Actual runtime bodyMesh0 alreadyFrontSide must not be forcedDoubleSide for a misleading benchmark. Remaining surfaces stay originalDoubleSide unless independently approved.'])
(folder/'worker-exact-closed-component-filter.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps([{k:r[k] for k in ['mesh','triangles','skin','sourceDoubleSided','eligibleTriangles']} for r in rows]))
