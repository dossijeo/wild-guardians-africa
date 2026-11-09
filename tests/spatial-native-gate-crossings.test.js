import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';

const near=(a,b,label='',epsilon=1e-7)=>assert(Math.abs(a-b)<epsilon,`${label}: ${a} != ${b}`);
function setup({materials=['zarzas'],positions=[0],opening=0,yaw=0,install=true,alignGrid=false}={}){
 const f=fixture(),p=f.point(0,0);f.session.core.setSettlement(p.x,p.z,24,24);
 const service=createSpatialGateIntents(f.session,f.state),gates=materials.map((material,i)=>({
  id:`structure-${990001+i}`,gate:true,status:'intact',material,...f.point(0,positions[i]),
  ...(alignGrid?{x:Math.round(p.x)-.05}:{}),gateOpen:opening,yaw}));
 for(const gate of gates){assert(service.register(gate));if(install)assert.equal(service.installMechanism(gate.id,gate.material).status,'installed');}
 function route({id=1,origin=[.05,-6],points=[[.05,6]],facts={}}={}){
  const a=f.point(...origin),path=points.map(p=>f.point(...p)),end=path.at(-1);f.session.actorSectorRevision({worker:true});
  const ptr=f.w.nav_intent_attack_route_input_ptr(path.length);
  new Float32Array(f.w.memory.buffer,ptr,path.length*2).set(path.flatMap(p=>[p.x,p.z]));
  assert.equal(f.w.nav_intent_restore_home(900010+id,a.x,a.z,end.x,end.z,path.length),1);
  const handle=f.bridge.intentChanges().find(e=>e.actorId===900010+id&&e.routeHandle)?.routeHandle;assert(handle);
  assert.equal(f.w.spatial_body_upsert(id,a.x,a.z,.28,0,facts.incapacitated?3:1),1);
  assert(service.bindWorker(`worker-${900010+id}`,id));
  return {handle,a,end,points:f.bridge.routePoints(handle),facts,id};
 }
 return {...f,service,gates,route,admit:r=>f.bridge.admitNativeGateRoute(r.handle,r.id,{radius:.28,...r.facts})};
}
const geometryCounters=f=>['nav_gate_wait_segments','nav_gate_prefix_segments','nav_gate_worker_checks','nav_gate_sweep_evaluations',
 'nav_gate_static_evaluations','spatial_execution_clearance_checks','nav_intent_route_queries','nav_intent_route_validation_segments']
 .map(name=>[name,f.w[name]?.()]);

test('one native transaction admits an unchanged complete route through an initially closed physical gate',()=>{
 for(const material of ['zarzas','empalizada','reforzado']){
  const f=setup({materials:[material]});try{
   const r=f.route(),sequence=f.w.nav_intent_transition_sequence(),queries=f.w.nav_intent_route_queries(),result=f.admit(r);
   assert.equal(result.status,'admitted',material);const plan=result.motionPlan;
   assert.equal(plan.executionScope,'native-desert-gate-crossing');assert.equal(plan.nativeCrossingAdmitted,true);
   assert.equal(plan.authorizedAutonomy,false);assert.equal(plan.authorizedPassage,false);
   assert.deepEqual(plan.points,r.points);assert.equal(f.w.nav_intent_route_queries(),queries);
   assert.equal(f.bridge.routePoints(r.handle),null);const [change]=f.bridge.intentChanges();
   assert.equal(change.type,'RouteReplaced');assert.equal(change.sequence,sequence+1);assert.deepEqual(change.revokedRouteHandle,r.handle);
   const gate=f.service.read(f.gates[0].id);assert.equal(gate.opening,0);assert(gate.at>10);near(gate.endsAt-gate.at,.6);
   assert.equal(plan.holds.length,1);assert(plan.holds[0].distance>0);near(plan.holds[0].until,gate.endsAt);
   const [lease]=f.bridge.nativeGateCrossings(f.gates[0].id);assert.deepEqual(lease.routeHandle,result.routeHandle);
   assert.equal(lease.actorId,900011);assert.equal(lease.bodyId,1);assert(lease.until>lease.from);
   assert(Object.isFrozen(lease));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
   assert.equal(f.advance(gate.at).status,'advanced');near(f.service.read(f.gates[0].id).opening,0);
   assert.equal(f.advance(gate.at+.3).status,'advanced');near(f.service.read(f.gates[0].id).opening,.5);
   const held=f.bridge.nativeRouteExecution(result.routeHandle);assert.equal(held.currentSpeed,0);
   assert.equal(f.advance(plan.endTime).status,'advanced');assert.equal(f.body(1).x,Math.fround(r.end.x));assert.equal(f.body(1).z,Math.fround(r.end.z));
   assert.equal(f.bridge.nativeRouteExecution(result.routeHandle).arrived,true);
  }finally{f.session.dispose();}
 }
});

