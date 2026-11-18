import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFarmIdleApproachFixture as fixture} from './helpers/native-farm-idle-approach.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState,deserializeConfirmedState,prepareConfirmedStateTransport,confirmedStateSaveAvailable} from '../src/simulation/confirmed-live-state.js';

for(const profile of PROFILES)test(`${profile.id} live actual approach transport preserves its semantic birth without granting cold restoration`,()=>{
 const f=fixture({profile:profile.id,peer:false});try{
  const binding=f.commitApproach(f.prepareApproach()),before=f.body(1),rng=f.state.rng;
  for(const seconds of [0,.1,Math.max(0,binding.reference.endTime-f.state.elapsed)]){
   f.advance(seconds);const text=serializeConfirmedState(f.state),copy=deserializeConfirmedState(text),transport=prepareConfirmedStateTransport(f.state);
   assert.deepEqual(copy.workers[0],f.worker);assert.equal(transport.snapshot,text);assert.equal(copy.workers[0].destinationId,f.idleAnchor.id);assert.equal(copy.workers[0].idleState.remaining,f.birth.remaining);assert.equal(copy.workers[0].idleState.rng,f.birth.rng);
   assert.equal(confirmedStateSaveAvailable(f.state),false);assert.throws(()=>serialize(f.state),/approach restoration/);assert.throws(()=>deserialize(text),/approach restoration/);
  }
  assert.notDeepEqual(f.body(1),before);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeIdleStrollBinding(f.actor).assignmentSequence,binding.assignmentSequence);
 }finally{f.close();}
});

for(const field of ['remaining','destination','pending'])test(`live approach transport rejects malformed ${field} without changing its native owner`,()=>{
 const f=fixture({peer:false});try{
  const binding=f.commitApproach(f.prepareApproach()),body=f.body(1);
  if(field==='remaining')f.worker.idleState.remaining=0;
  else if(field==='destination')f.worker.destinationId='idle-'+f.worker.id;
  else f.worker.nativeRouteAdmission='pending-stroll-resources';
  assert.throws(()=>serializeConfirmedState(f.state),/Idle/);assert.deepEqual(f.body(1),body);assert.equal(f.planner.nativeIdleStrollBinding(f.actor).assignmentSequence,binding.assignmentSequence);
 }finally{f.close();}
});
