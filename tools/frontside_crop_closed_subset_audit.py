"""One representative source crop: strict exact-coordinate closed subset audit.

No candidate, seam weld, repair, visibility selection or category-wide process.
Closedness is a conservative filter, never universal FrontSide eligibility.
"""
import argparse,hashlib,json,sys
from collections import Counter,defaultdict
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

parser=argparse.ArgumentParser();parser.add_argument('--mesh',default='algodon_05_maduro');parser.add_argument('--driver',type=int);args=parser.parse_args()
folder=ROOT/'docs/qa/frontside-model-pilot'
source=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/source['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==source['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')==args.mesh);prim=doc['meshes'][node['mesh']]['primitives'][0]
p,n=map(lambda k:accessor(doc,binary,prim['attributes'][k]),['POSITION','NORMAL']);ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels']);assert len(labels)==len(ix)
source_total=len(ix);source_face_ids=np.arange(len(ix))
if args.driver is not None:
    source_face_ids=np.flatnonzero(labels==args.driver)
    assert len(source_face_ids)>0,'Source driver unavailable'
    ix=ix[source_face_ids];labels=labels[source_face_ids]
ids={};canonical=[]
for v in p:
    key=tuple(map(float,v));ids.setdefault(key,len(ids));canonical.append(ids[key])
tris=np.asarray(canonical)[ix];points=p[ix].astype(float);cross=np.cross(points[:,1]-points[:,0],points[:,2]-points[:,0]);valid=np.linalg.norm(cross,axis=1)>0
edges=defaultdict(list);parent=list(range(len(ix)))
def find(v):
    while parent[v]!=v:parent[v]=parent[parent[v]];v=parent[v]
    return v
for face in np.flatnonzero(valid):
    for a,b in zip(tris[face],np.roll(tris[face],-1)):edges[tuple(sorted((int(a),int(b))))].append((int(face),1 if a<b else -1))
for owners in edges.values():
    for face,_ in owners[1:]:parent[find(face)]=find(owners[0][0])
components=defaultdict(list)
for face in np.flatnonzero(valid):components[find(int(face))].append(int(face))
material=doc['materials'][prim['material']];rows=[]
# A same-directed edge alone is not evidence that one whole face should flip.
# Inspect the original neighboring surfaces and driver ownership before proposing
# a repair; non-manifold edges do not define a unique neighboring face at all.
conflict_rows=[]
for edge,owners in edges.items():
    if len(owners)!=2 or owners[0][1]!=owners[1][1]:continue
    a,b=(o[0] for o in owners)
    ga,gb=cross[a],cross[b]
    cosine=float(np.dot(ga,gb)/(np.linalg.norm(ga)*np.linalg.norm(gb)))
    conflict_rows.append(dict(sourceFaceIds=[int(source_face_ids[a]),int(source_face_ids[b])],
        faceLabels=[int(labels[a]),int(labels[b])],sameDriver=bool(labels[a]==labels[b]),
        geometricNormalCosine=cosine,angleDegrees=float(np.degrees(np.arccos(np.clip(cosine,-1,1))))))
regional=[]
for label in sorted(set(map(int,labels))):
    faces=np.flatnonzero(labels==label);counts=Counter();directions=Counter()
    for face in faces:
        for a,b in zip(tris[face],np.roll(tris[face],-1)):
            key=tuple(sorted((int(a),int(b))));counts[key]+=1;directions[key]+=1 if a<b else -1
    regional.append(dict(driver=label,triangles=len(faces),boundaryEdges=sum(v==1 for v in counts.values()),
        nonManifoldEdges=sum(v>2 for v in counts.values()),
        windingConflictEdges=sum(v==2 and directions[e]!=0 for e,v in counts.items())))
coincident=defaultdict(list)
for face in np.flatnonzero(valid):coincident[tuple(sorted(map(int,tris[face])))].append(int(face))
coincident_rows=[]
for faces in coincident.values():
    if len(faces)<2:continue
    a=faces[0];ga=cross[a]
    coincident_rows.append(dict(sourceFaceIds=source_face_ids[faces].tolist(),
        faceLabels=list(map(int,labels[faces])),triangles=len(faces),
        geometricNormalCosines=[float(np.dot(ga,cross[b])/(np.linalg.norm(ga)*np.linalg.norm(cross[b]))) for b in faces[1:]]))
for faces in components.values():
    counts=Counter();directions=Counter()
    for face in faces:
        for a,b in zip(tris[face],np.roll(tris[face],-1)):
            key=tuple(sorted((int(a),int(b))));counts[key]+=1;directions[key]+=1 if a<b else -1
    boundary=sum(v==1 for v in counts.values());nonmanifold=sum(v>2 for v in counts.values());conflicts=sum(v==2 and directions[e]!=0 for e,v in counts.items())
    closed=not boundary and not nonmanifold and not conflicts
    q=points[faces];shift=q-q.reshape(-1,3).mean(axis=0)
    volume=float(np.einsum('ij,ij->i',shift[:,0],np.cross(shift[:,1],shift[:,2])).sum()/6) if closed else None
    ns=n[ix[faces]].astype(float);lengths=np.linalg.norm(ns,axis=2);dots=np.einsum('ij,ikj->ik',cross[faces],ns)
    finite=bool(np.isfinite(ns).all());undefined=int(np.sum(lengths<1e-10));nonunit=int(np.sum(np.abs(lengths-1)>1e-4));opposed=int(np.sum(dots<0));orthogonal=int(np.sum(dots==0))
    eligible=closed and volume>0 and finite and not undefined and not nonunit and not opposed and not orthogonal and material.get('alphaMode','OPAQUE')=='OPAQUE'
    rows.append(dict(sourceFaceIds=source_face_ids[faces].tolist(),triangles=len(faces),faceLabels=dict(Counter(str(labels[f]) for f in faces)),boundaryEdges=boundary,nonManifoldEdges=nonmanifold,windingConflictEdges=conflicts,closedConsistent=closed,signedVolume=volume,finiteNormals=finite,undefinedCornerNormals=undefined,nonunitCornerNormals=nonunit,normalOpposedCorners=opposed,normalOrthogonalCorners=orthogonal,strictGeometricFilterEligible=eligible,bounds=[q.reshape(-1,3).min(axis=0).tolist(),q.reshape(-1,3).max(axis=0).tolist()]))
report=dict(status='REPRESENTATIVE_CROP_EXACT_CLOSED_FILTER_NOT_APPROVED',sourceSha256=source['sourceSha256'],mesh=args.mesh,sourceTriangles=len(ix),degenerateTriangles=int(np.sum(~valid)),sourceDoubleSided=material.get('doubleSided',False),materialAlphaMode=material.get('alphaMode','OPAQUE'),eligibleTriangles=sum(r['triangles'] for r in rows if r['strictGeometricFilterEligible']),components=sorted(rows,key=lambda r:-r['triangles']),limitations=['Only one representative model; original PN/UV/topology, metadata, materials and bridges unchanged.', 'Exact numeric float32 coordinates join diagnosis only, signed zeros geometrically equal; no epsilon/quantized seam weld.', 'Strict positive-volume/normal filter is not universal FrontSide approval; failed filters can have viable other approaches.', 'Every selected full component would retain original attributes/face IDs, with no reversed faces or triangle inflation.', 'Growth/wind, mixed-driver boundaries, complete bridge deformation, actual shaders/maps/depth/shadows and independent multiview remain separate gates.', 'Additional groups/draws and net GPU cost must be measured; no rawFront ceiling inherited.'])
report['driver']=args.driver;report['wholeSourceMeshTriangles']=source_total
report['sourceWindingInterfaces']=conflict_rows;report['driverTopology']=regional
report['exactCoincidentTriangleGroups']=coincident_rows
report['limitations'].append('Same-directed two-owner edges are only interface witnesses: original normals agree with their own faces, and mixed-driver/non-manifold junctions need semantic inspection before any flip or cap. Driver boundaries may be attachment cuts or genuinely bilateral surfaces.')
if args.driver is not None:report['limitations'].append('Driver regional subset can have an intentionally open attachment; not a physical disconnected component or repair/flip recommendation.')
name=args.mesh.replace('_','-')+(f'-driver{args.driver}' if args.driver is not None else '')+'-exact-closed-filter.json';(folder/name).write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['status','mesh','sourceTriangles','degenerateTriangles','eligibleTriangles']}));print(json.dumps([dict(triangles=r['triangles'],labels=r['faceLabels'],boundary=r['boundaryEdges'],nonmanifold=r['nonManifoldEdges'],conflicts=r['windingConflictEdges'],volume=r['signedVolume'],eligible=r['strictGeometricFilterEligible']) for r in rows if r['closedConsistent']]))
