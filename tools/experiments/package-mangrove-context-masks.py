import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
p=Path('docs/qa/global-visual-lab/mangrove-context/mask-audit')
d=json.loads((p/'masks.json').read_text());es=d['audit']['entries'];assert len(es)==25 and not d['errors'] and d['audit']['spatialSession']
a=np.array([e['data'] for e in es],dtype=np.uint8).reshape(-1,4)
summary={'chunks':len(es),'samplesIncludingBorders':len(a),'channels':{},'note':'Sample statistics include water, overlapping chunk borders and off-screen terrain; not visible land area percentages.'}
labels=['R coverage','G broad variation','B moisture','A settlement wear']
canvas=Image.new('RGB',(960,1020),'#202020');draw=ImageDraw.Draw(canvas)
for c,label in enumerate(labels):
 summary['channels'][label]={'quantiles0_10_50_90_100':np.quantile(a[:,c],[0,.1,.5,.9,1]).tolist(),'mean':float(a[:,c].mean())}
 im=np.zeros((160,160),dtype=np.uint8)
 for e in es:
  assert e['mapped']==1 and e['width']==e['height']==35
  x,z=map(int,e['key'].split(','));data=np.array(e['data'],dtype=np.uint8).reshape(35,35,4)
  im[(z+2)*32:(z+3)*32,x*32:(x+1)*32]=data[1:33,1:33,c]
 tile=Image.fromarray(im).resize((480,480),Image.Resampling.NEAREST).convert('RGB');x=(c%2)*480;y=(c//2)*510
 canvas.paste(tile,(x,y+30));draw.text((x+10,y+8),label,fill='white')
canvas.save(p/'channels.png');(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(summary,indent=2))
