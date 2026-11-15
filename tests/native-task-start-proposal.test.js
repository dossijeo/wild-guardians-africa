import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskRequestFixture} from './helpers/native-task-resource-requests.js';
import {copyNativeTaskStartProposal} from '../src/world/native-task-start-presentation.js';
import {copyNativeResumeProposal} from '../src/world/native-resume-presentation.js';
import {copyNativeRoutePresentation} from '../src/world/native-route-presentation.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

function fixture(options={}){const f=nativeTaskRequestFixture({bindBodies:true,...options});f.claim();return {...f,request:()=>f.planner.pendingTaskRoute(f.state.tasks[0].workerId)};}
function prepare(f,options={}){const result=f.planner.prepareNativeTaskStartProposal(f.request(),{bodyId:1,radius:.28,urgent:true,runRemaining:4,...options});assert.equal(result.status,'proposed',JSON.stringify(result));return result.proposal;}
function ticket(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
const commit=(f,t=ticket(f))=>f.w.nav_task_start_proposal_commit(...t.slice(0,5));

test('a genuine task request prepares native temporal resources without assigning, reserving or moving its body',()=>{
 const f=fixture();try{const before=f.planner.nativeIntentControlBaseline(),bodies=[f.body(1),f.body(2),f.body(3)],request=f.request(),p=prepare(f),t=ticket(f);assert.equal(t[5],14);assert.equal(p.kind,'native-task-start-proposal');assert.equal(p.taskId,request.taskId);assert.equal(p.targetId,request.targetId);assert.equal(p.requestSequence,request.requestSequence);assert.deepEqual(p.sourceRequestHandle,request.requestHandle);assert.equal(p.requestedAt,10);assert.equal(p.startTime,10);assert(p.endTime>10);assert.equal(p.motionFlags,1);assert.equal(p.runBudget,4);assert.equal(p.authorizedAutonomy,false);assert.equal(p.authorizedPassage,false);for(const key of ['nativeRoute','assignmentSequence','sourceAssignmentSequence','sourceResumeHandle','suspendedAt'])assert.equal(Object.hasOwn(p,key),false);assert.equal(f.planner.nativeRouteTiming(p.expectedRouteHandle),null);assert.equal(f.planner.routePoints(p.sourceRequestHandle),null);assert.deepEqual(f.request(),request);assert.deepEqual(f.planner.nativeIntentControlBaseline(),before);assert.deepEqual([f.body(1),f.body(2),f.body(3)],bodies);assert.equal(f.w.nav_intent_world_proposal_retains_routes(t[0],t[1]),-1);assert.equal(f.w.nav_gate_resume_proposal_snapshot(t[0],t[1]),-1);assert.notEqual(f.w.spatial_world_proposal_commit(...t.slice(0,5)),1);assert.equal(f.planner.captureNativeTaskStartProposal(p.ticket).bodyId,1);assert.throws(()=>copyNativeRoutePresentation(p));assert.throws(()=>copyNativeResumeProposal(p));assert.deepEqual(copyNativeTaskStartProposal(p).rows,p.rows);
 }finally{f.close();}
});

test('readiness data are owned copies, and cancellation preserves both task requests and their generations',()=>{
 const f=fixture();try{const p=prepare(f),request=f.request(),rows=p.rows.slice(),points=p.points.slice();p.rows.fill(-1);p.points.fill(-1);const again=f.planner.captureNativeTaskStartProposal(p.ticket);assert.deepEqual(again.rows,rows);assert.deepEqual(again.points,points);assert.equal(f.planner.cancelNativeTaskStartProposal(p.ticket),true);assert.equal(f.planner.cancelNativeTaskStartProposal(p.ticket),false);assert.equal(f.planner.captureNativeTaskStartProposal(p.ticket),null);assert.deepEqual(f.request(),request);const next=prepare(f);assert(next.ticket.ticket>p.ticket.ticket);assert.deepEqual(next.expectedRouteHandle,p.expectedRouteHandle);assert.equal(f.planner.nativeIntentControlBaseline().routes.length,1);
 }finally{f.close();}
});

test('the current-frontier native commit issues the first real assignment once while the independent worker keeps executing',()=>{
 const f=fixture();try{const p=prepare(f),before=f.body(2),held=f.body(1),workers=JSON.stringify(f.state.workers);f.advance(12);assert(f.body(2).x-before.x>2);assert.deepEqual(f.body(1),held);const refreshed=f.planner.revalidateNativeTaskStartProposal(p.ticket);assert.equal(refreshed.status,'revalidated');const next=refreshed.proposal;assert.equal(next.startTime,12);assert.equal(next.requestedAt,10);assert.deepEqual(next.sourceRequestHandle,p.sourceRequestHandle);assert(refreshed.timeTranslation.sameFloat32Motion);assert(refreshed.timeTranslation.sameFloat32Gates);assert.equal(f.planner.nativeRouteTiming(next.expectedRouteHandle),null);const t=ticket(f);assert.equal(commit(f,t),1);const events=f.planner.intentChanges();assert.equal(events.length,1);const issued=events[0];assert.equal(issued.type,'RouteAssigned');assert.equal(issued.revokedRouteHandle,null);assert.deepEqual(issued.routeHandle,next.expectedRouteHandle);assert(issued.sequence>next.sourceControlSequence);f.control.accept(issued);assert.equal(f.planner.pendingTaskRoute(next.actorId),null);const actual=f.planner.captureNativeRoutePresentation(issued.routeHandle);assert.equal(actual.nativeRoute.assignmentSequence,issued.sequence);assert.equal(actual.startTime,12);assert.deepEqual(actual.rows,next.rows);assert.deepEqual(f.body(1),held);assert.equal(commit(f,t),-1);f.advance(12.2);assert(Math.hypot(f.body(1).x-held.x,f.body(1).z-held.z)>.1);const expected=f.planner.sampleNativeRoute(issued.routeHandle,12.2);assert.equal(f.body(1).x,expected.x);assert.equal(f.body(1).z,expected.z);assert(f.body(2).x-before.x>2);assert.equal(JSON.stringify(f.state.workers),workers);
 }finally{f.close();}
});

test('an expired exact start tuple never issues an assignment and leaves the original request available',()=>{
 const f=fixture();try{const p=prepare(f),t=ticket(f),request=f.request();f.advance(10.1);assert.equal(commit(f,t),-2);assert.equal(f.planner.captureNativeTaskStartProposal(p.ticket),null);assert.deepEqual(f.request(),request);assert.equal(f.planner.nativeRouteTiming(p.expectedRouteHandle),null);assert.equal(f.planner.intentChanges().length,0);
 }finally{f.close();}
});

test('wrong receipts and proposal kinds cannot consume an unrelated native draft',()=>{
 const f=fixture();try{const p=prepare(f),t=ticket(f);assert.equal(f.w.nav_task_start_proposal_snapshot(t[0]+1,t[1]),-1);assert.equal(f.w.nav_task_start_proposal_snapshot(t[0],t[1]+1),-1);assert.equal(f.planner.cancelNativeGateResumeProposal({...p.ticket,kind:'native-route-resume-proposal-ticket'}),false);assert.equal(f.w.nav_gate_resume_proposal_commit(...t.slice(0,5)),-1);assert.equal(f.planner.captureNativeTaskStartProposal(p.ticket).actorId,p.actorId);t[2]++;assert.equal(commit(f,t),-3);assert(f.request());assert.equal(f.planner.nativeRouteTiming(p.expectedRouteHandle),null);
 }finally{f.close();}
});

test('changing the worker body binding without moving any physical disc invalidates the final commit',()=>{
 const f=fixture();try{const q=f.point(-18,-12);assert.equal(f.w.spatial_body_upsert(77,q.x,q.z,.28,0,1),1);const p=prepare(f),t=ticket(f),held=f.body(1);assert.equal(f.w.nav_gate_bind_worker(p.actorId,77),1);assert.equal(commit(f,t),-2);assert.equal(f.planner.nativeRouteTiming(p.expectedRouteHandle),null);assert.deepEqual(f.body(1),held);assert(f.request());f.advance(10.1);
 }finally{f.close();}
});

test('a cancellation or explicit replan during preparation permanently obsoletes the original start draft',()=>{
 for(const mode of ['cancel','replan']){const f=fixture();try{const p=prepare(f),t=ticket(f);if(mode==='cancel')assert.equal(f.w.nav_intent_retire_actor(p.actorId),1);else assert.equal(f.w.nav_intent_request_reroute(p.actorId),1);assert.equal(commit(f,t),-2);assert.equal(f.planner.nativeRouteTiming(p.expectedRouteHandle),null);assert.equal(f.planner.revalidateNativeTaskStartProposal(p.ticket).status,'stale');}finally{f.close();}}
});

test('foreign requests, missing body bindings and invalid policies cannot prepare an executable candidate',()=>{
 const f=fixture();try{const r=f.request();assert.equal(f.planner.prepareNativeTaskStartProposal({...r,requestSequence:r.requestSequence+1},{bodyId:1,radius:.28}).status,'stale');assert.equal(f.planner.prepareNativeTaskStartProposal({...r,requestHandle:{...r.requestHandle,authorityEpoch:'foreign'}},{bodyId:1,radius:.28}).status,'stale');assert.equal(f.planner.prepareNativeTaskStartProposal(r,{bodyId:3,radius:.28}).status,'body-mismatch');assert.throws(()=>f.planner.prepareNativeTaskStartProposal(r,{bodyId:1,radius:.28,urgent:1}),/policy/);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert(f.request());assert.equal(f.planner.nativeIntentControlBaseline().routes.length,1);
 }finally{f.close();}
});

test('task-start resource validation rejects assignment guesses, fake suspension data and corrupted temporal samples',()=>{
 const f=fixture();try{const p=prepare(f);for(const mutate of [v=>v.assignmentSequence=99,v=>v.nativeRoute={actorId:v.actorId},v=>v.sourceResumeHandle=v.sourceRequestHandle,v=>v.suspendedAt=10,v=>v.authorizedPassage=true,v=>v.taskId=0,v=>v.requestSequence=v.sourceControlSequence+1,v=>v.sourceRequestHandle.kind='route',v=>v.expectedRouteHandle.generation++,v=>v.rows[0]++,v=>v.points[0]=NaN,v=>v.origin.x++]){const value=structuredClone(p);mutate(value);assert.throws(()=>copyNativeTaskStartProposal(value));}assert.equal(f.planner.nativeRouteTiming(p.expectedRouteHandle),null);
 }finally{f.close();}
});

test('an incapacitated physical worker cannot start its reserved work task even if the caller supplies matching incapacity flags',()=>{
 const f=fixture();try{const held=f.body(1),request=f.request();assert.equal(f.w.spatial_body_upsert(1,held.x,held.z,.28,0,3),1);const result=f.planner.prepareNativeTaskStartProposal(request,{bodyId:1,radius:.28,incapacitated:true});assert.equal(result.status,'body-mismatch');assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);assert(f.request());assert.equal(f.planner.intentChanges().length,0);}finally{f.close();}
});

