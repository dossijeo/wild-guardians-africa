from pathlib import Path
from PIL import Image
import json,numpy as np
p=Path('docs/qa/global-visual-lab/canyon-microshadow')
t=json.loads(Path('public/content/ground-materials.json').read_text())['canyons']
h=np.asarray(Image.open('public'+t['arh']).convert('RGB'),dtype=float)[::-1,:,2]/255*.1
step=1/(.08*h.shape[1]);gx=(np.roll(h,-1,1)-np.roll(h,1,1))/(2*step);gz=(np.roll(h,-1,0)-np.roll(h,1,0))/(2*step)
light=np.array([-.82,.31]);horizontal=np.linalg.norm(light);direction=np.array([[.8,.6],[-.6,.8]])@(light/horizontal)
y,x=np.indices(h.shape);blocking=np.zeros_like(h)
for distance in [.05,.12,.25]:
 u=x+direction[0]*distance*.08*h.shape[1];v=y+direction[1]*distance*.08*h.shape[0]
 ix=np.floor(u).astype(int);iy=np.floor(v).astype(int);fx=u-ix;fy=v-iy
 at=lambda dx,dy:h[(iy+dy)%h.shape[0],(ix+dx)%h.shape[1]]
 other=(at(0,0)*(1-fx)+at(1,0)*fx)*(1-fy)+(at(0,1)*(1-fx)+at(1,1)*fx)*fy
 clearance=other-h-distance*.52/horizontal
 z=np.clip((clearance-.003)/.015,0,1);blocking=np.maximum(blocking,z*z*(3-2*z))
r=dict(heightMetersMin=float(h.min()),heightMetersMax=float(h.max()),texelWorldMeters=step,sunRiseOverRun=float(.52/horizontal),gradientMagnitudePercentiles=dict(zip(['50','90','99','100'],map(float,np.percentile(np.hypot(gx,gz),[50,90,99,100])))),threeTapBlockingFraction=float(np.mean(blocking>0)),meanBlocking=float(blocking.mean()),note='Offline full-resolution bilinear periodic height, flipped Y as Three texture upload; ignores mipmaps, footprint fade, slope, POM displacement, actual scene visibility. Diagnostic only, not rendered performance.')
(p/'height-analysis.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8',newline='\n');print(r)
