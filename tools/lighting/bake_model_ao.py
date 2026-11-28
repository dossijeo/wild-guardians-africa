"""Offline local cavity visibility for active GLBs; geometry/UVs/rigs unchanged.
blender -b --python tools/lighting/bake_model_ao.py -- --profile hyena
Animated seams: only same-dominant-joint surfaces occlude; morph-moving surfaces
are excluded as receivers and occluders to avoid baked shadows on moving lids.
"""
import argparse,hashlib,json,struct,sys,time
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from vertex_visibility import bake_visibility
ROOT=Path(__file__).resolve().parents[2]
TYPES={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}
SIZES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
class GLB:
    def __init__(self,path):
        self.raw=path.read_bytes();assert self.raw[:4]==b'glTF'
        length=struct.unpack_from('<I',self.raw,12)[0]
        self.doc=json.loads(self.raw[20:20+length]);offset=20+length
        size,kind=struct.unpack_from('<II',self.raw,offset);assert kind==0x004e4942
        self.bin=self.raw[offset+8:offset+8+size]
    def view(self,index,dtype,count,width,offset=0):
        v=self.doc['bufferViews'][index]
        if v.get('buffer',0)!=0 or v.get('extensions'):raise ValueError('Bake from original, uncompressed GLB')
        dtype=np.dtype(dtype);stride=v.get('byteStride',width*dtype.itemsize)
        return np.ndarray((count,width),dtype=dtype,buffer=self.bin,offset=v.get('byteOffset',0)+offset,strides=(stride,dtype.itemsize)).copy()
    def accessor(self,index):
        a=self.doc['accessors'][index];dtype=TYPES[a['componentType']];width=SIZES[a['type']]
        data=self.view(a['bufferView'],dtype,a['count'],width,a.get('byteOffset',0)) if 'bufferView' in a else np.zeros((a['count'],width),dtype=dtype)
        if 'sparse' in a:
            s=a['sparse'];i=s['indices'];v=s['values']
            ids=self.view(i['bufferView'],TYPES[i['componentType']],s['count'],1,i.get('byteOffset',0)).ravel()
            data[ids]=self.view(v['bufferView'],dtype,s['count'],width,v.get('byteOffset',0))
        if a.get('normalized') and a['componentType']!=5126:
            data=np.maximum(data.astype(np.float32)/np.iinfo(np.dtype(dtype)).max,-1.)
        return data

def targets():
    models=json.loads((ROOT/'public/content/models.json').read_text(encoding='utf8'))
    workers=json.loads((ROOT/'public/content/worker-actions.json').read_text(encoding='utf8'))
    result={'worker-'+k:v['url'] for k,v in workers.items()}
    for key,term in [('hyena','Hiena'),('lion','Leon'),('warthog','Facoquero'),('buffalo','Bufalo'),('rhino','Rinoceronte'),('crops','Cultivos')]:
        result[key]=next(x['url'] for x in models if term in x['source'])
    result['guardian']='/content/guardian/guardian.glb'
    return result

def bake(profile):
    url=targets()[profile];g=GLB(ROOT/'public'/url.lstrip('/'));blob=bytearray();records=[];started=time.perf_counter()
    for mi,mesh in enumerate(g.doc['meshes']):
        for pi,primitive in enumerate(mesh['primitives']):
            if primitive.get('mode',4)!=4:raise ValueError('Expected triangles')
            mat=g.doc.get('materials',[])[primitive['material']]
            if mat.get('alphaMode','OPAQUE')!='OPAQUE':raise ValueError('Requires alpha-aware GLB texture sampling')
            attrs=primitive['attributes'];pos=g.accessor(attrs['POSITION']);norm=g.accessor(attrs['NORMAL'])
            indices=g.accessor(primitive['indices']).reshape((-1,3)) if 'indices' in primitive else np.arange(len(pos)).reshape((-1,3))
            moving=np.zeros(len(pos),dtype=bool)
            for target in primitive.get('targets',[]):
                if 'POSITION' in target:moving |= np.linalg.norm(g.accessor(target['POSITION']),axis=1)>1e-7
            occluders=indices[~np.any(moving[indices],axis=1)]
            groups=None
            if 'JOINTS_0' in attrs:
                joints=g.accessor(attrs['JOINTS_0']);weights=g.accessor(attrs['WEIGHTS_0'])
                groups=joints[np.arange(len(joints)),np.argmax(weights,axis=1)]
            if len(occluders):values,radius,stats=bake_visibility(pos,norm,occluders,radius_fraction=.035 if groups is not None else .08,groups=groups)
            else:values=np.full(len(pos),255,dtype=np.uint8);radius=0;stats={'invalidNormals':0,'traversalLimit':0}
            values[moving]=255
            record=dict(mesh=mi,primitive=pi,name=mesh.get('name'),offset=len(blob),count=len(values),radius=radius,mean=float(values.mean()),minimum=int(values.min()),excludedMorphVertices=int(moving.sum()),dominantJointFiltered=groups is not None,**stats)
            blob.extend(values.tobytes());records.append(record);print(json.dumps(record),flush=True)
    out=ROOT/'public/content/lighting/global-ao';name='model-'+profile
    (out/(name+'.bin')).write_bytes(blob)
    report=dict(profile=profile,source=url,sourceSHA256=hashlib.sha256(g.raw).hexdigest(),binary='/content/lighting/global-ao/'+name+'.bin',outputSHA256=hashlib.sha256(blob).hexdigest(),byteLength=len(blob),samples=32,records=records,seconds=time.perf_counter()-started,scope='Local cavity candidate; excludes moving morph surfaces and cross-joint occlusion. No dynamic AO claim.')
    (out/(name+'.json')).write_text(json.dumps(report,indent=2),encoding='utf8')
    print('MODEL_AO_COMPLETE',profile,len(blob),flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--profile',required=True,choices=list(targets()));a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bake(a.profile)
