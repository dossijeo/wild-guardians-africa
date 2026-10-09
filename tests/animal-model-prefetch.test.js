import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Assets} from '../src/rendering/assets.js';
import {resolveAssetValues} from '../src/rendering/asset-url.js';
import {AnimalPreload} from '../src/rendering/animal-preload.js';
import {WorldScene} from '../src/rendering/scene.js';
import {startAnimalModelPrefetch} from '../src/rendering/animal-model-prefetch.js';
const sources={warthog:'Facoquero',hyena:'Hiena',buffalo:'Bufalo',lion:'Leon',rhino:'Rinoceronte'};
const catalogue=resolveAssetValues(JSON.parse(readFileSync('public/content/models.json','utf8')));
const descriptors=Object.values(sources).map(source=>catalogue.find(model=>model.source.includes(source)));
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  const assets=new Assets(),calls=[],finish=new Map(),models=new Map();
  assets.loader.loadAsync=url=>{calls.push(url);return new Promise((resolve,reject)=>finish.set(url,{resolve,reject}));};
  const world={assets,loading:new AbortController(),disposed:false,loadReady:WorldScene.prototype.loadReady};
  for(const descriptor of descriptors){const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));models.set(descriptor.url,{scene,animations:[new THREE.AnimationClip('Running',1,[new THREE.VectorKeyframeTrack('.position',[0,1],[0,0,0,0,0,0])])]});}
  const done=()=>{for(const [url,pending] of finish)pending.resolve(models.get(url));};
  const dispose=()=>{world.disposed=true;world.loading.abort();assets.disposeModels();};
  return {world,assets,calls,finish,models,done,dispose};
}
function start(f){return startAnimalModelPrefetch(f.world,sources,{loadCatalogue:async(url,{signal})=>{assert.equal(url,'/content/models.json');assert.equal(signal,f.world.loading.signal);return catalogue;}});}

test('same five exact URLs use real Assets cache; normal rigs are created only by the later warm stage',async()=>{
  const f=fixture(),plan=start(f);await turn();assert.deepEqual(f.calls,descriptors.map(d=>d.url));assert.equal(f.world.animalPreload,undefined);
  f.done();await plan.ready;assert.equal(f.assets.modelSources.size,5);
  const preload=new AnimalPreload(f.assets,id=>catalogue.find(model=>model.source.includes(sources[id])));f.world.animalPreload=preload;f.world.models=catalogue;f.world.warmedAnimals=new Set();
  assert.equal(preload.entries.size,0);await WorldScene.prototype.warmAnimalModels.call(f.world,Object.keys(sources));
  assert.equal(preload.entries.size,5);assert.equal((await preload.spares()).length,5);assert.equal(f.calls.length,5);
  for(const descriptor of descriptors)assert.equal(await f.assets.model(descriptor.url),f.models.get(descriptor.url));
  preload.dispose();f.dispose();
});

test('ready waits all five models, including the last unresolved model',async()=>{
  const f=fixture(),plan=start(f);let ready=false;plan.ready.then(()=>ready=true);await turn();
  for(const descriptor of descriptors.slice(0,4))f.finish.get(descriptor.url).resolve(f.models.get(descriptor.url));await turn();assert.equal(ready,false);
  f.finish.get(descriptors[4].url).resolve(f.models.get(descriptors[4].url));await plan.ready;assert.equal(ready,true);f.dispose();
});

test('early model rejection is handled immediately and the exact error reaches normal readiness',async()=>{
  const f=fixture(),plan=start(f);await turn();const failure=Error('original GLB failure');f.finish.get(descriptors[0].url).reject(failure);
  await turn();await assert.rejects(plan.ready,error=>error===failure);f.done();await turn();f.dispose();
});

test('catalogue failure is observed without requests and preserved for both consumers',async()=>{
  const f=fixture(),failure=Error('catalogue failure'),plan=startAnimalModelPrefetch(f.world,sources,{loadCatalogue:async()=>{throw failure;}});
  await turn();await assert.rejects(plan.catalogue,error=>error===failure);await assert.rejects(plan.ready,error=>error===failure);assert.equal(f.calls.length,0);f.dispose();
});

test('abort rejects promptly while GLTFs are pending and late real Assets ownership disposes every private resource',async()=>{
  const f=fixture(),plan=start(f);await turn();let geometries=0,materials=0;
  for(const model of f.models.values())model.scene.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.addEventListener('dispose',()=>geometries++);mesh.material.addEventListener('dispose',()=>materials++);}});
  f.dispose();await assert.rejects(plan.ready,/cancelada/);assert.equal(f.world.animalPreload,undefined);f.done();await turn();
  assert.equal(geometries,5);assert.equal(materials,5);assert.equal(f.assets.ownedResources.size,0);assert.equal(f.assets.modelSources.size,0);
});

test('already aborted owner and late catalogue delivery cannot start models',async()=>{
  const f=fixture();f.dispose();const plan=start(f);await assert.rejects(plan.ready,/cancelada/);assert.equal(f.calls.length,0);
  const late=fixture();let finish;const next=startAnimalModelPrefetch(late.world,sources,{loadCatalogue:()=>new Promise(resolve=>finish=resolve)});await turn();late.dispose();await assert.rejects(next.ready,/cancelada/);finish(catalogue);await turn();assert.equal(late.calls.length,0);
});

test('missing descriptor fails before any model starts',async()=>{
  const f=fixture(),plan=startAnimalModelPrefetch(f.world,sources,{loadCatalogue:async()=>catalogue.filter(model=>!model.source.includes('Rinoceronte'))});
  await assert.rejects(plan.ready,/Falta el modelo de rhino/);assert.equal(f.calls.length,0);f.dispose();
});

test('real World.load starts opt-in prefetch during sky wait, default does not; no rigs or GPU preparation advance',async()=>{
  const previousFetch=globalThis.fetch,previousFlag=globalThis.__desktopSmokeAnimalPrefetch;
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify(catalogue),{headers:{'content-type':'application/json'}});
    for(const enabled of [undefined,false,true]){
      globalThis.__desktopSmokeAnimalPrefetch=enabled;const f=fixture();let stopSky;const failure=Error('stop before world adoption');f.world.sky={load:()=>new Promise((_,reject)=>stopSky=reject)};
      const load=WorldScene.prototype.load.call(f.world,{},{});const failed=assert.rejects(load,error=>error===failure);await turn();
      assert.equal(f.calls.length,enabled?5:0);assert.equal(f.world.animalPreload,undefined);assert.equal(f.world.warmedAnimals,undefined);
      stopSky(failure);await failed;f.dispose();f.done();await turn();
    }
  }finally{globalThis.fetch=previousFetch;if(previousFlag===undefined)delete globalThis.__desktopSmokeAnimalPrefetch;else globalThis.__desktopSmokeAnimalPrefetch=previousFlag;}
});
