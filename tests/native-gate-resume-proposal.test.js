import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {copyNativeRoutePresentation} from '../src/world/native-route-presentation.js';

function held(options={}){
 const f=nativeGateCrossingFixture(options),request=f.route({facts:{urgent:true,runRemaining:6}}),admitted=f.admit(request);assert.equal(admitted.status,'admitted');const assignmentSequence=f.bridge.nativeRouteTiming(admitted.routeHandle).assignmentSequence;assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();assert.equal(f.advance(10.3).status,'advanced');const result=f.bridge.suspendNativeGateRoute(admitted.routeHandle);assert.equal(result.status,'suspended');assert.equal(f.advance(20).status,'advanced');f.bridge.commitNativeCausalClock();f.bridge.intentChanges();return {...f,assignmentSequence,source:result.suspendedRoute};
}
function propose(f){const result=f.bridge.prepareNativeGateResumeProposal(f.source.resumeHandle);assert.equal(result.status,'proposed',JSON.stringify(result));return result.proposal;}
function ticket(f){assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
const commit=(f,t)=>f.w.nav_gate_resume_proposal_commit(...t.slice(0,5));

test('a native resume proposal retains its pinned body and predicts no control assignment sequence',()=>{
 const f=held();try{const baseline=f.bridge.nativeIntentControlBaseline(),body=f.body(1),gate=f.service.read(f.gates[0].id),before=f.w.nav_gate_route_resumptions(),p=propose(f),t=ticket(f);assert.equal(t[5],13);assert.equal(p.kind,'native-route-resume-proposal');assert.equal(p.sourceAssignmentSequence,f.assignmentSequence);assert.equal(Object.hasOwn(p,'assignmentSequence'),false);assert.equal(Object.hasOwn(p,'nativeRoute'),false);assert.throws(()=>copyNativeRoutePresentation(p));assert.equal(p.sourceControlSequence,baseline.sequence);assert.equal(p.authorizedAutonomy,false);assert.equal(p.startTime,20);assert.deepEqual(p.points,f.source.remainingPoints);assert.equal(p.sourceResumeHandle.slot,p.expectedRouteHandle.slot);assert.equal(p.expectedRouteHandle.generation,p.sourceResumeHandle.generation+2);assert.equal(f.w.nav_intent_route_points(p.expectedRouteHandle.session,p.expectedRouteHandle.slot,p.expectedRouteHandle.generation),-1);assert.equal(f.bridge.nativeRouteTiming(p.expectedRouteHandle),null);
  for(let i=0;i<20;i++)assert.deepEqual(f.bridge.captureNativeGateResumeProposal(p.ticket),p);assert.deepEqual(f.bridge.nativeIntentControlBaseline(),baseline);assert.deepEqual(f.bridge.nativeSuspendedGateRoute(p.actorId),f.source);assert.deepEqual(f.body(1),body);assert.deepEqual(f.service.read(f.gates[0].id),gate);assert.equal(f.w.nav_gate_route_resumptions(),before);assert.equal(f.bridge.cancelNativeGateResumeProposal(p.ticket),true);assert.equal(f.bridge.captureNativeGateResumeProposal(p.ticket),null);assert.deepEqual(f.bridge.nativeSuspendedGateRoute(p.actorId),f.source);
 }finally{f.session.dispose();}
});

test('the shared candidate matches immediate resume and publishes its actual identity only at exact commit',()=>{
 const a=held(),b=held();try{const p=propose(a),t=ticket(a),before=a.bridge.nativeIntentControlBaseline().sequence;assert.equal(commit(a,t),1);const resumed=a.bridge.intentChanges().find(event=>event.type==='RouteAssigned');assert(resumed);assert(resumed.sequence>before);assert.deepEqual(resumed.routeHandle,p.expectedRouteHandle);assert.equal(a.bridge.nativeSuspendedGateRoute(p.actorId),null);const actual=a.bridge.captureNativeRoutePresentation(resumed.routeHandle),immediate=b.bridge.resumeNativeGateRoute(b.source.resumeHandle);assert.equal(immediate.status,'resumed');const other=b.bridge.captureNativeRoutePresentation(immediate.routeHandle);assert.deepEqual(actual.rows,p.rows);assert.deepEqual(actual.rows,other.rows);assert.deepEqual(actual.gates.map(gate=>Array.from(gate.rows)),p.gates.map(gate=>Array.from(gate.rows)));assert.deepEqual(actual.gates.map(gate=>Array.from(gate.rows)),other.gates.map(gate=>Array.from(gate.rows)));assert.equal(commit(a,t),-1);assert.equal(a.bridge.beginNativeRouteExecution().status,'started');assert.equal(a.advance(actual.startTime+.2).status,'advanced');assert.equal(a.bridge.captureNativeGateResumeProposal(p.ticket),null);
 }finally{a.session.dispose();b.session.dispose();}
});

test('proposal resource arrays are owned copies and cancellation never consumes a suffix generation',()=>{
 const f=held();try{const first=propose(f),rows=first.rows.slice(),points=first.points.slice(),gateRows=first.gates.map(gate=>gate.rows.slice());first.rows.fill(-1);first.points.fill(-1);for(const gate of first.gates)gate.rows.fill(-1);const again=f.bridge.captureNativeGateResumeProposal(first.ticket);assert.deepEqual(again.rows,rows);assert.deepEqual(again.points,points);assert.deepEqual(again.gates.map(gate=>gate.rows),gateRows);assert.equal(f.bridge.cancelNativeGateResumeProposal(first.ticket),true);assert.equal(f.bridge.cancelNativeGateResumeProposal(first.ticket),false);const second=propose(f);assert(second.ticket.ticket>first.ticket.ticket);assert.deepEqual(second.expectedRouteHandle,first.expectedRouteHandle);assert.equal(f.bridge.captureNativeGateResumeProposal(first.ticket),null);assert.equal(f.bridge.cancelNativeGateResumeProposal(second.ticket),true);
 }finally{f.session.dispose();}
});

test('wrong-kind access and wrong tickets cannot consume or adopt a prepared native resume',()=>{
 const f=held();try{const p=propose(f),t=ticket(f);assert.equal(f.w.nav_gate_resume_proposal_snapshot(t[0],t[1]+1),-1);assert.equal(f.w.nav_gate_resume_proposal_snapshot(t[0]+1,t[1]),-1);assert.equal(f.w.nav_intent_world_proposal_retains_routes(t[0],t[1]),-1);assert.notEqual(f.w.spatial_world_proposal_commit(...t.slice(0,5)),1);assert.equal(f.w.nav_gate_resume_proposal_snapshot(t[0],t[1]),1);const q=f.point(35,35);assert.equal(f.w.spatial_barrier_proposal_stage(q.x,q.z,.1,.1,0,0),-4);assert.equal(f.bridge.prepareNativeGateResumeProposal(f.source.resumeHandle).status,'busy');assert.equal(f.bridge.cancelNativeGateResumeProposal({...p.ticket,authorityEpoch:'other'}),false);assert.equal(f.w.nav_gate_resume_proposal_snapshot(t[0],t[1]),1);assert.equal(f.bridge.cancelNativeGateResumeProposal(p.ticket),true);
 }finally{f.session.dispose();}
});

test('clock changes, physical dependencies and forged receipts expire the exact pending resume without releasing its body',()=>{
 for(const mode of ['clock','body','receipt']){const f=held();try{const p=propose(f),t=ticket(f),before=f.body(1);if(mode==='clock'){assert.equal(f.advance(20.1).status,'advanced');f.bridge.commitNativeCausalClock();}else if(mode==='body'){const q=f.point(35,35);assert.equal(f.w.spatial_body_upsert(77,q.x,q.z,.2,0,1),1);}if(mode==='receipt'){t[2]++;assert.equal(commit(f,t),-3);}else assert.equal(commit(f,t),-2);assert.equal(f.bridge.captureNativeGateResumeProposal(p.ticket),null);assert.deepEqual(f.bridge.nativeSuspendedGateRoute(p.actorId),f.source);assert.deepEqual(f.body(1),before);assert.equal(f.bridge.nativeRouteTiming(p.expectedRouteHandle),null);}finally{f.session.dispose();}}
});

test('a later immediate resume makes an older resource proposal permanently obsolete',()=>{
 const f=held();try{const p=propose(f),resumed=f.bridge.resumeNativeGateRoute(f.source.resumeHandle);assert.equal(resumed.status,'resumed');assert.deepEqual(resumed.routeHandle,p.expectedRouteHandle);assert.equal(f.bridge.captureNativeGateResumeProposal(p.ticket),null);assert.equal(f.bridge.prepareNativeGateResumeProposal(f.source.resumeHandle).status,'stale');assert.equal(f.bridge.prepareNativeGateResumeProposal({...resumed.routeHandle,authorityEpoch:'other'}).status,'stale');assert.equal(f.bridge.nativeSuspendedGateRoute(p.actorId),null);}finally{f.session.dispose();}
});

test('pthread exposes the same non-executable prepared native resume and owned samples',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=held({core:runtime.core});try{const p=propose(f);assert.equal(p.bodyId,1);assert.equal(p.rows[0],20);assert.equal(f.bridge.nativeRouteTiming(p.expectedRouteHandle),null);assert.equal(f.bridge.cancelNativeGateResumeProposal(p.ticket),true);assert.deepEqual(f.bridge.nativeSuspendedGateRoute(p.actorId),f.source);}finally{f.session.dispose();await runtime.dispose();}
});
