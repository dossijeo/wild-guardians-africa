import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {moveWorker,WORKER_SPEED_MULTIPLIER} from '../src/simulation/locomotion.js';
import {LOCOMOTION as L} from '../src/simulation/locomotion-calibration.js';

const module=new WebAssembly.Module(readFileSync(new URL(
 '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function fixture(){
 const state=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 const template=structuredClone(state.workers[0]);
 state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
  if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
  loaded.set(`${x},${z}`,session.core.chunkPayload());
 }
 session.actorSectorRevision({worker:true});
 const w=session.core.wasm;let center;
 for(let z=-12;z<=12&&!center;z+=2)for(let x=-12;x<=12&&!center;x+=2){
  const cx=x+.2,cz=z+.2;
  if(w.spatial_execution_segment_clear(cx-6,cz,cx+6,cz,.28)===1&&
     w.spatial_execution_segment_clear(cx,cz-6,cx,cz+6,.28)===1)center={x:cx,z:cz};
 }
 assert(center,'resident worker corridors must have continuous native clearance');
 const point=(x,z)=>({x:center.x+x,z:center.z+z});
 const workers=[1,2].map((id)=>({...structuredClone(template),id:`worker-${900010+id}`,
  ...point(-6,0),status:'returning',taskId:null,incapacitated:false,recovering:false,radius:.28}));
 state.workers=workers;
 const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);
 function home(index,origin,points){
  session.actorSectorRevision({worker:true});
  const ptr=w.nav_intent_attack_route_input_ptr(points.length);
  new Float32Array(w.memory.buffer,ptr,points.length*2).set(points.flatMap(p=>[p.x,p.z]));
  const end=points.at(-1);
  assert.equal(w.nav_intent_restore_home(900011+index,origin.x,origin.z,end.x,end.z,points.length),1);
  return bridge.intentChanges().at(-1).routeHandle;
 }
 return {state,session,w,workers,bridge,point,home,nav:createSpatialNavigationMovement(session,state)};
}
const prepare=(f,handle,facts={})=>{
 const result=f.bridge.prepareNativeRouteMotion(handle,{radius:.28,...facts});
 assert.equal(result.status,'prepared',JSON.stringify(result));return result;
};

test('worker motion prepares the existing native route with exact version revocation and no new planner',()=>{
 const f=fixture();
 try{
  const handle=f.home(0,f.point(-6,0),[f.point(0,0),f.point(6,0)]),
   points=f.bridge.routePoints(handle),queries=f.w.nav_intent_route_queries(),sequence=f.w.nav_intent_transition_sequence();
  const result=prepare(f,handle),motion=result.motionPlan;
  assert.equal(motion.motionMode,'worker');assert.equal(motion.executionScope,'static-desert-worker');
  assert.equal(motion.speed,L.walkMetresPerSecond*WORKER_SPEED_MULTIPLIER);
  assert.equal(motion.authorizedAutonomy,false);assert.deepEqual(motion.points,points);
  assert.equal(f.bridge.nativeRouteTiming(handle),null);
  const [event]=f.bridge.intentChanges();assert.equal(event.type,'RouteReplaced');
  assert.deepEqual(event.revokedRouteHandle,handle);assert.deepEqual(event.routeHandle,result.routeHandle);
  assert.equal(event.sequence,sequence+1);assert.equal(motion.assignmentSequence,event.sequence);
  assert.equal(f.w.nav_intent_route_queries(),queries);
 }finally{f.session.dispose();}
});

test('native worker timetable preserves walking, carry, urgency, flight, slow and run-budget phase rules',()=>{
 const f=fixture();
 try{
  const cases=[{}, {urgent:true}, {carrying:true,urgent:true}, {flight:true},
   {flight:true,slow:true,incapacitated:true}, {urgent:true,slow:true},
   {urgent:true,recovering:true}, {urgent:true,incapacitated:true},
   {flight:true,carrying:true,slow:true}];
  for(const facts of cases){
   const initial=f.point(-6,0),handle=f.home(0,initial,[initial,f.point(0,0),f.point(0,0),f.point(6,0)]),
    {routeHandle,motionPlan}=prepare(f,handle,{...facts,runRemaining:3.25});
   const actor={...initial,path:Array.from({length:motionPlan.points.length/2},(_,i)=>({
    x:motionPlan.points[i*2],z:motionPlan.points[i*2+1]})),runRemaining:3.25,
    runPhase:0,walkPhase:0,carryPhase:0,recovering:!!facts.recovering,incapacitated:!!facts.incapacitated};
   let elapsed=0;
   for(let i=0;i<2000&&actor.path.length;i++){
    const dt=[.02,.137,.31][i%3];elapsed+=dt;
    moveWorker(actor,dt,facts);
    const expected=f.bridge.sampleNativeRoute(routeHandle,10+elapsed);
    const label=JSON.stringify(facts);
    assert(Math.hypot(actor.x-expected.x,actor.z-expected.z)<1e-7,label);
    for(const key of ['runPhase','walkPhase','carryPhase','runRemaining'])
     assert(Math.abs(actor[key]-expected[key])<1e-7,`${label}: ${key}`);
   }
   assert.equal(actor.path.length,0);
   assert.equal(f.bridge.sampleNativeRoute(routeHandle,motionPlan.endTime).arrived,true);
  }
 }finally{f.session.dispose();}
});

