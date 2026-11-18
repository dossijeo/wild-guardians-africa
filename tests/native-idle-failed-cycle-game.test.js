import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleFailedCycleGame,nativeIdleFailedCycleBridge} from './helpers/native-idle-failed-cycle-game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {tick} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {copyNativeIdleCycleBodySource} from '../src/world/native-idle-cycle-body-source.js';
import {copyNativeIdleCycleReference,copyNativeIdleCycleProposal,copyNativeIdleCycleAttestation,copyNativeIdleCycleNextRequest,nativeIdleCycleWatchKnot} from '../src/world/native-idle-cycle.js';
import {floorFloat32} from '../src/float32-time.js';
import {createNativeIdleCycleGpuMotion} from '../src/rendering/native-idle-cycle-gpu-motion.js';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {cropSpec} from '../src/simulation/rules.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} Game admits ${profile.id} failed WALK as native REST without a moved body, JS mover or invented initial20/arrived22`,async()=>{
 const f=await nativeIdleFailedCycleGame({threaded,profile:profile.id});try{
  const before=structuredClone(f.worker),body=f.body(1),rng=f.state.rng,q=f.sourceRequest,p=f.prepareCycle(),r=p.nativeIdleCycle;
  assert.equal(r.version,2);assert.equal(r.sourceBody.kind,'native-idle-stroll-failed-source');assert.deepEqual(r.sourceBody.sourceRequest,q);assert.equal(r.sourceCycleSequence,0);assert.equal(r.duration,q.approachRetry);assert.deepEqual(copyNativeIdleCycleProposal(p),p);assert.deepEqual(f.worker,before);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);
  const binding=f.commitCycle(p);assert.deepEqual(copyNativeIdleCycleAttestation(binding),binding);assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.worker.destinationId,null);assert.equal(f.worker.path,null);assert.deepEqual(f.worker.idleState,r.initialState);assert.equal(f.worker.idleState.mode,'rest');
  tick(f.state,.1,f.nav);const view=f.planner.nativeIdleCycleExecution(f.actor);assert.deepEqual(f.worker.idleState,view.idleState);close(view.idleState.elapsed,.1);assert.equal(view.idleState.rng,r.initialState.rng);assert.equal(f.state.rng,rng);assert.deepEqual(f.body(1),body);assert.equal(f.worker.x,before.x);assert.equal(f.worker.z,before.z);assert.deepEqual(view.binding.reference.sourceBody.sourceRequest,q);
 }finally{await f.dispose();}
});

for(const rng of [0,1,0xffffffff])test(`Game applies only admitted retry continuations across REST/WATCH with original stream ${rng}`,async()=>{
 const f=await nativeIdleFailedCycleGame({retry:0,rng});try{
  const body=f.body(1),worldRng=f.state.rng,original=JSON.stringify(f.sourceRequest),first=f.prepareCycle();assert.equal(first.nativeIdleCycle.duration,0);f.commitCycle(first);let sawWatch=false,sawRestAgain=false,previous='rest';
  for(let i=0;i<40&&!sawRestAgain;i++){
   const view=f.planner.nativeIdleCycleExecution(f.actor),next=f.planner.nativeIdleCycleNextRequest(f.actor);assert(view.finished);assert(next);assert.equal(next.version,2);assert.equal(next.approach,undefined);assert.deepEqual(copyNativeIdleCycleNextRequest(next),next);assert.deepEqual(f.worker.idleState,view.idleState);
   const held=structuredClone(f.worker.idleState),p=f.prepareCycle();assert.deepEqual(p.nativeIdleCycle.initialState,next.idleState);assert.deepEqual(f.worker.idleState,held);assert.equal(JSON.stringify(p.nativeIdleCycle.sourceBody.sourceRequest),original);f.commitCycle(p);assert.deepEqual(f.worker.idleState,next.idleState);if(next.idleState.mode==='watch')sawWatch=true;if(previous==='watch'&&next.idleState.mode==='rest')sawRestAgain=true;previous=next.idleState.mode;
   if(!sawRestAgain)f.advanceCycle();
  }
  assert(sawWatch&&sawRestAgain);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,worldRng);
  const saved=deserialize(serialize(f.state));assert.deepEqual(saved.workers[0].idleState,f.worker.idleState);for(const kind of ['native-idle-stroll-failed-source','native-idle-cycle-reference','native-idle-stroll-request-reference'])assert.equal(serialize(f.state).includes(kind),false);
 }finally{await f.dispose();}
});

