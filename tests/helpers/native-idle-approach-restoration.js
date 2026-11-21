import assert from 'node:assert/strict';
import {nativeFarmIdleApproachFixture} from './native-farm-idle-approach.js';

// Saved Game semantics come from an actual23 ->22, never an authored WALK.
export function savedNativeIdleApproach({profile='youngMale',position='outside'}={}){
 // Keep the selected service-side anchor; do not replace an unusable saved
 // fractional start with a more convenient position or a local WALK target.
 const old=nativeFarmIdleApproachFixture({profile,peer:false,offset:-2});try{
  const binding=old.commitApproach(old.prepareApproach()),duration=binding.reference.endTime-old.state.elapsed;
  old.advance(position==='arrived'?duration+.05:position==='inside'?duration*.8:.05);
  const execution=old.planner.nativeIdleStrollExecution(old.actor),distance=Math.hypot(old.worker.x-old.idleAnchor.x,old.worker.z-old.idleAnchor.z);
  assert.equal(execution.arrived,position==='arrived');assert.equal(distance<=old.idleAnchor.idleRadius,position!=='outside');
  const state=structuredClone(old.state);if(!execution.arrived)old.advance(binding.reference.endTime-old.state.elapsed+.05);
  return {state,reference:binding.reference,assignmentSequence:binding.assignmentSequence,desiredRest:old.planner.nativeIdleStrollExecution(old.actor).desiredRest};
 }finally{old.close();}
}
