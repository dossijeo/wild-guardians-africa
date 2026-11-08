import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';

const candidate=()=>({sequence:1,start:10,end:13,safeForAutonomousPlayback:true,reasons:[],clockSegments:{version:1,start:10,end:13,startPauses:[],endPauses:[],complete:true,segments:[{start:10,end:11,realDuration:1,rate:1},{start:11,end:13,realDuration:.4,rate:5}]}});
const interval=(sequence,start,end)=>({sequence,start,end,safeForAutonomousPlayback:true,reasons:[],clockSegments:{version:1,start,end,startPauses:[],endPauses:[],complete:true,segments:[{start,end,realDuration:end-start,rate:1}]}});

test('ordered non-autonomous commits retain confirmed wall time including zero-time publications',()=>{
 let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now});clock.begin(interval(1,0,.1));now=220;clock.advance();clock.commit(.1);
 now=250;clock.commit(.2,{unpaused:true,clockSegments:interval(2,.1,.2).clockSegments});
 now=270;clock.commit(.2,{unpaused:true,clockSegments:null});
 now=280;clock.begin(interval(4,.2,.3));assert.ok(Math.abs(clock.advance()-.28)<1e-10);now=500;assert.equal(clock.advance(),.3);clock.commit(.3);clock.dispose();
});

test('confirmed discontinuities cannot carry wall time through a pause or unknown rate',()=>{
 for(const continuity of [{unpaused:false,clockSegments:null},{unpaused:true,clockSegments:null}]){
  let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now});clock.begin(interval(1,0,.1));now=1000;clock.advance();clock.commit(.1);clock.commit(.2,continuity);clock.begin(interval(3,.2,.3));assert.equal(clock.advance(),.2);clock.dispose();
 }
});

test('fallback continuity uses confirmed rate changes and rejects mismatched intervals',()=>{
 let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now});clock.begin(interval(1,0,.1));now=250;clock.advance();clock.commit(.1);
 const segments={version:1,start:.1,end:.6,startPauses:[],endPauses:[],complete:true,segments:[{start:.1,end:.6,realDuration:.1,rate:5}]};
 assert.throws(()=>clock.commit(.7,{unpaused:true,clockSegments:segments}));assert.equal(clock.elapsed,.1);
 clock.commit(.6,{unpaused:true,clockSegments:segments});clock.begin(interval(3,.6,.7));assert.ok(Math.abs(clock.advance()-.65)<1e-10);clock.dispose();
});
test('confirmed intervals share one wall timeline instead of accumulating frame rounding and preparation time',()=>{
 let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now});
 clock.begin(interval(1,0,.1));now=165;assert.equal(clock.advance(),.1);clock.commitBoundary(1,.1);
 now=185;clock.begin(interval(2,.1,.2));assert.ok(Math.abs(clock.advance()-.185)<1e-10);
 now=350;assert.equal(clock.advance(),.2);clock.commitBoundary(2,.2);
 clock.begin(interval(3,.2,.3));assert.equal(clock.advance(),.3);clock.commitBoundary(3,.3);
 clock.begin(interval(4,.3,.4));assert.ok(Math.abs(clock.advance()-.35)<1e-10);
 assert.throws(()=>clock.commitBoundary(4,.4),/not complete/);clock.dispose();
});
test('explicit suspension excludes hidden time and fallback resets the timeline anchor',()=>{
 let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now});clock.begin(interval(1,0,.1));now=50;clock.suspend();now=10050;clock.resume();now=10125;assert.equal(clock.advance(),.1);clock.commitBoundary(1,.1);clock.begin(interval(2,.1,.2));assert.ok(Math.abs(clock.advance()-.125)<1e-10);clock.abandonForBoundary(interval(2,.1,.2));clock.syncCommitted(2,.2);now=20000;clock.begin(interval(3,.2,.3));assert.equal(clock.advance(),.2);clock.dispose();
});
test('visibility between certified publications can explicitly reset continuity',()=>{let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now});clock.begin(interval(1,0,.1));assert.throws(()=>clock.resetContinuity(),/active/);now=150;clock.advance();clock.commitBoundary(1,.1);clock.resetContinuity();now=10000;clock.begin(interval(2,.1,.2));assert.equal(clock.advance(),.1);clock.dispose();});
test('sublimits cannot be crossed before release and preserve elapsed frame time',()=>{let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>now});try{clock.begin(candidate());now=1200;assert.equal(clock.advanceUntil(10.5),10.5);assert.equal(clock.advance(),10.5);assert.throws(()=>clock.advanceUntil(11),/limit/);assert.throws(()=>clock.releaseLimit(11),/not reached/);clock.releaseLimit(10.5);assert.equal(clock.advanceUntil(11),11);clock.releaseLimit(11);assert.ok(Math.abs(clock.advance()-12)<1e-8);now=1400;assert.equal(clock.advance(),13);clock.commitBoundary(1,13);}finally{clock.dispose();}});
test('the shared presentation clock commits once and cannot jump over a partial GPU interval',()=>{
 let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>now});
 try{clock.begin(candidate());now=500;clock.advance();assert.equal(clock.elapsed,10.5);assert.equal(clock.node.value,10.5);assert.throws(()=>clock.commit(13),/not complete/);now=1400;clock.advance();clock.commit(13);assert.equal(clock.status().sequence,1);assert.equal(clock.status().active,null);clock.commit(13);assert.equal(clock.status().sequence,2);clock.commit(14);assert.equal(clock.elapsed,14);assert.equal(clock.motionNode.value,4);}finally{clock.dispose();}
});
test('historical clock follows confirmed mixed-rate segments and clamps at their endpoint',()=>{let now=1000;const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>now});try{assert.equal(clock.begin(candidate()),true);now=1500;assert.equal(clock.advance(),10.5);now=2000;assert.equal(clock.advance(),11);now=2200;assert.ok(Math.abs(clock.advance()-12)<1e-8);now=9000;assert.equal(clock.advance(),13);assert.equal(clock.node.value,13);assert.equal(clock.commitBoundary(1,13),true);assert.equal(clock.status().sequence,1);}finally{clock.dispose();}});
test('pause holds the visual clock and invalidation prohibits committing a partial boundary',()=>{let now=0;const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>now});try{clock.begin(candidate());now=250;clock.suspend();const held=clock.elapsed;now=10000;assert.equal(clock.advance(),held);clock.resume();now=10250;assert.equal(clock.advance(),10.5);clock.invalidate();now=20000;assert.equal(clock.advance(),10.5);assert.throws(()=>clock.commitBoundary(1,13),/not complete/);assert.throws(()=>clock.resume(),/cannot resume/);}finally{clock.dispose();}});
test('clock rejects observations, pauses, events and malformed time maps before starting',()=>{const clock=createConfirmedHistoricalClock({initialElapsed:10,now:()=>0}),bad=candidate();try{assert.throws(()=>clock.begin({...bad,safeForAutonomousPlayback:false}),/Uncertified/);assert.throws(()=>clock.begin({...bad,reasons:['events']}),/Uncertified/);assert.throws(()=>clock.begin({...bad,clockSegments:{...bad.clockSegments,endPauses:['menu']}}),/Uncertified/);assert.throws(()=>clock.begin({...bad,clockSegments:{...bad.clockSegments,segments:[{...bad.clockSegments.segments[0],rate:5}]}}),/clock segment/);assert.equal(clock.elapsed,10);assert.equal(clock.status().active,null);}finally{clock.dispose();}});
