import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHomeArrivalRemoteFixture,prepareHomeAbsenceDraw} from './helpers/native-home-arrival-remote.js';
import {restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {flush} from './helpers/remote-webgpu-fixture.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {tick} from '../src/simulation/game.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

// Save a genuine completed Home through the actual native/control/resource
// channels. The queue is the existing deterministic GPU double, not hardware.
let completed;
async function completedHomeSave(){
 if(!completed)completed=(async()=>{const f=await nativeHomeArrivalRemoteFixture();try{
  let prepared;const r=await f.native.planner.startNativeHomeArrivalAfterGpuQuiescence({actorId:f.native.actor,getPublication:()=>f.source,prepareResources:async({resources})=>{
   prepared=await prepareHomeAbsenceDraw(f,resources);return {preparedWorldBoundary:prepared.preparedWorldBoundary,preparedHomeArrivalTemplate:resources.nativeHomeArrival,valid:prepared.valid,commit:d=>prepared.commit(d.worldBoundary,d.nativeHomeArrivalBinding),abort:prepared.abort};
  }});assert.equal(r.status,'committed');await flush();f.host.present();await prepared.presented;
  assert.equal(f.native.planner.nativeWorkerHomeInactive(f.native.actor),true);
  return {json:serialize(f.native.state),oldHome:f.home};
 }finally{await f.close();}})();
 const {json,oldHome}=await completed;return {saved:deserialize(json),oldHome};
}

test('a completed Home save declares fresh absence while its restored peer advances',async()=>{
 const {saved,oldHome}=await completedHomeSave(),f=restoreNativeActionGame(saved);try{
  assert.equal(f.worker.status,'home');assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),true);assert.equal(f.body(1),null);
  assert.equal(f.planner.nativeHomeRouteBinding(f.actor),null);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.planner.pendingTaskRoute(f.actor),null);
  const baseline=f.planner.nativeIntentControlBaseline();assert.notEqual(baseline.authorityEpoch,oldHome.reference.worldBoundary.authorityEpoch);assert.equal(baseline.routes.some(r=>r.actorId===oldHome.reference.actorId),false);assert.deepEqual(baseline.nativeHomes??[],[]);
  const worker=structuredClone(f.worker),peer=f.body(3),ledger=structuredClone(f.state.ledger);tick(f.state,.2,f.nav);
  assert.deepEqual(f.worker,worker);assert.notDeepEqual(f.body(3),peer);assert.deepEqual(f.state.ledger,ledger);assert.equal(f.body(1),null);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),true);
  assert.equal(serialize(f.state).includes('inactiveSequence'),false);
 }finally{f.close();}
});

test('an entirely inactive Home cohort advances through the existing empty native clock',async()=>{
 const {saved}=await completedHomeSave();saved.workers=saved.workers.slice(0,1);saved.tasks=[];
 const f=restoreNativeActionGame(saved,{admitPeer:false});try{
  assert.equal(f.w.spatial_body_count(),0);assert.equal(f.planner.nativeGameExecutionState(),1);assert.equal(f.planner.beginNativeRouteExecution().status,'inactive');
  const worker=structuredClone(f.worker),at=f.state.elapsed;tick(f.state,.2,f.nav);assert(Math.abs(f.state.elapsed-at-.2)<1e-11);assert.deepEqual(f.worker,worker);assert.equal(f.w.spatial_body_count(),0);
  assert.equal(f.planner.nativeCausalClock().committedThrough,f.state.elapsed);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),true);
 }finally{f.close();}
});

test('resetting the intent index cannot conceal a retained physical body as restored Home',async()=>{
 const {saved}=await completedHomeSave();saved.workers=saved.workers.slice(0,1);saved.tasks=[];
 const f=restoreNativeActionGame(saved,{admitPeer:false});try{
  assert.equal(f.w.spatial_body_upsert(77,f.worker.x,f.worker.z,.28,0,1),1);const body=f.body(77);
  f.planner.resetFromState(f.state);assert.deepEqual(f.body(77),body);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);
  assert.equal(f.w.nav_intent_restore_home_inactive(Number(f.actor.split('-').at(-1)),f.worker.x,f.worker.z),-2);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.throws(()=>tick(f.state,.1,f.nav),/unsupported mover/);assert.deepEqual(f.body(77),body);
 }finally{f.close();}
});

test('fresh Home absence is revoked by a real binding and cannot be redeclared after clock admission',async()=>{
 const {saved}=await completedHomeSave(),f=restoreNativeActionGame(saved);try{
  const actor=Number(f.actor.split('-').at(-1));assert.equal(f.w.nav_intent_restore_home_inactive(actor,f.worker.x,f.worker.z),-2);
  assert.equal(f.w.spatial_body_upsert(77,f.worker.x,f.worker.z,.28,0,1),1);assert.equal(f.w.nav_gate_bind_worker(actor,77),1);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);
  assert.equal(f.w.spatial_body_remove(77),1);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);
 }finally{f.close();}
});

test('home label, wrong entry, recovery or task ownership cannot mint initial absence',async()=>{
 const {saved}=await completedHomeSave(),f=restoreNativeActionGame(saved);try{
  for(const patch of [{x:f.worker.x+.1},{running:true},{gateWaiting:true},{incapacitated:true},{recovery:{stage:'fall'}},{taskId:f.state.tasks[0]?.id??'task-1'},{nativeRouteAdmission:'native-home'}]){
   const old={...f.worker};Object.assign(f.worker,patch);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),false);Object.assign(f.worker,old);
  }
  // A new semantic row at the wrong entry is not admitted, even with no bodies.
  const single=deserialize(serialize(saved));single.workers=single.workers.slice(0,1);single.tasks=[];single.workers[0].x+=.1;
  f.w.spatial_bodies_reset();f.planner.resetFromState(single);assert.equal(f.planner.nativeWorkerHomeInactive(single.workers[0].id),false);assert.equal(f.w.spatial_body_count(),0);
 }finally{f.close();}
});

test('threaded native restoration shares the same inactive Home declaration and empty clock',async()=>{
 const {saved}=await completedHomeSave();saved.workers=saved.workers.slice(0,1);saved.tasks=[];
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory);let f;try{
  f=restoreNativeActionGame(saved,{core:runtime.core,admitPeer:false});assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),true);tick(f.state,.2,f.nav);assert.equal(f.w.spatial_body_count(),0);assert.equal(f.planner.nativeWorkerHomeInactive(f.actor),true);
 }finally{f?.close();await runtime.dispose();}
});
