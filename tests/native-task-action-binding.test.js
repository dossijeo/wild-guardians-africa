import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {tick} from '../src/simulation/game.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {nativeTaskActionReferenceFromProposal,copyNativeTaskActionReference,sameNativeTaskActionReference} from '../src/world/native-task-action-presentation.js';
import {copyNativeTaskActionAttestation} from '../src/world/native-task-action-attestation.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {MessageChannel} from 'node:worker_threads';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

function acceptClock(control,clock,{baseline=false}={}){
 const previous=control.status().clock,reanchor=baseline||clock.reanchor;
 control.acceptClock({...clock,anchorLogicalTime:reanchor?clock.committedThrough:previous.anchorLogicalTime,anchorAbsoluteMs:reanchor?(previous?previous.anchorAbsoluteMs+(clock.committedThrough-previous.anchorLogicalTime)*1000/previous.rate:1000):previous.anchorAbsoluteMs},{baseline});
}
function fromBaseline(b){const control=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[]});acceptClock(control,b.clock,{baseline:true});if(b.nativeStartedRoutes)control.installStartedRoutes(b.worldBoundary,b.nativeStartedRoutes,{bootstrap:true});if(b.nativeActions)control.installActions(b.worldBoundary,b.nativeActions,{bootstrap:true});return control;}
function fixture(options){const f=createNativeTaskGameFixture(options);tick(f.state,f.proposals[0].endTime-f.state.elapsed+.05,f.nav);const actor=f.state.workers[0].id,baseline=f.planner.nativeIntentControlBaseline(),control=fromBaseline(baseline);return {...f,actor,control,baseline,close(){control.dispose();f.close();}};}
function prepare(f){const result=f.planner.prepareNativeTaskActionProposal(f.planner.nativeTaskActionRequest(f.actor));assert.equal(result.status,'proposed');return result.proposal;}
function tuple(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
function synchronize(f){const previous=f.planner.nativeCausalClock();assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock({rate:previous?.rate??1,paused:previous?.paused??false}).status));for(const event of f.planner.intentChanges())f.control.accept(event);const clock=f.planner.nativeCausalClock();if(f.control.status().clock?.clockSequence!==clock.clockSequence)acceptClock(f.control,clock);}
function commit(f,p,{preparedTicket=p.ticket.ticket}={}){assert.equal(f.w.nav_task_action_proposal_commit_bound(...tuple(f).slice(0,5),preparedTicket),1);synchronize(f);const binding=f.planner.nativeTaskActionBinding(f.actor);assert(binding);f.control.installActions(binding.reference.worldBoundary,[binding]);return binding;}
function advance(f,at){f.state.elapsed=at;assert.equal(f.planner.advanceNativeRouteExecution(at).status,'advanced');synchronize(f);}

test('only an exact native action commit issues its action identity and releases the completed route',()=>{
 const f=fixture();try{const p=prepare(f),old=f.planner.nativeTaskExecution(f.actor).nativeRoute,body=f.body(1),before=f.planner.nativeIntentControlBaseline();assert.equal(f.planner.finishAction(f.actor),false);assert.equal(f.planner.markActionActive(f.actor),false);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);
  const binding=commit(f,p);assert.equal(binding.kind,'native-task-action-attestation');assert(binding.actionSequence>before.sequence);assert(sameNativeTaskActionReference(binding.reference,nativeTaskActionReferenceFromProposal(p)));assert(sameNativeTaskActionReference(binding.preparedReference,binding.reference));assert.deepEqual(binding.reference.request.nativeRoute,old);assert.equal(f.planner.nativeRouteTiming(old.routeHandle),null);assert.equal(f.planner.nativeTaskExecution(f.actor),null);assert.equal(f.planner.nativeTaskActionRequest(f.actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeTaskActionBindings().length,1);assert.equal(f.planner.nativeTaskActionExecution(f.actor).completed,false);assert.equal(f.state.crates.length,0);
  assert.equal(f.w.nav_task_action_proposal_commit_bound(p.ticket.session,p.ticket.ticket,binding.reference.sourceControlSequence,p.startTime,f.planner.nativeCausalClock().clockSequence,p.ticket.ticket),-1);
 }finally{f.close();}
});

