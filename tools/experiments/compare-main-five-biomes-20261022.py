from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path('docs/qa/global-visual-lab');out=root/'main-five-biomes-comparison-20261022'
a=json.loads((out/'captures.json').read_text());checks=[]
for ar in a['records']:
 if ar['variant']!='native':continue
 biome=ar['biome'];phase=ar['phase'];source='reviewed-profile-20261022' if biome=='manglares' else 'canyon-balanced-native-20261022' if biome=='gran-canon' else 'reviewed-five-biomes-20261022'
 b=json.loads((root/source/'captures.json').read_text());br=next(r for r in b['records'] if r['biome']==biome and r['variant']=='native' and r['phase']==phase)
 for i,(af,bf) in enumerate(zip(ar['frames'],br['frames'])):
  for key in ['camera','target','time','origin']:assert af[key]==bf[key],(biome,phase,i,key,af[key],bf[key])
  assert not ar['errors'] and not br['errors'] and not af['glError'] and not bf['glError']
  folder=f'{biome}-media-native-{phase}';canvas=Image.new('RGB',(2560,756),'#1c1c1c');draw=ImageDraw.Draw(canvas)
  draw.text((16,10),f'MAIN b2497b069 / {biome} / {phase}',fill='white');draw.text((1296,10),'EXPERIMENTAL / selected native recipe',fill='white')
  canvas.paste(Image.open(out/folder/f'{i:04}.png').convert('RGB'),(0,36));canvas.paste(Image.open(root/source/folder/f'{i:04}.png').convert('RGB'),(1280,36));canvas.save(out/f'side-by-side-{biome}-{phase}-{i}.jpg',quality=94)
  checks.append({'biome':biome,'phase':phase,'view':i,'candidateSource':source,'cameraTimeOriginEqual':True,'mainCalls':af['calls'],'experimentalCalls':bf['calls'],'mainTriangles':af['triangles'],'experimentalTriangles':bf['triangles']})
(out/'comparison.json').write_text(json.dumps(checks,indent=2)+'\n',newline='\n')
print(f'{len(checks)} pairs verified and composed')
