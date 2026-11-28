import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedApproachGame} from './helpers/native-idle-selected-approach-game.js';
import {prepareNativeInitialIdleOutsideRestorationCheckpoint} from './browser/native-initial-idle-outside-restoration-checkpoint.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {serialize} from '../src/persistence/snapshots.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`Surface source ${mode}/${profile.id}/${threaded?'pthread':'normal'} saves an actual exterior phase and reloads a new20 request without old permissions`,async()=>{
 const f=await selectedApproachGame({profile:profile.id,threaded});let restored;
 try{
  const body=f.body(1),rng=f.state.rng,commit=()=>{assert(['committed','unchanged'].includes(f.planner.commitNativeCausalClock().status));},source=prepareNativeInitialIdleOutsideRestorationCheckpoint({state:f.state,planner:f.planner,w:f.w,core:f.session.core,commit,mode});assert.equal(source.execution.idleState.mode,mode);assert(source.attempts>=1&&source.attempts<=64);assert.deepEqual(source.phase,f.worker.idleState);assert.equal(source.sourceCycle.reference.sourceBody.kind,'native-idle-stroll-failed-source');assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);const saved=f.save();for(const tag of ['native-idle-cycle-reference','native-idle-stroll-reference','expectedRouteHandle'])assert.equal(serialize(saved.state).includes(tag),false);
  restored=await selectedApproachGame({saved,profile:profile.id,threaded});const q=restored.planner.nativeInitialIdleRequestReference(restored.actor);assert(q);assert.deepEqual(q.idleState,source.phase);assert.notEqual(q.authorityEpoch,source.sourceCycle.reference.worldBoundary.authorityEpoch);assert.equal(restored.planner.nativeInitialIdleBodyBinding(restored.actor),null);assert.equal(restored.planner.nativeIdleCycleBinding(restored.actor),null);assert.equal(restored.planner.nativeIdleStrollBinding(restored.actor),null);assert.equal(restored.worker.nativeRouteAdmission,'pending-idle-resources');assert.equal(restored.planner.prepareNativeIdleCycleProposal(restored.actor).status,'unsupported');
 }finally{await restored?.dispose();await f.dispose();}
});
