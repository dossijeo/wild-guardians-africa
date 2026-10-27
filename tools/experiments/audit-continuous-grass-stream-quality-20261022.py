from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
import json
p=Path('docs/qa/global-visual-lab/continuous-grass-stream-quality-20261022');r=json.loads((p/'results.json').read_text());summary=[]
for row in r:
 phase=row['phase'];a=Image.open(p/f'{phase}-projection-beforeImage.png').convert('RGB');b=Image.open(p/f'{phase}-projection-afterImage.png').convert('RGB');d=ImageChops.difference(a,b);h=d.histogram()
 item={'phase':phase,'projectionBuffersEqual':row['projection']['buffersEqual'],'projectionImageEqual':row['projection']['equal'],'differenceBox':d.getbbox(),'maxChannel':max(v[1] for v in d.getextrema()),'meanChannel':sum((i%256)*v for i,v in enumerate(h))/(a.width*a.height*3),'quality':[(x['quality'],x['calls'],x['triangles'],x['audit']['near'],x['audit']['far'],x['visible']) for x in row['rows']],'stream':[(x['offset'],x['audit']['chunks'],x['residentChunks'],x['geometries'],x['textures'],x['audit']['stats']['overflow']) for x in row['motion']]};summary.append(item)
 sheet=Image.new('RGB',(1280,744));draw=ImageDraw.Draw(sheet)
 for i,x in enumerate(row['rows']):
  im=Image.open(p/f"{phase}-quality-{i}-{x['quality']}.png");px=(i%2)*640;py=(i//2)*372;sheet.paste(im.resize((640,360)),(px,py+12));draw.text((px+5,py),x['quality'],fill='white')
 sheet.save(p/f'{phase}-quality-comparison.jpg');d.point(lambda x:min(255,x*8)).save(p/f'{phase}-projection-difference-x8.png')
(p/'summary.json').write_bytes(json.dumps(summary,indent=2).encode());print(json.dumps(summary,indent=2))
