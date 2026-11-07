"""Install only the six reviewed cleanup bakes, retaining exact decoded RGBA."""
import hashlib,io,json
from pathlib import Path
import PIL
from PIL import Image,features

root=Path('docs/lighting/tree-near-retexture/impostors')
manifest_path=Path('public/content/far-vegetation.json')
manifest=json.loads(manifest_path.read_text(encoding='utf8'))
digest=lambda b:hashlib.sha256(b).hexdigest()
records=[];writes=[]
for biome,slot in [('savanna',1),('grand_river',1),('grand_river',3)]:
    entry=next(a for a in manifest['biomes'][biome] if a['slot']==slot)
    for phase in ['day','night']:
        stem=f'{biome}-{slot}-{phase}'
        metadata=json.loads((root/(stem+'.json')).read_text())
        source,output=metadata['source'],metadata['output']
        assert not metadata['errors'] and not source['errors'] and not source['webglError']
        for key in ['slot','species','views','rotationViews','localBase','impostorWidth','impostorHeight','sourceBounds','baseV','sunPosition']:
            # Container round-trips can differ at the last floating-point bit.
            def equal(a,b):
                if isinstance(a,(int,float)):return abs(a-b)<1e-10
                if isinstance(a,list):return len(a)==len(b) and all(equal(x,y) for x,y in zip(a,b))
                if isinstance(a,dict):return a.keys()==b.keys() and all(equal(a[k],b[k]) for k in a)
                return a==b
            assert equal(source[key],entry[key]),(stem,key)
        assert output['encoding']==entry['prelitAlphaEncoding'] and output['width']==entry['atlasWidth'] and output['height']==entry['atlasHeight']
        assert source['bakedPhase']==phase and source['nativeSunDirection']
        image=Image.open(root/(stem+'.png')).convert('RGBA');encoded=io.BytesIO()
        image.save(encoded,format='WEBP',lossless=True,method=6,exact=True)
        data=encoded.getvalue();decoded=Image.open(io.BytesIO(data)).convert('RGBA')
        assert decoded.size==image.size and decoded.tobytes()==image.tobytes(),stem
        url=f'./assets/far-vegetation/cleaned-20261101/{stem}.webp'
        writes.append((Path('public')/url[2:],data))
        records.append({'biome':biome,'slot':slot,'phase':phase,'input':(root/(stem+'.png')).as_posix(),'inputSHA256':digest((root/(stem+'.png')).read_bytes()),'output':url,'sha256':digest(data),'rgbaSHA256':digest(image.tobytes()),'bytes':len(data)})
        entry[phase]=url;entry['runtimeSha256'][phase]=digest(data)
        entry['sourceTriangles']=source['sourceTriangles'];entry['imagegen']=False
        entry['cleanupProvenance']='docs/lighting/tree-near-retexture/impostors/installed.json'
for path,data in writes:
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
manifest['totalTextureBytes']=sum((Path('public')/entry[phase][2:]).stat().st_size for species in manifest['biomes'].values() for entry in species for phase in ['day','night'])
manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
(root/'installed.json').write_text(json.dumps({'encoder':{'pillow':PIL.__version__,'webp':features.version('webp'),'lossless':True,'exact':True,'method':6},'records':records},indent=2)+'\n')
print('Installed six cleaned impostors; every decoded RGBA byte matches the reviewed PNG.')
