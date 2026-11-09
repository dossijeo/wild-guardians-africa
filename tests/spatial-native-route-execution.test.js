import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';

const module=new WebAssembly.Module(readFileSync(new URL(
 '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function fixture(){
 const state=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString()),template=structuredClone(state.workers[0]);
 state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
  if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
  loaded.set(`${x},${z}`,session.core.chunkPayload());
 }
 session.actorSectorRevision({worker:false,species:'warthog'});
 const w=session.core.wasm;let center;
 for(let z=-12;z<=12&&!center;z+=2)for(let x=-12;x<=12&&!center;x+=2){
  const cx=x+.2,cz=z+.2,clear=(a,b)=>w.spatial_execution_segment_clear(...a,...b,1.1)===1;
  if(clear([cx-6,cz],[cx+6,cz])&&clear([cx,cz-6],[cx,cz+6])&&
     clear([cx-6,cz+6],[cx+6,cz+6])&&clear([cx-6,cz-3.3],[cx+6,cz-3.3]))center={x:cx,z:cz};
 }
 assert(center,'native fixture requires several continuously clear corridors');
 const point=(x,z)=>({x:center.x+x,z:center.z+z});
 state.workers=[1,2,3,4].map(i=>({...structuredClone(template),id:`worker-${900010+i}`,
  ...point(-6,0),status:'returning',taskId:null,incapacitated:false,recovering:false,radius:.28}));
 state.plants=[{id:'plant-900099',species:'mijo',alive:true,...point(6,0)}];
 const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);
 function worker(id,start,end,facts={},task=false){
  session.actorSectorRevision({worker:true});
  if(task){
   const centerId=Number(/-(\d+)$/.exec(state.workers[id-1].centerId)[1]),rows=[
    [1,1,900010+id,centerId,start.x,start.z,1,0,0,1],
    [1,2,910000+id,0,end.x,end.z,1,0,0,0],
    [1,3,920000+id,centerId,0,0,0,910000+id,1,1],
   ],ptr=w.nav_intent_changes_ptr(rows.length);
   new Float64Array(w.memory.buffer,ptr,rows.length*10).set(rows.flat());
   assert.equal(w.nav_intent_apply_changes(w.nav_intent_last_sequence()+1,rows.length),1);
   assert.equal(w.nav_intent_plan_tasks(),1);assert.equal(w.nav_intent_commit(),1);
  }else{
   const ptr=w.nav_intent_attack_route_input_ptr(1);
   new Float32Array(w.memory.buffer,ptr,2).set([end.x,end.z]);
   assert.equal(w.nav_intent_restore_home(900010+id,start.x,start.z,end.x,end.z,1),1);
  }
  const handle=bridge.intentChanges().at(-1).routeHandle,
   prepared=bridge.prepareNativeRouteMotion(handle,{radius:.28,...facts});
  assert.equal(prepared.status,'prepared');bridge.intentChanges();
  assert.equal(w.spatial_body_upsert(id,start.x,start.z,.28,0,facts.incapacitated?3:1),1);
  assert.equal(bridge.reserveNativeRoute(prepared.routeHandle,id).status,'reserved');
  return prepared.routeHandle;
 }
 function animal(start,end){
  session.actorSectorRevision({worker:false,species:'warthog'});
  const ptr=w.nav_intent_attack_route_input_ptr(1);new Float32Array(w.memory.buffer,ptr,2).set([end.x,end.z]);
  assert.equal(w.nav_intent_register_attack(900050,900099,start.x,start.z,1,1,1.1),1);
  const handle=bridge.intentChanges().at(-1).routeHandle;
  assert.equal(w.spatial_body_upsert(10,start.x,start.z,1.1,1,9),1);
  assert.equal(bridge.reserveNativeRoute(handle,10).status,'reserved');return handle;
 }
 function body(id){
  const n=w.spatial_bodies_near(center.x,center.z,1e6),rows=new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),n*6);
  for(let i=0;i<n;i++)if(rows[i*6]===id)return {x:rows[i*6+1],z:rows[i*6+2],radius:rows[i*6+3],kind:rows[i*6+4],flags:rows[i*6+5]};
  return null;
 }
 function advance(at){
  const previous=state.elapsed;state.elapsed=at;
  const result=bridge.advanceNativeRouteExecution(at);
  if(result.status!=='advanced')state.elapsed=previous;
  return result;
 }
 return {state,session,w,bridge,point,worker,animal,body,advance};
}

