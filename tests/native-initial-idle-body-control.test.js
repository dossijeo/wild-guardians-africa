import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleGameFixture} from './helpers/native-initial-idle-game.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyNativeInitialIdleBodyAttestation} from '../src/world/native-initial-idle-body.js';
import {tick,emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';
import {pair,fixture as gpuFixture,flush} from './helpers/remote-webgpu-fixture.js';

function controlled(options={}){
 const f=nativeInitialIdleGameFixture({peer:true,...options});let c,detach,paused=false,clockPaused=false;const events=[],clocks=[];
 const acceptClock=clock=>{const previous=c.status().clock;c.acceptClock({...clock,anchorAbsoluteMs:clock.reanchor?1000:previous.anchorAbsoluteMs,anchorLogicalTime:clock.reanchor?clock.committedThrough:previous.anchorLogicalTime});};
 try{
  f.planner.intentChanges();
  detach=f.planner.observeNativeIntentControl({
   onBaseline(b){c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingInitialIdleRequests:b.pendingInitialIdleRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},
   onChanges(changes){events.push(...changes);if(!paused)changes.forEach(e=>c.accept(e));},
   onClock(clock){clocks.push(clock);if(!clockPaused)acceptClock(clock);}
  });
  const tuple=()=>{assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));};
  const prepare=()=>{const p=f.planner.prepareNativeInitialIdleBodyProposal(f.planner.nativeInitialIdleRequestReference(f.actor));assert.equal(p.status,'proposed');return p.proposal;};
  return {...f,c,tuple,prepare,events,pauseControl:value=>paused=value,pauseClock:value=>clockPaused=value,acceptLastClock:()=>acceptClock(clocks.at(-1)),commit(proposal,prepared=proposal){assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...tuple().slice(0,5),prepared.ticket.ticket),1);f.planner.projectNativeInitialIdleBody(f.state,f.worker);f.planner.commitNativeCausalClock();return f.planner.nativeInitialIdleBodyBinding(f.actor);},close(){detach?.();c?.dispose();f.close();}};
 }catch(error){detach?.();c?.dispose();f.close();throw error;}
}
function task(f){
 const p=f.point(6,0),plant=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);plant.growth=999999;plant.harvestRequested=true;plant.water=[];f.state.plants.push(plant);emit(f.state,'CropPlaced',{targetId:plant.id});enqueue(f.state,f.worker.centerId,'harvest',plant.id);
}

for(const mode of ['rest','watch'])test(`prepared initial ${mode} needs its actual direct body acquisition before replay`,()=>{
 const f=controlled({mode});try{
  const p=f.prepare(),lease=f.c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1),before=structuredClone(f.worker);
  assert.equal(lease.isPrepared(),true);assert.equal(lease.isCurrent(),false);assert.equal(lease.initialIdleBodyRecord,null);assert.equal(lease.executionEpoch,null);
  assert.throws(()=>f.c.installInitialIdleBodies(p.worldBoundary,[{...p,kind:'native-initial-idle-body-attestation'}]));assert.equal(lease.isCurrent(),false);
  const proof=f.commit(p);assert.equal(f.c.pendingInitialIdleRequest(f.actor),null);assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);
  assert.equal(f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]),1);assert.equal(lease.isCurrent(),true);assert.equal(lease.isPrepared(),true);assert.equal(lease.initialIdleBodyRecord.bodyId,1);assert.equal(lease.initialIdleBodyRecord.bodySequence,proof.bodySequence);assert.equal(lease.executionEpoch,proof.reference.worldBoundary.effectiveTime);
  const record=lease.initialIdleBodyRecord;tick(f.state,.2,f.nav);assert.equal(lease.initialIdleBodyRecord,record);assert.equal(lease.isCurrent(),true);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,{...before,nativeRouteAdmission:'native-idle'});
 }finally{f.close();}
});

test('a revalidated initial body keeps the prepared reference and reads the actual acquisition epoch',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary});tick(f.state,.2,f.nav);const next=f.planner.revalidateNativeInitialIdleBodyProposal(p.ticket);assert.equal(next.status,'revalidated');const proof=f.commit(next.proposal,p);assert.equal(f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]),1);
  assert.equal(lease.isCurrent(),true);assert.equal(lease.executionEpoch,next.proposal.worldBoundary.effectiveTime);assert(lease.executionEpoch>p.worldBoundary.effectiveTime);assert.equal(f.c.admitInitialIdleBody(proof.reference).initialIdleBodyRecord,lease.initialIdleBodyRecord);
 }finally{f.close();}
});

