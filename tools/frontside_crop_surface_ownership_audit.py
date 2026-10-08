"""Read-only diagnosis of coincident source interfaces, no weld/face edits.

Ambiguous owners remain unmatched. This is not FrontSide acceptance.
"""
import argparse,hashlib,json,sys
from collections import defaultdict,Counter
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
parser=argparse.ArgumentParser();parser.add_argument('--mesh',default='sorgo_05_maduro');args=parser.parse_args()
folder=ROOT/'docs/qa/frontside-model-pilot'
s=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/s['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==s['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')==args.mesh);prim=doc['meshes'][node['mesh']]['primitives'][0]
p,n=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL']];ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
b=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'));labels=np.asarray(b['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])
ids={};canonical=[]
for v in p:
    key=tuple(map(float,v));ids.setdefault(key,len(ids));canonical.append(ids[key])
tri=np.asarray(canonical)[ix];q=p[ix].astype(float);cross=np.cross(q[:,1]-q[:,0],q[:,2]-q[:,0]);valid=np.linalg.norm(cross,axis=1)>0
edges=defaultdict(list);parent=list(range(len(ix)));paired=set();stats=Counter();junction=[]
def find(v):
    while parent[v]!=v:parent[v]=parent[parent[v]];v=parent[v]
    return v
for f in np.flatnonzero(valid):
    for c in range(3):
        a,z=int(tri[f,c]),int(tri[f,(c+1)%3]);low=min(a,z);high=max(a,z)
        normals={a:n[ix[f,c]].tobytes(),z:n[ix[f,(c+1)%3]].tobytes()}
        edges[(low,high)].append(dict(face=int(f),direction=1 if a<z else -1,field=(normals[low],normals[high])))
for edge,owners in edges.items():
    candidates=[]
    for i,a in enumerate(owners):
        options=[]
        for j,z in enumerate(owners):
            if i==j or a['direction']==z['direction'] or labels[a['face']]!=labels[z['face']]:continue
            if len(owners)>2 and a['field']!=z['field']:continue
            options.append(j)
        candidates.append(options)
    matches=[]
    for i,choices in enumerate(candidates):
        if len(choices)==1:
            j=choices[0]
            if i<j and candidates[j]==[i]:matches.append((i,j))
    for i,j in matches:
        a,z=owners[i]['face'],owners[j]['face'];parent[find(a)]=find(z);paired.add((edge,min(a,z),max(a,z)))
    stats['sourceEdges']+=1;stats['pairedOwnerPairs']+=len(matches)
    if len(owners)>2:
        stats['junctionEdges']+=1;stats['junctionOwnerPairsResolved']+=len(matches)
        if len(matches)*2!=len(owners):stats['junctionEdgesWithUnresolvedOwners']+=1
        junction.append(dict(positionVertexIds=list(edge),sourceFaces=[o['face'] for o in owners],drivers=[int(labels[o['face']]) for o in owners],matchedSourceFacePairs=[[owners[i]['face'],owners[j]['face']] for i,j in matches],unmatchedOwners=len(owners)-len(matches)*2))
groups=defaultdict(list)
for f in np.flatnonzero(valid):groups[find(int(f))].append(int(f))
rows=[];material=doc['materials'][prim['material']]
for faces in groups.values():
    counts=Counter();directions=Counter();inside=defaultdict(list)
    for f in faces:
        for a,z in zip(tri[f],np.roll(tri[f],-1)):
            key=tuple(sorted((int(a),int(z))));counts[key]+=1;directions[key]+=1 if a<z else -1;inside[key].append(f)
    missing_pairs=sum(len(fs)!=2 or (e,min(fs),max(fs)) not in paired for e,fs in inside.items())
    boundary=sum(v==1 for v in counts.values());nonmanifold=sum(v>2 for v in counts.values());conflicts=sum(v==2 and directions[e]!=0 for e,v in counts.items())
    closed=not (boundary or nonmanifold or conflicts or missing_pairs)
    points=q[faces];shift=points-points.reshape(-1,3).mean(axis=0)
    volume=float(np.einsum('ij,ij->i',shift[:,0],np.cross(shift[:,1],shift[:,2])).sum()/6) if closed else None
    normals=n[ix[faces]].astype(float);lengths=np.linalg.norm(normals,axis=2);dots=np.einsum('ij,ikj->ik',cross[faces],normals)
    healthy=bool(np.isfinite(normals).all() and (np.abs(lengths-1)<=1e-4).all() and (dots>0).all())
    eligible=bool(closed and volume>0 and healthy and material.get('alphaMode','OPAQUE')=='OPAQUE')
    rows.append(dict(sourceFaceIds=faces,triangles=len(faces),driver=int(labels[faces[0]]),boundaryEdges=boundary,nonManifoldEdges=nonmanifold,windingConflicts=conflicts,unpairedComponentEdges=missing_pairs,closedConsistent=closed,signedVolume=volume,originalCornerNormalsHealthy=healthy,strictGeometricFilterEligible=eligible))
report=dict(status='SOURCE_INTERFACE_OWNERSHIP_DIAGNOSTIC_NOT_APPROVED',sourceSha256=s['sourceSha256'],mesh=args.mesh,sourceTriangles=len(ix),eligibleTriangles=sum(r['triangles'] for r in rows if r['strictGeometricFilterEligible']),statistics=dict(stats),components=sorted(rows,key=lambda r:-r['triangles']),junctions=junction,
    limitations=['Exact coordinate IDs are a diagnosis only; original PN/UV/indices/labels/materials/source file remain unchanged.',
    'Only same-driver opposite-directed owners pair; at multi-owner edges both endpoint normal fields must be bit-identical and pairing uniquely mutual. Ambiguity is never guessed.',
    'This stricter ownership hypothesis may miss real hard seams, attachments or multi-driver closed surfaces; zero eligible output is not universal FrontSide infeasibility.',
    'Even eligible source geometry needs continuous deformation, original shader/back-facing recipe, all maps/UV, independent multiview, shadow and net GPU checks. No candidate exported or activated.'])
(folder/(args.mesh.replace('_','-')+'-surface-ownership.json')).write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps({k:report[k] for k in ['status','mesh','sourceTriangles','eligibleTriangles','statistics']}));print(json.dumps([dict(triangles=r['triangles'],driver=r['driver'],volume=r['signedVolume']) for r in rows if r['strictGeometricFilterEligible']]))
