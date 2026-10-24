from pathlib import Path
from PIL import Image, ImageDraw
import json
root=Path('docs/qa/global-visual-lab')
base=root/'loading-capacity-20261021';fit=root/'loading-capacity-fit-v2-20261021'
for phase in ['day','night']:
 for form in ['landscape','portrait']:
  size=(640,360) if form=='landscape' else (273,591)
  sheet=Image.new('RGB',(size[0]*2,(size[1]+24)*4),'#17202a');draw=ImageDraw.Draw(sheet)
  for row,progress in enumerate([.15,.4,.75,1]):
   for col,folder in enumerate([base,fit]):
    im=Image.open(folder/f'{progress}-{form}-{phase}-shadow.png').convert('RGB').resize(size)
    x=col*size[0];y=row*(size[1]+24)
    draw.text((x+8,y+5),f'{"BASE" if col==0 else "FIT V2"} | {progress:.0%}',fill='white');sheet.paste(im,(x,y+24))
  sheet.save(fit/f'comparison-{form}-{phase}.webp',lossless=True)
a=json.loads((base/'captures.json').read_text());b=json.loads((fit/'captures.json').read_text())
assert len(a['records'])==len(b['records'])==32
for x,y in zip(a['records'],b['records']):
 assert all(x[k]==y[k] for k in ['progress','phase','shadow','format','plants','roots','triangles'])
 assert y['rootOutside']==0 and y['glError']==0
assert not a['errors'] and not b['errors']
(fit/'audit.json').write_bytes((json.dumps({'pairs':32,'sameGrowthPhasePlantsTriangles':True,'fittedRootsOutside':0,'errors':[],'limitation':'Root projection and selected visual inspection do not prove all leaf geometry fits every pose.'},indent=2)+'\n').encode())