test('multiple initially closed gates have ordered native future openings and holds on the same route',()=>{
 const f=setup({materials:['zarzas','empalizada'],positions:[-3,3]});try{
  const r=f.route({origin:[.05,-9],points:[[.05,9]],facts:{urgent:true,runRemaining:4.5}}),result=f.admit(r);
  assert.equal(result.status,'admitted');const plan=result.motionPlan;assert.equal(plan.holds.length,2);
  assert(plan.holds[1].distance>plan.holds[0].distance);assert(plan.holds[1].from>plan.holds[0].until);
  assert.deepEqual(plan.points,r.points);const clocks=f.gates.map(g=>f.service.read(g.id));
  assert(clocks[0].at<clocks[1].at);assert(clocks[1].at>clocks[0].endsAt);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const before=geometryCounters(f);
  for(let i=1;i<=300;i++)assert.equal(f.advance(10+(plan.endTime-10)*i/300).status,'advanced');
  assert.deepEqual(geometryCounters(f),before,'ordinary execution never rebuilds routes, intervals or collision proofs');
  const end=f.bridge.nativeRouteExecution(result.routeHandle);near(end.runRemaining,0);near(end.runDistance,4.5);
  near(end.runPhase,4.5/2.4);near(end.walkPhase,(plan.distance-4.5)/.72);assert.equal(f.body(1).z,Math.fround(r.end.z));
 }finally{f.session.dispose();}
});

test('motor policy cannot freeze or close a reserved crossing, and gate removal cannot orphan it',()=>{
 const f=setup();try{
  const r=f.route(),result=f.admit(r);assert.equal(result.status,'admitted');const gate=f.gates[0],before=f.service.read(gate.id);
  assert.equal(f.service.prepareMotion({enabled:false}).status,'crossing-reserved');
  assert.equal(f.service.reconcile({enabled:false}).status,'crossing-reserved');assert.equal(f.service.remove(gate.id),false);
  assert.deepEqual(f.service.read(gate.id),before);assert.equal(f.service.prepareMotion().status,'prepared');
  assert.deepEqual(f.service.read(gate.id),before);assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const crossingTime=(f.bridge.nativeGateCrossings(gate.id)[0].from+f.bridge.nativeGateCrossings(gate.id)[0].until)/2;
  assert.equal(f.advance(crossingTime).status,'advanced');const at=f.service.read(gate.id);
  assert.equal(at.opening,1);assert.equal(f.service.prepareMotion().status,'prepared');assert.equal(f.service.read(gate.id).target,1);
 }finally{f.session.dispose();}
});

test('a failure at a later gate leaves every route, lease and motor unchanged',()=>{
 const f=setup({materials:['zarzas','empalizada'],positions:[-3,3]});try{
  // Physically clear now, but inside the second leaf's future sweep.
  const p=f.point(.2,3.8);assert.equal(f.w.spatial_body_upsert(77,p.x,p.z,.1,1,1),1);
  const r=f.route({origin:[.05,-9],points:[[.05,9]]}),before=f.gates.map(g=>f.service.read(g.id)),
   sequence=f.w.nav_intent_transition_sequence(),snapshot=f.session.core.snapshot();
  assert.equal(f.admit(r).status,'blocked');assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.deepEqual(f.bridge.routePoints(r.handle),r.points);assert.deepEqual(f.gates.map(g=>f.service.read(g.id)),before);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);assert.deepEqual(f.session.core.snapshot(),snapshot);
  for(const gate of f.gates)assert.deepEqual(f.bridge.nativeGateCrossings(gate.id),[]);
 }finally{f.session.dispose();}
});

