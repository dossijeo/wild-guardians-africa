"""Camera-free boundary reconstruction proposal, not a triangulated asset.

Tests source attribute/posed-field error before deleting any boundary sample.
Every curve correspondence is retained. Continuous/interior proof is pending.
"""
import hashlib,json,sys
from pathlib import Path
from collections import defaultdict
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,d,b=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
node=next(n for n in d['nodes'] if n.get('name')=='maiz_05_maduro');prim=d['meshes'][node['mesh']]['primitives'][0]
assert set(prim['attributes'])=={'POSITION','NORMAL','TEXCOORD_0'}
p,n,u=[accessor(d,b,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']];ix=accessor(d,b,prim['indices']).reshape(-1,3)
labels=np.asarray(json.loads((ROOT/'public/content/crop-bridges.json').read_text())['models'][4]['faceLabels'])
assert len(labels)==len(ix)
position_labels=defaultdict(set)
for face,vertices in enumerate(ix):
    for vertex in vertices:position_labels[tuple(map(float,p[vertex]))].add(int(labels[face]))
meta=node['extras'];ground=float(np.float32(.1));height=float(meta['height'])
source= np.concatenate([p,n,u],axis=1).astype(np.float32)
sy=np.asarray([.045,.25,.5,1,2,4,8]);sr=np.asarray([.25,.5,1,2,2.8]);opened=np.asarray([.7,.85,1]);breeze=np.asarray([-.026,0,.026])
poses=np.asarray(np.meshgrid(sy,sr,opened,breeze,indexing='ij')).reshape(4,-1).T
limits=dict(surfaceMeters=5e-5,uvComponent=1e-6,normalRadians=1e-4,uvGradientRelative=1e-5)
def smooth(x):x=np.clip(x,0,1);return x*x*(3-2*x)
def posed(points,normals):
    mask=smooth((points[:,1]-ground)/.12);above=np.maximum(0,points[:,1]-ground)
    S=1+(poses[:,0,None]-1)*mask;R=1+(poses[:,1,None]-1)*mask
    out=np.broadcast_to(points,(len(poses),len(points),3)).copy()
    out[:,:,1]=points[None,:,1]+above*(S-1);out[:,:,[0,2]]*=R[:,:,None]
    leaf=mask*smooth((np.linalg.norm(points[:,[0,2]],axis=1)-.035)/(.22-.035));fold=1-poses[:,2,None]
    out[:,:,[0,2]]*=1-leaf[None,:,None]*fold[:,:,None]*.16
    out[:,:,1]+=leaf[None,:]*fold*(.10+above*.12)
    h=np.clip(above/max(.15,height-ground),0,1);wind=poses[:,3,None]*h[None,:]**1.7*mask
    out[:,:,0]+=wind;out[:,:,2]+=wind*.47
    scaled=normals[None,:,:]/np.stack([R,S,R],axis=2);length=np.linalg.norm(scaled,axis=2,keepdims=True)
    if np.any(length==0) or not np.isfinite(scaled).all():return None,None
    return out,scaled/length
def deletion_error(a,b,c):
    points=p[[a,b,c]].astype(float);normals=n[[a,b,c]].astype(float);uv=u[[a,b,c]].astype(float)
    P,N=posed(points,normals)
    if P is None:return None
    e=P[:,2]-P[:,0];length2=np.einsum('ij,ij->i',e,e)
    if np.any(length2==0):return None
    t=np.clip(np.einsum('ij,ij->i',P[:,1]-P[:,0],e)/length2,0,1)
    Q=P[:,0]+t[:,None]*e;surface=np.linalg.norm(Q-P[:,1],axis=1)
    U=uv[0]+t[:,None]*(uv[2]-uv[0]);uv_error=np.max(np.abs(U-uv[1]),axis=1)
    normal=N[:,0]+t[:,None]*(N[:,2]-N[:,0]);normal_length=np.linalg.norm(normal,axis=1,keepdims=True)
    if np.any(normal_length==0) or not np.isfinite(normal_length).all():return None
    normal/=normal_length
    angle=np.arccos(np.clip(np.einsum('ij,ij->i',normal,N[:,1]),-1,1))
    new_gradient=(uv[2]-uv[0])[None,:,None]*e[:,None,:]/length2[:,None,None]
    gradients=[]
    for left,right in [(0,1),(1,2)]:
        old_e=P[:,right]-P[:,left];old_l2=np.einsum('ij,ij->i',old_e,old_e)
        if np.any(old_l2==0):return None
        old_gradient=(uv[right]-uv[left])[None,:,None]*old_e[:,None,:]/old_l2[:,None,None]
        delta=np.linalg.norm(new_gradient-old_gradient,axis=(1,2));den=np.linalg.norm(old_gradient,axis=(1,2))
        if np.any((den==0)&(delta!=0)):return None
        gradients.append(np.divide(delta,den,out=np.zeros_like(delta),where=den!=0))
    result=dict(surfaceMeters=float(surface.max()),uvComponent=float(uv_error.max()),normalRadians=float(angle.max()),uvGradientRelative=float(np.max(gradients)))
    return result if all(result[k]<=limits[k] for k in limits) else None
rows=[];total_removed=0
for label in sorted(set(map(int,labels[labels>=2]))):
    faces=np.flatnonzero(labels==label);point_ids={};representatives=[];corner_ids={};fields=defaultdict(set)
    for vertex in np.unique(ix[faces]):
        key=source[vertex,[0,1,2,6,7]].tobytes()
        if key not in point_ids:point_ids[key]=len(point_ids);representatives.append(int(vertex))
        point=point_ids[key];corner_ids[int(vertex)]=point;fields[point].add(n[vertex].tobytes())
    position_charts=defaultdict(set)
    for point,vertex in enumerate(representatives):position_charts[tuple(map(float,p[vertex]))].add(point)
    locked={point for point,vertex in enumerate(representatives) if len(position_charts[tuple(map(float,p[vertex]))])>1 or position_labels[tuple(map(float,p[vertex]))]!={label}}
    edges=defaultdict(list)
    for face in faces:
        verts=[corner_ids[int(v)] for v in ix[face]]
        for a,c in zip(verts,verts[1:]+verts[:1]):edges[tuple(sorted((a,c)))].append((int(face),a,c))
    boundary=[o[0][1:] for o in edges.values() if len(o)==1];adj=defaultdict(set)
    for a,c in boundary:adj[a].add(c);adj[c].add(a)
    unsupported=any(len(o)>2 for o in edges.values());loops=[];seen=set()
    for start in sorted(adj):
        if start in seen:continue
        component=set();stack=[start]
        while stack:
            v=stack.pop()
            if v not in component:component.add(v);stack.extend(adj[v]-component)
        seen|=component
        if unsupported or any(len(adj[v])!=2 or len(fields[v])!=1 for v in component):continue
        ordered=[start];previous=None;current=start
        while True:
            candidates=sorted(adj[current]-({previous} if previous is not None else set()));next_v=candidates[0]
            if next_v==start:break
            if next_v in ordered:raise ValueError('Boundary traversal ambiguity')
            ordered.append(next_v);previous,current=current,next_v
        original=ordered.copy();removed=[]
        # A single independent pass avoids claiming cumulative interval/error
        # control from repeated local deletions. Neighbouring accepted removals
        # are blocked; full-patch reconstruction still needs another audit.
        blocked=set(locked)
        for v in original:
            if len(ordered)<=3 or v in blocked:continue
            j=ordered.index(v);a=ordered[j-1];c=ordered[(j+1)%len(ordered)]
            error=deletion_error(representatives[a],representatives[v],representatives[c])
            if error:
                removed.append(dict(sourceVertex=representatives[v],between=[representatives[a],representatives[c]],sampledError=error));ordered.remove(v);blocked.update([a,c])
        total_removed+=len(removed)
        loops.append(dict(sourceVertices=[representatives[v] for v in original],proposedVertices=[representatives[v] for v in ordered],removed=removed))
    rows.append(dict(label=label,sourceFaces=len(faces),boundaryEdges=len(boundary),nonManifold=unsupported,loops=loops))
stem=int(np.sum(labels==1));soil=int(np.sum(labels==0));leaf=int(np.sum(labels>=2));maximum_leaf=(int(len(ix)*1.1)-soil-2*stem)//2
report=dict(status='BOUNDARY_RECONSTRUCTION_PROPOSAL_NOT_ASSET',mesh=node['name'],blender=bpy.app.version_string,sourceSha256=receipt['sourceSha256'],limits=limits,
    posedSamples=len(poses),sampleAxes=dict(sy=sy.tolist(),sr=sr.tolist(),open=opened.tolist(),breeze=breeze.tolist()),sourceTriangles=len(ix),sourceStemTriangles=stem,sourceSoilTriangles=soil,sourceLeafTriangles=leaf,
    maximalLeafFacesAfterBilateralStemAndLeafBudget=maximum_leaf,proposedRemovedBoundarySamples=total_removed,leaves=rows,
    limitations=['No camera, pixel mask, original edit, triangulated candidate, shader/material mutation or runtime export.',
    'Boundary polylines only; source triangles/UV/normal fields in interiors are not reconstructed or certified.',
    f'{len(poses)} independent shader-envelope samples, not a continuous interval proof; source scale envelope coverage must also be checked.',
    'A local removal maps one original point into one new edge; derivative comparisons are curve diagnostics, not full surface tangent-frame validation.',
    'Semantic interfaces/UV seams and ambiguous normal correspondences are not merged. Failure leaves the source loop unchanged.',
    'Counts do not establish savings, visual equivalence, topology of a new mesh, GPU resources or net benefit.'])
(folder/'crop-maize-boundary-resampling.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps({k:report[k] for k in ['status','posedSamples','sourceLeafTriangles','maximalLeafFacesAfterBilateralStemAndLeafBudget','proposedRemovedBoundarySamples']}))
