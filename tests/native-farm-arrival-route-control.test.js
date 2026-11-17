import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmArrivalRouteFixture as fixture} from './helpers/native-farm-arrival-route.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {copyNativeFarmArrivalRouteAttestation,sameNativeFarmArrivalRouteAttestation} from '../src/world/native-farm-arrival-route.js';
import {copyNativeHomeRouteAttestation} from '../src/world/native-home-route.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {fixture as graphicsFixture,pair,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';

// Real native log/clock. Raw commit and direct control installation below are
// trusted source fixtures, not proof that a graphical consumer prepared23.
function controlled(options={}){
 const f=fixture(options),events=[],clocks=[];let c,baseline,detach,pauseEvents=false,pauseClocks=false;
 const clock=r=>{const previous=c.status().clock;c.acceptClock({...r,anchorAbsoluteMs:r.reanchor?1000:previous.anchorAbsoluteMs,anchorLogicalTime:r.reanchor?r.committedThrough:previous.anchorLogicalTime});};
 try{detach=f.planner.observeNativeIntentControl({onBaseline(b){baseline=b;c=createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,routes:b.routes,pendingTaskRequests:b.pendingTaskRequests??[],pendingFarmArrivalRequests:b.pendingFarmArrivalRequests??[]});c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true});},onChanges(changes){events.push(...changes);if(!pauseEvents)for(const e of changes)c.accept(e);},onClock(r){clocks.push(r);if(!pauseClocks)clock(r);}});
  return {...f,c,baseline,events,clocks,prepare(urgent=false){const p=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource,{urgent});assert.equal(p.status,'proposed');return p.proposal;},commit(p){assert.equal(f.commit({ticket:p.ticket.ticket}),1);f.planner.flushNativeIntentControl();return f.planner.nativeFarmArrivalRouteBinding(f.actor);},advance(t){f.move(t);f.planner.flushNativeIntentControl();},pauseEvents:v=>pauseEvents=v,pauseClocks:v=>pauseClocks=v,acceptClock:()=>clock(clocks.at(-1)),close(){detach?.();c?.dispose();f.close();}};
 }catch(error){detach?.();c?.dispose();f.close();throw error;}
}

for(const profile of PROFILES)for(const urgent of [false,true])test(`${profile.id} ${urgent?'running':'walking'} source23 needs its exact event, clock and installation`,()=>{
 const f=controlled({profile:profile.id,peer:true});try{
  const body=f.body(1),peer=f.body(3),p=f.prepare(urgent),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);assert.equal(f.c.status().active,1);f.advance(.2);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert(lease.isPrepared());const revalidated=f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket);assert.equal(revalidated.status,'revalidated');f.pauseClocks(true);const b=f.commit(p),e=f.events.at(-1);assert.deepEqual(e.nativeFarmArrival,b);assert.notEqual(e.nativeFarmArrival,b);assert.equal(f.c.pendingFarmArrivalRequest(f.actor),null);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.throws(()=>f.c.installFarmArrivals(b.reference.worldBoundary,[b]));assert.throws(()=>f.c.admit({actorId:f.actor,routeHandle:b.reference.expectedRouteHandle,assignmentSequence:b.assignmentSequence}),/typed prepared admission/);f.acceptClock();f.pauseClocks(false);assert.equal(f.c.installFarmArrivals(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,revalidated.proposal.startTime);assert.equal(lease.executionEnd,revalidated.proposal.endTime);const record=lease.routeRecord;f.advance(.1);assert.notDeepEqual(f.body(1),body);assert.equal(lease.routeRecord,record);assert(lease.isCurrent());assert.equal(f.planner.nativeGameExecutionState(),-1);assert.throws(()=>f.planner.nativeIntentControlBaseline(),/prepared graphical admission/);
 }finally{f.close();}
});

test('the reader attaches the issued association only to its real assignment, never earlier source rows',()=>{
 const f=fixture();try{const p=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).proposal;assert.equal(f.commit({ticket:p.ticket.ticket}),1);const changes=f.planner.intentChanges(),b=f.planner.nativeFarmArrivalRouteBinding(f.actor),own=changes.filter(e=>e.actorId===f.actor);assert(own.length>=2);assert.equal(own.filter(e=>e.nativeFarmArrival).length,1);assert.deepEqual(own.find(e=>e.nativeFarmArrival).nativeFarmArrival,b);for(const e of own.filter(e=>e.sequence!==b.assignmentSequence))assert.equal(e.nativeFarmArrival,undefined);}finally{f.close();}
});