test('static frame/leaf and unmodelled gate failures never turn an old read-only candidate into a passage permit',()=>{
 for(const options of [{install:false},{origin:[-.9,-6],points:[[-.9,6]]},{origin:[-1.1,-3],points:[[-1.1,3]]}]){
  const f=setup(options);try{
   const r=f.route(options),before=f.service.read(f.gates[0].id),result=f.admit(r);
   assert.notEqual(result.status,'admitted');assert.deepEqual(f.bridge.routePoints(r.handle),r.points);
   assert.deepEqual(f.service.read(f.gates[0].id),before);assert.equal(f.w.nav_intent_route_reservation_count(),0);
  }finally{f.session.dispose();}
 }
});

test('body traffic conflicts abort admission without opening the gate',()=>{
 const f=setup();try{
  const a=f.route(),b=f.route({id:2,origin:[.05,6],points:[[.05,-6]]}),before=f.service.read(f.gates[0].id);
  assert.equal(f.admit(a).status,'conflict');assert.deepEqual(f.service.read(f.gates[0].id),before);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);assert.deepEqual(f.bridge.nativeGateCrossings(f.gates[0].id),[]);
  assert(f.bridge.routePoints(a.handle));assert(f.bridge.routePoints(b.handle));
 }finally{f.session.dispose();}
});

test('the whole route is proved against the opened leaf, not only the 0.6 second motor interval',()=>{
 const f=setup();try{
  const r=f.route({points:[[.05,2],[-1.5,2],[-1.5,1],[.05,1]]}),before=f.service.read(f.gates[0].id);
  assert.equal(f.admit(r).status,'blocked');assert.deepEqual(f.bridge.routePoints(r.handle),r.points);
  assert.deepEqual(f.service.read(f.gates[0].id),before);assert.equal(f.w.nav_intent_route_reservation_count(),0);
 }finally{f.session.dispose();}
});

test('two compatible routes share one immutable motor promise, and cancelling its opening revokes dependent routes by event',()=>{
 const f=setup();try{
  const a=f.route({points:[[.05,3],[-3,6]]}),b=f.route({id:2,origin:[3,-9],points:[[.05,-3],[.05,3],[3,6]]}),
   first=f.admit(a);assert.equal(first.status,'admitted');const clock=f.service.read(f.gates[0].id),second=f.admit(b);
  assert.equal(second.status,'admitted');assert.deepEqual(f.service.read(f.gates[0].id),clock);
  assert.equal(f.bridge.nativeGateCrossings(f.gates[0].id).length,2);f.bridge.intentChanges();
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(clock.at+.3).status,'advanced');
  const before=f.service.read(f.gates[0].id),held=f.body(2);near(before.opening,.5);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);
  assert.equal(f.w.nav_intent_route_reservation_count(),0);assert.deepEqual(f.bridge.nativeGateCrossings(f.gates[0].id),[]);
  assert.equal(f.bridge.nativeRouteTiming(first.routeHandle),null);assert.equal(f.bridge.nativeRouteTiming(second.routeHandle),null);
  const changes=f.bridge.intentChanges();assert(changes.some(e=>e.actorId===900012&&e.type==='RouteInvalidated'));
  const frozen=f.service.read(f.gates[0].id);near(frozen.opening,.5);near(frozen.target,.5);
  near(f.body(2).x,held.x);near(f.body(2).z,held.z);
 }finally{f.session.dispose();}
});

test('cancellation before a future opening freezes the promised motor and releases exact-generation leases',()=>{
 const f=setup();try{
  const r=f.route(),result=f.admit(r);assert.equal(result.status,'admitted');const gate=f.gates[0];
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(10.5).status,'advanced');
  const at=f.service.read(gate.id);assert.equal(at.opening,0);assert(at.at>10.5);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);assert.equal(f.w.nav_intent_route_reservation_count(),0);
  assert.equal(f.bridge.nativeRouteTiming(result.routeHandle),null);assert.deepEqual(f.bridge.nativeGateCrossings(gate.id),[]);
  const frozen=f.service.read(gate.id);assert.equal(frozen.opening,0);assert.equal(frozen.target,0);near(frozen.at,10.5);
  assert.equal(f.w.nav_intent_set_time(15),1);assert.equal(f.service.read(gate.id).opening,0);
 }finally{f.session.dispose();}
});

