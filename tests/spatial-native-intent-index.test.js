import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {canWaterFrom} from '../src/world/work-points.js';

const path=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const prototype=path?new WebAssembly.Module(readFileSync(path)):null;
const row=(op,kind,id,center=0,x=0,z=0,flag=0,target=0,created=0,rank=0)=>
 [op,kind,id,center,x,z,flag,target,created,rank];

test('incremental native task index plans, discards and commits one global assignment batch',
 {skip:!prototype&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
   './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString()),
   loaded=new Map(),session=createSpatialGameSession(prototype,game,{
     loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  let origin;
  for(let z=-10;z<=10&&!origin;z++)for(let x=-10;x<=10;x++){
   const a={x:x+.2,z:z+.2},b={x:x+1.2,z:z+.2};
   if(session.routeActor(a,b,{worker:true}).status==='found'){origin=a;break;}
  }
  assert(origin);session.actorRegions(origin,{worker:true});
  const wasm=session.core.wasm,second={x:origin.x+1,z:origin.z};
  const initial=[
   row(1,1,1,1,origin.x,origin.z,1,0,0,1),
   row(1,1,2,1,second.x,second.z,1,0,0,2),
   row(1,2,11,0,origin.x,origin.z,1),
   row(1,2,12,0,second.x,second.z,1),
   row(1,3,101,1,0,0,0,12,1,1),
   row(1,3,102,1,0,0,0,11,2,2)
  ];
  const write=(sequence,rows)=>{
   const ptr=wasm.nav_intent_changes_ptr(rows.length);
   new Float64Array(wasm.memory.buffer,ptr,rows.length*10).set(rows.flat());
   return wasm.nav_intent_apply_changes(sequence,rows.length);
  };
  const results=()=>{
   const count=wasm.nav_intent_plan_tasks();
   const flat=Array.from(new Float64Array(wasm.memory.buffer,
     wasm.nav_intent_results_ptr(),count*8));
   return Array.from({length:count},(_,index)=>flat.slice(index*8,index*8+8));
  };
  wasm.nav_intent_reset();
  assert.equal(write(1,initial),1);
  assert.equal(wasm.nav_intent_last_sequence(),1);
  assert.deepEqual([wasm.nav_intent_worker_count(),wasm.nav_intent_target_count(),
    wasm.nav_intent_task_count()],[2,2,2]);
  assert.equal(write(1,[row(0,2,11)]),0,'duplicate event sequence changes nothing');
  const first=results();
  assert.deepEqual(first.map(item=>[item[0],item[1],item[2]]),
   [[101,2,1],[102,1,1]],'FIFO and nearest worker selection share one batch');
  assert(wasm.nav_intent_route_queries()>=2);
  assert(wasm.nav_intent_route_point_count()>0);
  assert.equal(wasm.nav_intent_discard(),1);
  assert.deepEqual(results(),first,'discard leaves all leases available');
  assert.equal(wasm.nav_intent_commit(),2);
  assert.equal(results().length,0,'committed workers and tasks cannot be assigned twice');
  assert.equal(wasm.nav_intent_last_sequence(),1,'planning does not fabricate world events');
  assert.equal(wasm.nav_intent_change_count(),2,
   'one native intention is emitted for each committed worker assignment');
  assert.equal(wasm.nav_intent_actor(1),1);
  const active=Array.from(new Float64Array(wasm.memory.buffer,
   wasm.nav_intent_actor_ptr(),10));
  assert.deepEqual(active.slice(0,4),[1,1,102,11]);
  const [handleSession,handleSlot,handleGeneration]=active.slice(4,7);
  assert(wasm.nav_intent_route_points(handleSession,handleSlot,handleGeneration)>0);
  const queryCount=wasm.nav_intent_route_queries();
  assert.equal(wasm.nav_intent_actor(1),1);
  assert.equal(wasm.nav_intent_route_queries(),queryCount,
   'reading an active intent never replans during ordinary movement');
  wasm.nav_intent_clear_changes();
  assert.equal(write(2,[row(0,2,11)]),1);
  assert.equal(wasm.nav_intent_change_count(),1,
   'destroying a crop invalidates only its dependent worker');
  assert.equal(wasm.nav_intent_actor(1),0,
   'the destroyed target cannot remain in the active-intent registry');
  assert.equal(wasm.nav_intent_route_points(handleSession,handleSlot,handleGeneration),-1,
   'a released route handle cannot be reused');
  assert.equal(wasm.nav_intent_actor(2),1,'unaffected worker keeps its intention');
  assert.equal(wasm.nav_intent_invalidation_count(),1);
  assert.equal(write(3,[row(0,3,102),
   row(1,2,13,0,origin.x,origin.z,1),
   row(1,3,103,1,0,0,0,13,3,3)]),1);
  assert.deepEqual(results().map(item=>[item[0],item[1],item[2]]),
   [[103,1,1]],'the released worker can join the next global FIFO task batch');
  assert.equal(wasm.nav_intent_commit(),1);
  const barrier=session.core.applyBarrierChanges([],[{
   x:origin.x+5,z:origin.z+5,halfX:.35,halfZ:.35,passMask:0}]);
  try{
   assert.equal(wasm.nav_intent_reconcile_topology(),2);
   assert.equal(wasm.nav_intent_actor(2),1);
   const pending=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
   assert.deepEqual([pending[1],pending[2],pending[3]],[0,101,12],
    'a physical invalidation retains the worker task and target');
  }finally{session.core.applyBarrierChanges(barrier,[]);}
  assert.equal(wasm.nav_intent_replan_pending_routes(),2);
  assert.equal(wasm.nav_intent_actor(2),1);
  assert.equal(new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10)[1],1);
  assert.equal(wasm.nav_intent_action_active(2),1);
  assert.equal(wasm.nav_intent_finish(2),1);
  assert.equal(wasm.nav_intent_actor(2),0);
  assert.equal(wasm.nav_intent_task_count(),1,
   'a completed task is removed rather than being reserved a second time');
  assert.equal(write(4,[row(1,2,13,0,origin.x+.1,origin.z,1)]),1);
  assert.equal(wasm.nav_intent_actor(1),1);
  const moved=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
  assert.deepEqual([moved[1],moved[2],moved[3]],[0,103,13],
   'a moved target invalidates its route without cancelling the task');
  assert.equal(wasm.nav_intent_replan_pending_routes(),1);

  wasm.nav_intent_reset();
  assert.equal(wasm.nav_intent_route_points(handleSession,handleSlot,handleGeneration),-1,
   'restoring a session rejects previous route handles');
  assert.equal(write(1,initial),1);
  assert.deepEqual(results(),first,'a restored entity snapshot recreates decisions');
  session.actorRegions(origin,{worker:false,species:'warthog'});
  assert.equal(wasm.nav_intent_commit(),0,
   'changing the movement profile invalidates provisional worker routes');
  session.actorRegions(origin,{worker:true});
  assert.deepEqual(results(),first,'worker profile replans deterministically');
  const barriers=session.core.applyBarrierChanges([],[{
   x:(origin.x+second.x)/2,z:origin.z,halfX:.4,halfZ:.4,passMask:0}]);
  try{
   assert.equal(wasm.nav_intent_commit(),0,
    'a physical topology change invalidates provisional routes');
  }finally{session.core.applyBarrierChanges(barriers,[]);}
  assert.deepEqual(results(),first,'removing the temporary barrier restores the route');
  assert.equal(write(3,[row(0,2,11)]),0,'skipped sequence is rejected');
  assert.equal(write(2,[row(0,2,11)]),1);
  assert.equal(wasm.nav_intent_commit(),0,'a target removal invalidates provisional leases');
  assert.deepEqual(results().map(item=>item[0]),[101],
   'a removed target cannot reappear from a cached result');

  wasm.nav_intent_reset();
  assert.equal(write(1,[row(1,1,1,1,origin.x,origin.z,1),
   row(1,2,13,1,second.x,second.z,1),
   row(1,3,103,1,1,0,0,13,3)]),1);
  const water=results()[0];
  assert.equal(water[2],1,'watering has a physical service point');
  assert(Math.abs(Math.hypot(water[6]-second.x,water[7]-second.z)-.83)<1e-6);
  assert(water[4]>0,'the service point includes a native route');
  const nav=createSpatialNavigationMovement(session,game);
  assert(canWaterFrom({x:water[6],z:water[7],radius:.28},
   {x:second.x,z:second.z,species:'mijo'},nav),
  'the native watering approach passes the game interaction rule');
  assert.equal(write(2,[row(1,3,103,1,2,0,0,13,3)]),1);
  assert.equal(wasm.nav_intent_plan_tasks(),-2,
   'mismatched task/target geometry is an input error, not physical blockage');
  assert.equal(wasm.nav_intent_commit(),0,'invalid metadata cannot commit an old proposal');

  const wall=session.core.applyBarrierChanges([],[{
   x:second.x,z:second.z,halfX:.4,halfZ:.4,passMask:0}]);
  try{
   session.actorRegions(origin,{worker:true});
   wasm.nav_intent_reset();
   assert.equal(write(1,[row(1,1,1,1,origin.x,origin.z,1),
    row(1,2,14,3,second.x,second.z,1,0,0,1),
    row(1,3,104,1,2,0,0,14,4)]),1);
   const repair=results()[0];
   assert.equal(repair[2],1,'repair finds an approach outside the physical wall');
   assert(session.actorCanStand({x:repair[6],z:repair[7]},{worker:true}));
   assert(repair[4]>0);
  }finally{session.core.applyBarrierChanges(wall,[]);}

  wasm.nav_intent_reset();
  assert.equal(write(1,initial),1);
  assert.equal(results().length,2);
  assert.equal(wasm.nav_intent_commit(),2);
  wasm.nav_intent_clear_changes();
  assert.equal(write(2,[row(0,2,11),row(0,3,102)]),1);
  assert.equal(wasm.nav_intent_change_count(),1,
   'simultaneous target and task removal coalesce one actor invalidation');
  assert.equal(wasm.nav_intent_actor(1),0);
  assert.equal(wasm.nav_intent_actor(2),1);
 }finally{session.dispose();}
});