test('direct initial body installation rejects foreign poses, identities, duplicates and replay atomically',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary}),proof=f.commit(p),w=proof.reference.worldBoundary;
  const corrupt=[
   b=>{for(const r of [b.reference,b.preparedReference]){r.bodyId++;r.sourceRequest.bodyId++;}},
   b=>{for(const r of [b.reference,b.preparedReference])r.sourceRequest.pose.yaw+=1;},
   b=>{for(const r of [b.reference,b.preparedReference])r.sourceRequest.idleState.rng=(r.sourceRequest.idleState.rng^1)>>>0;},
   b=>b.bodySequence++
  ];
  for(const mutate of corrupt){const bad=structuredClone(proof);mutate(bad);assert(copyNativeInitialIdleBodyAttestation(bad));assert.throws(()=>f.c.installInitialIdleBodies(w,[bad]),/initial Idle body/);assert.equal(lease.isCurrent(),false);}
  assert.throws(()=>f.c.installInitialIdleBodies(w,[proof,proof]),/initial Idle body/);assert.equal(lease.isCurrent(),false);
  assert.throws(()=>f.c.installInitialIdleBodies(w,[proof],{bootstrap:true}),/prepared admission/);assert.throws(()=>f.c.installInitialIdleBodies({...w,nativeSession:w.nativeSession+1},[proof]),/prepared admission/);
  assert.equal(f.c.installInitialIdleBodies(w,[proof]),1);const record=lease.initialIdleBodyRecord;assert.throws(()=>f.c.installInitialIdleBodies(w,[proof]),/initial Idle body/);assert.equal(lease.initialIdleBodyRecord,record);
 }finally{f.close();}
});

test('a body proof cannot replace its missing direct acquisition or be borrowed by another control session',()=>{
 const f=controlled();let other;try{
  const p=f.prepare(),b=f.planner.nativeIntentControlBaseline();other=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingInitialIdleRequests:b.pendingInitialIdleRequests});other.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});
  const proof=f.commit(p);assert.throws(()=>other.installInitialIdleBodies(proof.reference.worldBoundary,[proof]),/initial Idle body/);
  assert.throws(()=>f.c.admitInitialIdleBody({...p.nativeInitialIdleBody,sourceRequest:{...p.nativeInitialIdleBody.sourceRequest,idleState:{...p.nativeInitialIdleBody.sourceRequest.idleState,elapsed:99}}},{preparingWorldBoundary:p.worldBoundary}),/obsolete/);
 }finally{other?.dispose();f.close();}
});

test('Home retains the installed initial record and rejects a different held body before advancing its cursor',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary}),proof=f.commit(p);f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]);const record=lease.initialIdleBodyRecord;
  f.pauseControl(true);f.worker.contractDay=f.state.day-1;f.planner.requestNativeIdleHome(f.state,f.worker);f.planner.flushNativeIntentControl();const event=f.events.at(-1),sequence=f.c.status().sequence;assert(event.homeRequest);
  for(const mutate of [h=>h.bodyId++,h=>h.pose.yaw+=1,h=>h.pose.runRemaining--,h=>h.pose.radius+=.01]){const bad=structuredClone(event);mutate(bad.homeRequest);assert.throws(()=>f.c.accept(bad),/held initial Idle body/);assert.equal(f.c.status().sequence,sequence);assert.equal(lease.initialIdleBodyRecord,record);}
  assert.equal(f.c.accept(event),true);f.pauseControl(false);f.planner.commitNativeCausalClock();assert.equal(lease.isCurrent(),true);assert.equal(lease.initialIdleBodyRecord,record);
  const home=f.planner.prepareNativeHomeRouteProposal(f.planner.nativeHomeRequestReference(f.actor));assert.equal(home.status,'proposed');assert.equal(f.w.nav_home_route_proposal_commit_bound(...f.tuple().slice(0,5),home.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();assert.equal(lease.isCurrent(),false);assert.equal(record.safeUntil,f.state.elapsed);assert.equal(f.c.pendingInitialIdleRequest(f.actor),null);
 }finally{f.close();}
});

