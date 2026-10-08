"""Exact-position edge components and orientation, read-only source crop audit.

No epsilon/quantized welding. Signed volume reported only as closed-oriented
component evidence; boundaries and zero-area faces remain explicit. No approval.
"""
import hashlib,json,sys
sys.dont_write_bytecode=True
from collections import defaultdict,Counter
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
r=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,d,b=read_glb(ROOT/'public'/r['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==r['sourceSha256']
meta=json.loads((ROOT/'public/content/crop-bridges.json').read_text());rows=[]
for node in d['nodes']:
 if 'mesh' not in node or not node.get('name','').startswith('maiz_'):continue
 pr=d['meshes'][node['mesh']]['primitives'][0]
 p=accessor(d,b,pr['attributes']['POSITION']).astype(np.float64);n=accessor(d,b,pr['attributes']['NORMAL']).astype(np.float64);ix=accessor(d,b,pr['indices']).reshape(-1,3)
 labels=meta['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'];assert len(labels)==len(ix)
 points={};canonical=[]
 for pt in p:
  key=tuple(pt);canonical.append(points.setdefault(key,len(points)))
 triangles=np.array(canonical)[ix];parent=list(range(len(ix)));edges=defaultdict(list);deg=[]
 def find(a):
  while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
  return a
 for f,t in enumerate(triangles):
  if len(set(t))<3:deg.append(f);continue
  if np.linalg.norm(np.cross(p[ix[f,1]]-p[ix[f,0]],p[ix[f,2]]-p[ix[f,0]]))==0:deg.append(f)
  for a,c in zip(t,np.roll(t,-1)):
   key=tuple(sorted((int(a),int(c))));edges[key].append((f,1 if a<c else -1))
 for entries in edges.values():
  for f,_ in entries[1:]:parent[find(f)]=find(entries[0][0])
 groups=defaultdict(list)
 for f in range(len(ix)):groups[find(f)].append(f)
 components=[]
 for faces in groups.values():
  fs=set(faces);own=[v for v in edges.values() if v[0][0] in fs];boundary=sum(len(v)==1 for v in own);nonman=sum(len(v)>2 for v in own);conflict=sum(len(v)==2 and v[0][1]==v[1][1] for v in own)
  pts=p[ix[faces]];center=pts.reshape(-1,3).mean(0);shift=pts-center;vol=float(np.einsum('ij,ij->i',shift[:,0],np.cross(shift[:,1],shift[:,2])).sum()/6)
  cr=np.cross(pts[:,1]-pts[:,0],pts[:,2]-pts[:,0]);dots=np.einsum('ij,ij->i',cr,n[ix[faces]].mean(1));normalY=n[ix[faces]][:,:,1].mean(1)
  closed=not boundary and not nonman and not conflict and not fs.intersection(deg)
  components.append(dict(faces=len(faces),faceIds=faces,labels=dict(Counter(str(labels[f]) for f in faces)),exactWeldVertices=len(set(triangles[faces].reshape(-1))),boundaryEdges=boundary,nonManifoldEdges=nonman,windingConflictEdges=conflict,zeroAreaFaces=sorted(fs.intersection(deg)),closedOriented=closed,signedVolume=vol if closed else None,diagnosticVolumeEvenIfOpen=vol,bounds=[pts.reshape(-1,3).min(0).tolist(),pts.reshape(-1,3).max(0).tolist()],normalAgreementPositive=int((dots>0).sum()),normalAgreementNegative=int((dots<0).sum()),meanAuthoredNormalY=float(normalY.mean())))
 soil=np.flatnonzero(np.array(labels)==0);sp=p[ix[soil]];sn=n[ix[soil]].mean(1);sc=np.cross(sp[:,1]-sp[:,0],sp[:,2]-sp[:,0]);se=defaultdict(list)
 for f in soil:
  for a,c in zip(triangles[f],np.roll(triangles[f],-1)):
   if a==c:continue
   se[tuple(sorted((int(a),int(c))))].append(1 if a<c else -1)
 soilReport=dict(faces=len(soil),boundaryEdges=sum(len(v)==1 for v in se.values()),nonManifoldEdges=sum(len(v)>2 for v in se.values()),windingConflictEdges=sum(len(v)==2 and v[0]==v[1] for v in se.values()),downwardAuthoredNormalFaces=int((sn[:,1]<0).sum()),upwardAuthoredNormalFaces=int((sn[:,1]>0).sum()),downwardGeometricNormalFaces=int((sc[:,1]<0).sum()),upwardGeometricNormalFaces=int((sc[:,1]>0).sum()),bounds=[sp.reshape(-1,3).min(0).tolist(),sp.reshape(-1,3).max(0).tolist()],meaning='Regional subset edge statistics, not an isolated physical component or flip recommendation')
 rows.append(dict(mesh=node['name'],faces=len(ix),vertices=len(p),regionalSoilSubset=soilReport,components=sorted(components,key=lambda c:-c['faces'])))
report=dict(status='READ_ONLY_EXACT_POSITION_COMPONENT_ORIENTATION_NOT_APPROVED',sourceSha256=r['sourceSha256'],models=rows,limitations=['Exact float position equality only; no quantization or epsilon weld.', 'Component connectivity uses shared edges, not single-point contact.', 'Signed volume classification only for closed oriented nondegenerate components; volume of open components is diagnostic and cannot prove inward/outward.', 'Runtime growth deformation, shaders, UV maps, shadow and withheld views require separate validation.', 'No face flip, topology edit, candidate selection or bridge remapping.'])
(folder/'maize-exact-component-orientation.json').write_text(json.dumps(report,indent=2)+'\n')
for row in rows:
 print(row['mesh'],[(c['faces'],c['labels'],c['boundaryEdges'],c['nonManifoldEdges'],c['windingConflictEdges'],c['signedVolume'],round(c['meanAuthoredNormalY'],3)) for c in row['components'] if '0' in c['labels'] or '1' in c['labels']])
