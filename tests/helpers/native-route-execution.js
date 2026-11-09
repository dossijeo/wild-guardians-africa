import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const module=new WebAssembly.Module(readFileSync(new URL(
 '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
export function createNativeRouteExecutionFixture({core=null}={}){
 const state=deserialize(gunzipSync(readFileSync(new URL(
  '../fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString()),template=structuredClone(state.workers[0]);
 state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;
 if(core){const first=state.villages[0];core.generate(state.seed,Math.floor((first.x+24)/48),
  Math.floor((first.z+24)/48),state.biome,state);}
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  ...(core?{core}:{}),
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
