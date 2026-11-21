import test from 'node:test';
import assert from 'node:assert/strict';
import {PROFILES} from '../src/simulation/workforce.js';
import {selectedApproachGame} from './helpers/native-idle-selected-approach-game.js';
import {prepareNativeIdleSelectedApproachRestorationCheckpoint} from './browser/native-idle-selected-approach-restoration-checkpoint.js';

for(const threaded of [false,true])for(const profile of PROFILES)test(`actual selected approach checkpoint saves into fresh explicit request: ${profile.id}/${threaded?'pthread':'normal'}`,async()=>{
 const f=await selectedApproachGame({profile:profile.id,threaded,retry:0});let fresh;
 try{
  const source=prepareNativeIdleSelectedApproachRestorationCheckpoint({state:f.state,planner:f.planner,w:f.w,core:f.session.core,commit:paused=>assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock({paused,rate:1}).status))});
  assert.equal(source.cycles.length,2);assert.equal(source.cycles[0].next.idleState.mode,'rest');assert.equal(source.cycles[1].next.approach,true);
  assert.equal(source.binding.reference.version,2);assert.equal(source.binding.reference.walkRemaining,source.next.idleState.remaining);assert.notEqual(source.binding.reference.walkRemaining,source.request.idleSeconds*2);
  const saved=f.save();assert.equal(saved.state.workers[0].idleState.mode,'walk');for(const tag of ['native-idle-stroll-reference','native-idle-cycle-reference','native-idle-stroll-request-reference','expectedRouteHandle'])assert.equal(JSON.stringify(saved.state).includes(tag),false);
  fresh=await selectedApproachGame({profile:profile.id,threaded,saved});const request=fresh.planner.nativeIdleStrollRequestReference(fresh.actor);
  assert.equal(request.version,2);assert.equal(request.walkRemaining,source.binding.reference.walkRemaining);assert.equal(request.walkRng,f.worker.idleState.rng);assert.notEqual(request.authorityEpoch,source.binding.reference.worldBoundary.authorityEpoch);
  assert.equal(fresh.planner.nativeIdleStrollBinding(fresh.actor),null);assert.equal(fresh.planner.nativeIdleCycleBinding(fresh.actor),null);assert.equal(fresh.planner.nativeInitialIdleBodyBinding(fresh.actor),null);assert.equal(fresh.worker.nativeRouteAdmission,'pending-stroll-resources');
 }finally{await fresh?.dispose();await f.dispose();}
});
