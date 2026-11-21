import test from 'node:test';
import assert from 'node:assert/strict';
import {savedNativeIdleApproach} from './helpers/native-idle-approach-restoration.js';
import {restoredNativeIdleStrollGame} from './helpers/native-idle-stroll-restoration-game.js';
import {nativeIdleStrollRestorationSource,savedNativeIdleStroll} from './helpers/native-idle-stroll-restoration-source.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {updateIdle} from '../src/simulation/idle.js';
import {copyNativeIdleStrollFailedRestReference} from '../src/world/native-idle-stroll-failed-rest-reference.js';

async function fixture({threaded=false,profile='youngMale',position='outside',rng}={}){
 const saved=savedNativeIdleApproach({profile,position});if(rng!==undefined)saved.state.workers[0].idleState.rng=rng;let runtime;
 try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  const f=restoredNativeIdleStrollGame(saved,{core:runtime?.core});return {...f,async dispose(){f.close();await runtime?.dispose();}};
 }catch(error){await runtime?.dispose();throw error;}
}
function held(f){return {source:f.planner.nativeIdleStrollRequestReference(f.actor),worker:structuredClone(f.worker),body:f.body(1),rng:f.state.rng,sequence:f.w.nav_intent_last_sequence()};}
function assertHeld(f,value){assert.deepEqual(held(f),value);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);assert.equal(f.planner.nativeIdleCycleBinding(f.actor),null);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);}

for(const threaded of [false,true])for(const profile of PROFILES)test(`${threaded?'pthread':'standalone'} ${profile.id} blocked restored WALK exposes exactly original cancelWalk REST without installing it`,async()=>{
 const f=await fixture({threaded,profile:profile.id});try{
  const before=held(f),q=before.source,original=createSpatialNavigationMovement(f.session,f.state),worker=structuredClone(f.worker),anchor={id:worker.idleState.anchorId,x:q.anchor.x,z:q.anchor.z,idleRadius:q.anchor.radius};
  worker.idleState.pathVersion=-1;updateIdle(worker,anchor,0,original,f.state.seed);
  const expected=Object.fromEntries(['mode','elapsed','remaining','rng','approachRetry'].map(k=>[k,worker.idleState[k]]));assert.equal(worker.idleState.mode,'rest');assert.equal(worker.destinationId,null);
  assert.equal(f.w.nav_idle_stroll_failed_rest_version(),1);const reference=f.planner.nativeIdleStrollFailedRestReference(f.actor);
  assert.deepEqual(reference.desiredRest,expected);assert.deepEqual(reference.sourceRequest,q);assert.equal(reference.observedAt,f.state.elapsed);assert(reference.topology>0);assert.deepEqual(copyNativeIdleStrollFailedRestReference(reference),reference);assert(Object.isFrozen(reference.desiredRest));assertHeld(f,before);
  for(let i=0;i<5;i++)assert.deepEqual(f.planner.nativeIdleStrollFailedRestReference(f.actor),reference);assertHeld(f,before);
 }finally{await f.dispose();}
});

