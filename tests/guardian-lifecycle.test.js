import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {GuardianLifecycle} from '../src/ui/guardian-lifecycle.js';
import {guardianPose} from '../src/ui/guardian-native.js';
const source=readFileSync(new URL('../references/extracted/Guardian_Tutorial_V8_Avatar_y_Manos_3D/script-0.js',import.meta.url),'utf8');
test('Lifecycle preserves original transition timings in both motion modes',()=>{
  const declaration=source.match(/const TRANSITION=([^;]+);/)[0];
  for(const reduced of [false,true]){
    const context=vm.createContext({reducedMotion:reduced});vm.runInContext(declaration+'this.native=TRANSITION;',context);
    assert.deepEqual(new GuardianLifecycle(reduced).durations,{...context.native});
  }
});
test('Entrance leads to reading and rest without closing or advancing text',()=>{
  const flow=new GuardianLifecycle();flow.open();assert.equal(flow.sample('reveal',5).state,'enter');
  flow.advance(.81,5);assert.equal(flow.phase,'intro');flow.advance(.01,5);assert.equal(flow.phase,'reading');
  flow.advance(5,5);assert.equal(flow.phase,'rest');flow.advance(1000,5);assert.equal(flow.phase,'rest');
  assert.equal(flow.sample('reveal',5).state,'idle');
});
test('Closing performs farewell and native exit, repeated hide calls do not restart it',()=>{
  const flow=new GuardianLifecycle();flow.open();flow.advance(1,5);flow.finish();
  flow.advance(.4,5);flow.finish();assert.equal(flow.age,.4);
  flow.advance(.32,5);assert.equal(flow.phase,'outro');assert.equal(flow.sample('speak',5).state,'exit');
  flow.advance(.89,5);flow.finish();assert.equal(flow.phase,'outro');flow.advance(.01,5);assert.equal(flow.phase,'closed');
});
test('New message cancels withdrawal and cannot be closed by a stale transition',()=>{
  const flow=new GuardianLifecycle();flow.open();flow.finish();flow.advance(.72,5);flow.open();
  assert.equal(flow.phase,'intro');flow.advance(.82,5);assert.equal(flow.phase,'reading');
  flow.advance(.9,5);assert.equal(flow.phase,'reading');flow.open();assert.equal(flow.phase,'changing');
  flow.advance(.16,5);assert.equal(flow.phase,'reading');flow.close();assert.equal(flow.phase,'closed');
});
test('Reduced motion still has explicit entry and exit and native neutral poses',()=>{
  const flow=new GuardianLifecycle(true);flow.open();flow.advance(.22,5);assert.equal(flow.phase,'reading');
  flow.finish();flow.advance(0,5);assert.equal(flow.phase,'outro');flow.advance(.24,5);assert.equal(flow.phase,'closed');
  for(const state of ['enter','exit'])for(const age of [0,.2,.7]){
    const pose=guardianPose(state,age,.9,11);
    for(const axis of ['roll','yaw','pitch','lift','zoom','headX','headY','bodyX','bodyRoll'])assert.equal(pose[axis],0);
  }
});
