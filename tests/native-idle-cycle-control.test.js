import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleFixture} from './helpers/native-idle-cycle.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyNativeIdleCycleAttestation,copyNativeIdleCycleNextRequest} from '../src/world/native-idle-cycle.js';
import {emit} from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {enqueue} from '../src/simulation/tasks.js';
import {cancelIdle} from '../src/simulation/idle.js';
import {pair,fixture as gpuFixture,flush} from './helpers/remote-webgpu-fixture.js';

function controlBaseline(b){const c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingHomeRequests:b.pendingHomeRequests??[],pendingInitialIdleRequests:b.pendingInitialIdleRequests??[],nativeIdleCycles:b.nativeIdleCycles??[],pendingIdleCycleRequests:b.pendingIdleCycleRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});return c;}
function controlled({installBody=true,...options}={}){
 let c,detach,paused=false,clockPaused=false;const events=[],clocks=[];
 const clock=record=>{const previous=c.status().clock;c.acceptClock({...record,anchorAbsoluteMs:record.reanchor?1000:previous.anchorAbsoluteMs,anchorLogicalTime:record.reanchor?record.committedThrough:previous.anchorLogicalTime});};
 const f=nativeIdleCycleFixture({...options,peer:true,configureState(state,{point}){state.villages.find(v=>v.id===state.workers[0].villageId).entry=point(6,0);},beforeBodyCommit(native){
  detach=native.planner.observeNativeIntentControl({onBaseline(b){c=controlBaseline(b);},onChanges(changes){events.push(...changes);if(!paused)changes.forEach(e=>c.accept(e));},onClock(record){clocks.push(record);if(!clockPaused)clock(record);}});
 }});
 if(installBody)c.installInitialIdleBodies(f.bodyBinding.reference.worldBoundary,[f.bodyBinding]);
 const prepare=sequence=>{const raw=f.propose(sequence);assert.equal(raw.status,1);const proposal=f.planner.captureNativeIdleCycleProposal({kind:'native-idle-cycle-proposal-ticket',authorityEpoch:f.bodyBinding.reference.worldBoundary.authorityEpoch,session:f.w.nav_intent_session(),ticket:raw.ticket});assert(proposal);return {...raw,proposal};};
 return {...f,c,events,clocks,prepare,pauseControl:value=>paused=value,pauseClock:value=>clockPaused=value,acceptLastClock:()=>clock(clocks.at(-1)),install(binding=f.planner.nativeIdleCycleBinding(f.actor)){return c.installIdleCycles(binding.reference.worldBoundary,[binding]);},commitCycle(p,{install=false}={}){f.commit(p);const binding=f.planner.nativeIdleCycleBinding(f.actor);if(install)c.installIdleCycles(binding.reference.worldBoundary,[binding]);return binding;},close(){detach?.();c.dispose();f.close();}};
}
function task(f){const point=f.point(6,0),plant=createPlant(`plant-${f.state.nextId++}`,'mijo',point.x,point.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;f.state.plants.push(plant);emit(f.state,'CropPlaced',{targetId:plant.id});enqueue(f.state,f.worker.centerId,'harvest',plant.id);f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,plan,{navVersion:1,pendingResources:true}),1);f.planner.commitNativeCausalClock();}
// Game deliberately has no ordinary21 projection yet. Exercise its genuine
// native Home request ABI, then mirror only that accepted semantic state.
function homeRequest(f){const village=f.state.villages.find(v=>v.id===f.worker.villageId),goal=village.entry??village;f.worker.contractDay=f.state.day-1;assert.equal(f.w.nav_intent_initial_idle_home_request(f.actor,f.w.nav_intent_session(),f.bodyBinding.bodySequence,Number(village.id.split('-').at(-1)),goal.x,goal.z),1);cancelIdle(f.worker);Object.assign(f.worker,{status:'returning',path:null,nativeRouteAdmission:'pending-home-resources',running:false,gateWaiting:false});f.planner.commitNativeCausalClock();}

for(const mode of ['rest','watch'])test(`direct ${mode} cycle requires its actual acquisition and graphical installation`,()=>{
 const f=controlled({mode});try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.idleCycleRecord,null);
  const proof=f.commitCycle(p);assert.equal(f.events.at(-1).idleCycle.cycleSequence,proof.cycleSequence);assert.equal(lease.isCurrent(),false);assert(lease.isPrepared());assert.equal(f.install(proof),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,proof.reference.worldBoundary.effectiveTime);assert.equal(lease.executionEnd,lease.executionEpoch+proof.reference.duration);const record=lease.idleCycleRecord;f.advance(.2);assert.equal(lease.idleCycleRecord,record);assert(lease.isCurrent());
 }finally{f.close();}
});

