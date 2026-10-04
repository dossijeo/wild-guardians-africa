import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {Assets} from '../src/rendering/assets.js';


test('cold raid models hold simulation until the actor is attached, even when first loaded offscreen',async()=>{
 const world=Object.create(WorldScene.prototype),animal={id:'a',species:'warthog',status:'attacking',hitsRemaining:2};
 world.state={raid:{animals:[animal]},elapsed:0};world.objects=new Map([['a',new THREE.Group()]]);world.mixers=new Map();world.models=[{source:'Facoquero',url:'animal.glb'}];
 let resolve;world.assets={model:()=>new Promise(done=>resolve=done)};let initialized=false;
 world.updateActor=()=>{initialized=true;};const pending=world.actor(animal,'animal');assert.equal(world.raidReady(),false);
 const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));resolve({scene,animations:[]});await pending;
 assert.equal(initialized,true);assert.equal(world.raidReady(),true);assert.equal(world.objects.get('a').children.length,1);
 animal.status='gone';world.mixers.clear();assert.equal(world.raidReady(),true);
});
test('a delayed actor cannot attach to a replacement group or a disposed world',async()=>{
 for(const mode of ['replace','dispose']){const world=Object.create(WorldScene.prototype),animal={id:'a',species:'warthog'};world.state={};world.objects=new Map([['a',new THREE.Group()]]);world.models=[{source:'Facoquero',url:'a'}];let resolve;world.assets={model:()=>new Promise(done=>resolve=done)};world.mixers=new Map();const pending=world.actor(animal,'animal');if(mode==='replace')world.objects.set('a',new THREE.Group());else world.disposed=true;resolve({scene:new THREE.Group(),animations:[]});await pending;assert.equal(world.mixers.size,0);assert.equal(world.objects.get('a').children.length,0);}
});
test('a rejected GLB download can be retried rather than leaving a permanently rejected cache entry',async()=>{
 const assets=new Assets();let requests=0;assets.loader={loadAsync:()=>++requests===1?Promise.reject(Error('network')):Promise.resolve({scene:new THREE.Group()})};await assert.rejects(assets.model('a.glb'),/network/);assert.equal(assets.cache.has('a.glb'),false);assert.ok((await assets.model('a.glb')).scene);assert.equal(requests,2);
});
test('leaving before a prewarmed model is used releases its geometry, material and textures once',async()=>{const assets=new Assets(),scene=new THREE.Group(),geometry=new THREE.BoxGeometry(),map=new THREE.Texture(),material=new THREE.MeshBasicMaterial({map}),disposed=[];for(const [name,resource] of Object.entries({geometry,map,material}))resource.addEventListener('dispose',()=>disposed.push(name));scene.add(new THREE.Mesh(geometry,material));assets.loader={loadAsync:()=>Promise.resolve({scene})};await assets.model('a');assets.disposeModels(new THREE.Scene());assets.disposeModels(new THREE.Scene());assert.deepEqual(disposed.sort(),['geometry','map','material']);});
test('a cold actor retries a transient failure with backoff instead of remaining an empty group',async()=>{const world=Object.create(WorldScene.prototype),root=new THREE.Group(),entity={id:'a'},errors=[];world.objects=new Map([['a',root]]);world.onError=e=>errors.push(e);let attempts=0;world.actor=async()=>{if(++attempts===1)throw Error('network');root.add(new THREE.Group());};world.requestActor(entity,'animal',root);await new Promise(done=>setImmediate(done));assert.equal(root.userData.actorLoading,false);assert.ok(root.userData.actorRetryAt>performance.now());world.requestActor(entity,'animal',root);assert.equal(attempts,1);root.userData.actorRetryAt=0;world.requestActor(entity,'animal',root);await new Promise(done=>setImmediate(done));assert.equal(attempts,2);assert.equal(root.children.length,1);assert.equal(errors.length,1);});
