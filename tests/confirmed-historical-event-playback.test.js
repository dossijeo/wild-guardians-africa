import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {beginHistoricalEventPlayback} from '../src/rendering/confirmed-historical-event-playback.js';

test('event playback stops at each subboundary and acknowledges once after ordered state hooks',()=>{
 let now=0,sequence=0,elapsed=0,finishes=0,acks=0;const seen=[],clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now}),eventBoundaries=[{at:.3,eventIds:['a']},{at:.6,eventIds:['b']}],preview={sequence:1,start:0,end:1,reasons:['events','visual-time-and-support-unverified'],eventBoundaries,trace:{},clockSegments:{version:1,start:0,end:1,startPauses:[],endPauses:[],complete:true,segments:[{start:0,end:1,realDuration:1,rate:1}]}};
 const stream={status:()=>({closed:false,sequence,lastElapsed:elapsed}),beginHistoricalEvents:()=>eventBoundaries,confirmHistoricalEventStart(){},advanceHistoricalEvent(){elapsed=eventBoundaries[seen.length].at;seen.push(clock.elapsed);},finishHistoricalEvents(){assert.equal(clock.elapsed,1);clock.commitBoundary(1,1);sequence=1;elapsed=1;acks++;return true;},cancelHistoricalEvents(){throw Error('unexpected cancellation');}};
 const playback={clock,certify:part=>({...part,reasons:[],safeForAutonomousPlayback:true}),canStart:()=>true,start:()=>true,isCurrent:()=>true,finish:()=>{finishes++;},abort(){}},slice=(_preview,start,end)=>({sequence:1,start,end,reasons:[...preview.reasons],trace:{start,end},clockSegments:{start,end}});
 try{const run=beginHistoricalEventPlayback({stream,playback,preview,current:stream.status(),slice});assert.ok(run);now=1000;assert.equal(run.advance(),true);assert.deepEqual(seen,[.3,.6]);assert.equal(finishes,3);assert.equal(acks,1);assert.equal(clock.status().sequence,1);assert.throws(()=>run.advance(),/closed/);}finally{clock.dispose();}
});

test('event playback waits at a committed subboundary until the next participant is ready',()=>{
 let now=0,elapsed=0,allow=false,started=0;const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now}),eventBoundaries=[{at:.5,eventIds:['a']}],preview={sequence:1,start:0,end:1,reasons:['events','visual-time-and-support-unverified'],eventBoundaries,trace:{},clockSegments:{version:1,start:0,end:1,startPauses:[],endPauses:[],complete:true,segments:[{start:0,end:1,realDuration:1,rate:1}]}};
 const stream={status:()=>({closed:false,sequence:0,lastElapsed:elapsed}),beginHistoricalEvents:()=>eventBoundaries,confirmHistoricalEventStart(){},advanceHistoricalEvent(){elapsed=.5;},finishHistoricalEvents(){clock.commitBoundary(1,1);return true;},cancelHistoricalEvents(){}};
 const playback={clock,certify:part=>part.start===.5&&!allow?null:{...part,reasons:[],safeForAutonomousPlayback:true},canStart:()=>true,start:()=>{started++;return true;},isCurrent:()=>true,finish(){},abort(){}},slice=(_preview,start,end)=>({sequence:1,start,end,reasons:[...preview.reasons],trace:{start,end},clockSegments:{start,end}});
 try{const run=beginHistoricalEventPlayback({stream,playback,preview,current:stream.status(),slice});now=750;assert.equal(run.advance(),false);assert.equal(clock.elapsed,.5);assert.equal(run.status().held,true);now=5000;assert.equal(run.advance(),false);assert.equal(clock.elapsed,.5);allow=true;assert.equal(run.advance(),false);assert.equal(started,2);assert.equal(clock.elapsed,.75);now=5250;assert.equal(run.advance(),true);}finally{clock.dispose();}
});