test('native body metadata alone cannot prepare a cycle without the admitted parent association',()=>{
 const f=controlled({installBody:false});try{const p=f.prepare();assert.throws(()=>f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary}),/obsolete/);assert.equal(f.planner.cancelNativeIdleCycleProposal(p.proposal.ticket),true);}finally{f.close();}
});

test('a cycle acquisition stays non-drawable until its exact native causal watermark arrives',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary});f.pauseClock(true);const proof=f.commitCycle(p);assert(f.c.status().clock.intentSequence<proof.cycleSequence);assert.equal(lease.isCurrent(),false);assert(lease.isPrepared());assert.throws(()=>f.install(proof),/cycle/);assert.equal(lease.idleCycleRecord,null);f.acceptLastClock();f.pauseClock(false);assert.equal(f.install(proof),1);assert(lease.isCurrent());
 }finally{f.close();}
});

test('native cycle batches install atomically and reject duplicates, altered provenance and historical bootstrap',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary}),proof=f.commitCycle(p),world=proof.reference.worldBoundary;
  for(const mutate of [b=>b.cycleSequence++,b=>b.reference.worldBoundary.ticket++,b=>b.preparedReference.worldBoundary.ticket--]){const bad=structuredClone(proof);mutate(bad);assert.throws(()=>f.c.installIdleCycles(world,[proof,bad]));assert.equal(lease.isCurrent(),false);assert.equal(lease.idleCycleRecord,null);}
  assert.throws(()=>f.c.installIdleCycles(world,[proof,proof]));assert.throws(()=>f.c.installIdleCycles(world,[proof],{bootstrap:true}),/prepared/);assert.throws(()=>f.c.installIdleCycles({...world,nativeSession:world.nativeSession+1},[proof]),/prepared/);assert.equal(f.install(proof),1);const record=lease.idleCycleRecord;assert.throws(()=>f.install(proof));assert.equal(lease.idleCycleRecord,record);
 }finally{f.close();}
});

test('cycle event identity and mixed family failures do not advance the existing actor cursor',()=>{
 const f=controlled();try{
  const p=f.prepare();f.pauseControl(true);f.pauseClock(true);const proof=f.commitCycle(p),event=f.events.at(-1),before=f.c.status().sequence;
  for(const mutate of [e=>e.idleCycle.cycleSequence++,e=>e.idleCycle.reference.worldBoundary.effectiveTime+=1,e=>e.taskRequest={},e=>e.idleCycleNext={},e=>e.state=6]){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before);}
  assert(f.c.accept(event));f.acceptLastClock();f.pauseControl(false);f.pauseClock(false);assert.equal(f.install(proof),1);
 }finally{f.close();}
});

test('a completed rest request retains the record until its actual next cycle replaces it',()=>{
 const f=controlled({mode:'watch',rng:0x12345678});try{
  const first=f.prepare(),lease=f.c.admitIdleCycle(first.proposal.nativeIdleCycle,{preparingWorldBoundary:first.proposal.worldBoundary}),proof=f.commitCycle(first,{install:true}),record=lease.idleCycleRecord;f.advance(proof.reference.duration);const next=f.c.pendingIdleCycleRequest(f.actor);assert(next);assert.equal(next.idleState.mode,'rest');assert.deepEqual(copyNativeIdleCycleNextRequest(next),f.planner.nativeIdleCycleNextRequest(f.actor));assert(lease.isCurrent());assert.equal(lease.idleCycleRecord,record);
  const second=f.prepare(next.requestSequence),secondLease=f.c.admitIdleCycle(second.proposal.nativeIdleCycle,{preparingWorldBoundary:second.proposal.worldBoundary});assert(secondLease.isPrepared());const fresh=f.commitCycle(second);assert.equal(lease.isCurrent(),false);assert.equal(record.safeUntil,f.state.elapsed);assert.equal(secondLease.isCurrent(),false);f.install(fresh);assert(secondLease.isCurrent());assert.equal(f.c.pendingIdleCycleRequest(f.actor),null);assert.notEqual(secondLease.idleCycleRecord,record);
 }finally{f.close();}
});

