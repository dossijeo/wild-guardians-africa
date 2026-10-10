import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {Assets} from '../src/rendering/assets.js';
import {CropPartition} from '../src/rendering/crop-partition.js';
import {LoadingDiorama} from '../src/rendering/loading-diorama.js';
import {WorldScene} from '../src/rendering/scene.js';
import {LoadingTransferOwner} from '../src/app/loading-transfer-owner.js';
import {createCropBatch} from '../src/rendering/crop-batch.js';
import {partitionCropLibrary} from '../tools/experiments/partition-crop-library.mjs';

const directory=path.resolve('.cache/maize-partition-lifecycle');
const manifest=partitionCropLibrary(directory);
const metadata=JSON.parse(fs.readFileSync('public/content/crop-bridges.json'));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const materials=scene=>{const result=[];scene.traverse(object=>{if(object.isMesh)result.push(object.material);});return result;};
function fixture(t,{image}={}){
 const fetchOriginal=globalThis.fetch,selfOriginal=globalThis.self,progressOriginal=globalThis.ProgressEvent;
 globalThis.self=globalThis;globalThis.ProgressEvent??=class {constructor(type,fields){Object.assign(this,{type},fields);}};
 const requests=[],images=[],assets=new Assets(),disposed=new Map();
 globalThis.fetch=async request=>{const url=typeof request==='string'?request:request.url;if(url.startsWith('/content/'))return new Response(JSON.stringify(url.includes('models.json')?[{source:'Cultivos',url:'/original-full.glb'}]:url.includes('crop-bridges')?metadata:{canyons:{base:'/soil.webp'}}));requests.push(url);const filename=new URL(url).pathname.slice('/partition/'.length);const bytes=fs.readFileSync(path.join(directory,filename));return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});};
 assets.textures.loadAsync=async url=>{images.push(url);const texture=image?await image(url):new THREE.Texture();texture.addEventListener('dispose',()=>disposed.set(texture,(disposed.get(texture)??0)+1));return texture;};
 const library=new CropPartition(assets,manifest,'http://localhost/partition/partition-manifest.json');
 t.after(()=>{library.dispose();assets.disposeModels();globalThis.fetch=fetchOriginal;globalThis.self=selfOriginal;globalThis.ProgressEvent=progressOriginal;});
 return {library,assets,requests,images,disposed};
}
test('native GLTF parser + meshopt load maize once, complete40/32 and share actual canonical texture objects',async t=>{
 const f=fixture(t),maize=await f.library.models('maize'),bridges=await f.library.bridges(metadata,'maize');
 assert.equal(materials(maize.scene).length,5);assert.equal(bridges.bakedTemplates.size,4);
 const original=materials(maize.scene)[0],world=await f.library.models('all'),full=await f.library.bridges(metadata,'all');
 const borrowedMap=original.map,batch=createCropBatch(new THREE.Scene(),{capabilities:{getMaxAnisotropy:()=>4}},maize,bridges,8,{species:['maiz'],shadows:false});batch.dispose();assert.strictEqual(original.map,borrowedMap);assert.equal(f.disposed.size,0,'private crop batch must not dispose source textures');
 assert.equal(materials(world.scene).length,40);assert.equal(full.bakedTemplates.size,32);
 assert.equal(f.requests.length,4);assert.equal(new Set(f.requests).size,4);
 assert.ok(f.requests.every(url=>!Object.values(manifest.sources).some(source=>url.includes(source.logicalUrl))));
 assert.equal(f.images.length,4);assert.equal(new Set(f.images).size,4);
 const same=materials(world.scene).filter(material=>material.map===original.map);
 assert.ok(same.length>5);assert.ok(same.every(material=>material.normalMap===original.normalMap));
 assert.equal(original.map.colorSpace,THREE.SRGBColorSpace);assert.equal(original.normalMap.colorSpace,THREE.NoColorSpace);
 assert.equal(original.map.flipY,false);assert.equal(original.map.wrapS,THREE.ClampToEdgeWrapping);
 await f.library.models('all');await f.library.bridges(metadata,'all');assert.equal(f.requests.length,4);
 f.library.dispose();assert.equal(f.disposed.size,0,'adapter must not dispose borrowed successful textures');
 f.assets.disposeModels();assert.equal(f.disposed.size,4);assert.ok([...f.disposed.values()].every(count=>count===1));
});
test('cancel during real parse image await rejects adoption and disposes late texture exactly once',async t=>{
 const pending=deferred(),started=deferred(),texture=new THREE.Texture();
 const f=fixture(t,{image:url=>{if(url===new URL(manifest.textures[0].uri,'http://localhost/partition/').href){started.resolve();return pending.promise;}return new THREE.Texture();}}),loading=f.library.models('maize');
 const rejection=assert.rejects(loading,/disposed|cancelled/);await started.promise;f.assets.disposeModels();pending.resolve(texture);await rejection;
 assert.equal(f.library.closed,true);assert.equal(f.disposed.get(texture),1);assert.equal(f.assets.modelSources.size,0);
});
test('failed image/model caches permit explicit retry without changing exact URLs',async t=>{
 let failure=true;const f=fixture(t,{image:()=>{if(failure)throw Error('image failure');return new THREE.Texture();}});
 await assert.rejects(f.library.models('maize'),/image failure/);failure=false;
 const retry=await f.library.models('maize');assert.equal(materials(retry.scene).length,5);assert.equal(f.requests.length,2);assert.equal(f.requests[0],f.requests[1]);
});
test('manifest rejects escapes, incomplete libraries and incompatible canonical sampler bindings',t=>{
 const f=fixture(t),bad=structuredClone(manifest);bad.partitions[0].file='../escape.glb';assert.throws(()=>new CropPartition(f.assets,bad,'http://localhost/partition/manifest.json'),/relative/);
 assert.throws(()=>f.library.bridges({...metadata,pairs:metadata.pairs.slice(1)}),/Incomplete/);
 assert.throws(()=>f.library.models('other'),/Invalid/);
});
test('canonical texture rejects incompatible sampler or color interpretation rather than mutating a borrowed map',async t=>{
 const f=fixture(t),uri=manifest.textures[0].uri,parser={json:{textures:[{source:0,sampler:0}],images:[{uri}],samplers:[{wrapS:10497}],materials:[{normalTexture:{index:0}}]},associations:new Map()};
 const texture=await f.library.loadTexture(parser,0,0);assert.equal(texture.wrapS,THREE.RepeatWrapping);
 parser.json.samplers[0].wrapS=33071;assert.throws(()=>f.library.loadTexture(parser,0,0),/Conflicting/);assert.equal(texture.wrapS,THREE.RepeatWrapping);
 parser.json.materials[0].pbrMetallicRoughness={baseColorTexture:{index:0}};assert.throws(()=>f.library.loadTexture(parser,0,0),/Ambiguous/);
});
test('explicit adapter close during parsing releases partial owned geometry/materials and prevents late cache publication',async t=>{
 const pending=deferred(),started=deferred(),f=fixture(t,{image:()=>{started.resolve();return pending.promise;}});
 const loading=f.library.models('maize'),rejected=assert.rejects(loading,/cancelled/);await started.promise;
 await new Promise(resolve=>setImmediate(resolve));const resources=[...f.assets.ownedResources],counts=new Map();assert.ok(resources.some(resource=>resource.isBufferGeometry),'real parser allocated geometry before its image await');for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)??0)+1));
 f.library.dispose();pending.resolve(new THREE.Texture());await rejected;
 assert.equal(f.assets.modelSources.size,0);assert.ok([...counts.values()].every(count=>count===1));f.assets.disposeModels();assert.ok([...counts.values()].every(count=>count===1));
});
test('real LoadingDiorama.prepare uses only maize partitions before soil adoption, world completion reuses them',async t=>{
 const f=fixture(t),stop=Error('adoption boundary'),world=Object.assign(Object.create(WorldScene.prototype),{loading:new AbortController(),assets:f.assets,cropPartition:f.library,sky:{load:async()=>{}}});
 const owner=Object.assign(Object.create(LoadingDiorama.prototype),{world,abort:new AbortController(),ground:{material:{}},textureOwner:{borrow:()=>{throw stop;}}});
 await assert.rejects(owner.prepare(),error=>error===stop);
 assert.equal(f.requests.length,2);assert.ok(f.requests.every(url=>url.includes('/maize-')));assert.equal(f.images.at(-1),'/soil.webp');
 await f.library.models('all');await f.library.bridges(metadata,'all');assert.equal(f.requests.length,4);
});

