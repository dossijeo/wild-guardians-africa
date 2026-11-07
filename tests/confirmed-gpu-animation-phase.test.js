import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedGpuAnimationPhase} from '../src/rendering/confirmed-gpu-animation-phase.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {confirmedWalkingSamples} from '../src/rendering/confirmed-animation-samples.js';
test('confirmed phase follows sampled motion rather than clock speed and preserves pauses',()=>{
 const clock=createConfirmedPresentationClock(5),phase=createConfirmedGpuAnimationPhase({clock,maxSegments:2});try{phase.install([{at:5,phase:2},{at:6,phase:2},{at:7,phase:4}],{start:5,end:7});clock.commit(5.5);assert.equal(phase.sample(),2);clock.commit(6.5);assert.ok(phase.sample()>2.99&&phase.sample()<=3);assert.throws(()=>phase.install([{at:5,phase:3},{at:7,phase:2}],{start:5,end:7}),/segment/);assert.ok(phase.sample()>2.99);phase.reset();assert.equal(phase.status().installed,null);}finally{phase.dispose();clock.dispose();}
});
test('walking samples reject physical and action transitions and require exact initial phase',()=>{
 const samples=[{at:5,status:'walking',motionPhase:0},{at:6,status:'walking',motionPhase:1}],preview={start:5,end:6,trace:{actorTickStates:{complete:true,actors:[{actorId:'a',samples}]}}};
 assert.deepEqual(confirmedWalkingSamples(preview,'a','animal',{status:'walking',motionPhase:0}),[{at:5,phase:0},{at:6,phase:1}]);samples[1].status='attacking';assert.equal(confirmedWalkingSamples(preview,'a','animal',{status:'walking',motionPhase:0}),null);samples[1].status='walking';samples[1].recovery=true;assert.equal(confirmedWalkingSamples(preview,'a','animal',{status:'walking',motionPhase:0}),null);samples[1].recovery=false;assert.equal(confirmedWalkingSamples(preview,'a','animal',{status:'walking',motionPhase:.1}),null);
});


test('confirmed animation stops at its horizon and holds immediately on cancellation',()=>{
 const clock=createConfirmedPresentationClock(5),phase=createConfirmedGpuAnimationPhase({clock,maxSegments:2});try{
  phase.install([{at:5,phase:0},{at:6,phase:1}],{start:5,end:6});clock.commit(5.5);const held=phase.hold();assert.ok(held>0&&held<.5);clock.commit(6);assert.equal(phase.sample(),held);phase.reset();
  phase.install([{at:5,phase:0},{at:6,phase:1}],{start:5,end:6});assert.ok(phase.sample()<=1);clock.commit(7);assert.ok(phase.sample()<=1);assert.ok(phase.sample()>.999);phase.reset();assert.equal(phase.status().installed,null);
 }finally{phase.dispose();clock.dispose();}
});
