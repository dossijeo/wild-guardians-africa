import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedApproachControl} from './helpers/native-idle-selected-approach-control.js';
import {PROFILES} from '../src/simulation/workforce.js';

for(const restored of [false,true])for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'normal'} ${profile.id} ${restored?'cold explicit':'selected21'} approach requires ordered acquisition, clock and exact installation`,async()=>{
 const f=await selectedApproachControl({restored,threaded,profile:profile.id});try{
  const p=f.prepare(),r=p.nativeIdleStroll,body=f.body(1),rng=f.state.rng,lease=f.c.admitStroll(r,{preparingWorldBoundary:p.worldBoundary});assert.equal(r.version,2);assert(lease.isPrepared());assert.equal(lease.isCurrent(),false);assert.equal(lease.routeRecord,null);
  if(restored){assert.equal(r.sourceRequest.version,2);assert.deepEqual(f.c.pendingIdleStrollRequest(f.actor),r.sourceRequest);}else{assert(f.next.approach);assert.deepEqual(f.c.pendingIdleCycleRequest(f.actor),f.next);assert(f.cycleLease.isCurrent());assert.equal(r.walkRemaining,f.next.idleState.remaining);}
  const b=f.commit(p);assert.equal(lease.isCurrent(),false);assert.equal(f.install(b),1);assert(lease.isCurrent());assert.equal(lease.executionEpoch,b.reference.worldBoundary.effectiveTime);assert.equal(lease.executionEnd,b.reference.endTime);assert.deepEqual(f.body(1),body);f.advance(.1);assert(lease.isCurrent());assert.notDeepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.worker.idleState.remaining,r.walkRemaining);
 }finally{await f.dispose();}
});

test('current cycle metadata without its admitted parent cannot prepare selected approach control',async()=>{
 const f=await selectedApproachControl({installCycle:false});try{const p=f.prepare();assert.throws(()=>f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary}),/obsolete|source/);assert.equal(f.planner.cancelNativeIdleStrollProposal(p.ticket),true);}finally{await f.dispose();}
});

for(const restored of [false,true])test(`${restored?'restored':'selected'} approach rejects a changed remaining before any installation`,async()=>{
 const f=await selectedApproachControl({restored});try{const p=f.prepare(),bad={...p.nativeIdleStroll,walkRemaining:p.nativeIdleStroll.walkRemaining+.01};if(restored)bad.sourceRequest={...bad.sourceRequest,walkRemaining:bad.walkRemaining};assert.throws(()=>f.c.admitStroll(bad,{preparingWorldBoundary:p.worldBoundary}),/obsolete|source/);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);}finally{await f.dispose();}
});

test('selected acquisition cannot become current before its direct event and causal watermark',async()=>{
 const f=await selectedApproachControl();try{const p=f.prepare(),lease=f.c.admitStroll(p.nativeIdleStroll,{preparingWorldBoundary:p.worldBoundary});f.pauseControl(true);f.pauseClock(true);const b=f.commit(p);assert.equal(lease.isCurrent(),false);assert.throws(()=>f.install(b));f.acceptEvents();assert.equal(lease.isCurrent(),false);assert.throws(()=>f.install(b));f.acceptLastClock();assert.equal(f.install(b),1);assert(lease.isCurrent());}finally{await f.dispose();}
});
