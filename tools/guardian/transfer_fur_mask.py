"""Append an authored mask by triangle-corner correspondence; preserve all original payload bytes."""
import argparse,json,struct,hashlib
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('original',type=Path);p.add_argument('candidate',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
def read(path):
 raw=bytearray(path.read_bytes());n=struct.unpack_from('<I',raw,12)[0];return raw,json.loads(raw[20:20+n]),28+n
def accessor(doc,index):
 raw,g,base=doc;acc=g['accessors'][index]
 dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[acc['componentType']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[acc['type']];size=np.dtype(dtype).itemsize
 if 'bufferView' in acc:
  v=g['bufferViews'][acc['bufferView']];assert not v.get('extensions');offset=base+v.get('byteOffset',0)+acc.get('byteOffset',0)
  out=np.ndarray((acc['count'],width),dtype=dtype,buffer=raw,offset=offset,strides=(v.get('byteStride',width*size),size))
 else:out=np.zeros((acc['count'],width),dtype=dtype)
 if 'sparse' in acc:
  out=out.copy();ids,values=sparse_arrays(doc,index);out[ids]=values
 return out
def sparse_arrays(doc,index):
 raw,g,base=doc;s=g['accessors'][index]['sparse'];iv=g['bufferViews'][s['indices']['bufferView']];vv=g['bufferViews'][s['values']['bufferView']]
 ids=np.frombuffer(raw,dtype={5121:'u1',5123:'<u2',5125:'<u4'}[s['indices']['componentType']],count=s['count'],offset=base+iv.get('byteOffset',0)+s['indices'].get('byteOffset',0))
 values=np.frombuffer(raw,dtype='<f4',count=s['count']*3,offset=base+vv.get('byteOffset',0)+s['values'].get('byteOffset',0)).reshape(-1,3)
 return ids,values
def primitive(d):return next(m for m in d[1]['meshes'] if m['name']=='Mesh_0')['primitives'][0]

o,c=map(read,[a.original,a.candidate]);op,cp=map(primitive,[o,c]);oi=accessor(o,op['indices']).ravel();ci=accessor(c,cp['indices']).ravel();assert len(oi)==len(ci)
for name in ['POSITION','TEXCOORD_0','JOINTS_0','WEIGHTS_0']:
 assert np.array_equal(accessor(o,op['attributes'][name])[oi],accessor(c,cp['attributes'][name])[ci]),name
assert len(op.get('targets',[]))==len(cp.get('targets',[]))
for ot,ct in zip(op.get('targets',[]),cp.get('targets',[])):
 if 'POSITION' in ot:assert np.array_equal(accessor(o,ot['POSITION'])[oi],accessor(c,ct['POSITION'])[ci])
values=accessor(c,cp['attributes']['_FUR_LIGHT']).ravel();mapped={}
for x,y in zip(oi,ci):
 if int(x) in mapped:assert abs(mapped[int(x)]-values[y])<1e-6
 else:mapped[int(x)]=values[y]
count=o[1]['accessors'][op['attributes']['POSITION']]['count'];assert len(mapped)==count
mask=np.array([mapped[i] for i in range(count)]);assert np.all(np.isfinite(mask)) and np.min(mask)>=0 and np.max(mask)<=1
quantized=np.rint(mask*255).astype('u1');binary=bytearray(o[0][o[2]:]);original_binary=bytes(binary);offset=len(binary);packed=np.zeros((count,4),dtype='u1');packed[:,0]=quantized;binary.extend(packed.tobytes());binary+=b'\0'*((-len(binary))%4)
g=o[1];view=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':count*4,'byteStride':4,'target':34962});index=len(g['accessors']);g['accessors'].append({'bufferView':view,'componentType':5121,'count':count,'type':'SCALAR','normalized':True});op['attributes']['_FUR_LIGHT']=index;g['buffers'][0]['byteLength']=len(binary)
doc=json.dumps(g,separators=(',',':')).encode();doc+=b' '*((-len(doc))%4)
output=struct.pack('<III',0x46546c67,2,28+len(doc)+len(binary))+struct.pack('<II',len(doc),0x4e4f534a)+doc+struct.pack('<II',len(binary),0x004e4942)+binary
assert bytes(binary[:len(original_binary)])==original_binary
a.output.write_bytes(output);a.output.with_suffix('.json').write_text(json.dumps({'originalSha256':hashlib.sha256(o[0]).hexdigest(),'outputSha256':hashlib.sha256(output).hexdigest(),'originalBinaryPreserved':True,'maskVertices':count,'maskBytes':count*4,'maskComponentBytes':count,'maximumQuantizationError':float(np.max(np.abs(mask-quantized.astype(float)/255))),'triangleCornerPositionsUVSkinMorphParity':True},indent=2))
