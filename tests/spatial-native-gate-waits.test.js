import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';

function setup(facts={}){
 const f=fixture(),a=f.point(0,-3),b=f.point(0,6),w=f.w;
 f.session.actorSectorRevision({worker:true});const ptr=w.nav_intent_attack_route_input_ptr(1);
 new Float32Array(w.memory.buffer,ptr,2).set([b.x,b.z]);
 assert.equal(w.nav_intent_restore_home(900011,a.x,a.z,b.x,b.z,1),1);
 const raw=f.bridge.intentChanges().at(-1).routeHandle,
  free=f.bridge.prepareNativeRouteMotion(raw,{radius:.28,...facts});assert.equal(free.status,'prepared');
 f.bridge.intentChanges();assert.equal(w.spatial_body_upsert(1,a.x,a.z,.28,0,facts.incapacitated?3:1),1);
 const service=createSpatialGateIntents(f.session,f.state),gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',...f.point(0,0),gateOpen:0};
 assert(service.register(gate));assert(service.bindWorker('worker-900011',1));
 return {...f,service,gate,free,facts};
}
const wait=f=>f.bridge.prepareNativeRouteMotion(f.free.routeHandle,{radius:.28,...f.facts,waitForGates:true});
const near=(a,b,label)=>assert(Math.abs(a-b)<1e-10,`${label}: ${a} != ${b}`);

test('native gate clock chooses an initial hold without changing the selected path or planning again',()=>{
 const f=setup({urgent:true,runRemaining:3.25});try{
  assert.equal(f.service.prepareMotion().status,'prepared');
  const before=f.bridge.routePoints(f.free.routeHandle),queries=f.w.nav_intent_route_queries(),sequence=f.w.nav_intent_transition_sequence(),result=wait(f);
  assert.equal(result.status,'prepared');assert.deepEqual(result.motionPlan.points,before);
  assert.equal(result.motionPlan.executionScope,'unadmitted-desert-gate-candidate');
  assert.equal(result.motionPlan.authorizedPassage,false);assert.equal(result.motionPlan.authorizedAutonomy,false);
  assert.deepEqual(result.motionPlan.initialHold,{gateId:990001,from:10,until:10.6});
  near(result.motionPlan.duration,f.free.motionPlan.duration+.6,'duration');
  assert.equal(f.bridge.nativeRouteTiming(f.free.routeHandle),null);
  const [change]=f.bridge.intentChanges();assert.equal(change.type,'RouteReplaced');
  assert.equal(change.sequence,sequence+1);assert.deepEqual(change.revokedRouteHandle,f.free.routeHandle);
  assert.equal(f.w.nav_intent_route_queries(),queries);
 }finally{f.session.dispose();}
});

test('gate holds spend no phase or running budget and resume native walk/run/carry/flight rules',()=>{
 for(const facts of [{},{urgent:true,runRemaining:3.25},{carrying:true,urgent:true,runRemaining:3.25},
  {flight:true,runRemaining:3.25},{flight:true,slow:true,incapacitated:true,runRemaining:3.25},
  {urgent:true,recovering:true,runRemaining:3.25}]){
  const f=setup(facts);try{
   const times=[0,.03,.5,1.4,3,7,20],expected=times.map(t=>f.bridge.sampleNativeRoute(f.free.routeHandle,10+t));
   assert.equal(f.service.prepareMotion().status,'prepared');const result=wait(f);assert.equal(result.status,'prepared');
   for(const t of [10,10.1,10.599]){
    const pose=f.bridge.sampleNativeRoute(result.routeHandle,t);
    for(const key of ['distance','phase','runPhase','walkPhase','carryPhase','runDistance','walkDistance','currentSpeed'])assert.equal(pose[key],0,key);
    assert.equal(pose.running,false);assert.equal(pose.arrived,false);assert.equal(pose.runRemaining,facts.runRemaining??0);
    near(pose.x,f.free.motionPlan.origin.x,'hold x');near(pose.z,f.free.motionPlan.origin.z,'hold z');
   }
   for(let i=0;i<times.length;i++){
    const pose=f.bridge.sampleNativeRoute(result.routeHandle,10.6+times[i]);
    for(const key of ['x','z','distance','phase','runPhase','walkPhase','carryPhase','runDistance','walkDistance','runRemaining','currentSpeed'])
     near(pose[key],expected[i][key],`${JSON.stringify(facts)} ${key}`);
    assert.equal(pose.arrived,expected[i].arrived);assert.equal(pose.running,expected[i].running);
   }
  }finally{f.session.dispose();}
 }
});

