from pathlib import Path
import numpy as np,json,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/workshop-surfaces';f=R/'public/assets/visual-lab/mapu-0-finish.bin';n=(f.stat().st_size-7992*12)//32
a=np.fromfile(f,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(f,dtype='<u4',offset=n*32).reshape(-1,3);p=a[t,:3];c=p.mean(1);normal=a[t,3:6].mean(1);x,y,z=c.T;rad=np.hypot(x+.716,y+.063);sel=(z>-.307)&(z<-.252)&(y>-.08)&(rad>.095)&((normal[:,0]*(x+.716)+normal[:,1]*(y+.063))>.018)
sel&=(p[:,:,2].max(1)<-.25)
faces=np.where(sel)[0];_,first,ids=np.unique(np.round(p[sel].reshape(-1,3),6),axis=0,return_index=True,return_inverse=True);verts=p[sel].reshape(-1,3)[first];tt=ids.reshape(-1,3);norm=np.cross(p[sel,1]-p[sel,0],p[sel,2]-p[sel,0]);norm/=np.maximum(np.linalg.norm(norm,axis=1)[:,None],1e-12);adj={}
for i,tri in enumerate(tt):
 for j in range(3):adj.setdefault(tuple(sorted([int(tri[j]),int(tri[(j+1)%3])])),[]).append(i)
records=[];fig,ax=plt.subplots(figsize=(16,4))
for (i,j),ff in adj.items():
 if len(ff)!=2:continue
 angle=float(np.degrees(np.arccos(np.clip(norm[ff[0]]@norm[ff[1]],-1,1))))
 if angle<12:continue
 ends=verts[[i,j]];theta=np.arctan2(ends[:,0]+.716,ends[:,1]+.063);axial=ends[:,2]-.085*(ends[:,0]+.716)+.28
 ax.plot(theta,axial,color='gray',lw=.6);records.append({'ends':ends.tolist(),'angle':angle})
ax.set_title('Rear measured creases > 12 degrees');fig.tight_layout();fig.savefig(O/'rear-creases.png',dpi=120)
(O/'rear-geometry-audit.json').write_text(json.dumps({'faces':faces.tolist(),'creases':records},indent=2)+'\n',newline='\n')
