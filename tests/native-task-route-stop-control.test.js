import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyNativeStoppedClock} from '../src/rendering/native-stopped-clock.js';
import {nativeResumeReferenceFromProposal} from '../src/world/native-resume-reference.js';
import {tick} from '../src/simulation/game.js';

function withTaskControl(run,{installStarted=true,resume=false}={}){
 const f=createNativeTaskGameFixture();
 let control,detach,queuedClock,holdClock=false;
 const acceptClock=clock=>{
  const prior=control.status().clock;
  control.acceptClock({...clock,anchorAbsoluteMs:1000,anchorLogicalTime:clock.reanchor?clock.committedThrough:prior.anchorLogicalTime});
 };
 try{
  detach=f.planner.observeNativeIntentControl({
   onBaseline(b){
    control=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes});
    control.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});
    if(installStarted)assert.equal(control.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes,{bootstrap:true}),2);
   },
   onChanges(changes){for(const e of changes)control.accept(e);},
   onClock(clock){if(holdClock)queuedClock=clock;else acceptClock(clock);},
  });
  tick(f.state,.1,f.nav);
  const actor=f.state.workers[0].id;
  if(resume){
   const task=f.planner.nativeTaskExecution(actor);
   const savedBody=f.body(1);
   const stopped=f.planner.prepareNativeTaskRouteStopProposal(actor);
   assert.equal(stopped.status,'proposed');
   const stopInputs=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),5));
   assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...stopInputs,stopped.ticket.ticket),1);
   assert.equal(f.planner.commitNativeCausalClock().status,'committed');
   f.planner.flushNativeIntentControl();
   const {worldBoundary,nativeStop,routeEffects,gateEffects}=stopped.proposal;
   const stopProof=f.planner.nativeTaskRouteStopBinding(nativeStop,nativeStop,{projection:{version:1,routeEffects,gateEffects}});
   assert.equal(control.installTaskRouteStops(worldBoundary,[stopProof]),1);
   const held=f.planner.nativeSuspendedGateRoute(task.nativeRoute.actorId);
   const candidate=f.planner.prepareNativeGateResumeProposal(held.resumeHandle);
   assert.equal(candidate.status,'proposed');
   const inputs=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),5));
   assert.equal(f.w.nav_gate_resume_proposal_commit(...inputs),1);
   assert.equal(f.planner.beginNativeRouteExecution().status,'started');
   assert.equal(f.planner.commitNativeCausalClock().status,'committed');
   f.planner.flushNativeIntentControl();
   const reference=nativeResumeReferenceFromProposal(candidate.proposal);
   const {nativeRoute,bodyId}=f.planner.nativeTaskExecution(actor);
   assert.equal(bodyId,task.bodyId);
   assert.deepEqual(f.body(1),savedBody);
   assert.equal(control.installResumedRoutes(reference.worldBoundary,[{reference,assignmentSequence:nativeRoute.assignmentSequence}]),1);
  }
  const staged=f.planner.prepareNativeTaskRouteStopProposal(actor);
  assert.equal(staged.status,'proposed');
  const original=staged.proposal.nativeStop;
  const selector={kind:'native-task-route-stopped-body',version:1,stop:original,actorId:original.sourceRoute.actorId};
  function commit(){
   tick(f.state,.1,f.nav);
   const fresh=f.planner.revalidateNativeTaskRouteStopProposal(staged.ticket);
   assert.equal(fresh.status,'revalidated');
   const inputs=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),5));
   holdClock=true;
   assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...inputs,staged.ticket.ticket),1);
   assert.equal(f.planner.commitNativeCausalClock().status,'committed');
   f.planner.flushNativeIntentControl();
   const {nativeStop,routeEffects,gateEffects}=fresh.proposal;
   const proof=f.planner.nativeTaskRouteStopBinding(nativeStop,original,{projection:{version:1,routeEffects,gateEffects}});
   assert(proof);
   return proof;
  }
  run({control,original,selector,commit,releaseClock(){acceptClock(queuedClock);holdClock=false;}});
 }finally{detach?.();control?.dispose();f.close();}
}

test('Task25 drawing requires the admitted predecessor, exact revocation and committed control watermark',()=>withTaskControl(f=>{
 const boundary=f.original.worldBoundary,options={preparingWorldBoundary:boundary};
 const lease=f.control.admitTaskRouteStop(f.original,options);
 const body=f.control.admitTaskRouteStoppedBody(f.selector,options);
 const clock=copyNativeStoppedClock({nativeStopped:f.selector,semantic:'stop-value',epoch:boundary.effectiveTime,stopField:'runPhase'});
 assert.deepEqual(clock.nativeStopped,f.selector);
 assert(lease.isPrepared()&&body.isPrepared());
 assert(!lease.isCurrent()&&!body.isCurrent());
 assert.throws(()=>body.value('runPhase'),/obsolete/);
 const proof=f.commit(),finalBoundary=proof.reference.worldBoundary;
 assert.throws(()=>f.control.installTaskRouteStops(finalBoundary,[proof]),/boundary|revocation/);
 assert(!lease.isCurrent()&&!body.isCurrent());
 f.releaseClock();
 const {projection,...unprojected}=proof;
 assert.throws(()=>f.control.installTaskRouteStops(finalBoundary,[unprojected]),/final projection/);
 const substitute=structuredClone(proof);
 substitute.preparedReference.routes[0].bodyId++;
 substitute.reference.routes[0].bodyId++;
 delete substitute.projection;
 assert.throws(()=>f.control.installTaskRouteStops(finalBoundary,[substitute]),/admitted task/);
 assert(!lease.isCurrent()&&!body.isCurrent());
 assert.equal(f.control.installTaskRouteStops(finalBoundary,[proof]),1);
 assert(lease.isCurrent()&&body.isCurrent());
 assert.deepEqual(lease.binding.reference,proof.reference);
 assert.equal(body.value('runPhase'),projection.routeEffects.rows[17]);
 assert.throws(()=>f.control.installTaskRouteStops(finalBoundary,[proof]),/revocation/);
}));

test('Task25 cannot acquire a stop over an unadmitted Task assignment',()=>withTaskControl(f=>{
 const boundary=f.original.worldBoundary;
 assert.throws(()=>f.control.admitTaskRouteStop(f.original,{preparingWorldBoundary:boundary}),/admitted task/);
 const proof=f.commit();
 f.releaseClock();
 assert.throws(()=>f.control.installTaskRouteStops(proof.reference.worldBoundary,[proof]),/admitted task/);
 assert.throws(()=>f.control.admitTaskRouteStoppedBody(f.selector),/admitted task/);
},{installStarted:false}));

test('a genuine Task resume preserves the acquired body for the new stop identity',()=>withTaskControl(f=>{
 const lease=f.control.admitTaskRouteStop(f.original,{preparingWorldBoundary:f.original.worldBoundary});
 assert(lease.isPrepared()&&!lease.isCurrent());
 const proof=f.commit();
 f.releaseClock();
 assert.equal(f.control.installTaskRouteStops(proof.reference.worldBoundary,[proof]),1);
 assert(lease.isCurrent());
},{resume:true}));