test('cancellation inside an open passage cannot close the gate over the now-held body',()=>{
 const f=setup();try{
  const r=f.route(),result=f.admit(r);assert.equal(result.status,'admitted');assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const plan=result.motionPlan,at=plan.startTime+6/plan.speed+plan.holds.reduce((sum,h)=>sum+h.until-h.from,0);
  assert.equal(f.advance(at).status,'advanced');const body=f.body(1);assert(Math.abs(body.z-f.gates[0].z)<.1);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);assert.deepEqual(f.bridge.nativeGateCrossings(f.gates[0].id),[]);
  assert.equal(f.service.read(f.gates[0].id).opening,1);assert.equal(f.service.prepareMotion().status,'prepared');
  assert.equal(f.service.read(f.gates[0].id).target,1);near(f.body(1).z,body.z);
 }finally{f.session.dispose();}
});

test('crossing readers and admission reject foreign epochs and stale generations',()=>{
 const f=setup(),other=fixture();try{
  const r=f.route();assert.equal(other.bridge.admitNativeGateRoute(r.handle,1,{radius:.28}).status,'stale');
  const result=f.admit(r);assert.equal(result.status,'admitted');assert.equal(f.admit(r).status,'stale');
  assert.equal(f.bridge.nativeRouteTiming(r.handle),null);const before=geometryCounters(f),sequence=f.w.nav_intent_transition_sequence();
  for(let i=0;i<100;i++){assert(f.bridge.nativeRouteTiming(result.routeHandle));assert(f.bridge.nativeGateCrossings(f.gates[0].id));}
  assert.deepEqual(geometryCounters(f),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
 }finally{f.session.dispose();other.session.dispose();}
});

test('native admitted holds preserve run budget, carrying and locomotion phases for every worker motion policy',()=>{
 for(const facts of [{},{urgent:true,runRemaining:3.25},{urgent:true,runRemaining:.15},{carrying:true,urgent:true,runRemaining:3.25},
  {flight:true,runRemaining:3.25},{flight:true,slow:true,incapacitated:true,runRemaining:3.25},{urgent:true,recovering:true,runRemaining:3.25}]){
  const f=setup();try{
   const r=f.route({facts}),result=f.admit(r);assert.equal(result.status,'admitted',JSON.stringify(facts));
   const plan=result.motionPlan,hold=plan.holds[0],a=f.bridge.sampleNativeRoute(result.routeHandle,hold.from+.1),
    b=f.bridge.sampleNativeRoute(result.routeHandle,hold.until-.1);
   for(const key of ['x','z','runPhase','walkPhase','carryPhase','runRemaining','distance'])assert.equal(a[key],b[key],key);
   assert.equal(a.currentSpeed,0);assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
   assert.equal(f.advance(plan.endTime).status,'advanced');const end=f.bridge.nativeRouteExecution(result.routeHandle),
    running=facts.carrying||!facts.flight&&(!facts.urgent||facts.recovering||facts.incapacitated)?0:
      facts.flight?plan.distance:Math.min(plan.distance,facts.runRemaining??0),walking=plan.distance-running;
   near(end.runPhase,running/2.4);near(end.walkPhase,facts.carrying?0:walking/.72);near(end.carryPhase,facts.carrying?walking/.72:0);
   near(end.runRemaining,facts.flight?facts.runRemaining:Math.max(0,(facts.runRemaining??0)-running));
  }finally{f.session.dispose();}
 }
});

test('task admissions preserve task/target and geometry; a grid connector contacting the frame is rejected, never repaired silently',()=>{
 for(const [kind,targetKind] of [[0,0],[1,1],[2,3]])for(const alignGrid of [false,true]){
  const f=setup({alignGrid});try{
   const r=f.route();assert.equal(f.w.nav_intent_cancel_home(900011),1);f.bridge.intentChanges();const end=f.point(.05,6),
    center=Number(/-(\d+)$/.exec(f.state.workers[0].centerId)[1]);
   if(kind===2)assert(f.session.core.addBarrier(end.x,end.z,1.09,.22,0)>0);
   f.session.actorSectorRevision({worker:true});const rows=[
    [1,1,900011,center,r.a.x,r.a.z,1,0,0,1],[1,2,910001,targetKind,end.x,end.z,1,0,0,1],[1,3,920001,center,kind,0,0,910001,1,1],
   ],ptr=f.w.nav_intent_changes_ptr(rows.length);new Float64Array(f.w.memory.buffer,ptr,rows.length*10).set(rows.flat());
   assert.equal(f.w.nav_intent_apply_changes(f.w.nav_intent_last_sequence()+1,rows.length),1);
   assert.equal(f.w.nav_intent_plan_tasks(),1);assert.equal(f.w.nav_intent_commit(),1);
   const raw=f.bridge.intentChanges().find(event=>event.actorId===900011&&event.routeHandle)?.routeHandle,points=f.bridge.routePoints(raw),
    queries=f.w.nav_intent_route_queries(),result=f.bridge.admitNativeGateRoute(raw,1,{radius:.28,urgent:true,runRemaining:3.25});
   assert.equal(result.status,alignGrid?'admitted':'blocked',JSON.stringify({kind,alignGrid,points:Array.from(points??[]),
    sweep:Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_sweep_result_ptr(),6))}));
   assert.deepEqual(alignGrid?result.motionPlan.points:f.bridge.routePoints(raw),points);assert.equal(f.w.nav_intent_route_queries(),queries);
   if(!alignGrid){const x=Math.round(f.gates[0].x),z=f.gates[0].z,
    hit=f.bridge.nativeGateMechanismSegment(f.gates[0].id,1,{x,z:z-1},{x,z:z+1});
    assert.equal(hit.status,'blocked');assert(hit.components&7,'real frame contact, not a timing test failure');
    assert.equal(f.service.read(f.gates[0].id).opening,0);assert.deepEqual(f.bridge.nativeGateCrossings(f.gates[0].id),[]);
   }
   assert.equal(f.w.nav_intent_actor(900011),1);assert.deepEqual(Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_actor_ptr(),4)),[900011,1,920001,910001]);
  }finally{f.session.dispose();}
 }
});

