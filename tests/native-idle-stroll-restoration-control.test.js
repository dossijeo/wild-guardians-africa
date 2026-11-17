import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledRestoredNativeIdleStroll} from './helpers/native-idle-stroll-restoration-control.js';
import {nativeIdleStrollGameSave} from './helpers/native-idle-stroll-restoration-game.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {enqueue} from '../src/simulation/tasks.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit} from '../src/simulation/game.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

for(const profile of PROFILES)test(`${profile.id} restored request is metadata until its real22 acquisition, clock and installation`,()=>{
 const f=controlledRestoredNativeIdleStroll({saved:nativeIdleStrollGameSave({profile:profile.id})});try{
  const q=f.c.pendingIdleStrollRequest(f.actor),body=f.body(1);assert.deepEqual(q,f.planner.nativeIdleStrollRequestReference(f.actor));assert(Object.isFrozen(q.pose));assert.equal(f.c.status().active,0);const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);
  f.advance(.2);assert.deepEqual(f.body(1),body);assert(lease.isPrepared());const renewed=f.planner.revalidateNativeIdleStrollProposal(p.ticket);assert.equal(renewed.status,'revalidated');f.pauseClock(true);const binding=f.commit(p);assert.deepEqual(f.events.at(-1).nativeIdleStroll,binding);assert.equal(f.c.pendingIdleStrollRequest(f.actor),null);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.throws(()=>f.c.installStrolls(binding.reference.worldBoundary,[binding]));f.acceptLastClock();f.pauseClock(false);assert.equal(f.c.installStrolls(binding.reference.worldBoundary,[binding]),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,renewed.proposal.startTime);assert.equal(lease.executionEnd,renewed.proposal.endTime);const record=lease.routeRecord;f.advance(.1);assert.notDeepEqual(f.body(1),body);assert.equal(lease.routeRecord,record);assert(lease.isCurrent());
 }finally{f.close();}
});

test('the actual first binding publishes a fresh request; an unbound declaration grants no metadata body',()=>{
 const f=controlledRestoredNativeIdleStroll({bindAfterObserve:true});try{
  assert.equal(f.baseline.pendingIdleStrollRequests,undefined);assert.equal(f.c.pendingIdleStrollRequest(f.actor),null);assert.equal(f.w.spatial_body_count(),0);const declared=f.planner.nativeIdleStrollDeclarationReference(f.actor);assert.equal(declared.bodyId,undefined);f.bind();const q=f.c.pendingIdleStrollRequest(f.actor);assert(q);assert(q.requestSequence>declared.requestSequence);assert.deepEqual(f.events.at(-1).idleStrollRequest,q);assert.equal(q.bodyId,1);const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commit(p);assert.equal(f.c.installStrolls(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());
 }finally{f.close();}
});

test('restored request baseline rejects duplicates, foreign identity/time, physical aliases and a wrong clock session',()=>{
 const f=controlledRestoredNativeIdleStroll();try{
  const b=f.baseline,q=b.pendingIdleStrollRequests[0],make=values=>createNativeRouteControl({authorityEpoch:b.authorityEpoch,initialSequence:b.sequence,initialTime:b.effectiveTime,pendingIdleStrollRequests:values});assert.throws(()=>make([q,q]));
  for(const mutate of [q=>q.authorityEpoch+='x',q=>q.requestSequence=b.sequence+1,q=>q.requestedAt=b.effectiveTime+1,q=>delete q.bodyId,q=>q.bodyId=0,q=>q.pose.radius=0,q=>q.routeHandle={},q=>q.walkRng=-1]){const bad=structuredClone(q);mutate(bad);assert.throws(()=>make([bad]));}
  const c=make([{...q,nativeSession:q.nativeSession+1}]);try{assert.throws(()=>c.acceptClock({...b.clock,anchorAbsoluteMs:1000,anchorLogicalTime:b.clock.committedThrough},{baseline:true}),/session/);assert.equal(c.pendingIdleStrollRequest(f.actor),null);}finally{c.dispose();}
 }finally{f.close();}
});

test('malformed first-binding events leave the actor cursor intact and cannot redeclare a bound source',()=>{
 const f=controlledRestoredNativeIdleStroll({bindAfterObserve:true});try{
  f.pauseControl(true);f.pauseClock(true);f.bind();const event=f.events.at(-1),before=f.c.status().sequence;
  for(const mutate of [e=>e.idleStrollRequest.requestSequence++,e=>e.idleStrollRequest.actorId++,e=>e.idleStrollRequest.requestedAt+=1,e=>e.idleStrollRequest.bodyId=0,e=>e.idleStrollRequest.pose.radius=0,e=>e.initialIdleRequest={},e=>e.routeHandle={authorityEpoch:e.authorityEpoch,session:1,slot:0,generation:1},e=>e.state=7]){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before);assert.equal(f.c.pendingIdleStrollRequest(f.actor),null);}
  assert(f.c.accept(event));f.acceptLastClock();assert.deepEqual(f.c.pendingIdleStrollRequest(f.actor),event.idleStrollRequest);const duplicate=structuredClone(event);duplicate.sequence++;duplicate.idleStrollRequest.requestSequence++;assert.throws(()=>f.c.accept(duplicate),/existing owner/);assert.equal(f.c.status().sequence,event.sequence);
 }finally{f.close();}
});

