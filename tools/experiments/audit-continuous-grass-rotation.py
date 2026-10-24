"""CPU reference audit of the QA shader deformation, not a GPU conformance test."""
import json,math
from pathlib import Path
import numpy as np
root=Path(__file__).resolve().parents[2]
data=json.loads((root/'public/assets/visual-lab/continuous-grass/modules.json').read_text())
wind=np.array([1.,.38]);wind/=np.linalg.norm(wind)
max_error=0.;max_old_ratio=1.;min_y=1.;cases=0;max_edge_ratio=1.
for name,d in data.items():
 p=np.array(d['position']).reshape(-1,3);flat=np.array(d['flatPosition']).reshape(-1,3);roots=np.array(d['bladeRoot']).reshape(-1,3);uv=np.array(d['uv']).reshape(-1,2)
 edges=set()
 for a,b,c in np.array(d['index']).reshape(-1,3):
  edges.update([tuple(sorted((a,b))),tuple(sorted((b,c))),tuple(sorted((c,a)))])
 for yaw in np.linspace(0,2*math.pi,12,endpoint=False):
  turn=np.array([[math.cos(yaw),math.sin(yaw)],[-math.sin(yaw),math.cos(yaw)]])
  for scale in [.8,1.,1.2]:
   for lod in [0.,.5,1.]:
    for growth in [.1,.5,1.]:
     off=((flat*(1-lod)+p*lod)-roots)*growth;off[:,[0,2]]=off[:,[0,2]]@turn.T;off[:,1]*=scale
     along=off[:,[0,2]]@wind
     for wave in [-1.,-.5,0.,.5,1.]:
      old=off.copy();old[:,[0,2]]+=wind*(4*wave*(p[:,1]*scale)**2*growth)[:,None]
      angle=1.44*wave*uv[:,0]
      upper=np.arctan2(np.maximum(off[:,1],.00001),np.maximum(along,.00001))*.92
      lower=np.arctan2(np.maximum(off[:,1],.00001),np.maximum(-along,.00001))*.92
      angle=np.clip(angle,-lower,upper);c=np.cos(angle);s=np.sin(angle)
      new=off.copy();new[:,[0,2]]+=((along*(c-1)+off[:,1]*s)[:,None])*wind;new[:,1]=off[:,1]*c-along*s
      lengths=np.linalg.norm(off,axis=1);active=lengths>1e-9
      max_error=max(max_error,float(np.max(abs(np.linalg.norm(new,axis=1)-lengths))))
      max_old_ratio=max(max_old_ratio,float(np.max(np.linalg.norm(old[active],axis=1)/lengths[active])))
      min_y=min(min_y,float(new[:,1].min()))
      # Roots are reintroduced for topology lengths: vertex-specific rotations are not rigid per leaf.
      rotated_roots=roots.copy();rotated_roots[:,[0,2]]=roots[:,[0,2]]@turn.T
      for a,b in edges:
       initial=np.linalg.norm((off+rotated_roots)[a]-(off+rotated_roots)[b]);final=np.linalg.norm((new+rotated_roots)[a]-(new+rotated_roots)[b])
       if initial>1e-9:max_edge_ratio=max(max_edge_ratio,float(final/initial))
      cases+=len(p)
result=dict(vertexCases=cases,maxRootRadiusAbsoluteError=max_error,maxOriginal8xRootRadiusRatio=max_old_ratio,minHeightAboveLocalTangent=min_y,maxRotatedEdgeLengthRatio=max_edge_ratio,note='Double precision CPU reference over both modules, yaw/height/LOD/growth/wave samples. Preserves root radius, NOT each edge length or exact arc length. Not GPU conformance.')
assert max_error<1e-12 and min_y>=-1e-12
out=root/'docs/qa/global-visual-lab/continuous-grass-rotation/deformation-audit.json';out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(result))
