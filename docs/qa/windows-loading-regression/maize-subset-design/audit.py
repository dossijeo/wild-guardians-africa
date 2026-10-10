import pathlib,json,struct,hashlib,copy
here=pathlib.Path(__file__).resolve().parent;root=here.parents[3]
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads((root/p).read_bytes())
ids=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata']
models=read('public/content/models.json');metadata=read('public/content/crop-bridges.json');mapping=read('content/manifests/web-assets.json')['records']
urls={'steady':next(m['url'] for m in models if 'Cultivos' in m['source']),'bridges':metadata['bakedAsset']}
result={'sourceRef':'b43b15a8115f6eca2e64cc64e900d166f321dff2','scope':'Read-only GLB JSON/range inventory, no decoding/timing/GPU/new asset output. Decoded buffer-view bytes are logical geometry storage, not measured heap/VRAM. Subset payload bytes exclude rebuilt container JSON/padding and are not generated file sizes.','assets':{},'sourceHashes':{}}
for kind,url in urls.items():
 record=next(x for x in mapping if '/'+x['source']==url);path='public/'+record['runtime'];blob=(root/path).read_bytes();assert sha(blob)==record['runtimeSha256'];size,tag=struct.unpack_from('<II',blob,12);assert tag==0x4e4f534a;j=json.loads(blob[20:20+size]);views=j['bufferViews'];accessors=j['accessors'];groups=[{'species':id,'nodes':[],'views':set(),'materials':set(),'vertices':0,'triangles':0,'attributeComponents':{}} for id in ids]
 for node in j['nodes']:
  assert 'mesh' in node;extras=node['extras'];crop=extras['cropIndex'] if kind=='steady' else extras['bridgeIndex']//4;g=groups[crop];g['nodes'].append(node['name'])
  for primitive in j['meshes'][node['mesh']]['primitives']:
   if 'material' in primitive:g['materials'].add(primitive['material'])
   indices=[*primitive['attributes'].values(),primitive['indices']]
   for a in indices:g['views'].add(accessors[a]['bufferView'])
   g['vertices']+=accessors[primitive['attributes']['POSITION']]['count'];g['triangles']+=accessors[primitive['indices']]['count']//3
   for semantic,a in primitive['attributes'].items():g['attributeComponents'][semantic]=g['attributeComponents'].get(semantic,0)+accessors[a]['count']
 def materialImages(index):
  found=set()
  def walk(o):
   if isinstance(o,dict):
    for k,v in o.items():
     if k.endswith('Texture') and isinstance(v,dict) and 'index' in v:
      tex=j['textures'][v['index']];found.add(tex.get('source',tex.get('extensions',{}).get('EXT_texture_webp',{}).get('source')))
     else:walk(v)
   elif isinstance(o,list):
    for v in o:walk(v)
  walk(j['materials'][index]);return found
 allViews=set();rows=[]
 for g in groups:
  assert len(g['nodes'])==(5 if kind=='steady' else 4)
  assert not allViews.intersection(g['views']),'cross-species geometry buffer sharing';allViews.update(g['views'])
  images=set().union(*(materialImages(m) for m in g['materials'])) if g['materials'] else set()
  encoded=sum(views[v]['extensions']['EXT_meshopt_compression']['byteLength'] for v in g['views']);decoded=sum(views[v]['byteLength'] for v in g['views'])
  imageBytes=sum(views[j['images'][i]['bufferView']]['byteLength'] for i in images)
  rows.append({'species':g['species'],'nodes':g['nodes'],'vertices':g['vertices'],'triangles':g['triangles'],'decodedGeometryBytes':decoded,'encodedGeometryPayloadBytes':encoded,'bufferViews':sorted(g['views']),'materialIndices':sorted(g['materials']),'imageIndices':sorted(images),'requiredEmbeddedImagePayloadBytes':imageBytes,'subsetEncodedPayloadBytes':encoded+imageBytes,'attributes':g['attributeComponents']})
 allImageBytes=sum(views[im['bufferView']]['byteLength'] for im in j.get('images',[]))
 allEncoded=sum(row['encodedGeometryPayloadBytes'] for row in rows)
 imageGroups=[{'material':m,'images':sorted(materialImages(m))} for m in range(len(j.get('materials',[])))]
 referenced=set().union(*(materialImages(m) for m in range(len(j.get('materials',[]))))) if j.get('materials') else set()
 imageRecords=[{'index':i,'name':im.get('name'),'bytes':views[im['bufferView']]['byteLength'],'referencedByMaterial':i in referenced} for i,im in enumerate(j.get('images',[]))]
 assert allViews==set(range(len(views)))-{im['bufferView'] for im in j.get('images',[])},'unclassified geometry buffer view'
 result['assets'][kind]={'logicalUrl':url,'runtimePath':path,'sourceBytes':record['beforeBytes'],'runtimeBytes':len(blob),'runtimeSha256':sha(blob),'jsonChunkBytes':size,'decodedGeometryBytes':sum(r['decodedGeometryBytes'] for r in rows),'encodedGeometryPayloadBytes':allEncoded,'imagePayloadBytes':allImageBytes,'containerMetadataAndPaddingBytes':len(blob)-allEncoded-allImageBytes,'materialImageGroups':imageGroups,'images':imageRecords,'crossSpeciesGeometryViewsShared':False,'species':rows}
 result['sourceHashes'][path]=sha(blob)
