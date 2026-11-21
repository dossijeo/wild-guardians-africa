import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {rational} from '../src/simulation/money.js';
import {nativeFarmAuthoritySave} from './helpers/native-farm-authority-save.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {nativeFarmArrivalGameFixture} from './helpers/native-farm-arrival-game.js';
import {createSpatialDynamicBodies} from '../src/world/wild-engine/spatial-dynamic-bodies.js';
import {copyNativeHomeRequestReference,copyNativeHomeDeclarationReference} from '../src/world/native-home-request-reference.js';
import {nativeResourceAdmissionProfile} from '../src/world/native-resource-admission-profiles.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

const actor=w=>Number(w.id.split('-').at(-1));
const fields=['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'];
function saved({blocked=false,time=100,configureState}={}){
 return nativeFarmAuthoritySave({profile:'youngFemale',approach:true,configureState(s){
  s.hiringPaidDay=s.day;s.ledger.balance=rational(100000);s.time=time;
  const w=s.workers[0],v=s.villages.find(v=>v.id===w.villageId);v.entry={x:w.x,z:w.z+(blocked?0:6)};configureState?.(s);
 }}).state;
}
function hire(f,selection,id='birth-extra'){
 const before=f.snapshot();const r=f.command({kind:'hireAdditional',id,selection,centerId:before.workers[0].centerId});assert.equal(r.value,true,r.rejection);
 return {before,state:JSON.parse(r.snapshot)};
}
async function advanceUntil(f,condition,limit=500){
 for(let i=0;i<limit;i++){if(condition())return;f.advance();await f.present();}
 assert(condition(),'ordinary birth did not reach its native boundary: '+JSON.stringify(f.authority.nativeIntentProductionStatus()));
}

for(const profile of PROFILES)test(`${profile.id} ordinary paid birth shares the existing registry and producer without resetting its moving peer`,async()=>{
 const f=await nativeProductionAuthority(saved());try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));
  const {before,state}=hire(f,{[profile.id]:1}),born=state.workers[1];assert.deepEqual(state.workers[0],before.workers[0]);assert.equal(state.rng,before.rng);assert.equal(born.nativeRouteAdmission,'pending-farm-arrival-resources');
  assert.equal(born.heading,0);for(const k of ['runPhase','walkPhase','carryPhase'])assert.equal(born[k],0);
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)&&r.committed));
  const record=f.records.find(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born));assert.equal(record.resources.nativeFarmArrival.bodyId,2);assert.equal(record.resources.sourceRequest.pose.yaw,0);
  const original=f.records[0].resources.nativeFarmArrival;assert.equal(record.resources.nativeFarmArrival.worldBoundary.authorityEpoch,original.worldBoundary.authorityEpoch);
  for(const r of f.records.filter(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(before.workers[0])))assert.equal(r.resources.nativeFarmArrival.bodyId,1);
  assert.equal(f.records.filter(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)).length,1);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('daily hiring admits its new contract after the retained previous-day Home peer retires',async()=>{
 const s=saved(),old=s.workers[0];Object.assign(old,{status:'returning',nativeRouteAdmission:'pending-home-resources',contractDay:s.day-1});Object.assign(s,{time:0,hiringPaidDay:s.day-1,pauses:['hiring']});
 const f=await nativeProductionAuthority(s);try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-route'&&r.committed));const before=f.snapshot(),r=f.command({kind:'hire',id:'new-day-native-hire',selection:{youngFemale:1}}),state=JSON.parse(r.snapshot),born=state.workers.find(w=>w.id!==old.id);
  assert(born);assert.equal(born.contractDay,s.day);assert.equal(state.workers.find(w=>w.id===old.id).contractDay,s.day-1);assert.deepEqual(state.workers.find(w=>w.id===old.id),before.workers[0]);
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)&&r.committed));
  assert.equal(f.records.find(r=>r.kind==='farm-arrival').resources.nativeFarmArrival.bodyId,2);assert.equal(f.snapshot().workers.find(w=>w.id===old.id).status,'home');assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('waiting for newborn graphics preserves its pose and the existing peer can advance its admitted corridor',async()=>{
 let release;const wait=new Promise(r=>release=r),s=saved(),oldActor=actor(s.workers[0]),f=await nativeProductionAuthority(s,{async onPrepare(r){if(r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId!==oldActor)await wait;}});try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const {state}=hire(f,{youngFemale:1}),born=state.workers[1];
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)));
  const before=f.snapshot(),after=f.advance();await f.present();for(const k of fields)assert.equal(after.workers[1][k],born[k],k);assert.notDeepEqual([after.workers[0].x,after.workers[0].z],[before.workers[0].x,before.workers[0].z]);
  release();await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)&&r.committed));assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{release();await f.close();}
});

