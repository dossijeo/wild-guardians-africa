import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarmProduction as fixture,untilFarmProduction as until} from './helpers/native-farm-production.js';
import {PROFILES} from '../src/simulation/workforce.js';import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createPlant} from '../src/simulation/crops.js';import {enqueue} from '../src/simulation/tasks.js';import {emit} from '../src/simulation/game.js';

async function farm(f){const r=await f.produce();assert.equal(r?.status,'committed',JSON.stringify(r));assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival');return r.nativeFarmArrivalBinding;}
function work(f){const p=f.point(6,6),crop=createPlant('plant-900197','mijo',p.x,p.z,f.worker.centerId);crop.water=[];crop.growth=999999;crop.harvestRequested=true;f.state.plants.push(crop);emit(f.state,'CropPlaced',{targetId:crop.id});enqueue(f.state,f.worker.centerId,'harvest',crop.id);return crop;}

for(const threaded of [false,true])for(const profile of PROFILES)for(const approach of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} producer completes13→23→${approach?'22→21':'21'} without direct native commits`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=await fixture({core:runtime?.core,profile:profile.id,approach});const initial=f.body(1),rng=f.state.rng,binding=await farm(f);assert.deepEqual(f.body(1),initial);
  f.step(.01);assert.equal(f.planner.nativeFarmArrivalIdleSource(f.actor),null,'a moving route has no terminal request');assert.equal(await f.produce(),null);
  f.step(binding.reference.endTime-f.state.elapsed+.01);const body=f.body(1),worker=structuredClone(f.worker),sequence=f.w.nav_intent_transition_sequence(),source=f.planner.nativeFarmArrivalIdleSource(f.actor);assert(source);assert.equal(source.approach,approach);assert.equal(source.body.bodyId,1);assert.equal(source.body.sourceSequence,binding.assignmentSequence);
  for(let i=0;i<20;i++)assert.deepEqual(f.planner.nativeFarmArrivalIdleSource(f.actor),source);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  const successor=await f.produce();assert.equal(successor?.status,'committed',JSON.stringify(successor));assert.deepEqual(f.body(1),body);assert.equal(f.worker.status,'idle');
  if(approach){const r=successor.nativeIdleStrollBinding.reference;assert.deepEqual(r.sourceFarm,source.body);f.step(r.endTime-f.state.elapsed+.01);assert.equal((await f.produce())?.status,'committed');}
  assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert(f.planner.nativeIdleCycleBinding(f.actor));assert.equal(f.state.rng,rng);assert.deepEqual(f.records.filter(r=>r.committed).map(r=>r.method),['prepareNativeFarmArrivalResources',...(approach?['prepareNativeIdleStrollResources']:[]),'prepareNativeIdleCycleResources']);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();await runtime?.dispose();}
});

for(const approach of [false,true])for(const cause of ['task','selected-task','home','dirty-world','anchor'])test(`${approach?'approach':'cycle'} source is revoked by ${cause} during preparation without relying on a producer wake`,async()=>{
 let inject=false,f;try{
  f=await fixture({approach,onPrepare(record,source){if(!inject||record.method==='prepareNativeFarmArrivalResources')return;if(cause==='task'||cause==='selected-task'){work(source);if(cause==='selected-task'){const plan=source.planner.planIfNeeded(source.state.elapsed);assert(plan.some(r=>r.status===1&&r.workerId===source.actor));assert.equal(source.worker.taskId,null);}}else if(cause==='home'){source.worker.contractDay--;source.planner.requestNativeFarmHome(source.state,source.worker);}else if(cause==='anchor'){source.state.plants.find(p=>p.id==='plant-900098').x+=1;}else emit(source.state,'CropPlaced',{targetId:'plant-900098'});}});
  const binding=await farm(f);f.step(binding.reference.endTime-f.state.elapsed+.01);const q=f.planner.nativeFarmArrivalIdleSource(f.actor);assert(q);const body=f.body(1);inject=true;
  // Direct existing public operation verifies the planner guard at the commit
  // boundary even if dispatch.wake is not called for this invalidating command.
  const result=await f.planner[approach?'startNativeIdleStrollAfterGpuQuiescence':'startNativeIdleCycleAfterGpuQuiescence']({actorId:f.actor,getPublication:()=>f.source,prepareResources:({resources,signal,deferredStart})=>f.connection[approach?'prepareNativeIdleStrollResources':'prepareNativeIdleCycleResources'](resources,{signal,deferredStart})});
  assert.notEqual(result.status,'committed');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.records.filter(r=>r.committed).length,1);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();}
});

for(const approach of [false,true])test(`${approach?'approach':'cycle'} preparation retains its source across real held Game boundaries`,async()=>{
 let f,release,started;const waiting=new Promise(r=>release=r),ready=new Promise(r=>started=r);try{
  f=await fixture({approach,async onPrepare(record){if(record.method!=='prepareNativeFarmArrivalResources'){started(record);await waiting;}}});
  const farmBinding=await farm(f);f.step(farmBinding.reference.endTime-f.state.elapsed+.01);const source=f.planner.nativeFarmArrivalIdleSource(f.actor),body=f.body(1),pending=f.produce();
  let record;ready.then(r=>record=r);await until(()=>!!record);
  for(let i=0;i<3;i++){f.step(.05);assert.deepEqual(f.planner.nativeFarmArrivalIdleSource(f.actor),source);f.producer.wake();assert.equal(record.options.signal.aborted,false);assert.deepEqual(f.body(1),body);}
  release();const result=await pending;assert.equal(result.status,'committed',JSON.stringify(result));assert.deepEqual(f.body(1),body);assert.equal(f.records.length,2);assert.deepEqual(f.errors,[]);
 }finally{release();await f?.close();}
});

for(const home of [false,true])test(`terminal Farm arbitrates ${home?'Home before work':'work before Idle'} at its ordinary Game boundary`,async()=>{
 let f;try{f=await fixture();const binding=await farm(f);f.step(binding.reference.endTime-f.state.elapsed+.01);assert(f.planner.nativeFarmArrivalIdleSource(f.actor));const crop=work(f),body=f.body(1);assert.equal(f.planner.nativeFarmArrivalIdleSource(f.actor),null,'unsettled task facts cannot select Idle');if(home)f.worker.contractDay--;f.step(.01);
  assert.equal(f.worker.nativeRouteAdmission,home?'pending-home-resources':'pending-resources');assert.equal(f.planner.nativeFarmArrivalIdleSource(f.actor),null);assert.equal(f.state.tasks.find(t=>t.targetId===crop.id).workerId,home?null:f.worker.id);assert.deepEqual(f.body(1),body);assert.equal(f.records.length,1);assert.deepEqual(f.errors,[]);
 }finally{await f?.close();}
});
