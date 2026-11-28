import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeGateCrossingFixture as setup} from './helpers/native-gate-crossings.js';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';

const near=(a,b,key='',epsilon=1e-7)=>assert(Math.abs(a-b)<epsilon,`${key}: ${a} != ${b}`);
const phases=['distance','phase','runPhase','walkPhase','carryPhase','runDistance','walkDistance','runRemaining'];
const counters=f=>['nav_gate_wait_segments','nav_gate_prefix_segments','nav_gate_sweep_evaluations','nav_gate_static_evaluations',
 'spatial_execution_clearance_checks','nav_intent_route_queries','nav_gate_route_suspensions','nav_gate_route_resumptions'].map(name=>[name,f.w[name]()]);
function started(f,options={}){
 const r=f.route(options),admitted=f.admit(r);assert.equal(admitted.status,'admitted');
 assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.intentChanges();return {...r,...admitted};
}
const wait=(f,at)=>{f.state.elapsed=at;assert.equal(f.w.nav_intent_set_time(at),1);};

test('suspension revokes execution but retains one exact suffix and frozen native motion state for a later event',()=>{
 const f=setup();try{
  const r=started(f,{facts:{urgent:true,runRemaining:6}});assert.equal(f.advance(10.5).status,'advanced');
  const before=f.bridge.nativeRouteExecution(r.routeHandle),sequence=f.w.nav_intent_transition_sequence(),
   result=f.bridge.suspendNativeGateRoute(r.routeHandle);assert.equal(result.status,'suspended');
  const held=result.suspendedRoute;assert(held);assert.notDeepEqual(held.resumeHandle,r.routeHandle);assert.equal(held.resumeHandle.slot,r.routeHandle.slot);
  assert.deepEqual(held.remainingPoints,r.points.subarray(before.firstRemainingPoint*2));
  for(const key of phases)assert.equal(held.pose[key],before[key],key);
  assert.equal(held.pose.currentSpeed,0);assert.equal(held.pose.running,false);assert.equal(held.suspendedAt,10.5);
  assert.equal(f.bridge.nativeRouteTiming(r.routeHandle),null);assert.equal(f.bridge.nativeRouteTiming(held.resumeHandle),null);
  assert.equal(f.bridge.nativeRouteExecution(r.routeHandle),null);assert.equal(f.w.nav_intent_route_reservation_count(),0);
  const [change]=f.bridge.intentChanges();assert.equal(change.type,'RouteInvalidated');assert.equal(change.sequence,sequence+1);
  assert.deepEqual(change.revokedRouteHandle,r.routeHandle);assert.equal(change.routeHandle,null);
  assert.equal(f.bridge.nativeIntentControlBaseline().routes.length,0);
  const body=f.body(1),counts=counters(f);wait(f,20);
  for(let i=0;i<100;i++)assert.deepEqual(f.bridge.nativeSuspendedGateRoute(900011),held);
  assert.deepEqual(counters(f),counts);assert.deepEqual(f.body(1),body);
  const resumed=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resumed.status,'resumed');
  assert.equal(resumed.routeHandle.slot,r.routeHandle.slot);assert.deepEqual(resumed.motionPlan.points,held.remainingPoints);
  assert.equal(resumed.motionPlan.startTime,20);assert.equal(f.bridge.nativeSuspendedGateRoute(900011),null);
  assert.equal(f.w.nav_intent_action_active(900011),0,'readmission cannot become work before the executor arrives');
  const first=f.bridge.sampleNativeRoute(resumed.routeHandle,20);
  for(const key of [...phases,'x','z','yaw'])near(first[key],before[key],key);
  const [assigned]=f.bridge.intentChanges();assert.equal(assigned.type,'RouteAssigned');assert.equal(assigned.revokedRouteHandle,null);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(resumed.motionPlan.endTime).status,'advanced');
  const end=f.bridge.nativeRouteExecution(resumed.routeHandle);assert.equal(end.arrived,true);near(end.runDistance,6);near(end.runPhase,6/2.4);
  near(end.walkDistance,r.motionPlan.distance-6);near(end.walkPhase,(r.motionPlan.distance-6)/.72);
  assert.equal(f.body(1).z,Math.fround(r.end.z));
 }finally{f.session.dispose();}
});