test('actual WorldScene.load completes all crop gates for new and saved state without original full models',()=>{
 const result=spawnSync(process.execPath,['--experimental-loader','./tests/fixtures/world-load-crop-default-loader.mjs','./tests/fixtures/world-load-crop-default.mjs'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);assert.match(result.stdout,/New \+ saved Continue PASS/);
});
test('existing transfer owner reports real GLB bytes and only resolved exactURL reuse as application cache',async t=>{
 const f=fixture(t),transfers=new LoadingTransferOwner({expectedBytes:url=>f.library.expectedBytes(url)});t.after(()=>transfers.dispose());
 await f.library.models('maize');await f.library.models('all');
 const rows=[...transfers.downloads.requests.values()].filter(row=>row.kind==='gltf');assert.equal(rows.length,2);
 for(const row of rows){assert.equal(row.loaded,f.library.expectedBytes(row.url));assert.equal(row.failed,false);assert.equal(row.cache,'unknown');}
 const cache=[...transfers.downloads.requests.values()].filter(row=>row.kind==='collection-cache');assert.equal(cache.length,1);assert.equal(cache[0].cache,'application-cache');
 assert.equal(transfers.downloads.snapshot().pending,0);assert.equal(transfers.downloads.snapshot().loadedBytes,rows.reduce((sum,row)=>sum+row.loaded,0));
});
test('manifest, GLB and texture resolve against actual nested CDN and Tauri module base',()=>{
 for(const moduleUrl of ['https://cdn.itch.zone/html/9876/game/assets/index.js','https://tauri.localhost/assets/index.js']){
  const result=spawnSync(process.execPath,['--experimental-loader','./tests/fixtures/crop-partition-hosting-loader.mjs','./tests/fixtures/crop-partition-hosting.mjs'],{encoding:'utf8',env:{...process.env,CROP_HOST_MODULE:moduleUrl}});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);assert.match(result.stdout,/expected bytes PASS/);
 }
});
test('composite identity aliases cannot substitute out-of-range or fractional cropIndex/stage',t=>{
 const f=fixture(t),returnEach=[];
 for(const [cropIndex,stage]of [[0,6],[1,0],[-1,6],[8,-4],[.2,0]]){
  const library=new CropPartition(f.assets,manifest,'http://localhost/partition/manifest.json'),alias=cropIndex*5+stage-1;
  library.part=async group=>{const scene=new THREE.Scene();for(let id=group==='maize'?0:5;id<(group==='maize'?5:40);id++){const mesh=new THREE.Mesh();mesh.userData=id===alias?{cropIndex,stage}:{cropIndex:Math.floor(id/5),stage:id%5+1};scene.add(mesh);}return {scene};};
  t.after(()=>library.dispose());assert.equal(Number.isInteger(alias)&&alias>=0&&alias<40,true);
  // All forty composite IDs still exist once; invalid component fields must reject.
  returnEach.push(assert.rejects(library.models('all'),/Ambiguous crop state identity/));
 }
 return Promise.all(returnEach);
});

test('serial World completion reuses prepared maize, four actual partitions and canonical textures',async t=>{
 const f=fixture(t),maize=await f.library.models('maize'),initial=await f.library.bridges(metadata,'maize');assert.equal(initial.bakedTemplates.size,4);const map=materials(maize.scene)[0].map;
 const gltf=await f.library.models('all'),data=await f.library.bridges(metadata,'all');assert.equal(materials(gltf.scene).length,40);assert.equal(data.bakedTemplates.size,32);assert.equal(f.requests.length,4);assert.equal(new Set(f.requests).size,4);assert.equal(f.images.length,4);assert.ok(materials(gltf.scene).some(material=>material.map===map));
 f.assets.disposeModels();assert.equal(f.disposed.size,4);assert.ok([...f.disposed.values()].every(count=>count===1));
});
