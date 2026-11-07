import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {loadBakedWalkAsset,loadBakedAnimalRunAsset,ownDirectBakedWalkAsset,createBakedWalkBank,closeBakedWalkResources} from '../src/rendering/baked-walk-catalog.js';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {Scene,PerspectiveCamera,Group,DataTexture} from 'three';

const sha=data=>createHash('sha256').update(data).digest('hex');
test('closing the graphical owner cancels new loads but keeps shared walking textures until compilation ends',async()=>{
 let finish,released=0;const bank=createBakedWalkBank({load:async species=>({meta:{species},texture:{isDataTexture:true},dispose(){released++;}})});await bank.get('hyena');const scene=new Scene(),admission=createWebGpuPipelineAdmission({scene,camera:new PerspectiveCamera(),renderer:{backend:{isWebGPUBackend:true},compileAsync:()=>new Promise(resolve=>{finish=resolve;})}}),pending=admission.prepare(new Group());await Promise.resolve();const cancelled=assert.rejects(pending,/cancelled/);closeBakedWalkResources({bank,admission});await cancelled;await assert.rejects(bank.get('lion'),/disposed/);assert.equal(released,0);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(released,1);
});
test('closing the graphical owner also closes and releases the animal running bank',()=>{
 let closed=0,released=0,finish;const animalRunBank={close(){closed++;},dispose(){released++;}},admission={dispose(){},deferCompilations(callback){finish=callback;}};
 closeBakedWalkResources({animalRunBank,admission});assert.equal(closed,1);assert.equal(released,0);finish();assert.equal(released,1);
});
async function fetchFile(url){const data=await readFile('public'+url);return {ok:true,json:async()=>JSON.parse(data.toString()),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};}

test('catalogue assets match their original model and load for every species',async()=>{
 for(const [species,config] of Object.entries(ANIMAL_ACTIONS.animals)){
  const meta=JSON.parse(await readFile(`public/content/gpu-walk/${species}/walking.json`,'utf8')),source=await readFile('public'+config.url);assert.equal(sha(source),meta.sourceSha256);
  const asset=await loadBakedWalkAsset(species,{fetcher:fetchFile,subtle:webcrypto.subtle});assert.equal(asset.meta.species,species);assert.ok(asset.texture.isDataTexture);asset.dispose();
 }
});

test('catalogue rejects altered data and metadata without creating a texture',async()=>{
 const tampered=async url=>{const response=await fetchFile(url);if(url.endsWith('.bin'))return {...response,arrayBuffer:async()=>{const data=await response.arrayBuffer();new Uint8Array(data)[0]^=1;return data;}};return response;};
 await assert.rejects(loadBakedWalkAsset('hyena',{fetcher:tampered,subtle:webcrypto.subtle}),/checksum mismatch/);
 const mismatched=async url=>{const response=await fetchFile(url);if(url.endsWith('.json'))return {...response,json:async()=>({...await response.json(),sourceSha256:'0'.repeat(64)})};return response;};
 await assert.rejects(loadBakedWalkAsset('hyena',{fetcher:mismatched,subtle:webcrypto.subtle}),/source mismatch/);
 const missingInverses=async url=>{const response=await fetchFile(url);if(url.endsWith('.json'))return {...response,json:async()=>{const meta=await response.json();delete meta.boneInverses;return meta;}};return response;};
 await assert.rejects(loadBakedWalkAsset('hyena',{fetcher:missingInverses,subtle:webcrypto.subtle}),/source mismatch/);
});

test('cancellation during asynchronous verification cannot publish an asset',async()=>{
 const controller=new AbortController();let finish,started;const verifying=new Promise(resolve=>{started=resolve;}),pending=loadBakedWalkAsset('hyena',{signal:controller.signal,fetcher:fetchFile,subtle:{digest(){started();return new Promise(resolve=>{finish=resolve;});}}});await verifying;controller.abort();finish(new Uint8Array(32).buffer);await assert.rejects(pending,{name:'AbortError'});
});

