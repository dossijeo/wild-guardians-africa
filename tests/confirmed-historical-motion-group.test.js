import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedHistoricalMotionGroup} from '../src/rendering/confirmed-historical-motion-group.js';
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
