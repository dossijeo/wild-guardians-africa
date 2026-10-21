import json,sys,itertools
from pathlib import Path
from PIL import Image,ImageChops

root=Path(sys.argv[1])
data=json.loads((root/'captures.json').read_text(encoding='utf-8'))
results=[]
for phase in ['day','night']:
 rows=[r for r in data['records'] if r['phase']==phase]
 for a,b in itertools.combinations(rows,2):
  x=Image.open(root/a['screenshot']).convert('RGB')
  y=Image.open(root/b['screenshot']).convert('RGB')
  if x.size!=y.size:raise ValueError('Capture resolution differs')
  diff=ImageChops.difference(x,y)
  row=dict(phase=phase,a=a['screenshot'],b=b['screenshot'],
   sameVariant=a['variant']==b['variant'],
   changedPixels=sum(pixel!=(0,0,0) for pixel in diff.getdata()),
   maxChannelDelta=max(high for low,high in diff.getextrema()))
  results.append(row);print(row)
(root/'image-comparisons.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n')
