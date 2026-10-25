"""Locate cyan samples in authored atlas UVs; not a runtime attribution test."""
import hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]
pack_path=root/'public/content/biome-savanna.json'
pack=json.loads(pack_path.read_text(encoding='utf-8'))
atlas_path=root/('public'+pack['textures'][0]['base64']['url'])
binary_path=root/('public'+pack['binary']['url'])
im=np.asarray(Image.open(atlas_path).convert('RGB')); raw=binary_path.read_bytes()
h,w=im.shape[:2]
rows=[]
for asset in pack['assets']:
    d=asset['lods'][0]['uv']
    uv=np.frombuffer(raw,dtype=d['type'],count=d['count'],offset=d['offset']).reshape(-1,2)
    # assets.js loads the source atlas with flipY=false.
    x=np.clip((uv[:,0]*w).astype(int),0,w-1)
    y=np.clip((uv[:,1]*h).astype(int),0,h-1)
    rgb=im[y,x].astype(float)
    mask=(rgb[:,2]>rgb[:,0]*1.25)&(rgb[:,1]>rgb[:,0]*1.15)&(rgb[:,2]>80)
    rows.append({'slot':asset['slot'],'name':asset['name'],'vertices':len(mask),'cyanSamples':int(mask.sum()),'meanCyanRGB':rgb[mask].mean(axis=0).tolist() if mask.any() else None})
result={'method':'Nearest base-level RGB samples at LOD0 vertex UVs, flipY=false; threshold B>1.25R, G>1.15R, B>80. Counts are vertices, not area or visible pixels.', 'limitations':'No interpolation, mipmaps, lighting, occlusion or screen-space attribution. Does not prove these assets caused the screenshot pixels.', 'sources':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [pack_path,atlas_path,binary_path,root/'src/rendering/assets.js']},'assets':rows}
out=root/'docs/qa/global-visual-lab/current-review-20261025/current-resident-cost/sabana-blue-atlas-audit.json'
with out.open('w',encoding='utf-8',newline='\n') as f:json.dump(result,f,indent=2,ensure_ascii=False);f.write('\n')
print(json.dumps([r for r in rows if r['cyanSamples']],ensure_ascii=True))
