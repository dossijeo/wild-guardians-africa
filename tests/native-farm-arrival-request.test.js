import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInitialIdleRequestFixture} from './helpers/native-initial-idle-request.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {centerServicePoint} from '../src/world/centers.js';
import {createPlant} from '../src/simulation/crops.js';
import {emit} from '../src/simulation/game.js';
import {enqueue} from '../src/simulation/tasks.js';

function fixture(options={}){
 const f=nativeInitialIdleRequestFixture({mode:null,declareRequest:false,...options,configureState(state){state.workers[0].status='arriving';options.configureState?.(state);}}),w=f.w;
 const args=()=>[f.actor,PROFILES.findIndex(p=>p.id===f.worker.profile),f.worker.heading,f.worker.runPhase,f.worker.walkPhase,f.worker.carryPhase,f.worker.runRemaining];
 const read=(bound=true)=>{if(w[bound?'nav_farm_arrival_request_snapshot':'nav_farm_arrival_declaration_snapshot'](f.actor)!==1)return null;return Array.from(new Float64Array(w.memory.buffer,w.nav_farm_arrival_request_ptr(),23));};
 return {...f,args,read,declare:()=>w.nav_intent_request_farm_arrival(...args())};
}

for(const p of PROFILES)test(`${p.id} farm arrival snapshot keeps the real pose and native authored center goal without a route`,()=>{
 const f=fixture({profile:p.id});try{
  assert.equal(f.w.nav_farm_arrival_request_version(),1);const body=f.body(1),rng=f.state.rng,worker=structuredClone(f.worker),center=f.state.structures.find(c=>c.id===f.worker.centerId),goal=centerServicePoint(center,f.state,.8);
  assert.equal(f.declare(),1);const source=f.read();assert.equal(source[0],1);assert.equal(source[1],f.actor);assert.equal(source[5],Number(center.id.split('-').at(-1)));assert.equal(source[6],1);assert.equal(source[17],PROFILES.indexOf(p));assert.equal(source[18],goal.x);assert.equal(source[19],goal.z);assert.equal(source[22],2);
  assert.deepEqual(source.slice(9,12),[worker.x,worker.z,worker.heading]);assert.deepEqual(source.slice(13,17),[worker.runPhase,worker.walkPhase,worker.carryPhase,worker.runRemaining]);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker,worker);assert.equal(f.state.rng,rng);
  assert.equal(f.declare(),1);assert.deepEqual(f.read(),source);assert.equal(f.w.nav_farm_arrival_requests_snapshot(),1);assert.equal(f.planner.nativeHomeRequestReference(f.actor),null);assert.equal(f.planner.nativeInitialIdleRequestReference(f.actor),null);assert.equal(f.planner.nativeIdleStrollRequestReference(f.actor),null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);
 }finally{f.close();}
});