test('late preparation binds the exact retained source while action time starts at the revalidated frontier',()=>{
 const f=fixture();try{const p=prepare(f),body=f.body(1),b=f.body(3);advance(f,f.state.elapsed+.3);const next=f.planner.revalidateNativeTaskActionProposal(p.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameSourceState);const binding=commit(f,next.proposal,{preparedTicket:p.ticket.ticket});assert(sameNativeTaskActionReference(binding.preparedReference,nativeTaskActionReferenceFromProposal(p)));assert(sameNativeTaskActionReference(binding.reference,nativeTaskActionReferenceFromProposal(next.proposal)));assert.equal(binding.reference.startTime,f.state.elapsed);assert.deepEqual(f.body(1),body);assert(Math.hypot(f.body(3).x-b.x,f.body(3).z-b.z)>.1);
  for(const key of ['runPhase','walkPhase','carryPhase','runRemaining','radius'])assert.equal(Math.fround(binding.reference[key]),Math.fround(binding.preparedReference[key]));assert.equal(binding.reference.request.duration,binding.preparedReference.request.duration);assert.equal(f.planner.nativeTaskActionExecution(f.actor).elapsed,0);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('wrong receipts or unrelated retained tickets cannot enter an action',()=>{
 for(const mode of ['sequence','time','clock','prepared']){const f=fixture();try{const p=prepare(f),t=tuple(f),body=f.body(1);if(mode==='sequence')t[2]++;if(mode==='time')t[3]+=.1;if(mode==='clock')t[4]++;const result=f.w.nav_task_action_proposal_commit_bound(...t.slice(0,5),p.ticket.ticket+(mode==='prepared'?10:0));assert(result!==1);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert(f.planner.nativeTaskExecution(f.actor));assert.deepEqual(f.body(1),body);assert.equal(f.state.crates.length,0);}finally{f.close();}}
});

test('a prepared action reference is never current before its issued native transition and direct attestation',()=>{
 const f=fixture();try{const p=prepare(f),reference=nativeTaskActionReferenceFromProposal(p),lease=f.control.admitAction(reference,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.executionEpoch,null);
  const guessed={kind:'native-task-action-attestation',version:1,projectionVersion:1,actionSequence:f.baseline.sequence+1,reference,preparedReference:reference};assert.throws(()=>f.control.installActions(p.worldBoundary,[guessed]),/issued transition/);assert.equal(lease.isCurrent(),false);
  const binding=commit(f,p);assert(lease.isCurrent());assert.equal(lease.executionEpoch,binding.reference.startTime);assert.equal(lease.executionEnd,binding.reference.endTime);assert.equal(lease.actionRecord.actionSequence,binding.actionSequence);
 }finally{f.close();}
});

test('native action age follows the one executed clock while its body stays held and the second task moves',()=>{
 const f=fixture();try{const binding=commit(f,prepare(f)),body=f.body(1),b=f.body(3),before=f.planner.nativeTaskActionExecution(f.actor);assert.equal(before.elapsed,0);assert.equal(f.planner.finishAction(f.actor),false);advance(f,f.state.elapsed+.4);const next=f.planner.nativeTaskActionExecution(f.actor);assert(Math.abs(next.elapsed-.4)<1e-10);assert(next.remaining<before.remaining);assert.equal(next.completed,false);assert.deepEqual(f.body(1),body);assert(Math.hypot(f.body(3).x-b.x,f.body(3).z-b.z)>.2);assert.equal(f.state.crates.length,0);assert.equal(binding.actionSequence,next.binding.actionSequence);
 }finally{f.close();}
});

test('finishing a native action is rejected before its end and revokes its permission exactly once at completion',()=>{
 const f=fixture();try{const binding=commit(f,prepare(f)),lease=f.control.admitAction(binding.reference);advance(f,binding.reference.endTime-.01);assert.equal(f.planner.finishAction(f.actor),false);assert(lease.isCurrent());advance(f,binding.reference.endTime);assert(f.planner.nativeTaskActionExecution(f.actor).completed);const record=lease.actionRecord;record.lastDrawTime=f.state.elapsed;assert.equal(f.planner.finishAction(f.actor),true);synchronize(f);assert.equal(lease.isCurrent(),false);assert.equal(record.safeUntil,f.state.elapsed);assert.equal(f.planner.finishAction(f.actor),false);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.state.crates.length,0);
 }finally{f.close();}
});

test('native action ownership rejects physical pose, radius, kind and flag changes or a worker rebind',()=>{
 const f=fixture();try{const p=prepare(f),binding=commit(f,p),body=f.body(1),at=f.state.elapsed;
  assert.equal(f.w.spatial_body_upsert(1,body.x,body.z,body.radius,body.kind,body.flags),1);
  for(const args of [[body.x+.1,body.z,body.radius,body.kind,body.flags],[body.x,body.z,body.radius+.01,body.kind,body.flags],[body.x,body.z,body.radius,1,body.flags],[body.x,body.z,body.radius,body.kind,3]])assert.equal(f.w.spatial_body_upsert(1,...args),0);
  const q=f.point(-18,-12);assert.equal(f.w.spatial_body_upsert(77,q.x,q.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(binding.reference.request.nativeRoute.actorId,77),0);assert.deepEqual(f.body(1),body);assert.equal(f.state.elapsed,at);assert(f.planner.nativeTaskActionBinding(f.actor));
 }finally{f.close();}
});

test('removing the physical action body revokes its source and direct permission without applying effects',()=>{
 const f=fixture();try{const binding=commit(f,prepare(f)),lease=f.control.admitAction(binding.reference);assert.equal(f.w.spatial_body_remove(1),1);synchronize(f);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(lease.isCurrent(),false);assert.equal(f.planner.nativeTaskActionBindings().length,0);assert.equal(f.state.crates.length,0);}finally{f.close();}
});

test('a new consumer bootstraps genuine live actions separately from route handles',()=>{
 const f=fixture();let replacement;try{const binding=commit(f,prepare(f)),base=f.planner.nativeIntentControlBaseline();assert.equal(base.routes.length,1);assert.equal(base.nativeActions.length,1);assert.deepEqual(base.nativeActions[0],binding);replacement=fromBaseline(base);assert(replacement.admitAction(binding.preparedReference).isCurrent());assert.throws(()=>replacement.admit(binding.reference.request.nativeRoute),/obsolete/);assert.throws(()=>replacement.installActions(binding.reference.worldBoundary,[binding],{bootstrap:true}),/issued transition/);}finally{replacement?.dispose();f.close();}
});

test('a stationary action can keep its causal clock after the remaining route is retired',()=>{
 const f=fixture();try{const binding=commit(f,prepare(f));assert.equal(f.w.nav_intent_retire_actor(Number(f.state.workers[1].id.split('-').at(-1))),1);synchronize(f);assert.equal(f.w.nav_intent_route_reservation_count(),0);advance(f,f.state.elapsed+.2);assert(f.planner.nativeTaskActionExecution(f.actor).elapsed>.19);assert.equal(f.planner.nativeIntentControlBaseline().routes.length,0);assert(f.control.admitAction(binding.reference).isCurrent());}finally{f.close();}
});

test('unprojected source actions cannot fall through to legacy Game movement or task consequences',()=>{
 const f=fixture();try{commit(f,prepare(f));const at=f.state.elapsed,body=f.body(1);assert.equal(f.planner.nativeGameExecutionState(),-1);assert.throws(()=>tick(f.state,.1,f.nav),/projection for this intention class/);assert.equal(f.state.elapsed,at);assert.deepEqual(f.body(1),body);assert.equal(f.state.crates.length,0);}finally{f.close();}
});

test('action attestation validation rejects a changed source, projection, or guessed early action sequence',()=>{
 const f=fixture();try{const binding=commit(f,prepare(f));for(const mutate of [v=>v.actionSequence=v.reference.sourceControlSequence,v=>v.projectionVersion=2,v=>v.reference.origin.x++,v=>v.reference.request.heading++,v=>v.reference.request.duration++,v=>v.preparedReference.worldBoundary.ticket+=100,v=>v.reference.nativeRoute={},v=>v.reference.runPhase=Infinity]){const value=structuredClone(binding);mutate(value);assert.throws(()=>copyNativeTaskActionAttestation(value));}assert.deepEqual(copyNativeTaskActionReference(binding.reference),binding.reference);assert.deepEqual(copyNativeTaskActionAttestation(binding),binding);}finally{f.close();}
});

test('pthread issues and reads an actual native action identity through the shared clock and body owner',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;
 try{f=fixture({core:runtime.core});const binding=commit(f,prepare(f)),body=f.body(1);advance(f,f.state.elapsed+.2);assert(f.planner.nativeTaskActionExecution(f.actor).elapsed>.19);assert.deepEqual(f.body(1),body);assert(f.control.admitAction(binding.reference).isCurrent());}finally{f?.close();await runtime.dispose();}
});

test('pause and rate changes use the existing causal clock without a second action timer',()=>{
 const f=fixture();try{commit(f,prepare(f));const before=f.planner.nativeTaskActionExecution(f.actor),body=f.body(3);assert.equal(f.planner.commitNativeCausalClock({paused:true}).status,'committed');synchronize(f);assert.equal(f.w.nav_intent_execution_advance(f.state.elapsed+.2),-5);assert.deepEqual(f.planner.nativeTaskActionExecution(f.actor),before);assert.deepEqual(f.body(3),body);assert.equal(f.planner.commitNativeCausalClock({paused:false,rate:2}).status,'committed');synchronize(f);advance(f,f.state.elapsed+.4);assert(Math.abs(f.planner.nativeTaskActionExecution(f.actor).elapsed-.4)<1e-10);assert.equal(f.control.status().clock.rate,2);assert.equal(f.state.crates.length,0);}finally{f.close();}
});

test('a rejected action bootstrap batch cannot partially install an earlier valid action',()=>{
 const f=fixture();let peer;try{const binding=commit(f,prepare(f)),b=f.planner.nativeIntentControlBaseline();peer=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes});acceptClock(peer,b.clock,{baseline:true});assert.throws(()=>peer.installActions(b.worldBoundary,[binding,binding],{bootstrap:true}),/issued transition/);assert.throws(()=>peer.admitAction(binding.reference),/obsolete/);assert.equal(peer.installActions(b.worldBoundary,[binding],{bootstrap:true}),1);assert(peer.admitAction(binding.reference).isCurrent());}finally{peer?.dispose();f.close();}
});

