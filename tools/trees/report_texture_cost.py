"""Transfer/GPU allocation estimates and the opaque-base blend precondition."""
from pathlib import Path
from PIL import Image
import json

rows=[]
for biome in ['savanna','grand_river','mangrove','volcanoes','canyons']:
    pack=json.loads(Path(f'public/content/biome-{biome}.json').read_text())
    for asset in pack['assets']:
        near=asset.get('nearTextures')
        if not near: continue
        original=pack['textures'] if 'textureSet' not in asset else pack['textureSets'][asset['textureSet']]
        original_base=next(t for t in original if t['role']=='baseColor')['base64']['url']
        for url in [original_base,near['textures']['baseColor']]:
            with Image.open('public'+url) as im:
                if 'A' in im.getbands() and im.getchannel('A').getextrema()!=(255,255):
                    raise ValueError(f'RGB-only near blend requires an opaque base: {url}')
        textures=[]
        for role,url in near['textures'].items():
            path=Path('public'+url)
            with Image.open(path) as image: width,height=image.size
            allocation=0; x,y=width,height
            while True:
                allocation+=x*y*4
                if x==1 and y==1: break
                x=max(1,x//2);y=max(1,y//2)
            textures.append(dict(role=role,width=width,height=height,downloadBytes=path.stat().st_size,rgba8MipBytes=allocation))
        rows.append(dict(biome=biome,slot=asset['slot'],opaqueOriginalAndNewBase=True,cornerUVBytes=Path('public'+near['cornerUV']).stat().st_size,textures=textures))
totals={}
for biome in sorted({r['biome'] for r in rows}):
    subset=[r for r in rows if r['biome']==biome]
    totals[biome]=dict(downloadBytes=sum(r['cornerUVBytes']+sum(t['downloadBytes'] for t in r['textures']) for r in subset),rgba8MipBytes=sum(t['rgba8MipBytes'] for r in subset for t in r['textures']))
report=dict(scope='Incremental transfer bytes and theoretical RGBA8 GPU mip allocation. Excludes geometry, driver overhead, transient decode memory and original resources. All near resources currently load with the biome.',assets=rows,totals=totals)
Path('docs/lighting/tree-near-retexture/performance/texture-cost.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(totals))
