"""Bake original Moss002/Ground050 into three tiles without UV deformation.
Only the blend mask is procedural. Each original pixel keeps its position,
scale and orientation in color, OpenGL normals, AO, roughness and height.
Install tools/requirements-ground-bake.txt to reproduce the assets.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import hashlib,json
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SIZE=1024
SEED=417103

def organic_mask(rng):
    # Equal angular power and radial filtering avoid a grid-axis direction.
    # Fourier synthesis is periodic; this changes alpha only, never source UVs.
    spectrum=np.fft.fft2(rng.normal(size=(SIZE,SIZE)))
    spectrum/=np.maximum(np.abs(spectrum),1e-12)
    frequencies=np.fft.fftfreq(SIZE)*SIZE
    radius=np.hypot(frequencies[:,None],frequencies[None,:])
    amplitude=np.exp(-(radius/4.5)**2)*((radius>=2)&(radius<=14))
    field=np.fft.ifft2(spectrum*amplitude).real
    field=.5+.17*field/field.std()
    weight=np.clip((field-.30)/.35,0,1)
    return weight*weight*(3-2*weight)

def load_material(name):
    path=ROOT/'references/materials'/(name+'_1K-JPG.zip')
    entries={};maps={}
    with ZipFile(path) as archive:
        for role in ['Color','NormalGL','AmbientOcclusion','Roughness','Displacement']:
            entry=name+'_1K-JPG_'+role+'.jpg';data=archive.read(entry)
            image=Image.open(BytesIO(data));assert image.size==(SIZE,SIZE),(entry,image.size)
            maps[role]=np.asarray(image.convert('RGB' if role in ['Color','NormalGL'] else 'L'),dtype=np.float32)/255
            entries[role]={'entry':entry,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
    return maps,{'path':path.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'entries':entries}

def main():
    moss,moss_source=load_material('Moss002');mud,mud_source=load_material('Ground050')
    rng=np.random.default_rng(SEED)
    mask=organic_mask(rng)
    def blend(role):
        weight=mask[:,:,None] if moss[role].ndim==3 else mask
        return mud[role]*(1-weight)+moss[role]*weight
    normal=blend('NormalGL')*2-1
    normal/=np.maximum(np.linalg.norm(normal,axis=2,keepdims=True),1e-6)
    maps={'base':blend('Color'),'normal':normal*.5+.5,
        'arh':np.stack([blend('AmbientOcclusion'),blend('Roughness'),blend('Displacement')],axis=2)}
    records={}
    for role,pixels in maps.items():
        ext='webp' if role=='arh' else 'jpg'
        image=Image.fromarray(np.rint(np.clip(pixels,0,1)*255).astype('uint8'))
        buffer=BytesIO()
        if ext=='jpg':image.save(buffer,format='JPEG',quality=90,subsampling=0)
        else:image.save(buffer,format='WEBP',lossless=True,method=6)
        data=buffer.getvalue();sha=hashlib.sha256(data).hexdigest();url='/assets/'+sha+'.'+ext
        (ROOT/'public'/url.lstrip('/')).write_bytes(data)
        records[role]={'url':url,'sha256':sha,'bytes':len(data),'width':SIZE,'height':SIZE,'channels':3}
    originals=['59b561800a23971253804385622ac6b87b9745e0f654d08263caa81593bd57a6.jpg','19796ddbf475c130166a39e388c07577e56d44d033a281ccc4e256838ddec9eb.jpg','7e512482577df14fe6d5b196a01412416aa1feb1b5a726a02e4c8fadf4d7387c.png']
    manifest={'schema':2,'biome':'mangrove','seed':SEED,'generator':'tools/bake_mangrove_ground.py',
        'recipe':'untransformed original materials; periodic organic mask shared by all maps',
        'materials':[moss_source,mud_source],'maps':records,'archiveOnly':['/assets/'+name for name in originals]}
    (ROOT/'content/manifests/mangrove-ground-bake.json').write_bytes((json.dumps(manifest,indent=2)+'\n').encode('utf8'))
    path=ROOT/'public/content/ground-materials.json';profiles=json.loads(path.read_text(encoding='utf8'))
    for role,item in records.items():profiles['mangrove'][role]=item['url']
    profiles['mangrove']['name']='Moss002 + Ground050 · mezcla orgánica sin deformaciones'
    path.write_bytes((json.dumps(profiles,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf8'))
    print('Baked three 1024x1024 maps from original materials, without UV transforms')

if __name__=='__main__':main()
