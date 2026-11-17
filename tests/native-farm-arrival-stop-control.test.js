import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeFarmArrival} from './helpers/native-farm-arrival-control.js';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {nativeSuspendedBodiesFromProposal} from '../src/world/native-suspended-body-reference.js';
import {nativeFarmArrivalStopCodec as farm,nativeIdleStrollStopCodec as idle,NATIVE_STOP_POSE_FIELDS} from '../src/world/native-worker-route-stop-codec.js';

// Genuine native Farm23/24 and ordered control. Installation here is a trusted
// authority fixture; it does not assert graphical preparation or a GPU receipt.
function fixture({installFarm=true,...options}={}){
 const f=controlledNativeFarmArrival({peer:true,...options});try{
  const route=f.prepare(true),routeLease=f.c.admitFarmArrival(route.nativeFarmArrival,{preparingWorldBoundary:route.worldBoundary}),binding=f.commit(route);if(installFarm)f.c.installFarmArrivals(binding.reference.worldBoundary,[binding]);f.advance(.12);
  const staged=f.planner.prepareNativeFarmArrivalStopProposal(f.actor);assert.equal(staged.status,'proposed');
  return {...f,route,routeLease,binding,prepared:staged.proposal,ticket:staged.ticket,refresh(){return f.planner.revalidateNativeFarmArrivalStopProposal(staged.ticket);},commitStop(){assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),staged.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.planner.flushNativeIntentControl();},proof(p=staged.proposal,projection=true){return f.planner.nativeFarmArrivalStopBinding(p.nativeStop,staged.proposal.nativeStop,projection?{projection:{version:1,routeEffects:p.routeEffects,gateEffects:p.gateEffects}}:{});}};
 }catch(error){f.close();throw error;}
}
const selector=(p,actor)=>({kind:farm.stoppedBodyKind,version:1,stop:p.nativeStop,actorId:actor});

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id}: Farm24 needs exact direct revocation, current clock and installed final projection`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({core:runtime?.core,profile:profile.id});const p=f.prepared,lease=f.c.admitFarmArrivalStop(p.nativeStop,{preparingWorldBoundary:p.worldBoundary}),bodyLease=f.c.admitFarmArrivalStoppedBody(selector(p,f.actor),{preparingWorldBoundary:p.worldBoundary}),old=f.routeLease.routeRecord,before=f.body(1),peer=f.body(3);
  assert(lease.isPrepared());assert(bodyLease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(bodyLease.isCurrent(),false);assert.equal(lease.binding,null);assert.equal(lease.sample,undefined);assert.throws(()=>bodyLease.value('x'),/obsolete/);
  f.advance(.2);assert.notDeepEqual(f.body(1),before);assert.notDeepEqual(f.body(3),peer);assert(lease.isPrepared());const refreshed=f.refresh();assert.equal(refreshed.status,'revalidated');assert(refreshed.timeTranslation.sameResourceOwners);const actual=refreshed.proposal;
  f.pauseClocks(true);f.commitStop();const proof=f.proof(actual);assert(proof);assert.equal(f.events.at(-1).type,'RouteInvalidated');assert.equal(f.events.at(-1).state,4);assert.equal(lease.isPrepared(),false);assert.equal(lease.isCurrent(),false);assert.equal(f.routeLease.isCurrent(),false);assert.equal(old.safeUntil,actual.effectiveTime);assert.throws(()=>f.c.installFarmArrivalStops(actual.worldBoundary,[proof]),/boundary|revocations/);
  f.acceptClock();f.pauseClocks(false);assert.equal(f.c.installFarmArrivalStops(actual.worldBoundary,[proof]),1);assert(lease.isCurrent());assert(bodyLease.isCurrent());assert(lease.isPrepared());assert.deepEqual(lease.binding.reference,proof.reference);assert.equal('projection' in lease.binding,false);
  const held=f.planner.nativeFarmArrivalHeldExecution(f.actor),row=proof.projection.routeEffects.rows.slice(8,26);for(const [key,index] of Object.entries(NATIVE_STOP_POSE_FIELDS))assert.equal(bodyLease.value(key),row[index]);assert.equal(bodyLease.value('age'),held.suspendedAt-f.binding.reference.worldBoundary.effectiveTime);assert.equal(bodyLease.value('x'),held.pose.x);assert.equal(bodyLease.value('runPhase'),held.pose.runPhase);assert.throws(()=>bodyLease.value('unknown'),/field/);
  const actualBody=nativeSuspendedBodiesFromProposal(actual,actual.worldBoundary)[0];assert.deepEqual(bodyLease.bodyReference,actualBody);assert(f.c.admitSuspended(actualBody).isCurrent());const heldBody=f.body(1),moving=f.body(3);f.advance(.2);assert(lease.isCurrent());assert(bodyLease.isCurrent());assert.deepEqual(f.body(1),heldBody);assert.notDeepEqual(f.body(3),moving);assert.equal(f.planner.nativeGameExecutionState(),-1);assert.throws(()=>f.c.installFarmArrivalStops(actual.worldBoundary,[proof]),/boundary/);
 }finally{f?.close();await runtime?.dispose();}
});

test('unadmitted Farm23 cannot prepare or install Farm24 despite its real native stop',()=>{
 const f=fixture({installFarm:false});try{const p=f.prepared;assert.throws(()=>f.c.admitFarmArrivalStop(p.nativeStop,{preparingWorldBoundary:p.worldBoundary}),/admitted farm arrival/);f.commitStop();const proof=f.proof();assert(proof);assert.throws(()=>f.c.installFarmArrivalStops(p.worldBoundary,[proof]),/admitted farm arrival source/);assert.throws(()=>f.c.admitFarmArrivalStoppedBody(selector(p,f.actor)),/admitted farm arrival/);}finally{f.close();}
});

test('Farm stop installation validates the whole batch before any owner write',()=>{
 const f=fixture();try{const p=f.prepared,lease=f.c.admitFarmArrivalStop(p.nativeStop,{preparingWorldBoundary:p.worldBoundary});f.commitStop();const proof=f.proof(),bad=structuredClone(proof);bad.reference.routes[0].bodyId++;bad.preparedReference.routes[0].bodyId++;delete bad.projection;
  for(const values of [[proof,bad],[proof,proof],null,{}]){assert.throws(()=>f.c.installFarmArrivalStops(p.worldBoundary,values));assert.equal(lease.isCurrent(),false);}assert.throws(()=>f.c.installFarmArrivalStops(p.worldBoundary,[proof],{bootstrap:true}),/boundary/);assert.equal(lease.isCurrent(),false);assert.equal(f.c.installFarmArrivalStops(p.worldBoundary,[proof]),1);assert(lease.isCurrent());assert.throws(()=>f.c.installFarmArrivalStops(p.worldBoundary,[proof]),/revocations/);assert(lease.isCurrent());
 }finally{f.close();}
});

for(const change of ['assignment','epoch','boundary'])test(`Farm stop preparation rejects substituted ${change} without mutating control`,()=>{
 const f=fixture();try{const p=f.prepared,r=structuredClone(p.nativeStop),b=structuredClone(p.worldBoundary),before=f.c.status();if(change==='assignment'){r.sourceRoute.assignmentSequence++;r.routes[0].nativeRoute.assignmentSequence++;}if(change==='epoch'){r.worldBoundary.authorityEpoch='foreign';r.sourceRoute.routeHandle.authorityEpoch='foreign';r.routes[0].nativeRoute.routeHandle.authorityEpoch='foreign';b.authorityEpoch='foreign';}if(change==='boundary')b.ticket++;assert.throws(()=>f.c.admitFarmArrivalStop(r,{preparingWorldBoundary:b}),/obsolete|admitted farm arrival/);assert.equal(f.c.status().sequence,before.sequence);assert(f.routeLease.isCurrent());}finally{f.close();}
});

test('genuine Farm and Idle stops cannot acquire each other family even after structural retagging',()=>{
 const f=fixture();let g;try{
  const p=f.prepared,retag=structuredClone(p.nativeStop);retag.kind=idle.referenceKind;assert.throws(()=>f.c.admitStrollStop(retag,{preparingWorldBoundary:p.worldBoundary}),/admitted stroll/);assert.throws(()=>f.c.admitStrollStop(p.nativeStop));f.commitStop();const proof=f.proof(),other=structuredClone(proof);other.kind=idle.attestationKind;other.reference.kind=other.preparedReference.kind=idle.referenceKind;assert.throws(()=>f.c.installStrollStops(p.worldBoundary,[other]),/admitted stroll source/);assert.throws(()=>f.c.installFarmArrivalStops(p.worldBoundary,[other]));assert.equal(f.c.installFarmArrivalStops(p.worldBoundary,[proof]),1);
  g=controlledNativeIdleStroll();const walk=g.prepare(),b=g.commitStroll(walk);g.c.installStrolls(b.reference.worldBoundary,[b]);g.advance(.12);const stop=g.planner.prepareNativeIdleStrollStopProposal(g.actor).proposal,r=structuredClone(stop.nativeStop);r.kind=farm.referenceKind;assert.throws(()=>g.c.admitFarmArrivalStop(r,{preparingWorldBoundary:stop.worldBoundary}),/admitted farm arrival/);assert.equal(g.w.spatial_world_proposal_stop_commit_bound(...g.tuple().slice(0,5),stop.ticket),1);g.planner.commitNativeCausalClock();const actual=g.planner.nativeIdleStrollStopBinding(stop.nativeStop),wrong=structuredClone(actual);wrong.kind=farm.attestationKind;wrong.reference.kind=wrong.preparedReference.kind=farm.referenceKind;assert.throws(()=>g.c.installFarmArrivalStops(stop.worldBoundary,[wrong]),/admitted farm arrival source/);assert.equal(g.c.installStrollStops(stop.worldBoundary,[actual]),1);
 }finally{g?.close();f.close();}
});

test('zero Farm arrival still rejects held revocation without changing its live lease',()=>{
 const f=controlledNativeFarmArrival({inside:true});try{const p=f.prepare(),b=f.commit(p);f.c.installFarmArrivals(b.reference.worldBoundary,[b]);const lease=f.c.admitFarmArrival(p.nativeFarmArrival),event=f.events.at(-1),sequence=f.c.status().sequence,bad={...event,type:'RouteInvalidated',state:4,sequence:sequence+1,routeHandle:null,revokedRouteHandle:event.routeHandle};delete bad.nativeFarmArrival;assert.throws(()=>f.c.accept(bad),/prepared lifecycle/);assert.equal(f.c.status().sequence,sequence);assert(lease.isCurrent());assert.equal(f.planner.prepareNativeFarmArrivalStopProposal(f.actor).status,'blocked');}finally{f.close();}
});

test('only the exact moving Farm held revocation is accepted before release installation',()=>{
 const f=fixture();try{const lease=f.c.admitFarmArrivalStop(f.prepared.nativeStop,{preparingWorldBoundary:f.prepared.worldBoundary});f.pauseEvents(true);f.pauseClocks(true);f.commitStop();const event=f.events.at(-1),before=f.c.status().sequence;
  for(const mutate of [e=>e.state=0,e=>e.state=5,e=>e.type='RouteCompleted',e=>e.effectiveTime=f.binding.reference.endTime,e=>e.revokedRouteHandle.generation++,e=>e.routeHandle=e.revokedRouteHandle,e=>e.taskId=999]){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before);assert(f.routeLease.isCurrent());}
  assert(f.c.accept(event));assert.equal(f.routeLease.isCurrent(),false);f.acceptClock();assert.throws(()=>f.c.admitFarmArrivalStop(f.prepared.nativeStop),/obsolete/);assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);
 }finally{f.close();}
});

test('metadata without final native projection grants no body values, and owner retirement revokes held leases',()=>{
 const f=fixture();try{const p=f.prepared,bodyLease=f.c.admitFarmArrivalStoppedBody(selector(p,f.actor),{preparingWorldBoundary:p.worldBoundary});f.commitStop();const metadata=f.proof(p,false);assert(metadata);assert.equal(f.c.installFarmArrivalStops(p.worldBoundary,[metadata]),1);const lease=f.c.admitFarmArrivalStop(p.nativeStop);assert(lease.isCurrent());assert.equal(bodyLease.isCurrent(),false);assert.throws(()=>bodyLease.value('x'),/obsolete/);assert.throws(()=>f.c.admitFarmArrivalStoppedBody(selector(p,f.actor)),/obsolete|projection|admitted/);assert.equal(f.w.nav_intent_retire_actor(f.actor),1);f.planner.commitNativeCausalClock();f.planner.flushNativeIntentControl();assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);assert.equal(bodyLease.isCurrent(),false);}finally{f.close();}
});

test('cancellation and control disposal never turn a prepared Farm stop into execution',()=>{
 const f=fixture();try{const p=f.prepared,lease=f.c.admitFarmArrivalStop(p.nativeStop,{preparingWorldBoundary:p.worldBoundary}),body=f.c.admitFarmArrivalStoppedBody(selector(p,f.actor),{preparingWorldBoundary:p.worldBoundary});assert(f.planner.cancelNativeFarmArrivalStopProposal(f.ticket));f.advance(.1);assert(f.routeLease.isCurrent());assert.equal(lease.isCurrent(),false);assert.equal(body.isCurrent(),false);f.c.dispose();assert.equal(lease.isPrepared(),false);assert.equal(body.isPrepared(),false);assert.equal(lease.binding,null);}finally{f.close();}
});