test('suspending in a native gate hold preserves phase and budget for walking, running, carrying, recovering and slow flight',()=>{
 for(const facts of [{},{urgent:true,runRemaining:3.25},{urgent:true,runRemaining:.15},{carrying:true,urgent:true,runRemaining:3.25},
  {flight:true,runRemaining:3.25},{flight:true,slow:true,incapacitated:true,runRemaining:3.25},{urgent:true,recovering:true,runRemaining:3.25}]){
  const f=setup();try{
   const r=started(f,{facts}),hold=r.motionPlan.holds[0];assert.equal(f.advance(hold.from+.2).status,'advanced');
   const before=f.bridge.nativeRouteExecution(r.routeHandle);assert.equal(before.currentSpeed,0);
   const held=f.bridge.suspendNativeGateRoute(r.routeHandle).suspendedRoute;wait(f,30);
   const resume=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resume.status,'resumed',JSON.stringify(facts));
   const atStart=f.bridge.sampleNativeRoute(resume.routeHandle,30);for(const key of phases)near(atStart[key],before[key],key);
   assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(resume.motionPlan.endTime).status,'advanced');
   const actual=f.bridge.nativeRouteExecution(resume.routeHandle),expected=f.bridge.sampleNativeRoute(r.routeHandle,r.motionPlan.endTime);
   assert.equal(expected,null,'revoked clocks cannot be sampled again');
   near(actual.distance,r.motionPlan.distance);near(actual.runDistance,r.motionPlan.runDistance);
   near(actual.runPhase,r.motionPlan.runDistance/2.4);
   near(actual.walkPhase,facts.carrying?0:(r.motionPlan.distance-r.motionPlan.runDistance)/.72);
   near(actual.carryPhase,facts.carrying?r.motionPlan.distance/.72:0);
   near(actual.runRemaining,facts.flight?facts.runRemaining:Math.max(0,(facts.runRemaining??0)-r.motionPlan.runDistance));
  }finally{f.session.dispose();}
 }
});

test('a suffix past the last gate resumes as a static native suffix without reintroducing crossed geometry',()=>{
 const f=setup();try{
  const r=started(f),at=10+10.5/1.08+.6;assert.equal(f.advance(at).status,'advanced');
  const before=f.bridge.nativeRouteExecution(r.routeHandle),held=f.bridge.suspendNativeGateRoute(r.routeHandle).suspendedRoute;
  assert(before.z-f.gates[0].z>4);assert.equal(f.service.remove(f.gates[0].id),true);wait(f,30);
  const resumed=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resumed.status,'resumed');
  assert.equal(resumed.motionPlan.executionScope,'native-desert-worker-suffix');assert.equal(resumed.motionPlan.resumable,true);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(resumed.motionPlan.endTime).status,'advanced');
  const end=f.bridge.nativeRouteExecution(resumed.routeHandle);near(end.distance,r.motionPlan.distance);assert.equal(end.arrived,true);
 }finally{f.session.dispose();}
});

