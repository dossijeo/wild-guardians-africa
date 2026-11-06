import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedHistoricalMotionGroup} from '../src/rendering/confirmed-historical-motion-group.js';

function certificateFixture(){
 let valid=true,preparedCount=0;const start=5,end=5.05,support={sequence:1,start,end,valid:()=>valid,actors:[]},current={sequence:0,lastElapsed:start,closed:false};
 const actor={historicalActorIds:()=>['a'],prepareHistoricalMotion:()=>{preparedCount++;return {ok:true,token:{}};},startHistoricalMotion:()=>true};
 const preview={sequence:1,start,end,safeForAutonomousPlayback:false,reasons:['visual-time-and-support-unverified'],trace:{actors:[{actorId:'a'}],spatialEvidence:{},separationEvidence:{},physicsActivity:{samplesComplete:true,observed:false},actorTickStates:{complete:true}},clockSegments:{version:1,start,end,startPauses:[],endPauses:[],complete:true,segments:[{start,end,realDuration:.05,rate:1}]}};
 return {actor,preview,current,support,invalidate(){valid=false;},preparedCount:()=>preparedCount,group:createConfirmedHistoricalMotionGroup({animals:actor,getSupport:()=>support,inputPolicy:'ordered-boundary'})};
}

test('real certifier closes presentation proof and reuses prepared tokens without mutating the observation',()=>{
 const f=certificateFixture(),before=structuredClone(f.preview),certified=f.group.certify(f.preview,f.current);
 assert.equal(certified.safeForAutonomousPlayback,true);assert.deepEqual(certified.certificates.actorIds,['a']);assert.deepEqual(f.preview,before);
 assert.equal(f.group.canStart(certified),true);assert.equal(f.group.start(certified),true);assert.equal(f.preparedCount(),1);assert.equal(f.group.canStart(certified),false);
});

test('certifier rejects missing evidence, event barriers, excessive handoff latency and stale resources',()=>{
 for(const mutate of [f=>f.preview.reasons.push('events'),f=>delete f.preview.trace.separationEvidence,f=>f.preview.trace.physicsActivity.observed=true,f=>f.preview.clockSegments.segments[0].realDuration=.2,f=>f.preview.clockSegments.segments[0].rate=5,f=>f.current.sequence=1,f=>f.invalidate(),f=>f.actor.prepareHistoricalMotion=()=>({ok:false})]){
  const f=certificateFixture();mutate(f);assert.equal(f.group.certify(f.preview,f.current),null);
 }
 const f=certificateFixture(),result=f.group.certify(f.preview,f.current);f.invalidate();assert.equal(f.group.canStart(result),false);
 assert.equal(createConfirmedHistoricalMotionGroup({animals:f.actor,getSupport:()=>f.support}).certify(f.preview,f.current),null);
});
test('a worker rejection or exception cancels the already installed animals before the clock advances',()=>{
 const events=[],preview={trace:{actors:[{actorId:'a'},{actorId:'w'}]}},support={},animals={historicalActorIds:()=>['a'],startHistoricalMotion(){events.push('animal start');return true;},cancelHistoricalMotion(){events.push('animal rollback');}},workers={historicalActorIds:()=>['w'],startHistoricalMotion(){events.push('worker start');return false;},cancelHistoricalMotion(){events.push('worker rollback');}},group=createConfirmedHistoricalMotionGroup({animals,workers,getSupport:()=>support});
 assert.equal(group.start(preview),false);assert.deepEqual(events,['animal start','worker start','animal rollback']);events.length=0;
 workers.startHistoricalMotion=()=>{events.push('worker start');throw Error('failed');};assert.throws(()=>group.start(preview),/failed/);assert.deepEqual(events,['animal start','worker start','animal rollback','worker rollback']);
});
test('missing worker animation is rejected before mutating the animal roster',()=>{
 let starts=0;const animals={historicalActorIds:()=>['a'],startHistoricalMotion(){starts++;return true;}},workers={historicalActorIds:()=>['w'],prepareHistoricalMotion(){return {ok:false,reason:'worker-animation',actorId:'w'};},startHistoricalMotion(){throw Error('must not start');}},group=createConfirmedHistoricalMotionGroup({animals,workers,getSupport:()=>({})});assert.equal(group.start({trace:{actors:[{actorId:'a'},{actorId:'w'}]}}),false);assert.equal(starts,0);
});
test('the complete actor roster must match the trace before any rig starts',()=>{
 let starts=0;const animals={historicalActorIds:()=>['a'],startHistoricalMotion(){starts++;return true;}},workers={historicalActorIds:()=>['w'],startHistoricalMotion(){starts++;return true;}},group=createConfirmedHistoricalMotionGroup({animals,workers,getSupport:()=>({})});
 for(const actors of [[{actorId:'a'}],[{actorId:'a'},{actorId:'a'}],[{actorId:'a'},{actorId:'w'},{actorId:'x'}]])assert.equal(group.start({trace:{actors}}),false);assert.equal(starts,0);
});