for(const position of ['inside','arrived'])test(`available ${position} restored WALK cannot manufacture a failed REST`,async()=>{
 const f=await fixture({position});try{const before=held(f),q=before.source;assert.equal(f.w.nav_idle_stroll_failed_rest_snapshot(q.actorId,q.nativeSession,q.requestSequence),0);assert.equal(f.planner.nativeIdleStrollFailedRestReference(f.actor),null);assertHeld(f,before);}finally{await f.dispose();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} a blocked local WALK shares cancelWalk without becoming an approach`,async()=>{
 let runtime,f;try{
  const saved=savedNativeIdleStroll();if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleStrollRestorationSource(saved,{core:runtime?.core});f.bridge.commitNativeCausalClock();const q=f.bridge.nativeIdleStrollRequestReference(f.actor),worker=structuredClone(f.worker),body=f.body(1);assert.equal(q.approach,undefined);assert(f.session.core.addWall(q.destination.x,q.destination.z,.4,.4)>0);
  const r=f.bridge.nativeIdleStrollFailedRestReference(f.actor);assert(r);assert.equal(r.sourceRequest.approach,undefined);assert.equal(r.desiredRest.mode,'rest');assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),q);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.bridge.nativeIdleStrollBinding(f.actor),null);
 }finally{f?.close();await runtime?.dispose();}
});

test('an unbound declaration has no failed body source and removal revokes a bound one',()=>{
 const f=nativeIdleStrollRestorationSource(savedNativeIdleApproach(),{bind:false});try{
  const declaration=f.bridge.nativeIdleStrollDeclarationReference(f.actor);assert(declaration);assert.equal(f.bridge.nativeIdleStrollFailedRestReference(f.actor),null);assert.equal(f.w.nav_idle_stroll_failed_rest_snapshot(declaration.actorId,declaration.nativeSession,declaration.requestSequence),-2);
  f.bindBody();f.bridge.commitNativeCausalClock();const q=f.bridge.nativeIdleStrollRequestReference(f.actor);assert(q);assert.equal(f.w.spatial_body_remove(q.bodyId),1);assert.equal(f.bridge.nativeIdleStrollFailedRestReference(f.actor),null);assert.equal(f.w.nav_idle_stroll_failed_rest_snapshot(q.actorId,q.nativeSession,q.requestSequence),-2);
 }finally{f.close();}
});

test('unknown terrain cannot manufacture a failed REST or consume the private stream',()=>{
 const saved=savedNativeIdleApproach({position:'inside'}),idle=saved.state.workers[0].idleState,plant=saved.state.plants.find(p=>p.id===`plant-${saved.reference.anchor.id}`);
 // Explicit unavailable-target fixture, not an old executable corridor.
 plant.x+=480;idle.destination.x=plant.x;saved.reference={...saved.reference,anchor:{...saved.reference.anchor,x:plant.x}};
 const f=nativeIdleStrollRestorationSource(saved);try{f.bridge.commitNativeCausalClock();const q=f.bridge.nativeIdleStrollRequestReference(f.actor),worker=structuredClone(f.worker),body=f.body(1);assert.equal(f.w.nav_idle_stroll_failed_rest_snapshot(q.actorId,q.nativeSession,q.requestSequence),-6);assert.equal(f.bridge.nativeIdleStrollFailedRestReference(f.actor),null);assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),q);}finally{f.close();}
});

for(const rng of [0,1,0xffffffff])test(`private stream ${rng} keeps original one-draw semantics and no world RNG change`,async()=>{
 const f=await fixture({rng});try{const before=held(f),r=f.planner.nativeIdleStrollFailedRestReference(f.actor);let next=rng;next^=next<<13;next^=next>>>17;next^=next<<5;next>>>=0;assert.equal(r.desiredRest.rng,next);assert.equal(r.desiredRest.remaining,r.sourceRequest.idleSeconds*(2+Math.floor(next/4294967296*3)));assertHeld(f,before);}finally{await f.dispose();}
});

test('bad source tuple clears the scratch snapshot and Game edits cannot borrow its failure',async()=>{
 const f=await fixture();try{
  const q=f.planner.nativeIdleStrollFailedRestReference(f.actor).sourceRequest;assert.equal(f.w.nav_idle_stroll_failed_rest_snapshot(q.actorId,q.nativeSession,q.requestSequence+1),-2);assert(new Float64Array(f.w.memory.buffer,f.w.nav_idle_stroll_failed_rest_ptr(),9).every(v=>v===0));assert.equal(f.w.nav_idle_stroll_failed_rest_snapshot(q.actorId,q.nativeSession+1,q.requestSequence),-1);
  f.worker.idleState.rng^=1;assert.equal(f.planner.nativeIdleStrollFailedRestReference(f.actor),null);assert.equal(f.planner.nativeIdleStrollBinding(f.actor),null);
 }finally{await f.dispose();}
});

test('topology repair withdraws a failed REST instead of retaining a cached failure',()=>{
 const f=nativeIdleStrollRestorationSource(savedNativeIdleApproach());try{
  f.bridge.commitNativeCausalClock();const q=f.bridge.nativeIdleStrollRequestReference(f.actor),body=f.body(1),worker=structuredClone(f.worker);
  assert.equal(f.bridge.nativeIdleStrollFailedRestReference(f.actor),null);
  const wall=f.session.core.addWall(q.destination.x,q.destination.z,.4,.4);assert(wall>0);const failed=f.bridge.nativeIdleStrollFailedRestReference(f.actor);assert(failed);
  assert.equal(f.session.core.removeWall(wall),1);assert.equal(f.bridge.nativeIdleStrollFailedRestReference(f.actor),null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),q);
 }finally{f.close();}
});

test('a physical local detour outside the anchor radius produces original cancelWalk REST',()=>{
 const f=nativeIdleStrollRestorationSource(savedNativeIdleStroll());try{
  f.bridge.commitNativeCausalClock();const q=f.bridge.nativeIdleStrollRequestReference(f.actor),p=q.pose,d=q.destination,dx=d.x-p.x,dz=d.z-p.z,body=f.body(1),worker=structuredClone(f.worker);
  assert(f.session.core.addWall((d.x+p.x)/2,(d.z+p.z)/2,Math.abs(dx)>Math.abs(dz)?.15:16,Math.abs(dx)>Math.abs(dz)?16:.15)>0);
  const path=f.session.routeActor(p,d,{worker:true});assert.equal(path.status,'found');assert(path.points.some(v=>Math.hypot(v.x-q.anchor.x,v.z-q.anchor.z)>q.anchor.radius));assert.equal(f.bridge.prepareNativeIdleStrollProposal(f.actor).status,'blocked');
  const oracle=structuredClone(worker);oracle.idleState.pathVersion=-1;updateIdle(oracle,{id:worker.idleState.anchorId,x:q.anchor.x,z:q.anchor.z,idleRadius:q.anchor.radius},0,createSpatialNavigationMovement(f.session,f.state),f.state.seed);assert.equal(oracle.idleState.mode,'rest');
  const failed=f.bridge.nativeIdleStrollFailedRestReference(f.actor);assert(failed);assert.deepEqual(failed.desiredRest,Object.fromEntries(['mode','elapsed','remaining','rng','approachRetry'].map(k=>[k,oracle.idleState[k]])));assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.bridge.nativeIdleStrollBinding(f.actor),null);
 }finally{f.close();}
});

test('later causal observation retains one-draw REST while an independent native peer advances',()=>{
 const f=nativeIdleStrollRestorationSource(savedNativeIdleApproach(),{peer:true});try{
  const q=f.bridge.nativeIdleStrollRequestReference(f.actor);assert(f.session.core.addWall(q.destination.x,q.destination.z,.4,.4)>0);const peer=f.admitPeer();assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert(['committed','unchanged'].includes(f.bridge.commitNativeCausalClock().status));
  const first=f.bridge.nativeIdleStrollFailedRestReference(f.actor),previous=f.state.elapsed,body=f.body(1),worker=structuredClone(f.worker),peerBefore=f.body(2),rng=f.state.rng;assert(first);assert.equal(f.advance(previous+.2).status,'advanced');assert(['committed','unchanged'].includes(f.bridge.commitNativeCausalClock().status));
  const later=f.bridge.nativeIdleStrollFailedRestReference(f.actor);assert.equal(later.observedAt,f.state.elapsed);assert.equal(first.observedAt,previous);assert.deepEqual(later.sourceRequest,first.sourceRequest);assert.deepEqual(later.desiredRest,first.desiredRest);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.notDeepEqual(f.body(2),peerBefore);assert(f.bridge.nativeRouteExecution(peer));assert.equal(f.state.rng,rng);assert.equal(f.bridge.nativeIdleCycleBinding(f.actor),null);
 }finally{f.close();}
});

test('failed REST value rejects extra grants, wrong stream, duration, retry and future source birth',async()=>{
 const f=await fixture();try{
  const r=f.planner.nativeIdleStrollFailedRestReference(f.actor);
  for(const change of [{expectedRouteHandle:{}},{observedAt:r.sourceRequest.requestedAt-1},{topology:-1},{topology:2**32},{desiredRest:{...r.desiredRest,rng:r.desiredRest.rng^1}},{desiredRest:{...r.desiredRest,remaining:r.desiredRest.remaining+1}},{desiredRest:{...r.desiredRest,approachRetry:r.desiredRest.approachRetry+1}},{desiredRest:{...r.desiredRest,mode:'watch'}},{desiredRest:{...r.desiredRest,elapsed:.1}},{desiredRest:{...r.desiredRest,executed:true}}])assert.throws(()=>copyNativeIdleStrollFailedRestReference({...r,...change}));
 }finally{await f.dispose();}
});
