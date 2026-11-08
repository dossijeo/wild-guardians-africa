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

test('watering certificate requires effect preparation and quiet other effects, and rolls back atomically',()=>{
 const f=certificateFixture(),calls=[],effect={prepareHistoricalMotion:()=>({ok:true,watering:true,token:'water'}),startHistoricalMotion(_p,_s,token){calls.push(token);return true;},historicalMotionCurrent:()=>true,finishHistoricalMotion(){calls.push('finish');},abortHistoricalMotion(){calls.push('abort');},cancelHistoricalMotion(){calls.push('cancel');}};let quiet=false;
 Object.assign(f.actor,{historicalMotionCurrent:()=>true,finishHistoricalMotion(){calls.push('actor finish');},cancelHistoricalMotion(){calls.push('actor cancel');},abortHistoricalMotion(){calls.push('actor abort');}});
 const group=createConfirmedHistoricalMotionGroup({animals:f.actor,effects:effect,otherEffectsQuiet:()=>quiet,getSupport:()=>f.support,inputPolicy:'ordered-boundary'});assert.equal(group.certify(f.preview,f.current),null);quiet=true;const certified=group.certify(f.preview,f.current);assert.equal(certified.certificates.wateringSynchronized,true);assert.equal(group.start(certified),true);assert.equal(group.isCurrent(certified),true);quiet=false;assert.equal(group.isCurrent(certified),false);quiet=true;group.finish(certified);assert.deepEqual(calls,['water','finish','actor finish']);
 effect.startHistoricalMotion=()=>false;const retry=group.certify(f.preview,f.current);assert.equal(group.start(retry),false);assert.ok(calls.includes('actor cancel'));
});

test('combined work and combat publish both independent certificates',()=>{
 const f=certificateFixture(),effect={prepareHistoricalMotion:()=>({ok:true,working:true,combat:true,token:'mixed'}),startHistoricalMotion:(_p,_s,token)=>token==='mixed',historicalMotionCurrent:()=>true,finishHistoricalMotion(){},abortHistoricalMotion(){},cancelHistoricalMotion(){}};
 Object.assign(f.actor,{historicalMotionCurrent:()=>true,finishHistoricalMotion(){},cancelHistoricalMotion(){},abortHistoricalMotion(){}});
 const group=createConfirmedHistoricalMotionGroup({animals:f.actor,effects:effect,otherEffectsQuiet:()=>true,getSupport:()=>f.support,inputPolicy:'ordered-boundary'}),certified=group.certify(f.preview,f.current);
 assert.equal(certified.certificates.workSynchronized,true);assert.equal(certified.certificates.combatSynchronized,true);assert.equal(group.start(certified),true);assert.equal(group.isCurrent(certified),true);
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

test('event diagnostic marker reaches participants through the certificate copy',()=>{const f=certificateFixture();let observed=false;f.preview.historicalEventSlice=true;f.actor.prepareHistoricalMotion=value=>{observed=value.historicalEventSlice===true;return {ok:false,reason:'animal-participant'};};assert.equal(f.group.certify(f.preview,f.current),null);assert.equal(observed,true);});

test('start diagnostics distinguish changed support and participant start failures',()=>{const f=certificateFixture();let support=f.support;const group=createConfirmedHistoricalMotionGroup({animals:f.actor,getSupport:()=>support,inputPolicy:'ordered-boundary',diagnostics:true});let certified=group.certify(f.preview,f.current);support={...f.support};assert.equal(group.start(certified),false);assert.equal(group.lastRejection().reason,'start-support-changed');support=f.support;certified=group.certify(f.preview,f.current);f.actor.startHistoricalMotion=()=>false;assert.equal(group.start(certified),false);assert.equal(group.lastRejection().reason,'start-animals');});

test('group defers animal phase release until the matching confirmed boundary',()=>{
 const f=certificateFixture(),calls=[];Object.assign(f.actor,{historicalMotionCurrent:()=>true,finishHistoricalMotion(_p,options){calls.push(['finish',options]);},historicalBoundaryCommitted(p,options){calls.push(['commit',p,options]);}});const certified=f.group.certify(f.preview,f.current);assert.equal(f.group.start(certified),true);assert.equal(f.group.finish(certified,{continuation:true}),true);assert.deepEqual(calls,[['finish',{continuation:true,deferHandoff:true}]]);f.group.afterCommit(certified,{continuation:true});assert.deepEqual(calls[1],['commit',certified,{continuation:true}]);
});