test('pthread prepares and commits the same genuine first task assignment without a simulated prior suspension',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});try{const p=prepare(f);assert.equal(commit(f),1);const issued=f.planner.intentChanges().at(-1);assert.equal(issued.type,'RouteAssigned');assert.equal(issued.revokedRouteHandle,null);assert.deepEqual(issued.routeHandle,p.expectedRouteHandle);assert.deepEqual(f.planner.captureNativeRoutePresentation(issued.routeHandle).rows,p.rows);}finally{f.close();await runtime.dispose();}
});

test('the issued first task assignment enters the existing native suspension and resume lifecycle with its actual issued identity',()=>{
 const f=fixture();try{const p=prepare(f);assert.equal(commit(f),1);const issued=f.planner.intentChanges().at(-1);f.control.accept(issued);f.advance(10.4);const held=f.planner.suspendNativeGateRoute(issued.routeHandle);assert.equal(held.status,'suspended');for(const event of f.planner.intentChanges())f.control.accept(event);f.advance(10.8);const result=f.planner.prepareNativeGateResumeProposal(held.suspendedRoute.resumeHandle);assert.equal(result.status,'proposed');const resume=result.proposal;assert.equal(resume.actorId,p.actorId);assert.equal(resume.sourceAssignmentSequence,issued.sequence);assert.deepEqual(resume.sourceResumeHandle,held.suspendedRoute.resumeHandle);assert.notEqual(resume.sourceAssignmentSequence,p.requestSequence);assert.equal(f.planner.nativeRouteTiming(resume.expectedRouteHandle),null);assert(f.state.tasks.some(task=>task.workerId===`worker-${p.actorId}`));assert.equal(f.planner.cancelNativeGateResumeProposal(resume.ticket),true);}finally{f.close();}
});

