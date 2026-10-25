from pathlib import Path
import json,numpy as np,cv2
import matplotlib;matplotlib.use('Agg')
from matplotlib import pyplot as plt
from matplotlib.collections import PolyCollection
root=Path('.');a=np.fromfile(root/'public/assets/visual-lab/mapu-0-repacked.bin',dtype='<f4',count=10147*8).reshape(-1,8);t=np.fromfile(root/'public/assets/visual-lab/mapu-0-repacked.bin',dtype='<u4',offset=10147*32).reshape(-1,3);p=a[t,:3];c=p.mean(1);n=a[t,3:6].mean(1)
im=cv2.imread(str(root/'public/assets/visual-lab/mapu-0-color-repacked.webp'))[:,:,::-1];uv=a[t,6:8].mean(1);col=im[(uv[:,1]*2047).astype(int),(uv[:,0]*2047).astype(int)]/255
fig,ax=plt.subplots(figsize=(10,12));m=(c[:,0]<-.827)&(c[:,1]>-.065)&(n[:,1]>.1);ax.add_collection(PolyCollection(p[m][:,:,[0,2]],facecolors=col[m],edgecolors='k',linewidths=.15));ax.set_xlim(-.96,-.82);ax.set_ylim(-.34,.09);ax.grid(alpha=.3);ax.set_xlabel('X');ax.set_ylabel('Z');fig.savefig(root/'docs/qa/global-visual-lab/workshop-art/awning-source-facets.png',dpi=120)
print('Awning candidates',int(m.sum()),'bounds',p[m].min((0,1)),p[m].max((0,1)))
# Physical edge-connected shells, independent of UV/normal splits.
_,weld=np.unique(np.round(a[:,:3],6),axis=0,return_inverse=True);parent=list(range(len(t)))
def find(i):
 while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
 return i
edges={}
for f,ids in enumerate(weld[t]):
 for i in range(3):
  edge=tuple(sorted((int(ids[i]),int(ids[(i+1)%3]))))
  if edge in edges:parent[find(f)]=find(edges[edge])
  else:edges[edge]=f
components={}
for f in range(len(t)):components.setdefault(find(f),[]).append(f)
result=[]
for faces in components.values():
 pp=p[faces];result.append({'seed':faces[0],'faces':faces,'count':len(faces),'min':pp.min((0,1)).tolist(),'max':pp.max((0,1)).tolist()})
(root/'docs/qa/global-visual-lab/workshop-art/accessory-shells.json').write_text(json.dumps(result,indent=2)+'\n',newline='\n')
for seed in [3938,5842,5435,7017]:
 shell=next(s for s in result if seed in s['faces']);print(seed,{k:v for k,v in shell.items() if k!='faces'})
print('Components',len(result))
