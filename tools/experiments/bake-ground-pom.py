"""QA-only periodic microvisibility bake; no world parcel or geometry changes.
Original maps are repository embedded material assets, not newly fetched sources.
E is an explicitly heuristic color-derived height ablation, not recovered geometry.
"""
import json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates
ROOT=Path(__file__).resolve().parents[2]
out=ROOT/'public/assets/visual-lab/ground-pom';out.mkdir(parents=True,exist_ok=True)
report=ROOT/'docs/qa/global-visual-lab/ground-pom';report.mkdir(parents=True,exist_ok=True)
tile=json.loads((ROOT/'public/content/ground-materials.json').read_text(encoding='utf-8'))['savanna']
paths={k:ROOT/('public'+tile[k]) for k in ['base','normal','arh']}
a={k:np.asarray(Image.open(p).convert('RGB'),dtype=np.float64)/255 for k,p in paths.items()}
height=a['arh'][:,:,2];normal=a['normal']*2-1
N=height.shape[0];pixel=1/tile['scale']/N;amplitude=tile['relief']
sun=np.array(json.loads((report/'probe.json').read_text())['sun'])
uvsun=np.array([.8*sun[0]+.6*sun[2],-.6*sun[0]+.8*sun[2]])
uvsun/=np.linalg.norm(uvsun);sunSlope=sun[1]/np.linalg.norm(sun[[0,2]])
y,x=np.mgrid[:N,:N]
def shifted(h,dx,dy):return map_coordinates(h,[y+dy,x+dx],order=1,mode='grid-wrap',prefilter=False)
def visibility(h):
 z=h*amplitude;ao=np.zeros_like(z)
 for theta in np.arange(16)*np.pi/8:
  horizon=np.zeros_like(z)
  for d in [1,2,3,4,6,8,12,16,24,32]:
   horizon=np.maximum(horizon,(shifted(z,np.cos(theta)*d,np.sin(theta)*d)-z)/(d*pixel))
  ao+=1/(1+horizon*horizon)/16
 horizon=np.zeros_like(z)
 for d in np.arange(1,33):horizon=np.maximum(horizon,(shifted(z,uvsun[0]*d,uvsun[1]*d)-z)/(d*pixel))
 # Small angular penumbra; visibility belongs ONLY to the solar direct term.
 vis=np.clip((sunSlope-horizon+.08)/.16,0,1);vis=vis*vis*(3-2*vis)
 return ao,vis

def save(name,v):Image.fromarray(np.uint8(np.clip(v,0,1)*255+.5)).save(out/name)
results={}
for name,h in [('original',height),('coherent',None),('structured',None)]:
 if h is None:
  lum=a['base']@np.array([.299,.587,.114])
  # Mesoscopic existing color structures plus antialiased fibers, no random noise.
  h=.65*gaussian_filter(lum,.8,mode='wrap')+.35*gaussian_filter(lum,9,mode='wrap')
  lo,hi=np.percentile(h,[1,99]);h=np.clip((h-lo)/(hi-lo),0,1)
 if name=='structured':
  broad=gaussian_filter(lum,12,mode='wrap');lo,hi=np.percentile(broad,[1,99])
  broad=np.clip((broad-lo)/(hi-lo),0,1)
  # 85% of the 75mm slab in broad piles, only 15% (11.25mm) in fine fibers.
  h=.85*broad+.15*h
 ao,vis=visibility(h)
 save(name+'-visibility.png',np.stack([ao,vis,np.ones_like(h)],axis=2))
 if name in ['coherent','structured']:
  dx=(np.roll(h,-1,1)-np.roll(h,1,1))*amplitude/(2*pixel)
  dy=(np.roll(h,-1,0)-np.roll(h,1,0))*amplitude/(2*pixel)
  n=np.stack([-dx,-dy,np.ones_like(h)],axis=2);n/=np.linalg.norm(n,axis=2)[:,:,None]
  save(name+'-normal.png',n*.5+.5)
  save(name+'-arh.png',np.stack([a['arh'][:,:,0],a['arh'][:,:,1],h],axis=2))
 results[name]={'heightPercentiles':np.percentile(h,[1,50,99]).tolist(),'aoMean':float(ao.mean()),'solarVisibilityMean':float(vis.mean()),'shadowedFraction':float((vis<.5).mean())}
reportData={'tileMetres':1/tile['scale'],'texelMetres':pixel,'heightMetres':amplitude,'sun':sun.tolist(),'uvSun':uvsun.tolist(),'sunSlope':sunSlope,'horizonRadiusMetres':32*pixel,'heightNormalGradientCorrelation':{},'maps':{},'bakes':results,'note':'Runtime original assets embedded by Bioma_Lab_V4_1_10_3_Manglar_Barro_Humedo.html. Official-source identity not proven by the material label. Coherent variant is a luminance-height hypothesis, not measured physical displacement.'}
for axis,c in [(1,0),(0,1)]:
 g=(np.roll(height,-1,axis)-np.roll(height,1,axis))*.5
 reportData['heightNormalGradientCorrelation'][str(axis)]=float(np.corrcoef(g.ravel(),normal[:,:,c].ravel())[0,1])
for k,p in paths.items():reportData['maps'][k]={'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':list(a[k].shape),'bytes':p.stat().st_size}
for p in out.glob('*.png'):reportData['maps'][p.name]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'rgbaMipBytesEstimate':N*N*4*4/3}
(report/'material-audit.json').write_text(json.dumps(reportData,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(results,indent=2))
