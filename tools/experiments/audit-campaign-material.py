"""Read-only screenshot matching and numerical difference audit for a QA directory."""
import json,sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
root=Path(sys.argv[1]);records=json.loads((root/'captures.json').read_text(encoding='utf-8'))['records'];results=[]
for a in records:
 if a['variant']!='base':continue
 b=next(r for r in records if r['variant']=='candidate' and all(r[k]==a[k] for k in ['biome','view','phase']))
 fields=['camera','target','seed','time','quality','day','structures','plants'];mismatch=[k for k in fields if a[k]!=b[k]]
 assert not mismatch,(a['file'],mismatch)
 assert not a['errors'] and not b['errors'],(a['errors'],b['errors'])
 diff=ImageChops.difference(Image.open(root/a['file']).convert('RGB'),Image.open(root/b['file']).convert('RGB'))
 results.append({'biome':a['biome'],'view':a['view'],'phase':a['phase'],'matched':fields,'delta':{k:b[k]-a[k] for k in ['calls','triangles','textures']},'rgbMAE255':sum(ImageStat.Stat(diff).mean)/3})
(root/'comparison-audit.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pairs':len(results),'errors':0,'maxMAE':max(r['rgbMAE255'] for r in results)},indent=2))
