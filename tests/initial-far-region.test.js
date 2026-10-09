import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startInitialFarRegion} from '../src/rendering/initial-far-region.js';
import {nativeFarRegionRequest} from '../tools/experiments/far-region-tracker.js';
import {buildFarSceneData} from '../tools/experiments/far-scene-data.js';
const species=[0,1,2,3].map(slot=>({slot,localBase:[slot,0,slot]}));
function fixture(biome='savanna'){
 const profile=JSON.parse(readFileSync('public/content/biome-'+biome+'.json','utf8')).profile;
 const world={loading:new AbortController(),camera:{position:{x:76.7,z:30.57}},nav:{config:{seed:'712',biome,relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:Array(6).fill(true)}},pack:{profile},disposed:false};
 return {world,species:biome==='canyons'?species.slice(0,2):species};
}
function descriptor(world,species,options={}){
 const metadata=species[0],includeGround=(options.includeFarGround??true)&&!['canyons','desert'].includes(world.nav.config.biome);
 return {...nativeFarRegionRequest(world.nav.config,world.pack.profile,{x:world.camera.position.x,z:world.camera.position.z},{groundStep:16,...options,metadata,slot:metadata.slot,groundTreeBases:Object.fromEntries(species.map(s=>[s.slot,s.localBase])),includeGround,bakedOnly:true}),treesOnly:!includeGround};
}
test('early request starts before consumption and adopts the exact descriptor/result once without a second worker',async()=>{
 const f=fixture(),calls=[];let finish;const value={data:{trees:[],ground:{positions:new Float32Array([1,2,3])}}};
 const plan=startInitialFarRegion(f.world,{}, {loadManifest:async()=>({biomes:{savanna:f.species}}),loadRegion:(request,{signal})=>{calls.push({request,signal});return new Promise(resolve=>finish=resolve);}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,1);assert.deepEqual(calls[0].request,descriptor(f.world,f.species));
 const consumer=plan.take(descriptor(f.world,f.species),{signal:new AbortController().signal});finish(value);assert.equal(await consumer,value);assert.equal(calls.length,1);assert.equal(f.world.farVegetation,undefined);
});
test('early and eventual request descriptors generate byte-identical data in all six biomes',async()=>{
 for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
  const f=fixture(biome),options={treeHalf:48,groundStep:16,groundWash:0};let early;
  const plan=startInitialFarRegion(f.world,options,{loadManifest:async()=>({biomes:{[biome]:f.species}}),loadRegion:async request=>{early=request;return {data:buildFarSceneData(request)};}});
  const value=await plan.ready,actual=descriptor(f.world,f.species,options);assert.deepEqual(early,actual);assert.deepEqual(value.data,buildFarSceneData(actual));
 }
});
test('changed descriptor aborts speculative work and uses a real fresh request',async()=>{
 const f=fixture(),calls=[];const plan=startInitialFarRegion(f.world,{}, {loadManifest:async()=>({biomes:{savanna:f.species}}),loadRegion:async(request,{signal})=>{calls.push({request,signal});return {data:{trees:[]}};}});
 await plan.ready;const changed=descriptor(f.world,f.species);changed.treeBounds.minX-=1;await plan.take(changed,{signal:new AbortController().signal});
 assert.equal(calls.length,2);assert.equal(calls[0].signal.aborted,true);assert.deepEqual(calls[1].request,changed);
});
test('world cancellation aborts background worker and prevents late ignored-abort data adoption',async()=>{
 const f=fixture();let finish,signal;const plan=startInitialFarRegion(f.world,{}, {loadManifest:async()=>({biomes:{savanna:f.species}}),loadRegion:(_,options)=>{signal=options.signal;return new Promise(resolve=>finish=resolve);}});
 await new Promise(resolve=>setImmediate(resolve));const taking=plan.take(descriptor(f.world,f.species),{});const rejected=assert.rejects(taking,/aborted/);
 f.world.loading.abort();assert.equal(signal.aborted,true);finish({data:{trees:[]}});await rejected;assert.equal(f.world.farVegetation,undefined);
});
test('regional request cancellation aborts a matched background worker',async()=>{
 const f=fixture();let finish,workerSignal;const plan=startInitialFarRegion(f.world,{}, {loadManifest:async()=>({biomes:{savanna:f.species}}),loadRegion:(_,options)=>{workerSignal=options.signal;return new Promise(resolve=>finish=resolve);}});
 await new Promise(resolve=>setImmediate(resolve));const controller=new AbortController(),taking=plan.take(descriptor(f.world,f.species),{signal:controller.signal}),rejected=assert.rejects(taking,/aborted/);
 controller.abort();assert.equal(workerSignal.aborted,true);finish({data:{trees:[]}});await rejected;
});
test('background failure is observed and retained for eventual readiness',async()=>{
 const f=fixture(),plan=startInitialFarRegion(f.world,{}, {loadManifest:async()=>({biomes:{savanna:f.species}}),loadRegion:async()=>{throw Error('procedural worker failure');}});
 await new Promise(resolve=>setImmediate(resolve));await assert.rejects(plan.take(descriptor(f.world,f.species),{}),/procedural worker failure/);
});

test('a consumer arriving before manifest does not launch a duplicate fallback worker',async()=>{
 const f=fixture();let finishManifest,calls=0;const value={data:{trees:[]}};
 const plan=startInitialFarRegion(f.world,{}, {loadManifest:()=>new Promise(resolve=>finishManifest=resolve),loadRegion:async()=>{calls++;return value;}});
 const taking=plan.take(descriptor(f.world,f.species),{});assert.equal(calls,0);await Promise.resolve();finishManifest({biomes:{savanna:f.species}});
 assert.equal(await taking,value);assert.equal(calls,1);
});

test('an already cancelled world starts neither manifest fetch nor worker',async()=>{
 const f=fixture();f.world.loading.abort();const plan=startInitialFarRegion(f.world,{}, {loadManifest:()=>assert.fail('Manifest after abort'),loadRegion:()=>assert.fail('Worker after abort')});
 await assert.rejects(plan.ready,/aborted/);await assert.rejects(plan.take(descriptor(f.world,f.species),{}),/aborted/);
});
