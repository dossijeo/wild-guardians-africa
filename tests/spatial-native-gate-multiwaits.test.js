import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';
import {moveWorker} from '../src/simulation/locomotion.js';
import {waitForGate} from '../src/simulation/gates.js';
import {gateTriggerRadius} from '../src/world/gate-passages.js';

function home(f,id,origin,points){
 f.session.actorSectorRevision({worker:true});const ptr=f.w.nav_intent_attack_route_input_ptr(points.length);
 new Float32Array(f.w.memory.buffer,ptr,points.length*2).set(points.flatMap(p=>[p.x,p.z]));const end=points.at(-1);
 assert.equal(f.w.nav_intent_restore_home(id,origin.x,origin.z,end.x,end.z,points.length),1);
 return f.bridge.intentChanges().find(event=>event.actorId===id&&event.routeHandle)?.routeHandle;
}
function setup({facts={},first=true,secondOpening=0,requester=true,origin=[0,-3],points=[[0,6]],firstOpening=.5,secondZ=.5,
 material='zarzas',yaw=0,requesterOrigin=null}={}){
 const f=fixture(),a=f.point(...origin),path=points.map(p=>f.point(...p)),raw=home(f,900011,a,path),
  free=f.bridge.prepareNativeRouteMotion(raw,{radius:.28,...facts});assert.equal(free.status,'prepared');f.bridge.intentChanges();
 assert.equal(f.w.spatial_body_upsert(1,a.x,a.z,.28,0,facts.incapacitated?3:1),1);
 if(requester){const p=requesterOrigin?f.point(...requesterOrigin):f.point(0,secondZ+3);home(f,900012,p,[f.point(0,p.z>f.point(0,secondZ).z?-6:6)]);assert.equal(f.w.spatial_body_upsert(2,p.x,p.z,.28,0,1),1);}
 const service=createSpatialGateIntents(f.session,f.state),base={gate:true,status:'intact',material,yaw},gates=[];
 if(first)gates.push({...base,id:'structure-990001',...f.point(0,0),gateOpen:firstOpening});
 gates.push({...base,id:'structure-990002',...f.point(0,secondZ),gateOpen:secondOpening});
 for(const gate of gates)assert(service.register(gate));assert(service.bindWorker('worker-900011',1));
 if(requester)assert(service.bindWorker('worker-900012',2));assert.equal(service.prepareMotion().status,'prepared');
 return {...f,a,service,gates,free,facts};
}
const prepare=f=>f.bridge.prepareNativeRouteMotion(f.free.routeHandle,{radius:.28,...f.facts,waitForGates:true});
const near=(a,b,label='',epsilon=1e-7)=>assert(Math.abs(a-b)<epsilon,`${label}: ${a} != ${b}`);
function oracle(f,seconds){
 const actor={...f.a,path:Array.from({length:f.free.motionPlan.points.length/2},(_,i)=>({
  x:f.free.motionPlan.points[i*2],z:f.free.motionPlan.points[i*2+1]})),runRemaining:f.facts.runRemaining??0,
  runPhase:0,walkPhase:0,carryPhase:0,recovering:!!f.facts.recovering,incapacitated:!!f.facts.incapacitated};
 for(let elapsed=0;elapsed<seconds;){const dt=Math.min(.023,seconds-elapsed);moveWorker(actor,dt,f.facts);elapsed+=dt;}
 return actor;
}
const activeSeconds=(plan,at)=>Math.max(0,at-plan.startTime-plan.holds.reduce((sum,hold)=>
 sum+Math.max(0,Math.min(at,hold.until)-hold.from),0));

