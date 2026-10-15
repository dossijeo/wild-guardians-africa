import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';

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
     wasm.nav_intent_results_ptr(),count*6));
   return Array.from({length:count},(_,index)=>flat.slice(index*6,index*6+6));
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

  wasm.nav_intent_reset();
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
 }finally{session.dispose();}
});
