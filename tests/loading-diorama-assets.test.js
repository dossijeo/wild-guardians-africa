import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Assets} from '../src/rendering/assets.js';
import {WorldScene} from '../src/rendering/scene.js';
import {loadDioramaSharedAssets} from '../src/rendering/loading-diorama-assets.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(t){
 const previous=globalThis.fetch,requests=[];globalThis.fetch=async(url,options)=>{requests.push({url,signal:options.signal});const value=url.includes('models.json')?[{source:'CultivosV4',url:'crops.glb'}]:url.includes('crop-bridges.json')?{recipeVersion:4,bakedAsset:'bridges.glb'}:{canyons:{base:'soil'}};return {ok:true,json:async()=>value};};t.after(()=>{globalThis.fetch=previous;});
 const sky=deferred(),maize=deferred(),bridges=deferred(),calls=[],assets=new Assets();assets.loader.loadAsync=url=>{calls.push(url);return url==='crops.glb'?maize.promise:bridges.promise;};
 const world=Object.assign(Object.create(WorldScene.prototype),{loading:new AbortController(),assets,sky:{load:()=>sky.promise}});const gltf={scene:new THREE.Group()},baked={scene:new THREE.Group()};gltf.scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();for(let i=0;i<32;i++){const mesh=new THREE.Mesh(geometry,material);mesh.userData.bridgeIndex=i;baked.scene.add(mesh);}t.after(()=>assets.disposeModels());
 return {world,sky,maize,bridges,calls,requests,gltf,baked};
}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('parallel shared preparation requests exact maize and bridges while sky remains pending; final adoption still waits sky',async t=>{
 const f=fixture(t);let complete=false;const pending=loadDioramaSharedAssets(f.world,{parallel:true}).then(x=>{complete=true;return x;});await turn();assert.deepEqual(f.calls,['crops.glb','bridges.glb']);assert.equal(f.requests.length,3);assert.ok(f.requests.every(x=>x.signal===f.world.loading.signal));f.maize.resolve(f.gltf);f.bridges.resolve(f.baked);await turn();assert.equal(complete,false);f.sky.resolve();const result=await pending;assert.equal(result.gltf,f.gltf);assert.equal(result.preparedBridges.bakedTemplates.size,32);assert.equal(await f.world.assets.model('crops.glb'),f.gltf);assert.equal(await f.world.assets.model('bridges.glb'),f.baked);assert.equal(f.calls.length,2);
});
test('normal diorama preparation keeps sky-first order and does not fetch models after presentation closes',async t=>{
 const f=fixture(t);let closed=false;const pending=loadDioramaSharedAssets(f.world,{cancelled:()=>closed});await turn();assert.equal(f.requests.length,0);assert.equal(f.calls.length,0);closed=true;f.sky.resolve();await assert.rejects(pending,/cancelled/);assert.equal(f.requests.length,0);assert.equal(f.calls.length,0);
});
test('parallel owner cancellation does not adopt late resources; the shared Assets owner releases them once',async t=>{
 const f=fixture(t),pending=loadDioramaSharedAssets(f.world,{parallel:true});await turn();let disposals=0;const resources=new Set();for(const root of [f.gltf.scene,f.baked.scene])root.traverse(mesh=>{if(mesh.isMesh){resources.add(mesh.geometry);resources.add(mesh.material);}});for(const resource of resources)resource.addEventListener('dispose',()=>disposals++);f.world.disposed=true;f.world.loading.abort();f.world.assets.disposeModels();await assert.rejects(pending,/cancel/);f.sky.resolve();f.maize.resolve(f.gltf);f.bridges.resolve(f.baked);await turn();assert.equal(disposals,resources.size);assert.equal(f.world.assets.ownedResources.size,0);assert.equal(f.world.assets.modelSources.size,0);
});
test('parallel preparation preserves native model failure and observes later sky rejection',async t=>{
 const f=fixture(t),original=Error('model failed'),pending=loadDioramaSharedAssets(f.world,{parallel:true});await turn();f.maize.reject(original);await assert.rejects(pending,error=>error===original);f.sky.reject(Error('later sky'));f.bridges.resolve(f.baked);await turn();
});
test('sky failure is preserved while late shared models remain owned, without diorama disposing world prototypes',async t=>{
 const f=fixture(t),original=Error('sky failed'),pending=loadDioramaSharedAssets(f.world,{parallel:true});await turn();f.sky.reject(original);await assert.rejects(pending,error=>error===original);f.maize.resolve(f.gltf);f.bridges.resolve(f.baked);await turn();assert.ok(f.world.assets.ownedResources.size>0);assert.equal(f.world.assets.modelsDisposed,undefined);assert.equal(await f.world.assets.model('crops.glb'),f.gltf);
});
