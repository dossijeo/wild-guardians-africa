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
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 state.workers=[];state.tasks=[];state.crates=[];state.spells=[];state.elapsed=10;
 state.raid=null;
 state.plants=[1,2,3].map(id=>({id:`plant-${900000+id}`,species:'mijo',alive:true,x:id,z:0}));
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
  if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
  loaded.set(`${x},${z}`,session.core.chunkPayload());
 }
 session.actorSectorRevision({worker:false,species:'warthog'});
 const w=session.core.wasm,bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);
 let center;
 for(let z=-12;z<=12&&!center;z+=2)for(let x=-12;x<=12&&!center;x+=2){
  const cx=x+.2,cz=z+.2;
  if(w.spatial_execution_segment_clear(cx-6,cz,cx+6,cz,1.1)===1&&
     w.spatial_execution_segment_clear(cx,cz-6,cx,cz+6,1.1)===1)center={x:cx,z:cz};
 }
 assert(center,'fixture needs two continuously clear crossing native corridors');
 const point=(x,z)=>({x:center.x+x,z:center.z+z});
 function body(id,p,{radius=1.1,kind=1,flags=9}={}){
  return w.spatial_body_upsert(id,p.x,p.z,radius,kind,flags);
 }
 function route(id,origin,points,{at=10,timed=true}={}){
  state.elapsed=at;assert.equal(w.nav_intent_set_time(at),1);
  session.actorSectorRevision({worker:false,species:'warthog'});
  const ptr=w.nav_intent_attack_route_input_ptr(points.length);
  new Float32Array(w.memory.buffer,ptr,points.length*2).set(points.flatMap(p=>[p.x,p.z]));
  assert.equal(w.nav_intent_register_attack(910000+id,900000+id,
   origin.x,origin.z,points.length,timed?1:0,1.1),1);
  return bridge.intentChanges().at(-1).routeHandle;
 }
 function rows(){
  const count=w.spatial_bodies_near(center.x,center.z,100);
  return [...new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),count*6)];
 }
 return {state,session,w,bridge,point,body,route,rows};
}

test('native reservation anticipates a crossing of complete trajectories before bodies overlap',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),bottom=f.point(0,-6);
  assert.equal(f.body(1,left),1);assert.equal(f.body(2,bottom),1);
  const a=f.route(1,left,[f.point(6,0)]),b=f.route(2,bottom,[f.point(0,6)]);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'reserved');
  const sequence=f.w.nav_intent_transition_sequence(),before=f.rows(),result=f.bridge.reserveNativeRoute(b,2);
  assert.equal(result.status,'conflict');assert.equal(result.conflict.kind,'trajectory');
  assert.equal(result.conflict.actorId,910001);assert.equal(result.conflict.bodyId,1);
  assert(result.conflict.at>10&&result.conflict.at<14,'reject before the crossing, not after overlap');
  assert.equal(result.conflict.generation,a.generation);
  assert.equal(f.w.nav_intent_route_reservation_count(),1);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence,'admission failure does not revoke either candidate');
  assert(f.bridge.nativeRouteTiming(a));assert(f.bridge.nativeRouteTiming(b));
  assert.deepEqual(f.rows(),before);assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('the same geometric crossing is admitted when native timetables do not conflict',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),bottom=f.point(0,-6);
  f.body(1,left);f.body(2,bottom);
  const a=f.route(1,left,[f.point(6,0)]);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'reserved');
  const b=f.route(2,bottom,[f.point(0,6)],{at:20});
  const result=f.bridge.reserveNativeRoute(b,2);
  assert.equal(result.status,'reserved');assert.equal(result.authorizedAutonomy,false);
  assert.equal(f.w.nav_intent_route_reservation_count(),2);
  assert.equal(f.bridge.reserveNativeRoute(b,2).status,'reserved','admission is idempotent');
 }finally{f.session.dispose();}
});