compact=lambda x:json.dumps(x,separators=(',',':'),ensure_ascii=False).encode()
base=len(compact(metadata));withoutLabels=copy.deepcopy(metadata)
for m in withoutLabels['models']:m.pop('faceLabels')
v4Minimal={'recipeVersion':4,'bakedAsset':metadata['bakedAsset'],'models':[{} for _ in metadata['models']],'pairs':[{'a':p['a'],'b':p['b']} for p in metadata['pairs']]}
result['metadata']={'path':'public/content/crop-bridges.json','actualBytes':(root/'public/content/crop-bridges.json').stat().st_size,'canonicalCompactBytes':base,'faceLabelsEntries':sum(len(m['faceLabels']) for m in metadata['models']),'canonicalBytesWithoutFaceLabels':len(compact(withoutLabels)),'canonicalFaceLabelsRemovableBytes':base-len(compact(withoutLabels)),'hypotheticalV4MinimalCompactBytes':len(compact(v4Minimal)),'scope':'V4 path reads model/pair cardinality, pair a/b and baked template metadata; faceLabels/regions/mappings are used by legacy V3 branch and offline authoring. This minimal structure is not shipped/validated and removing it would require version-specific compatibility tests.'}
for path in ['public/content/models.json','public/content/crop-bridges.json','content/manifests/web-assets.json','content/manifests/crops-v4.json','src/rendering/crop-library.js','src/rendering/crop-batch.js','src/rendering/loading-diorama.js','src/rendering/assets.js','src/rendering/scene.js','src/rendering/asset-url.js','tools/compress_web_assets.mjs','tools/bake_crops_lab_v4.mjs']:
 result['sourceHashes'][path]=sha((root/path).read_bytes())
result['alternativesByteLedger']={'currentRuntimeGlbsBytes':sum(a['runtimeBytes'] for a in result['assets'].values()),'maizeEncodedGeometryBytes':sum(a['species'][0]['encodedGeometryPayloadBytes'] for a in result['assets'].values()),'maizeDecodedGeometryBytes':sum(a['species'][0]['decodedGeometryBytes'] for a in result['assets'].values()),'maizeWithNeededEmbeddedImagesPayloadBytes':sum(a['species'][0]['subsetEncodedPayloadBytes'] for a in result['assets'].values()),'remainingSevenEncodedGeometryBytes':sum(sum(s['encodedGeometryPayloadBytes'] for s in a['species'][1:]) for a in result['assets'].values()),'duplicateGroup0ImagesIfTwoEmbeddedSteadyFilesBytes':result['assets']['steady']['species'][0]['requiredEmbeddedImagePayloadBytes'],'scope':'Logical existing range totals, excluding new GLB metadata/padding and any new network latency. Not a generated-asset/package-size or performance measurement.'}
(here/'inventory.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
for kind,a in result['assets'].items():
 print(kind,a['runtimeBytes'],'decoded geometry',a['decodedGeometryBytes'],'embedded images',a['imagePayloadBytes'])
 for r in a['species']:print(r['species'],r['encodedGeometryPayloadBytes'],r['decodedGeometryBytes'],r['imageIndices'])
print('metadata',json.dumps(result['metadata']))