test('common native execution moves worker/animal bodies without JS motion, planning or collision validation',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,6),f.point(6,6),{urgent:true,runRemaining:3.25}),
   b=f.animal(f.point(-6,0),f.point(6,0)),actors=structuredClone(f.state.workers);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const checks=f.w.spatial_execution_clearance_checks(),queries=f.w.nav_intent_route_queries(),
   admissions=f.w.nav_intent_route_reservation_checks(),pairs=f.w.nav_intent_route_reservation_pairs(),
   validations=f.w.nav_intent_route_validation_count(),sequence=f.w.nav_intent_transition_sequence(),
   samples=f.w.nav_intent_route_time_samples(),evaluations=f.w.nav_intent_execution_evaluations();
  for(let i=1;i<=100;i++)assert.equal(f.advance(10+i*.02).status,'advanced');
  for(const [handle,id] of [[a,1],[b,10]]){
   const actual=f.bridge.nativeRouteExecution(handle),expected=f.bridge.sampleNativeRoute(handle,12),physical=f.body(id);
   assert.equal(actual.executedThrough,12);assert.equal(actual.x,expected.x);assert.equal(actual.z,expected.z);
   assert.equal(physical.x,actual.x);assert.equal(physical.z,actual.z);
  }
  assert.equal(f.w.nav_intent_execution_evaluations()-evaluations,200,'one evaluation per moving actor per logical step');
  assert.equal(f.w.nav_intent_route_time_samples(),samples+2,'no sampling/publication API is needed during execution');
  assert.equal(f.w.spatial_execution_clearance_checks(),checks);assert.equal(f.w.nav_intent_route_queries(),queries);
  assert.equal(f.w.nav_intent_route_reservation_checks(),admissions);assert.equal(f.w.nav_intent_route_reservation_pairs(),pairs);
  assert.equal(f.w.nav_intent_route_validation_count(),validations);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.deepEqual(f.state.workers,actors,'product entities have not been switched to this opt-in executor');
  assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('native execution enforces logical clock ordering, pause idempotence and explicit arrival/action boundaries',()=>{
 const f=fixture();
 try{
  const handle=f.worker(1,f.point(-6,0),f.point(6,0),{urgent:true,runRemaining:3.25});
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const initial=f.body(1),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.w.nav_intent_set_time(11),0,'a clock setter cannot skip native execution');
  assert.equal(f.w.nav_intent_action_active(900011),0,'movement cannot become work before arrival');
  assert.equal(f.advance(10).routes,0);assert.equal(f.advance(9).status,'invalid-time');
  assert.deepEqual(f.body(1),initial);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.advance(11).status,'advanced');assert.equal(f.advance(13).status,'advanced');
  assert.equal(f.bridge.nativeRouteExecution(handle).runRemaining,0);
  assert.equal(f.advance(30).status,'advanced');const arrived=f.body(1),evaluations=f.w.nav_intent_execution_evaluations();
  assert.equal(f.bridge.nativeRouteExecution(handle).arrived,true);
  assert.equal(f.w.nav_intent_route_reservation_count(),1,'arrival retains the stationary destination');
  assert.deepEqual(f.bridge.intentChanges(),[],'arrival alone cannot apply a task action/damage');
  f.advance(31);assert.deepEqual(f.body(1),arrived);
  assert.equal(f.w.nav_intent_execution_evaluations(),evaluations,'held arrivals do not reevaluate their route');
  assert.equal(f.w.nav_intent_action_active(900011),1);
  const [event]=f.bridge.intentChanges();assert.equal(event.type,'RouteCompleted');
  assert.deepEqual(event.revokedRouteHandle,handle);assert.equal(event.effectiveTime,31);
  assert.equal(f.bridge.nativeRouteExecution(handle),null);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
 }finally{f.session.dispose();}
});

