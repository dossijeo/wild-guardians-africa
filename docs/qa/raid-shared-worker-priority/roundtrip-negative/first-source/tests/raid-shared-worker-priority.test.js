import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedRaidPreparationWorker} from '../src/world/raid-shared-worker.js';
import {createRaidWorkerGeometryScheduler} from '../src/world/raid-worker-geometry-scheduler.js';
function harness(){const posted=[],owned=new WeakSet(),worker={postMessage:d=>posted.push(d),terminate(){this.terminated=true;}},transport=new SharedRaidPreparationWorker({createWorker:()=>worker,verifyOwnedEvent:e=>owned.has(e)});const emit=d=>{const e={data:d};owned.add(e);worker.onmessage(e);};return {worker,transport,posted,emit};}
const req=(owner,token=1)=>({owner,token,key:owner+'key'});
test('owned suspension gives entry priority, then two entries yield a geometry slice; acknowledgements install no graph',()=>{
 const {transport,posted,emit}=harness(),completed=[];
 const g=transport.channel('geometry','g',e=>completed.push(e.data),()=>{}),e=transport.channel('entry','e',()=>{},()=>{});g.post(req('g'));e.post(req('e'));
 emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'gkey',slice:1});assert.equal(posted.at(-1).jobKind,'entry');assert.equal(completed.length,0);assert.equal(transport.suspended.id,1);
 // Post a second queued entry before the first completes.
 e.post(req('e',2));emit({kind:'raid-preparation-reply',job:2,jobKind:'entry',owner:'e',computeMs:1,result:req('e')});assert.equal(posted.at(-1).job,3);
 e.post(req('e',3));emit({kind:'raid-preparation-reply',job:3,jobKind:'entry',owner:'e',computeMs:1,result:req('e',2)});assert.equal(posted.at(-1).kind,'raid-geometry-resume');assert.equal(posted.at(-1).slice,1);
 emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'gkey',slice:2});assert.equal(posted.at(-1).job,4);transport.dispose();
});
test('late old suspension cannot release a newer job; malformed current suspension fails closed',()=>{
 const {transport,posted,emit,worker}=harness(),g=transport.channel('geometry','g',()=>{},()=>{});g.post(req('g'));g.post(req('g',2));emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'gkey',slice:1});assert.equal(transport.active.id,2);assert.equal(posted.at(-1).job,2);
 emit({kind:'raid-geometry-suspended',job:1,owner:'g',token:1,key:'gkey',slice:2});assert.equal(transport.active.id,2);
 emit({kind:'raid-geometry-suspended',job:2,owner:'evil',token:2,key:'gkey',slice:1});assert.equal(transport.worker,null);assert.ok(worker.terminated);transport.dispose();
});
test('continuous generator resumes without restart, entry only sees complete graph, cancel suppresses scheduled work',()=>{
 const tasks=[],posts=[],cache=new Map();let starts=0,steps=0,closed=0;
 const scheduler=createRaidWorkerGeometryScheduler({steps:function*(request){starts++;try{for(let i=0;i<5;i++){steps++;yield {phase:'canonical'};}return {...request,geometry:{complete:true}};}finally{closed++;}},computeEntry:(request,{preparedGeometry})=>({...request,used:!!preparedGeometry}),cacheGeometry:(k,v)=>cache.set(k,v),getGeometry:k=>cache.get(k),post:d=>posts.push(d),schedule:f=>tasks.push(f),now:()=>0,maxSteps:2});
 scheduler.handle({kind:'raid-preparation-job',job:1,jobKind:'geometry',owner:'g',request:req('g')});tasks.shift()();assert.equal(steps,2);assert.equal(cache.size,0);
 scheduler.handle({kind:'raid-preparation-job',job:2,jobKind:'entry',owner:'e',request:{...req('e'),geometryKey:'gkey'}});assert.equal(posts.at(-1).geometryReused,false);
 scheduler.handle({kind:'raid-geometry-resume',job:1,owner:'g',slice:1});tasks.shift()();assert.equal(steps,4);assert.equal(starts,1);
 scheduler.handle({kind:'raid-geometry-resume',job:1,owner:'g',slice:2});tasks.shift()();assert.equal(cache.size,1);assert.equal(starts,1);assert.equal(closed,1);
 scheduler.handle({kind:'raid-preparation-job',job:3,jobKind:'geometry',owner:'g',request:req('g',2)});scheduler.handle({kind:'raid-geometry-cancel',job:3,owner:'g'});tasks.shift()();assert.equal(starts,1);assert.equal(posts.filter(p=>p.job===3&&p.result).length,0);scheduler.dispose();
});
