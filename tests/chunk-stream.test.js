import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {TerrainField,scatterWorld} from '../src/world/terrain.js';
import {buildGroundData} from '../src/rendering/terrain-source.js';
import {nativeChunkWater} from '../src/rendering/water-geometry.js';
import {NativeChunkStream} from '../src/rendering/chunk-stream.js';
import * as THREE from 'three';
import {WorldScene} from '../src/rendering/scene.js';
import {buildNativeChunk} from '../src/rendering/chunk-data.js';

test('real worker returns identical native terrain, water and populations in all biomes and transfers both buffers',async()=>{
 const worker=new Worker(new URL('./fixtures/chunk-worker-node.mjs',import.meta.url));
 try{
  let serial=0;
  for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert'])for(const [cx,cz] of [[0,0],[-1,1]]){
   const pack=JSON.parse(readFileSync('public/content/biome-'+biome+'.json','utf8')),config={seed:'712',biome,relief:1,density:1,river:true,n:1,layers:Array(6).fill(true)},id=++serial;
   const response=new Promise((resolve,reject)=>{let data,audit;const onError=e=>{worker.off('message',onMessage);reject(e);},onMessage=m=>{if(m.id!==id)return;if(m.audit)audit=m;else data=m;if(data&&audit){worker.off('message',onMessage);worker.off('error',onError);resolve({data,audit});}};worker.on('message',onMessage);worker.once('error',onError);});
   worker.postMessage({id,epoch:7,config,profile:pack.profile,cx,cz});const {data:message,audit}=await response;
   assert.equal(message.error,undefined);assert.equal(message.epoch,7);assert.deepEqual(audit.lengths,[0,0]);
   const field=new TerrainField(config),data=message.data;assert.deepEqual(data.terrain,buildGroundData(field,pack.profile,cx,cz));
   const water=nativeChunkWater(field,cx,cz,pack.profile);assert.deepEqual(data.water,water?.attributes.position.array??new Float32Array());water?.dispose();
   assert.deepEqual(data.instances,scatterWorld({...config,cx,cz},pack.profile,field).instances);assert.equal(data.cx,cx);assert.equal(data.cz,cz);
  }
 }finally{await worker.terminate();}
});

function fixture(){
 const messages=[],loaded=new Map(),installed=[],errors=[],scheduled=[];
 const worker={postMessage(m){messages.push(m);},terminate(){this.terminated=true;}};
 const stream=new NativeChunkStream({seed:'712'},{},{loaded:()=>loaded,onData(data){installed.push(data);loaded.set(data.cx+','+data.cz,data);},onError:e=>errors.push(e),workerFactory:()=>worker,build:(c,p,cx,cz)=>({cx,cz,local:true}),schedule:fn=>{scheduled.push(fn);return fn;},cancel:fn=>{const i=scheduled.indexOf(fn);if(i>=0)scheduled.splice(i,1);}});
 const plan=(coords,force=false)=>stream.plan(new Map(coords.map(([cx,cz,score])=>[cx+','+cz,{cx,cz,score}])),force);
 const reply=(request=messages.at(-1),extra={})=>stream.receive({id:request.id,epoch:request.epoch,data:{cx:request.cx,cz:request.cz},...extra});
 return {stream,worker,messages,loaded,installed,errors,scheduled,plan,reply};
}

test('queue dispatches one nearest scored request and ignores late IDs without completing the active job',async()=>{
 const f=fixture();f.plan([[0,0,9],[1,0,2],[2,0,5]]);assert.equal(f.messages.length,1);assert.equal(f.messages[0].cx,1);
 const idle=f.stream.whenIdle();f.reply({...f.messages[0],id:999});assert.equal(f.stream.busy.cx,1);assert.equal(f.installed.length,0);
 f.reply();assert.equal(f.messages.length,2);assert.equal(f.messages[1].cx,2);f.reply();assert.equal(f.messages[2].cx,0);f.reply();assert.deepEqual(await idle,{cancelled:false});assert.deepEqual(f.installed.map(d=>d.cx),[1,2,0]);
 f.plan([[0,0,1],[1,0,2],[2,0,3]]);assert.equal(f.messages.length,3);assert.equal(f.stream.stats.discarded,1);f.stream.dispose();
});

test('travel and forced rebuild discard obsolete responses and regenerate the current epoch',async()=>{
 const f=fixture();f.plan([[0,0,0],[1,0,1]]);const old=f.messages[0];f.plan([[8,0,0]]);f.reply(old);assert.equal(f.installed.length,0);assert.equal(f.messages.at(-1).cx,8);
 const oldEpoch=f.messages.at(-1);f.plan([[8,0,0]],true);f.reply(oldEpoch);assert.equal(f.installed.length,0);assert.equal(f.messages.at(-1).epoch,1);f.reply();assert.equal(f.installed.length,1);assert.equal(f.stream.stats.discarded,2);assert.deepEqual(await f.stream.whenIdle(),{cancelled:false});f.stream.dispose();
});