test('missing, mixed, aliased and foreign associations reject before the direct control cursor changes',()=>{
 const f=controlled();try{
  f.pauseEvents(true);f.pauseClocks(true);const p=f.prepare(),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});f.commit(p);const event=f.events.at(-1),before=f.c.status(),q=f.c.pendingFarmArrivalRequest(f.actor);
  for(const mutate of [e=>delete e.nativeFarmArrival,e=>e.nativeFarmArrival=null,e=>e.taskId=999,e=>e.taskRequest={},e=>e.farmArrivalRequest={},e=>e.nativeIdleStroll={},e=>e.state=7,e=>e.type='RouteReplaced',e=>e.nativeFarmArrival.assignmentSequence++,e=>e.nativeFarmArrival.reference.expectedRouteHandle.generation++,e=>{for(const r of [e.nativeFarmArrival.reference,e.nativeFarmArrival.preparedReference])r.sourceRequest.pose.yaw+=.1;},e=>{for(const r of [e.nativeFarmArrival.reference,e.nativeFarmArrival.preparedReference]){r.bodyId++;r.sourceRequest.bodyId++;}}]){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before.sequence);assert.deepEqual(f.c.pendingFarmArrivalRequest(f.actor),q);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);}
  assert.equal(f.c.accept({...event,authorityEpoch:'foreign'}),false);assert(f.c.accept(event));f.acceptClock();assert.equal(f.c.installFarmArrivals(event.nativeFarmArrival.reference.worldBoundary,[event.nativeFarmArrival]),1);assert(lease.isCurrent());
 }finally{f.close();}
});

test('installation is atomic, rejects bootstrap/other families and requires the exact issued gates/program',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary}),b=f.commit(p),boundary=b.reference.worldBoundary;
  for(const values of [null,{},[b,b],[b,{...b,assignmentSequence:b.assignmentSequence+1}],[{...b,gateIds:[999]}]]){assert.throws(()=>f.c.installFarmArrivals(boundary,values));assert.equal(lease.isCurrent(),false);}
  assert.throws(()=>f.c.installFarmArrivals(boundary,[b],{bootstrap:true}));assert.throws(()=>f.c.installHomes(boundary,[b]));assert.throws(()=>f.c.installStrolls(boundary,[b]));assert.equal(f.c.installFarmArrivals(boundary,[b]),1);assert(lease.isCurrent());assert.throws(()=>f.c.installFarmArrivals(boundary,[b]));assert(lease.isCurrent());assert(sameNativeFarmArrivalRouteAttestation(copyNativeFarmArrivalRouteAttestation(b),b));assert.equal(sameNativeFarmArrivalRouteAttestation(null,b),false);
 }finally{f.close();}
});

test('a committed route has a prepared lease but no current replay lease before installation',()=>{
 const f=controlled();try{const p=f.prepare(),b=f.commit(p),lease=f.c.admitFarmArrival(p.nativeFarmArrival);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.executionEpoch,null);assert.equal(lease.executionEnd,null);assert.equal(f.c.installFarmArrivals(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());}finally{f.close();}
});

test('another family cannot bootstrap an invented Home proof onto the issued Farm handle',()=>{
 const f=controlled();try{
  const p=f.prepare(),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary}),b=f.commit(p);
  const convert=r=>{const s=r.sourceRequest;return {kind:'native-home-route-reference',version:1,actorId:r.actorId,bodyId:r.bodyId,worldBoundary:r.worldBoundary,expectedRouteHandle:r.expectedRouteHandle,sourceControlSequence:r.sourceControlSequence,endTime:r.endTime,sourceRequest:{kind:'native-home-request-reference',version:1,authorityEpoch:s.authorityEpoch,nativeSession:s.nativeSession,actorId:s.actorId,bodyId:s.bodyId,bodyFlags:s.bodyFlags,requestSequence:s.requestSequence,requestedAt:s.requestedAt,profile:s.profile,pose:s.pose,home:{villageId:999,x:s.goal.x,z:s.goal.z}}};};
  const invented=copyNativeHomeRouteAttestation({kind:'native-home-route-attestation',version:1,projectionVersion:1,assignmentSequence:b.assignmentSequence,reference:convert(b.reference),preparedReference:convert(b.preparedReference),gateIds:b.gateIds});
  assert.throws(()=>f.c.installHomes(b.reference.worldBoundary,[invented],{bootstrap:true}));assert.equal(lease.isCurrent(),false);assert.equal(f.c.installFarmArrivals(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());
 }finally{f.close();}
});

