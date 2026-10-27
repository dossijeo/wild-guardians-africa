from pathlib import Path
import json,numpy as np
out=Path("docs/qa/global-visual-lab/mangrove-leaf-fill-20261021")
results=[]
for name in ["mangrove-leaf-cover-20261021","mangrove-leaf-fill-20261021"]:
 m=json.loads(Path(f"public/assets/visual-lab/{name}/modules.json").read_text())["near"]
 v=np.array(m["position"]).reshape(-1,3)[:,[0,2]];idx=np.array(m["index"]).reshape(-1,3)
 for spacing in [.5,.4]:
  x,z=np.meshgrid((np.arange(192)+.5)/192*spacing,(np.arange(192)+.5)/192*spacing);pts=np.stack([x.ravel(),z.ravel()],axis=1);covered=np.zeros(len(pts),bool)
  for dx in range(-2,3):
   for dz in range(-2,3):
    for face in idx:
     t=v[face]+np.array([dx,dz])*spacing;c=[]
     for i in range(3):
      e=t[(i+1)%3]-t[i];d=pts-t[i];c.append(e[0]*d[:,1]-e[1]*d[:,0])
     covered|=np.all(np.array(c)>=0,axis=0)|np.all(np.array(c)<=0,axis=0)
  results.append(dict(module=name,spacing=spacing,coverage=float(covered.mean()),trianglesPerArea=len(idx)/spacing**2))
(out/"projection.json").write_text(json.dumps({"note":"Periodic identical orientation, flat ground, no masks; not real game coverage.","results":results},indent=2)+"\n",encoding="utf-8",newline="\n")
print(results)
