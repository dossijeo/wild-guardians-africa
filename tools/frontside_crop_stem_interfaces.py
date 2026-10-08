"""Read-only exact stem interfaces for one mature maize pilot, no view input."""
import hashlib,json,sys
from collections import defaultdict,Counter
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_05_maduro')
prim=doc['meshes'][node['mesh']]['primitives'][0]
P,N,U=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels=bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels']
stem=[i for i,label in enumerate(labels) if label==1]
points={};weld=[]
for point in P:
    key=tuple(map(float,point));points.setdefault(key,len(points));weld.append(points[key])
tris=np.asarray(weld)[ix];edge_faces=defaultdict(list);parent={f:f for f in stem}
def find(f):
    while parent[f]!=f:parent[f]=parent[parent[f]];f=parent[f]
    return f
cross=np.cross(P[ix[:,1]].astype(float)-P[ix[:,0]],P[ix[:,2]].astype(float)-P[ix[:,0]])
length=np.linalg.norm(cross,axis=1)
for f in stem:
    for a,b in [(0,1),(1,2),(2,0)]:
        x,y=int(tris[f,a]),int(tris[f,b]);edge_faces[tuple(sorted((x,y)))].append((f,a,b))
for entries in edge_faces.values():
    for f,_,_ in entries[1:]:parent[find(f)]=find(entries[0][0])
interfaces=Counter();angles=[]
for edge,entries in edge_faces.items():
    if len(entries)!=2:interfaces['boundary' if len(entries)==1 else 'nonManifold']+=1;continue
    (f,a,b),(g,c,d)=entries
    if int(tris[f,a])==int(tris[g,c]):c,d=d,c
    continuous_uv=np.array_equal(U[ix[f,[a,b]]],U[ix[g,[d,c]]])
    continuous_n=np.array_equal(N[ix[f,[a,b]]],N[ix[g,[d,c]]])
    interfaces['paired']+=1;interfaces['uvContinuous' if continuous_uv else 'uvSeam']+=1
    interfaces['normalContinuous' if continuous_n else 'normalSeam']+=1
    if length[f] and length[g]:
        angle=float(np.arccos(np.clip(np.dot(cross[f],cross[g])/(length[f]*length[g]),-1,1)))
        angles.append(angle)
        if angle<=.001:
            interfaces['nearPlanar']+=1
            if continuous_uv and continuous_n:interfaces['nearPlanarContinuousUVAndN']+=1
components=defaultdict(list)
for f in stem:components[find(f)].append(f)
rows=[]
for faces in components.values():
    edges=Counter();directions=Counter()
    for f in faces:
        for a,b in [(0,1),(1,2),(2,0)]:
            x,y=int(tris[f,a]),int(tris[f,b]);key=tuple(sorted((x,y)));edges[key]+=1;directions[key]+=1 if x<y else -1
    boundary=sum(c==1 for c in edges.values());nonmanifold=sum(c>2 for c in edges.values());conflicts=sum(c==2 and directions[k]!=0 for k,c in edges.items())
    closed=not(boundary or nonmanifold or conflicts)
    q=P[ix[faces]].astype(float);volume=float(np.einsum('ij,ij->i',q[:,0],np.cross(q[:,1],q[:,2])).sum()/6) if closed else None
    normal=N[ix[faces]].astype(float);norms=np.linalg.norm(normal,axis=2)
    opposed=int((np.einsum('ij,ikj->ik',cross[faces],normal)<=0).sum())
    eligible=closed and volume>0 and np.isfinite(normal).all() and np.all(np.abs(norms-1)<=1e-4) and not opposed and bool(np.all(length[faces]>0))
    rows.append(dict(sourceFaces=faces,triangles=len(faces),boundaryEdges=boundary,nonManifoldEdges=nonmanifold,windingConflictEdges=conflicts,closedConsistent=closed,signedVolume=volume,normalNonpositiveCorners=opposed,geometricFilterEligible=bool(eligible)))
report=dict(status='EXACT_MAIZE_STEM_INTERFACE_DIAGNOSTIC_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],mesh=node['name'],stemTriangles=len(stem),interfaces=dict(interfaces),components=rows,eligibleTriangles=sum(r['triangles'] for r in rows if r['geometricFilterEligible']),limitations=['Exact numeric Float32 position adjacency only; signed zeros equal. No epsilon weld or geometry export.', 'UV/normal seams compare original corner values exactly, not texture appearance or interpolation equivalence.', 'Near-planar threshold .001 radians is diagnostic only, never permission to dissolve an edge.', 'Closed consistent positive-volume filter is conservative; closedness is not universal FrontSide necessity.', 'Native shader growth, bridge deformation, material maps, quality, shadows and GPU net benefit remain untested.'])
(folder/'maize-stem-exact-interface-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['stemTriangles','interfaces','eligibleTriangles']}))
