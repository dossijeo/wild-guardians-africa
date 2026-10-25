from pathlib import Path
import numpy as np,cv2
r=Path(__file__).resolve().parents[2];a=np.fromfile(r/'public/assets/visual-lab/mapu-0-repacked.bin',dtype='<f4',count=10147*8).reshape(-1,8);t=np.fromfile(r/'public/assets/visual-lab/mapu-0-repacked.bin',dtype='<u4',offset=10147*32).reshape(-1,3)
im=cv2.imread(str(r/'public/assets/visual-lab/mapu-0-color-repacked.webp'))[:,:,::-1]
# Rectified colour inspection, sampled from the original UVs, with a depth buffer.
w,h=1200,1000
out=np.ones((h,w,3),np.uint8)*240;depth=np.ones((h,w))*-999
for ids in t:
 world=a[ids,:3];cc=world.mean(0)
 if not (-.34<cc[2]<-.25 and -.87<cc[0]<-.57):continue
 pp=np.c_[(world[:,0]+.87)/.30*(w-1),(.085-world[:,1])/.255*(h-1)]
 lo=np.maximum(np.floor(pp.min(0)).astype(int),0);hi=np.minimum(np.ceil(pp.max(0)).astype(int),[w-1,h-1])
 if np.any(hi<lo):continue
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));det=np.cross(pp[1]-pp[0],pp[2]-pp[0])
 if abs(det)<1e-7:continue
 dx=xx-pp[0,0];dy=yy-pp[0,1];b=(dx*(pp[2,1]-pp[0,1])-dy*(pp[2,0]-pp[0,0]))/det;c=((pp[1,0]-pp[0,0])*dy-(pp[1,1]-pp[0,1])*dx)/det
 z=-(world[0,2]+b*(world[1,2]-world[0,2])+c*(world[2,2]-world[0,2]));inside=(b>=0)&(c>=0)&(b+c<=1)&(z>depth[yy,xx]);uv=a[ids,6:8];q=uv[0]+b[:,:,None]*(uv[1]-uv[0])+c[:,:,None]*(uv[2]-uv[0]);co=cv2.remap(im,(q[:,:,0]*2047).astype('float32'),(q[:,:,1]*2047).astype('float32'),cv2.INTER_LINEAR)
 out[yy[inside],xx[inside]]=co[inside];depth[yy[inside],xx[inside]]=z[inside]
cv2.imwrite(str(r/'docs/qa/global-visual-lab/workshop-details/rear-source-rectified.png'),out[:,:,::-1])