test('a completed timetable retains its destination disc instead of disappearing from traffic',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),bottom=f.point(0,-6);
  f.body(1,left);f.body(2,bottom);
  const a=f.route(1,left,[f.point(0,0)]);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'reserved');
  const end=f.bridge.nativeRouteTiming(a).endTime;
  const b=f.route(2,bottom,[f.point(0,6)],{at:20});
  const result=f.bridge.reserveNativeRoute(b,2);
  assert.equal(result.status,'conflict');assert.equal(result.conflict.kind,'trajectory');
  assert(result.conflict.at>end&&result.conflict.at>20);
 }finally{f.session.dispose();}
});

test('stationary native bodies block admission without publishing snapshots or planning detours',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0);f.body(1,left);f.body(9,f.point(0,0));
  const a=f.route(1,left,[f.point(6,0)]),queries=f.w.nav_intent_route_queries();
  const result=f.bridge.reserveNativeRoute(a,1);
  assert.equal(result.status,'conflict');assert.equal(result.conflict.kind,'stationary-body');
  assert.equal(result.conflict.bodyId,9);assert(result.conflict.at>10);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
  assert.equal(f.w.nav_intent_route_queries(),queries);
  assert.equal(f.w.spatial_body_remove(9),1);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'reserved');
 }finally{f.session.dispose();}
});

test('reservation fences reject conflicting body mutations atomically using spatial subscribers',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0);f.body(1,left);f.body(9,f.point(0,20));
  const a=f.route(1,left,[f.point(6,0)]);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'reserved');
  const before=f.rows(),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.body(9,f.point(0,0)),0,'body update must fail before entering a reserved future corridor');
  assert.deepEqual(f.rows(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.body(1,left),1,'unchanged publication is not a mutation');
  assert.equal(f.body(1,f.point(-5,0)),0,'bound body cannot silently move outside its timetable');
  assert.equal(f.body(1,left,{radius:1.2}),0);assert.equal(f.body(1,left,{flags:1}),0);
  const candidates=f.w.nav_intent_route_reservation_mutation_candidates();
  assert.equal(f.body(10,f.point(10000,10000)),1);
  assert.equal(f.w.nav_intent_route_reservation_mutation_candidates(),candidates,
   'distant changes do not inspect the reserved polyline');
  const checks=f.w.nav_intent_route_reservation_checks(),pairs=f.w.nav_intent_route_reservation_pairs(),
   bodyChecks=f.w.nav_intent_route_reservation_body_checks();
  for(let i=0;i<1000;i++)assert(f.bridge.sampleNativeRoute(a,10+i/100));
  assert.equal(f.w.nav_intent_route_reservation_checks(),checks);
  assert.equal(f.w.nav_intent_route_reservation_pairs(),pairs);
  assert.equal(f.w.nav_intent_route_reservation_body_checks(),bodyChecks);
  assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('physical contact exceptions remain native; participation changes cannot bypass reservations',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0),middle=f.point(0,0);f.body(1,left);
  f.body(9,middle,{radius:.28,kind:0,flags:1});
  const a=f.route(1,left,[f.point(6,0)]);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'reserved',
   'healthy worker and active attacking animal retain the encounter exception');
  const before=f.rows();
  assert.equal(f.body(9,middle,{radius:.28,kind:0,flags:3}),0,
   'incapacitation would make the worker a blocker and must be fenced before mutation');
  assert.deepEqual(f.rows(),before);
  assert.equal(f.body(10,middle,{flags:0}),1,'inactive/gone bodies do not occupy a corridor');
 }finally{f.session.dispose();}
});

test('removal and registry reset revoke bound handles before deleting their physical identities',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0);f.body(1,left);
  const a=f.route(1,left,[f.point(6,0)]);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'reserved');
  assert.equal(f.w.spatial_body_remove(1),1);
  const [event]=f.bridge.intentChanges();assert.deepEqual(event.revokedRouteHandle,a);
  assert.equal(f.bridge.sampleNativeRoute(a,12),null);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
  f.body(1,left);const b=f.route(1,left,[f.point(6,0)]);
  assert.equal(f.bridge.reserveNativeRoute(b,1).status,'reserved');
  f.w.spatial_bodies_reset();
  assert.equal(f.w.spatial_body_count(),0);assert.equal(f.w.nav_intent_route_reservation_count(),0);
  assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,b);
  assert.equal(f.bridge.nativeRouteTiming(b),null);
 }finally{f.session.dispose();}
});

