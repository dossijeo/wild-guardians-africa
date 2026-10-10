import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {overlapLoadingResources,loadingResourceOverlapEnabled} from '../src/rendering/loading-resource-overlap.js';
import {Assets} from '../src/rendering/assets.js';
import {WorldScene} from '../src/rendering/scene.js';
import {LoadingDiorama} from '../src/rendering/loading-diorama.js';
import {loadCropBridges} from '../src/rendering/crop-library.js';
import {readFileSync} from 'node:fs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

test('sky and catalogues start together; all four resources start after catalogues and adoption waits for every resource and sky',async()=>{
 const sky=deferred(),cats=deferred(),loads=Array.from({length:4},deferred),calls=[];
 const pending=overlapLoadingResources({assertOpen:()=>{},sky:()=>{calls.push('sky');return sky.promise;},catalogues:()=>{calls.push('cats');return cats.promise;},resources:data=>{assert.equal(data,'catalogues');return loads.map((load,i)=>()=>{calls.push(i);return load.promise;});}});
 await flush();assert.deepEqual(calls,['sky','cats']);cats.resolve('catalogues');await flush();assert.deepEqual(calls,['sky','cats',0,1,2,3]);
 let adopted=false;pending.then(()=>adopted=true);loads.forEach((p,i)=>p.resolve(i));await flush();assert.equal(adopted,false);sky.resolve();assert.deepEqual(await pending,[0,1,2,3]);
});

test('early sky failure and synchronous resource failure propagate while all late sibling rejections are observed',async()=>{
 for(const fail of ['sky','resource']){
  const sky=deferred(),cats=deferred(),late=deferred(),error=Error(fail);
  const pending=overlapLoadingResources({assertOpen:()=>{},sky:()=>sky.promise,catalogues:()=>cats.promise,resources:()=>[()=>{if(fail==='resource')throw error;return late.promise;},()=>late.promise]});
  const rejected=assert.rejects(pending,e=>e===error);
  if(fail==='sky')sky.reject(error);cats.resolve();await flush();if(fail==='resource')sky.resolve();await rejected;late.reject(Error('late sibling'));await flush();
 }
});

test('abort after catalogues prevents all resource starts; closed owner rejects before adoption',async()=>{
 let closed=false,starts=0;const check=()=>{if(closed)throw Error('closed');},cats=deferred();
 const pending=overlapLoadingResources({assertOpen:check,sky:async()=>{},catalogues:()=>cats.promise,resources:()=>[()=>starts++]});
 await flush();closed=true;cats.resolve();await assert.rejects(pending,/closed/);assert.equal(starts,0);
 const load=deferred();closed=false;const second=overlapLoadingResources({assertOpen:check,sky:async()=>{},catalogues:async()=>[],resources:()=>[()=>load.promise]});await flush();closed=true;load.resolve('late');await assert.rejects(second,/closed/);
});

test('actual Assets URL cache and V4 bridge loader reuse the same model promises without making private rigs or disposing borrowed models',async()=>{
 const assets=new Assets(),calls=[],scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();
 for(let i=0;i<32;i++){const mesh=new THREE.Mesh(geometry,material);mesh.userData.bridgeIndex=i;scene.add(mesh);}
 const model={scene};assets.loader.loadAsync=async url=>{calls.push(url);return model;};let disposes=0;geometry.addEventListener('dispose',()=>disposes++);
 const resources=await overlapLoadingResources({assertOpen:()=>assets.assertOpen(),sky:async()=>{},catalogues:async()=>[],resources:()=>[()=>assets.model('/steady.glb'),()=>loadCropBridges({recipeVersion:4,bakedAsset:'/bridges.glb'},url=>assets.model(url)),async()=>null,async()=>null]});
 assert.equal(resources[1].bakedTemplates.size,32);assert.strictEqual(await assets.model('/steady.glb'),resources[0]);await loadCropBridges({recipeVersion:4,bakedAsset:'/bridges.glb'},url=>assets.model(url));assert.deepEqual(calls,['/steady.glb','/bridges.glb']);assert.equal(disposes,0);assets.disposeModels();assert.equal(disposes,1);
});