test('common reservation solver includes a worker run-to-walk transition inside a geometric edge',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),bottom=f.point(0,-4.2);
  f.w.spatial_body_upsert(1,left.x,left.z,.28,0,1);
  f.w.spatial_body_upsert(2,bottom.x,bottom.z,.28,0,1);
  const a=prepare(f,f.home(0,left,[f.point(6,0)]),{urgent:true,runRemaining:3.25}),
   b=prepare(f,f.home(1,bottom,[f.point(0,6)]));
  assert.equal(a.motionPlan.points.length,2,'speed change is not a waypoint');
  assert.equal(f.bridge.reserveNativeRoute(a.routeHandle,1).status,'reserved');
  const result=f.bridge.reserveNativeRoute(b.routeHandle,2);
  assert.equal(result.status,'conflict');assert.equal(result.conflict.kind,'trajectory');
  assert(result.conflict.at>13&&result.conflict.at<14);
 }finally{f.session.dispose();}
});

test('worker timing and reservations do not revalidate per evaluation or modify tasks/game state',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),result=prepare(f,f.home(0,left,[f.point(6,0)]),{urgent:true,runRemaining:3.25});
  f.w.spatial_body_upsert(1,left.x,left.z,.28,0,1);
  assert.equal(f.bridge.reserveNativeRoute(result.routeHandle,1).status,'reserved');
  f.bridge.intentChanges();const before=structuredClone(f.state),
   checks=f.w.spatial_execution_clearance_checks(),queries=f.w.nav_intent_route_queries(),
   reservations=f.w.nav_intent_route_reservation_checks();
  for(let i=0;i<1000;i++)assert(f.bridge.sampleNativeRoute(result.routeHandle,10+i/100));
  assert.equal(f.w.spatial_execution_clearance_checks(),checks);
  assert.equal(f.w.nav_intent_route_queries(),queries);
  assert.equal(f.w.nav_intent_route_reservation_checks(),reservations);
  assert.deepEqual(f.state,before);assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('worker static sweep preserves the legacy guards and refuses unmodelled gate passages',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),right=f.point(6,0);
  for(let i=0;i<=240;i++){
   const p=f.point(-6+12*i/240,0);
   assert(f.nav.terrainValid(p.x,p.z,.28,true));assert(f.nav.walkable(p.x,p.z,.28,null,true));
  }
  const handle=f.home(0,left,[right]),middle=f.point(0,0),
   wall=f.session.core.addBarrier(middle.x,middle.z,.15,1,1);
  assert(wall>0);f.session.actorSectorRevision({worker:true});
  assert.equal(f.w.spatial_local_clear(middle.x-.5,middle.z,middle.x+.5,middle.z),1,
   'legacy worker graph admits the automatic passage');
  assert.equal(f.w.spatial_execution_segment_clear(left.x,left.z,right.x,right.z,.28),-2,
   'static proof cannot pretend that gate leaves/timing have been migrated');
  assert.equal(f.bridge.prepareNativeRouteMotion(handle,{radius:.28}).status,'unsupported');
  assert(f.bridge.routePoints(handle),'failed preparation leaves the old route/version intact');
 }finally{f.session.dispose();}
});