test('reservation binding rejects untimed, stale, mismatched and topology-dirty candidates',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0);f.body(1,left);
  let a=f.route(1,left,[f.point(6,0)],{timed:false});
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'unsupported');
  a=f.route(1,left,[f.point(6,0)]);
  assert.equal(f.bridge.reserveNativeRoute(a,99).status,'body-mismatch');
  assert.equal(f.bridge.reserveNativeRoute({...a,authorityEpoch:'different'},1).status,'stale');
  const p=f.point(0,0),wall=f.session.core.addWall(p.x,p.z,.3,.3);assert(wall>0);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'unsupported',
   'a topology event cannot reuse the old static clearance before reconciliation');
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
  f.bridge.reconcileTopology();assert.equal(f.bridge.reserveNativeRoute(a,1).status,'stale');
  f.session.core.removeWall(wall);
  const delayed=f.route(1,left,[f.point(6,0)]);
  f.state.elapsed=11;assert.equal(f.w.nav_intent_set_time(11),1);
  assert.equal(f.bridge.reserveNativeRoute(delayed,1).status,'unsupported',
   'late admission cannot silently shift an already-started timetable');
 }finally{f.session.dispose();}
});

test('continuous admission reports first contact even when closest approach lies beyond a waypoint',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0);f.body(0,left);f.body(9,f.point(7,0));
  const a=f.route(1,left,[left,f.point(0,0),f.point(0,0),f.point(6,0),f.point(6,0)]);
  const result=f.bridge.reserveNativeRoute(a,0);
  assert.equal(result.status,'conflict');assert.equal(result.conflict.bodyId,9);
  const expected=10+(13-2.2)/1.5;
  assert(Math.abs(result.conflict.at-expected)<1e-6,'earliest contact, not a discrete waypoint/closest-time sample');
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
 }finally{f.session.dispose();}
});

test('indexed body admission avoids remote bodies and retains deterministic conflict witnesses',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0);f.body(1,left);
  for(let id=100;id<220;id++)f.body(id,f.point(1000+id*3,1000));
  f.body(9,f.point(0,0));f.body(8,f.point(0,0));
  const a=f.route(1,left,[f.point(6,0)]),before=f.w.nav_intent_route_reservation_body_checks();
  const result=f.bridge.reserveNativeRoute(a,1);
  assert.equal(result.status,'conflict');assert.equal(result.conflict.bodyId,8,
   'equal-time witnesses are ordered by native identity, not hash/insertion order');
  assert.equal(f.w.nav_intent_route_reservation_body_checks()-before,2,
   'the existing physical index excludes remote bodies before continuous checks');
 }finally{f.session.dispose();}
});

test('existing action/cancellation boundaries retire reservations without changing combat consequences',()=>{
 const f=fixture();
 try{
  const left=f.point(-6,0);f.body(1,left);
  const a=f.route(1,left,[f.point(6,0)]);
  assert.equal(f.bridge.reserveNativeRoute(a,1).status,'reserved');
  const plants=structuredClone(f.state.plants);
  assert.equal(f.w.nav_intent_attack_action_active(910001),1);
  const [event]=f.bridge.intentChanges();
  assert.equal(event.type,'RouteCompleted');assert.deepEqual(event.revokedRouteHandle,a);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
  assert.deepEqual(f.state.plants,plants,'traffic never applies crop damage');
  assert.equal(f.w.nav_intent_attack_cancel(910001),0,'committed strikes retain existing cancellation protection');
  assert.equal(f.w.nav_intent_attack_finished(910001),0);f.bridge.intentChanges();
  const b=f.route(1,left,[f.point(6,0)]);
  assert.equal(f.bridge.reserveNativeRoute(b,1).status,'reserved');
  assert.equal(f.w.nav_intent_attack_cancel(910001),1);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
  assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,b);
  assert.equal(f.body(1,f.point(-5,0)),1,'explicit cancellation releases the physical mutation fence');
 }finally{f.session.dispose();}
});