test('a selected retry continuation is rejected if Game writes it before acquisition',async()=>{
 const f=await nativeIdleFailedCycleGame({retry:.25});try{
  f.commitCycle(f.prepareCycle());f.advanceCycle();const view=f.planner.nativeIdleCycleExecution(f.actor),next=f.planner.nativeIdleCycleNextRequest(f.actor),body=f.body(1);assert.equal(next.idleState.rng,view.idleState.rng);assert.equal(next.idleState.approachRetry,1);f.worker.idleState=structuredClone(next.idleState);assert.equal(f.planner.prepareNativeIdleCycleProposal(f.actor).status,'unsupported');f.planner.projectNativeIdleCycle(f.state,f.worker);assert.deepEqual(f.worker.idleState,view.idleState);const p=f.prepareCycle();f.commitCycle(p);assert.deepEqual(f.worker.idleState,next.idleState);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('the native binding retains the original request and rejects destination, kind, retry and RNG substitution before first Game projection',async()=>{
 const f=await nativeIdleFailedCycleGame();try{
  const original=structuredClone(f.worker),p=f.prepareCycle(),binding=f.commitCycle(p,{project:false}),source=binding.reference.sourceBody;assert.deepEqual(source.sourceRequest,f.sourceRequest);assert.equal(f.worker.idleState.mode,'walk');
  const mutations=[w=>w.idleState.destination.x+=.01,w=>w.idleState.destination.id=`idle-${w.id}`,w=>w.idleState.approachRetry+=.01,w=>w.idleState.rng=(w.idleState.rng^1)>>>0,w=>w.idleState={...p.nativeIdleCycle.initialState}];
  for(const mutate of mutations){Object.assign(f.worker,structuredClone(original));mutate(f.worker);const before=structuredClone(f.worker);assert.throws(()=>f.planner.projectNativeIdleCycle(f.state,f.worker),/pending WALK source/);assert.deepEqual(f.worker,before);assert.deepEqual(f.planner.nativeIdleCycleBinding(f.actor).reference.sourceBody.sourceRequest,f.sourceRequest);}
  Object.assign(f.worker,original);assert(f.planner.projectNativeIdleCycle(f.state,f.worker));assert.equal(f.worker.idleState.mode,'rest');
 }finally{await f.dispose();}
});

test('cancellation and delayed preparation keep WALK held, then retime the same strict failed source into REST',async()=>{
 const f=await nativeIdleFailedCycleGame({retry:.25});try{
  const body=f.body(1),worker=structuredClone(f.worker),first=f.prepareCycle();assert.equal(f.planner.cancelNativeIdleCycleProposal(first.ticket),true);assert.deepEqual(f.worker,worker);const p=f.prepareCycle();tick(f.state,.2,f.nav);assert.deepEqual(f.worker.idleState,worker.idleState);const next=f.planner.revalidateNativeIdleCycleProposal(p.ticket);assert.equal(next.status,'revalidated');assert.equal(next.timeTranslation.compatible,true);assert(next.proposal.worldBoundary.effectiveTime>p.worldBoundary.effectiveTime);assert.deepEqual(next.proposal.nativeIdleCycle.sourceBody,p.nativeIdleCycle.sourceBody);const binding=f.commitCycle(p);assert.deepEqual(binding.preparedReference,p.nativeIdleCycle);assert.deepEqual(binding.reference,next.proposal.nativeIdleCycle);assert.deepEqual(f.body(1),body);assert.equal(f.worker.idleState.approachRetry,.25);
 }finally{await f.dispose();}
});

test('a failed local WALK uses the same provenance with a full cycle and never widens its anchor',async()=>{
 const f=await nativeIdleFailedCycleGame({local:true});try{
  const p=f.prepareCycle(),r=p.nativeIdleCycle;assert.equal(r.sourceBody.sourceRequest.approach,undefined);assert(r.duration>r.watchStartOffset);assert.deepEqual(copyNativeIdleCycleReference(r),r);f.commitCycle(p);tick(f.state,.1,f.nav);assert.deepEqual(f.worker.idleState,f.planner.nativeIdleCycleExecution(f.actor).idleState);
 }finally{await f.dispose();}
});

for(const profile of PROFILES)test(`${profile.id} REST retry knot keeps the existing GPU decoder on Idle at a coincident phase boundary`,async()=>{
 const f=await nativeIdleFailedCycleGame({profile:profile.id,retry:'rest-end'});let motion;try{
  const p=f.prepareCycle(),r=p.nativeIdleCycle,q=r.sourceBody;assert.equal(r.duration,r.watchStartOffset);assert(nativeIdleCycleWatchKnot(r)>floorFloat32(r.duration));const support={kind:'native-idle-cycle-terrain-support',reference:r,point:{...q.pose,at:r.worldBoundary.effectiveTime,height:0},valid:()=>true};motion=createNativeIdleCycleGpuMotion({actorId:f.actor,support});assert.equal(motion.sampleClip(floorFloat32(r.duration)),'Idle');f.commitCycle(p);const next=f.advanceCycle();assert.equal(f.worker.idleState.mode,'rest');assert.equal(next.idleState.mode,'watch');assert.equal(f.worker.idleState.rng,r.initialState.rng);assert.notEqual(next.idleState.rng,r.initialState.rng);
 }finally{motion?.dispose();await f.dispose();}
});

test('typed failed source and finite program reject substituted origin, version, envelope, stream and full duration',async()=>{
 const f=await nativeIdleFailedCycleGame({retry:.25});try{
  const r=f.prepareCycle().nativeIdleCycle,q=r.sourceBody;
  for(const change of [{sourceRequest:undefined},{sourceRequest:{...q.sourceRequest,walkRng:(q.sourceRequest.walkRng^1)>>>0}},{sourceRequest:{...q.sourceRequest,pose:{...q.sourceRequest.pose,x:q.pose.x+.01}}},{sourceSequence:q.sourceSequence+1},{sourceAt:q.sourceAt+.1},{expectedRouteHandle:{}},{kind:'native-idle-stroll-arrival-source'}])assert.throws(()=>copyNativeIdleCycleBodySource({...q,...change}));
  for(const change of [{version:1},{duration:r.watchStartOffset+r.durations.watch*(1+Math.floor(r.watchRng/4294967296*2))},{anchor:{...r.anchor,x:r.anchor.x+.1}},{anchor:{...r.anchor,radius:r.anchor.radius+.1}},{initialState:{...r.initialState,rng:(r.initialState.rng^1)>>>0}},{watchRng:(r.watchRng^1)>>>0}])assert.throws(()=>copyNativeIdleCycleReference({...r,...change}));
 }finally{await f.dispose();}
});

test('typed retry state rejects a second cancelWalk, changed elapsed/remaining/stream, early deadline and disguised WALK',async()=>{
 const f=await nativeIdleFailedCycleGame({retry:.25});try{
  f.commitCycle(f.prepareCycle());f.advanceCycle();const n=f.planner.nativeIdleCycleNextRequest(f.actor),s=n.idleState;
  for(const change of [{version:1},{approach:false},{approach:true},{requestedAt:n.sourceCycle.reference.worldBoundary.effectiveTime+n.sourceCycle.reference.duration-5e-10},{idleState:{...s,elapsed:0}},{idleState:{...s,remaining:s.remaining+.1}},{idleState:{...s,rng:(s.rng^1)>>>0}},{idleState:{...s,approachRetry:.5}},{idleState:{...s,mode:'watch'}}])assert.throws(()=>copyNativeIdleCycleNextRequest({...n,...change}));
 }finally{await f.dispose();}
});

test('a repaired source produces an explicit typed approach with current remaining and no executable22 or early Game WALK',()=>{
 const f=nativeIdleFailedCycleBridge();try{
  const worker=structuredClone(f.worker),body=f.body(1),p=f.prepareCycle();f.commitCycle(p);assert.equal(f.session.core.removeWall(f.wall),1);const n=f.advanceBy(p.nativeIdleCycle.duration);assert.equal(n.approach,true);assert.equal(n.version,2);assert.equal(n.idleState.mode,'walk');assert.equal(n.idleState.destination.id,n.sourceCycle.reference.anchor.id);close(n.idleState.remaining,p.nativeIdleCycle.initialState.remaining-p.nativeIdleCycle.duration);assert.equal(n.idleState.rng,p.nativeIdleCycle.initialState.rng);assert.deepEqual(copyNativeIdleCycleNextRequest(n),n);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.bridge.nativeIdleStrollBinding(f.actor),null);
  for(const change of [{approach:undefined},{idleState:{...n.idleState,remaining:0}},{idleState:{...n.idleState,rng:(n.idleState.rng^1)>>>0}},{idleState:{...n.idleState,destination:{...n.idleState.destination,id:`idle-worker-${f.actor}`}}},{idleState:{...n.idleState,destination:{...n.idleState.destination,x:n.idleState.destination.x+.01}}}])assert.throws(()=>copyNativeIdleCycleNextRequest({...n,...change}));
 }finally{f.close();}
});

test('unknown retry connectivity exposes no typed successor or new private stream',()=>{
 const f=nativeIdleFailedCycleBridge({unknown:true});try{
  const p=f.prepareCycle();f.commitCycle(p);assert.equal(f.session.core.removeWall(f.wall),1);assert.equal(f.advanceBy(p.nativeIdleCycle.duration),null);const view=f.bridge.nativeIdleCycleExecution(f.actor);assert.equal(view.nextStatus,-6);const held=view.idleState;f.advanceBy(2);assert.deepEqual(f.bridge.nativeIdleCycleExecution(f.actor).idleState,held);assert.equal(f.bridge.nativeIdleCycleNextRequest(f.actor),null);assert.deepEqual(f.bridge.nativeIdleCycleBinding(f.actor).reference.sourceBody.sourceRequest,f.sourceRequest);
 }finally{f.close();}
});

test('legacy cycle data cannot borrow a failed-source version or an approach field',()=>{
 const f=nativeIdleCycleFixture({mode:'watch',remaining:0,rng:0x12345678});try{
  const p=f.propose();f.commit(p);const proof=f.planner.nativeIdleCycleBinding(f.actor),n=f.planner.nativeIdleCycleNextRequest(f.actor);assert.equal(proof.reference.version,1);assert.throws(()=>copyNativeIdleCycleReference({...proof.reference,version:2}));assert.throws(()=>copyNativeIdleCycleNextRequest({...n,version:2}));assert.throws(()=>copyNativeIdleCycleNextRequest({...n,approach:undefined}));
 }finally{f.close();}
});

for(const daily of [false,true])test(`Game preempts a failed-WALK REST with its genuine Home request (${daily?'day':'profile boundary'})`,async()=>{
 const f=await nativeIdleFailedCycleGame();try{
  const binding=f.commitCycle(f.prepareCycle()),body=f.body(1),rng=f.state.rng;if(daily)f.worker.contractDay=f.state.day-1;else f.state.time=PROFILES.find(p=>p.id===f.worker.profile).end-.05;
  tick(f.state,.15,f.nav);const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);assert(home.requestSequence>binding.cycleSequence);assert.equal(home.bodyId,binding.reference.bodyId);assert.equal(f.worker.status,'returning');assert.equal(f.worker.nativeRouteAdmission,'pending-home-resources');assert.equal(f.worker.idleState,null);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.planner.projectNativeIdleCycle(f.state,f.worker),null);assert(f.planner.projectNativeHomeExecution(f.state,f.worker));
 }finally{await f.dispose();}
});