test('a stopped native route invalidates only future conflicts and iteratively propagates newly held discs',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0),{flight:true}),
   b=f.worker(2,f.point(0,-6),f.point(0,6)),
   c=f.worker(3,f.point(-6,-3.3),f.point(6,-3.3)),
   d=f.worker(4,f.point(-6,6),f.point(6,6),{flight:true});
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.advance(12.5);
  const before=[1,2,3,4].map(id=>f.body(id));
  assert.equal(f.w.nav_intent_cancel_home(900011),1);
  const events=f.bridge.intentChanges();assert.equal(events.length,3);
  assert.deepEqual(events.map(e=>e.revokedRouteHandle),[a,b,c]);
  assert(events.every(e=>e.effectiveTime===12.5));
  assert.equal(f.w.nav_intent_execution_stop_invalidations(),2);
  assert.equal(f.w.nav_intent_route_reservation_count(),1);assert(f.bridge.nativeRouteExecution(d));
  for(const [handle,id] of [[b,900012],[c,900013]]){
   assert.equal(f.bridge.nativeRouteExecution(handle),null);assert.equal(f.w.nav_intent_actor(id),1);
   const row=new Float64Array(f.w.memory.buffer,f.w.nav_intent_actor_ptr(),10);assert.equal(row[1],0,'needs-plan, not lost intention');
  }
  assert.equal(f.advance(13).status,'advanced');
  for(let id=1;id<=3;id++)assert.deepEqual(f.body(id),before[id-1]);
  assert.notDeepEqual(f.body(4),before[3]);
 }finally{f.session.dispose();}
});

test('a static world mutation aborts the entire execution advance before clock or body writes',()=>{
 const f=fixture();
 try{
  const handle=f.worker(1,f.point(-6,0),f.point(6,0));f.bridge.beginNativeRouteExecution();f.advance(11);
  const before=f.body(1),clock=f.w.nav_intent_effective_time(),updates=f.w.nav_intent_execution_body_updates();
  const p=f.point(40,40);assert(f.session.core.addWall(p.x,p.z,.2,.2)>0);
  assert.equal(f.advance(12).status,'world-changed');
  assert.equal(f.w.nav_intent_effective_time(),clock);assert.deepEqual(f.body(1),before);
  assert.equal(f.w.nav_intent_execution_body_updates(),updates);
  assert.equal(f.bridge.nativeRouteExecution(handle).executedThrough,11);
  assert.equal(f.bridge.stopNativeRouteExecution(),1);
  assert.equal(f.bridge.nativeRouteExecution(handle),null);assert.equal(f.w.nav_intent_route_reservation_count(),0);
  assert.equal(f.advance(12).status,'inactive');
 }finally{f.session.dispose();}
});

test('physical removal/reset do not turn disappearing bodies into stop obstacles or retain stale executions',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0),{flight:true}),
   b=f.worker(2,f.point(0,-6),f.point(0,6));
  f.bridge.beginNativeRouteExecution();f.advance(12.5);
  assert.equal(f.w.spatial_body_remove(1),1);
  assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[a]);
  assert.equal(f.w.nav_intent_route_reservation_count(),1);assert.equal(f.w.nav_intent_execution_stop_invalidations(),0);
  assert.equal(f.advance(13).status,'advanced');assert(f.bridge.nativeRouteExecution(b));
  f.w.spatial_bodies_reset();assert.equal(f.w.spatial_body_count(),0);
  assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,b);
  assert.equal(f.bridge.nativeRouteExecution(b),null);assert.equal(f.advance(14).status,'inactive');
 }finally{f.session.dispose();}
});

test('native execution rejects stale worker position projections and preserves atomic entity batches',()=>{
 const f=fixture();
 try{
  const handle=f.worker(1,f.point(-6,0),f.point(6,0));f.bridge.beginNativeRouteExecution();f.advance(11);
  const pose=f.bridge.nativeRouteExecution(handle),center=Number(/-(\d+)$/.exec(f.state.workers[0].centerId)[1]),
   sequence=f.w.nav_intent_last_sequence();
  const write=(x,z,acting=0)=>{
   const rows=[[1,2,900098,0,0,0,1,0,0,0],[1,1,900011,center,x,z,0,acting,0,1]],
    ptr=f.w.nav_intent_changes_ptr(rows.length);
   new Float64Array(f.w.memory.buffer,ptr,rows.length*10).set(rows.flat());
   return f.w.nav_intent_apply_changes(sequence+1,rows.length);
  };
  const targets=f.w.nav_intent_target_count();
  assert.equal(write(f.point(-6,0).x,f.point(-6,0).z),0,'JS cannot overwrite the native position');
  assert.equal(f.w.nav_intent_last_sequence(),sequence);assert.equal(f.w.nav_intent_target_count(),targets);
  assert.equal(write(pose.x,pose.z,1),0,'JS cannot begin a task action mid-route');
  assert.equal(write(pose.x,pose.z),1,'confirmed non-positional facts still enter in order');
 }finally{f.session.dispose();}
});

