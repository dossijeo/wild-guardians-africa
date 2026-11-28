import test from 'node:test';
import assert from 'node:assert/strict';
import {initialIdleOutsideControl} from './helpers/native-initial-idle-outside-control.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {cropSpec} from '../src/simulation/rules.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`outside20 ${mode}/${profile.id}/${threaded?'pthread':'normal'} requires actual control, clock and installation at21 and22`,async()=>{
 const f=await initialIdleOutsideControl({mode,profile:profile.id,threaded});try{
  const body=f.body(1),rng=f.state.rng,p=f.prepareCycle(),r=p.nativeIdleCycle,lease=f.c.admitIdleCycle(r,{preparingWorldBoundary:p.worldBoundary});assert.equal(r.version,2);assert.deepEqual(r.sourceBody,f.body20);assert(f.initialLease.isCurrent());assert(lease.isPrepared());assert(!lease.isCurrent());assert.equal(lease.idleCycleRecord,null);
  const b=f.commitCycle(p);assert(!lease.isCurrent());assert.equal(f.installCycle(b),1);assert(lease.isCurrent());assert(!f.initialLease.isCurrent());assert.equal(lease.executionEpoch,b.reference.worldBoundary.effectiveTime);assert.equal(lease.executionEnd,lease.executionEpoch+r.duration);assert.deepEqual(f.body(1),body);
  f.advance(r.duration+1e-7);const next=f.planner.nativeIdleCycleNextRequest(f.actor);assert(next.approach);assert.deepEqual(f.c.pendingIdleCycleRequest(f.actor),next);const sp=f.prepare(),sl=f.c.admitStroll(sp.nativeIdleStroll,{preparingWorldBoundary:sp.worldBoundary});assert(sl.isPrepared());assert(!sl.isCurrent());assert(lease.isCurrent());const sb=f.commit(sp);assert(!sl.isCurrent());assert.equal(f.installStroll(sb),1);assert(sl.isCurrent());assert(!lease.isCurrent());f.advance(.1);assert.notDeepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.worker.idleState.remaining,sp.nativeIdleStroll.walkRemaining);
 }finally{await f.dispose();}
});

for(const mode of ['rest','watch'])test(`outside20 ${mode} metadata cannot replace its actually installed parent`,async()=>{
 const f=await initialIdleOutsideControl({mode,installBody:false});try{const p=f.prepareCycle();assert.throws(()=>f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),/obsolete|source/);assert(!f.initialLease.isCurrent());assert.equal(f.c.installInitialIdleBodies(f.body20.reference.worldBoundary,[f.body20]),1);assert(f.initialLease.isCurrent());assert(f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}).isPrepared());}finally{await f.dispose();}
});

test('outside20 cycle remains non-current until ordered acquisition and causal watermark arrive',async()=>{
 const f=await initialIdleOutsideControl();try{const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});f.pauseControl(true);f.pauseClock(true);const b=f.commitCycle(p);assert(!lease.isCurrent());assert.throws(()=>f.installCycle(b));f.acceptEvents();assert(!lease.isCurrent());assert.throws(()=>f.installCycle(b));f.acceptLastClock();assert.equal(f.installCycle(b),1);assert(lease.isCurrent());}finally{await f.dispose();}
});

for(const mode of ['rest','watch'])test(`outside20 ${mode} partial retry successor requires its exact installed21`,async()=>{
 const f=await initialIdleOutsideControl({mode});try{const a=f.q.idleState.anchorId,probe=f.prepareCycle(),anchor=probe.nativeIdleCycle.anchor;assert.equal(anchor.id,a);assert(f.planner.cancelNativeIdleCycleProposal(probe.ticket));const wall=f.session.core.addWall(anchor.x,anchor.z,.4,.4);assert(wall>0);const p=f.prepareCycle(),l=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),b=f.commitCycle(p);f.installCycle(b);f.advance(p.nativeIdleCycle.duration+1e-7);const next=f.planner.nativeIdleCycleNextRequest(f.actor);assert.equal(next.idleState.mode,mode);assert.deepEqual(f.c.pendingIdleCycleRequest(f.actor),next);const sp=f.prepareCycle(),sl=f.c.admitIdleCycle(sp.nativeIdleCycle,{preparingWorldBoundary:sp.worldBoundary});assert.equal(sp.nativeIdleCycle.sourceCycleSequence,b.cycleSequence);assert(sl.isPrepared());assert(!sl.isCurrent());const sb=f.commitCycle(sp);assert(!sl.isCurrent());assert.equal(f.installCycle(sb),1);assert(sl.isCurrent());assert(!l.isCurrent());assert.equal(f.session.core.removeWall(wall),1);f.advance(sp.nativeIdleCycle.duration+1e-7);assert(f.planner.nativeIdleCycleNextRequest(f.actor).approach);}finally{await f.dispose();}
});

