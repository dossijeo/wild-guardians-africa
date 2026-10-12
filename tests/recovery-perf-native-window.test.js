import test from 'node:test';
import assert from 'node:assert/strict';
import {technicalWindowRun} from '../tools/check-recovery-perf-native-window.mjs';
test('window preserves configured policy/horizon and records the last row before stopping',async()=>{
 const observed=[],options={days:100,strategy:'good',seed:123,onDay:r=>observed.push(r.day)};
 const run=technicalWindowRun(async actual=>{
  assert.equal(actual.days,100);assert.equal(actual.strategy,'good');assert.equal(actual.seed,123);
  for(let day=1;day<=10;day++)actual.onDay({day});
 },7);
 await assert.rejects(run(options),error=>error.code==='NATIVE_CALIBRATION_STOP');
 assert.deepEqual(observed,[1,2,3,4,5,6,7]);assert.equal(options.days,100);
});
test('technical errors propagate; invalid observation windows never run',async()=>{
 const error=Error('technical failure');await assert.rejects(technicalWindowRun(async()=>{throw error;},1)({}),e=>e===error);
 for(const value of [0,22,1.5,NaN,undefined])assert.throws(()=>technicalWindowRun(()=>{},value));
});