test('candidate holds cannot be reserved or executed even after their motor has opened',()=>{
 const f=setup();try{
  f.service.prepareMotion();const result=wait(f);assert.equal(result.status,'prepared');
  assert.equal(f.bridge.reserveNativeRoute(result.routeHandle,1).status,'unsupported');
  assert.equal(f.bridge.beginNativeRouteExecution().status,'inactive');assert.equal(f.w.nav_intent_route_reservation_count(),0);
  f.state.elapsed=11;assert.equal(f.w.nav_intent_set_time(11),1);assert.equal(f.service.read(f.gate.id).opening,1);
  assert.equal(f.bridge.reserveNativeRoute(result.routeHandle,1).status,'unsupported');assert.equal(f.w.nav_intent_route_reservation_count(),0);
  near(f.body(1).z,f.free.motionPlan.origin.z,'body remains at hold origin');
 }finally{f.session.dispose();}
});

test('uncertified, stopped or late opening facts cannot retime the route',()=>{
 const f=setup();try{
  const sequence=f.w.nav_intent_transition_sequence();assert.equal(wait(f).status,'unsupported');
  assert.equal(f.service.reconcile().status,'updated');assert.equal(wait(f).status,'unsupported');
  assert.equal(f.service.prepareMotion({enabled:false}).status,'prepared');assert.equal(wait(f).status,'unsupported');
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteTiming(f.free.routeHandle));
  f.service.prepareMotion();f.state.elapsed=10.1;assert.equal(f.w.nav_intent_set_time(10.1),1);
  assert.equal(wait(f).status,'unsupported');assert.equal(f.w.nav_intent_transition_sequence(),sequence);
 }finally{f.session.dispose();}
});

test('an ordinary world obstruction is not bypassed when preparing a gate wait candidate',()=>{
 const f=setup();try{
  f.service.prepareMotion();const p=f.point(0,3);assert(f.session.core.addBarrier(p.x,p.z,1,.2,0)>0);
  const before=f.bridge.nativeRouteTiming(f.free.routeHandle),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(wait(f).status,'blocked');assert.deepEqual(f.bridge.nativeRouteTiming(f.free.routeHandle),before);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);
 }finally{f.session.dispose();}
});

test('sampling a held timetable does not repeat clearance, gate policy or route planning',()=>{
 const f=setup();try{
  f.service.prepareMotion();const result=wait(f);assert.equal(result.status,'prepared');f.bridge.intentChanges();
  const names=['spatial_execution_clearance_checks','nav_intent_route_queries','nav_gate_worker_checks','nav_gate_prefix_segments',
   'nav_gate_sweep_pairs','nav_gate_sweep_evaluations','nav_intent_transition_sequence'],before=names.map(name=>f.w[name]());
  for(let i=0;i<1000;i++)assert(f.bridge.sampleNativeRoute(result.routeHandle,10+i/100));
  assert.deepEqual(names.map(name=>f.w[name]()),before);assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('native selection waits for the latest of multiple certified nearby opening motors',()=>{
 const f=setup();try{
  // The lower ID finishes first; JS supplies no duration or selected gate.
  assert(f.service.register({...f.gate,id:'structure-990000',gateOpen:.5}));
  assert.equal(f.service.prepareMotion().status,'prepared');const result=wait(f);
  assert.equal(result.status,'prepared');assert.deepEqual(result.motionPlan.initialHold,{gateId:990001,from:10,until:10.6});
 }finally{f.session.dispose();}
});

test('worker-passable unowned overlays stay unsupported even in a gate candidate proof',()=>{
 const f=setup();try{
  f.service.prepareMotion();const p=f.point(0,3);assert(f.session.core.addBarrier(p.x,p.z,1,.2,1)>0);
  const sequence=f.w.nav_intent_transition_sequence();assert.equal(wait(f).status,'unsupported');
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteTiming(f.free.routeHandle));
 }finally{f.session.dispose();}
});
