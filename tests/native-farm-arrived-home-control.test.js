import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeFarmArrivedHome as fixture} from './helpers/native-farm-arrived-home-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {controlledNativeFarmArrival} from './helpers/native-farm-arrival-control.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const inside of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} ${inside?'inside':'travelled'} completed Farm lease survives Home19 until exact18 installation`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({profile:profile.id,inside,core:runtime?.core});const record=f.farm.routeRecord,end=f.farm.executionEnd,epoch=f.farm.executionEpoch,body=f.body(1),request=f.requestHome();assert.equal(f.c.status().sequence,request.requestSequence);assert.equal(record.safeUntil,end);assert(f.farm.isCurrent());assert.equal(f.farm.routeRecord,record);assert.equal(f.farm.executionEnd,end);assert.equal(f.farm.executionEpoch,epoch);assert.throws(()=>f.c.admit(f.source.nativeRoute),/obsolete or unauthorized/);
  const p=f.prepareHome(),lease=f.c.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());f.advance(1.8);assert(f.farm.isCurrent());assert.deepEqual(f.body(1),body);assert.equal(f.farm.executionEnd,end);const next=f.planner.revalidateNativeHomeRouteProposal(p.ticket);assert.equal(next.status,'revalidated');assert(f.planner.cancelNativeHomeRouteProposal(next.proposal.ticket));assert(f.farm.isCurrent());
  const fresh=f.prepareHome(),pending=f.c.admitHome(fresh.nativeHome,{preparingWorldBoundary:fresh.worldBoundary}),binding=f.commitHome(fresh);assert(!f.farm.isCurrent());assert(!pending.isCurrent());const bad=structuredClone(binding);for(const ref of [bad.reference,bad.preparedReference]){ref.bodyId=3;ref.sourceRequest.bodyId=3;}assert.throws(()=>f.c.installHomes(binding.reference.worldBoundary,[bad]));assert.equal(f.c.installHomes(binding.reference.worldBoundary,[binding]),1);assert(pending.isCurrent());assert(!lease.isCurrent());assert.deepEqual(f.body(1),body);
 }finally{f?.close();await runtime?.dispose();}
});

test('completed Farm Home body waits for the actual request clock watermark',()=>{
 const f=fixture();try{const end=f.farm.executionEnd;f.pauseClocks(true);f.requestHome();assert(!f.farm.isCurrent());assert.equal(f.farm.routeRecord,null);f.acceptClock();assert(f.farm.isCurrent());assert.equal(f.farm.executionEnd,end);}finally{f.close();}
});

test('malformed terminal Home declarations leave the Farm owner and control sequence intact',()=>{
 const f=fixture();try{
  f.pauseEvents(true);f.pauseClocks(true);const sequence=f.c.status().sequence,body=f.body(1);f.requestHome();const event=f.events.findLast(e=>e.actorId===f.actor&&e.homeRequest);assert(event);
  for(const change of [e=>e.revokedRouteHandle.generation++,e=>e.homeRequest.actorId++,e=>e.homeRequest.bodyId++,e=>e.homeRequest.profile++,e=>e.homeRequest.bodyFlags|=4,e=>e.homeRequest.pose.radius+=.1,e=>e.homeRequest.pose.x+=.1,e=>e.homeRequest.pose.z+=.1,e=>e.homeRequest.nativeSession++,e=>e.homeRequest.authorityEpoch='foreign',e=>e.homeRequest.requestSequence++,e=>e.type='IntentChanged',e=>{e.effectiveTime=f.farmBinding.reference.endTime-.01;e.homeRequest.requestedAt=e.effectiveTime;},e=>{e.homeRequest=null;},e=>{e.taskRequest={};}]){
   const bad=structuredClone(event);change(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,sequence);assert(f.farm.isCurrent());assert.deepEqual(f.body(1),body);
  }
  assert(f.c.accept(event));assert(!f.farm.isCurrent());f.acceptClock();assert(f.farm.isCurrent());assert.equal(f.farm.executionEnd,f.farmBinding.reference.endTime);
 }finally{f.close();}
});

test('a native Home declaration without old Farm GPU installation grants only fresh Home preparation',()=>{
 const f=fixture({installFarm:false});try{
  f.requestHome();assert(!f.farm.isCurrent());assert(!f.farm.isPrepared());assert.throws(()=>f.c.installFarmArrivals(f.farmBinding.reference.worldBoundary,[f.farmBinding]));assert.throws(()=>f.c.admitFarmArrival(f.farmBinding.reference),/obsolete/);
  const p=f.prepareHome(),lease=f.c.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert(!lease.isCurrent());const binding=f.commitHome(p);assert.equal(f.c.installHomes(binding.reference.worldBoundary,[binding]),1);assert(lease.isCurrent());assert(!f.farm.isCurrent());
 }finally{f.close();}
});

test('terminal Home phase metadata cannot replace the actual native request at acquisition or bootstrap',()=>{
 const f=fixture();try{
  f.pauseEvents(true);f.pauseClocks(true);f.requestHome();const event=structuredClone(f.events.findLast(e=>e.actorId===f.actor&&e.homeRequest));event.homeRequest.pose.yaw+=.1;assert(f.c.accept(event));f.acceptClock();assert(f.farm.isCurrent());
  const p=f.prepareHome();assert.throws(()=>f.c.admitHome(p.nativeHome,{preparingWorldBoundary:p.worldBoundary}),/obsolete/);f.pauseEvents(false);f.pauseClocks(false);const binding=f.commitHome(p);assert(!f.farm.isCurrent());assert.throws(()=>f.c.installHomes(binding.reference.worldBoundary,[binding]),/stationary body/);assert.throws(()=>f.c.installHomes(binding.reference.worldBoundary,[binding],{bootstrap:true}),/stationary body/);
 }finally{f.close();}
});

test('Home installation cannot bootstrap another body from a known completed Farm ancestor',()=>{
 const f=fixture();try{f.requestHome();const binding=f.commitHome(f.prepareHome()),bad=structuredClone(binding);for(const r of [bad.reference,bad.preparedReference]){r.bodyId=3;r.sourceRequest.bodyId=3;}assert.throws(()=>f.c.installHomes(binding.reference.worldBoundary,[bad],{bootstrap:true}));assert.equal(f.c.installHomes(binding.reference.worldBoundary,[binding]),1);}finally{f.close();}
});

test('terminal Farm Home permission closes on retirement, removal or controller disposal',()=>{
 for(const action of ['retire','remove','dispose']){const f=fixture();try{f.requestHome();assert(f.farm.isCurrent());if(action==='dispose')f.c.dispose();else{assert.equal(action==='remove'?f.w.spatial_body_remove(1):f.w.nav_intent_retire_actor(f.actor),1);f.planner.commitNativeCausalClock();}assert(!f.farm.isCurrent());assert.equal(f.farm.routeRecord,null);assert.equal(f.farm.executionEnd,null);}finally{f.close();}}
});

test('late parent Farm acquisition retains the actual finite endpoint through Home19',()=>{
 const f=controlledNativeFarmArrival({peer:true});try{
  const p=f.prepare(true),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});f.advance(.2);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket).status,'revalidated');const binding=f.commit(p);assert.notEqual(binding.reference.endTime,p.nativeFarmArrival.endTime);assert.equal(f.c.installFarmArrivals(binding.reference.worldBoundary,[binding]),1);f.advance(binding.reference.endTime-f.state.elapsed+.05);assert(f.planner.projectNativeFarmArrivalExecution(f.state,f.worker).arrived);f.planner.projectNativeTaskExecution(f.state,f.state.workers[1]);const record=lease.routeRecord,body=f.body(1);f.state.time=600;f.planner.requestNativeFarmHome(f.state,f.worker);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert(lease.isCurrent());assert.equal(lease.routeRecord,record);assert.equal(record.safeUntil,binding.reference.endTime);assert.equal(lease.executionEnd,binding.reference.endTime);assert.equal(lease.executionEpoch,binding.reference.worldBoundary.effectiveTime);f.advance(.4);assert.deepEqual(f.body(1),body);assert(lease.isCurrent());
 }finally{f.close();}
});