test('restored acquisition cannot borrow changed source metadata or an omitted direct source',()=>{
 const f=controlledRestoredNativeIdleStroll();try{
  const p=f.prepare(),r=p.nativeIdleStroll;for(const mutate of [r=>{r.sourceRequest.walkRng++;r.walkRng++;},r=>{r.sourceRequest.bodyId++;r.bodyId++;},r=>{r.sourceRequest.pose.walkPhase+=.1;r.pose.walkPhase+=.1;},r=>{r.sourceRequest.destination.x+=.001;r.destination.x+=.001;}]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>f.c.admitStroll(bad,{preparingWorldBoundary:p.worldBoundary}));}
  f.pauseControl(true);f.pauseClock(true);const b=f.commit(p),event=f.events.at(-1),before=f.c.status().sequence;
  for(const mutate of [e=>delete e.nativeIdleStroll,e=>e.nativeIdleStroll.assignmentSequence++,e=>e.nativeIdleStroll.reference.sourceRequest.requestSequence++,e=>e.nativeIdleStroll.preparedReference.sourceRequest.walkRng++,e=>e.idleStrollRequest=structuredClone(r.sourceRequest),e=>e.homeRequest={},e=>e.state=7]){const bad=structuredClone(event);mutate(bad);assert.throws(()=>f.c.accept(bad));assert.equal(f.c.status().sequence,before);assert.deepEqual(f.c.pendingIdleStrollRequest(f.actor),r.sourceRequest);}
  assert(f.c.accept(event));f.acceptLastClock();assert.equal(f.c.installStrolls(b.reference.worldBoundary,[b]),1);
 }finally{f.close();}
});

test('restored installation is atomic and cannot use duplicates, another ticket, historical bootstrap or disposal',()=>{
 const f=controlledRestoredNativeIdleStroll();try{
  const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commit(p),w=b.reference.worldBoundary;
  for(const mutate of [b=>b.assignmentSequence++,b=>b.reference.worldBoundary.ticket++,b=>{b.reference.pose.yaw++;b.reference.sourceRequest.pose.yaw++;},b=>b.preparedReference.sourceRequest.anchor.x+=.01]){const bad=structuredClone(b);mutate(bad);assert.throws(()=>f.c.installStrolls(w,[b,bad]));assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);}
  assert.throws(()=>f.c.installStrolls(w,[b,b]));assert.throws(()=>f.c.installStrolls(w,[b],{bootstrap:true}));assert.equal(f.c.installStrolls(w,[b]),1);assert(lease.isCurrent());f.c.dispose();assert.equal(lease.isCurrent(),false);assert.equal(lease.isPrepared(),false);assert.equal(lease.routeRecord,null);
 }finally{f.close();}
});

test('a cancelled preparation cannot install its later replacement association',()=>{
 const f=controlledRestoredNativeIdleStroll();try{
  const p=f.prepare(),old=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));assert.equal(old.isCurrent(),false);assert.equal(old.routeRecord,null);const next=f.prepare();assert.notEqual(next.ticket.ticket,p.ticket.ticket);const b=f.commit(next);assert.equal(f.c.installStrolls(b.reference.worldBoundary,[b]),1);assert.equal(old.isCurrent(),false);assert.equal(old.isPrepared(),false);assert(f.c.admitStroll(next.nativeIdleStroll).isCurrent());
 }finally{f.close();}
});

test('a pending restored source is revoked by a real Task request without a fake WALK acquisition',()=>{
 const f=controlledRestoredNativeIdleStroll();try{
  const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1);assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));const target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.saved.reference.anchor.x+1,f.saved.reference.anchor.z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const rows=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,rows,{navVersion:1,pendingResources:true}),1);f.planner.commitNativeCausalClock();assert(f.planner.pendingTaskRoute(f.actor));assert.equal(f.c.pendingIdleStrollRequest(f.actor),null);assert.equal(lease.isPrepared(),false);assert.equal(lease.isCurrent(),false);assert.deepEqual(f.body(1),body);assert(!f.events.some(e=>e.nativeIdleStroll));
 }finally{f.close();}
});

test('contract expiry publishes a genuine Home from the retained restored pose and invalidates its prepared stroll',()=>{
 const saved=nativeIdleStrollGameSave(),worker=saved.state.workers[0];saved.state.time=PROFILES.find(p=>p.id===worker.profile).end-.05;const f=controlledRestoredNativeIdleStroll({saved});try{
  const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1);assert(f.planner.cancelNativeIdleStrollProposal(p.ticket));f.advance(.1);assert.equal(f.worker.status,'returning');assert.equal(f.c.pendingIdleStrollRequest(f.actor),null);assert(f.events.some(e=>e.homeRequest));assert.deepEqual(f.body(1),body);assert.equal(lease.isPrepared(),false);assert(!f.events.some(e=>e.nativeIdleStroll));
 }finally{f.close();}
});

test('pthread restored request uses the same actual direct-control acquisition',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;try{f=controlledRestoredNativeIdleStroll({core:runtime.core});const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),b=f.commit(p);assert.equal(f.c.installStrolls(b.reference.worldBoundary,[b]),1);assert(lease.isCurrent());}finally{f?.close();}
});
