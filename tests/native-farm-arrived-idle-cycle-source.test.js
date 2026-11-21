import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivedIdleCycleFixture as fixture} from './helpers/native-farm-arrived-idle-cycle.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {copyNativeInitialIdleState} from '../src/world/native-initial-idle-request-reference.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {copyNativeIdleCycleBodySource} from '../src/world/native-idle-cycle-body-source.js';
import {tick} from '../src/simulation/game.js';
import {updateIdle} from '../src/simulation/idle.js';
import {nativeHomeRequestContinuesIdleCycle} from '../src/world/native-home-request-reference.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const inside of [false,true])test(`${threaded?'pthread':'standalone'} ${profile.id} ${inside?'inside':'travelled'} actual completed23 retains its body through finite Idle21`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({core:runtime?.core,profile:profile.id,inside});const body=f.body(1),rng=f.state.rng,sequence=f.w.nav_intent_transition_sequence(),count=f.w.spatial_body_count(),p=f.prepare(),q=p.nativeIdleCycle.sourceBody;
  assert.equal(q.kind,'native-farm-arrival-idle-source');assert.equal(q.bodyId,1);assert.equal(q.sourceSequence,f.farmBinding.assignmentSequence);assert.equal(q.sourceAt,f.farmBinding.reference.endTime);assert.deepEqual(q.idleState,copyNativeInitialIdleState(f.birth));assert.equal(q.pose.yaw,f.source.yaw);for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(q.pose[key],f.source[key]);
  assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.events.length,0);assert.deepEqual(f.body(1),body);
  f.advance(1.8);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor).assignmentSequence,f.farmBinding.assignmentSequence);const next=f.planner.revalidateNativeIdleCycleProposal(p.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.compatible);assert(f.planner.cancelNativeIdleCycleProposal(next.proposal.ticket));assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);
  const original=f.prepare();f.advance(.2);assert.equal(f.planner.revalidateNativeIdleCycleProposal(original.ticket).status,'revalidated');const binding=f.commitIdle(original);assert.deepEqual(binding.reference.sourceBody,q);assert(binding.reference.worldBoundary.effectiveTime>binding.preparedReference.worldBoundary.effectiveTime);assert.equal(binding.reference.sourceCycleSequence,0);assert.equal(f.events.length,1);assert.equal(f.events[0].type,'RouteCompleted');assert.equal(f.events[0].state,7);assert.deepEqual(f.events[0].revokedRouteHandle,f.farmBinding.reference.expectedRouteHandle);assert.deepEqual(f.events[0].idleCycle,binding);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor),null);assert.equal(f.worker.status,'idle');assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.deepEqual(f.body(1),body);f.advance(.2);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_body_count(),count);assert.equal(f.state.rng,rng);
 }finally{f?.close();await runtime?.dispose();}
});

for(const profile of PROFILES)test(`${profile.id} Farm Idle birth and watch boundary match original idle.js and Game ticks`,()=>{
 const f=fixture({profile:profile.id,inside:true});try{
  const rng=f.state.rng,body=f.body(1),peer=f.body(3),p=f.prepare();f.commitIdle(p);const oracle=structuredClone(f.worker),nav={path(){throw Error('Stationary birth must not plan a JS path');}};
  tick(f.state,.2,f.nav);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);updateIdle(oracle,f.idleAnchor,.2,nav,f.state.seed);assert.equal(f.worker.idleState.mode,oracle.idleState.mode);assert.equal(f.worker.idleState.rng,oracle.idleState.rng);assert(Math.abs(f.worker.idleState.elapsed-oracle.idleState.elapsed)<1e-10);
  const rest=f.birth.remaining-.2;f.advance(rest);updateIdle(oracle,f.idleAnchor,rest,nav,f.state.seed);assert.equal(f.worker.idleState.mode,'watch');assert.equal(f.worker.idleState.mode,oracle.idleState.mode);assert.equal(f.worker.idleState.rng,oracle.idleState.rng);assert(Math.abs(f.worker.idleState.remaining-oracle.idleState.remaining)<1e-8);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{f.close();}
});