test('closing during newborn preparation cannot publish a late Farm acquisition',async()=>{
 let release;const wait=new Promise(r=>release=r),s=saved(),oldActor=actor(s.workers[0]),f=await nativeProductionAuthority(s,{async onPrepare(r){if(r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId!==oldActor)await wait;}});try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const {state}=hire(f,{youngFemale:1}),born=state.workers[1];
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)));f.authority.dispose();release();await f.present();
  assert.equal(f.authority.nativeIntentProductionStatus().phase,'closed');assert.equal(f.records.filter(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)&&r.committed).length,0);
 }finally{release();await f.close();}
});

test('a bodyless birth at an occupied entry holds its own pose while its peer advances, then binds exactly once',async()=>{
 const f=await nativeProductionAuthority(saved({blocked:true}));try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const {before,state}=hire(f,{youngFemale:1}),born=state.workers[1];
  for(let i=0;i<4;i++){const s=f.snapshot();assert.deepEqual(s.workers,state.workers);}
  let moved=false;for(let i=0;i<8;i++){const s=f.advance();await f.present();moved||=s.workers[0].x!==before.workers[0].x||s.workers[0].z!==before.workers[0].z;if(s.workers[1].nativeRouteAdmission==='pending-farm-arrival-resources')for(const k of fields)assert.equal(s.workers[1][k],born[k],k);}
  assert(moved);await advanceUntil(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)&&r.committed));
  const records=f.records.filter(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born));assert.equal(records.length,1);assert.equal(records[0].resources.nativeFarmArrival.bodyId,2);
  assert.equal(f.command({kind:'hireAdditional',id:'birth-extra',selection:{youngFemale:1},centerId:born.centerId}).value,false);assert.equal(f.snapshot().workers.length,2);assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});

test('an unbound newborn can expire to semantic Home while the younger peer keeps moving, without acquiring Farm23',async()=>{
 const f=await nativeProductionAuthority(saved({blocked:true,time:249.99}));try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const {before,state}=hire(f,{olderMale:1}),born=state.workers[1];
  const first=f.advance();assert.equal(first.workers[1].nativeRouteAdmission,'pending-home-resources');assert.equal(first.workers[1].status,'returning');for(const k of fields)assert.equal(first.workers[1][k],born[k],k);
  assert.notDeepEqual([first.workers[0].x,first.workers[0].z],[before.workers[0].x,before.workers[0].z]);
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='home-route'&&r.resources.nativeHome.actorId===actor(born)&&r.committed));assert.equal(f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)),false);
  const home=f.records.find(r=>r.kind==='home-route'&&r.resources.nativeHome.actorId===actor(born));assert.equal(home.resources.bodyId,2);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

test('two hires at one entry do not block the existing peer while the second waits for physical admission',async()=>{
 const f=await nativeProductionAuthority(saved({blocked:true}));try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const {before,state}=hire(f,{youngFemale:2});assert.equal(state.workers.length,3);
  const next=f.advance();await f.present();assert.notDeepEqual([next.workers[0].x,next.workers[0].z],[before.workers[0].x,before.workers[0].z]);
  for(const w of next.workers.slice(1)){assert.equal(w.nativeRouteAdmission,'pending-farm-arrival-resources');for(const k of fields)assert.equal(w[k],state.workers.find(v=>v.id===w.id)[k]);}
  for(let i=0;i<15;i++){f.advance();await f.present();}assert.equal(f.snapshot().workers.length,3);assert.deepEqual(f.faults,[]);
 }finally{await f.close();}
});

