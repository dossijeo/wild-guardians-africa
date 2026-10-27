import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
p=Path('docs/qa/global-visual-lab/mangrove-boundary-causes-20261022')
d=json.loads((p/'distribution.json').read_text(encoding='utf-8')); rows=d['rejections']
x=np.array([r['x'] for r in rows]);z=np.array([r['z'] for r in rows]);c=np.array([r['causes'] for r in rows],bool);f=np.array([r['footprint'] for r in rows],bool)
accepted=~c.any(axis=1)&~f
fig,axes=plt.subplots(2,3,figsize=(16,10),sharex=True,sharey=True)
for ax,title,mask in zip(axes.flat,['Accepted roots','Wear > .25','Water exclusion','Obstacle footprint','Wear reach > .27','Cover or slope'],[accepted,c[:,1],c[:,3],c[:,4],f,c[:,0]|c[:,2]]):
 ax.scatter(x,z,s=1,c='#eeeeee');ax.scatter(x[mask],z[mask],s=2,c='#257747');ax.set_title(f'{title}: {mask.sum()}');ax.set_aspect('equal');ax.scatter([d['camera'][0]],[d['camera'][2]],c='red',marker='x');ax.scatter([d['target'][0]],[d['target'][2]],c='blue',marker='+');ax.grid(alpha=.15)
fig.suptitle('Cached candidate rejection causes (not screen visibility); red camera, blue target')
fig.tight_layout();fig.savefig(p/'causes.png',dpi=130);plt.close(fig)
summary={'candidates':len(rows),'accepted':int(accepted.sum()),'rejectedByCause':dict(zip(['cover','wear','slope','water','obstacle'],map(int,c.sum(axis=0)))),'additionalWearFootprint':int(f.sum()),'multipleCauseCount':int((c.sum(axis=1)>1).sum()),'selected':d['audit']['near']+d['audit']['far']}
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n');print(summary)

from collections import defaultdict
points=defaultdict(list)
for chunk in d['chunks']:
 for iz in range(35):
  for ix in range(35):
   key=(chunk['cx']*96-48+(ix-1)*3,chunk['cz']*96-48+(iz-1)*3)
   points[key].append({'chunk':[chunk['cx'],chunk['cz']],'rgba':chunk['mask'][(iz*35+ix)*4:(iz*35+ix)*4+4]})
bad=[{'world':[x/2,z/2],'samples':v} for (x,z),v in points.items() if any(a['rgba']!=v[0]['rgba'] for a in v)]
(p/'mask-seams.json').write_text(json.dumps({'shared':sum(len(v)>1 for v in points.values()),'inconsistent':bad},indent=2)+'\n',encoding='utf-8',newline='\n')
assert not bad, 'Native masks disagree at shared world positions'