test('ordinary harvest stays unassigned when the real failed-WALK body has no connector to its target',async()=>{
 const f=await nativeIdleFailedCycleGame();try{
  const binding=f.commitCycle(f.prepareCycle()),body=f.body(1),q=f.sourceRequest,anchor=f.state.plants.find(p=>p.id===`plant-${q.anchor.id}`);anchor.growth=cropSpec(anchor.species).growth_seconds;tick(f.state,.1,f.nav);const task=f.state.tasks.find(t=>t.kind==='harvest'&&t.targetId===anchor.id);assert(task);assert.equal(task.workerId,null);assert.equal(f.planner.pendingTaskRoute(f.actor),null);assert.equal(f.worker.status,'idle');assert.equal(f.worker.nativeRouteAdmission,'native-idle');assert.equal(f.worker.idleState.mode,'rest');assert.deepEqual(f.planner.nativeIdleCycleBinding(f.actor),binding);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});

test('ordinary harvest genuinely preempts a local failed-WALK REST and acquires TaskStart on the same body',async()=>{
 const f=await nativeIdleFailedCycleGame({local:true});try{
  const binding=f.commitCycle(f.prepareCycle()),body=f.body(1),q=f.sourceRequest,anchor=f.state.plants.find(p=>p.id===`plant-${q.anchor.id}`);anchor.growth=cropSpec(anchor.species).growth_seconds;tick(f.state,.1,f.nav);const task=f.state.tasks.find(t=>t.workerId===f.worker.id),request=f.planner.pendingTaskRoute(f.actor);assert(task);assert.equal(task.kind,'harvest');assert.equal(task.targetId,anchor.id);assert(request);assert(request.requestSequence>binding.cycleSequence);assert.equal(f.worker.status,'waiting-task');assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(f.worker.idleState,null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.body(1),body);
  const result=f.planner.prepareNativeTaskStartProposal(request,{bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase});assert.equal(result.status,'proposed');assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),result.proposal.ticket.ticket),1);assert.equal(f.planner.beginNativeRouteExecution().status,'started');assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.planner.reconcileWorkerRoutes(f.state,{navVersion:f.nav.version});tick(f.state,.01,f.nav);assert.equal(f.worker.nativeRouteAdmission,'native-task');assert(f.planner.nativeTaskStartBinding(f.actor));assert.notDeepEqual(f.body(1),body);assert.equal(f.w.nav_idle_cycle_failed_request_snapshot(q.actorId,0),0);
 }finally{await f.dispose();}
});

