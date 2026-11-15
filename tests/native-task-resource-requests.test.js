import {nativeTaskRequestFixture as fixture} from './helpers/native-task-resource-requests.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseTask,replaceTasks,notifyWorkerPlanningChange} from '../src/simulation/tasks.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

test('the ordinary global batch claims every task without issuing a route or stalling the executing cohort',()=>{
 const f=fixture();try{const before=f.body(2),held=[f.body(1),f.body(3)],events=f.claim();assert.deepEqual(events.map(event=>event.type),['IntentChanged','IntentChanged']);assert(events.every(event=>event.state===6&&event.routeHandle===null&&event.revokedRouteHandle===null));
  const requests=f.state.tasks.map(task=>f.planner.pendingTaskRoute(task.workerId));assert.deepEqual(requests.map(value=>value.taskId),[920001,920002]);assert.equal(new Set(requests.map(value=>value.actorId)).size,2);
  for(const request of requests){assert.equal(request.kind,'native-task-route-request');assert.equal(request.authorizedAutonomy,false);assert.equal(request.requestedAt,10);assert(request.points.length>=2);assert.equal(Object.hasOwn(request,'assignmentSequence'),false);assert.equal(Object.hasOwn(request,'routeHandle'),false);const handle=request.requestHandle;assert.equal(f.planner.routePoints(handle),null);assert.equal(f.planner.nativeRouteTiming(handle),null);assert.equal(f.planner.reserveNativeRoute(handle,1).status,'stale');assert.equal(f.planner.prepareNativeRouteMotion(handle,{radius:.28}).status,'stale');assert.throws(()=>f.control.admit({actorId:request.actorId,assignmentSequence:request.requestSequence,routeHandle:handle}));const worker=f.state.workers.find(worker=>worker.id===`worker-${request.actorId}`);assert.equal(worker.status,'waiting-task');assert.equal(worker.path,null);assert.equal(worker.nativeRouteAdmission,'pending-resources');}
  const planning=f.w.nav_intent_route_queries();for(let i=1;i<=100;i++)f.advance(10+i*.02);assert(f.body(2).x-before.x>2);assert.deepEqual([f.body(1),f.body(3)],held);assert.equal(f.w.nav_intent_route_queries(),planning);assert.deepEqual(f.planner.nativeIntentControlBaseline().routes.map(route=>route.actorId),[900012]);assert.deepEqual(f.planner.intentChanges(),[]);
 }finally{f.close();}
});

test('request data are owned copies and foreign request identities cannot read executable or pending points',()=>{
 const f=fixture();try{f.claim();const request=f.planner.pendingTaskRoute(f.state.tasks[0].workerId),original=request.points.slice(),h=request.requestHandle;request.points.fill(-1);assert.deepEqual(f.planner.pendingTaskRoute(request.actorId).points,original);
  for(const args of [[h.session+1,h.slot,h.generation,request.requestSequence],[h.session,h.slot,h.generation+1,request.requestSequence],[h.session,h.slot,h.generation,request.requestSequence+1]]){assert.equal(f.w.nav_intent_pending_task_route_points(...args),-1);assert.equal(f.w.nav_intent_pending_task_route_points_ptr(...args),0);}
  assert.equal(f.w.nav_intent_require_route_resources(900012),0);assert.equal(f.planner.nativeRouteTiming(f.b).actorId,900012);
 }finally{f.close();}
});

test('cancelling a resource request never revokes an unissued handle or releases another task claim',()=>{
 const f=fixture();try{f.claim();const first=f.state.tasks[0],worker=f.state.workers.find(worker=>worker.id===first.workerId),other=f.planner.pendingTaskRoute(f.state.tasks[1].workerId);releaseTask(f.state,worker);worker.status='idle';notifyWorkerPlanningChange(f.state,worker);f.planner.flushTaskEvents();const events=f.planner.intentChanges();assert(events.length);for(const event of events){assert.equal(event.routeHandle,null);assert.equal(event.revokedRouteHandle,null);f.control.accept(event);}assert.equal(f.planner.pendingTaskRoute(worker.id),null);assert.equal(worker.nativeRouteAdmission,undefined);assert.deepEqual(f.planner.pendingTaskRoute(other.actorId),other);f.advance(10.1);
 }finally{f.close();}
});

