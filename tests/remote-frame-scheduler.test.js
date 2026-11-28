import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleRemoteFrame} from '../src/rendering/remote-frame-scheduler.js';
import {evaluateRemoteClock} from '../src/rendering/remote-presentation-clock.js';

const packet=(start,end,anchor=0,rate=1)=>({preparedInterval:{start,end},clock:{version:1,epoch:0,elapsed:start,safeUntil:end,anchorAbsoluteMs:anchor,paused:false,segments:[{start,end,rate,realDuration:(end-start)/rate}]}});
test('prepared successor waits for the displayed interval and inherits its origin without frame rounding drift',()=>{
 let previous=scheduleRemoteFrame({metadata:packet(0,.1),receivedAt:1000,now:1000}).metadata;
 for(let i=1;i<20;i++){
  const start=i/10,end=(i+1)/10,receivedAt=1000+i*100-30;
  assert.equal(scheduleRemoteFrame({metadata:packet(start,end),previousMetadata:previous,receivedAt,now:receivedAt}).ready,false);
  const result=scheduleRemoteFrame({metadata:packet(start,end),previousMetadata:previous,receivedAt,now:1000+i*100+5});
  assert.equal(result.ready,true);assert.ok(Math.abs(result.metadata.clock.anchorAbsoluteMs-(1000+i*100))<1e-8);
  previous=result.metadata;
 }
});
test('late preparation holds the safe endpoint and never jumps through the missed interval',()=>{
 const previous=packet(0,1,1000),result=scheduleRemoteFrame({metadata:packet(1,2),previousMetadata:previous,receivedAt:2300,now:2310});
 assert.equal(result.metadata.clock.anchorAbsoluteMs,2300);
 assert.equal(evaluateRemoteClock(previous.clock,2300),1);
 assert.ok(Math.abs(evaluateRemoteClock(result.metadata.clock,2310)-1.01)<1e-9);
});
test('a confirmed discrete boundary cannot preempt a still executing certified interval',()=>{
 const previous=packet(2,3,5000),metadata={clock:{...packet(3,4).clock,elapsed:3,safeUntil:3,paused:true,segments:[]}};
 assert.equal(scheduleRemoteFrame({metadata,previousMetadata:previous,receivedAt:5500,now:5600}).ready,false);
 assert.equal(scheduleRemoteFrame({metadata,previousMetadata:previous,receivedAt:5500,now:6000}).metadata,metadata);
});
test('rates are simulation rates and a frozen lease cannot pretend to be autonomous',()=>{
 const previous=packet(0,1,1000,2);
 assert.equal(scheduleRemoteFrame({metadata:packet(1,2),previousMetadata:previous,receivedAt:1400,now:1499}).ready,false);
 assert.equal(scheduleRemoteFrame({metadata:packet(1,2),previousMetadata:previous,receivedAt:1400,now:1500}).metadata.clock.anchorAbsoluteMs,1500);
 const invalid=packet(1,2);invalid.clock.paused=true;
 assert.throws(()=>scheduleRemoteFrame({metadata:invalid,receivedAt:0,now:0}),/complete autonomous/);
});