test('TaskStart retains and then revokes the initial record, checking the same body on both admission paths',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary}),proof=f.commit(p);f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]);const record=lease.initialIdleBodyRecord;task(f);tick(f.state,.1,f.nav);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.equal(lease.isCurrent(),true);assert.equal(lease.initialIdleBodyRecord,record);
  const start=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.actor),{bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase});assert.equal(start.status,'proposed');const ref={...start.proposal,kind:'native-task-start-reference'};assert.throws(()=>f.c.admitStart({...ref,bodyId:99},{preparingWorldBoundary:start.proposal.worldBoundary}),/obsolete/);assert(f.c.admitStart(ref,{preparingWorldBoundary:start.proposal.worldBoundary}).isPrepared());
  assert.equal(f.w.nav_task_start_proposal_commit_bound(...f.tuple().slice(0,5),start.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();const next=f.planner.nativeTaskStartBinding(f.actor);assert.equal(lease.isCurrent(),false);assert.equal(record.safeUntil,f.state.elapsed);
  const bad=structuredClone(next);bad.reference.bodyId=99;bad.preparedReference.bodyId=99;assert.throws(()=>f.c.installStartedRoutes(next.reference.worldBoundary,[bad]),/held initial Idle body/);assert.equal(f.c.installStartedRoutes(next.reference.worldBoundary,[next]),1);
 }finally{f.close();}
});

test('physical removal, physical reset and control disposal revoke a captured initial record',()=>{
 for(const operation of ['dispose','remove','reset']){const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary}),proof=f.commit(p);f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]);const record=lease.initialIdleBodyRecord;
  if(operation==='dispose')f.c.dispose();else{if(operation==='remove')assert.equal(f.w.spatial_body_remove(1),1);else f.w.spatial_bodies_reset();f.planner.commitNativeCausalClock();}
  assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);assert.equal(lease.initialIdleBodyRecord,null);assert.equal(record.safeUntil,f.state.elapsed);assert.equal(f.c.pendingInitialIdleRequest(f.actor),null);
 }finally{f.close();}}
});

test('the body acquisition event cannot outrun its actual causal watermark',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary});f.pauseClock(true);const proof=f.commit(p);
  assert.equal(f.c.status().sequence,proof.bodySequence);assert(f.c.status().clock.intentSequence<proof.bodySequence);assert.throws(()=>f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]),/initial Idle body/);assert.equal(lease.isCurrent(),false);
  f.acceptLastClock();f.pauseClock(false);assert.equal(f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]),1);assert.equal(lease.isCurrent(),true);
 }finally{f.close();}
});

test('a direct body acquisition rejects competing task and route claims before changing the pending cursor',()=>{
 const f=controlled();try{
  const p=f.prepare();f.pauseControl(true);f.pauseClock(true);const proof=f.commit(p),event=f.events.find(e=>e.actorId===f.actor&&e.state===7),sequence=f.c.status().sequence;assert(event);
  for(const mutate of [e=>e.taskId=999999,e=>e.targetId=999999,e=>e.taskRequest={},e=>e.type='RouteCompleted']){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,sequence);assert(f.c.pendingInitialIdleRequest(f.actor));}
  assert.equal(f.c.accept(event),true);f.acceptLastClock();f.pauseControl(false);f.pauseClock(false);assert.equal(f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]),1);
 }finally{f.close();}
});

for(const home of [false,true])test(`an immediate ${home?'Home':'TaskStart'} request preserves the acquired source before graphical association`,()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitInitialIdleBody(p.nativeInitialIdleBody,{preparingWorldBoundary:p.worldBoundary}),proof=f.commit(p);
  if(home){f.worker.contractDay=f.state.day-1;f.planner.requestNativeIdleHome(f.state,f.worker);}else{task(f);const plans=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,plans,{navVersion:1,pendingResources:true}),1);}
  f.planner.commitNativeCausalClock();assert.equal(f.worker.nativeRouteAdmission,home?'pending-home-resources':'pending-resources');assert.equal(lease.isCurrent(),false);assert.equal(f.c.installInitialIdleBodies(proof.reference.worldBoundary,[proof]),1);assert.equal(lease.isCurrent(),true);const record=lease.initialIdleBodyRecord;tick(f.state,.1,f.nav);assert.equal(lease.initialIdleBodyRecord,record);assert.equal(lease.isCurrent(),true);
 }finally{f.close();}
});

test('the real host rejects active initial body baselines until prepared consumer bootstrap exists',async()=>{
 const f=controlled();let gpu;try{
  f.commit(f.prepare());const baseline=f.planner.nativeIntentControlBaseline();assert.equal(baseline.nativeInitialIdleBodies.length,1);const [source,draw]=pair();gpu=await gpuFixture({}, {intentControl:{port:draw,session:'initial-body-baseline'}});source.postMessage({...baseline,session:'initial-body-baseline'});await flush();await gpu.host.idle();assert.equal(gpu.host.inspect().failed,true);assert.match(gpu.errors[0].message,/initial Idle bodies require prepared graphical admission/);assert.equal(gpu.gpu.submitted.length,0);
 }finally{gpu?.client.dispose();await gpu?.host.dispose();f.close();}
});
