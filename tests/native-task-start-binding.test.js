import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskRequestFixture} from './helpers/native-task-resource-requests.js';
import {nativeTaskStartReferenceFromProposal} from '../src/world/native-task-start-reference.js';
import {copyNativeTaskStartAttestation} from '../src/world/native-task-start-attestation.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

function fixture(options={}){const f=nativeTaskRequestFixture({bindBodies:true,...options});f.claim();return {...f,prepare(){const result=f.planner.prepareNativeTaskStartProposal(f.planner.pendingTaskRoute(f.state.tasks[0].workerId),{bodyId:1,radius:.28,urgent:true,runRemaining:4});assert.equal(result.status,'proposed');return result.proposal;}};}
function tuple(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6)).slice(0,5);}
const commit=(f,prepared)=>f.w.nav_task_start_proposal_commit_bound(...tuple(f),prepared.ticket.ticket);
function apply(f){const events=f.planner.intentChanges();for(const event of events)f.control.accept(event);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.control.acceptClock({...f.planner.nativeCausalClock(),anchorAbsoluteMs:1000,anchorLogicalTime:10});return events;}
function bootstrap(f){const baseline=f.planner.nativeIntentControlBaseline(),control=createNativeRouteControl({authorityEpoch:baseline.authorityEpoch,initialSequence:baseline.sequence,initialTime:baseline.effectiveTime,routes:baseline.routes,pendingTaskRequests:baseline.pendingTaskRequests});control.acceptClock({...baseline.clock,anchorAbsoluteMs:2000,anchorLogicalTime:baseline.effectiveTime},{baseline:true});return {baseline,control};}

test('a source-witnessed task request prepares data but gains drawing permission only after actual assignment and direct attestation',()=>{
 const f=fixture();try{const p=f.prepare(),reference=nativeTaskStartReferenceFromProposal(p),lease=f.control.admitStart(reference,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);assert.equal(f.planner.nativeTaskStartBinding(p.actorId),null);assert.equal(commit(f,p),1);const events=apply(f);assert.equal(events[0].type,'RouteAssigned');assert.equal(lease.isCurrent(),false);const binding=f.planner.nativeTaskStartBinding(p.actorId);assert(binding);assert.deepEqual(binding.reference,reference);assert.deepEqual(binding.preparedReference,reference);assert.equal(binding.assignmentSequence,events[0].sequence);assert.equal(f.control.installStartedRoutes(reference.worldBoundary,[binding]),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,p.startTime);assert.equal(lease.executionEnd,p.endTime);
 }finally{f.close();}
});

test('native binding retains the exact prepared origin after current-frontier time translation and supports a later consumer',()=>{
 const f=fixture();let fresh;try{const p=f.prepare(),prepared=nativeTaskStartReferenceFromProposal(p);f.advance(12);const r=f.planner.revalidateNativeTaskStartProposal(p.ticket);assert.equal(r.status,'revalidated');assert.equal(commit(f,p),1);const issued=apply(f)[0],binding=f.planner.nativeTaskStartBinding(p.actorId);assert.deepEqual(binding.preparedReference,prepared);assert.deepEqual(binding.reference,nativeTaskStartReferenceFromProposal(r.proposal));assert.equal(binding.assignmentSequence,issued.sequence);f.control.installStartedRoutes(binding.reference.worldBoundary,[binding]);const lease=f.control.admitStart(prepared);assert.equal(lease.executionEpoch,12);f.advance(12.4);const recovered=bootstrap(f);fresh=recovered.control;assert.equal(recovered.baseline.pendingTaskRequests.length,1);assert.equal(recovered.baseline.nativeStartedRoutes.length,1);assert.throws(()=>fresh.admitStart(prepared),/assignment proof/);fresh.installStartedRoutes(recovered.baseline.worldBoundary,recovered.baseline.nativeStartedRoutes,{bootstrap:true});const restored=fresh.admitStart(prepared);assert(restored.isCurrent());assert.equal(restored.executionEpoch,12);assert.equal(restored.executionEnd,r.proposal.endTime);assert.deepEqual(restored.routeRecord.handle,issued.routeHandle);
 }finally{fresh?.dispose();f.close();}
});

