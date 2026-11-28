import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {walkTo} from '../src/simulation/game.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function fixture(){
 const state=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 state.workers=[];state.plants=[];state.tasks=[];state.crates=[];state.spells=[];state.elapsed=10;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
  if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
  loaded.set(`${x},${z}`,session.core.chunkPayload());
 }
 let start,end;
 for(let z=-10;z<=10&&!end;z++)for(let x=-10;x<=10&&!end;x++){
  const from={x:x+.2,z:z+.2},to={x:x+12.2,z:z+.2};
  if(session.routeActor(from,to,{worker:false,species:'warthog'}).status==='found'){start=from;end=to;}
 }
 assert(end);
 const actor={id:'animal-900002',species:'warthog',radius:1.1,...start,status:'walking',hitsRemaining:2},
  crop={id:'plant-900001',species:'mijo',alive:true,...end};
 state.plants=[crop];state.raid={animals:[actor],reservations:{}};
 const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);
 return {state,session,bridge,actor,crop,nav:createSpatialNavigationMovement(session,state)};
}
function plan(f){
 const result=f.bridge.planAttackCrop(f.state,f.actor,{timedRoute:true});
 assert.equal(result.status,'found',JSON.stringify(result));
 assert(result.motionPlan);return result;
}

test('native AttackCrops prepares one full, multi-second walking timetable in its existing route slot',()=>{
 const f=fixture();
 try{
  const result=plan(f),motion=result.motionPlan;
  assert.equal(motion.speed,1.5);assert(motion.duration>5);
  assert.equal(motion.startTime,10);
  assert.deepEqual(motion.origin,{x:f.actor.x,z:f.actor.z});
  assert.deepEqual(motion.points,f.bridge.routePoints(result.routeHandle));
  assert.equal(motion.distances.length,motion.points.length/2);
  let x=f.actor.x,z=f.actor.z,distance=0;
  for(let i=0;i<motion.distances.length;i++){
   const nx=motion.points[i*2],nz=motion.points[i*2+1];
   distance+=Math.hypot(nx-x,nz-z);x=nx;z=nz;
   assert(Math.abs(motion.distances[i]-distance)<1e-12);
  }
  assert(Math.abs(motion.duration-distance/1.5)<1e-12);
  assert.equal(motion.executionScope,'static-desert-animal');
  assert.equal(motion.authorizedAutonomy,false,'timing/static proof is not a traffic or clock guarantee');
  const [event]=f.bridge.intentChanges();
  assert.deepEqual(event.routeHandle,motion.routeHandle);
  assert.equal(event.sequence,motion.assignmentSequence);
 }finally{f.session.dispose();}
});

test('1000 native time evaluations do not plan, revalidate the route, publish positions or mutate actors',()=>{
 const f=fixture();
 try{
  const result=plan(f),motion=result.motionPlan,w=f.session.core.wasm,
   before={x:f.actor.x,z:f.actor.z},checks=w.spatial_execution_clearance_checks(),
   plans=w.nav_intent_actor_planning_calls(900002),validations=w.nav_intent_route_validation_count(),
   samples=w.nav_intent_route_time_samples();
  f.bridge.intentChanges();
  for(let i=0;i<1000;i++){
   const at=motion.startTime+motion.duration*i/999,sample=f.bridge.sampleNativeRoute(result.routeHandle,at);
   assert(sample);assert(sample.distance>=0&&sample.distance<=motion.distance);
   assert(Math.abs(sample.phase-sample.distance/1.5)<1e-12);
  }
  assert.equal(w.spatial_execution_clearance_checks(),checks);
  assert.equal(w.nav_intent_actor_planning_calls(900002),plans);
  assert.equal(w.nav_intent_route_validation_count(),validations);
  assert.equal(w.nav_intent_route_time_samples(),samples+1000);
  assert.deepEqual({x:f.actor.x,z:f.actor.z},before);
  assert.deepEqual(f.bridge.intentChanges(),[]);
  const end=f.bridge.sampleNativeRoute(result.routeHandle,motion.endTime);
  assert.equal(end.arrived,true);assert.equal(end.firstRemainingPoint,motion.distances.length);
  assert.equal(end.x,motion.points.at(-2));assert.equal(end.z,motion.points.at(-1));
  assert.deepEqual(f.bridge.sampleNativeRoute(result.routeHandle,motion.endTime+100),end);
  const beforeStart=f.bridge.sampleNativeRoute(result.routeHandle,motion.startTime-1);
  assert.equal(beforeStart.x,motion.origin.x);assert.equal(beforeStart.z,motion.origin.z);
  assert.equal(beforeStart.distance,0);assert.equal(beforeStart.arrived,false);
  assert.equal(f.bridge.sampleNativeRoute(result.routeHandle,NaN),null);
  assert.equal(f.bridge.sampleNativeRoute(result.routeHandle,-1),null);
  f.bridge.resetFromState(f.state);
  assert.equal(f.bridge.sampleNativeRoute(result.routeHandle,10),null);
  assert.equal(f.bridge.nativeRouteTiming(result.routeHandle),null);
 }finally{f.session.dispose();}
});

