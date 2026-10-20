"""Archive renderer screenshots as lossless WebP, verifying decoded pixels."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]/'docs/qa/global-visual-lab/ground-pom'
records=[]
for path in sorted(root.glob('*.png')):
 if path.name=='probe.png':continue
 if path.name.startswith('motion-') and not path.name.endswith('-036.png'):continue
 if path.name.startswith('solar-check-') and len(path.stem.split('-'))<5:continue
 original=Image.open(path).convert('RGBA');dest=path.with_suffix('.webp')
 original.save(dest,lossless=True,method=6)
 restored=Image.open(dest).convert('RGBA')
 assert original.tobytes()==restored.tobytes(),path
 records.append({'file':dest.name,'sourceBytes':path.stat().st_size,'bytes':dest.stat().st_size,'decodedRGBA_SHA256':hashlib.sha256(restored.tobytes()).hexdigest()})
 names={r['file'].replace('.webp','.png'):r['file'] for r in records}
def update(v):
 if isinstance(v,dict):return {k:update(a) for k,a in v.items()}
 if isinstance(v,list):return [update(a) for a in v]
 return names.get(v,v) if isinstance(v,str) else v
for path in root.glob('*.json'):
 if path.name=='lossless-images.json':continue
 data=json.loads(path.read_text(encoding='utf-8'));path.write_text(json.dumps(update(data),indent=2)+'\n',encoding='utf-8',newline='\n')
(root/'lossless-images.json').write_text(json.dumps({'note':'PNG intermediates are reproducible and ignored. All archived WebP screenshots have identical decoded RGBA pixels. Motion videos include all 72 frames; only frame 36 is also archived as a still.','images':records},indent=2)+'\n',encoding='utf-8',newline='\n')
print('Verified lossless images:',len(records),'MiB:',sum(r['bytes'] for r in records)/1048576)