test('the native route contains a departure hold and a distinct later gate hold without another planner',()=>{
 const f=setup();try{
  const sequence=f.w.nav_intent_transition_sequence(),queries=f.w.nav_intent_route_queries(),result=prepare(f);assert.equal(result.status,'prepared');
  const plan=result.motionPlan;assert.equal(plan.holds.length,2);assert.equal(plan.holds[0].distance,0);
  assert.equal(plan.holds[0].gateId,990001);near(plan.holds[0].until,10.3);
  assert.equal(plan.holds[1].gateId,990002);near(plan.holds[1].distance,.3);near(plan.holds[1].until,10.6);
  assert(plan.holds[1].from>plan.holds[0].until);assert(plan.holds[1].from<plan.holds[1].until);
  assert.deepEqual(plan.points,f.free.motionPlan.points);assert.equal(plan.authorizedPassage,false);assert.equal(plan.authorizedAutonomy,false);
  assert.equal(f.w.nav_intent_route_queries(),queries);const [change]=f.bridge.intentChanges();
  assert.equal(change.type,'RouteReplaced');assert.equal(change.sequence,sequence+1);assert.deepEqual(change.revokedRouteHandle,f.free.routeHandle);
  assert.equal(f.bridge.nativeRouteTiming(f.free.routeHandle),null);
 }finally{f.session.dispose();}
});

test('a candidate with only a later hold remains explicitly unadmitted, not an ordinary static worker plan',()=>{
 const f=setup({first:false});try{
  const result=prepare(f);assert.equal(result.status,'prepared');const plan=result.motionPlan;
  assert.equal(plan.initialHold,undefined);assert.equal(plan.holds.length,1);near(plan.holds[0].distance,.3);
  assert(plan.holds[0].from>10);assert.equal(plan.executionScope,'unadmitted-desert-gate-candidate');
  assert.equal(f.bridge.reserveNativeRoute(result.routeHandle,1).status,'unsupported');assert.equal(f.bridge.beginNativeRouteExecution().status,'inactive');
  near(f.body(1).x,f.a.x);near(f.body(1).z,f.a.z);
 }finally{f.session.dispose();}
});

test('all holds preserve native walk/run/carry/flight phase and budget parity with legacy movement',()=>{
 for(const facts of [{},{urgent:true,runRemaining:3.25},{urgent:true,runRemaining:.15},
  {carrying:true,urgent:true,runRemaining:3.25},{flight:true,runRemaining:3.25},
  {flight:true,slow:true,incapacitated:true,runRemaining:3.25},{urgent:true,recovering:true,runRemaining:3.25}]){
  const f=setup({facts});try{
   const result=prepare(f);assert.equal(result.status,'prepared');const plan=result.motionPlan;
   for(const t of [10,10.1,10.3,10.4,10.59,10.6,10.83,12,20]){
    const sample=f.bridge.sampleNativeRoute(result.routeHandle,t),expected=oracle(f,activeSeconds(plan,t));
    for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining'])near(sample[key],expected[key],`${JSON.stringify(facts)} ${t} ${key}`);
   }
   for(const hold of plan.holds){
    const a=f.bridge.sampleNativeRoute(result.routeHandle,hold.from+(hold.until-hold.from)*.2),
     b=f.bridge.sampleNativeRoute(result.routeHandle,hold.from+(hold.until-hold.from)*.8);
    for(const key of ['x','z','distance','phase','runPhase','walkPhase','carryPhase','runRemaining','yaw'])assert.equal(a[key],b[key],key);
    assert.equal(a.distance,hold.distance);assert.equal(a.running,false);assert.equal(a.currentSpeed,0);
   }
  }finally{f.session.dispose();}
 }
});

test('full native knots cover intermediate stops, corners, duplicate points and budget exhaustion inside an edge',()=>{
 const f=setup({facts:{urgent:true,runRemaining:.15},points:[[0,-3],[0,-3],[0,0],[0,0],[0,6]]});try{
  const result=prepare(f);assert.equal(result.status,'prepared');const plan=result.motionPlan,knots=Array.from(f.bridge.nativeRouteTimeKnots(result.routeHandle));
  for(const hold of plan.holds)for(const at of [hold.from,hold.until])assert(knots.some(k=>Math.abs(k-at)<1e-12));
  assert(knots.some(k=>Math.abs(k-(10.3+.15/2.4))<1e-10),'run-to-walk transition is a knot even within an edge');
  assert.equal(knots[0],10);assert.equal(knots.at(-1),plan.endTime);
  for(let i=1;i<knots.length;i++){
   assert(knots[i]>knots[i-1]);const a=f.bridge.sampleNativeRoute(result.routeHandle,knots[i-1]),b=f.bridge.sampleNativeRoute(result.routeHandle,knots[i]);
   for(const fraction of [.13,.5,.87]){const pose=f.bridge.sampleNativeRoute(result.routeHandle,knots[i-1]+(knots[i]-knots[i-1])*fraction);
    for(const key of ['x','z','distance','phase','runPhase','walkPhase','carryPhase'])near(pose[key],a[key]+(b[key]-a[key])*fraction,key);}
  }
 }finally{f.session.dispose();}
});