test('native walking timetable matches the guarded legacy movement without using it to approve the route',()=>{
 const f=fixture();
 try{
  const result=plan(f),motion=result.motionPlan;
  f.actor.path=result.approach.path;f.actor.destinationId=result.approach.point.id;
  f.actor.pathVersion=f.nav.version;
  const step=.02;
  for(let i=1;i<=Math.ceil(motion.duration/step)+1;i++){
   f.state.elapsed=10+i*step;
   walkTo(f.state,f.actor,result.approach.point,step,f.nav,{speed:1.5,worker:false,externallyPlanned:true});
   const expected=f.bridge.sampleNativeRoute(result.routeHandle,f.state.elapsed);
   assert(Math.hypot(f.actor.x-expected.x,f.actor.z-expected.z)<1e-7);
   assert(Math.abs((f.actor.motionPhase??0)-expected.phase)<1e-7);
  }
  assert.equal(f.actor.path.length,0);
 }finally{f.session.dispose();}
});

test('a native event revokes the exact timetable; replacement retains its walking timing mode',()=>{
 const f=fixture();
 try{
  const result=plan(f),point=result.approach.path[Math.floor(result.approach.path.length/2)];
  f.bridge.intentChanges();f.state.elapsed=11;
  const wall=f.session.core.addWall(point.x,point.z,.3,.3);assert(wall>0);
  assert.equal(f.bridge.reconcileTopology(),1);
  const [event]=f.bridge.intentChanges();assert.deepEqual(event.revokedRouteHandle,result.routeHandle);
  assert.equal(f.bridge.nativeRouteTiming(result.routeHandle),null);
  assert.equal(f.bridge.sampleNativeRoute(result.routeHandle,11),null);
  f.session.core.removeWall(wall);
  f.actor.approach=result.approach.point;
  const replacement=f.bridge.replanAttackRoute(f.actor);
  assert.equal(replacement.status,'found');
  const timing=f.bridge.nativeRouteTiming(replacement.routeHandle);
  assert(timing);assert.equal(timing.startTime,11);assert.equal(timing.speed,1.5);
  assert.notDeepEqual(replacement.routeHandle,result.routeHandle);
 }finally{f.session.dispose();}
});

test('ordinary untimed product planning stays untimed and entering speed is not silently changed',()=>{
 const f=fixture();
 try{
  f.actor.status='entering';
  assert.throws(()=>f.bridge.planAttackCrop(f.state,f.actor,{timedRoute:true}),/walking intention/);
  const result=f.bridge.planAttackCrop(f.state,f.actor);
  assert.equal(result.status,'found');
  assert.equal(f.bridge.nativeRouteTiming(result.routeHandle),null);
  assert.equal(f.bridge.sampleNativeRoute(result.routeHandle,10),null);
 }finally{f.session.dispose();}
});

test('failed native timing preparation does not revoke or mutate an existing route version',()=>{
 const f=fixture();
 try{
  const result=plan(f),w=f.session.core.wasm,points=result.motionPlan.points,
   pointer=w.nav_intent_attack_route_input_ptr(points.length/2),
   sequence=w.nav_intent_transition_sequence();
  new Float32Array(w.memory.buffer,pointer,points.length).set(points);
  f.bridge.intentChanges();
  assert.equal(w.nav_intent_register_attack(900002,900001,f.actor.x,f.actor.z,points.length/2,1,2),-7,
   'a timing radius incompatible with the selected native profile must fail before replacement');
  assert.equal(w.nav_intent_transition_sequence(),sequence);
  assert.deepEqual(f.bridge.nativeRouteTiming(result.routeHandle),result.motionPlan);
  assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});