test('a committed future-path mutation automatically suspends the native route, without turning it into a planner request',()=>{
 const f=setup();try{
  const r=started(f,{facts:{urgent:true,runRemaining:4}});assert.equal(f.advance(10.5).status,'advanced');
  const before=f.bridge.nativeRouteExecution(r.routeHandle),p=f.point(.05,5),wall=f.session.core.addWall(p.x,p.z,.5,.2);assert(wall>0);
  const held=f.bridge.nativeSuspendedGateRoute(900011);assert(held);for(const key of phases)near(held.pose[key],before[key],key);
  assert.equal(f.bridge.nativeRouteTiming(r.routeHandle),null);assert.equal(f.w.nav_intent_route_reservation_count(),0);
  const queries=f.w.nav_intent_route_queries();f.session.actorSectorRevision({worker:true});f.w.nav_intent_reconcile_topology();
  assert.equal(f.w.nav_intent_replan_pending_routes(),0);assert.deepEqual(f.bridge.nativeSuspendedGateRoute(900011),held);
  wait(f,20);assert.equal(f.bridge.resumeNativeGateRoute(held.resumeHandle).status,'blocked');
  f.session.core.removeWall(wall);const resume=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resume.status,'resumed');
  assert.equal(f.w.nav_intent_route_queries(),queries);assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  assert.equal(f.advance(resume.motionPlan.endTime).status,'advanced');assert.equal(f.bridge.nativeRouteExecution(resume.routeHandle).arrived,true);
 }finally{f.session.dispose();}
});

test('resume traffic admission queries the existing inverse index even though the suspended route has no active subscriptions',()=>{
 const f=setup();try{
  const r=started(f);assert.equal(f.advance(10.5).status,'advanced');const held=f.bridge.suspendNativeGateRoute(r.routeHandle).suspendedRoute,
   untilCross=(4.5-(held.pose.z-f.gates[0].z))/1.08+.6,
   crossing=f.worker(2,f.point(.05-1.08*untilCross,4.5),f.point(6,4.5));
  assert(crossing);assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const before=f.service.read(f.gates[0].id),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.bridge.resumeNativeGateRoute(held.resumeHandle).status,'conflict');
  const witness=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_route_reservation_result_ptr(),6));
  assert.equal(witness[0],2,'the future trajectories, not just current discs, conflict');assert.equal(witness[1],2);
  assert.deepEqual(f.bridge.nativeSuspendedGateRoute(900011),held);assert.deepEqual(f.service.read(f.gates[0].id),before);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.w.nav_intent_cancel_home(900012),1);assert.equal(f.w.spatial_body_remove(2),1);
  const resume=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resume.status,'resumed');
 }finally{f.session.dispose();}
});

test('resetting the native body domain or authority retires retained slots and their resume tokens',()=>{
 for(const reset of ['bodies','authority']){
  const f=setup();try{
   const r=started(f),held=f.bridge.suspendNativeGateRoute(r.routeHandle).suspendedRoute;
   if(reset==='bodies')f.w.spatial_bodies_reset();else f.bridge.resetFromState(f.state);
   assert.equal(f.bridge.nativeSuspendedGateRoute(900011),null);assert.equal(f.bridge.resumeNativeGateRoute(held.resumeHandle).status,'stale');
   assert.equal(f.w.nav_intent_route_reservation_count(),0);
  }finally{f.session.dispose();}
 }
});

test('suspended task routes keep their task/target on resume, and target removal permanently invalidates the retained suffix',()=>{
 for(const [kind,targetKind] of [[0,0],[1,1],[2,3]]){
  const f=setup({alignGrid:true});try{
   const r=f.route();assert.equal(f.w.nav_intent_cancel_home(900011),1);f.bridge.intentChanges();
   const end=f.point(.05,6),center=Number(/-(\d+)$/.exec(f.state.workers[0].centerId)[1]);
   if(kind===2)assert(f.session.core.addBarrier(end.x,end.z,1.09,.22,0)>0);
   f.session.actorSectorRevision({worker:true});const rows=[
    [1,1,900011,center,r.a.x,r.a.z,1,0,0,1],[1,2,910001,targetKind,end.x,end.z,1,0,0,1],[1,3,920001,center,kind,0,0,910001,1,1],
   ],ptr=f.w.nav_intent_changes_ptr(rows.length);new Float64Array(f.w.memory.buffer,ptr,rows.length*10).set(rows.flat());
   assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,rows.length),1);
   assert.equal(f.w.nav_intent_plan_tasks(),1);assert.equal(f.w.nav_intent_commit(),1);
   const raw=f.bridge.intentChanges().find(e=>e.actorId===900011&&e.routeHandle)?.routeHandle,
    admitted=f.bridge.admitNativeGateRoute(raw,1,{radius:.28,urgent:true,runRemaining:3.25});assert.equal(admitted.status,'admitted');
   assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(10.5).status,'advanced');
   let held=f.bridge.suspendNativeGateRoute(admitted.routeHandle).suspendedRoute;wait(f,20);
   const queries=f.w.nav_intent_route_queries(),resume=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resume.status,'resumed');
   assert.equal(f.w.nav_intent_actor(900011),1);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_actor_ptr(),4)),[900011,1,920001,910001]);
   assert.equal(f.w.nav_intent_route_queries(),queries);held=f.bridge.suspendNativeGateRoute(resume.routeHandle).suspendedRoute;
   const remove=f.w.nav_intent_changes_ptr(1);new Float64Array(f.w.memory.buffer,remove,10).set([0,2,910001,0,0,0,0,0,0,0]);
   assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,1),1);assert.equal(f.bridge.nativeSuspendedGateRoute(900011),null);
   assert.equal(f.bridge.resumeNativeGateRoute(held.resumeHandle).status,'stale');
  }finally{f.session.dispose();}
 }
});

