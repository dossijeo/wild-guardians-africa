from pathlib import Path
from PIL import Image,ImageChops,ImageStat,ImageOps,ImageDraw
import json
p=Path('docs/qa/global-visual-lab/river-channel-bank-review-20261022');j=json.loads((p/'captures.json').read_text(encoding='utf8'));audit=[]
for phase in ['day','night']:
 records=[next(r for r in j['records'] if r['phase']==phase and r['variant']==v) for v in ['baseline','worldbank','corebank']]
 canvas=Image.new('RGB',(1920,1110),'#222');d=ImageDraw.Draw(canvas)
 for i in range(3):
  ims=[Image.open(p/f'gran-rio-media-{v}-{phase}/{i:04}.png').convert('RGB') for v in ['baseline','worldbank','corebank']]
  fs=[r['frames'][i] for r in records]
  assert all(not r['errors'] for r in records)
  assert all(all(f[k]==fs[0][k] for k in ['camera','target','time','origin']) for f in fs)
  diff=ImageChops.difference(ims[1],ims[2]);pixels=sum(any(v for v in px) for px in diff.getdata())
  audit.append(dict(phase=phase,view=i,coreExact=diff.getbbox() is None,changedPixels=pixels,meanRGB=ImageStat.Stat(diff).mean,calls=[f['calls'] for f in fs],triangles=[f['triangles'] for f in fs]))
  for n,im in enumerate(ims):canvas.paste(ImageOps.contain(im,(640,360)),(n*640,i*370+10));d.text((n*640+5,i*370),['ORIGINAL','SOFT SHORE','OPAQUE INTERIOR'][n],fill='white')
 canvas.save(p/f'comparison-{phase}.jpg',quality=92)
(p/'audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8',newline='\n');print(json.dumps(audit))
