import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeGateCrossingFixture as setup} from './helpers/native-gate-crossings.js';

const near=(a,b,key='',epsilon=1e-7)=>assert(Math.abs(a-b)<epsilon,`${key}: ${a} != ${b}`);
const counters=f=>['nav_gate_wait_segments','nav_gate_prefix_segments','nav_gate_sweep_evaluations','nav_gate_static_evaluations',
 'spatial_execution_clearance_checks','nav_intent_route_queries'].map(name=>[name,f.w[name]()]);
function closing(f){assert.equal(f.service.prepareMotion().status,'prepared');const clock=f.service.read(f.gates[0].id);
 assert.equal(clock.opening,1);assert.equal(clock.target,0);return clock;}

test('each authored gate preserves a closing prefix and reverses continuously at the route activation event',()=>{
 for(const material of ['zarzas','empalizada','reforzado']){
  const f=setup({materials:[material],opening:1});try{
   const old=closing(f),r=f.route({origin:[.05,-old.triggerRadius-.1]}),result=f.admit(r);assert.equal(result.status,'admitted',material);
   const clock=f.service.read(f.gates[0].id);assert(clock.at>10);assert(clock.at<old.endsAt);assert(clock.from>0&&clock.from<1);
   near(clock.from,1-(clock.at-10)/.6);near(clock.endsAt,clock.at+.6*(1-clock.from));
   assert.equal(f.bridge.beginNativeRouteExecution().status,'started');const counts=counters(f);
   for(const at of [10+(clock.at-10)*.25,clock.at-1e-6,clock.at,clock.at+1e-6,clock.endsAt]){
    assert.equal(f.advance(at).status,'advanced');const pose=f.service.read(f.gates[0].id),
     expected=at<clock.at?1-(at-10)/.6:Math.min(1,clock.from+(at-clock.at)/.6);
    near(pose.opening,expected,`${material} ${at}`);
   }
   assert.deepEqual(counters(f),counts);assert.equal(f.advance(result.motionPlan.endTime).status,'advanced');
   assert.equal(f.bridge.nativeRouteExecution(result.routeHandle).arrived,true);assert.equal(f.body(1).z,Math.fround(r.end.z));
  }finally{f.session.dispose();}
 }
});

test('cancelling at an open endpoint still freezes a future closing prefix and suspends dependent routes',()=>{
 const f=setup({opening:1});try{
  closing(f);const a=f.route({points:[[.05,3],[-3,6]]}),b=f.route({id:2,origin:[3,-9],points:[[.05,-3],[.05,3],[3,6]]}),
   first=f.admit(a),second=f.admit(b);assert.equal(first.status,'admitted');assert.equal(second.status,'admitted');
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.service.read(f.gates[0].id).opening,1);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);const held=f.bridge.nativeSuspendedGateRoute(900012);assert(held);
  const frozen=f.service.read(f.gates[0].id);assert.equal(frozen.opening,1);assert.equal(frozen.target,1);assert.equal(frozen.at,10);
  f.state.elapsed=12;assert.equal(f.w.nav_intent_set_time(12),1);assert.equal(f.service.read(f.gates[0].id).opening,1);
  assert.equal(f.w.spatial_body_remove(1),1);const resume=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resume.status,'resumed');
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(resume.motionPlan.endTime).status,'advanced');
  assert.equal(f.bridge.nativeRouteExecution(resume.routeHandle).arrived,true);
 }finally{f.session.dispose();}
});

test('failure after compiling a closing prefix leaves the original closing motor and unadmitted route intact',()=>{
 const f=setup({opening:1});try{
  const old=closing(f),a=f.route(),b=f.route({id:2,origin:[.05,6],points:[[.05,-6]]}),
   sequence=f.w.nav_intent_transition_sequence(),result=f.admit(a);
  assert.equal(result.status,'conflict');assert.deepEqual(f.service.read(f.gates[0].id),old);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.deepEqual(f.bridge.routePoints(a.handle),a.points);
  assert(f.bridge.routePoints(b.handle));assert.deepEqual(f.bridge.nativeGateCrossings(f.gates[0].id),[]);
  f.state.elapsed=10.3;assert.equal(f.w.nav_intent_set_time(10.3),1);near(f.service.read(f.gates[0].id).opening,.5);
 }finally{f.session.dispose();}
});

test('a resumed suffix can compose with a newly closing motor without changing spent phases or the original prefix',()=>{
 const f=setup({opening:1});try{
  const r=f.route(),first=f.admit(r);assert.equal(first.status,'admitted');assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  assert.equal(f.advance(10.2).status,'advanced');const before=f.bridge.nativeRouteExecution(first.routeHandle),
   held=f.bridge.suspendNativeGateRoute(first.routeHandle).suspendedRoute;
  assert.equal(f.service.prepareMotion().status,'prepared');const close=f.service.read(f.gates[0].id);assert.equal(close.target,0);
  const resume=f.bridge.resumeNativeGateRoute(held.resumeHandle);assert.equal(resume.status,'resumed');
  const clock=f.service.read(f.gates[0].id);assert(clock.at>close.endsAt);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(10.4).status,'advanced');
  near(f.service.read(f.gates[0].id).opening,1-.2/.6);
  assert.equal(f.advance(resume.motionPlan.endTime).status,'advanced');const end=f.bridge.nativeRouteExecution(resume.routeHandle);
  assert.equal(end.arrived,true);assert(end.distance>before.distance);near(end.distance,first.motionPlan.distance);
 }finally{f.session.dispose();}
});
