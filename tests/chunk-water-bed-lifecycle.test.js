import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {GlobalFrameScheduler} from '../src/app/global-frame-scheduler.js';
import {prepareTerrainChunk} from '../src/rendering/prepare-terrain-chunk.js';
import {prepareChunkWaterBed} from '../tools/experiments/chunk-water-bed-candidate.js';
for(const cause of ['obsolete','quality','context','quality-roundtrip','teardown','abort','complete'])test('staged water lifecycle: '+cause,async()=>{
 let time=0,timestamp=0,queries=0,closed=0,published=false,current=true,triggered=false;
 const scheduler=new GlobalFrameScheduler({now:()=>time}),abort=new AbortController();
 const frame=async()=>{timestamp+=1000/60;time=timestamp;scheduler.beginFrame(timestamp);time+=2;await scheduler.endFrame();};
 for(let i=0;i<60;i++)await frame();
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-24,0,-24,24,0,-24,24,0,24,-24,0,-24,24,0,24,-24,0,24],3));let released=0;g.addEventListener('dispose',()=>released++);
 const world={state:{biome:'manglares'},quality:'media',streamingProgramRevision:0,glResourceEpoch:{stats:{epoch:0}},nav:{field:{wetland:true,wetlandLevel:()=>2,waterInfo:()=>{queries++;time+=.02;return {mask:.7};}}},
 *prepareTerrainSteps(){let done=false;try{yield 'water-bed';const bed=yield* prepareChunkWaterBed(this,g,0,0,{now:()=>time});done=true;published=true;return {bed};}finally{if(!done){closed++;g.dispose();}}},
 onTerrainPreparationSlice(){if(triggered||queries===0||cause==='complete')return;triggered=true;if(cause==='obsolete')current=false;if(cause==='quality')this.quality='baja';if(cause==='context')this.glResourceEpoch.stats.epoch++;if(cause==='quality-roundtrip')this.streamingProgramRevision++;if(cause==='teardown')this.disposed=true;if(cause==='abort')abort.abort();}};
 let settled=false;const promise=prepareTerrainChunk(world,{cx:0,cz:0},()=>current,{scheduler,signal:abort.signal,now:()=>time}).finally(()=>{settled=true;});
 for(let i=0;i<300&&!settled;i++)await frame();assert(settled,'Work must settle without starvation');const result=await promise;
 if(cause==='complete'){assert(result.preparedGroup.bed.bytes.length>0);assert(published);assert.equal(closed,0);g.dispose();}else{assert.equal(result,null);assert.equal(published,false);assert.equal(closed,1);assert.equal(released,1);assert(queries>0&&queries<10000);const stopped=queries;for(let i=0;i<3;i++)await frame();assert.equal(queries,stopped);}
 assert.equal(scheduler.snapshot().pending,0);
});
