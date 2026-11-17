import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleArrivalFixture,acquireNativeIdleArrivalStroll} from './helpers/native-idle-arrival.js';
import {controlledNativeIdleStroll} from './helpers/native-idle-stroll-control.js';
import {copyNativeIdleCycleBodySource,nativeIdleCycleBodyState} from '../src/world/native-idle-cycle-body-source.js';
import {copyNativeIdleCycleReference,copyNativeIdleCycleAttestation,copyNativeIdleCycleProposal} from '../src/world/native-idle-cycle.js';
import {nativeIdleStrollArrivalSourceMatches,nativeIdleStrollContinuesNext} from '../src/world/native-idle-stroll.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {tick} from '../src/simulation/game.js';
import {idleCycleAdmissionProtocol} from './helpers/native-idle-cycle-admission.js';

for(const profile of PROFILES)test(`${profile.id} current-body DTO takes the actual endpoint and survives capture, retiming and acquisition`,()=>{
 const f=nativeIdleArrivalFixture({profile:profile.id});try{
  const actual=f.arrive(),worker=structuredClone(f.worker),body=f.body(1),worldRng=f.state.rng,p=f.prepareRest(),r=p.nativeIdleCycle,q=r.sourceBody;
  assert.deepEqual(copyNativeIdleCycleProposal(p),p);assert.equal(q.kind,'native-idle-stroll-arrival-source');assert.equal(q.sourceSequence,f.strollBinding.assignmentSequence);assert.equal(q.sourceAt,f.strollBinding.reference.endTime);assert.deepEqual(q.pose,actual.pose);assert.deepEqual(q.idleState,{anchorId:f.worker.idleState.anchorId,...actual.desiredRest});assert(nativeIdleStrollArrivalSourceMatches(q,f.strollBinding));assert.deepEqual(nativeIdleCycleBodyState(q),q);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.deepEqual(f.worker,worker);assert.equal(f.planner.nativeIdleCycleBindings().length,0);
  f.advance(.2);const renewed=f.planner.revalidateNativeIdleCycleProposal(p.ticket);assert.equal(renewed.status,'revalidated');assert(renewed.timeTranslation.compatible);assert.deepEqual(renewed.proposal.nativeIdleCycle.sourceBody,q);const binding=f.commitRest(p);assert.deepEqual(copyNativeIdleCycleAttestation(binding),binding);assert.deepEqual(binding.preparedReference,r);assert.deepEqual(binding.reference,renewed.proposal.nativeIdleCycle);assert.deepEqual(f.planner.nativeIdleCycleBindings(),[binding]);assert.deepEqual(f.body(1),body);assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.worker.destinationId,null);assert.deepEqual(f.worker.idleState,f.planner.nativeIdleCycleExecution(f.actor).idleState);assert.equal(f.worker.idleState.rng,q.idleState.rng);assert.equal(f.state.rng,worldRng);
 }finally{f.close();}
});

test('the arrived source is a bounded value descriptor and rejects history, role and phase substitutions',()=>{
 const f=nativeIdleArrivalFixture();try{
  f.arrive();const p=f.prepareRest(),q=p.nativeIdleCycle.sourceBody;
  assert(Object.isFrozen(q)&&Object.isFrozen(q.pose)&&Object.isFrozen(q.idleState));assert.equal(q.reference,undefined);assert.equal(q.sourceBody,undefined);assert.equal(q.sourceStroll,undefined);
  for(const mutate of [v=>v.sourceBody=f.strollBinding,v=>v.reference={},v=>v.kind='native-initial-idle-body-attestation',v=>v.pose.routeHandle={},v=>v.sourceSequence=0,v=>v.nativeSession=0,v=>v.bodyId=-1,v=>v.bodyFlags|=2,v=>v.workerProfile='unknown',v=>v.pose.walkPhase=-1,v=>v.idleState.mode='walk',v=>v.idleState.elapsed=1,v=>v.idleState.remaining+=1]){const bad=structuredClone(q);mutate(bad);assert.throws(()=>copyNativeIdleCycleBodySource(bad));}
  for(const mutate of [v=>v.sourceBody.nativeSession++,v=>v.sourceBody.authorityEpoch+='old',v=>v.sourceBody.bodyId++,v=>v.sourceBody.profile++,v=>v.initialState.rng^=1,v=>v.sourceCycleSequence=q.sourceSequence]){const bad=structuredClone(p.nativeIdleCycle);mutate(bad);assert.throws(()=>copyNativeIdleCycleReference(bad));}
  assert(f.planner.cancelNativeIdleCycleProposal(p.ticket));assert.equal(f.planner.captureNativeIdleCycleProposal(p.ticket),null);assert.equal(f.worker.idleState.mode,'walk');
 }finally{f.close();}
});

