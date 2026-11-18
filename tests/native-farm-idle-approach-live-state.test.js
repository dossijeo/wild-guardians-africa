import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmIdleApproachFixture as fixture} from './helpers/native-farm-idle-approach.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState,deserializeConfirmedState,prepareConfirmedStateTransport,confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';

for(const profile of PROFILES)test(`${profile.id} live actual approach transport and checkpoint preserve birth without granting cold execution`,()=>{
 const f=fixture({profile:profile.id,peer:false});try{
  const binding=f.commitApproach(f.prepareApproach()),before=f.body(1),rng=f.state.rng;
  for(const seconds of [0,.1,Math.max(0,binding.reference.endTime-f.state.elapsed)]){
   f.advance(seconds);const text=serializeConfirmedState(f.state),copy=deserializeConfirmedState(text),transport=prepareConfirmedStateTransport(f.state);
   assert.deepEqual(copy.workers[0],f.worker);assert.equal(transport.snapshot,text);assert.equal(copy.workers[0].destinationId,f.idleAnchor.id);assert.equal(copy.workers[0].idleState.remaining,f.birth.remaining);assert.equal(copy.workers[0].idleState.rng,f.birth.rng);
   assert.equal(confirmedStateSaveAvailable(f.state),false);assert.deepEqual(deserialize(serialize(f.state)).workers[0],f.worker);assert.deepEqual(deserialize(text).workers[0],f.worker);assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);
  }
  assert.notDeepEqual(f.body(1),before);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeIdleStrollBinding(f.actor).assignmentSequence,binding.assignmentSequence);
 }finally{f.close();}
});

for(const field of ['remaining','destination','pending'])test(`live approach transport rejects malformed ${field} without changing its native owner`,()=>{
 const f=fixture({peer:false});try{
  const binding=f.commitApproach(f.prepareApproach()),body=f.body(1);
  if(field==='remaining')f.worker.idleState.remaining=-1;
  else if(field==='destination')f.worker.destinationId='idle-'+f.worker.id;
  else {f.worker.nativeRouteAdmission='pending-stroll-resources';f.worker.idleState.remaining=0;f.worker.idleState.binding=binding;}
  assert.throws(()=>serializeConfirmedState(f.state),/Idle/);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.actor).assignmentSequence,binding.assignmentSequence);
 }finally{f.close();}
});

// Zero is valid semantic data after a retry knot. The existing native owner
// must still reject a different live value; transporting data grants no route.
test('semantic zero remaining can be transported but cannot replace the active Farm approach owner',()=>{
 const f=fixture({peer:false});try{
  const binding=f.commitApproach(f.prepareApproach()),body=f.body(1),worker=structuredClone(f.worker);assert.notEqual(binding.reference.sourceFarm.idleState.remaining,0);f.worker.idleState.remaining=0;
  const copy=deserializeConfirmedState(serializeConfirmedState(f.state));assert.equal(copy.workers[0].idleState.remaining,0);assert.throws(()=>f.planner.projectNativeIdleStroll(f.state,f.worker),/native owner/);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.actor).assignmentSequence,binding.assignmentSequence);Object.assign(f.worker,worker);assert(f.planner.projectNativeIdleStroll(f.state,f.worker));
 }finally{f.close();}
});