test('retiming during preparation preserves the native program and installs the actual epoch once',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary});f.advance(.3);const next=f.planner.revalidateNativeIdleCycleProposal(p.proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.compatible);assert(lease.isPrepared());const proof=f.commitCycle(p);assert.deepEqual(proof.preparedReference,p.proposal.nativeIdleCycle);assert.deepEqual(proof.reference,next.proposal.nativeIdleCycle);f.install(proof);assert.equal(lease.executionEpoch,next.proposal.worldBoundary.effectiveTime);assert.equal(lease.executionEnd,lease.executionEpoch+next.proposal.nativeIdleCycle.duration);assert(lease.isCurrent());
 }finally{f.close();}
});

test('a successor with another cycle identity cannot advance the direct cursor or replace the held record',()=>{
 const f=controlled({mode:'watch',rng:0x12345678});try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary}),proof=f.commitCycle(p,{install:true}),record=lease.idleCycleRecord;f.pauseControl(true);f.pauseClock(true);f.advance(proof.reference.duration);const event=f.events.at(-1),before=f.c.status().sequence;assert(event.idleCycleNext);
  for(const mutate of [e=>e.idleCycleNext.sourceCycle.cycleSequence++,e=>e.idleCycleNext.requestedAt+=1,e=>e.idleCycleNext.requestSequence++,e=>e.idleCycle=proof]){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before);assert.equal(lease.idleCycleRecord,record);}
  assert(f.c.accept(event));f.acceptLastClock();f.pauseControl(false);f.pauseClock(false);assert.equal(lease.idleCycleRecord,record);assert(f.c.pendingIdleCycleRequest(f.actor));
 }finally{f.close();}
});

test('a pending stroll is metadata on the held cycle and cannot prepare an invented rest cycle',()=>{
 const f=controlled({mode:'watch',rng:0});try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary}),proof=f.commitCycle(p,{install:true});f.advance(proof.reference.duration);const next=f.c.pendingIdleCycleRequest(f.actor);assert(next);assert.equal(next.idleState.mode,'walk');assert(lease.isCurrent());assert.equal(lease.executionEnd,proof.reference.worldBoundary.effectiveTime+proof.reference.duration);assert.equal(f.propose(next.requestSequence).status,-2);assert.deepEqual(copyNativeIdleCycleNextRequest(next),next);
 }finally{f.close();}
});

for(const home of [false,true])test(`a genuine pending ${home?'Home':'TaskStart'} freezes the same cycle record until movement is acquired`,()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary}),proof=f.commitCycle(p,{install:true}),record=lease.idleCycleRecord;f.advance(.2);
  if(home)homeRequest(f);else task(f);
  assert(lease.isCurrent());assert.equal(lease.idleCycleRecord,record);assert.equal(lease.executionEnd,f.state.elapsed);const stopped=f.state.elapsed;f.advance(.2);assert(lease.isCurrent());assert.equal(lease.executionEnd,stopped);
  if(home){const next=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(next.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),next.proposal.ticket.ticket),1);}
  else{const next=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.actor),{bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase});assert.equal(next.status,'proposed');const reference={...next.proposal,kind:'native-task-start-reference'};assert.throws(()=>f.c.admitStart({...reference,bodyId:99},{preparingWorldBoundary:next.proposal.worldBoundary}),/obsolete/);assert(f.c.admitStart(reference,{preparingWorldBoundary:next.proposal.worldBoundary}).isPrepared());assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),next.proposal.ticket.ticket),1);}
  f.planner.commitNativeCausalClock();assert.equal(lease.isCurrent(),false);assert.equal(record.safeUntil,f.state.elapsed);
  if(!home){const next=f.planner.nativeTaskStartBinding(f.actor),bad=structuredClone(next);bad.reference.bodyId=99;bad.preparedReference.bodyId=99;assert.throws(()=>f.c.installStartedRoutes(next.reference.worldBoundary,[bad]),/Idle cycle body/);assert.equal(f.c.installStartedRoutes(next.reference.worldBoundary,[next]),1);}
 }finally{f.close();}
});

for(const operation of ['dispose','remove','reset'])test(`${operation} revokes the captured cycle association`,()=>{
 const f=controlled();try{const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary});f.commitCycle(p,{install:true});const record=lease.idleCycleRecord;
  if(operation==='dispose')f.c.dispose();else{if(operation==='remove')assert.equal(f.w.spatial_body_remove(1),1);else f.w.spatial_bodies_reset();f.planner.commitNativeCausalClock();}
  assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);assert.equal(lease.idleCycleRecord,null);assert.equal(record.safeUntil,f.state.elapsed);
 }finally{f.close();}
});

