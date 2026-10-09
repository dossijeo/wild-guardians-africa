import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {BiomeGround} from '../src/rendering/biome-ground.js';
import {MudPatches} from '../src/rendering/mud-patches.js';
test('phase barrier rejects late results and releases an unregistered template',async()=>{
 const world=Object.create(WorldScene.prototype);let finish,released=0;const pending=world.loadReady(new Promise(resolve=>finish=resolve),()=>released++);world.disposed=true;finish({});await assert.rejects(pending,/cancelada/);assert.equal(released,1);
});
test('late building template cannot enter the cache; an already owned template is not released twice',async()=>{
 for(const owned of [false,true]){const world=Object.create(WorldScene.prototype);let finish,released=0;const template={dispose:()=>released++};world.buildingTemplates=new Map();world.buildingCatalogue=[{culture:'mapungubwe'}];world.assets={building:()=>new Promise(resolve=>finish=resolve)};
 const pending=world.ensureBuilding('mapungubwe');world.disposed=true;if(owned)world.buildingTemplates.set('mapungubwe',template);finish(template);await assert.rejects(pending,/cancelada/);assert.equal(released,owned?0:1);assert.equal(world.buildingTemplates.size,owned?1:0);}
});
test('closed warm-up does not mark late models as prepared',async()=>{
 const world=Object.create(WorldScene.prototype);world.warmedAnimals=new Set();world.models=[{source:'Facoquero'}];let finish;world.animalPreload={warm:()=>new Promise(resolve=>finish=resolve)};const pending=world.warmAnimalModels(['warthog']);world.disposed=true;finish({});await assert.rejects(pending,/cancelada/);assert.equal(world.warmedAnimals.size,0);
});
test('ground catalogue arriving after close cannot request or create textures',async t=>{
 let finish,calls=0;const ground=new BiomeGround();t.mock.method(globalThis,'fetch',()=>new Promise(resolve=>finish=()=>resolve({ok:true,json:async()=>({savanna:{base:'base'}})})));
 const pending=ground.load({texture:()=>calls++},'savanna',{},{});ground.dispose();finish();await assert.rejects(pending,/cancelled/);assert.equal(calls,0);assert.equal(ground.textures.length,0);assert.equal(ground.loading.signal.aborted,true);
});
test('late ground and mud textures are not cloned and borrowed sources are preserved',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({savanna:{base:'base'}})}));
 for(const kind of ['ground','mud']){
  const component=kind==='ground'?new BiomeGround():new MudPatches(),source=new THREE.Texture();let finish,clones=0,disposals=0;
  source.addEventListener('dispose',()=>disposals++);const clone=source.clone;t.mock.method(source,'clone',function(){clones++;return clone.call(this);});
  const assets={texture:()=>new Promise(resolve=>finish=resolve)},pending=kind==='ground'?component.load(assets,'savanna',{},{}):component.load(assets,{base:'base'});
  await new Promise(resolve=>setImmediate(resolve));component.dispose();finish(source);await assert.rejects(pending,/cancelled/);assert.equal(clones,0);assert.equal(disposals,0);assert.equal(component.textures.length,0);
 }
});
test('mud failure frees completed private clones without disposing borrowed originals',async()=>{
 const component=new MudPatches(),source=new THREE.Texture();let calls=0,cloneDisposals=0,sourceDisposals=0;source.addEventListener('dispose',()=>sourceDisposals++);const clone=source.clone;source.clone=function(){const result=clone.call(this);result.addEventListener('dispose',()=>cloneDisposals++);return result;};
 await assert.rejects(component.load({texture:async()=>{if(++calls===2)throw Error('network');return source;}},{base:'base',normal:'normal'}),/network/);assert.equal(cloneDisposals,1);assert.equal(sourceDisposals,0);assert.equal(component.textures.length,0);component.dispose();assert.equal(cloneDisposals,1);
});


test('owner cancellation stops waiting for a loader that never resolves',async()=>{
 const world=Object.create(WorldScene.prototype);world.loading=new AbortController();const pending=world.loadReady(new Promise(()=>{}));world.loading.abort();await assert.rejects(pending,/cancelada/);
});

test('cancelled waiting still releases a late uniquely owned result once',async()=>{
 const world=Object.create(WorldScene.prototype);world.loading=new AbortController();let finish,releases=0;const asset={};const pending=world.loadReady(new Promise(resolve=>finish=resolve),value=>{assert.equal(value,asset);releases++;});world.loading.abort();await assert.rejects(pending,/cancelada/);assert.equal(releases,0);finish(asset);await new Promise(resolve=>setImmediate(resolve));assert.equal(releases,1);
});

test('cancelled waiting observes a late loader rejection without adoption',async()=>{
 const world=Object.create(WorldScene.prototype);world.loading=new AbortController();let fail;const pending=world.loadReady(new Promise((resolve,reject)=>fail=reject));world.loading.abort();await assert.rejects(pending,/cancelada/);fail(Error('late decode failure'));await new Promise(resolve=>setImmediate(resolve));
});


test('loading milestone aborts even if its actual frame never arrives',async()=>{
 const world=Object.create(WorldScene.prototype);world.loading=new AbortController();const updates=[];world.loadingProgress={update:id=>updates.push(id)};
 const pending=world.loadingMilestone('sky',{nextFrame:()=>new Promise(()=>{})});world.loading.abort();await assert.rejects(pending,/cancelled/);assert.deepEqual(updates,['sky']);
});
test('loading milestone uses one real frame and rejects a stalled deadline',async()=>{
 const world=Object.create(WorldScene.prototype);world.loading=new AbortController();world.loadingProgress={update:()=>{}};let frames=0;
 await world.loadingMilestone('sky',{nextFrame:async()=>{frames++;}});assert.equal(frames,1);
 let clock=0;await assert.rejects(world.loadingMilestone('biome',{timeout:5,now:()=>clock,nextFrame:()=>{clock=6;return new Promise(()=>{});}}),/timed out/);
});
test('cancelled milestone cannot publish another stage; ordinary worlds acquire no frame',async()=>{
 const world=Object.create(WorldScene.prototype);world.loading=new AbortController();let updates=0,frames=0;world.loadingProgress={update:()=>updates++};world.loading.abort();
 await assert.rejects(world.loadingMilestone('sky',{nextFrame:async()=>frames++}),/cancelled/);assert.equal(updates,0);assert.equal(frames,0);
 world.loadingProgress=null;await world.loadingMilestone('sky',{nextFrame:async()=>frames++});assert.equal(frames,0);
});

test('cancelled milestone releases its owned suspended RAF handle',async t=>{
 const world=Object.create(WorldScene.prototype);world.loading=new AbortController();world.loadingProgress={update:()=>{}};let requested=0;const cancelled=[];
 for(const name of ['requestAnimationFrame','cancelAnimationFrame']){const descriptor=Object.getOwnPropertyDescriptor(globalThis,name);t.after(()=>{if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];});}
 Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:()=>{requested++;return 47;}});Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:handle=>cancelled.push(handle)});
 const pending=world.loadingMilestone('sky');world.loading.abort();await assert.rejects(pending,/cancelled/);assert.equal(requested,1);assert.deepEqual(cancelled,[47]);
});