test('a consumer joining while requests already exist can prepare the exact request without borrowing an active route',()=>{
 const f=fixture();let fresh;try{const recovered=bootstrap(f);fresh=recovered.control;assert.equal(recovered.baseline.pendingTaskRequests.length,2);const p=f.prepare(),reference=nativeTaskStartReferenceFromProposal(p),lease=fresh.admitStart(reference,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(commit(f,p),1);const events=apply(f);for(const event of events)fresh.accept(event);fresh.acceptClock({...f.planner.nativeCausalClock(),anchorAbsoluteMs:2000,anchorLogicalTime:10});const binding=f.planner.nativeTaskStartBinding(p.actorId);fresh.installStartedRoutes(reference.worldBoundary,[binding]);assert(lease.isCurrent());
 }finally{fresh?.dispose();f.close();}
});

test('an arbitrary older prepared ticket cannot be rebound through a chain of revalidations',()=>{
 const f=fixture();try{const p=f.prepare();f.advance(10.1);const one=f.planner.revalidateNativeTaskStartProposal(p.ticket);assert.equal(one.status,'revalidated');f.advance(10.2);const two=f.planner.revalidateNativeTaskStartProposal(one.proposal.ticket);assert.equal(two.status,'revalidated');assert.equal(commit(f,p),-9);assert.equal(f.planner.nativeTaskStartBinding(p.actorId),null);assert.equal(f.planner.nativeRouteTiming(two.proposal.expectedRouteHandle),null);assert.equal(commit(f,one.proposal),1);apply(f);assert.deepEqual(f.planner.nativeTaskStartBinding(p.actorId).preparedReference,nativeTaskStartReferenceFromProposal(one.proposal));
 }finally{f.close();}
});

test('exact native corner and speed knots preserve the resource projection through fractional clock shifts',()=>{
 for(const at of [10.02,10.4,1000.1]){const f=fixture();try{const p=f.prepare();f.advance(at);const next=f.planner.revalidateNativeTaskStartProposal(p.ticket);assert.equal(next.status,'revalidated');assert.equal(next.timeTranslation.sameFloat32Motion,true);assert.equal(commit(f,p),1);assert.deepEqual(f.planner.nativeTaskStartBinding(p.actorId).preparedReference,nativeTaskStartReferenceFromProposal(p));}finally{f.close();}}
});

test('revocation retires the native association and invalidates already admitted resource leases',()=>{
 const f=fixture();try{const p=f.prepare();assert.equal(commit(f,p),1);apply(f);const binding=f.planner.nativeTaskStartBinding(p.actorId);f.control.installStartedRoutes(binding.reference.worldBoundary,[binding]);const lease=f.control.admitStart(binding.preparedReference);assert(lease.isCurrent());assert.equal(f.w.nav_intent_request_reroute(p.actorId),1);for(const event of f.planner.intentChanges())f.control.accept(event);assert.equal(f.planner.nativeTaskStartBinding(p.actorId),null);assert.equal(lease.isCurrent(),false);assert.equal(f.w.nav_task_start_binding_snapshot(p.actorId),0);assert.equal(f.w.nav_intent_replan_pending_routes(),1);for(const event of f.planner.intentChanges())f.control.accept(event);assert(f.planner.pendingTaskRoute(p.actorId));assert.equal(f.planner.nativeTaskStartBinding(p.actorId),null);
 }finally{f.close();}
});

test('native baseline transport carries request and committed resource facts without a JS association registry',()=>{
 const f=fixture();let source;try{const p=f.prepare();assert.equal(commit(f,p),1);apply(f);const messages=[],port={postMessage:value=>messages.push(value),start(){},close(){}};source=createNativeIntentControlPublication({port,session:'bootstrap-start',observe:f.planner.observeNativeIntentControl,absoluteNow:()=>1000});const baseline=messages.find(message=>message.type==='IntentBaseline');assert(baseline);assert.equal(baseline.pendingTaskRequests.length,1);assert.deepEqual(baseline.nativeStartedRoutes,[f.planner.nativeTaskStartBinding(p.actorId)]);assert.equal(baseline.nativeStartedRoutes[0].assignmentSequence,baseline.routes.find(route=>route.actorId===p.actorId).assignmentSequence);
 }finally{source?.dispose();f.close();}
});

test('forged resource origins or assignment facts cannot install a start permission',()=>{
 const f=fixture();try{const p=f.prepare();assert.equal(commit(f,p),1);apply(f);const binding=f.planner.nativeTaskStartBinding(p.actorId);for(const mutate of [v=>v.assignmentSequence++,v=>v.reference.expectedRouteHandle.generation++,v=>v.reference.worldBoundary.authorityEpoch='foreign',v=>v.preparedReference.requestSequence++,v=>v.reference.endTime++,v=>v.gateIds=[1,1]]){const value=structuredClone(binding);mutate(value);assert.throws(()=>f.control.installStartedRoutes(binding.reference.worldBoundary,[value]));}assert.throws(()=>f.control.admitStart(binding.preparedReference),/assignment proof/);assert.equal(f.control.installStartedRoutes(binding.reference.worldBoundary,[binding]),1);
 }finally{f.close();}
});

test('the copied native association is a fact, not an independent authority grant',()=>{
 const f=fixture();let fresh;try{const p=f.prepare(),reference=nativeTaskStartReferenceFromProposal(p),fake=copyNativeTaskStartAttestation({reference,preparedReference:reference,assignmentSequence:reference.sourceControlSequence+1,projectionVersion:1,gateIds:[]});const value=bootstrap(f);fresh=value.control;assert.throws(()=>fresh.installStartedRoutes(reference.worldBoundary,[fake]));const lease=fresh.admitStart(reference,{preparingWorldBoundary:reference.worldBoundary});assert.equal(lease.isCurrent(),false);assert.equal(f.planner.nativeTaskStartBinding(p.actorId),null);
 }finally{fresh?.dispose();f.close();}
});

test('pthread preserves the same bound original resource identity and current native baseline',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});try{const p=f.prepare();f.advance(12);const refreshed=f.planner.revalidateNativeTaskStartProposal(p.ticket);assert.equal(refreshed.status,'revalidated');assert.equal(commit(f,p),1);apply(f);const binding=f.planner.nativeTaskStartBinding(p.actorId);assert.deepEqual(binding.preparedReference,nativeTaskStartReferenceFromProposal(p));assert.deepEqual(f.planner.nativeIntentControlBaseline().nativeStartedRoutes,[binding]);}finally{f.close();await runtime.dispose();}
});