test('the real direct publication transfers a native action baseline and its ordered cancellation',async()=>{
 const f=fixture(),{port1,port2}=new MessageChannel(),errors=[];let publication,peer,received;
 try{const binding=commit(f,prepare(f));port2.onmessage=({data})=>{try{if(data.type==='IntentControlClosed'){peer?.dispose();return;}if(data.type==='IntentBaseline'){received=data;peer=fromBaseline(data);}else if(data.type==='IntentClock'){peer.acceptClock(data);port2.postMessage({type:'intent-clock-applied',session:'native-action-peer',authorityEpoch:data.authorityEpoch,clockSequence:data.clockSequence,intentSequence:data.intentSequence,committedThrough:data.committedThrough,accepted:true});return;}else peer.accept(data);port2.postMessage({type:'intent-control-applied',session:'native-action-peer',authorityEpoch:data.authorityEpoch,sequence:peer.status().sequence,accepted:true,...(data.type==='IntentBaseline'?{clockSequence:data.clock.clockSequence,clockIntentSequence:data.clock.intentSequence,clockCommittedThrough:data.clock.committedThrough}:{})});}catch(error){errors.push(error);}};
  publication=createNativeIntentControlPublication({port:port1,session:'native-action-peer',observe:f.planner.observeNativeIntentControl,onError:error=>errors.push(error),timeoutMs:1000});await publication.ready;assert.deepEqual(received.nativeActions,[binding]);const lease=peer.admitAction(binding.reference);assert(lease.isCurrent());const cancelled=new Promise(resolve=>port2.once('message',resolve));assert.equal(f.w.nav_intent_retire_actor(binding.reference.request.nativeRoute.actorId),1);synchronize(f);await cancelled;assert.equal(lease.isCurrent(),false);assert.deepEqual(errors,[]);
 }finally{publication?.dispose();port2.close();port1.close();peer?.dispose();f.close();}
});