test('native body writes retain the existing physical spatial index and mutation fences',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),handle=f.worker(1,left,f.point(6,0));
  for(let id=100;id<180;id++){
   const p=f.point(1000+id*3,1000);assert.equal(f.w.spatial_body_upsert(id,p.x,p.z,.28,0,1),1);
  }
  f.bridge.beginNativeRouteExecution();f.advance(14);
  const pose=f.bridge.nativeRouteExecution(handle),near=p=>{
   const count=f.w.spatial_bodies_near(p.x,p.z,.01),rows=new Float64Array(f.w.memory.buffer,f.w.spatial_bodies_result_ptr(),count*6);
   return Array.from({length:count},(_,i)=>rows[i*6]);
  };
  assert(!near(left).includes(1));assert(near(pose).includes(1),'logical movement updates indexed cells');
  const p=f.point(0,0),before=f.body(100);
  assert.equal(f.w.spatial_body_upsert(100,p.x,p.z,.28,0,1),0,
   'a foreign mutation cannot enter the remaining corridor after native execution has begun');
  assert.deepEqual(f.body(100),before);assert.equal(f.w.spatial_body_count(),81);
 }finally{f.session.dispose();}
});

test('native animal arrival holds its body and cannot duplicate committed action boundaries or damage',()=>{
 const f=fixture();
 try{
  const handle=f.animal(f.point(-6,0),f.point(6,0)),plants=structuredClone(f.state.plants);
  f.bridge.beginNativeRouteExecution();f.advance(12);
  assert.equal(f.w.nav_intent_attack_action_active(900050),0);
  f.advance(20);const stopped=f.body(10);
  assert.equal(f.w.nav_intent_attack_action_active(900050),1);
  assert.equal(f.w.nav_intent_attack_action_active(900050),0);
  const [event]=f.bridge.intentChanges();assert.equal(event.type,'RouteCompleted');
  assert.deepEqual(event.revokedRouteHandle,handle);assert.equal(event.effectiveTime,20);
  assert.equal(f.w.nav_intent_attack_finished(900050),0);
  assert.equal(f.w.nav_intent_attack_finished(900050),-1);
  assert.deepEqual(f.body(10),stopped);assert.deepEqual(f.state.plants,plants);
  assert.equal(f.bridge.nativeRouteExecution(handle),null);
 }finally{f.session.dispose();}
});

test('execution cannot bootstrap a reservation whose static proof predates a world mutation',()=>{
 const f=fixture();
 try{
  const handle=f.worker(1,f.point(-6,0),f.point(6,0)),before=f.body(1),p=f.point(0,0);
  assert(f.session.core.addBarrier(p.x,p.z,.15,1,3)>0);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'world-changed',
   'capturing a new world stamp must not silently refresh an old continuous proof');
  assert.equal(f.advance(11).status,'inactive');assert.deepEqual(f.body(1),before);
  assert.equal(f.w.nav_intent_effective_time(),10);assert(f.bridge.nativeRouteTiming(handle));
  assert.equal(f.bridge.stopNativeRouteExecution(),1);
 }finally{f.session.dispose();}
});

test('traffic stop invalidation retains a committed worker task and target rather than reassigning the lease',()=>{
 const f=fixture();
 try{
  f.worker(1,f.point(-6,0),f.point(6,0),{flight:true});
  const b=f.worker(2,f.point(0,-6),f.point(0,6),{},true);
  f.bridge.beginNativeRouteExecution();f.advance(12.5);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);
  const events=f.bridge.intentChanges(),stopped=events.find(e=>e.revokedRouteHandle?.slot===b.slot);
  assert(stopped);assert.equal(f.w.nav_intent_actor(900012),1);
  const row=new Float64Array(f.w.memory.buffer,f.w.nav_intent_actor_ptr(),10);
  assert.deepEqual([...row.slice(0,4)],[900012,0,920002,910002]);
  assert.equal(f.w.nav_intent_plan_tasks(),0,'a route conflict cannot assign a second worker to the same task');
  assert.equal(f.w.nav_intent_task_count(),1);
 }finally{f.session.dispose();}
});
