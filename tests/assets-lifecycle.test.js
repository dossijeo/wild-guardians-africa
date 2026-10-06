import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Assets} from '../src/rendering/assets.js';
const counts=resources=>{const result=new Map();for(const r of resources){result.set(r,0);r.addEventListener('dispose',()=>result.set(r,result.get(r)+1));}return result;};
test('offscene packed prototypes and standalone textures are owned and released once; caches clear',async t=>{
 t.mock.method(globalThis,'fetch',async url=>{const b=readFileSync(new URL('../public'+url,import.meta.url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};});
 const assets=new Assets();assets.textures={loadAsync:async()=>new THREE.Texture()};
 const pack=JSON.parse(readFileSync(new URL('../public/content/biome-savanna.json',import.meta.url))),village=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url)))[0],walls=JSON.parse(readFileSync(new URL('../public/content/walls.json',import.meta.url)));
 await assets.biome(pack);await assets.village(village);await assets.walls({...walls,pieces:{[Object.keys(walls.pieces)[0]]:Object.values(walls.pieces)[0]}});await assets.texture('unused.png');
 const watched=counts([...assets.ownedResources]);assert.ok(watched.size>10);
 assets.disposeModels();assets.disposeModels();assert.ok([...watched.values()].every(n=>n===1));assert.equal(assets.ownedResources.size,0);assert.equal(assets.cache.size,0);assert.equal(assets.modelSources.size,0);
 await assert.rejects(assets.texture('new.png'),/disposed/);await assert.rejects(assets.model('new.glb'),/disposed/);
});
test('scene borrowers can dispose source resources first without causing duplicate disposal at owner close',async()=>{
 const assets=new Assets(),scene=new THREE.Group(),map=new THREE.Texture(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial({map});
 scene.add(new THREE.Mesh(geometry,material));assets.loader={loadAsync:async()=>({scene})};await assets.model('shared');
 const watched=counts([map,geometry,material]);geometry.dispose();material.dispose();assets.disposeModels(scene);
 assert.deepEqual([...watched.values()],[1,1,1]);assert.equal(assets.ownedResources.size,0);
});
test('inflight model and texture finishing after close dispose once without resurrecting caches',async()=>{
 const assets=new Assets(),scene=new THREE.Group(),map=new THREE.Texture(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial({map});scene.add(new THREE.Mesh(geometry,material));
 let finishModel,finishTexture;assets.loader={loadAsync:()=>new Promise(resolve=>finishModel=resolve)};assets.textures={loadAsync:()=>new Promise(resolve=>finishTexture=resolve)};
 const a=assets.model('late'),b=assets.texture('late.png'),watched=counts([map,geometry,material]);assets.disposeModels();finishModel({scene});finishTexture(map);await Promise.all([a,b]);
 assert.deepEqual([...watched.values()],[1,1,1]);assert.equal(assets.cache.size,0);assert.equal(assets.modelSources.size,0);assert.equal(assets.ownedResources.size,0);
});
test('a failed standalone texture is retryable while open',async()=>{
 const assets=new Assets();let attempts=0;assets.textures={loadAsync:async()=>{if(++attempts===1)throw Error('network');return new THREE.Texture();}};
 await assert.rejects(assets.texture('retry'),/network/);assert.equal(assets.cache.size,0);await assets.texture('retry');assert.equal(attempts,2);assets.disposeModels();
});
test('pending building cannot create new procedural resources after its owner closes',async()=>{
 const assets=new Assets();let finish;assets.loader={loadAsync:()=>new Promise(resolve=>finish=resolve)};const pending=assets.building({url:'late.glb'});assets.disposeModels();finish({scene:new THREE.Group()});await assert.rejects(pending,/disposed/);assert.equal(assets.cache.size,0);
});
test('packed biome, village and wall binary loads cannot allocate prototypes after close',async t=>{
 for(const kind of ['biome','village','walls']){
  const pendingFetch=[],assets=new Assets();assets.textures={loadAsync:async()=>new THREE.Texture()};
  t.mock.method(globalThis,'fetch',()=>new Promise(resolve=>pendingFetch.push(()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}))));
  const piece={p:{url:'p'},n:{url:'n'},uv:{url:'uv'},i:{url:'i'},faceRegions:{url:'r'},morph:{}};
  const pending=kind==='biome'?assets.biome({binary:{url:'b'},textures:[],assets:[]}):kind==='village'?assets.village({binary:{url:'v'},vertexBytes:0,indexCount:0,textures:{color:'v.png'},units:[]}):assets.walls({texture:'wall.png',pieces:{block:piece}});
  await new Promise(resolve=>setImmediate(resolve));assert.ok(pendingFetch.length>0);assets.disposeModels();for(const finish of pendingFetch)finish();
  await assert.rejects(pending,/disposed/);assert.equal(assets.ownedResources.size,0);assert.equal(assets.cache.size,0);t.mock.restoreAll();
 }
});
