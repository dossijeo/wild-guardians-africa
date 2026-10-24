"""Plot measured mesh facets against source paint; no asset modification."""
from pathlib import Path
import numpy as np
import cv2
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
ROOT=Path(__file__).resolve().parents[2]
a=np.fromfile(ROOT/'public/assets/visual-lab/mapu-0-repacked.bin',dtype='<f4',count=10147*8).reshape(-1,8)
t=np.fromfile(ROOT/'public/assets/visual-lab/mapu-0-repacked.bin',dtype='<u4',offset=10147*32).reshape(-1,3)
p=a[t,:3];c=p.mean(1);r=np.hypot(p[:,:,0]+.716,p[:,:,1]+.063)
m=(c[:,2]>-.006)&(c[:,2]<.061)&(c[:,1]>-.073)&(r.mean(1)>.105)&(c[:,0]>-.85)&(c[:,0]<-.585)
ids=np.where(m)[0];p=p[m];angle=np.arctan2(p[:,:,0]+.716,p[:,:,1]+.063)
polys=np.stack((angle,p[:,:,2]),-1)
im=cv2.imread(str(ROOT/'public/assets/visual-lab/mapu-0-color-repacked.webp'))[:,:,::-1]
uv=a[t[m],6:8].mean(1);colors=im[np.clip((uv[:,1]*2047).astype(int),0,2047),np.clip((uv[:,0]*2047).astype(int),0,2047)]/255
fig,axs=plt.subplots(3,1,figsize=(18,12),sharex=True,sharey=True)
for ax,title in zip(axs,['Original colour per facet, existing mesh edges','Radius from barrel axis (relief)','Face indices near crown']):
 ax.set_title(title);ax.set_xlim(-1.5,1.5);ax.set_ylim(-.006,.061);ax.set_ylabel('Local Z (front band)');ax.grid(alpha=.2)
axs[0].add_collection(PolyCollection(polys,facecolors=colors,edgecolors='k',linewidths=.35))
coll=PolyCollection(polys,array=r[m].mean(1),cmap='viridis',edgecolors='k',linewidths=.3);axs[1].add_collection(coll);fig.colorbar(coll,ax=axs[1])
axs[2].add_collection(PolyCollection(polys,facecolors=colors,edgecolors='k',linewidths=.4))
for idx,poly in zip(ids,polys):
 center=poly.mean(0)
 if abs(center[0])<.45:axs[2].text(*center,str(idx),fontsize=5)
axs[2].set_xlabel('Angle around arch (radians)')
fig.tight_layout();fig.savefig(ROOT/'docs/qa/global-visual-lab/workshop-art/arch-facets.png',dpi=140)
print('Band candidate faces',len(ids))

# Weld UV splits only for diagnostic adjacency; runtime mesh remains untouched.
_,weld=np.unique(np.round(a[:,:3],6),axis=0,return_inverse=True)
adj={}
norm=np.cross(a[t[:,1],:3]-a[t[:,0],:3],a[t[:,2],:3]-a[t[:,0],:3]);norm/=np.maximum(np.linalg.norm(norm,axis=1)[:,None],1e-12)
for face,verts in enumerate(t):
 for j in range(3):
  va,vb=verts[j],verts[(j+1)%3];key=tuple(sorted((int(weld[va]),int(weld[vb]))))
  adj.setdefault(key,[]).append((face,int(va),int(vb)))
creases=[]
for group in adj.values():
 if len(group)!=2:continue
 f,va,vb=group[0];g=group[1][0];mid=(a[va,:3]+a[vb,:3])/2
 if not(-.02<mid[2]<.05 and mid[1]>-.08 and -.86<mid[0]<-.58):continue
 angle=np.degrees(np.arccos(np.clip(norm[f]@norm[g],-1,1)))
 if angle<12:continue
 ends=a[[va,vb],:3];theta=np.arctan2(ends[:,0]+.716,ends[:,1]+.063)
 creases.append((angle,np.c_[theta,ends[:,2]],f,g,ends))
fig,axs=plt.subplots(3,1,figsize=(18,10),sharex=True,sharey=True)
for ax,limit in zip(axs,[15,30,50]):
 ax.set_title(f'Measured geometric creases > {limit} degrees');ax.set_xlim(-1.7,1.7);ax.set_ylim(-.02,.05)
 for angle,line,f,g,ends in creases:
  if angle>limit:ax.plot(line[:,0],line[:,1],color='black',lw=.8)
 ax.grid(alpha=.2)
fig.tight_layout();fig.savefig(ROOT/'docs/qa/global-visual-lab/workshop-art/arch-creases.png',dpi=140)
import json
(ROOT/'docs/qa/global-visual-lab/workshop-art/arch-creases.json').write_text(json.dumps([{'angle':float(angle),'faces':[f,g],'ends':ends.tolist()} for angle,line,f,g,ends in creases],indent=2))
selected=[]
for angle,line,f,g,ends in creases:
 mid=ends.mean(0);radial=np.array([mid[0]+.716,mid[1]+.063,0]);rad=np.linalg.norm(radial)
 theta=np.arctan2(ends[:,0]+.716,ends[:,1]+.063);axial=ends[:,2]-.085*(ends[:,0]+.716)
 diagonal=.075<abs(theta[1]-theta[0])<.34 and .007<abs(axial[1]-axial[0])<.032
 if angle>18 and diagonal and rad>.098 and -.008<axial.mean()<.026 and min(norm[f]@radial,norm[g]@radial)>.022:
  selected.append({'faces':[f,g],'ends':ends.tolist(),'angle':float(angle),'role':'zigzag'})
 elif angle>15 and .06<abs(theta[1]-theta[0])<.7 and abs(axial[1]-axial[0])<.004 and rad>.098 and min(abs(axial.mean()+.004),abs(axial.mean()-.025))<.002 and max(norm[f]@radial,norm[g]@radial)>.022:
  selected.append({'faces':[f,g],'ends':ends.tolist(),'angle':float(angle),'role':'border'})
(ROOT/'docs/qa/global-visual-lab/workshop-art/arch-paint-edges.json').write_text(json.dumps(selected,indent=2)+'\n')
fig,ax=plt.subplots(figsize=(18,4));ax.set_xlim(-1.7,1.7);ax.set_ylim(-.02,.05)
ax.add_collection(PolyCollection(polys,facecolors=colors,edgecolors='gray',linewidths=.2))
for edge in selected:
 ends=np.array(edge['ends']);theta=np.arctan2(ends[:,0]+.716,ends[:,1]+.063)
 ax.plot(theta,ends[:,2],color='cyan',lw=2)
ax.set_title(f'{len(selected)} selected physical zigzag bevel edges (cyan), original paint behind')
fig.tight_layout();fig.savefig(ROOT/'docs/qa/global-visual-lab/workshop-art/arch-selected-edges.png',dpi=140)
print('Selected paint edges',len(selected))