test('an explicit same-task replan replaces the request while keeping every replacement non-executable',()=>{
 const f=fixture();try{f.claim();const worker=f.state.workers.find(worker=>worker.id===f.state.tasks[0].workerId),old=f.planner.pendingTaskRoute(worker.id);assert.equal(f.planner.requestReroute(f.state,worker),true);let events=f.planner.intentChanges();assert(events.every(event=>event.routeHandle===null&&event.revokedRouteHandle===null));for(const event of events)f.control.accept(event);assert(events.some(event=>event.state===0)&&events.some(event=>event.state===6));assert(events.every(event=>event.routeHandle===null));const next=f.planner.pendingTaskRoute(worker.id);assert(next.requestSequence>old.requestSequence);assert.equal(f.w.nav_intent_pending_task_route_points(old.requestHandle.session,old.requestHandle.slot,old.requestHandle.generation,old.requestSequence),-1);assert.equal(f.planner.routePoints(next.requestHandle),null);f.advance(10.1);
 }finally{f.close();}
});

test('saved pending claims restore as fresh resource requests without briefly assigning executable routes',()=>{
 const f=fixture();try{f.claim();const old=f.planner.pendingTaskRoute(f.state.tasks[0].workerId),restored=deserialize(serialize(f.state));assert.throws(()=>serialize({...restored,workers:restored.workers.map(worker=>worker.taskId?{...worker,nativeRouteAdmission:'ready'}:worker)}),/recursos nativa/);const counts=f.planner.resetFromState(restored);assert.equal(counts.restored,2);assert.equal(counts.routed,2);const events=f.planner.intentChanges();assert(events.every(event=>event.routeHandle===null));assert.equal(f.planner.nativeIntentControlBaseline().routes.length,0);const next=f.planner.pendingTaskRoute(restored.tasks[0].workerId);assert(next);assert.notEqual(next.requestHandle.session,old.requestHandle.session);assert.equal(f.planner.routePoints(next.requestHandle),null);
 }finally{f.close();}
});

test('a destroyed task target cancels its pending request through the ordinary native-to-JS lifecycle',()=>{
 const f=fixture();try{f.claim();const task=f.state.tasks[0],worker=f.state.workers.find(worker=>worker.id===task.workerId),plant=f.state.plants.find(plant=>plant.id===task.targetId);plant.alive=false;f.planner.applyEvents(f.state,[{type:'target',remove:true,id:plant.id}]);const events=f.planner.reconcileWorkerRoutes(f.state,{navVersion:1});for(const event of events){assert.equal(event.routeHandle,null);assert.equal(event.revokedRouteHandle,null);f.control.accept(event);}assert.equal(f.planner.pendingTaskRoute(worker.id),null);assert.equal(worker.taskId,null);assert.equal(worker.nativeRouteAdmission,undefined);assert.equal(worker.status,'idle');assert(!f.state.tasks.some(value=>value.id===task.id));f.advance(10.1);
 }finally{f.close();}
});

test('ordinary task rebuilding clears a retired request marker before the next save',()=>{
 const f=fixture();try{f.claim();const task=f.state.tasks[0],worker=f.state.workers.find(worker=>worker.id===task.workerId);replaceTasks(f.state,f.state.tasks.filter(value=>value.id!==task.id));worker.taskId=null;worker.status='idle';worker.path=null;notifyWorkerPlanningChange(f.state,worker);assert.equal(worker.nativeRouteAdmission,undefined);assert.doesNotThrow(()=>serialize(f.state));f.planner.flushTaskEvents();for(const event of f.planner.intentChanges())f.control.accept(event);assert.equal(f.planner.pendingTaskRoute(worker.id),null);f.advance(10.1);
 }finally{f.close();}
});

test('invalid resource policy and stale JS task facts reject the whole batch before either owner claims tasks',()=>{
 const f=fixture();try{assert.throws(()=>f.planner.commitTaskBatchToState(f.state,f.plan,{navVersion:1,pendingResources:1}),/policy/);f.state.tasks[1].targetId='plant-900099';assert.throws(()=>f.planner.commitTaskBatchToState(f.state,f.plan,{navVersion:1,pendingResources:true}),/changed/);assert(f.state.tasks.every(task=>task.workerId===null));assert(f.state.workers.filter(worker=>worker.id!=='worker-900012').every(worker=>worker.taskId===null));assert.equal(f.planner.pendingTaskRoute('worker-900011'),null);
 }finally{f.close();}
});

test('pthread keeps the same ordinary task requests outside its executing cohort',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});try{f.claim();const request=f.planner.pendingTaskRoute(f.state.tasks[0].workerId);assert(request.points.length>=2);assert.equal(f.planner.nativeRouteTiming(request.requestHandle),null);f.advance(10.1);assert.equal(f.planner.pendingTaskRoute(request.actorId).requestSequence,request.requestSequence);}finally{f.close();await runtime.dispose();}
});