test('moving Farm, expired contract and a distant original Idle anchor do not acquire stationary21',()=>{
 for(const options of [{complete:false},{anchor:false}]){const f=fixture(options);try{const body=f.body(1),seq=f.w.nav_intent_transition_sequence();assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');assert.equal(f.rawStage(),-2);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),seq);}finally{f.close();}}
 const f=fixture();try{f.worker.contractDay--;assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);}finally{f.close();}
});

test('Farm Idle raw stage rejects foreign identity and malformed birth without changing the source',()=>{
 const f=fixture();try{const body=f.body(1),seq=f.w.nav_intent_transition_sequence();for(const change of [{actor:900012},{session:f.w.nav_intent_session()+1},{sequence:f.farmBinding.assignmentSequence+1},{rng:0},{rng:NaN},{rng:0x100000000},{kind:3},{id:900097},{radius:0},{x:f.idleAnchor.x+100}])assert.notEqual(f.rawStage(change),1);assert.equal(f.w.nav_intent_transition_sequence(),seq);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeFarmArrivalRouteBinding(f.actor).assignmentSequence,f.farmBinding.assignmentSequence);}finally{f.close();}
});

for(const field of ['x','heading','profile','centerId','status'])test(`changed ${field} cannot prepare Idle from an incompatible Farm mirror`,()=>{
 const f=fixture();try{if(field==='profile')f.worker.profile=PROFILES.find(p=>p.id!==f.worker.profile).id;else if(field==='centerId')f.worker.centerId='center-123456';else if(field==='status')f.worker.status='idle';else f.worker[field]+=.1;assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);}finally{f.close();}
});

test('Farm Idle source preserves original deterministic birth rather than stroll REST semantics',()=>{
 const f=fixture();try{const p=f.prepare(),q=p.nativeIdleCycle.sourceBody;assert.deepEqual(copyNativeIdleCycleBodySource(q),q);for(const idleState of [{...q.idleState,rng:0},{...q.idleState,remaining:q.idleState.remaining+1},{...q.idleState,elapsed:.1},{...q.idleState,approachRetry:.1}])assert.throws(()=>copyNativeIdleCycleBodySource({...q,idleState}));assert(f.planner.cancelNativeIdleCycleProposal(p.ticket));}finally{f.close();}
});

test('late acquired Farm supplies its actual end and executed pose to Idle21',()=>{
 const f=fixture({farmDelay:.3});try{assert(f.farmBinding.reference.endTime>f.farmBinding.preparedReference.endTime);const p=f.prepare();assert.equal(p.nativeIdleCycle.sourceBody.sourceAt,f.farmBinding.reference.endTime);const body=f.body(1);f.advance(.4);assert.equal(f.planner.revalidateNativeIdleCycleProposal(p.ticket).status,'revalidated');f.commitIdle(p);assert.deepEqual(f.body(1),body);}finally{f.close();}
});

for(const profile of PROFILES)test(`${profile.id} Farm can enter Idle at its original center service anchor without crops`,()=>{
 const f=fixture({profile:profile.id,peer:false,anchor:false});try{const p=f.prepare();assert.equal(p.nativeIdleCycle.sourceBody.idleState.anchorId,`farm-${f.worker.centerId}`);const body=f.body(1);f.commitIdle(p);assert.deepEqual(f.body(1),body);assert.equal(f.worker.status,'idle');}finally{f.close();}
});

test('a pending Idle candidate pins its Farm body and is invalidated by body removal',()=>{
 const f=fixture();try{
  const p=f.prepare(),body=f.body(1),seq=f.w.nav_intent_transition_sequence();assert.notEqual(f.w.spatial_body_upsert(1,body.x+.1,body.z,body.radius,body.kind,body.flags),1);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_transition_sequence(),seq);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.captureNativeIdleCycleProposal(p.ticket),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);
 }finally{f.close();}
});

test('ordinary Game task production may replace the new Farm Idle intention without moving its body',()=>{
 const f=fixture({inside:true,anchorReady:false});try{
  f.commitIdle(f.prepare());const body=f.body(1),rng=f.state.rng;tick(f.state,.1,f.nav);assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);const request=f.planner.pendingTaskRoute(f.actor);assert(request);assert.equal(request.actorId,f.actor);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{f.close();}
});

test('Home after the new Idle cycle retains the same native body and cycle ancestry',()=>{
 const f=fixture({inside:true});try{
  const binding=f.commitIdle(f.prepare()),body=f.body(1);f.state.time=600;const request=f.planner.requestNativeIdleHome(f.state,f.worker);assert.equal(request.bodyId,1);assert.equal(request.pose.x,body.x);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert(nativeHomeRequestContinuesIdleCycle(request,binding));const p=f.planner.prepareNativeHomeRouteProposal(request);assert.equal(p.status,'proposed');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert(f.planner.cancelNativeHomeRouteProposal(p.proposal.ticket));
 }finally{f.close();}
});
