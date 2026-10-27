"""Batch flat-colored face primitives without changing skin/morph data.
Blender remains editable with its original separate materials. Run after export.
"""
import copy,json,struct
from pathlib import Path
FLAT={'Carved mouth interior','Ivory wood teeth','Carved tongue','Painted wooden eyelids'}
WIDTH={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
FORMAT={5121:'B',5123:'H',5125:'I',5126:'f'}

def optimize(path):
 path=Path(path);data=path.read_bytes();size=struct.unpack_from('<I',data,12)[0]
 doc=json.loads(data[20:20+size]);binary=bytearray(data[28+size:])
 def read(index):
  a=doc['accessors'][index];fmt='<'+FORMAT[a['componentType']]*WIDTH[a['type']]
  rows=[(0,)*WIDTH[a['type']] for _ in range(a['count'])]
  if 'bufferView' in a:
   v=doc['bufferViews'][a['bufferView']];stride=v.get('byteStride',struct.calcsize(fmt));offset=v.get('byteOffset',0)+a.get('byteOffset',0)
   rows=[struct.unpack_from(fmt,binary,offset+i*stride) for i in range(a['count'])]
  if 'sparse' in a:
   sparse=a['sparse'];ix=sparse['indices'];val=sparse['values'];iv=doc['bufferViews'][ix['bufferView']];vv=doc['bufferViews'][val['bufferView']]
   ifmt='<'+FORMAT[ix['componentType']];io=iv.get('byteOffset',0)+ix.get('byteOffset',0);vo=vv.get('byteOffset',0)+val.get('byteOffset',0)
   for i in range(sparse['count']):rows[struct.unpack_from(ifmt,binary,io+i*struct.calcsize(ifmt))[0]]=struct.unpack_from(fmt,binary,vo+i*struct.calcsize(fmt))
  return rows
 def write(rows,template):
  a=copy.deepcopy(template);a.pop('byteOffset',None);a.pop('min',None);a.pop('max',None);a.pop('sparse',None)
  binary.extend(b'\0'*((-len(binary))%4));offset=len(binary)
  fmt='<'+FORMAT[a['componentType']]*WIDTH[a['type']]
  for row in rows:binary.extend(struct.pack(fmt,*row))
  a['bufferView']=len(doc['bufferViews']);a['count']=len(rows)
  doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(binary)-offset})
  if a['type']=='VEC3':
   a['min']=[min(r[k] for r in rows) for k in range(3)];a['max']=[max(r[k] for r in rows) for k in range(3)]
  doc['accessors'].append(a);return len(doc['accessors'])-1
 changed=0
 for mesh in doc['meshes']:
  parts=[p for p in mesh['primitives'] if doc['materials'][p['material']].get('name') in FLAT]
  if not parts:continue
  assert len(parts)==4,'Expected all four face materials'
  first=parts[0];merged=copy.deepcopy(first);colors=[];indices=[];base=0
  for p in parts:
   assert p.get('mode',4)==4 and set(p['attributes'])==set(first['attributes'])
   assert len(p['targets'])==len(first['targets'])
   m=doc['materials'][p['material']];pbr=m['pbrMetallicRoughness']
   assert not any('Texture' in k for k in pbr) and not m.get('normalTexture')
   def signature(material):
    out=copy.deepcopy(material);out.pop('name',None);out['pbrMetallicRoughness'].pop('baseColorFactor',None);return out
   assert signature(m)==signature(doc['materials'][first['material']]),'Incompatible flat face materials'
   assert pbr['baseColorFactor'][3]==1,'Only opaque flat colors can be batched'
   count=doc['accessors'][p['attributes']['POSITION']]['count'];colors.extend([pbr['baseColorFactor'][:3]]*count)
   indices.extend((row[0]+base,) for row in read(p['indices']));base+=count
  for semantic in first['attributes']:
   merged['attributes'][semantic]=write([r for p in parts for r in read(p['attributes'][semantic])],doc['accessors'][first['attributes'][semantic]])
  merged['attributes']['COLOR_0']=write(colors,{'componentType':5126,'type':'VEC3'})
  merged['indices']=write(indices,{'componentType':5123,'type':'SCALAR'})
  for i,target in enumerate(first['targets']):
   assert all(set(p['targets'][i])==set(target) for p in parts)
   for semantic,index in target.items():merged['targets'][i][semantic]=write([r for p in parts for r in read(p['targets'][i][semantic])],doc['accessors'][index])
  material=copy.deepcopy(doc['materials'][first['material']]);material['name']='Batched painted facial details';material['pbrMetallicRoughness']['baseColorFactor']=[1,1,1,1]
  merged['material']=len(doc['materials']);doc['materials'].append(material)
  mesh['primitives']=[p for p in mesh['primitives'] if p not in parts]+[merged];changed+=1
 if not changed:return False
 # Repack only reachable views, including sparse payloads and embedded images.
 refs=[]
 for mesh in doc['meshes']:
  for primitive in mesh['primitives']:
   refs.extend((primitive['attributes'],k) for k in primitive['attributes'])
   if 'indices' in primitive:refs.append((primitive,'indices'))
   for target in primitive.get('targets',[]):refs.extend((target,k) for k in target)
 for animation in doc.get('animations',[]):
  for sampler in animation['samplers']:refs.extend([(sampler,'input'),(sampler,'output')])
 for skin in doc.get('skins',[]):
  if 'inverseBindMatrices' in skin:refs.append((skin,'inverseBindMatrices'))
 used=sorted({obj[key] for obj,key in refs});mapping={old:new for new,old in enumerate(used)}
 doc['accessors']=[doc['accessors'][i] for i in used]
 for obj,key in refs:obj[key]=mapping[obj[key]]
 views=[]
 for a in doc['accessors']:
  if 'bufferView' in a:views.append(a)
  if 'sparse' in a:views.extend([a['sparse']['indices'],a['sparse']['values']])
 views.extend(image for image in doc.get('images',[]) if 'bufferView' in image)
 used=sorted({obj['bufferView'] for obj in views});mapping={old:new for new,old in enumerate(used)};packed=bytearray();kept=[]
 for i in used:
  view=copy.deepcopy(doc['bufferViews'][i]);assert view.get('buffer',0)==0 and not view.get('extensions')
  packed.extend(b'\0'*((-len(packed))%4));offset=view.get('byteOffset',0);payload=binary[offset:offset+view['byteLength']]
  view['byteOffset']=len(packed);packed.extend(payload);kept.append(view)
 for obj in views:obj['bufferView']=mapping[obj['bufferView']]
 doc['bufferViews']=kept;binary=packed
 doc['buffers'][0]['byteLength']=len(binary);binary.extend(b'\0'*((-len(binary))%4))
 raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(raw)+len(binary))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(binary),0x004e4942)+binary)
 return True

if __name__=='__main__':
 import sys
 optimize(sys.argv[1])