test('metadata cannot prepare REST without its admitted stroll, and the old lease is revoked on acquisition',()=>{
 for(const admitted of [false,true]){const f=nativeIdleArrivalFixture({installStroll:admitted});try{
  f.arrive();const p=f.prepareRest(),before=f.c.status().sequence;
  if(!admitted){assert.throws(()=>f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),/obsolete/);f.pauseControl(true);f.pauseClock(true);f.commitRest(p,{install:false,project:false});assert.throws(()=>f.c.accept(f.events.at(-1)),/admitted body/);assert.equal(f.c.status().sequence,before);continue;}
  const lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),old=f.strollLease.routeRecord;assert(lease.isPrepared());assert(!lease.isCurrent());const proof=f.commitRest(p,{install:false});assert.equal(f.events.at(-1).type,'RouteCompleted');assert.deepEqual(f.events.at(-1).idleCycle,proof);assert.equal(old.safeUntil,f.state.elapsed);assert(!f.strollLease.isCurrent());assert(!lease.isCurrent());assert(lease.isPrepared());assert.equal(lease.idleCycleRecord,null);assert.equal(f.c.installIdleCycles(proof.reference.worldBoundary,[proof]),1);assert(lease.isCurrent());
 }finally{f.close();}}
});

test('REST source identity and endpoint substitutions cannot borrow a presented stroll',()=>{
 const f=nativeIdleArrivalFixture();try{
  f.arrive();const p=f.prepareRest();
  for(const mutate of [v=>v.sourceBody.sourceAt-=.001,v=>v.sourceBody.sourceSequence--,v=>v.sourceBody.pose.x+=.01,v=>v.sourceBody.pose.runPhase+=1,v=>v.sourceBody.pose.runRemaining+=1,v=>v.sourceBody.centerId++]){const bad=structuredClone(p.nativeIdleCycle);mutate(bad);assert.throws(()=>f.c.admitIdleCycle(bad,{preparingWorldBoundary:p.worldBoundary}));}
  // Structural data alone cannot attest a new heading. It may prepare a graph,
  // but only the exact native-issued association may ever become drawable.
  const altered=structuredClone(p.nativeIdleCycle);altered.sourceBody.pose.yaw+=.1;const forged=f.c.admitIdleCycle(altered,{preparingWorldBoundary:p.worldBoundary}),proof=f.commitRest(p);assert(!forged.isCurrent());assert(!forged.isPrepared());assert.throws(()=>f.c.installIdleCycles(proof.reference.worldBoundary,[{...proof,reference:altered,preparedReference:altered}]));
 }finally{f.close();}
});

test('REST completion events require the exact revoked route and typed current source before advancing the cursor',()=>{
 const f=nativeIdleArrivalFixture();try{
  f.arrive();const p=f.prepareRest();f.pauseControl(true);f.pauseClock(true);const proof=f.commitRest(p,{install:false,project:false}),event=f.events.at(-1),before=f.c.status().sequence;
  for(const mutate of [e=>{delete e.idleCycle;},e=>e.type='IntentChanged',e=>{delete e.revokedRouteHandle;},e=>e.revokedRouteHandle.generation++,e=>e.idleCycle.reference.sourceBody.sourceSequence--,e=>e.idleCycle.reference.sourceBody.pose.x+=.01,e=>e.homeRequest={},e=>e.idleCycleNext={},e=>e.idleCycle.cycleSequence++]){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before);}
  assert(f.c.accept(event));assert.throws(()=>f.c.installIdleCycles(proof.reference.worldBoundary,[proof]));f.acceptLastClock();f.pauseControl(false);f.pauseClock(false);assert.equal(f.c.installIdleCycles(proof.reference.worldBoundary,[proof]),1);f.planner.projectNativeIdleCycle(f.state,f.worker);assert.equal(f.worker.idleState.mode,'rest');
 }finally{f.close();}
});

test('a late consumer receives the real moved-body source but cannot bootstrap a graphical permission',()=>{
 const f=nativeIdleArrivalFixture();let c,detach;try{
  f.arrive();const p=f.prepareRest(),proof=f.commitRest(p);let baseline;
  detach=f.planner.observeNativeIntentControl({onBaseline(b){baseline=b;},onChanges(){}});assert.deepEqual(baseline.nativeIdleCycles,[proof]);
  c=createNativeRouteControl({authorityEpoch:baseline.authorityEpoch,initialSequence:baseline.sequence,initialTime:baseline.effectiveTime,routes:baseline.routes,nativeIdleCycles:baseline.nativeIdleCycles,pendingIdleCycleRequests:baseline.pendingIdleCycleRequests??[]});c.acceptClock({...baseline.clock,anchorAbsoluteMs:1000,anchorLogicalTime:baseline.clock.committedThrough},{baseline:true});assert.throws(()=>c.admitIdleCycle(proof.reference,{preparingWorldBoundary:proof.reference.worldBoundary}),/obsolete/);assert.throws(()=>c.installIdleCycles(proof.reference.worldBoundary,[proof],{bootstrap:true}));assert.throws(()=>c.installIdleCycles(proof.reference.worldBoundary,[proof]));
 }finally{detach?.();c?.dispose();f.close();}
});

