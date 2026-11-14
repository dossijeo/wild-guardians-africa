import assert from 'node:assert/strict';
import {nativeGateCrossingFixture as fixture} from './native-gate-crossings.js';

const counterNames=['nav_gate_wait_segments','nav_gate_prefix_segments','nav_gate_worker_checks','nav_gate_sweep_evaluations',
 'nav_gate_static_evaluations','spatial_execution_clearance_checks','nav_intent_route_queries'];
const counters=f=>Object.fromEntries(counterNames.map(name=>[name,f.w[name]()]));
const tuple=h=>h?[h.session,h.slot,h.generation]:null;
export function runNativeGateRouteAcceptance(){
 const f=fixture({materials:['zarzas','empalizada'],positions:[-3,3]});
 try{
  const r=f.route({origin:[.05,-9],points:[[.05,-3],[.05,3],[.05,9]],facts:{urgent:true,runRemaining:5.25}}),
   sequence=f.w.nav_intent_transition_sequence(),initialClocks=f.gates.map(g=>f.service.read(g.id)),
   initial=f.admit(r);assert.equal(initial.status,'admitted');assert.deepEqual(initial.motionPlan.points,r.points);
  assert(initialClocks.every(c=>c.opening===0&&c.target===0));assert.equal(initial.motionPlan.holds.length,2);
  const clocks=f.gates.map(g=>f.service.read(g.id)),promises=f.gates.map(g=>f.bridge.nativeGateCrossings(g.id));
  assert(clocks.every(c=>c.at>10&&c.endsAt>c.at));assert(promises.every(p=>p.length===1));
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');const stopAt=clocks[1].at+.2;
  assert.equal(f.advance(stopAt).status,'advanced');const before=f.bridge.nativeRouteExecution(initial.routeHandle);
  const stopped=f.bridge.suspendNativeGateRoute(initial.routeHandle);assert.equal(stopped.status,'suspended');const held=stopped.suspendedRoute;
  assert.deepEqual(held.remainingPoints,r.points.subarray(before.firstRemainingPoint*2));
  assert(held.remainingPoints.length<r.points.length);assert.equal(f.w.nav_intent_action_active(900011),0);
  assert.equal(f.bridge.nativeRouteTiming(initial.routeHandle),null);
  assert.equal(f.service.prepareMotion({enabled:false}).status,'prepared');
  const obstacle=f.point(.05,8),wall=f.session.core.addWall(obstacle.x,obstacle.z,.5,.2);assert(wall>0);
  f.state.elapsed=30;assert.equal(f.w.nav_intent_set_time(30),1);
  const failureSequence=f.w.nav_intent_transition_sequence(),failed=f.bridge.resumeNativeGateRoute(held.resumeHandle);
  assert.equal(failed.status,'blocked');assert.equal(f.w.nav_intent_transition_sequence(),failureSequence);
  assert.deepEqual(f.bridge.nativeSuspendedGateRoute(900011),held);
  f.session.core.removeWall(wall);const resumed=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resumed.status,'resumed');
  assert.deepEqual(resumed.motionPlan.points,held.remainingPoints);assert.equal(f.w.nav_intent_route_queries(),0);
  const restart=f.bridge.sampleNativeRoute(resumed.routeHandle,30);
  for(const key of ['x','z','yaw','distance','phase','runPhase','walkPhase','carryPhase','runDistance','walkDistance','runRemaining'])
    assert(Math.abs(restart[key]-before[key])<1e-9,key);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const beforeSteps=counters(f);for(let i=1;i<=300;i++)assert.equal(f.advance(30+(resumed.motionPlan.endTime-30)*i/300).status,'advanced');
  const afterSteps=counters(f);assert.deepEqual(afterSteps,beforeSteps);
  const final=f.bridge.nativeRouteExecution(resumed.routeHandle);assert.equal(final.arrived,true);
  assert(Math.abs(final.distance-initial.motionPlan.distance)<1e-7);assert(Math.abs(final.runDistance-5.25)<1e-7);
  assert(Math.abs(final.runPhase-5.25/2.4)<1e-7);assert(Math.abs(final.walkPhase-(initial.motionPlan.distance-5.25)/.72)<1e-7);
  assert.equal(final.runRemaining,0);assert.equal(f.w.nav_intent_action_active(900011),1);
  const changes=f.bridge.intentChanges().map(e=>({type:e.type,state:e.state,actorId:e.actorId,taskId:e.taskId,targetId:e.targetId,
    sequence:e.sequence,effectiveTime:e.effectiveTime,route:tuple(e.routeHandle),revoked:tuple(e.revokedRouteHandle)}));
  assert(changes.some(e=>e.type==='RouteInvalidated'&&e.revoked));assert(changes.some(e=>e.type==='RouteCompleted'));
  assert.equal(f.w.nav_intent_route_reservation_count(),0);
  return {checklistId:'A6-04.e-R2',backend:'native-wasm',scope:'Native opt-in gate/route authority on validated intact flat Desert mechanisms. No gameplay activation, real-character/WebGPU or causal-presentation acceptance.',
    initial:{sequence,points:Array.from(r.points),clocks:initialClocks},admission:{route:tuple(initial.routeHandle),clocks,
      holds:initial.motionPlan.holds,promises:promises.map(rows=>rows.map(p=>({bodyId:p.bodyId,actorId:p.actorId,route:tuple(p.routeHandle),from:p.from,until:p.until})))},
    suspension:{at:stopAt,resume:tuple(held.resumeHandle),remainingPoints:Array.from(held.remainingPoints),pose:held.pose},
    rejectedResume:{at:30,status:failed.status,sequence:failureSequence},
    resumed:{route:tuple(resumed.routeHandle),startTime:30,endTime:resumed.motionPlan.endTime,points:Array.from(resumed.motionPlan.points),motionOffset:resumed.motionPlan.motionOffset},
    ordinaryExecution:{steps:300,before:beforeSteps,after:afterSteps},final,changes,authorizedAutonomy:false,authorizedPassage:false};
 }finally{f.session.dispose();}
}
