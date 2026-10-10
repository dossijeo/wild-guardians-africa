import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedRaidPreparationWorker} from '../src/world/raid-shared-worker.js';
import {createRaidWorkerGeometryScheduler} from '../src/world/raid-worker-geometry-scheduler.js';
const req=(owner,token=1)=>({owner,token,key:owner+'key'});
function harness(){const posted=[],owned=new WeakSet(),worker={postMessage:d=>posted.push(d),terminate(){this.terminated=true;}},transport=new SharedRaidPreparationWorker({createWorker:()=>worker,verifyOwnedEvent:e=>owned.has(e)});const emit=d=>{const e={data:d};owned.add(e);worker.onmessage(e);};return {worker,transport,posted,emit};}
test('first owned ack permits entry; background geometry completion does not release active entry or install partial data',()=>{
 const {transport,posted,emit}=harness(),completed=[],g=transport.channel('geometry','g',e=>completed.push(e.data),()=>{}),e=transport.channel('entry','e',()=>{},()=>{});g.post(req('g'));e.post(req('e'));
 emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'gkey',slice:1});assert.equal(posted.at(-1).jobKind,'entry');assert.equal(transport.background.id,1);assert.equal(completed.length,0);
 emit({kind:'raid-preparation-reply',job:1,jobKind:'geometry',owner:'g',computeMs:1,result:req('g')});assert.equal(completed.length,1);assert.equal(transport.active.id,2);assert.equal(transport.background,null);
 emit({kind:'raid-preparation-reply',job:2,jobKind:'entry',owner:'e',computeMs:1,result:req('e')});assert.equal(transport.active,null);assert.equal(transport.stats.resumes,0);transport.dispose();
});
test('cancellation and late ack cannot release newer work; duplicate current background ack exposes no result',()=>{
 const {transport,posted,emit}=harness(),done=[],g=transport.channel('geometry','g',e=>done.push(e),()=>{}),e=transport.channel('entry','e',()=>{},()=>{});g.post(req('g'));e.post(req('e'));
 emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'gkey',slice:1});emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'gkey',slice:1});assert.equal(transport.active.id,2);assert.equal(done.length,0);
 g.post(req('g',2));assert.equal(posted.at(-1).kind,'raid-geometry-cancel');assert.equal(transport.background,null);
 emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'gkey',slice:1});assert.equal(transport.active.id,2);
 emit({kind:'raid-preparation-reply',job:2,jobKind:'entry',owner:'e',computeMs:1,result:req('e')});assert.equal(transport.active.id,3);
 emit({kind:'raid-preparation-reply',job:1,jobKind:'geometry',owner:'g',computeMs:1,result:req('g')});assert.equal(transport.active.id,3);assert.equal(done.length,0);transport.dispose();
});
test('malformed suspension fails closed and terminates once',()=>{
 const {transport,emit,worker}=harness(),g=transport.channel('geometry','g',()=>{},()=>{});g.post(req('g'));emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'wrong',slice:1});assert.equal(transport.worker,null);assert.ok(worker.terminated);transport.dispose();
});
test('continuous Worker-local scheduling gives two entries priority then a geometry slice; one ack, finite aggregate telemetry, no restart',()=>{
 const tasks=[],posts=[],cache=new Map(),order=[];let starts=0,steps=0,closed=0;
 const scheduler=createRaidWorkerGeometryScheduler({steps:function*(request){starts++;try{for(let i=0;i<5;i++){steps++;order.push('geometry');yield {phase:'canonical'};}return {...request,geometry:{complete:true}};}finally{closed++;}},computeEntry:(request,{preparedGeometry})=>{order.push('entry');return {...request,used:!!preparedGeometry};},cacheGeometry:(k,v)=>cache.set(k,v),getGeometry:k=>cache.get(k),post:d=>posts.push(d),schedule:f=>tasks.push(f),now:()=>0,maxSteps:1});
 scheduler.handle({kind:'raid-preparation-job',job:1,jobKind:'geometry',owner:'g',request:req('g')});tasks.shift()();assert.equal(steps,1);assert.equal(cache.size,0);
 const entry=job=>scheduler.handle({kind:'raid-preparation-job',job,jobKind:'entry',owner:'e',request:{...req('e',job),geometryKey:'gkey'}});
 entry(2);tasks.shift()();assert.equal(posts.at(-1).geometryReused,false);entry(3);tasks.shift()();entry(4);tasks.shift()();assert.deepEqual(order,['geometry','entry','entry','geometry']);tasks.shift()();assert.equal(order.at(-1),'entry');
 while(tasks.length)tasks.shift()();assert.equal(starts,1);assert.equal(closed,1);assert.equal(cache.size,1);assert.equal(posts.filter(p=>p.kind==='raid-geometry-suspended').length,1);
 const m=posts.find(p=>p.job===1&&p.result).geometryMetrics;assert.equal(m.steps,6);assert.equal(Object.values(m.stepHistogram).reduce((a,b)=>a+b,0),6);assert.equal(Object.values(m.sliceHistogram).reduce((a,b)=>a+b,0),m.slices);assert.equal(m.stepSamples,undefined);scheduler.dispose();
});
test('cancel/dispose invalidates already scheduled continuation without adopting partial result',()=>{
 const tasks=[],posts=[],cache=[];let starts=0,closed=0;
 const scheduler=createRaidWorkerGeometryScheduler({steps:function*(){starts++;try{yield {};yield {};return {geometry:{}};}finally{closed++;}},computeEntry:r=>r,getGeometry:()=>null,cacheGeometry:g=>cache.push(g),post:r=>posts.push(r),schedule:f=>tasks.push(f),now:()=>0,maxSteps:1});
 scheduler.handle({kind:'raid-preparation-job',job:1,jobKind:'geometry',owner:'g',request:req('g')});tasks.shift()();scheduler.handle({kind:'raid-geometry-cancel',job:1,owner:'g'});tasks.shift()();assert.equal(starts,1);assert.equal(closed,1);assert.equal(cache.length,0);assert.equal(posts.filter(p=>p.result).length,0);
 scheduler.handle({kind:'raid-preparation-job',job:2,jobKind:'geometry',owner:'g',request:req('g',2)});scheduler.dispose();tasks.shift()();assert.equal(starts,1);
});
