"""Compare authored and batched Guardian accessors, including sparse morphs."""
import json,struct,sys,hashlib
from pathlib import Path

def load(path):
 data=Path(path).read_bytes();n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);b=data[28+n:]
 def values(index):
  a=j['accessors'][index];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];f={5121:'B',5123:'H',5125:'I',5126:'f'};fmt='<'+f[a['componentType']]*w
  rows=[(0,)*w for _ in range(a['count'])]
  if 'bufferView' in a:
   v=j['bufferViews'][a['bufferView']];offset=v.get('byteOffset',0)+a.get('byteOffset',0)
   rows=[struct.unpack_from(fmt,b,offset+i*v.get('byteStride',struct.calcsize(fmt))) for i in range(a['count'])]
  if 'sparse' in a:
   s=a['sparse'];x=s['indices'];y=s['values'];ix=j['bufferViews'][x['bufferView']].get('byteOffset',0)+x.get('byteOffset',0);iy=j['bufferViews'][y['bufferView']].get('byteOffset',0)+y.get('byteOffset',0);xf='<'+f[x['componentType']]
   for i in range(s['count']):rows[struct.unpack_from(xf,b,ix+i*struct.calcsize(xf))[0]]=struct.unpack_from(fmt,b,iy+i*struct.calcsize(fmt))
  return rows
 return j,values,data

def audit(before,after):
 a,av,ab=load(before);b,bv,bb=load(after);checks=0
 assert a['nodes']==b['nodes']
 for sa,sb in zip(a['skins'],b['skins'],strict=True):
  assert {k:v for k,v in sa.items() if k!='inverseBindMatrices'}=={k:v for k,v in sb.items() if k!='inverseBindMatrices'}
  assert av(sa['inverseBindMatrices'])==bv(sb['inverseBindMatrices'])
 for aa,ba in zip(a['animations'],b['animations'],strict=True):
  assert aa['channels']==ba['channels'] and aa['name']==ba['name']
  for x,y in zip(aa['samplers'],ba['samplers'],strict=True):
   assert x.get('interpolation')==y.get('interpolation')
   for key in ['input','output']:assert av(x[key])==bv(y[key]);checks+=1
 for am,bm in zip(a['meshes'],b['meshes'],strict=True):
  assert am.get('extras')==bm.get('extras') and am.get('weights')==bm.get('weights')
  if len(am['primitives'])==len(bm['primitives']):groups=[[p] for p in am['primitives']]
  else:groups=[[am['primitives'][0]],am['primitives'][1:]]
  for group,target in zip(groups,bm['primitives'],strict=True):
   for name in group[0]['attributes']:
    assert [v for p in group for v in av(p['attributes'][name])]==bv(target['attributes'][name]),name;checks+=1
   offset=0;indices=[]
   for p in group:indices.extend((v[0]+offset,) for v in av(p['indices']));offset+=len(av(p['attributes']['POSITION']))
   assert indices==bv(target['indices']);checks+=1
   for i,t in enumerate(group[0].get('targets',[])):
    for key in t:assert [v for p in group for v in av(p['targets'][i][key])]==bv(target['targets'][i][key]);checks+=1
   if len(group)>1:
    colors=[]
    for p in group:
     # glTF material factors and COLOR_0 are both linear, with FLOAT precision.
     color=a['materials'][p['material']]['pbrMetallicRoughness']['baseColorFactor'][:3]
     color=struct.unpack('<3f',struct.pack('<3f',*color));colors.extend([color]*len(av(p['attributes']['POSITION'])))
    assert colors==bv(target['attributes']['COLOR_0']);checks+=1
 return {'checks':checks,'exactSkinGeometryMorphAnimationParity':True,'beforeBytes':len(ab),'afterBytes':len(bb),'beforePrimitives':sum(len(m['primitives']) for m in a['meshes']),'afterPrimitives':sum(len(m['primitives']) for m in b['meshes']),'beforeSha256':hashlib.sha256(ab).hexdigest(),'afterSha256':hashlib.sha256(bb).hexdigest()}
if __name__=='__main__':print(json.dumps(audit(sys.argv[1],sys.argv[2]),indent=2))