test('duplicate points, corners and repeated suspensions retain exact suffix geometry and cumulative phases without another planner',()=>{
 const f=setup();try{
  const r=started(f,{origin:[.05,-9],points:[[.05,-9],[.05,-5],[.05,-5],[.05,3],[3,6],[3,6]],facts:{urgent:true,runRemaining:5.25}}),
   queries=f.w.nav_intent_route_queries();let handle=r.routeHandle,plan=r.motionPlan;
  for(const fraction of [.08,.17,.36]){
   const at=plan.startTime+(plan.endTime-plan.startTime)*fraction;assert.equal(f.advance(at).status,'advanced');
   const before=f.bridge.nativeRouteExecution(handle),points=f.bridge.routePoints(handle),suspension=f.bridge.suspendNativeGateRoute(handle);
   assert.equal(suspension.status,'suspended');const held=suspension.suspendedRoute;
   assert.deepEqual(held.remainingPoints,points.subarray(before.firstRemainingPoint*2));
   wait(f,at+2);const resume=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resume.status,'resumed');
   handle=resume.routeHandle;plan=resume.motionPlan;const start=f.bridge.sampleNativeRoute(handle,plan.startTime);
   for(const key of [...phases,'x','z','yaw'])near(start[key],before[key],key);
   assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  }
  const counts=counters(f);for(let i=1;i<=300;i++)assert.equal(f.advance(plan.startTime+(plan.endTime-plan.startTime)*i/300).status,'advanced');
  assert.deepEqual(counters(f),counts);assert.equal(f.w.nav_intent_route_queries(),queries);
  const end=f.bridge.nativeRouteExecution(handle);near(end.distance,r.motionPlan.distance);near(end.runDistance,5.25);near(end.runPhase,5.25/2.4);
  near(end.walkDistance,r.motionPlan.distance-5.25);assert.equal(end.runRemaining,0);assert.equal(end.arrived,true);
 }finally{f.session.dispose();}
});

