import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {reserveTasks} from '../src/simulation/tasks.js';
import {wateringRoute} from '../src/world/work-points.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const numeric=value=>Number(/-(\d+)$/.exec(value)[1]);
const row=(op,kind,id,center=0,x=0,z=0,flag=0,target=0,created=0,rank=0)=>
 [op,kind,id,center,x,z,flag,target,created,rank];

function compare(fixture,workerId,{singleWaterTask=false}={}){
 const game=deserialize(gunzipSync(readFileSync(new URL(fixture,import.meta.url))).toString());
 const worker=game.workers.find(w=>w.id===workerId);
 const old=game.tasks.find(t=>t.id===worker.taskId);
 if(old)old.workerId=null;
 worker.taskId=null;worker.status='idle';worker.contractDay=game.day;
 if(singleWaterTask){
  const plant=game.plants.filter(p=>p.alive&&p.centerId===worker.centerId)
   .sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-
     Math.hypot(b.x-worker.x,b.z-worker.z))[0];
  game.tasks=[{id:'task-999999',created:1,centerId:worker.centerId,
   kind:'water',targetId:plant.id,workerId:null,blocked:false}];
 }
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const village=game.villages[0],cx=Math.floor((village.x+24)/48),
   cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,game);
  nav.setActiveBounds([(cx-4)*48-24,(cz-4)*48-24,
   (cx+4)*48+24,(cz+4)*48+24]);
  session.actorRegions(worker,{worker:true});
  const changes=[row(1,1,numeric(worker.id),numeric(worker.centerId),
   worker.x,worker.z,1,0,0,numeric(worker.id))];
  const wanted=new Set(game.tasks.filter(t=>!t.workerId).map(t=>t.targetId));
  for(const plant of game.plants)if(wanted.has(plant.id))changes.push(
   row(1,2,numeric(plant.id),plant.species==='platano'?2:1,
    plant.x,plant.z,plant.alive?1:0));
  for(const task of game.tasks)if(!task.workerId)changes.push(
   row(1,3,numeric(task.id),numeric(task.centerId),
    task.kind==='water'||task.kind==='initial'?1:0,0,0,
    numeric(task.targetId),task.created,numeric(task.id)));
  const wasm=session.core.wasm;
  wasm.nav_intent_reset();
  const pointer=wasm.nav_intent_changes_ptr(changes.length);
  new Float64Array(wasm.memory.buffer,pointer,changes.length*10).set(changes.flat());
  assert.equal(wasm.nav_intent_apply_changes(1,changes.length),1);
  const count=wasm.nav_intent_plan_tasks();
  assert(count>=0);
  const flat=Array.from(new Float64Array(wasm.memory.buffer,
   wasm.nav_intent_results_ptr(),count*8));
  const planned=Array.from({length:count},(_,index)=>flat.slice(index*8,index*8+8));
  let jsCandidates=0;
  reserveTasks(game,(candidate,task,target)=>{
   jsCandidates++;
   try{return wateringRoute(candidate,target,nav);}catch(error){
    if(error.name==='SpatialChunkUnavailable')return null;
    throw error;
   }
  });
  return {jsTask:worker.taskId,
   nativeTask:planned.find(result=>result[2]===1)?.[0]??null,
   statuses:planned.map(result=>result[2]),
   jsCandidates,nativeQueries:wasm.nav_intent_route_queries()};
 }finally{session.dispose();}
}

test('native intent matches a real Desert watering interaction',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const result=compare('./fixtures/desierto983-d15-partial-state.json.gz',
  'worker-9263',{singleWaterTask:true});
 assert.equal(result.jsTask,'task-999999');
 assert.equal(result.nativeTask,999999);
 assert.equal(result.jsCandidates,1);
 assert.equal(result.nativeQueries,1);
});

test('unknown Gran Cañón task region remains pending in one native batch',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const result=compare('./fixtures/watering-gran-canon-saheliana-detour-10.json.gz',
  'worker-16');
 assert.equal(result.jsTask,null);
 assert.equal(result.nativeTask,null);
 assert(result.statuses.every(status=>status===3));
 assert(result.nativeQueries>=result.jsCandidates,
  'each pending task examines at least its first interaction point');
 assert(result.nativeQueries<=result.jsCandidates*8,
  'an unknown first point may require the other bounded watering angles');
});