test('the Worker bank shares one species load and releases it once at shutdown',async()=>{
 let loads=0,disposed=0;const bank=createBakedWalkBank({load:async species=>{loads++;return {meta:{species},texture:{isDataTexture:true},dispose(){disposed++;}};}}),[a,b]=await Promise.all([bank.get('hyena'),bank.get('hyena')]);assert.equal(a,b);assert.equal(loads,1);assert.equal(bank.status().species[0].ready,true);bank.dispose();bank.dispose();assert.equal(disposed,1);await assert.rejects(bank.get('hyena'),/disposed/);
});

test('bank disposal rejects a late asset and frees it without publication',async()=>{
 let finish,started,disposed=0;const loading=new Promise(resolve=>{started=resolve;}),bank=createBakedWalkBank({load:species=>{started();return new Promise(resolve=>{finish=()=>resolve({meta:{species},texture:{isDataTexture:true},dispose(){disposed++;}});});}}),pending=bank.get('lion');await loading;bank.dispose();finish();await assert.rejects(pending,{name:'AbortError'});assert.equal(disposed,1);assert.deepEqual(bank.status().species,[]);
});

test('the shared walking texture is published only after its WebGPU upload completes',async()=>{
 let finish,uploads=0,disposed=0;const submitted=new Promise(resolve=>{finish=resolve;}),renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>submitted}}},initTexture(){uploads++;}},bank=createBakedWalkBank({renderer,load:async species=>({meta:{species},texture:new DataTexture(),dispose(){disposed++;}})}),a=bank.get('hyena'),b=bank.get('hyena');
 for(let n=0;n<10&&!uploads;n++)await new Promise(resolve=>setImmediate(resolve));assert.equal(uploads,1);assert.equal(bank.status().species[0].ready,false);finish();assert.equal(await a,await b);assert.equal(bank.status().species[0].ready,true);bank.dispose();assert.equal(disposed,1);
});

test('bank closure cancels publication and retains an uploading walking texture',async()=>{
 let finish,uploads=0,disposed=0;const registry=createWebGpuResourceRegistry(),submitted=new Promise(resolve=>{finish=resolve;}),renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:()=>submitted}}},initTexture(){uploads++;}},bank=createBakedWalkBank({renderer,resourceRegistry:registry,load:async species=>({meta:{species},texture:new DataTexture(),dispose(){disposed++;}})}),pending=bank.get('lion');
 for(let n=0;n<10&&!uploads;n++)await new Promise(resolve=>setImmediate(resolve));assert.equal(uploads,1);assert.equal(registry.status().owned.length,1);registry.dispose();const rejected=assert.rejects(pending,{name:'AbortError'});bank.dispose();await rejected;assert.equal(disposed,0);finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(disposed,1);assert.equal(registry.status().owned.length,0);
});

test('direct bake lease retains the same texture and releases exactly once after closure',()=>{const registry=createWebGpuResourceRegistry(),texture=new DataTexture(),source={texture,meta:{species:'hyena'},dispose(){texture.dispose();}},owned=ownDirectBakedWalkAsset(source,registry);let disposed=0;texture.addEventListener('dispose',()=>disposed++);assert.equal(owned.texture,texture);registry.dispose();assert.equal(registry.status().owned.length,1);owned.dispose();owned.dispose();assert.equal(disposed,1);assert.equal(registry.status().owned.length,0);});


test('running catalogue loads source-matched baked clips for all species',async()=>{
 for(const [species,config] of Object.entries(ANIMAL_ACTIONS.animals)){
  const asset=await loadBakedAnimalRunAsset(species,{fetcher:fetchFile,subtle:webcrypto.subtle});
  assert.equal(asset.meta.clip,'Running');assert.equal(asset.meta.sourceSha256,sha(await readFile('public'+config.url)));assert.ok(asset.texture.isDataTexture);asset.dispose();
 }
});