test('cold farm declaration only becomes a resource request on the first exact body binding',()=>{
 const f=fixture({bound:false});try{
  assert.equal(f.declare(),1);const cold=f.read(false);assert(cold);assert.equal(cold[6],0);assert.equal(f.read(),null);assert.equal(f.w.nav_farm_arrival_requests_snapshot(),0);assert.notEqual(f.planner.commitNativeCausalClock().status,'committed');
  assert.equal(f.w.spatial_body_upsert(1,f.worker.x+.1,f.worker.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(f.actor,1),0);assert.equal(f.read(),null);
  assert.equal(f.w.spatial_body_upsert(1,f.worker.x,f.worker.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(f.actor,1),1);const bound=f.read();assert.equal(bound[6],1);assert(bound[3]>cold[3]);assert.deepEqual(bound.slice(9,12),cold.slice(9,12));assert.deepEqual(bound.slice(13),cold.slice(13));assert.equal(f.w.nav_gate_bind_worker(f.actor,1),1);assert.deepEqual(f.read(),bound);
  assert.equal(f.w.spatial_body_upsert(2,f.worker.x,f.worker.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(f.actor,2),0);
 }finally{f.close();}
});

for(const threaded of [false,true])test(`${threaded?'pthread':'standalone'} pending arrival holds its exact body while a genuine Task peer advances`,async()=>{
 let runtime,f;try{
  if(threaded){const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');runtime=await createThreadedSpatialWorld(factory);}
  f=fixture({core:runtime?.core,peer:true});assert.equal(f.declare(),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const source=f.read(),body=f.body(1),peer=f.body(3);f.advance(.3);assert.deepEqual(f.body(1),body);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.read(),source);
  // The pending class now has a Game projection. Game still requires its
  // exact semantic marker and source before advancing any member of a cohort.
  assert.equal(f.planner.nativeGameExecutionState(),1);
 }finally{f?.close();await runtime?.dispose();}
});

test('arrival birth preserves a different prepared TaskStart for native revalidation',()=>{
 const f=fixture({peer:true,admitPeer:false});try{
  const proposal=f.peerProposal,body=f.body(1);assert.equal(f.declare(),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const fresh=f.planner.revalidateNativeTaskStartProposal(proposal.ticket);assert.equal(fresh.status,'revalidated');assert(fresh.timeTranslation.sameFloat32Motion);assert.deepEqual(f.body(1),body);assert(f.read());
 }finally{f.close();}
});

test('arrival rejects malformed policy, unavailable actors and changed retry values',()=>{
 const f=fixture();try{
  for(const [index,value] of [[0,0],[0,.5],[1,4],[1,.5],[2,NaN],[3,-1],[4,-1],[5,-1],[6,-1],[6,Infinity]]){const args=f.args();args[index]=value;assert.equal(f.w.nav_intent_request_farm_arrival(...args),-1);assert.equal(f.read(),null);}
  const absent=f.args();absent[0]=999999;assert.equal(f.w.nav_intent_request_farm_arrival(...absent),0);assert.equal(f.declare(),1);const before=f.read();for(let i=1;i<7;i++){const args=f.args();args[i]+=(i===1?1:.1);assert.equal(f.w.nav_intent_request_farm_arrival(...args),-3);assert.deepEqual(f.read(),before);}
 }finally{f.close();}
});

for(const reset of [false,true])test(`arrival physical ownership rejects writes and revokes on ${reset?'body reset':'removal'}`,()=>{
 const f=fixture();try{
  assert.equal(f.declare(),1);const b=f.body(1);for(const change of [{x:b.x+.1},{radius:b.radius+.1},{flags:3},{kind:1}]){const v={...b,...change};assert.equal(f.w.spatial_body_upsert(1,v.x,v.z,v.radius,v.kind,v.flags),0);assert.deepEqual(f.body(1),b);}
  if(reset)f.w.spatial_bodies_reset();else assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.read(),null);assert.equal(f.w.nav_farm_arrival_requests_snapshot(),0);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);
 }finally{f.close();}
});

test('changed native service point invalidates the old arrival goal and cannot authorize a clock',()=>{
 const f=fixture();try{
  assert.equal(f.declare(),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');const center=f.state.structures.find(c=>c.id===f.worker.centerId),id=Number(center.id.split('-').at(-1)),source=f.read();const ptr=f.w.nav_intent_changes_ptr(1);new Float64Array(f.w.memory.buffer,ptr,10).set([1,6,id,4,source[18]+.2,source[19],0,0,0,0]);assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,1),1);assert.equal(f.read(),null);assert.notEqual(f.planner.commitNativeCausalClock().status,'committed');
 }finally{f.close();}
});

test('only a pending prepared Task claim can replace farm arrival while retaining its actual body',()=>{
 const f=fixture();try{
  const target=createPlant(`plant-${f.state.nextId++}`,'mijo',f.point(6,0).x,f.point(6,0).z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;f.state.plants.push(target);emit(f.state,'CropPlaced',{targetId:target.id});f.planner.flushWorldEvents();assert.equal(f.declare(),1);const source=f.read(),body=f.body(1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');enqueue(f.state,f.worker.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();
  const legacy=f.planner.planIfNeeded(f.state.elapsed);assert.equal(legacy.filter(r=>r.status===1).length,1);assert.throws(()=>f.planner.commitTaskBatchToState(f.state,legacy,{navVersion:1}),/became stale/);assert.equal(f.worker.taskId,null);assert.deepEqual(f.body(1),body);assert.deepEqual(f.read(),source);
  const pending=f.planner.planIfNeeded(f.state.elapsed);assert.equal(f.planner.commitTaskBatchToState(f.state,pending,{navVersion:1,pendingResources:true}),1);assert.equal(f.worker.nativeRouteAdmission,'pending-resources');assert.deepEqual(f.body(1),body);assert.equal(f.read(),null);assert.equal(f.planner.nativeTaskStartBinding(f.actor),null);assert.equal(f.w.spatial_body_upsert(1,body.x+.1,body.z,body.radius,0,1),0);
 }finally{f.close();}
});