test('true zero arrival retains its exact endpoint and stays Farm until a prepared successor exists',()=>{
 const f=controlled({inside:true});try{
  const body=f.body(1),p=f.prepare(true),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary}),b=f.commit(p);assert.equal(p.distance,0);assert.deepEqual(f.body(1),body);assert.equal(f.c.installFarmArrivals(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,lease.executionEnd);const event=f.events.at(-1),before=f.c.status().sequence;
  for(const state of [0,4,5,6,7]){const bad={...event,type:'RouteInvalidated',state,sequence:before+1,routeHandle:null,revokedRouteHandle:event.routeHandle};delete bad.nativeFarmArrival;assert.throws(()=>f.c.accept(bad),/prepared lifecycle/);assert.equal(f.c.status().sequence,before);assert(lease.isCurrent());}
  f.c.dispose();assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);assert.equal(lease.routeRecord,null);
 }finally{f.close();}
});

test('empty native event reads never enumerate the Farm cohort, probe a body or copy a corridor',()=>{
 const f=fixture();try{const p=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).proposal;assert.equal(f.commit({ticket:p.ticket.ticket}),1);let scans=0,probes=0,points=0;const wasm={...f.w,nav_farm_arrival_route_binding_actors(){scans++;return f.w.nav_farm_arrival_route_binding_actors();},nav_farm_arrival_route_binding_snapshot(a){probes++;return f.w.nav_farm_arrival_route_binding_snapshot(a);},nav_intent_route_points(...args){points++;return f.w.nav_intent_route_points(...args);}};const bridge=createSpatialIntentBridge({...f.session,core:{...f.session.core,wasm}});assert.equal(bridge.intentChanges().filter(e=>e.nativeFarmArrival).length,1);assert.deepEqual({scans,probes,points},{scans:0,probes:1,points:0});scans=probes=points=0;for(let i=0;i<100;i++)assert.deepEqual(bridge.intentChanges(),[]);assert.deepEqual({scans,probes,points},{scans:0,probes:0,points:0});}finally{f.close();}
});

test('pthread uses the same actual assignment and installed control lease',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;try{f=controlled({core:runtime.core,peer:true});const p=f.prepare(true),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary}),b=f.commit(p);assert.equal(f.c.installFarmArrivals(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());f.advance(.1);assert(lease.isCurrent());}finally{f?.close();await runtime.dispose();}
});

for(const malformed of [false,true])test(`original publication/remote Host ${malformed?'rejects a malformed':'applies the exact'} typed Farm acquisition without minting a GPU frame`,async()=>{
 const f=fixture({peer:true}),messages=[];let graphics,source;try{
  const [sourcePort,drawPort]=pair(),post=sourcePort.postMessage;sourcePort.postMessage=data=>{const message=structuredClone(data);if(malformed&&message.nativeFarmArrival)message.nativeFarmArrival=null;messages.push(message);post(message);};graphics=await graphicsFixture({}, {intentControl:{port:drawPort,session:'farm23-control'}});source=createNativeIntentControlPublication({port:sourcePort,session:'farm23-control',timeoutMs:1000,observe:options=>f.planner.observeNativeIntentControl(options)});await source.ready;const p=f.planner.prepareNativeFarmArrivalRouteProposal(f.requestSource).proposal;assert.equal(f.commit({ticket:p.ticket.ticket}),1);f.planner.flushNativeIntentControl();await flush();await graphics.host.idle();assert(messages.some(m=>m.type==='RouteAssigned'&&m.actorId===f.actor&&'nativeFarmArrival'in m));assert.equal(graphics.host.inspect().failed,malformed);assert.equal(graphics.gpu.submitted.length,0);if(malformed)assert.match(graphics.errors[0].message,/farm arrival attestation/);else{assert.deepEqual(graphics.errors,[]);assert.equal(graphics.host.intentControlStatus().sequence,f.planner.nativeCausalClock().intentSequence);await source.fenceGpu();}
 }finally{source?.dispose();graphics?.client.dispose();await graphics?.host.dispose();f.close();}
});
