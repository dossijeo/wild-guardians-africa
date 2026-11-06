import test from 'node:test';
import assert from 'node:assert/strict';
import {createConfirmedHistoricalMotionGroup} from '../src/rendering/confirmed-historical-motion-group.js';
test('a worker rejection or exception cancels the already installed animals before the clock advances',()=>{
 const events=[],preview={},support={},animals={startHistoricalMotion(){events.push('animal start');return true;},cancelHistoricalMotion(){events.push('animal rollback');}},workers={startHistoricalMotion(){events.push('worker start');return false;},cancelHistoricalMotion(){events.push('worker rollback');}},group=createConfirmedHistoricalMotionGroup({animals,workers,getSupport:()=>support});
 assert.equal(group.start(preview),false);assert.deepEqual(events,['animal start','worker start','animal rollback']);events.length=0;
 workers.startHistoricalMotion=()=>{events.push('worker start');throw Error('failed');};assert.throws(()=>group.start(preview),/failed/);assert.deepEqual(events,['animal start','worker start','animal rollback','worker rollback']);
});
