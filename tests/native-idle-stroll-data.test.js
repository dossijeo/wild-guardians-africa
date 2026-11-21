import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollFixture} from './helpers/native-idle-stroll.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {copyNativeIdleStrollReference,copyNativeIdleStrollProposal,copyNativeIdleStrollAttestation,sameNativeIdleStrollReference,nativeIdleStrollContinuesNext,nativeIdleStrollSuccessor,nativeIdleStrollPresentationMatches} from '../src/world/native-idle-stroll.js';

test('typed stroll captures the genuine native decision using bounded values and generation handles',()=>{
 const f=nativeIdleStrollFixture({peer:true});try{
  const body=f.body(1),worker=structuredClone(f.worker),worldRng=f.state.rng,p=f.prepare();assert.equal(p.status,'proposed');const proposal=copyNativeIdleStrollProposal(p.proposal),r=proposal.nativeIdleStroll;assert.deepEqual(proposal,p.proposal);assert.deepEqual(copyNativeIdleStrollReference(r),r);assert.equal(nativeIdleStrollSuccessor(r,{...r,endTime:r.endTime+.1,worldBoundary:{...r.worldBoundary,effectiveTime:r.worldBoundary.effectiveTime+.1}}),false);assert(nativeIdleStrollContinuesNext(r,f.next));assert.equal(r.sourceCycleSequence,f.next.sourceCycle.cycleSequence);assert.equal(r.sourceDecisionSequence,f.next.requestSequence);assert.equal(r.walkRng,f.next.idleState.rng);assert.deepEqual(r.destination,{x:f.next.idleState.destination.x,z:f.next.idleState.destination.z});assert.equal(r.sourceBody,undefined);assert.equal(r.sourceCycle,undefined);assert(JSON.stringify(r).length<3000);assert(Object.isFrozen(r.pose));assert(Object.isFrozen(r.expectedRouteHandle));assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,worldRng);assert.equal(f.planner.nativeIdleStrollExecution(f.actor),null);
  const reordered={...r,pose:Object.fromEntries(Object.entries(r.pose).reverse())};assert(sameNativeIdleStrollReference(reordered,r));const bad={...r,bodyId:r.bodyId+1};assert.equal(nativeIdleStrollContinuesNext(bad,f.next),false);assert.equal(nativeIdleStrollContinuesNext({...r,destination:{x:r.destination.x+.01,z:r.destination.z}},f.next),false);
  assert(f.planner.cancelNativeIdleStrollProposal(proposal.ticket));assert.deepEqual(f.body(1),body);assert.equal(f.planner.captureNativeIdleStrollProposal(proposal.ticket),null);assert.deepEqual(f.planner.nativeIdleCycleNextRequest(f.actor),f.next);
 }finally{f.close();}
});

test('stroll values reject recursive history, type aliases, substituted phases and unbounded fields',()=>{
 const f=nativeIdleStrollFixture();try{
  const p=f.prepare().proposal,r=p.nativeIdleStroll;
  for(const mutate of [r=>{r.kind='native-home-route-reference';},r=>{r.sourceCycle={};},r=>{r.sourceDecisionSequence=r.sourceCycleSequence;},r=>{r.pose.radius=0;},r=>{r.pose.carryPhase=-1;},r=>{r.workerProfile='animal';},r=>{r.idleSeconds+=1;},r=>{r.walkRng=2**32;},r=>{r.bodyFlags=3;},r=>{r.endTime=r.worldBoundary.effectiveTime;},r=>{r.expectedRouteHandle.session+=1;},r=>{r.expectedRouteHandle.generation=0;},r=>{r.anchor.radius=Infinity;}]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>copyNativeIdleStrollReference(bad));}
  for(const mutate of [p=>{p.kind='native-home-route-proposal';},p=>{p.nativeHome={};},p=>{p.taskId=1;},p=>{p.motionFlags=8;},p=>{p.runDistance=1;},p=>{p.speed=0;},p=>{p.rows[9]+=1;},p=>{p.points[p.points.length-2]+=1;},p=>{p.authorizedAutonomy=true;},p=>{p.ticket.kind='native-home-route-proposal-ticket';},p=>{p.origin.x+=1;}]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>copyNativeIdleStrollProposal(bad));}
  assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));
 }finally{f.close();}
});

