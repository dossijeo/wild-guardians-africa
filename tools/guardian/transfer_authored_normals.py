"""Transfer authored normals via identical triangle corners; preserve non-normal payloads."""
import argparse,hashlib,json,struct
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('original',type=Path);p.add_argument('baseline',type=Path);p.add_argument('candidate',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
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
o,b,c=map(read,[a.original,a.baseline,a.candidate]);op,bp,cp=map(primitive,[o,b,c]);oi=accessor(o,op['indices']).ravel();bi=accessor(b,bp['indices']).ravel();ci=accessor(c,cp['indices']).ravel();assert np.array_equal(oi,bi) and len(bi)==len(ci)
for name,index in op['attributes'].items():assert np.array_equal(accessor(o,index),accessor(b,bp['attributes'][name])),f'Baseline differs: {name}'
for name,index in bp['attributes'].items():
 if name!='NORMAL':assert np.array_equal(accessor(b,index)[bi],accessor(c,cp['attributes'][name])[ci]),f'Corner mismatch {name}'
assert len(bp.get('targets',[]))==len(cp.get('targets',[]))
for bt,ct in zip(bp.get('targets',[]),cp.get('targets',[])):
 for name,index in bt.items():
  if name!='NORMAL':assert np.array_equal(accessor(b,index)[bi],accessor(c,ct[name])[ci]),f'Morph corner mismatch {name}'
before=bytes(o[0]);changed=0;pending=[]
for ot,ct in [(op['attributes'],cp['attributes'])]+list(zip(op.get('targets',[]),cp.get('targets',[]))):
 if 'NORMAL' not in ot:continue
 dest=accessor(o,ot['NORMAL']);values=accessor(c,ct['NORMAL']);mapped={}
 for x,y in zip(oi,ci):
  if int(x) in mapped:assert np.array_equal(mapped[int(x)],values[y]),'Ambiguous normal transfer'
  else:mapped[int(x)]=values[y].copy()
 for i,n in mapped.items():
  if not np.array_equal(dest[i],n):changed+=1;dest[i]=n
 if 'sparse' in o[1]['accessors'][ot['NORMAL']]:pending.append((ot['NORMAL'],dest.copy()))
allowed=np.zeros(len(before),dtype=bool)
for ot in [op['attributes']]+op.get('targets',[]):
 if 'NORMAL' not in ot:continue
 acc=o[1]['accessors'][ot['NORMAL']]
 if 'sparse' in acc:
  sparse=acc['sparse'];v=o[1]['bufferViews'][sparse['values']['bufferView']];start=o[2]+v.get('byteOffset',0)+sparse['values'].get('byteOffset',0);allowed[start:start+sparse['count']*12]=True
 else:
  v=o[1]['bufferViews'][acc['bufferView']];start=o[2]+v.get('byteOffset',0)+acc.get('byteOffset',0);stride=v.get('byteStride',12)
  for i in range(acc['count']):allowed[start+i*stride:start+i*stride+12]=True
changed_bytes=np.frombuffer(before,dtype=np.uint8)!=np.frombuffer(o[0],dtype=np.uint8);assert not np.any(changed_bytes&~allowed)
binary=bytearray(o[0][o[2]:]);g=o[1]
for index,values in pending:
 binary.extend(b'\0'*((-len(binary))%4));offset=len(binary);binary.extend(values.astype('<f4').tobytes());view=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':values.nbytes})
 acc=g['accessors'][index];acc.pop('sparse',None);acc['bufferView']=view;acc.pop('byteOffset',None)
g['buffers'][0]['byteLength']=len(binary);doc=json.dumps(g,separators=(',',':')).encode();doc+=b' '*((-len(doc))%4);binary+=b'\0'*((-len(binary))%4)
output=struct.pack('<III',0x46546c67,2,28+len(doc)+len(binary))+struct.pack('<II',len(doc),0x4e4f534a)+doc+struct.pack('<II',len(binary),0x004e4942)+binary
a.output.write_bytes(output);a.output.with_suffix('.json').write_text(json.dumps({'originalSha256':hashlib.sha256(before).hexdigest(),'outputSha256':hashlib.sha256(output).hexdigest(),'changedNormalRecords':changed,'changedOriginalPayloadBytes':int(changed_bytes.sum()),'payloadChangesRestrictedToNormals':True,'normalAccessorsRepacked':len(pending),'triangleCornerParity':True,'note':'Original non-normal binary bytes preserved; JSON accessor metadata updated for repacked normal data. Animation, texture, position and skin payloads unchanged. Requires visual validation.'},indent=2))