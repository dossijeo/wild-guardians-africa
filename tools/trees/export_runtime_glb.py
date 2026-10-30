"""Export editable LOD0 GLBs by copying runtime buffers byte-for-byte."""
import json,struct,hashlib,io,subprocess,argparse
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--biome',default='savanna');parser.add_argument('--count',type=int,default=4);parser.add_argument('--out',type=Path,default=Path('docs/lighting/tree-hd-transfer/current-runtime'));args=parser.parse_args()
root=Path.cwd();manifest=root/f'public/content/biome-{args.biome}.json';p=json.loads(manifest.read_text(encoding='utf8'));raw=(root/('public'+p['binary']['url'])).read_bytes();out=root/args.out;out.mkdir(parents=True,exist_ok=True)
sha=lambda x:hashlib.sha256(x).hexdigest()
report={'revision':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'manifest':str(manifest.relative_to(root)),'binary':p['binary']['url'],'binarySHA256':sha(raw),'scope':'Exact runtime LOD0 geometry and texture pixels; standard PBR approximation, not Wild Engine custom shader. No runtime changes.','trees':[]}
for a in p['assets'][:args.count]:
 texture_list=p['textureSets'][a['textureSet']] if 'textureSet' in a else p['textures']
 blob=bytearray();views=[];accessors=[]
 def append(data,target=None):
  blob.extend(b'\0'*((-len(blob))%4));v={'buffer':0,'byteOffset':len(blob),'byteLength':len(data)}
  if target:v['target']=target
  views.append(v);blob.extend(data);return len(views)-1
 attrs={};proof={};lod=a['lods'][0]
 for role,semantic,width,kind in [('position','POSITION',3,'VEC3'),('normal','NORMAL',3,'VEC3'),('uv','TEXCOORD_0',2,'VEC2'),('index',None,1,'SCALAR')]:
  d=lod[role];ctype,size={'<f4':(5126,4),'<u2':(5123,2),'<u4':(5125,4)}[d['type']];data=raw[d['offset']:d['offset']+d['count']*size]
  acc={'bufferView':append(data,34963 if role=='index' else 34962),'componentType':ctype,'count':d['count']//width,'type':kind}
  if role=='position':
   values=struct.unpack('<'+str(d['count'])+'f',data);acc['min']=[min(values[i::3]) for i in range(3)];acc['max']=[max(values[i::3]) for i in range(3)]
  if semantic:attrs[semantic]=len(accessors)
  else:index=len(accessors)
  accessors.append(acc);proof[role]=sha(data)
 images=[];textures=[];byRole={}
 for tex in texture_list:
  im=Image.open(root/('public'+tex['base64']['url']));buf=io.BytesIO();im.save(buf,format='PNG');images.append({'bufferView':append(buf.getvalue()),'mimeType':'image/png'});byRole[tex['role']]=len(textures);textures.append({'source':len(images)-1})
 mat={'name':'Runtime textures - standard PBR preview','alphaMode':'MASK','alphaCutoff':.35,'pbrMetallicRoughness':{'baseColorFactor':p['material'].get('baseColorFactor',[1,1,1,1]),'baseColorTexture':{'index':byRole['baseColor']},'metallicRoughnessTexture':{'index':byRole['metallicRoughness']},'roughnessFactor':.87,'metallicFactor':0},'normalTexture':{'index':byRole['normal'],'scale':p['material'].get('normalScale',.6)}}
 doc={'asset':{'version':'2.0','generator':'Wild Guardians runtime buffer export'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':a['slot']}],'meshes':[{'name':a['slot'],'primitives':[{'attributes':attrs,'indices':index,'material':0}]}],'materials':[mat],'textures':textures,'images':images,'bufferViews':views,'accessors':accessors,'buffers':[{'byteLength':len(blob)}]}
 js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4);blob.extend(b'\0'*((-len(blob))%4));encoded=struct.pack('<III',0x46546c67,2,28+len(js)+len(blob))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
 path=out/(a['slot']+'.glb');path.write_bytes(encoded)
 # Independently read the written container and verify every exported geometry range.
 written=path.read_bytes();jn=struct.unpack_from('<I',written,12)[0];decoded=json.loads(written[20:20+jn]);binary=written[28+jn:]
 for role,acc in zip(proof,decoded['accessors']):
  view=decoded['bufferViews'][acc['bufferView']];assert sha(binary[view['byteOffset']:view['byteOffset']+view['byteLength']])==proof[role]
 for i,tex in enumerate(texture_list):
  view=decoded['bufferViews'][decoded['images'][i]['bufferView']];im=Image.open(io.BytesIO(binary[view['byteOffset']:view['byteOffset']+view['byteLength']]));original=Image.open(root/('public'+tex['base64']['url']));assert im.mode==original.mode and im.size==original.size and im.tobytes()==original.tobytes()
 report['trees'].append({'slot':a['slot'],'name':a['name'],'file':path.name,'vertices':lod['position']['count']//3,'triangles':lod['index']['count']//3,'geometrySHA256':proof,'geometryBytesIdentical':True,'texturePixelsIdentical':True})
(out/'verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