test('the intermediate stop boundary agrees with native and legacy trigger/prefix geometry',()=>{
 const f=setup({first:false});try{
  const result=prepare(f);assert.equal(result.status,'prepared');const hold=result.motionPlan.holds[0],gate={...f.gates[0],gateOpen:.5};
  for(const [at,expected] of [[hold.from-.00001,false],[hold.until+.00001,true]]){
   const pose=f.bridge.sampleNativeRoute(result.routeHandle,at),path=[];
   for(let i=pose.firstRemainingPoint;i<result.motionPlan.points.length/2;i++)path.push({x:result.motionPlan.points[i*2],z:result.motionPlan.points[i*2+1]});
   assert.equal(waitForGate({...pose,radius:.28,status:'returning',path},[gate]),expected);
  }
 }finally{f.session.dispose();}
});

test('arriving after a certified opening finishes does not invent a second wait',()=>{
 const f=setup({facts:{flight:true,slow:true,incapacitated:true,runRemaining:3.25}});try{
  const result=prepare(f);assert.equal(result.status,'prepared');assert.equal(result.motionPlan.holds.length,1);
  assert.equal(result.motionPlan.holds[0].gateId,990001);
 }finally{f.session.dispose();}
});

test('being near a gate does not stop a route whose matching prefix reaches it only after a long detour',()=>{
 const f=setup({first:false,secondZ:0,origin:[-1,-3],points:[[6,-3],[6,-3.3],[0,-3.3],[0,6]],facts:{flight:true}});try{
  const result=prepare(f);assert.equal(result.status,'prepared');assert.equal(result.motionPlan.holds.length,0);
  assert.equal(result.motionPlan.initialHold,undefined);assert.equal(result.motionPlan.executionScope,'unadmitted-desert-gate-candidate');
  assert.equal(f.bridge.reserveNativeRoute(result.routeHandle,1).status,'unsupported');
 }finally{f.session.dispose();}
});

test('a later uncertified future opening is rejected atomically rather than scheduled by JavaScript',()=>{
 const f=setup({first:false,requester:false});try{
  const before=f.bridge.nativeRouteTiming(f.free.routeHandle),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(prepare(f).status,'unsupported');assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.deepEqual(f.bridge.nativeRouteTiming(f.free.routeHandle),before);
 }finally{f.session.dispose();}
});

