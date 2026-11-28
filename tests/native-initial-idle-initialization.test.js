import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {updateIdle} from '../src/simulation/idle.js';
import {idleFarmAnchor} from '../src/simulation/game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createPlant} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function initial(options={}){
 return nativeInitialIdleRequestFixture({mode:null,...options,configureState(state,{point}){
  const worker=state.workers[0],position=options.distant?point(6,0):worker;
  state.plants=[createPlant('plant-900099','mijo',position.x,position.z,worker.centerId)];
 }});
}

for(const profile of PROFILES)test(`${profile.id} initializes its native declaration with the original zero-step Idle state`,()=>{
 const f=initial({profile:profile.id});try{
  const before=structuredClone(f.worker),body=f.body(1),rng=f.state.rng,oracle=structuredClone(f.worker),anchor=idleFarmAnchor(f.state,f.worker,f.state.structures.find(s=>s.id===f.worker.centerId));
  updateIdle(oracle,anchor,0,{path(){throw Error('Stationary initialization must not navigate');}},f.state.seed);
  const result=f.planner.requestNativeInitialIdleResources(f.state,f.worker,{initialize:true});assert.equal(result.status,'requested');assert.deepEqual(f.worker.idleState,oracle.idleState);assert.deepEqual(result.request.idleState,oracle.idleState);assert.equal(result.request.idleState.mode,'rest');assert.equal(result.request.idleState.elapsed,0);assert.equal(result.request.idleState.anchorId,'farm-plant-900099');
  assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.deepEqual({...f.worker,idleState:null,nativeRouteAdmission:undefined},{...before,nativeRouteAdmission:undefined});assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);
  const sequence=f.w.nav_intent_transition_sequence();assert.deepEqual(f.planner.requestNativeInitialIdleResources(f.state,f.worker,{initialize:true}).request,result.request);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(deserialize(serialize(f.state)).workers[0].idleState,oracle.idleState);
 }finally{f.close();}
});

for(const reason of ['outside-anchor','already-declared','physical-rejection'])test(`native initialization leaves Game and the private stream untouched on ${reason}`,()=>{
 const f=initial({distant:reason==='outside-anchor'});try{
  if(reason==='already-declared')f.planner.requestNativeInitialIdleResources(f.state,f.worker);
  if(reason==='physical-rejection')assert.equal(f.w.spatial_body_upsert(1,f.worker.x,f.worker.z,.28,0,3),1);
  const worker=structuredClone(f.worker),body=f.body(1),rng=f.state.rng,sequence=f.w.nav_intent_transition_sequence(),request=f.planner.nativeInitialIdleDeclarationReference(f.actor);
  assert.throws(()=>f.planner.requestNativeInitialIdleResources(f.state,f.worker,{initialize:true}),reason==='outside-anchor'?/stationary farm anchor/:reason==='already-declared'?/fresh declaration/:/declaration rejected/);
  assert.deepEqual(f.worker,worker);assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.planner.nativeInitialIdleDeclarationReference(f.actor),request);
 }finally{f.close();}
});

test('cold initialization precedes body binding without creating a graphical permission',()=>{
 const f=initial({bound:false});try{
  assert.equal(f.planner.requestNativeInitialIdleResources(f.state,f.worker,{initialize:true}).request,null);const privateState=structuredClone(f.worker.idleState),declaration=f.planner.nativeInitialIdleDeclarationReference(f.actor);assert.deepEqual(declaration.idleState,privateState);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.planner.nativeInitialIdleBodyBinding(f.actor),null);
  f.bind();const request=f.planner.nativeInitialIdleRequestReference(f.actor);assert(request.requestSequence>declaration.requestSequence);assert.deepEqual(request.idleState,privateState);assert.deepEqual(f.worker.idleState,privateState);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.planner.prepareNativeInitialIdleBodyProposal(request).status,'proposed');
 }finally{f.close();}
});

test('a newly initialized original Idle enters the existing prepared body consumer without invented history',async()=>{
 const f=initial();let v;try{
  f.planner.requestNativeInitialIdleResources(f.state,f.worker,{initialize:true});assert.equal(f.planner.commitNativeCausalClock().status,'committed');const worker=structuredClone(f.worker),body=f.body(1),rng=f.state.rng;
  v=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'initial-idle-body'});
  const result=await v.run(options=>f.planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:f.actor,...options}));assert.equal(result.status,'committed',JSON.stringify(result));await v.present();assert.deepEqual(f.worker,{...worker,nativeRouteAdmission:'native-idle'});assert.deepEqual(f.body(1),body);assert.equal(f.state.rng,rng);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskConsequenceBinding(f.actor),null);assert.deepEqual(v.errors,[]);
 }finally{await v?.close();f.close();}
});