test('typed retiming retains the prepared program and returns the actual native association after acquisition',()=>{
 const f=nativeIdleStrollFixture({peer:true});try{
  const p=f.prepare().proposal,body=f.body(1),peer=f.body(3);f.advance(.2);f.planner.projectNativeIdleCycle(f.state,f.worker);const result=f.planner.revalidateNativeIdleStrollProposal(p.ticket);assert.equal(result.status,'revalidated');assert(result.timeTranslation.sameRelativeProgram);assert(result.timeTranslation.sameRelativeGateProgram);assert(result.proposal.startTime>p.startTime);assert(nativeIdleStrollSuccessor(p.nativeIdleStroll,result.proposal.nativeIdleStroll));assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);const binding=copyNativeIdleStrollAttestation(f.commitStroll(p));assert.deepEqual(binding.preparedReference,p.nativeIdleStroll);assert.deepEqual(binding.reference,result.proposal.nativeIdleStroll);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.deepEqual(f.planner.nativeIdleStrollBindings(),[binding]);const actual=f.planner.captureNativeRoutePresentation(binding.reference.expectedRouteHandle);assert(nativeIdleStrollPresentationMatches(p,actual,binding));assert.equal(f.planner.captureNativeIdleStrollProposal(p.ticket),null);assert.equal(f.planner.nativeGameExecutionState(),1);
  assert.throws(()=>f.planner.observeNativeIntentControl({onBaseline(){},onChanges(){}}),/Idle strolls require prepared graphical admission/);
 }finally{f.close();}
});

test('stroll preparation validates the executed Game phase, pose, owner and contract before staging',()=>{
 for(const mutate of [f=>{f.worker.x+=1;},f=>{f.worker.idleState.mode='rest';},f=>{f.worker.profile='olderMale';},f=>{f.worker.contractDay=f.state.day-1;},f=>{f.worker.nativeRouteAdmission='native-home';}]){
  const f=nativeIdleStrollFixture();try{const body=f.body(1);mutate(f);assert.equal(f.prepare().status,'unsupported');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.body(1),body);}finally{f.close();}
 }
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} typed stroll reads actual movement and keeps desired REST separate`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleStrollFixture({...runtime?{core:runtime.core}:{}});const p=f.prepare();assert.equal(p.status,'proposed');const worker=structuredClone(f.worker),binding=f.commitStroll(p.proposal),initial=f.planner.nativeIdleStrollExecution(f.actor);assert.deepEqual(initial.binding,binding);assert.equal(initial.desiredRest,null);assert.equal(initial.walkState.mode,'walk');f.advance(.1);const moving=f.planner.nativeIdleStrollExecution(f.actor);assert.equal(moving.executedThrough,f.state.elapsed);assert.equal(moving.pose.x,f.body(1).x);assert.equal(moving.pose.z,f.body(1).z);assert(moving.distance>0);assert.equal(moving.pose.runPhase,worker.runPhase);assert.equal(moving.pose.carryPhase,worker.carryPhase);assert.equal(moving.desiredRest,null);
  f.advance(p.proposal.endTime-f.state.elapsed+.01);const end=f.planner.nativeIdleStrollExecution(f.actor);assert(end.arrived);assert.equal(end.pose.x,p.proposal.points.at(-2));assert.equal(end.pose.z,p.proposal.points.at(-1));assert.equal(end.walkState.mode,'walk');assert.equal(end.walkState.rng,binding.reference.walkRng);assert.equal(end.desiredRest.mode,'rest');assert.notEqual(end.desiredRest.rng,end.walkState.rng);const body=f.body(1);f.advance(.3);assert.deepEqual(f.planner.nativeIdleStrollExecution(f.actor).desiredRest,end.desiredRest);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);
  assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.planner.nativeIdleStrollExecution(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.planner.nativeIdleStrollBindings(),[]);
 }finally{f?.close();await runtime?.dispose();}
});

test('wrong epochs and ticket families cannot read, renew or cancel a prepared stroll',()=>{
 const f=nativeIdleStrollFixture();try{
  const p=f.prepare().proposal,t={...p.ticket,authorityEpoch:p.ticket.authorityEpoch+'-old'},other={...p.ticket,kind:'native-home-route-proposal-ticket'};
  for(const ticket of [t,other]){assert.equal(f.planner.captureNativeIdleStrollProposal(ticket),null);assert.equal(f.planner.revalidateNativeIdleStrollProposal(ticket).status,'stale');assert.equal(f.planner.cancelNativeIdleStrollProposal(ticket),false);}
  assert.deepEqual(f.planner.captureNativeIdleStrollProposal(p.ticket),p);assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));
 }finally{f.close();}
});