test('Home cannot borrow a different cycle body, heading or budget before its pending event is accepted',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary});f.commitCycle(p,{install:true});const record=lease.idleCycleRecord,end=lease.executionEnd;f.pauseControl(true);f.pauseClock(true);homeRequest(f);const event=f.events.at(-1),sequence=f.c.status().sequence;assert(event.homeRequest);
  for(const mutate of [h=>h.bodyId++,h=>h.pose.yaw+=1,h=>h.pose.runRemaining--]){const bad=structuredClone(event);mutate(bad.homeRequest);assert.throws(()=>f.c.accept(bad),/Idle cycle body/);assert.equal(f.c.status().sequence,sequence);assert.equal(lease.idleCycleRecord,record);assert.equal(lease.executionEnd,end);}
  assert(f.c.accept(event));f.acceptLastClock();f.pauseControl(false);f.pauseClock(false);assert.equal(lease.idleCycleRecord,record);assert.equal(lease.executionEnd,f.state.elapsed);
 }finally{f.close();}
});

for(const home of [false,true])test(`an immediate pending ${home?'source Home':'TaskStart'} preserves the acquired cycle before graphical installation`,()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary}),proof=f.commitCycle(p);if(home)homeRequest(f);else task(f);assert.equal(lease.isCurrent(),false);assert(lease.isPrepared());assert.equal(f.install(proof),1);assert(lease.isCurrent());assert.equal(lease.executionEnd,f.state.elapsed);const record=lease.idleCycleRecord;f.advance(.2);assert.equal(lease.idleCycleRecord,record);assert(lease.isCurrent());
 }finally{f.close();}
});

test('an immediate zero-residual successor has a separate event and preserves its not-yet-installed cycle',()=>{
 const f=controlled({mode:'watch',remaining:0,rng:0x12345678});try{const p=f.prepare(),lease=f.c.admitIdleCycle(p.proposal.nativeIdleCycle,{preparingWorldBoundary:p.proposal.worldBoundary}),proof=f.commitCycle(p),last=f.events.slice(-2);assert(last[0].idleCycle);assert(last[1].idleCycleNext);assert.equal(last[0].sequence,proof.cycleSequence);assert.equal(last[1].sequence,proof.cycleSequence+1);assert.equal(lease.isCurrent(),false);assert(lease.isPrepared());f.install(proof);assert(lease.isCurrent());assert(f.c.pendingIdleCycleRequest(f.actor));assert.equal(lease.executionEnd,f.state.elapsed);}finally{f.close();}
});

test('baseline cycle metadata and native successor data grant no graphical association',()=>{
 const f=controlled({mode:'watch',rng:0x12345678});let other;try{const p=f.prepare(),proof=f.commitCycle(p,{install:true}),b=f.planner.nativeIntentControlBaseline();assert.equal(b.nativeInitialIdleBodies,undefined);assert.equal(b.nativeIdleCycles.length,1);other=controlBaseline(b);assert.throws(()=>other.admitIdleCycle(proof.reference),/obsolete/);assert.throws(()=>other.installIdleCycles(proof.reference.worldBoundary,[proof]),/cycle/);other.dispose();f.advance(proof.reference.duration);const next=f.planner.nativeIntentControlBaseline();other=controlBaseline(next);assert.deepEqual(other.pendingIdleCycleRequest(f.actor),next.pendingIdleCycleRequests[0]);assert.throws(()=>other.admitIdleCycle(proof.reference),/obsolete/);}finally{other?.dispose();f.close();}
});

test('the real Host rejects an active cycle bootstrap with no GPU submissions',async()=>{
 const f=controlled();let gpu;try{f.commitCycle(f.prepare(),{install:true});const baseline=f.planner.nativeIntentControlBaseline(),[source,draw]=pair();assert.equal(baseline.nativeInitialIdleBodies,undefined);gpu=await gpuFixture({}, {intentControl:{port:draw,session:'idle-cycle-baseline'}});source.postMessage({...baseline,session:'idle-cycle-baseline'});await flush();await gpu.host.idle();assert.equal(gpu.host.inspect().failed,true);assert.match(gpu.errors[0].message,/Idle cycles require prepared graphical admission/);assert.equal(gpu.gpu.submitted.length,0);}finally{gpu?.client.dispose();await gpu?.host.dispose();f.close();}
});