test('outside20 cycle retiming acquires the actual boundary using its original prepared reference',async()=>{
 const f=await initialIdleOutsideControl();try{const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary});f.advance(.2);const actual=f.planner.revalidateNativeIdleCycleProposal(p.ticket);assert.equal(actual.status,'revalidated');assert(actual.timeTranslation.compatible);const b=f.commitCycle(p);assert.deepEqual(b.preparedReference,p.nativeIdleCycle);assert.deepEqual(b.reference,actual.proposal.nativeIdleCycle);assert.equal(f.installCycle(b),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,actual.proposal.worldBoundary.effectiveTime);}finally{await f.dispose();}
});

test('outside20 cycle duplicate installation rejects the whole batch before any record is published',async()=>{
 const f=await initialIdleOutsideControl();try{const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),b=f.commitCycle(p);assert.throws(()=>f.c.installIdleCycles(b.reference.worldBoundary,[b,b]));assert(!lease.isCurrent());assert.equal(lease.idleCycleRecord,null);assert.equal(f.installCycle(b),1);const record=lease.idleCycleRecord;assert.throws(()=>f.installCycle(b));assert.equal(lease.idleCycleRecord,record);}finally{await f.dispose();}
});

for(const mode of ['rest','watch'])test(`outside20 ${mode} issued21 metadata cannot prepare22 without the installed21`,async()=>{
 const f=await initialIdleOutsideControl({mode});try{const p=f.prepareCycle(),body=f.body(1);f.commitCycle(p);f.advance(p.nativeIdleCycle.duration+1e-7);assert(f.planner.nativeIdleCycleNextRequest(f.actor).approach);const sp=f.prepare();assert.throws(()=>f.c.admitStroll(sp.nativeIdleStroll,{preparingWorldBoundary:sp.worldBoundary}),/obsolete|source/);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.deepEqual(f.body(1),body);assert(f.planner.cancelNativeIdleStrollProposal(sp.ticket));}finally{await f.dispose();}
});

for(const mode of ['rest','watch'])for(const acquired of [false,true])test(`outside20 ${mode} Home ${acquired?'cuts an installed21':'invalidates a pending21'} without extending its body`,async()=>{
 const f=await initialIdleOutsideControl({mode});try{const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1);if(acquired)f.installCycle(f.commitCycle(p));else assert(f.planner.cancelNativeIdleCycleProposal(p.ticket));f.worker.contractDay=f.state.day-1;f.advance(.1);const home=f.planner.nativeHomeRequestReference(f.actor);assert(home);if(acquired){assert(lease.isCurrent());assert.equal(lease.executionEnd,home.requestedAt);assert(lease.executionEnd<p.worldBoundary.effectiveTime+p.nativeIdleCycle.duration);f.advance(.2);assert(lease.isCurrent());assert.equal(lease.executionEnd,home.requestedAt);}else{assert(!lease.isPrepared());assert(!lease.isCurrent());assert.throws(()=>f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),/obsolete|source/);}assert.deepEqual(f.body(1),body);}finally{await f.dispose();}
});

for(const mode of ['rest','watch'])test(`outside20 ${mode} real Task request cuts the installed21 physical budget`,async()=>{
 const f=await initialIdleOutsideControl({mode});try{const p=f.prepareCycle(),lease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),body=f.body(1);f.installCycle(f.commitCycle(p));const plant=f.state.plants.find(p=>p.id===f.q.idleState.anchorId.replace('farm-',''));assert(plant);plant.growth=cropSpec(plant.species).growth_seconds;f.advance(.1);const request=f.planner.pendingTaskRoute(f.actor);assert(request);assert(lease.isCurrent());assert.equal(lease.executionEnd,request.requestedAt);assert(lease.executionEnd<p.worldBoundary.effectiveTime+p.nativeIdleCycle.duration);f.advance(.2);assert(lease.isCurrent());assert.equal(lease.executionEnd,request.requestedAt);assert.deepEqual(f.body(1),body);}finally{await f.dispose();}
});
