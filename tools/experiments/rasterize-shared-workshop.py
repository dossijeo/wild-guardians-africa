"""Transfer existing colours into the shared atlas, with island padding."""
from pathlib import Path
import numpy as np,cv2,json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/qa/global-visual-lab/workshop-shared';data=np.load(OUT/'atlas-transfer.npz');report=json.loads((OUT/'pack-audit.json').read_text())
images=[cv2.imread(str(ROOT/'public'/report['sourceColor'].lstrip('/')),cv2.IMREAD_COLOR),cv2.imread(str(OUT/'mapu-0-color-accessories.png'),cv2.IMREAD_COLOR)]
output=np.zeros((2048,2048,3),np.uint8);filled=np.zeros((2048,2048),np.uint8)
for uv,old,k in zip(data['targetuv'],data['sourceuv'],data['sourcekind']):
    uv=uv*2047;lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047)
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));p=uv[1]-uv[0];q=uv[2]-uv[0];det=p[0]*q[1]-p[1]*q[0]
    if abs(det)<1e-8:continue
    dx=xx-uv[0,0];dy=yy-uv[0,1];b=(dx*q[1]-dy*q[0])/det;c=(p[0]*dy-p[1]*dx)/det;inside=(b>=-.001)&(c>=-.001)&(b+c<=1.001)
    source=(old[0]+b[...,None]*(old[1]-old[0])+c[...,None]*(old[2]-old[0]))*2047
    color=cv2.remap(images[k],source[:,:,0].astype('float32'),source[:,:,1].astype('float32'),cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    output[yy[inside],xx[inside]]=color[inside];filled[yy[inside],xx[inside]]=1
for _ in range(8):
    weight=cv2.filter2D(filled.astype('float32'),-1,np.ones((3,3),np.float32));sumcolor=cv2.filter2D(output.astype('float32')*filled[:,:,None],-1,np.ones((3,3),np.float32));fresh=(filled==0)&(weight>0)
    output[fresh]=np.clip(sumcolor[fresh]/weight[fresh,None],0,255).astype('uint8');filled[fresh]=1
cv2.imwrite(str(OUT/'mapungubwe-shared-art.png'),output)
print('Saved shared 2048 atlas; occupied+padding',float(filled.mean()))
