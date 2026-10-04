"""Prepare separate original Moss002 and Ground050 maps for the web.
No material mixing, masks, UV deformation or resampling. AO, roughness and
height are packed as RGB; source color and NormalGL coordinates stay intact.
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
    path=ROOT/'content/manifests/mangrove-ground-bake.json'
    previous=json.loads(path.read_text(encoding='utf8'))
    archive=set(previous['archiveOnly'])
    if previous['schema']<3:archive.update(v['url'] for v in previous['maps'].values())
    sets={};materials=[]
    for name,key in [('Moss002','maps'),('Ground050','mudMaps')]:
        material,source=load_material(name);materials.append(source)
        pixels={'base':material['Color'],'normal':material['NormalGL'],
            'arh':np.stack([material['AmbientOcclusion'],material['Roughness'],material['Displacement']],axis=2)}
        records={}
        for role,array in pixels.items():
            ext='webp' if role=='arh' else 'jpg'
            image=Image.fromarray(np.rint(np.clip(array,0,1)*255).astype('uint8'))
            buffer=BytesIO()
            if ext=='jpg':image.save(buffer,format='JPEG',quality=90,subsampling=0)
            else:image.save(buffer,format='WEBP',lossless=True,method=6)
            data=buffer.getvalue();sha=hashlib.sha256(data).hexdigest();url='/assets/'+sha+'.'+ext
            (ROOT/'public'/url.lstrip('/')).write_bytes(data)
            records[role]={'url':url,'sha256':sha,'bytes':len(data),'width':SIZE,'height':SIZE,'channels':3}
        sets[key]=records
    manifest={'schema':3,'biome':'mangrove','generator':'tools/bake_mangrove_ground.py',
        'recipe':'separate untransformed Moss002 terrain and Ground050 patch materials',
        'materials':materials,**sets,'archiveOnly':sorted(archive)}
    path.write_bytes((json.dumps(manifest,indent=2)+'\n').encode('utf8'))
    path=ROOT/'public/content/ground-materials.json';profiles=json.loads(path.read_text(encoding='utf8'))
    for role,item in sets['maps'].items():profiles['mangrove'][role]=item['url']
    profiles['mangrove']['name']='Moss002 · musgo puro con barro independiente'
    profiles['mangrove']['pureMoss']=True
    profiles['mangrove']['mudPatches']={role:item['url'] for role,item in sets['mudMaps'].items()}
    profiles['mangrove']['mudPatches']['scale']=profiles['mangrove']['scale']
    path.write_bytes((json.dumps(profiles,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf8'))
    print('Prepared two independent 1024x1024 materials: pure moss and pure mud')

if __name__=='__main__':main()
