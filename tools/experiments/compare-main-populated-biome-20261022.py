import json,sys
from pathlib import Path
from PIL import Image, ImageDraw
biome=sys.argv[1];p=Path(f'docs/qa/global-visual-lab/main-{biome}-populated-20261022');q=Path(f'docs/qa/global-visual-lab/{biome}-populated-frozen-20261022')
a=json.loads((p/'captures.json').read_text(encoding='utf-8'));b=json.loads((q/'captures.json').read_text(encoding='utf-8'));rows=[]
assert len(a['records'])==len(b['records'])==4
for r in a['records']:
 s=next(v for v in b['records'] if v['phase']==r['phase'] and v['variant']==r['variant']);assert not r['errors'] and not s['errors']
 for f,g in zip(r['frames'],s['frames']):
  assert all(f[k]==g[k] for k in ['camera','target','time','origin','elapsed','workers']), (r['phase'],f['i'])
  assert not f['glError'] and not g['glError']
  rows.append({'phase':r['phase'],'variant':r['variant'],'view':f['i'],'mainCalls':f['calls'],'currentCalls':g['calls'],'mainTriangles':f['triangles'],'currentTriangles':g['triangles']})
  if r['variant']=='native':
   rel=f"{biome}-media-native-{r['phase']}/{f['i']:04}.png";im=Image.new('RGB',(2560,752));im.paste(Image.open(p/rel),(0,32));im.paste(Image.open(q/rel),(1280,32));ImageDraw.Draw(im).text((16,8),'Frozen main (left) | Experimental selected recipe (right); identical saved state and cameras',fill='white');im.save(p/f"pair-{r['phase']}-{f['i']}.jpg",quality=94)
(p/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n');print('12 pairs match pose, clock, elapsed and worker positions; no errors')
