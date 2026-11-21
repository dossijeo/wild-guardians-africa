import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {tick} from '../src/simulation/game.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {copyNativeTaskActionRequest,copyNativeTaskActionProposal} from '../src/world/native-task-action-presentation.js';
import {copyNativeRoutePresentation} from '../src/world/native-route-presentation.js';
import {copyNativeTaskStartProposal} from '../src/world/native-task-start-presentation.js';
import {copyNativeInitialIdleBodyReference} from '../src/world/native-initial-idle-body.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function fixture(options){
 const f=createNativeTaskGameFixture(options);tick(f.state,f.proposals[0].endTime-f.state.elapsed+.05,f.nav);
 const actor=f.state.workers[0].id,request=()=>f.planner.nativeTaskActionRequest(actor);
 assert(request());assert.equal(f.planner.nativeTaskExecution(f.state.workers[1].id).arrived,false);
 return {...f,actor,request};
}
function prepare(f){const result=f.planner.prepareNativeTaskActionProposal(f.request());assert.equal(result.status,'proposed',JSON.stringify(result));return result.proposal;}
function ticket(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} watering Idle reuses only the exact completed Action and cancels without applying anything`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({core:runtime?.core,taskKind:'water'});
  const p=prepare(f);
  assert.equal(f.w.nav_task_action_proposal_commit_bound(...ticket(f).slice(0,5),p.ticket.ticket),1);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
  const proof=f.planner.nativeTaskActionBinding(f.actor),body=f.body(1),target=p.request.targetId;
  const stage=(sequence=proof.actionSequence)=>f.w.nav_initial_idle_body_proposal_stage_watering(p.request.nativeRoute.actorId,p.ticket.session,sequence,2,1,target,123,7.6);
  assert.equal(stage(),-2);
  tick(f.state,p.request.duration+.2,f.nav);
  assert(f.planner.nativeTaskActionExecution(f.actor).completed);
  assert.equal(stage(proof.actionSequence+1),-2);
  assert.equal(stage(),1);const t=ticket(f);
  const request={kind:'native-initial-idle-body-proposal-ticket',authorityEpoch:f.planner.authorityEpoch,session:t[0],ticket:t[1]};
  const idle=f.planner.captureNativeInitialIdleBodyProposal(request),reference=idle.nativeInitialIdleBody;
  assert.deepEqual(reference.wateringSource,proof);
  assert.equal(reference.bodyId,p.request.bodyId);
  assert.equal(reference.sourceRequest.requestedAt,proof.reference.endTime);
  assert.throws(()=>copyNativeInitialIdleBodyReference({...reference,sourceRequest:{...reference.sourceRequest,pose:{...reference.sourceRequest.pose,yaw:0}}}));
  tick(f.state,.1,f.nav);
  const refreshed=f.planner.revalidateNativeInitialIdleBodyProposal(request);
  assert.equal(refreshed.status,'revalidated');assert.equal(refreshed.timeTranslation.compatible,true);
  assert.deepEqual(refreshed.proposal.nativeInitialIdleBody.wateringSource,proof);
  assert.equal(f.planner.cancelNativeInitialIdleBodyProposal(refreshed.proposal.ticket),true);
  assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
  assert.deepEqual(f.planner.nativeTaskActionBinding(f.actor),proof);
  assert.deepEqual(f.body(1),body);
  assert(!f.state.events.some(event=>event.type==='WaterSatisfied'));
 }finally{f?.close();await runtime?.dispose();}
});

test('a real game arrival prepares an action from its executed body without issuing action permission or effects',()=>{
 const f=fixture();try{
  const request=f.request(),pose=f.planner.nativeTaskExecution(f.actor),body=f.body(1),control=f.planner.nativeIntentControlBaseline(),evaluations=f.w.nav_intent_execution_evaluations(),p=prepare(f);
  assert.deepEqual(p.request,request);assert.deepEqual(p.origin,{x:body.x,z:body.z});assert.equal(p.radius,.28);assert.equal(p.startTime,f.state.elapsed);assert.equal(p.endTime,p.startTime+request.duration);
  for(const key of ['runPhase','walkPhase','carryPhase','runRemaining'])assert.equal(p[key],pose[key]);
  assert.equal(p.sourceControlSequence,control.sequence);assert.equal(ticket(f)[5],15);assert.equal(p.authorizedAutonomy,false);assert.equal(p.authorizedConsequences,false);
  assert.deepEqual(f.planner.nativeIntentControlBaseline(),control);assert.deepEqual(f.body(1),body);assert.equal(f.w.nav_intent_execution_evaluations(),evaluations);assert.equal(f.planner.markActionActive(f.actor),false);
  assert.equal(f.state.workers[0].status,'walking');assert.equal(f.state.crates.length,0);assert.equal(f.state.tasks[0].workerId,f.actor);
  assert.throws(()=>copyNativeRoutePresentation(p));assert.throws(()=>copyNativeTaskStartProposal(p));assert.deepEqual(copyNativeTaskActionProposal(p),p);
 }finally{f.close();}
});

test('slow action preparation moves the other genuine task and revalidates the same source at the current frontier',()=>{
 const f=fixture();try{
  const oldRequest=f.request();tick(f.state,.1,f.nav);
  const result=f.planner.prepareNativeTaskActionProposal(oldRequest);assert.equal(result.status,'proposed');const p=result.proposal,held=f.body(1),b=f.body(3);
  tick(f.state,.3,f.nav);assert.deepEqual(f.body(1),held);assert(Math.hypot(f.body(3).x-b.x,f.body(3).z-b.z)>.2);
  const refreshed=f.planner.revalidateNativeTaskActionProposal(p.ticket);assert.equal(refreshed.status,'revalidated');const next=refreshed.proposal,t=refreshed.timeTranslation;
  assert(next.ticket.ticket>p.ticket.ticket);assert.equal(next.startTime,f.state.elapsed);assert.equal(next.endTime,next.startTime+p.request.duration);assert.equal(next.request.requestedAt,oldRequest.requestedAt);assert.deepEqual(next.request.nativeRoute,p.request.nativeRoute);assert.deepEqual(next.origin,p.origin);
  assert.equal(t.previousStartTime,p.startTime);assert.equal(t.previousEndTime,p.endTime);assert.equal(t.sameSourceState,true);assert.equal(Object.hasOwn(t,'sameFloat32Motion'),false);assert.equal(Object.hasOwn(t,'authorizedPassage'),false);
  assert.equal(f.planner.captureNativeTaskActionProposal(p.ticket),null);assert.deepEqual(f.planner.captureNativeTaskActionProposal(next.ticket),next);assert.equal(f.state.crates.length,0);assert.equal(f.state.tasks[0].workerId,f.actor);
 }finally{f.close();}
});

test('action cancellation and exclusivity preserve the original arrival request and occupied body',()=>{
 const f=fixture();try{const p=prepare(f),request=f.request(),body=f.body(1);
  assert.equal(f.planner.prepareNativeTaskActionProposal(request).status,'busy');assert.deepEqual(f.planner.captureNativeTaskActionProposal(p.ticket),p);
  assert.equal(f.planner.cancelNativeTaskActionProposal({...p.ticket,ticket:p.ticket.ticket+1}),false);assert.equal(f.planner.cancelNativeTaskActionProposal(p.ticket),true);assert.equal(f.planner.cancelNativeTaskActionProposal(p.ticket),false);
  assert.equal(f.planner.captureNativeTaskActionProposal(p.ticket),null);assert.deepEqual(f.request(),request);assert.deepEqual(f.body(1),body);const next=prepare(f);assert(next.ticket.ticket>p.ticket.ticket);assert.deepEqual(next.request,p.request);
 }finally{f.close();}
});

test('a cancelled, replaced or removed source cannot be silently adopted by action revalidation',()=>{
 for(const mode of ['retire','replan','remove-body']){const f=fixture();try{const p=prepare(f),id=p.request.nativeRoute.actorId;
  assert.equal(mode==='retire'?f.w.nav_intent_retire_actor(id):mode==='replan'?f.w.nav_intent_request_reroute(id):f.w.spatial_body_remove(1),1);
  assert.equal(f.request(),null);assert.equal(f.planner.revalidateNativeTaskActionProposal(p.ticket).status,'stale');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.planner.captureNativeTaskActionProposal(p.ticket),null);assert.equal(f.state.crates.length,0);
 }finally{f.close();}}
});

test('the existing body owner rejects rebinding an arrived task during action preparation',()=>{
 const f=fixture();try{const q=f.point(-18,-12);assert.equal(f.w.spatial_body_upsert(77,q.x,q.z,.28,0,1),1);const p=prepare(f),body=f.body(1);
  assert.equal(f.w.nav_gate_bind_worker(p.request.nativeRoute.actorId,77),0);assert.deepEqual(f.planner.captureNativeTaskActionProposal(p.ticket),p);assert.equal(f.planner.revalidateNativeTaskActionProposal(p.ticket).status,'revalidated');assert.deepEqual(f.body(1),body);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('other proposal protocols cannot inspect, cancel or commit an action candidate',()=>{
 const f=fixture();try{const p=prepare(f),t=ticket(f);
  assert.equal(f.w.nav_task_start_proposal_snapshot(t[0],t[1]),-1);assert.equal(f.w.nav_gate_resume_proposal_snapshot(t[0],t[1]),-1);assert.equal(f.w.nav_intent_world_proposal_retains_routes(t[0],t[1]),-1);
  assert.equal(f.w.nav_task_start_proposal_cancel(t[0],t[1]),0);assert.equal(f.w.nav_gate_resume_proposal_cancel(t[0],t[1]),0);assert.equal(f.w.nav_task_start_proposal_commit(...t.slice(0,5)),-1);assert.equal(f.w.nav_gate_resume_proposal_commit(...t.slice(0,5)),-1);assert.notEqual(f.w.spatial_world_proposal_commit(...t.slice(0,5)),1);
  assert.equal(f.w.nav_task_action_proposal_snapshot(t[0]+1,t[1]),-1);assert.equal(f.w.nav_task_action_proposal_snapshot(t[0],t[1]+1),-1);assert.deepEqual(f.planner.captureNativeTaskActionProposal(p.ticket),p);assert.deepEqual(f.request(),p.request);
 }finally{f.close();}
});

test('an obsolete exact action snapshot fails closed without entering an action',()=>{
 const f=fixture();try{const p=prepare(f);tick(f.state,.1,f.nav);assert.equal(f.planner.captureNativeTaskActionProposal(p.ticket),null);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.planner.revalidateNativeTaskActionProposal(p.ticket).status,'stale');assert(f.request());assert.equal(f.state.workers[0].status,'walking');assert.equal(f.state.crates.length,0);}finally{f.close();}
});

test('action proposal validation rejects forged permission, predicted identity and altered source declarations',()=>{
 const f=fixture();try{const p=prepare(f);
  for(const mutate of [v=>v.authorizedAutonomy=true,v=>v.authorizedConsequences=true,v=>v.nativeAction={sequence:99},v=>v.assignmentSequence=99,v=>v.expectedRouteHandle=v.request.nativeRoute.routeHandle,v=>v.request.authorizedAutonomy=true,v=>v.request.duration=0,v=>v.request.actionKind='fake',v=>v.request.nativeRoute.routeHandle.authorityEpoch='foreign',v=>v.request.executedThrough++,v=>v.ticket.ticket++,v=>v.endTime++,v=>v.origin.x=NaN,v=>v.runPhase=-1]){const value=structuredClone(p);mutate(value);assert.throws(()=>copyNativeTaskActionProposal(value));}
  f.planner.cancelNativeTaskActionProposal(p.ticket);
  for(const change of [{duration:p.request.duration+.1},{heading:p.request.heading+.1},{targetId:p.request.targetId+1},{bodyId:3}])assert.equal(f.planner.prepareNativeTaskActionProposal({...p.request,...change}).status,'stale');
  assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.deepEqual(f.request(),p.request);
 }finally{f.close();}
});

test('native action drafts are not persisted or reusable after restoring a confirmed arrival',()=>{
 const f=fixture();try{const p=prepare(f),saved=deserialize(serialize(f.state));assert.equal(Object.hasOwn(saved.workers[0],'nativeAction'),false);f.planner.resetFromState(saved);
  assert.equal(f.planner.captureNativeTaskActionProposal(p.ticket),null);assert.equal(f.planner.revalidateNativeTaskActionProposal(p.ticket).status,'stale');assert.equal(f.planner.prepareNativeTaskActionProposal(p.request).status,'stale');assert.equal(f.planner.nativeTaskActionRequest(f.actor),null);assert(f.planner.pendingTaskRoute(f.actor));assert.equal(saved.workers[0].status,'waiting-task');assert.equal(saved.crates.length,0);
 }finally{f.close();}
});

test('request and proposal copies have no mutable alias to the native arrival',()=>{
 const f=fixture();try{const request=copyNativeTaskActionRequest(structuredClone(f.request())),p=prepare(f),clone=structuredClone(p),copy=copyNativeTaskActionProposal(clone);
  clone.origin.x++;clone.request.heading++;clone.request.nativeRoute.routeHandle.generation++;clone.ticket.ticket++;
  assert.deepEqual(copy,p);assert.deepEqual(request,f.request());assert(Object.isFrozen(copy.origin));assert(Object.isFrozen(copy.request.nativeRoute.routeHandle));assert(Object.isFrozen(copy.ticket));assert.deepEqual(f.planner.captureNativeTaskActionProposal(p.ticket),p);
 }finally{f.close();}
});

test('a forged declaration cannot prepare an action before the native task has arrived',()=>{
 const f=createNativeTaskGameFixture();try{const worker=f.state.workers[0],pose=f.planner.nativeTaskExecution(worker.id),r={kind:'native-task-action-resource-request',version:1,nativeRoute:pose.nativeRoute,taskId:pose.taskId,targetId:pose.targetId,bodyId:pose.bodyId,requestedAt:f.state.elapsed,executedThrough:f.state.elapsed,actionKind:'harvest',duration:2.4,heading:pose.yaw,authorizedAutonomy:false},h=pose.nativeRoute.routeHandle;
  assert.equal(f.planner.prepareNativeTaskActionProposal(r).status,'stale');assert.equal(f.w.nav_task_action_proposal_stage(pose.nativeRoute.actorId,h.session,h.slot,h.generation,pose.nativeRoute.assignmentSequence,pose.taskId,pose.targetId,pose.bodyId,r.requestedAt,0,r.duration,r.heading),-1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('pthread retains and revalidates the same real Game arrival declaration while the second task executes',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;
 try{f=fixture({core:runtime.core});const p=prepare(f),b=f.body(3);tick(f.state,.2,f.nav);const next=f.planner.revalidateNativeTaskActionProposal(p.ticket);assert.equal(next.status,'revalidated');assert.equal(next.timeTranslation.sameSourceState,true);assert.equal(next.proposal.startTime,f.state.elapsed);assert(Math.hypot(f.body(3).x-b.x,f.body(3).z-b.z)>.1);assert.equal(f.state.crates.length,0);}finally{f?.close();await runtime.dispose();}
});
