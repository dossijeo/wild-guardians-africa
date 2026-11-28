import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedGpuPhasePool} from '../src/rendering/confirmed-gpu-phase-pool.js';
import {createConfirmedGpuAnimationPhase} from '../src/rendering/confirmed-gpu-animation-phase.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';

test('pooled phases preserve independent samples, holds and resource lifetimes',()=>{
 const deleted=[],renderer={backend:{isWebGPUBackend:true},_attributes:{delete:item=>deleted.push(item)}},clock=createConfirmedPresentationClock(5),pool=createConfirmedGpuPhasePool({renderer,clock,maxSegments:2,capacity:2}),a=createConfirmedGpuAnimationPhase({clock,maxSegments:2,pool}),b=createConfirmedGpuAnimationPhase({clock,maxSegments:2,pool}),fallback=createConfirmedGpuAnimationPhase({clock,maxSegments:2,pool});
 try{assert.equal(a.sharedKey,pool);assert.equal(b.sharedKey,pool);assert.ok(a.node?.isNode);assert.equal(a.node,b.node);assert.equal(fallback.sharedKey,null);assert.notEqual(a.objectState.slot,b.objectState.slot);a.install([{at:5,phase:1,exitRemaining:.2},{at:5.05,phase:1.1,exitRemaining:.15}],{start:5,end:5.05});b.install([{at:5,phase:3},{at:5.05,phase:3.2}],{start:5,end:5.05});clock.commit(5.025);const first=a.sample(),second=b.sample(),exit=a.sampleExit(),held=a.hold();assert.equal(first,held);assert.ok(second>3.09);assert.ok(exit>.1749&&exit<.1751);clock.commit(5.05);assert.equal(a.sample(),held);assert.equal(a.sampleExit(),exit);assert.ok(b.sample()>3.19);assert.equal(a.objectState.count,0);assert.equal(b.objectState.count,1);pool.dispose();assert.equal(deleted.length,0);a.dispose();assert.equal(deleted.length,0);b.dispose();assert.equal(deleted.length,1);}
 finally{a.dispose();b.dispose();fallback.dispose();pool.dispose();clock.dispose();}
});