test('sampling and reading native hold knots do not repeat geometry, policy or planning work',()=>{
 const f=setup({facts:{flight:true}});try{
  const result=prepare(f);assert.equal(result.status,'prepared');f.bridge.intentChanges();assert(f.w.nav_gate_wait_segments()>0);
  const names=['nav_gate_wait_segments','nav_gate_prefix_segments','nav_gate_worker_checks','nav_gate_sweep_evaluations',
   'spatial_execution_clearance_checks','nav_intent_route_queries','nav_intent_transition_sequence'],before=names.map(name=>f.w[name]());
  for(let i=0;i<1000;i++){assert(f.bridge.sampleNativeRoute(result.routeHandle,10+i/100));assert(f.bridge.nativeRouteTimeKnots(result.routeHandle));}
  assert.deepEqual(names.map(name=>f.w[name]()),before);assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('hold-knot readers do not admit a matching native tuple from another authority or a revoked generation',()=>{
 const a=setup(),b=fixture();try{
  const result=prepare(a);assert.equal(result.status,'prepared');
  assert.equal(a.bridge.nativeRouteTimeKnots(a.free.routeHandle),null);assert.equal(b.bridge.nativeRouteTimeKnots(result.routeHandle),null);
 }finally{a.session.dispose();b.session.dispose();}
});

test('activation intervals use all authored mobile materials, yaw and approach direction',()=>{
 for(const material of ['zarzas','empalizada','reforzado'])for(const yaw of [0,.73])for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const trigger=gateTriggerRadius({gate:true,material,x:0,z:0,yaw}),distance=trigger+.3,
   f=setup({first:false,secondZ:0,material,yaw,origin:[dx*distance,dz*distance],points:[[-dx*6,-dz*6]],requesterOrigin:dz>0?[0,-3]:null});
  try{
   const result=prepare(f);assert.equal(result.status,'prepared',`${material} ${yaw} ${dx}/${dz}`);
   assert.equal(result.motionPlan.holds.length,1);near(result.motionPlan.holds[0].distance,.3,`${material} trigger`);
   assert.equal(result.motionPlan.initialHold,undefined);
  }finally{f.session.dispose();}
 }
});

test('an ambiguous tangent trigger fails closed without replacing the old route or fabricating a hold',()=>{
 const f=setup({first:false,secondZ:0,origin:[-1,-3.2],points:[[1,-3.2],[6,-3.3],[0,-3.3],[0,6]]});try{
  const before=f.bridge.nativeRouteTiming(f.free.routeHandle),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(prepare(f).status,'unsupported');assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.deepEqual(f.bridge.nativeRouteTiming(f.free.routeHandle),before);
 }finally{f.session.dispose();}
});

test('direct, watering and repair task routes retain their native task/target leases when intermediate holds are compiled',()=>{
 for(const [kind,targetKind] of [[0,0],[1,1],[2,3]])for(const [firstOpening,expectedHolds] of [[.5,1],[.75,2]]){
  const f=setup({firstOpening});try{
   assert.equal(f.w.nav_intent_cancel_home(900011),1);f.bridge.intentChanges();const end=f.point(0,6),
    center=Number(/-(\d+)$/.exec(f.state.workers[0].centerId)[1]);
   if(kind===2)assert(f.session.core.addBarrier(end.x,end.z,1.09,.22,0)>0);
   f.session.actorSectorRevision({worker:true});const rows=[
    [1,1,900011,center,f.a.x,f.a.z,1,0,0,1],
    [1,2,910001,targetKind,end.x,end.z,1,0,0,1],
    [1,3,920001,center,kind,0,0,910001,1,1],
   ],ptr=f.w.nav_intent_changes_ptr(rows.length);
   new Float64Array(f.w.memory.buffer,ptr,rows.length*10).set(rows.flat());
   assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,rows.length),1);
   assert.equal(f.w.nav_intent_plan_tasks(),1);assert.equal(f.w.nav_intent_commit(),1);
   const old=f.bridge.intentChanges().find(event=>event.actorId===900011&&event.routeHandle)?.routeHandle,
    points=f.bridge.routePoints(old),queries=f.w.nav_intent_route_queries(),
    result=f.bridge.prepareNativeRouteMotion(old,{radius:.28,urgent:true,runRemaining:3.25,waitForGates:true});
   assert.equal(result.status,'prepared',`task ${kind}`);assert.equal(result.motionPlan.holds.length,expectedHolds,
    JSON.stringify({kind,firstOpening,points:Array.from(points),holds:result.motionPlan.holds,gates:f.gates.map(gate=>f.service.read(gate.id))}));
   if(firstOpening===.5){
    // Unlike a restored straight suffix, the real task route first connects to
    // the integer grid. At 10.6 it has not reached the second gate's trigger.
    const pose=f.bridge.sampleNativeRoute(result.routeHandle,10.6),gate=f.gates[1];
    assert(Math.hypot(pose.x-gate.x,pose.z-gate.z)>f.service.read(gate.id).triggerRadius);
   }else assert(result.motionPlan.holds[1].distance>0);
   assert.deepEqual(result.motionPlan.points,points);assert.equal(f.w.nav_intent_route_queries(),queries);
   assert.equal(f.w.nav_intent_actor(900011),1);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_actor_ptr(),4)),[900011,1,920001,910001]);
  }finally{f.session.dispose();}
 }
});