test('rejected support/object changes preserve the admitted route and future motor promise',()=>{
 const f=setup();try{
  const r=f.route(),result=f.admit(r);assert.equal(result.status,'admitted');assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const gate=f.gates[0],before=f.service.read(gate.id),leases=f.bridge.nativeGateCrossings(gate.id),
   sequence=f.w.nav_intent_transition_sequence(),snapshot=f.session.core.snapshot(),p=f.point(-.9,0);
  assert.equal(f.session.core.addWall(p.x,p.z,.01,.01),0);
  assert.throws(()=>f.session.core.setSettlement(gate.x+3,gate.z,5,5),/Native terrain mutation rejected/);
  assert.deepEqual(f.session.core.snapshot(),snapshot);assert.deepEqual(f.bridge.nativeGateCrossings(gate.id),leases);
  assert.deepEqual(f.service.read(gate.id),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.advance(result.motionPlan.endTime).status,'advanced');assert.equal(f.bridge.nativeRouteExecution(result.routeHandle).arrived,true);
 }finally{f.session.dispose();}
});

test('releasing an arrived route permits a later native close event only when its body has cleared the opening',()=>{
 const f=setup();try{
  const r=f.route(),result=f.admit(r);assert.equal(result.status,'admitted');assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  assert.equal(f.advance(result.motionPlan.endTime).status,'advanced');assert.equal(f.w.nav_intent_cancel_home(900011),1);
  assert.deepEqual(f.bridge.nativeGateCrossings(f.gates[0].id),[]);assert.equal(f.service.prepareMotion().status,'prepared');
  const clock=f.service.read(f.gates[0].id);assert.equal(clock.opening,1);assert.equal(clock.target,0);near(clock.endsAt-clock.at,.6);
  f.state.elapsed=clock.endsAt;assert.equal(f.w.nav_intent_set_time(clock.endsAt),1);assert.equal(f.service.read(f.gates[0].id).opening,0);
  assert.equal(f.body(1).z,Math.fround(r.end.z));
 }finally{f.session.dispose();}
});

test('an active closing motor is explicitly unsupported instead of silently frozen until a future request',()=>{
 const f=setup({opening:1});try{
  assert.equal(f.service.prepareMotion().status,'prepared');const before=f.service.read(f.gates[0].id);
  assert.equal(before.opening,1);assert.equal(before.target,0);
  const r=f.route(),sequence=f.w.nav_intent_transition_sequence();assert.equal(f.admit(r).status,'unsupported');
  assert.deepEqual(f.service.read(f.gates[0].id),before);assert.deepEqual(f.bridge.routePoints(r.handle),r.points);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_route_reservation_count(),0);
 }finally{f.session.dispose();}
});
