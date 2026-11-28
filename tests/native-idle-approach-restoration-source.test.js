import test from 'node:test';
import assert from 'node:assert/strict';
import {savedNativeIdleApproach} from './helpers/native-idle-approach-restoration.js';
import {nativeIdleStrollRestorationSource} from './helpers/native-idle-stroll-restoration-source.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {copyNativeIdleStrollRequestReference} from '../src/world/native-idle-stroll-request-reference.js';

for(const threaded of [false,true])for(const profile of PROFILES)for(const position of ['outside','inside','arrived'])test(`${threaded?'pthread':'standalone'} ${profile.id} restores actual ${position} approach as a fresh22 request with its original birth`,async()=>{
 let runtime,f;try{
  const saved=savedNativeIdleApproach({profile:profile.id,position}),text=serialize(saved.state),loaded=deserialize(text),old=loaded.workers[0];assert(!text.includes('expectedRouteHandle'));assert(!text.includes('sourceFarm'));assert.equal(old.destinationId,old.idleState.anchorId);
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=nativeIdleStrollRestorationSource({...saved,state:loaded},{core:runtime?.core,bind:false});const {bridge,w,actor}=f,declaration=bridge.nativeIdleStrollDeclarationReference(actor);
  assert.equal(w.spatial_body_count(),0);assert(declaration.approach);assert.notEqual(declaration.authorityEpoch,saved.reference.worldBoundary.authorityEpoch);assert.equal(bridge.nativeIdleStrollBinding(actor),null);assert.equal(bridge.nativeInitialIdleBodyBinding(actor),null);assert.equal(bridge.nativeIdleCycleBinding(actor),null);
  f.bindBody();const source=bridge.nativeIdleStrollRequestReference(actor),body=f.body(1),rng=f.state.rng;assert(source.approach);assert.equal(source.walkRng,old.idleState.rng);assert.deepEqual(source.destination,source.anchor&&{x:source.anchor.x,z:source.anchor.z});assert.equal(new Float64Array(w.memory.buffer,w.nav_idle_stroll_restore_request_ptr(),29)[28],1);assert.deepEqual(bridge.nativeIdleStrollRequestReferences(),[source]);
  bridge.commitNativeCausalClock();const candidate=bridge.prepareNativeIdleStrollProposal(actor);assert.equal(candidate.status,'proposed');const ref=candidate.proposal.nativeIdleStroll;assert(ref.sourceRequest.approach);assert.equal(ref.sourceFarm,undefined);assert.equal(ref.sourceCycleSequence,0);assert.deepEqual(f.body(1),body);
  assert.equal(f.advance(f.state.elapsed+.2).status,'advanced');bridge.commitNativeCausalClock();assert.equal(bridge.revalidateNativeIdleStrollProposal(candidate.proposal.ticket).status,'revalidated');assert.equal(w.nav_idle_stroll_proposal_commit_bound(...f.tuple().slice(0,5),candidate.proposal.ticket.ticket),1);assert.equal(bridge.beginNativeRouteExecution().status,'started');bridge.commitNativeCausalClock();
  const binding=bridge.nativeIdleStrollBinding(actor);assert.deepEqual(binding.reference.sourceRequest,source);assert.deepEqual(bridge.nativeIdleStrollSourceRequestReference(actor),source);assert.equal(bridge.nativeIdleStrollRequestReference(actor),null);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);
  assert.equal(f.advance(binding.reference.endTime+.05).status,'advanced');bridge.commitNativeCausalClock();const arrived=bridge.nativeIdleStrollExecution(actor);assert(arrived.arrived);assert.equal(arrived.walkState.remaining,old.idleState.remaining);assert.equal(arrived.walkState.rng,old.idleState.rng);if(saved.desiredRest)assert.deepEqual(arrived.desiredRest,saved.desiredRest);
 }finally{f?.close();await runtime?.dispose();}
});

test('an approach source outside its anchor cannot lose its explicit semantic kind or change the saved target',()=>{
 const saved=savedNativeIdleApproach(),f=nativeIdleStrollRestorationSource(saved);try{
  const source=f.bridge.nativeIdleStrollRequestReference(f.actor);assert(source.approach);assert.throws(()=>copyNativeIdleStrollRequestReference({...source,approach:undefined}));assert.throws(()=>copyNativeIdleStrollRequestReference({...source,approach:false}));assert.throws(()=>copyNativeIdleStrollRequestReference({...source,destination:{x:source.destination.x+.1,z:source.destination.z}}));assert.notEqual(f.w.nav_intent_restore_idle_stroll(...f.args()),1);
 }finally{f.close();}
});

test('raw approach redeclaration retains exact target/pose and cannot replace its pending owner',()=>{
 const f=nativeIdleStrollRestorationSource(savedNativeIdleApproach());try{
  const q=f.bridge.nativeIdleStrollRequestReference(f.actor),body=f.body(1);assert.equal(f.w.nav_intent_restore_idle_approach(...f.args()),1);
  const target=f.args();target[10]+=.1;assert.equal(f.w.nav_intent_restore_idle_approach(...target),-1);const pose=f.args();pose[12]+=.1;assert.equal(f.w.nav_intent_restore_idle_approach(...pose),-3);assert.deepEqual(f.bridge.nativeIdleStrollRequestReference(f.actor),q);assert.deepEqual(f.body(1),body);
 }finally{f.close();}
});

test('a restored approach declaration has no usable body grant until binding, and removal revokes its request',()=>{
 const f=nativeIdleStrollRestorationSource(savedNativeIdleApproach(),{bind:false});try{
  assert(f.bridge.nativeIdleStrollDeclarationReference(f.actor).approach);assert.equal(f.bridge.nativeIdleStrollRequestReference(f.actor),null);f.bridge.commitNativeCausalClock();assert.equal(f.bridge.prepareNativeIdleStrollProposal(f.actor).status,'unsupported');f.bindBody();assert(f.bridge.nativeIdleStrollRequestReference(f.actor).approach);assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.bridge.nativeIdleStrollRequestReference(f.actor),null);assert.equal(f.bridge.nativeIdleStrollSourceRequestReference(f.actor),null);assert.equal(f.bridge.nativeIdleStrollBinding(f.actor),null);
 }finally{f.close();}
});