test('a real task can claim a bodyless newborn and first binding feeds TaskStart directly without a phantom Farm route',async()=>{
 const s=saved({blocked:true,configureState(s){const w=s.workers[0],p=s.plants[0];Object.assign(p,{x:w.x,z:w.z+1,growth:999999});}}),f=await nativeProductionAuthority(s);try{
  await untilProduction(f,()=>f.records.some(r=>r.kind==='farm-arrival'&&r.committed));const {state}=hire(f,{youngFemale:1}),born=state.workers[1];
  f.advance(.02);await f.present();assert.equal(f.command({kind:'harvest',id:'birth-harvest',targetId:s.plants[0].id}).value,true);
  await advanceUntil(f,()=>f.records.some(r=>r.kind==='task-start'&&nativeResourceAdmissionProfile('task-start').reference(r.resources).actorId===actor(born)&&r.committed));
  assert.equal(f.records.some(r=>r.kind==='farm-arrival'&&r.resources.nativeFarmArrival.actorId===actor(born)),false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{await f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} first admission outside all current discs still respects a genuine peer future reservation`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeFarmArrivalGameFixture({core:runtime?.core,peer:true});
  const revision=f.w.spatial_bodies_mutation_revision(),pose=f.body(3),binding=f.planner.nativeTaskStartBinding(f.state.workers[1].id),point=f.point(0,6);
  assert(Math.hypot(pose.x-point.x,pose.z-point.z)>.56);assert.equal(f.w.spatial_body_admit(9,point.x,point.z,.28,0,1),0);assert.equal(f.w.spatial_bodies_mutation_revision(),revision);
  assert.deepEqual(f.planner.nativeTaskStartBinding(f.state.workers[1].id),binding);f.advance(.3);assert.notDeepEqual(f.body(3),pose);
 }finally{f?.close();await runtime?.dispose();}
});

test('native first admission rejects overlap without consuming an ID or changing any body, and cannot rewrite an admitted body',()=>{
 const f=nativeFarmArrivalGameFixture();try{
  const revision=f.w.spatial_bodies_mutation_revision(),before=f.body(1);
  assert.equal(f.w.spatial_body_admit(0,f.worker.x+6,f.worker.z+6,.28,0,1),-1);
  assert.equal(f.w.spatial_body_admit(9,f.worker.x,f.worker.z,.28,0,1),0);assert.equal(f.w.spatial_bodies_mutation_revision(),revision);assert.deepEqual(f.body(1),before);
  assert.equal(f.w.spatial_body_admit(9,f.worker.x,f.worker.z+6,.28,0,1),1);const after=f.w.spatial_bodies_mutation_revision();assert(after>revision);
  assert.equal(f.w.spatial_body_admit(9,f.worker.x+2,f.worker.z+6,.28,0,1),-1);assert.equal(f.w.spatial_bodies_mutation_revision(),after);assert.deepEqual(f.body(1),before);
 }finally{f.close();}
});

test('body registry first-admission wrapper retains the next ID after rejection and never upserts an existing key',()=>{
 const calls=[],wasm=Object.fromEntries(['spatial_bodies_reset','spatial_body_upsert','spatial_body_remove','spatial_body_has_blockers','spatial_body_segment_clear','spatial_body_detour','spatial_bodies_result_ptr'].map(k=>[k,()=>{if(k==='spatial_body_upsert')throw Error('no upsert');}]));
 let available=false;wasm.spatial_body_admit=(...args)=>{calls.push(args);return available?1:0;};wasm.spatial_bodies_mutation_revision=()=>3;
 const b=createSpatialDynamicBodies(wasm),p={x:1,z:2,radius:.28,kind:0,flags:1};assert.equal(b.admit('new',p),null);assert.equal(b.id('new'),undefined);available=true;assert.equal(b.admit('new',p),1);assert.equal(b.admit('new',{...p,x:5}),1);assert.deepEqual(calls.map(v=>v[0]),[1,1]);assert.equal(b.revision(),3);b.dispose();
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} bodyless Farm-origin Home is a strict semantic type and cannot pass the executable request boundary`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeFarmArrivalGameFixture({core:runtime?.core,bound:false});
  f.state.time=300;f.planner.requestNativeFarmHome(f.state,f.worker);f.planner.flushTaskEvents();
  const q=f.planner.nativeHomeDeclarationReference(f.worker.id);assert(q);assert.equal(q.kind,'native-home-declaration-reference');assert.equal(q.bodyId,undefined);assert.equal(q.pose.radius,undefined);assert.equal(f.planner.nativeHomeRequestReference(f.worker.id),null);
  assert.deepEqual(copyNativeHomeDeclarationReference(q),q);assert.throws(()=>copyNativeHomeRequestReference(q));
  for(const bad of [{...q,bodyId:1},{...q,bodyFlags:1},{...q,pose:{...q.pose,radius:.28}},{...q,pose:{...q.pose,yaw:NaN}},{...q,pose:{...q.pose,x:2147483000}},{...q,actorId:0}])assert.throws(()=>copyNativeHomeDeclarationReference(bad));
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.planner.nativeGameExecutionState(),1);f.advance(.3);assert.deepEqual(f.planner.nativeHomeDeclarationReference(f.worker.id),q);
  assert.equal(f.w.nav_home_requests_snapshot(),0);assert.equal(f.w.nav_farm_arrival_requests_snapshot(),0);
 }finally{f?.close();await runtime?.dispose();}
});