test('REST preparation rejects stale Game pose, private intent and source watermark',()=>{
 for(const change of ['pose','rng','destination','watermark','contract']){const f=nativeIdleArrivalFixture();try{
  f.arrive();const sequence=f.w.nav_intent_transition_sequence();if(change==='pose')f.worker.heading+=.1;if(change==='rng')f.worker.idleState.rng^=1;if(change==='destination')f.worker.idleState.destination.x+=.1;if(change==='watermark')f.state.elapsed+=.1;if(change==='contract')f.worker.contractDay=f.state.day-1;
  if(change==='watermark')assert.throws(()=>f.planner.prepareNativeIdleCycleProposal(f.actor),/Native intent time regressed/);else assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
 }finally{f.close();}}
});

test('Game projects REST only after acquisition and reads its actual held-body native cohort',()=>{
 const f=nativeIdleArrivalFixture();try{
  f.arrive();const body=f.body(1),worker=structuredClone(f.worker),p=f.prepareRest();assert.deepEqual(f.worker,worker);assert.equal(f.planner.projectNativeIdleCycle(f.state,f.worker),null);const binding=f.commitRest(p,{project:false});assert.deepEqual(f.worker,worker);f.planner.projectNativeIdleCycle(f.state,f.worker);assert.equal(f.worker.idleState.rng,binding.reference.initialState.rng);assert.deepEqual(f.body(1),body);const idle=f.worker.idleState;f.planner.projectNativeIdleCycle(f.state,f.worker);assert.equal(f.worker.idleState,idle);assert.equal(f.planner.nativeGameExecutionState(),1);const at=f.state.elapsed;f.advance(.1);const view=f.planner.projectNativeIdleCycle(f.state,f.worker);assert.equal(view.executedThrough,f.state.elapsed);assert.equal(f.state.elapsed,at+.1);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('the actual source and both preparation/control transports retain WALK until the REST acquisition',async()=>{
 let f=controlledNativeIdleStroll(),p,lease;try{
  let worker,body,peer,rng,prepared;
  p=await idleCycleAdmissionProtocol(f,{admit(resources){lease=f.c.admitIdleCycle(resources.nativeIdleCycle,{preparingWorldBoundary:resources.worldBoundary});return lease;},onPrepare(resources){prepared=resources;assert.deepEqual(f.worker,worker);assert(lease.isPrepared());assert(!lease.isCurrent());f.advance(.2);},onDrain(){assert.deepEqual(f.worker,worker);assert(f.strollLease.isCurrent());f.advance(.1);},onCommit(value){assert.deepEqual(f.worker,worker);assert.equal(value.resources.kind,21);},onRelease(m){if(m.committed)f.c.installIdleCycles(m.worldBoundary,m.nativeIdleCycles);}});
  f=acquireNativeIdleArrivalStroll(f);f.arrive();worker=structuredClone(f.worker);body=f.body(1);peer=f.body(3);rng=f.state.rng;
  const result=await p.run();assert.equal(result.status,'committed',JSON.stringify(result));await p.released;assert.equal(p.counters().preparations,1);assert.equal(p.counters().commits,1);assert(result.timeTranslation.compatible);assert(result.nativeIdleCycleBinding.reference.worldBoundary.effectiveTime>prepared.worldBoundary.effectiveTime);assert.equal(result.receipt.nativeIdleCycleVersion,1);assert.deepEqual(result.nativeIdleCycleBinding.preparedReference,prepared.nativeIdleCycle);assert.deepEqual(p.requests.at(-1).nativeIdleCycles,[result.nativeIdleCycleBinding]);assert.equal(p.requests.at(-1).nativeInitialIdleBodies,undefined);assert(lease.isCurrent());assert(!f.strollLease.isCurrent());assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.worker.idleState.mode,'rest');assert.deepEqual(f.worker.idleState,f.planner.nativeIdleCycleExecution(f.actor).idleState);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.equal(f.state.rng,rng);assert.deepEqual(p.errors,[]);
 }finally{await p?.close();f.close();}
});

for(const failure of ['abort','semantic','receipt'])test(`a ${failure} during prepared REST cannot acquire it or advance the private WALK`,async()=>{
 let f=controlledNativeIdleStroll(),p;const controller=new AbortController();try{
  p=await idleCycleAdmissionProtocol(f,{admit:r=>f.c.admitIdleCycle(r.nativeIdleCycle,{preparingWorldBoundary:r.worldBoundary}),onPrepare(){if(failure==='abort')controller.abort();if(failure==='semantic')f.worker.idleState.rng^=1;},receipt:m=>failure==='receipt'?{...m,nativeIdleCycleVersion:0}:m});
  f=acquireNativeIdleArrivalStroll(f);f.arrive();const actual=f.planner.nativeIdleStrollExecution(f.actor),body=f.body(1),rng=f.state.rng;
  const result=await p.run(controller.signal);assert.equal(result.status,{abort:'control-failed',semantic:'stale',receipt:'control-failed'}[failure],JSON.stringify(result));assert.equal(p.counters().commits,0);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollExecution(f.actor).walkState.rng,actual.walkState.rng);assert.equal(f.worker.nativeRouteAdmission,'native-idle-stroll');assert(f.strollLease.isCurrent());assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
 }finally{await p?.close();f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} repeated typed cycles preserve the current body source without permission ancestry`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleArrivalFixture({...runtime?{core:runtime.core}:{}});let bodyCount=f.w.spatial_body_count(),rootSequence=0;
  for(let i=0;i<3;i++){
   const live=f.planner.nativeIdleStrollExecution(f.actor);f.advance(live.binding.reference.endTime-f.state.elapsed+.01);f.planner.projectNativeIdleStroll(f.state,f.worker);const p=f.prepareRest(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),binding=f.commitRest(p),q=binding.reference.sourceBody;assert(lease.isCurrent());assert(q.sourceSequence>rootSequence);rootSequence=q.sourceSequence;assert.equal(q.reference,undefined);
   let next;for(let cycles=0;cycles<20;cycles++){
    const dt=f.planner.nativeIdleCycleExecution(f.actor).endTime-f.state.elapsed;if(dt>0)f.advance(dt);f.planner.projectNativeIdleCycle(f.state,f.worker);next=f.planner.nativeIdleCycleNextRequest(f.actor);if(next.idleState.mode==='walk')break;
    const again=f.prepareRest();f.commitRest(again);
   }
   assert.equal(next.idleState.mode,'walk');const stroll=f.prepare();assert(nativeIdleStrollContinuesNext(stroll.nativeIdleStroll,next));assert.deepEqual(stroll.nativeIdleStroll.pose,q.pose);const walkLease=f.c.admitStroll(stroll.nativeIdleStroll,{preparingWorldBoundary:stroll.worldBoundary}),b=f.commitStroll(stroll);f.c.installStrolls(b.reference.worldBoundary,[b]);assert(walkLease.isCurrent());assert(!lease.isCurrent());f.planner.projectNativeIdleStroll(f.state,f.worker);assert.equal(f.w.spatial_body_count(),bodyCount);
  }
 }finally{f?.close();await runtime?.dispose();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} stationary post-stroll REST saves semantic state and restores fresh initial resources`,async()=>{
 const source=nativeIdleArrivalFixture({peer:false});let saved,old,runtime,f;try{source.arrive();old=source.commitRest(source.prepareRest());source.advance(.1);source.planner.projectNativeIdleCycle(source.state,source.worker);assert(confirmedStateSaveAvailable(source.state));const encoded=serialize(source.state);assert(!encoded.includes('native-idle-stroll-arrival-source'));assert(!encoded.includes('sourceSequence'));saved=deserialize(encoded);}finally{source.close();}
 try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=restoreNativeActionGame(saved,{admitPeer:false,...runtime?{core:runtime.core}:{}});const request=f.planner.nativeInitialIdleRequestReference(f.actor);assert(request);assert.notEqual(request.authorityEpoch,old.reference.worldBoundary.authorityEpoch);assert.deepEqual(request.idleState,saved.workers[0].idleState);assert.equal(f.worker.nativeRouteAdmission,'pending-idle-resources');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);const body=f.body(1),first=f.planner.prepareNativeInitialIdleBodyProposal(request);assert.equal(first.status,'proposed');assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...f.tuple().slice(0,5),first.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeInitialIdleBody(f.state,f.worker);const cycle=f.planner.prepareNativeIdleCycleProposal(f.actor);assert.equal(cycle.status,'proposed');assert.equal(cycle.proposal.nativeIdleCycle.sourceBody.kind,'native-initial-idle-body-attestation');assert.equal(f.w.nav_idle_cycle_proposal_commit_bound(...f.tuple().slice(0,5),cycle.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeIdleCycle(f.state,f.worker);assert.deepEqual(f.worker.idleState,saved.workers[0].idleState);assert.deepEqual(f.body(1),body);
 }finally{f?.close();await runtime?.dispose();}
});