test('a retained suffix survives failed admission against a new obstacle and resumes after its removal event',()=>{
 const f=setup();try{
  const r=started(f);assert.equal(f.advance(10.5).status,'advanced');const stop=f.bridge.suspendNativeGateRoute(r.routeHandle).suspendedRoute;
  const p=f.point(.05,5),wall=f.session.core.addWall(p.x,p.z,.5,.2);assert(wall>0);
  const before=f.service.read(f.gates[0].id),sequence=f.w.nav_intent_transition_sequence(),queries=f.w.nav_intent_route_queries();
  wait(f,14);assert.equal(f.bridge.resumeNativeGateRoute(stop.resumeHandle).status,'blocked');
  assert.deepEqual(f.bridge.nativeSuspendedGateRoute(900011),stop);assert.deepEqual(f.service.read(f.gates[0].id),{...before,sampledAt:14});
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_route_reservation_count(),0);
  f.session.actorSectorRevision({worker:true});f.w.nav_intent_reconcile_topology();assert.equal(f.w.nav_intent_replan_pending_routes(),0);
  assert.deepEqual(f.bridge.nativeSuspendedGateRoute(900011),stop);
  f.session.core.removeWall(wall);const resumed=f.bridge.resumeNativeGateRoute(stop.resumeHandle);assert.equal(resumed.status,'resumed');
  assert.equal(f.w.nav_intent_route_queries(),queries);assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  assert.equal(f.advance(resumed.motionPlan.endTime).status,'advanced');assert.equal(f.bridge.nativeRouteExecution(resumed.routeHandle).arrived,true);
 }finally{f.session.dispose();}
});

test('a cancelled shared opening automatically retains dependent routes, which can resume by a later event',()=>{
 const f=setup();try{
  const a=f.route({points:[[.05,3],[-3,6]]}),b=f.route({id:2,origin:[3,-9],points:[[.05,-3],[.05,3],[3,6]]}),
   first=f.admit(a),second=f.admit(b);assert.equal(first.status,'admitted');assert.equal(second.status,'admitted');
  const clock=f.service.read(f.gates[0].id);assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  assert.equal(f.advance(clock.at+.3).status,'advanced');const pose=f.bridge.nativeRouteExecution(second.routeHandle);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);assert.equal(f.bridge.nativeSuspendedGateRoute(900011),null);
  const held=f.bridge.nativeSuspendedGateRoute(900012);assert(held);for(const key of phases)near(held.pose[key],pose[key],key);
  assert.equal(f.w.spatial_body_remove(1),1);wait(f,15);
  const resumed=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resumed.status,'resumed');
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(resumed.motionPlan.endTime).status,'advanced');
  near(f.body(2).x,Math.fround(b.end.x));near(f.body(2).z,Math.fround(b.end.z));
 }finally{f.session.dispose();}
});

test('suspended bodies cannot be silently moved or rebound, and body removal discards their retained route',()=>{
 const f=setup();try{
  const r=started(f);assert.equal(f.advance(10.5).status,'advanced');const held=f.bridge.suspendNativeGateRoute(r.routeHandle).suspendedRoute,body=f.body(1),other=f.point(4,-6);
  assert.equal(f.w.spatial_body_upsert(1,body.x+.1,body.z,.28,0,1),0);assert.deepEqual(f.body(1),body);
  assert.equal(f.w.spatial_body_upsert(77,other.x,other.z,.28,0,1),1);assert.equal(f.service.bindWorker('worker-900011',77),false);
  assert.equal(f.w.spatial_body_remove(1),1);assert.equal(f.bridge.nativeSuspendedGateRoute(900011),null);
  assert.equal(f.bridge.resumeNativeGateRoute(held.resumeHandle).status,'stale');
 }finally{f.session.dispose();}
});

test('resume tokens are not executable handles and cannot survive cancellation, authority replacement or slot reuse',()=>{
 const f=setup(),other=fixture();try{
  const r=started(f);const held=f.bridge.suspendNativeGateRoute(r.routeHandle).suspendedRoute;
  assert.equal(other.bridge.resumeNativeGateRoute(held.resumeHandle).status,'stale');
  assert.equal(f.bridge.resumeNativeGateRoute(r.routeHandle).status,'stale');
  assert.equal(f.bridge.reserveNativeRoute(held.resumeHandle,1).status,'stale');assert.equal(f.bridge.routePoints(held.resumeHandle),null);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);assert.equal(f.bridge.nativeSuspendedGateRoute(900011),null);
  const next=f.route();assert(next.handle.slot===held.resumeHandle.slot);assert.equal(f.bridge.resumeNativeGateRoute(held.resumeHandle).status,'stale');
 }finally{f.session.dispose();other.session.dispose();}
});