test('motion changes cannot retime an active reservation or silently carry a spent budget through rerouting',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),result=prepare(f,f.home(0,left,[f.point(6,0)]),{urgent:true,runRemaining:3.25});
  f.w.spatial_body_upsert(1,left.x,left.z,.28,0,1);
  assert.equal(f.bridge.reserveNativeRoute(result.routeHandle,1).status,'reserved');
  const sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.bridge.prepareNativeRouteMotion(result.routeHandle,{radius:.28,carrying:true}).status,'unsupported');
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteTiming(result.routeHandle));
  assert.equal(f.w.nav_intent_cancel_home(900011),1);
  const replacement=f.home(0,left,[f.point(6,0)]);
  assert.equal(f.bridge.nativeRouteTiming(replacement),null,'new intention requires fresh policy facts');
  const next=prepare(f,replacement,{carrying:true,runRemaining:1});
  assert.equal(next.motionPlan.runDistance,0);
 }finally{f.session.dispose();}
});

test('the same motion preparation consumes committed direct, watering and repair task routes',()=>{
 for(const [taskKind,targetKind] of [[0,0],[1,1],[2,3]]){
  const f=fixture();
  try{
   const left=f.point(-6,0),right=f.point(6,0),workerId=900011,targetId=990001,taskId=990002,
    center=Number(/-(\d+)$/.exec(f.workers[0].centerId)[1]);
   if(taskKind===2)assert(f.session.core.addBarrier(right.x,right.z,1.09,.22,0)>0);
   f.session.actorSectorRevision({worker:true});
   const rows=[
    [1,1,workerId,center,left.x,left.z,1,0,0,1],
    [1,2,targetId,targetKind,right.x,right.z,1,0,0,1],
    [1,3,taskId,center,taskKind,0,0,targetId,1,1],
   ],ptr=f.w.nav_intent_changes_ptr(rows.length);
   new Float64Array(f.w.memory.buffer,ptr,rows.length*10).set(rows.flat());
   assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,rows.length),1);
   assert.equal(f.w.nav_intent_plan_tasks(),1);assert.equal(f.w.nav_intent_commit(),1);
   const handle=f.bridge.intentChanges().at(-1).routeHandle,
    queries=f.w.nav_intent_route_queries(),result=prepare(f,handle,{urgent:true,runRemaining:2});
   assert.equal(f.w.nav_intent_route_queries(),queries,`task kind ${taskKind}`);
   assert.equal(result.motionPlan.actorId,workerId);assert.equal(result.motionPlan.motionMode,'worker');
   assert.equal(f.w.nav_intent_actor(workerId),1);
   const active=new Float64Array(f.w.memory.buffer,f.w.nav_intent_actor_ptr(),10);
   assert.deepEqual([...active.slice(0,4)],[workerId,1,taskId,targetId],
    'motion does not replace the task/target/lease or apply consequences');
   assert.equal(f.bridge.sampleNativeRoute(result.routeHandle,result.motionPlan.endTime).arrived,true);
  }finally{f.session.dispose();}
 }
});

test('zero-length worker routes and malformed policy updates remain finite and atomic',()=>{
 const f=fixture();
 try{
  // Use representable float origins for an exactly zero-distance stored route.
  const p=f.point(-6,0),origin={x:Math.fround(p.x),z:Math.fround(p.z)},
   {routeHandle,motionPlan}=prepare(f,f.home(0,origin,[origin,origin]),{urgent:true,runRemaining:3.25}),
   sample=f.bridge.sampleNativeRoute(routeHandle,10);
  assert.equal(motionPlan.duration,0);assert.equal(sample.arrived,true);
  for(const key of ['runPhase','walkPhase','carryPhase','phase','duration','distance'])assert.equal(sample[key],0);
  assert.equal(sample.runRemaining,3.25);
  const sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.w.nav_intent_route_prepare_motion(routeHandle.session,routeHandle.slot,
   routeHandle.generation,.28,64,3.25),-7);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.deepEqual(f.bridge.nativeRouteTiming(routeHandle),motionPlan);
  assert.throws(()=>f.bridge.prepareNativeRouteMotion(routeHandle,{radius:.28,urgent:1}),/policy facts/);
  f.state.elapsed=11;
  assert.equal(f.bridge.prepareNativeRouteMotion(routeHandle,{radius:.28}).status,'unsupported',
   'late conversion must not restart an old intention at its original pose');
  assert.deepEqual(f.bridge.nativeRouteTiming(routeHandle),motionPlan);
  f.state.elapsed=1e12;assert.equal(f.w.nav_intent_set_time(f.state.elapsed),1);
  const imprecise=f.home(0,f.point(-6,0),[f.point(6,0)]);
  assert.equal(f.bridge.prepareNativeRouteMotion(imprecise,{radius:.28}).status,'unsupported',
   'clock quantization cannot exceed the continuous conflict solver rounding bound');
  assert(f.bridge.routePoints(imprecise));
 }finally{f.session.dispose();}
});