test('real World.loadReady cancellation rejects scheduling, and original backdrop late-arrival disposer releases its private texture exactly once',async()=>{
 const loading=new AbortController(),world=Object.assign(Object.create(WorldScene.prototype),{loading,assets:{textures:{loadAsync:()=>atlas.promise}}}),atlas=deferred();
 const owner=Object.assign(Object.create(LoadingDiorama.prototype),{world,abort:new AbortController()}),texture=new THREE.Texture();let disposes=0;texture.addEventListener('dispose',()=>disposes++);
 const pending=overlapLoadingResources({assertOpen:()=>{if(owner.disposed)throw Error('closed');},sky:async()=>{},catalogues:async()=>[],resources:()=>[()=>world.loadReady(owner.loadBackdropTexture('/atlas.webp'))]});
 await flush();owner.disposed=true;loading.abort();await assert.rejects(pending,/cancelada/);atlas.resolve(texture);await flush();assert.equal(disposes,1);assert.equal(owner.backdropTexture,undefined);
});

test('candidate is OFF by default and does not change setup, warming, shader variants or fences',()=>{
 const source=readFileSync(new URL('../src/rendering/loading-diorama.js',import.meta.url),'utf8');assert.match(source,/resourceOverlap=false/);
 assert.match(source,/if\(this.resourceOverlap\)/);const tail=source.slice(source.indexOf('    const layout=mountains.arcLayout'));
 const original=readFileSync(new URL('../docs/qa/windows-loading-regression/resource-overlap-candidate/warm-tail-original.txt',import.meta.url),'utf8');assert.equal(tail,original);
 const app=readFileSync(new URL('../src/app/main.js',import.meta.url),'utf8');assert.match(app,/resourceOverlap:loadingResourceOverlapEnabled\(\)/);
});


test('actual diorama prepare dispatches the four existing loaders before sky finishes, then reaches the same adoption boundary without early GPU work',async()=>{
 const originalFetch=globalThis.fetch,sky=deferred(),model=deferred(),bridge=deferred(),soil=deferred(),atlas=deferred(),calls=[],stop=Error('stop at private texture adoption');
 const bridgeScene=new THREE.Scene();for(let i=0;i<32;i++){const mesh=new THREE.Mesh();mesh.userData.bridgeIndex=i;bridgeScene.add(mesh);}
 globalThis.fetch=async url=>{calls.push(String(url));const data=String(url).includes('models.json')?[{source:'Cultivos',url:'/steady.glb'}]:String(url).includes('crop-bridges.json')?{recipeVersion:4,bakedAsset:'/bridges.glb'}:{canyons:{base:'/soil.webp'}};return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});};
 const loading=new AbortController(),world=Object.assign(Object.create(WorldScene.prototype),{loading,sky:{load:()=>{calls.push('sky');return sky.promise;}},assets:{model:url=>{calls.push(url);return url==='/steady.glb'?model.promise:bridge.promise;},texture:(url,color)=>{calls.push([url,color]);return soil.promise;},textures:{loadAsync:url=>{calls.push(['atlas',url]);return atlas.promise;}}}});
 let adopted=0;const owner=Object.assign(Object.create(LoadingDiorama.prototype),{world,resourceOverlap:true,abort:new AbortController(),ground:{material:{}},textureOwner:{borrow:()=>{adopted++;throw stop;}}});
 try{
  const pending=owner.prepare(),rejected=assert.rejects(pending,e=>e===stop);
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(calls.includes('sky'));assert.ok(calls.includes('/steady.glb'));assert.ok(calls.includes('/bridges.glb'));assert.deepEqual(calls.find(c=>Array.isArray(c)&&c[0]==='/soil.webp'),['/soil.webp',false]);assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='atlas'));assert.equal(adopted,0);
  model.resolve({scene:new THREE.Scene()});bridge.resolve({scene:bridgeScene});soil.resolve(new THREE.Texture());atlas.resolve(new THREE.Texture());await flush();assert.equal(adopted,0);sky.resolve();await rejected;assert.equal(adopted,1);assert.ok(owner.backdropTexture);
 }finally{globalThis.fetch=originalFetch;owner.backdropTexture?.dispose();bridgeScene.children.forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();});}
});


