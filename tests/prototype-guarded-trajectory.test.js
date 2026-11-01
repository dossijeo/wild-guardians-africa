import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardedTrajectory} from '../tools/trees/prototype_guarded_trajectory.mjs';
const route=()=>({session:'world',actorId:'animal',version:1,worldVersion:1,kind:'trajectory',startTime:0,points:[{x:0,z:0},{x:1.4,z:0}],durations:[3.5],movementMode:'walk',animationState:'walk'});
test('world change stops confirmed trajectory and rejects old world instruction',()=>{
 const gate=createGuardedTrajectory('world','animal',{worldVersion:1});assert.equal(gate.install(route(),0).accepted,true);gate.presented(1);
 assert.equal(gate.invalidate({worldVersion:2,at:1,point:{x:.4,z:0},version:2},1).accepted,true);
 assert.equal(gate.sample(3).x,.4);assert.equal(gate.install({...route(),version:3},1).reason,'world');
});
test('invalid event or unrecorded presentation suspends the trajectory',()=>{
 for(const [version,presentedAt] of [[0,1],[2,2]]){
  const gate=createGuardedTrajectory('world','animal',{worldVersion:1});gate.install(route(),0);gate.presented(1);
  assert.throws(()=>gate.invalidate({worldVersion:2,at:1,point:{x:.4,z:0},version},presentedAt));assert.equal(gate.sample(2),null);
 }
});
test('retroactive or inconsistent stops fail closed',()=>{
 for(const [at,point,reason] of [[.5,{x:.2,z:0},'reconciliation'],[1,{x:.9,z:0},'position']]){
  const gate=createGuardedTrajectory('world','animal',{worldVersion:1});gate.install(route(),0);gate.presented(1);
  assert.deepEqual(gate.invalidate({worldVersion:2,at,point,version:2},1),{accepted:false,reason,hide:true});assert.equal(gate.sample(2),null);
 }
});
