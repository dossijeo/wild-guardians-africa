import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingProgress} from '../src/app/loading-progress.js';
import {LoadingOrbit} from '../src/rendering/loading-orbit.js';
import {LoadingPlants} from '../src/rendering/loading-plants.js';
import {loadingReadinessSnapshot,existingLoadingContextIdentity,createLoadingReadinessSpanTracker} from '../src/rendering/loading-readiness-snapshot.js';

test('snapshot distinguishes real milestones and presentation maturity without scheduling work',()=>{
 const progress=new LoadingProgress([{id:'gpu',weight:1},{id:'far-assets',weight:1},{id:'visible-ready',weight:1}],{now:()=>0});progress.update('gpu');
 const orbit=new LoadingOrbit(),plants=new LoadingPlants();orbit.stop();
 const forbidden=()=>{throw Error('observer scheduled readiness');};
 const world={loadingProgress:progress,loading:{signal:{aborted:false}},loadingActorQueue:{jobs:[{}],pumping:true,closed:false,spent:12,stats:{submitted:3,completed:2,failed:0,yields:1},run:forbidden},chunkStream:{queue:[{}],busy:{},desired:new Map([['x',{}]]),failed:new Set(),epoch:4,whenReady:forbidden},farVegetation:{enabled:true,adapters:[{layer:{current:null,pendingPreparations:1,epoch:3,stream:{pending:{key:'region'},whenReady:forbidden}},stats:{errors:[]}}]}};
 const before=plants.plants.map(p=>p.growth),result=loadingReadinessSnapshot({world,diorama:{orbit,plants,prepared:true},cinematic:{armed:false,time:0}});
 assert.equal(result.progress.stages[0].progress,1);assert.equal(result.progress.stages[1].progress,0);
 assert.equal(result.actors.queued,1);assert.equal(result.chunks.busy,true);assert.equal(result.far.adapters[0].current,false);assert.equal(result.far.adapters[0].streamPending,true);
 assert.equal(result.presentation.orbitSettled,false);assert.equal(result.presentation.plantsMature,false);assert.deepEqual(plants.plants.map(p=>p.growth),before);
 plants.update(1,1,{ready:true});orbit.step(1);orbit.step(1);orbit.step(1);orbit.step(1);
 const ready=loadingReadinessSnapshot({world,diorama:{orbit,plants}});assert.equal(ready.presentation.orbitSettled,true);assert.equal(ready.presentation.plantsMature,true);
});

test('bounded copies never retain region prototypes, promises, jobs or source arrays',()=>{
 const adapters=Array.from({length:10},()=>({layer:{current:{key:'x',prototype:{}},stream:{pending:{key:'y',promise:Promise.resolve()}}},stats:{errors:[]}}));
 const stages=new Map(Array.from({length:20},(_,i)=>[i,{id:String(i),progress:0}]));
 const result=loadingReadinessSnapshot({world:{farVegetation:{adapters}},progress:{stages,value:.88}});
 assert.equal(result.far.adapters.length,8);assert.equal(result.far.omitted,2);assert.equal(result.progress.stages.length,16);assert.equal(result.progress.omitted,4);
 adapters[0].layer.current.key='changed';assert.equal(result.far.adapters[0].currentKey,'x');assert.equal(JSON.stringify(result).includes('prototype'),false);
});

test('observer faults are contained per section and absent owners remain unknown',()=>{
 const world={get loadingActorQueue(){throw Error('fault');}};const result=loadingReadinessSnapshot({world});assert.equal(result.actors,null);assert.deepEqual(result.issues,['actors']);assert.equal(result.presentation.orbitSettled,null);assert.equal(loadingReadinessSnapshot().owner.present,false);
});

test('context identity borrows renderer only, skips dead owners and tolerates driver faults',()=>{
 let reads=0;const gl={VENDOR:1,RENDERER:2,VERSION:3,isContextLost:()=>false,getExtension:()=>({UNMASKED_VENDOR_WEBGL:4,UNMASKED_RENDERER_WEBGL:5}),getParameter:id=>{reads++;return 'parameter-'+id;}};
 const world={renderer:{getContext:()=>gl},canvas:{getContext(){throw Error('new context');}}};assert.equal(existingLoadingContextIdentity(world).unmaskedRenderer,'parameter-5');assert.equal(reads,5);
 world.disposed=true;assert.equal(existingLoadingContextIdentity(world),null);assert.equal(reads,5);world.disposed=false;gl.getParameter=()=>{throw Error('driver');};assert.deepEqual(existingLoadingContextIdentity(world),{unavailable:true});
});

test('span tracker preserves interleaved same-label awaits and prior callback contract',()=>{
 const calls=[],receiver={};function previous(...args){calls.push({receiver:this,args});return 42;}previous.onBegin=function(...args){calls.push({receiver:this,args});return 7;};
 const tracker=createLoadingReadinessSpanTracker(previous,{now:()=>10});const a={label:'region',start:1},b={label:'region',start:2};assert.equal(tracker.onBegin.call(receiver,a,'tail'),7);tracker.onBegin(b);assert.equal(tracker.call(receiver,{...a,end:5,duration:4}),42);
 assert.equal(calls.length,3);assert.equal(calls[0].receiver,receiver);assert.deepEqual(calls[0].args,[a,'tail']);assert.equal(calls[2].receiver,receiver);assert.equal(calls[1].receiver,previous);
 const row=tracker.snapshot();assert.equal(row.active.length,1);assert.equal(row.active[0].start,2);assert.equal(row.active[0].elapsed,8);assert.equal(row.lastCompleted.duration,4);
 row.active[0].label='mutated';assert.equal(tracker.snapshot().active[0].label,'region');
});

test('tracker contains observation faults but retains original callback exceptions',()=>{
 const failure=Error('original');const previous=()=>{throw failure;};const tracker=createLoadingReadinessSpanTracker(previous,{now:()=>{throw Error('clock');}});
 const poisonous={get label(){throw Error('observer');}};assert.throws(()=>tracker(poisonous),error=>error===failure);assert.equal(tracker.snapshot().at,null);
});

test('tracker bounds active rows and reports omissions without extending waits',()=>{
 const tracker=createLoadingReadinessSpanTracker(null,{now:()=>100});for(let i=0;i<20;i++)tracker.onBegin({label:'phase'+i,start:i});const result=tracker.snapshot();assert.equal(result.active.length,16);assert.equal(result.dropped,4);tracker({label:'phase0',start:0,end:99,duration:99});assert.equal(tracker.snapshot().active.length,15);
});
