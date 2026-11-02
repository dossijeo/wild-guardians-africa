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

test('replacement cannot silently jump from the confirmed presentation',()=>{
 const gate=createGuardedTrajectory('world','animal',{worldVersion:1});assert.equal(gate.install(route(),0).accepted,true);gate.presented(1);
 const replacement={...route(),version:2,startTime:1,points:[{x:2,z:0},{x:3,z:0}]};
 assert.deepEqual(gate.install(replacement,1),{accepted:false,reason:'position',hide:true});assert.equal(gate.sample(1),null);assert.equal(gate.install({...route(),version:3},1).reason,'reconciliation');
});
test('continuous replacement preserves monotonic version and endpoint',()=>{
 const gate=createGuardedTrajectory('world','animal',{worldVersion:1});gate.install(route(),0);gate.presented(1);
 const replacement={...route(),version:2,startTime:1,points:[{x:.4,z:0},{x:2,z:0}]};assert.equal(gate.install(replacement,1).accepted,true);assert.equal(gate.sample(1).x,.4);assert.equal(gate.sample(20).x,2);assert.equal(gate.install({...replacement,version:1},1).reason,'stale');
});

test('obsolete discontinuous packets are discarded without suspending the current route',()=>{
 const gate=createGuardedTrajectory('world','animal',{worldVersion:1});gate.install(route(),0);gate.presented(1);
 const stale={...route(),version:1,startTime:1,points:[{x:99,z:0},{x:100,z:0}]};assert.equal(gate.install(stale,1).reason,'stale');assert.ok(Math.abs(gate.sample(1).x-.4)<1e-12);
});

test('new instructions for another instant require explicit reconciliation',()=>{
 for(const at of [.5,1.5]){
  const gate=createGuardedTrajectory('world','animal',{worldVersion:1});gate.install(route(),0);gate.presented(1);
  const replacement={...route(),version:2,startTime:at,points:[{x:.4*at,z:0},{x:2,z:0}]};
  assert.deepEqual(gate.install(replacement,at),{accepted:false,reason:'reconciliation',hide:true});assert.equal(gate.sample(1),null);
 }
});
test('obsolete instructions for an earlier instant do not force reconciliation',()=>{
 const gate=createGuardedTrajectory('world','animal',{worldVersion:1});gate.install(route(),0);gate.presented(1);
 assert.equal(gate.install({...route(),version:1},.5).reason,'stale');assert.ok(Math.abs(gate.sample(1).x-.4)<1e-12);
});
