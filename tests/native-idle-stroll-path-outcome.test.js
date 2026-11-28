import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleStrollRestorationSource} from './helpers/native-idle-stroll-restoration-source.js';
import {savedNativeIdleApproach} from './helpers/native-idle-approach-restoration.js';
import {restoredNativeIdleStrollGame} from './helpers/native-idle-stroll-restoration-game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

async function fixture(threaded,profile='youngMale'){
 const saved=savedNativeIdleApproach({profile});let runtime;
 try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  const f=restoredNativeIdleStrollGame(saved,{core:runtime?.core});
  return {...f,async dispose(){f.close();await runtime?.dispose();}};
 }catch(error){await runtime?.dispose();throw error;}
}
function held(f){return {request:f.planner.nativeIdleStrollRequestReference(f.actor),worker:structuredClone(f.worker),body:f.body(1),rng:f.state.rng,sequence:f.w.nav_intent_last_sequence()};}
function assertHeld(f,before){
 assert.deepEqual(held(f),before);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} unusable saved connector is blocked, not missing terrain or a reservation conflict`,async()=>{
 const f=await fixture(threaded,profile.id);try{
  const original=createSpatialNavigationMovement(f.session,f.state);assert.equal(original.path(f.worker,f.worker.idleState.destination,.28,null,true),null);
  const before=held(f),q=before.request;assert(q.approach);
  for(let attempt=0;attempt<2;attempt++){
   assert.equal(f.w.nav_idle_stroll_proposal_stage(q.actorId,q.nativeSession,q.requestSequence),-7);
   assert.equal(f.planner.prepareNativeIdleStrollProposal(f.actor).status,'blocked');assertHeld(f,before);
  }
 }finally{await f.dispose();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} an authored semantic anchor in absent terrain remains unknown without a motion grant`,async()=>{
 let runtime,f;try{
  // An untrusted semantic target is a request, never a corridor certificate.
  // The real earlier checkpoint supplies pose/RNG, but this far anchor is
  // authored explicitly to exercise unavailable terrain, not old execution.
  const saved=savedNativeIdleApproach({position:'inside'}),idle=saved.state.workers[0].idleState,plant=saved.state.plants.find(p=>p.id===`plant-${saved.reference.anchor.id}`);
  plant.x+=480;idle.destination.x=plant.x;saved.reference={...saved.reference,anchor:{...saved.reference.anchor,x:plant.x}};
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleStrollRestorationSource(saved,{core:runtime?.core});f.bridge.commitNativeCausalClock();
  const q=f.bridge.nativeIdleStrollRequestReference(f.actor),body=f.body(1),worker=structuredClone(f.worker),rng=f.state.rng,sequence=f.w.nav_intent_last_sequence();
  for(let attempt=0;attempt<2;attempt++){
   assert.equal(f.w.nav_idle_stroll_proposal_stage(q.actorId,q.nativeSession,q.requestSequence),-6);assert.equal(f.bridge.prepareNativeIdleStrollProposal(f.actor).status,'unknown');assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),q);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_intent_last_sequence(),sequence);assert.equal(f.bridge.nativeIdleStrollBinding(f.actor),null);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
  }
 }finally{f?.close();await runtime?.dispose();}
});