test('a typed failed-source proposal does not grant a lease through the still unsupported graphics control',async()=>{
 const f=await nativeIdleFailedCycleGame();let c,detach;try{
  detach=f.planner.observeNativeIntentControl({onBaseline(b){c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingIdleStrollRequests:b.pendingIdleStrollRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(changes){for(const e of changes)c.accept(e);},onClock(clock){const prior=c.status().clock;c.acceptClock({...clock,anchorAbsoluteMs:prior.anchorAbsoluteMs,anchorLogicalTime:prior.anchorLogicalTime});}});
  const p=f.prepareCycle();assert.throws(()=>c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),error=>error.code==='native-idle-cycle-admission-obsolete');assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.worker.idleState.mode,'walk');
 }finally{detach?.();c?.dispose();await f.dispose();}
});

test('native original-request snapshots are scoped to the retained proposal/binding and revoked on cancellation or body removal',async()=>{
 const f=await nativeIdleFailedCycleGame();try{
  const w=f.w,actor=f.sourceRequest.actorId,read=()=>Array.from(new Float64Array(w.memory.buffer,w.nav_idle_stroll_restore_request_ptr(),29));assert.equal(w.nav_idle_cycle_failed_request_version(),1);assert.equal(w.nav_idle_cycle_failed_request_snapshot(actor,0),0);assert(read().every(v=>v===0));let p=f.prepareCycle();assert.equal(w.nav_idle_cycle_failed_request_snapshot(actor,p.ticket.ticket),1);const original=read();assert.equal(original[3],f.sourceRequest.requestSequence);assert.equal(original[24],f.sourceRequest.walkRng);assert.equal(w.nav_idle_cycle_failed_request_snapshot(actor+1,p.ticket.ticket),0);assert(read().every(v=>v===0));assert.equal(f.planner.cancelNativeIdleCycleProposal(p.ticket),true);assert.equal(w.nav_idle_cycle_failed_request_snapshot(actor,p.ticket.ticket),0);p=f.prepareCycle();f.commitCycle(p);assert.equal(w.nav_idle_cycle_failed_request_snapshot(actor,0),1);assert.deepEqual(read(),original);assert.equal(w.spatial_body_remove(f.sourceRequest.bodyId),1);assert.equal(w.nav_idle_cycle_failed_request_snapshot(actor,0),0);assert(read().every(v=>v===0));assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);
 }finally{await f.dispose();}
});

test('large logical epochs preserve typed retry state and held Game phase beyond the future WATCH knot',async()=>{
 const f=await nativeIdleFailedCycleGame({epoch:2**20,retry:.25});try{
  const p=f.prepareCycle(),body=f.body(1);assert(p.nativeIdleCycle.worldBoundary.effectiveTime>2**20);f.commitCycle(p);const next=f.advanceCycle(),held=structuredClone(f.worker.idleState);assert(next);assert.equal(held.mode,'rest');assert.equal(held.rng,p.nativeIdleCycle.initialState.rng);tick(f.state,p.nativeIdleCycle.watchStartOffset+1,f.nav);assert.deepEqual(f.worker.idleState,held);assert.deepEqual(f.planner.nativeIdleCycleNextRequest(f.actor),next);assert.deepEqual(f.body(1),body);
 }finally{await f.dispose();}
});
