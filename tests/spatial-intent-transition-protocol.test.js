import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

// No mock/optional skip: exercise the shipped native binary and real planner.
const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

test('pthread runtime exposes the same native transition ABI as standalone',async()=>{
  const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');
  const world=await createThreadedSpatialWorld(factory);
  try{
    assert.equal(world.core.wasm.nav_intent_protocol_version(),2);
    assert.equal(world.core.wasm.nav_intent_change_width(),15);
    assert.equal(world.core.wasm.nav_intent_set_time(1),1);
    assert.equal(world.core.wasm.nav_intent_set_time(0),0);
    assert.equal(typeof world.core.wasm.nav_intent_route_validation_count,'function');
    assert.equal(typeof world.core.wasm.spatial_execution_segment_clear,'function');
    for(const name of ['nav_intent_route_timing','nav_intent_route_timing_ptr',
      'nav_intent_route_distances_ptr','nav_intent_route_sample',
      'nav_intent_route_sample_ptr','nav_intent_route_time_samples','nav_intent_timing_rejection'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_intent_route_reserve','nav_intent_route_reservation_result_ptr',
      'nav_intent_route_reservation_count','nav_intent_route_reservation_checks',
      'nav_intent_route_reservation_pairs','nav_intent_route_reservation_body_checks',
      'nav_intent_route_reservation_mutation_candidates'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    assert.equal(typeof world.core.wasm.nav_intent_route_prepare_motion,'function');
    assert.equal(world.core.wasm.nav_intent_route_timing_width(),20);
    assert.equal(world.core.wasm.nav_intent_route_sample_width(),18);
    for(const name of ['nav_intent_execution_begin','nav_intent_execution_advance',
      'nav_intent_execution_stop','nav_intent_route_execution','nav_intent_route_execution_ptr',
      'nav_intent_execution_advances','nav_intent_execution_evaluations',
      'nav_intent_execution_body_updates','nav_intent_execution_stop_invalidations'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_intent_static_mutation_candidates','nav_intent_static_mutation_segments',
      'nav_intent_static_mutation_body_checks','nav_intent_static_mutation_revocations',
      'nav_intent_static_mutation_rejected','nav_intent_static_mutation_commits'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_intent_residency_candidates','nav_intent_residency_segments',
      'nav_intent_residency_body_checks','nav_intent_residency_revocations',
      'nav_intent_residency_rejected','nav_intent_residency_commits','nav_intent_residency_pin_revision',
      'spatial_has_chunk','spatial_release_chunk','spatial_release_chunks'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    assert.equal(world.core.wasm.nav_intent_props_mutation_version(),1);
    assert.equal(world.core.wasm.nav_intent_terrain_mutation_version(),1);
    assert.equal(world.core.wasm.nav_gate_version(),1);
    assert.equal(world.core.wasm.nav_gate_state_width(),14);
    assert.equal(world.core.wasm.nav_gate_sweep_version(),1);
    assert.equal(world.core.wasm.nav_intent_route_hold_version(),1);
    assert.equal(world.core.wasm.nav_intent_route_holds_version(),1);
    for(const name of ['nav_intent_route_gate_candidate','nav_intent_route_holds','nav_intent_route_holds_ptr',
      'nav_intent_route_time_knots','nav_intent_route_time_knots_ptr','nav_gate_wait_segments'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    assert.equal(world.core.wasm.nav_gate_motion_transaction_version(),1);
    assert.equal(world.core.wasm.nav_gate_static_object_version(),1);
    assert.equal(world.core.wasm.nav_gate_mechanism_version(),1);
    assert.equal(world.core.wasm.nav_gate_crossing_version(),1);
    for(const name of ['nav_gate_crossing_count','nav_gate_crossings','nav_gate_route_admitted','nav_gate_admit_route'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_gate_mechanism_install','nav_gate_mechanism_pose','nav_gate_mechanism_pose_ptr','nav_gate_mechanism_vertices',
      'nav_gate_mechanism_positions_ptr','nav_gate_mechanism_leaf_ptr','nav_gate_mechanism_segment','nav_gate_mechanism_collision_ptr'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_gate_mechanism_world_vertices','nav_gate_mechanism_world_ptr'])assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_gate_prepare_object_motion','nav_gate_motion_stage_objects','nav_gate_static_objects_certified',
      'nav_gate_static_result_ptr','nav_gate_static_pairs','nav_gate_static_evaluations','nav_gate_static_rejected'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_gate_motion_stage','nav_gate_motion_ticket','nav_gate_motion_ticket_ptr','nav_gate_motion_cancel','nav_gate_motion_commit'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_intent_route_initial_hold','nav_intent_route_initial_hold_ptr','nav_gate_prepare_waiting_route'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_gate_prepare_motion','nav_gate_body_sweep_certified','nav_gate_route_sweep',
      'nav_gate_sweep_result_ptr','nav_gate_sweep_pairs','nav_gate_sweep_evaluations','nav_gate_sweep_rejected'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_gate_input_ptr','nav_gate_register','nav_gate_remove','nav_gate_bind_worker',
      'nav_gate_reconcile','nav_gate_state','nav_gate_polygon','nav_gate_result_ptr','nav_gate_worker_waiting'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_intent_terrain_candidates','nav_intent_terrain_segments','nav_intent_terrain_body_checks',
      'nav_intent_terrain_revocations','nav_intent_terrain_rejected','nav_intent_terrain_commits','nav_intent_terrain_recipe_chunks'])
      assert.equal(typeof world.core.wasm[name],'function',name);
    for(const name of ['nav_intent_props_mutation_candidates','nav_intent_props_mutation_segments',
      'nav_intent_props_mutation_body_checks','nav_intent_props_mutation_revocations',
      'nav_intent_props_mutation_rejected','nav_intent_props_mutation_commits','nav_intent_props_mutation_recipe_chunks'])
      assert.equal(typeof world.core.wasm[name],'function',name);
  }finally{await world.dispose();}
});
function fixture(options={}){
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  state.workers=[];state.plants=[];state.tasks=[];state.crates=[];state.spells=[];
  state.elapsed=10;
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  let start,end;
  for(let z=-10;z<=10&&!end;z++)for(let x=-10;x<=10&&!end;x++){
    const from={x:x+.2,z:z+.2},to={x:x+12.2,z:z+.2};
    const result=session.routeActor(from,to,{worker:false,species:'warthog'});
    if(result.status==='found'&&result.points.length){start=from;end=to;}
  }
  assert(end,'native fixture needs a multi-second warthog route');
  const actor={id:'animal-900002',species:'warthog',radius:1.1,...start,
    status:'walking',hitsRemaining:2};
  const crop={id:'plant-900001',species:'mijo',alive:true,...end};
  state.plants=[crop];state.raid={animals:[actor],reservations:{}};
  const bridge=createSpatialIntentBridge(session,options);
  bridge.resetFromState(state);
  return {state,session,bridge,actor,crop,end};
}

test('AttackCrops publishes one ordered native transition at mutation time, not drain time',()=>{
  const f=fixture();
  try{
    const plan=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(plan.status,'found');
    assert(Math.hypot(plan.approach.point.x-f.actor.x,
      plan.approach.point.z-f.actor.z)>8);
    const calls=f.session.core.wasm.nav_intent_actor_planning_calls(900002);
    const validations=f.session.core.wasm.nav_intent_route_validation_count();
    f.state.elapsed=50; // A late preparer must not restamp an old assignment.
    const [event]=f.bridge.intentChanges();
    assert.equal(event.type,'RouteAssigned');
    assert.equal(event.protocolVersion,2);
    assert.equal(event.sequence,1);
    assert.equal(event.effectiveTime,10);
    assert.deepEqual(event.routeHandle,plan.routeHandle);
    assert.equal(event.revokedRouteHandle,null);
    for(let tick=0;tick<200;tick++){
      assert(f.bridge.routePoints(plan.routeHandle).length>0);
      assert.deepEqual(f.bridge.intentChanges(),[]);
    }
    assert.equal(f.session.core.wasm.nav_intent_actor_planning_calls(900002),calls);
    assert.equal(f.session.core.wasm.nav_intent_route_validation_count(),validations);
    // This checks native log/handle access, not autonomous simulation or GPU.
  }finally{f.session.dispose();}
});

test('target removal retains the exact revoked route even after slot reuse',()=>{
  const f=fixture();
  try{
    const first=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(first.status,'found');
    const assigned=f.bridge.intentChanges()[0];
    f.state.elapsed=12;
    f.bridge.applyEvents(f.state,[{type:'target',remove:true,id:f.crop.id}]);
    assert.equal(f.bridge.routePoints(first.routeHandle),null);
    f.bridge.applyEvents(f.state,[{type:'target',entity:f.crop}]);
    const second=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(second.status,'found');
    assert.notDeepEqual(first.routeHandle,second.routeHandle);
    f.state.elapsed=100;
    const [revoked,replacement]=f.bridge.intentChanges();
    assert.equal(revoked.type,'RouteInvalidated');
    assert.equal(revoked.sequence,assigned.sequence+1);
    assert.equal(revoked.effectiveTime,12);
    assert.equal(revoked.routeHandle,null);
    assert.deepEqual(revoked.revokedRouteHandle,first.routeHandle);
    assert.equal(replacement.type,'RouteAssigned');
    assert.equal(replacement.sequence,revoked.sequence+1);
    assert.equal(replacement.effectiveTime,12);
    assert.deepEqual(replacement.routeHandle,second.routeHandle);
  }finally{f.session.dispose();}
});

test('a real native wall revokes its intersected route with its old identity',()=>{
  const f=fixture();
  try{
    const plan=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(plan.status,'found');
    f.bridge.intentChanges();
    const path=plan.approach.path,point=path[Math.floor(path.length/2)];
    const wall=f.session.core.addWall(point.x,point.z,.3,.3);
    assert(wall>0);
    f.state.elapsed=11;
    assert.equal(f.bridge.reconcileTopology(),1);
    const [event]=f.bridge.intentChanges();
    assert.equal(event.type,'RouteInvalidated');
    assert.equal(event.effectiveTime,11);
    assert.deepEqual(event.revokedRouteHandle,plan.routeHandle);
    assert.equal(f.bridge.routePoints(plan.routeHandle),null);
  }finally{f.session.dispose();}
});

test('spatial subscriptions ignore distant mutations instead of scanning every active route',()=>{
  const f=fixture();
  try{
    const plan=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(plan.status,'found');
    f.bridge.intentChanges();
    const wasm=f.session.core.wasm;
    const checks=wasm.nav_intent_route_validation_count(),
      candidates=wasm.nav_intent_reconcile_candidate_count();
    const farWall=f.session.core.addWall(40,40,.3,.3);
    assert(farWall>0);
    assert.equal(f.bridge.reconcileTopology(),0);
    assert.equal(wasm.nav_intent_route_validation_count(),checks,
      'an unrelated native wall must not resample the actor polyline');
    assert.equal(wasm.nav_intent_reconcile_candidate_count(),candidates);
    assert(f.bridge.routePoints(plan.routeHandle));
    assert.deepEqual(f.bridge.intentChanges(),[]);
    const point=plan.approach.path[Math.floor(plan.approach.path.length/2)];
    assert(f.session.core.addWall(point.x,point.z,.3,.3)>0);
    assert.equal(f.bridge.reconcileTopology(),1);
    assert.equal(wasm.nav_intent_route_validation_count(),checks+1);
    assert.equal(wasm.nav_intent_reconcile_candidate_count(),candidates+1);
    assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,plan.routeHandle);
  }finally{f.session.dispose();}
});

test('completed routes release spatial subscriptions and cannot be reactivated by a wall',()=>{
  const f=fixture();
  try{
    const plan=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(plan.status,'found');
    assert(f.bridge.markAttackActive(f.actor.id));
    f.bridge.intentChanges();
    const point=plan.approach.path[Math.floor(plan.approach.path.length/2)];
    assert(f.session.core.addWall(point.x,point.z,.3,.3)>0);
    const wasm=f.session.core.wasm,checks=wasm.nav_intent_route_validation_count(),
      candidates=wasm.nav_intent_reconcile_candidate_count();
    assert.equal(f.bridge.reconcileTopology(),0);
    assert.equal(wasm.nav_intent_route_validation_count(),checks);
    assert.equal(wasm.nav_intent_reconcile_candidate_count(),candidates,
      'completion must remove inverse subscriptions, not merely skip its check');
    assert.deepEqual(f.bridge.intentChanges(),[]);
    assert.equal(wasm.nav_intent_actor(900002),1);
    const record=new Float64Array(wasm.memory.buffer,wasm.nav_intent_actor_ptr(),10);
    assert.equal(record[1],2,'the committed action remains authoritative');
  }finally{f.session.dispose();}
});

test('a local wall validates its subscriber, not other disjoint native routes',()=>{
  const f=fixture();
  try{
    const first=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(first.status,'found');
    const remote=[];
    for(const [cx,cz] of [[35,35],[-40,35],[35,-40]]){
      let plan;
      for(let dz=0;dz<6&&!plan;dz++)for(let dx=0;dx<6&&!plan;dx++){
        const actor={id:`animal-${900010+remote.length}`,species:'warthog',
          x:cx+dx+.2,z:cz+dz+.2,exit:{x:cx+dx+4.2,z:cz+dz+.2}};
        const route=f.bridge.planRetreatRoute(actor);
        if(route.status==='found')plan=route;
      }
      assert(plan,'fixture needs a disjoint native route');
      remote.push(plan);
    }
    f.bridge.intentChanges();
    const wasm=f.session.core.wasm,checks=wasm.nav_intent_route_validation_count(),
      candidates=wasm.nav_intent_reconcile_candidate_count();
    const point=first.approach.path[Math.floor(first.approach.path.length/2)];
    assert(f.session.core.addWall(point.x,point.z,.3,.3)>0);
    assert.equal(f.bridge.reconcileTopology(),1);
    assert.equal(wasm.nav_intent_route_validation_count(),checks+1);
    assert.equal(wasm.nav_intent_reconcile_candidate_count(),candidates+1);
    for(const route of remote)assert(f.bridge.routePoints(route.routeHandle),
      'disjoint actors retain the exact route generation');
    const events=f.bridge.intentChanges();
    assert.equal(events.length,1);
    assert.equal(events[0].actorId,900002);
    // Reservations/conflict anticipation are not asserted by this index test.
  }finally{f.session.dispose();}
});

test('entering an authorized attack completes the route without deciding a hit',()=>{
  const f=fixture();
  try{
    const plan=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(plan.status,'found');
    f.bridge.intentChanges();
    f.state.elapsed=18;
    const before=structuredClone(f.state.events),hits=f.actor.hitsRemaining;
    assert(f.bridge.markAttackActive(f.actor.id));
    const [event]=f.bridge.intentChanges();
    assert.equal(event.type,'RouteCompleted');
    assert.equal(event.state,2);
    assert.equal(event.effectiveTime,18);
    assert.deepEqual(event.revokedRouteHandle,plan.routeHandle);
    assert.equal(f.bridge.routePoints(plan.routeHandle),null);
    assert.deepEqual(f.state.events,before);
    assert.equal(f.actor.hitsRemaining,hits);
  }finally{f.session.dispose();}
});

test('actor retirement cannot silently leave a published route executable',()=>{
  const f=fixture();
  try{
    const plan=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(plan.status,'found');
    f.bridge.intentChanges();
    f.state.elapsed=13;
    assert(f.bridge.retireActor(f.actor.id));
    const [event]=f.bridge.intentChanges();
    assert.equal(event.type,'RouteInvalidated');
    assert.equal(event.effectiveTime,13);
    assert.deepEqual(event.revokedRouteHandle,plan.routeHandle);
    assert.equal(f.bridge.routePoints(plan.routeHandle),null);
  }finally{f.session.dispose();}
});

test('time cannot rewind inside a session; restore changes session and restarts event order',()=>{
  const f=fixture();
  try{
    const first=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(first.status,'found');
    assert.equal(f.bridge.intentChanges()[0].sequence,1);
    f.state.elapsed=9;
    assert.throws(()=>f.bridge.cancelAttackIntent(f.actor.id),/time regressed/);
    assert(f.bridge.routePoints(first.routeHandle));
    f.bridge.resetFromState(f.state);
    const second=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(second.status,'found');
    assert.notEqual(first.routeHandle.session,second.routeHandle.session);
    assert.equal(f.bridge.routePoints(first.routeHandle),null);
    const [event]=f.bridge.intentChanges();
    assert.equal(event.sequence,1);
    assert.equal(event.effectiveTime,9);
  }finally{f.session.dispose();}
});

test('repeating native handles in another WASM instance cannot revive an old route',()=>{
  const first=fixture({authorityEpoch:'authority-before-worker-replacement'});
  const replacement=fixture({authorityEpoch:'authority-after-worker-replacement'});
  try{
    const oldPlan=first.bridge.planAttackCrop(first.state,first.actor);
    const newPlan=replacement.bridge.planAttackCrop(replacement.state,replacement.actor);
    assert.equal(oldPlan.status,'found');assert.equal(newPlan.status,'found');
    const tuple=({session,slot,generation})=>[session,slot,generation];
    assert.deepEqual(tuple(oldPlan.routeHandle),tuple(newPlan.routeHandle),
      'the regression requires an actual native counter collision across instances');
    const lateLoad=structuredClone(oldPlan.routeHandle);
    assert.equal(replacement.bridge.routePoints(lateLoad),null,
      'a delayed load from a retired authority cannot read a current route');
    assert.equal(first.bridge.routePoints(newPlan.routeHandle),null);
    assert(replacement.bridge.routePoints(structuredClone(newPlan.routeHandle)));
    const {authorityEpoch,...unscoped}=newPlan.routeHandle;
    assert.equal(replacement.bridge.routePoints(unscoped),null,
      'the native tuple alone is no longer an externally accepted handle');
    const [event]=replacement.bridge.intentChanges();
    assert.equal(event.authorityEpoch,authorityEpoch);
    assert.equal(event.routeHandle.authorityEpoch,authorityEpoch);
  }finally{first.session.dispose();replacement.session.dispose();}
});

test('default bridge epochs do not repeat across independent native owners',()=>{
  const first=fixture(),second=fixture();
  try{
    assert.notEqual(first.bridge.authorityEpoch,second.bridge.authorityEpoch);
    assert.throws(()=>createSpatialIntentBridge(first.session,{authorityEpoch:''}),
      /authority epoch/);
  }finally{first.session.dispose();second.session.dispose();}
});

test('the graphical permission mirror consumes the existing real native log without replanning',()=>{
  const f=fixture();
  try{
    const control=createNativeRouteControl({authorityEpoch:f.bridge.authorityEpoch});
    const plan=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(plan.status,'found');
    const [assigned]=f.bridge.intentChanges();
    assert(control.accept(assigned));
    const descriptor={actorId:assigned.actorId,routeHandle:plan.routeHandle,
      assignmentSequence:assigned.sequence},record=control.admit(descriptor);
    const calls=f.session.core.wasm.nav_intent_actor_planning_calls(900002);
    f.state.elapsed=12;
    f.bridge.applyEvents(f.state,[{type:'target',remove:true,id:f.crop.id}]);
    const [revoked]=f.bridge.intentChanges();
    assert(control.accept(revoked));
    assert.equal(record.safeUntil,12);
    assert.throws(()=>control.admit(structuredClone(descriptor)),/obsolete/);
    assert.equal(f.session.core.wasm.nav_intent_actor_planning_calls(900002),calls,
      'graphical control does not ask Wild Engine to validate or plan a route');
  }finally{f.session.dispose();}
});

test('native control bootstrap retains original assignment identity after the log is drained',()=>{
  const f=fixture();
  try{
    const plan=f.bridge.planAttackCrop(f.state,f.actor);
    assert.equal(plan.status,'found');
    const [assigned]=f.bridge.intentChanges();
    f.state.elapsed=12;
    const wasm=f.session.core.wasm,calls=wasm.nav_intent_actor_planning_calls(900002),
      checks=wasm.nav_intent_route_validation_count();
    const baseline=f.bridge.nativeIntentControlBaseline();
    assert.equal(baseline.type,'IntentBaseline');
    assert.equal(baseline.sequence,assigned.sequence);
    assert.equal(baseline.effectiveTime,12);
    assert.deepEqual(baseline.routes,[{actorId:900002,routeHandle:plan.routeHandle,
      assignmentSequence:assigned.sequence,startTime:10}]);
    assert.equal(wasm.nav_intent_change_count(),0);
    assert.equal(wasm.nav_intent_actor_planning_calls(900002),calls);
    assert.equal(wasm.nav_intent_route_validation_count(),checks);
    const control=createNativeRouteControl({authorityEpoch:baseline.authorityEpoch,
      initialSequence:baseline.sequence,initialTime:baseline.effectiveTime,routes:baseline.routes});
    assert(control.admit(baseline.routes[0]));
  }finally{f.session.dispose();}
});

test('native control observers receive revocations before legacy drain/coalescing without a parallel log',()=>{
  const f=fixture();
  try{
    const first=f.bridge.planAttackCrop(f.state,f.actor);
    f.bridge.intentChanges();
    const observed=[],stop=f.bridge.observeNativeIntentControl({
      onBaseline:baseline=>observed.push(baseline),onChanges:events=>observed.push(...events)});
    assert.equal(observed[0].sequence,1);
    f.state.elapsed=12;
    f.bridge.applyEvents(f.state,[{type:'target',remove:true,id:f.crop.id}]);
    assert.equal(observed[1].type,'RouteInvalidated','control is notified at the mutation boundary');
    assert.deepEqual(observed[1].revokedRouteHandle,first.routeHandle);
    assert.equal(f.session.core.wasm.nav_intent_change_count(),1,'the native legacy log was not consumed');
    f.bridge.applyEvents(f.state,[{type:'target',entity:f.crop}]);
    assert.equal(f.bridge.planAttackCrop(f.state,f.actor).status,'found');
    assert.deepEqual(observed.map(event=>event.sequence),[1,2,3]);
    assert.deepEqual(f.bridge.intentChanges().map(event=>event.sequence),[2,3]);
    assert.equal(observed.length,3,'draining legacy events does not republish control transitions');
    stop();f.bridge.cancelAttackIntent(f.actor.id);
    assert.equal(observed.length,3);
  }finally{f.session.dispose();}
});

test('native reset retires an observer and changes the exposed epoch even in the same WASM instance',()=>{
  const f=fixture();
  try{
    const oldEpoch=f.bridge.authorityEpoch,closed=[];
    f.bridge.observeNativeIntentControl({onBaseline:()=>{},onChanges:()=>{},
      onClosed:reason=>closed.push(reason)});
    f.bridge.resetFromState(f.state);
    assert.deepEqual(closed,['native-reset']);
    assert.notEqual(f.bridge.authorityEpoch,oldEpoch);
    assert.equal(f.bridge.nativeIntentControlBaseline().sequence,0);
  }finally{f.session.dispose();}
});