test('worker failure preserves pending work in asynchronous local mode and dispose cancels it',async()=>{
 const f=fixture();f.plan([[0,0,0],[1,0,1]]);f.worker.onerror(new Error('fixture worker crash'));assert.equal(f.worker.terminated,true);assert.equal(f.stream.summary().worker,false);assert.equal(f.stream.stats.fallbacks,1);assert.equal(f.installed.length,0);
 const idle=f.stream.whenIdle();f.scheduled.shift()();assert.equal(f.installed[0].local,true);f.scheduled.shift()();assert.deepEqual(await idle,{cancelled:false});assert.equal(f.installed.length,2);
 f.plan([[2,0,0]]);const cancelled=f.stream.whenIdle();f.stream.dispose();assert.deepEqual(await cancelled,{cancelled:true});assert.equal(f.scheduled.length,0);f.reply();assert.equal(f.installed.length,2);f.stream.dispose();
});

test('generation and installation failures settle waiters and coordinate mismatches never enter the world',async()=>{
 const f=fixture();f.plan([[0,0,0]]);const idle=f.stream.whenIdle();f.reply(undefined,{data:{cx:2,cz:0}});await assert.rejects(idle,/generar/);assert.equal(f.errors.length,1);assert.equal(f.installed.length,0);
 f.plan([[0,0,0]],true);f.reply(undefined,{error:'fixture generation failure'});await assert.rejects(f.stream.whenIdle(),/generar/);assert.equal(f.errors.length,2);
 f.plan([[5,5,0]]);f.reply();assert.deepEqual(await f.stream.whenIdle(),{cancelled:false});assert.equal(f.installed.length,1);f.stream.dispose();
});

test('scene installs transferred data without regenerating terrain or navigation population on the main thread',()=>{
 const pack=JSON.parse(readFileSync('public/content/biome-grand_river.json','utf8')),config={seed:'712',biome:'grand_river',relief:1,density:1,river:true,n:1,layers:Array(6).fill(true)},data=buildNativeChunk(config,pack.profile,0,0),suppressed=new Set([data.instances.flat()[0].id]);
 const g=new THREE.BoxGeometry(2,3,2);g.computeBoundingBox();const material=new THREE.MeshStandardMaterial(),prototypes=Array.from({length:20},()=>[0,1,2].map(()=>new THREE.Mesh(g,material)));
 const world={buildPropSlot:WorldScene.prototype.buildPropSlot,nav:{field:new TerrainField(config),suppressed,chunk(){throw new Error('Main generation must not run');}},pack,prototypes,quality:'media',terrainMeshes:[],waterPrototypes:Array(20).fill(null),fluidMaterial:new THREE.MeshBasicMaterial(),state:{biome:'gran-rio'}};
 const group=WorldScene.prototype.terrain.call(world,0,0,data),ground=world.terrainMeshes[0];assert.equal(ground.geometry.attributes.position.data.array,data.terrain);
 assert.deepEqual(group.userData.contactInstances,data.instances.map(list=>list.filter(p=>!suppressed.has(p.id))));
 const water=group.children.find(m=>m.userData.nativeFluid==='chunk');if(data.water.length)assert.equal(water.geometry.attributes.position.array,data.water);
 assert.ok(group.userData.lodBatches.every(b=>b.instances.every(p=>!suppressed.has(p.id))));
 group.traverse(m=>{if(m.isInstancedMesh)m.dispose();if(m.isMesh&&m.geometry!==g)m.geometry.dispose();});g.dispose();material.dispose();world.fluidMaterial.dispose();
});

test('initial readiness follows the native nine-chunk threshold while the outer queue continues',async()=>{
 const f=fixture();f.plan(Array.from({length:12},(_,i)=>[i,0,i]));const ready=f.stream.whenReady();let done=false;ready.then(()=>done=true);
 for(let i=0;i<8;i++)f.reply();await Promise.resolve();assert.equal(done,false);f.reply();assert.deepEqual(await ready,{cancelled:false});assert.equal(f.loaded.size,9);assert.equal(f.stream.busy.cx,9);assert.equal(f.stream.queue.length,2);
 f.stream.dispose();const smaller=fixture();smaller.plan([[0,0,0],[1,0,1]]);const short=smaller.stream.whenReady();smaller.reply();smaller.reply();assert.deepEqual(await short,{cancelled:false});smaller.stream.dispose();
});