test('smoke selection requires both explicit booleans; normal gameplay does not read experimental selection',()=>{
 for(const host of [{},{__desktopSmokeStarted:true},{__desktopSmokeResourceOverlap:true},{__desktopSmokeStarted:false,__desktopSmokeResourceOverlap:true},{__desktopSmokeStarted:true,__desktopSmokeResourceOverlap:'true'}])assert.equal(loadingResourceOverlapEnabled(host),false);
 assert.equal(loadingResourceOverlapEnabled({__desktopSmokeStarted:true,__desktopSmokeResourceOverlap:true}),true);
 assert.equal(loadingResourceOverlapEnabled({get __desktopSmokeResourceOverlap(){throw Error('normal read');}}),false);
 const rust=readFileSync(new URL('../src-tauri/src/main.rs',import.meta.url),'utf8'),smoke=readFileSync(new URL('../src-tauri/smoke.js',import.meta.url),'utf8'),workflow=readFileSync(new URL('../.github/workflows/windows.yml',import.meta.url),'utf8');
 assert.ok(rust.indexOf('arg == "--smoke-report"')<rust.indexOf('arg == "--smoke-resource-overlap"'));assert.match(smoke,/loadingRecipe=\{[^\n]*resourceOverlap:window\.__desktopSmokeResourceOverlap===true/);
 assert.match(smoke,/worldStartedAt \+ 90000/);assert.match(workflow,/resource_overlap:[\s\S]*?default: false/);assert.equal((workflow.match(/inputs\.resource_overlap/g)||[]).length,2);assert.match(workflow,/WaitForExit\(240000\)/);assert.match(workflow,/WaitForExit\(900000\)/);
});

test('actual prepare sibling rejection closes presentation through dispose, observes late failures and releases pending atlas exactly once',async()=>{
 const originalFetch=globalThis.fetch,sky=deferred(),model=deferred(),bridge=deferred(),soil=deferred(),atlas=deferred(),errors=[],error=Error('model rejected'),texture=new THREE.Texture();let disposes=0,adoptions=0;texture.addEventListener('dispose',()=>disposes++);
 const unhandled=reason=>errors.push(reason);process.on('unhandledRejection',unhandled);
 globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('models.json')?[{source:'Cultivos',url:'/steady.glb'}]:String(url).includes('crop-bridges.json')?{recipeVersion:4,bakedAsset:'/bridges.glb'}:{canyons:{base:'/soil.webp'}}),{status:200,headers:{'content-type':'application/json'}});
 const world=Object.assign(Object.create(WorldScene.prototype),{loading:new AbortController(),sky:{load:()=>sky.promise},assets:{model:url=>url==='/steady.glb'?model.promise:bridge.promise,texture:()=>soil.promise,textures:{loadAsync:()=>atlas.promise}}}),release=()=>{};
 const owner=Object.assign(Object.create(LoadingDiorama.prototype),{world,resourceOverlap:true,abort:new AbortController(),mist:{dispose:release},ground:{geometry:{dispose:release},material:{dispose:release}},textureOwner:{borrow:()=>{adoptions++;},dispose:release},toon:{shadowUniforms:{uNativeShadowFiltered:{value:null},fallback:{dispose:release}}},scene:{clear:release}});
 try{
  const failed=owner.prepare().catch(failure=>{owner.dispose();throw failure;}),rejected=assert.rejects(failed,e=>e===error);
  for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));model.reject(error);await rejected;assert.equal(owner.disposed,true);assert.equal(owner.abort.signal.aborted,true);
  atlas.resolve(texture);bridge.reject(Error('late bridge'));soil.reject(Error('late soil'));sky.reject(Error('late sky'));for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(disposes,1);assert.equal(owner.backdropTexture,undefined);assert.equal(adoptions,0);assert.deepEqual(errors,[]);owner.dispose();assert.equal(disposes,1);
 }finally{world.loading.abort();sky.resolve();model.resolve();bridge.resolve();soil.resolve();atlas.resolve(texture);await flush();globalThis.fetch=originalFetch;process.off('unhandledRejection',unhandled);}
});