test('each member of the claimed global batch can receive its own first assignment without replacing the other executable bodies',()=>{
 const f=fixture();try{const first=prepare(f),other=f.planner.pendingTaskRoute(f.state.tasks[1].workerId);assert.equal(f.planner.prepareNativeTaskStartProposal(other,{bodyId:3,radius:.28}).status,'busy');assert.equal(commit(f),1);let issued=f.planner.intentChanges();for(const event of issued)f.control.accept(event);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.control.acceptClock({...f.planner.nativeCausalClock(),anchorAbsoluteMs:1000,anchorLogicalTime:10});const second=f.planner.prepareNativeTaskStartProposal(other,{bodyId:3,radius:.28});assert.equal(second.status,'proposed');assert.equal(commit(f),1);issued=f.planner.intentChanges();assert.equal(issued.length,1);assert.equal(issued[0].type,'RouteAssigned');assert.equal(issued[0].revokedRouteHandle,null);f.control.accept(issued[0]);f.advance(10.2);assert.deepEqual(f.planner.nativeIntentControlBaseline().routes.map(route=>route.actorId),[900011,900012,900013]);assert.equal(f.planner.nativeRouteTiming(first.expectedRouteHandle).actorId,900011);assert.equal(f.planner.nativeRouteTiming(second.proposal.expectedRouteHandle).actorId,900013);}finally{f.close();}
});
