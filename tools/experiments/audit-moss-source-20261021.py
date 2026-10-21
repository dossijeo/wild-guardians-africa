from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
root=Path('public');material=json.loads((root/'content/ground-materials.json').read_text())['mangrove']
rows=[]
for role in ['base','normal','arh']:
 path=root/material[role].lstrip('/');im=np.asarray(Image.open(path).convert('RGB'),dtype=float)/255
 for channel in range(3):
  a=im[:,:,channel];h,w=a.shape
  power=abs(np.fft.fftshift(np.fft.fft2(a-a.mean())))**2
  y,x=np.mgrid[-h//2:h-h//2,-w//2:w-w//2];radius=np.hypot(x,y);angle=np.mod(np.arctan2(y,x),np.pi)
  band=(radius>=4)&(radius<=64)
  sectors=[float(power[band&(angle>=k*np.pi/12)&(angle<(k+1)*np.pi/12)].sum()) for k in range(12)]
  rows.append(dict(role=role,channel=channel,size=[w,h],std=float(a.std()),spectralSectors=sectors,maxSectorShare=max(sectors)/sum(sectors),dominantWavevectorDegrees=(int(np.argmax(sectors))+.5)*15))
out=Path('docs/qa/global-visual-lab/moss-source-audit-20261021');out.mkdir(parents=True,exist_ok=True)
report=dict(material=material,tileWorldUnits=1/material['scale'],secondaryTileWorldUnits=1/(material['scale']*.57),sources=[dict(role=r,path=material[r],sha256=hashlib.sha256((root/material[r].lstrip('/')).read_bytes()).hexdigest()) for r in ['base','normal','arh']],analysis=rows,note='FFT energy for 4-64 cycles per tile in 12 half-plane sectors. Wavevector orientation is perpendicular to bands. Directionality is not a quality score or proof of periodic repetition.')
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
for r in rows:print(r['role'],r['channel'],round(r['maxSectorShare'],3),r['dominantWavevectorDegrees'])
