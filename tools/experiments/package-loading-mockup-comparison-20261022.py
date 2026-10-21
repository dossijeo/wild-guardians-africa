from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
root=Path('docs/qa/global-visual-lab/loading-mockup-comparison-20261022')
font=ImageFont.load_default()
metrics=[]
for phase in ['day','night']:
 paths=[root/f'mockup-{phase}.jpg',Path(f'docs/qa/global-visual-lab/loading-parallel-fixed-20261022/landscape-{phase}-beam.png'),Path(f'docs/qa/global-visual-lab/loading-diffuse-contrast-20261022/landscape-{phase}-beam.png')]
 labels=['MOCKUP DEL USUARIO','ANTES - render real','AJUSTE - render real']
 canvas=Image.new('RGB',(2400,500),'#18202c');draw=ImageDraw.Draw(canvas)
 for j,(path,label) in enumerate(zip(paths,labels)):
  im=Image.open(path).convert('RGB');im.thumbnail((800,450));canvas.paste(im,(j*800,(450-im.height)//2+50));draw.text((j*800+16,14),label,font=font,fill='white')
 canvas.save(root/f'{phase}-three-way.png')
 for j,path in enumerate(paths[1:]):
  im=Image.open(path).convert('RGB');mean=lambda box:sum((.2126*r+.7152*g+.0722*b)/255 for r,g,b in im.crop(box).getdata())/2400;lit=mean((580,430,640,470));side=mean((930,430,990,470));metrics.append(dict(phase=phase,variant=['before','after'][j],lit_mean=lit,side_mean=side,ratio=lit/max(side,1e-6)))
(root/'display-luma.json').write_text(json.dumps({'note':'Display RGB luma of fixed ground rectangles, not photometry. Lit x580:640 y430:470; side x930:990 y430:470. Mockups have different framing/aspect and are not measured as equivalent.', 'metrics':metrics},indent=2))
print(json.dumps(metrics,indent=2))
