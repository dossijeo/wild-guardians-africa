import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {emit,rebuildTasks,walkTo} from '../src/simulation/game.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {canWaterFrom} from '../src/world/work-points.js';
import {cropBecameInactive} from '../src/simulation/active-crops.js';
import {createSpatialIntentBridge,createEventDrivenTaskPlanner} from
 '../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {enqueue,notifyWorkerPlanningChange,replaceTasks} from '../src/simulation/tasks.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;

test('event-fed native intent bridge replays live state and only changes on explicit deltas',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 const worker=game.workers.find(w=>w.id==='worker-9263');
 worker.status='idle';worker.taskId=null;worker.contractDay=game.day;
 game.workers.push({...worker,id:'worker-1000001',centerId:null,
  status:'waiting',taskId:null});
 const plant=game.plants.filter(p=>p.alive&&p.centerId===worker.centerId)
  .sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-
    Math.hypot(b.x-worker.x,b.z-worker.z))[0];
 const task={id:'task-999999',created:1,centerId:worker.centerId,kind:'water',
  targetId:plant.id,workerId:null,blocked:false};
 game.tasks=[task];
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const village=game.villages[0],cx=Math.floor((village.x+24)/48),
   cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const bridge=createSpatialIntentBridge(session),wasm=session.core.wasm;
  const initial=bridge.resetFromState(game);
  assert.equal(initial.workers,game.workers.length);
  assert.equal(initial.targets,game.plants.filter(p=>p.alive).length+
   game.crates.filter(c=>!c.delivered).length+game.structures.length);
  assert.equal(initial.tasks,1);
  const first=bridge.planTasks();
  assert.equal(first.length,1);
  assert.equal(first[0].taskId,999999);
  assert.equal(first[0].workerId,9263);
  assert.equal(first[0].status,1);
  bridge.discard();

  assert.throws(()=>bridge.applyEvents(game,[{type:'target',entity:{...plant,x:NaN}}]),
   /rejected/, 'invalid deltas must not leave a partial native read model');
  assert.deepEqual(bridge.planTasks(),first,'failed delta rebuilds from live state');
  bridge.discard();

  plant.alive=false;
  bridge.applyEvents(game,[{type:'target',entity:plant}]);
  assert.equal(bridge.planTasks().length,0,'destroyed crop is no longer eligible');
  bridge.discard();
  bridge.applyEvents(game,[{type:'task',remove:true,id:task.id}]);
  assert.equal(wasm.nav_intent_task_count(),0);

  plant.alive=true;
  bridge.applyEvents(game,[{type:'target',entity:plant},{type:'task',entity:task}]);
  assert.equal(bridge.planTasks()[0].status,1);
  bridge.discard();
  worker.status='walking';
  bridge.applyEvents(game,[{type:'worker',entity:worker}]);
  assert.equal(bridge.planTasks()[0].status,0,'busy worker has no provisional lease');
  bridge.discard();
  worker.status='idle';
  bridge.applyEvents(game,[{type:'worker',entity:worker}]);
  assert.deepEqual(bridge.planTasks(),first,'event replay restores the same plan');
  bridge.discard();
  assert.equal(bridge.resetFromState(game).sequence,1,
   'reload rebuilds the native read model from live entities');
  assert.deepEqual(bridge.planTasks(),first);
  bridge.discard();
  assert.equal(bridge.planTasks()[0].status,1);
  assert.equal(bridge.commit(),1);
  const [assigned]=bridge.intentChanges();
  assert.equal(assigned.actorId,9263);
  assert.equal(assigned.targetId,Number(plant.id.split('-').at(-1)));
  assert(bridge.routePoints(assigned.routeHandle)?.length>0);
  assert.deepEqual(bridge.intentChanges(),[],
   'draining an event batch cannot repeat an old assignment');
  plant.alive=false;
  const boundary=bridge.processEventBoundary(game,[{type:'target',entity:plant}]);
  assert.equal(boundary.invalidated,0);
  const [invalidated]=boundary.changes;
  assert.equal(invalidated.actorId,9263);
  assert.equal(invalidated.state,0);
  assert.equal(bridge.routePoints(assigned.routeHandle),null);
  plant.alive=true;

  const planner=createEventDrivenTaskPlanner(session);
  assert.throws(()=>planner.planIfNeeded(0),/Reset/);
  planner.resetFromState(game);
  assert.equal(planner.planIfNeeded(0)[0].status,1);
  const routeQueries=wasm.nav_intent_route_queries();
  planner.discard();
  for(let tick=1;tick<=100;tick++)assert.equal(planner.planIfNeeded(tick/10),null,
   'ordinary ticks and route movement do not replan');
  assert.equal(planner.metrics(10).nativePlanningCalls,1);
  assert.equal(planner.metrics(10).perWorkerPerMinute[9263],1);
  assert.equal(wasm.nav_intent_route_queries(),routeQueries,
   'movement ticks never enter route planning');
  assert.throws(()=>planner.applyEvents(game,[{type:'target',entity:{...plant,x:NaN}}]),
   /rejected/);
  assert.equal(planner.planIfNeeded(10.05)[0].status,1,
   'rejected delta restores the gate and wakes a safe fresh plan');
  planner.discard();
  plant.alive=false;
  planner.applyEvents(game,[{type:'target',entity:plant}]);
  assert.deepEqual(planner.planIfNeeded(10.1),[],
   'a committed target loss wakes planning once');
  assert.equal(planner.planIfNeeded(10.2),null);
  assert.equal(planner.metrics(10.2).nativePlanningCalls,3);
  const stopTaskEvents=planner.observeTasks(game);
  const beforeTasks=wasm.nav_intent_task_count();
  const freshTask=enqueue(game,worker.centerId,'harvest',plant.id);
  assert(freshTask);
  assert.equal(wasm.nav_intent_task_count(),beforeTasks,
   'confirmed task deltas wait for their deterministic event boundary');
  assert.equal(planner.flushTaskEvents(),1);
  assert.equal(wasm.nav_intent_task_count(),beforeTasks+1,
   'task creation reaches the native index at the mutation boundary');
  replaceTasks(game,game.tasks.filter(item=>item.id!==freshTask.id));
  assert.equal(planner.flushTaskEvents(),1);
  assert.equal(wasm.nav_intent_task_count(),beforeTasks,
   'task removal reaches the native index without polling');
  worker.status='returning';notifyWorkerPlanningChange(game,worker);
  worker.status='idle';notifyWorkerPlanningChange(game,worker);
  assert.equal(planner.flushTaskEvents(),1,
   'several confirmed changes to one worker use one native row per boundary');
  stopTaskEvents();
  planner.resetFromState(game);
  const stopRebuild=planner.observeTasks(game);
  const beforePosition=wasm.nav_intent_entity_revision();
  worker.x+=0.1;
  planner.planIfNeeded(0);
  assert(wasm.nav_intent_entity_revision()>beforePosition,
   'an idle worker moving before a new action is projected at the planning boundary');
  planner.discard();
  rebuildTasks(game);
  assert(planner.flushTaskEvents()>0);
  assert.equal(wasm.nav_intent_task_count(),game.tasks.length,
   'a real day task rebuild projects the same task roster without a scan');
  stopRebuild();
  plant.alive=true;worker.status='idle';worker.taskId=null;game.tasks=[task];
  planner.resetFromState(game);
  const stopWorld=planner.observeWorld(game);
  assert.equal(planner.planIfNeeded(0)[0].status,1);
  assert.equal(planner.commit(),1);
  const [active]=planner.intentChanges();
  assert(active.routeHandle);
  plant.alive=false;
  emit(game,'CropDestroyed',{targetId:plant.id});
  assert.equal(planner.flushWorldEvents(),1);
  const [cancelled]=planner.intentChanges();
  assert.equal(cancelled.actorId,9263,
   'a confirmed crop event invalidates its native intention at the event boundary');
  assert.equal(planner.routePoints(active.routeHandle),null);
  const beforeCrate=wasm.nav_intent_target_count();
  const crate={id:'crate-1000003',x:worker.x,z:worker.z,delivered:false};
  game.crates.push(crate);
  emit(game,'CropPicked',{workerId:worker.id,targetId:plant.id,crateId:crate.id});
  planner.flushWorldEvents();
  assert.equal(wasm.nav_intent_target_count(),beforeCrate+1,
   'the physical harvest crate becomes a native target');
  crate.delivered=true;
  emit(game,'CrateDelivered',{workerId:worker.id,targetId:crate.id});
  planner.flushWorldEvents();
  assert.equal(wasm.nav_intent_target_count(),beforeCrate,
   'confirmed delivery removes the crate target');
  stopWorld();
  plant.alive=true;worker.status='idle';worker.taskId=null;game.tasks=[task];
  planner.resetFromState(game);
  const nav=createSpatialNavigationMovement(session,game);
  const stopCommitObserver=planner.observeTasks(game);
  const nativePlan=planner.planIfNeeded(0);
  assert.throws(()=>planner.commitTaskBatchToState(game,nativePlan,{navVersion:NaN}),
   /current planning batch/);
  assert.equal(task.workerId,null,'a rejected commit leaves the JS lease untouched');
  const originalTarget=task.targetId;
  task.targetId='plant-1000002';
  assert.throws(()=>planner.commitTaskBatchToState(game,nativePlan,{navVersion:nav.version}),
   /target changed|inputs changed/,
   'a task changed without a projected delta cannot receive the stale native route');
  assert.equal(task.workerId,null);
  task.targetId=originalTarget;
  assert.equal(planner.commitTaskBatchToState(game,nativePlan,{navVersion:nav.version}),1);
  assert.equal(task.workerId,worker.id);
  assert.equal(worker.taskId,task.id);
  assert.equal(worker.status,'walking');
  assert(worker.path.length>0,'the native route is copied once when action starts');
  assert.equal(worker.taskApproach.taskId,task.id);
  const [committedIntent]=planner.intentChanges();
  assert.equal(planner.flushTaskEvents(),2,
   'the confirmed JS assignment projects task and worker changes together');
  assert(planner.routePoints(committedIntent.routeHandle)?.length>0,
   'projecting the confirmed assignment preserves its active native route');
  stopCommitObserver();
  const restored=deserialize(serialize(game));
  const restoredWorker=restored.workers.find(item=>item.id===worker.id);
  assert.equal(restoredWorker.taskId,task.id);
  assert.deepEqual(restoredWorker.path,worker.path,
   'a saved action preserves the physical path without serializing its native handle');
  planner.resetFromState(restored);
  assert.equal(planner.routePoints(committedIntent.routeHandle),null,
   'a restored session rejects its former route handle');
  assert.throws(()=>planner.commitTaskBatchToState(game,nativePlan,{navVersion:nav.version}),
   /current planning batch/,'the same native proposal cannot be committed twice');
  const restoredNav=createSpatialNavigationMovement(session,restored);
  const restoredPlant=restored.plants.find(item=>item.id===plant.id);
  let previous={x:restoredWorker.x,z:restoredWorker.z};
  for(const point of restoredWorker.path){
   assert(restoredNav.segmentClear(previous,point,.28,null,true),
    'the committed route respects native static worker clearance');
   previous=point;
  }
  restoredNav.workerPath=()=>{throw Error('ordinary movement unexpectedly replanned');};
  let reached=false;
  for(let step=0;step<1000&&!reached;step++){
   restored.elapsed+=.2;
   reached=walkTo(restored,restoredWorker,restoredWorker.taskApproach.destination,.2,restoredNav);
  }
  assert(reached,'the continuous movement controller completes the native route');
  assert(canWaterFrom(restoredWorker,restoredPlant,restoredNav),
   'the reached interaction point permits the actual watering action');
 }finally{session.dispose();}
});

test('unknown service routes wait for a sector event or low-frequency retry',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/watering-gran-canon-saheliana-detour-10.json.gz',import.meta.url))).toString());
 const worker=game.workers.find(w=>w.id==='worker-16');
 const previous=game.tasks.find(t=>t.id===worker.taskId);
 if(previous)previous.workerId=null;
 worker.taskId=null;worker.status='idle';worker.contractDay=game.day;
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const village=game.villages[0],cx=Math.floor((village.x+24)/48),
   cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(game);
  const initial=planner.planIfNeeded(0);
  assert(initial.some(row=>row.status===3),'unresolved sector remains unknown');
  const routeQueries=session.core.wasm.nav_intent_route_queries();
  planner.discard();
  for(let second=1;second<8;second++)assert.equal(planner.planIfNeeded(second),null);
  assert.equal(planner.metrics(7).nativePlanningCalls,1);
  assert.equal(session.core.wasm.nav_intent_route_queries(),routeQueries);
  assert(planner.planIfNeeded(8).length>0,'bounded recovery retry is allowed');
  planner.discard();
  assert.equal(planner.metrics(8).nativePlanningCalls,2);
  const task=game.tasks.find(t=>!t.workerId);
  planner.applyEvents(game,[{type:'task',entity:task}]);
  assert(planner.planIfNeeded(8.1).length>0,'relevant event wakes the queue');
  planner.discard();
  assert.equal(planner.metrics(8.1).nativePlanningCalls,3);
 }finally{session.dispose();}
});

test('a moved crate reroutes the same worker task at the confirmed event boundary',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 const worker=game.workers.find(item=>item.id==='worker-9263');
 worker.status='idle';worker.taskId=null;worker.contractDay=game.day;
 const crate={id:'crate-1000003',x:worker.x,z:worker.z,delivered:false};
 const task={id:'task-999998',created:1,centerId:worker.centerId,
  kind:'crate',targetId:crate.id,workerId:null,blocked:false};
 game.crates.push(crate);game.tasks=[task];
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const village=game.villages[0],cx=Math.floor((village.x+24)/48),
   cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const places=[];
  for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5],[1,0],[-1,0]]){
   const point={x:worker.x+dx,z:worker.z+dz};
   if(session.actorCanStand(point,{worker:true})&&
     session.routeActor(worker,point,{worker:true}).status==='found')
    places.push(point);
  }
  assert(places.length>=2,'the fixture has two distinct reachable crate sites');
  Object.assign(crate,places[0]);
  const nav=createSpatialNavigationMovement(session,game);
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(game);
  const stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);
  const plan=planner.planIfNeeded(0);
  assert.equal(plan[0].status,1);
  assert.equal(planner.commitTaskBatchToState(game,plan,{navVersion:nav.version}),1);
  planner.flushTaskEvents();
  const [initial]=planner.intentChanges();
  assert(initial.routeHandle);
  Object.assign(crate,places[1]);
  emit(game,'CrateDropped',{targetId:crate.id});
  assert.equal(planner.flushWorldEvents(),1);
  const changes=planner.reconcileWorkerRoutes(game,{navVersion:nav.version});
  assert.equal(changes.at(-1).state,1,'the same intention receives a new route');
  assert.equal(worker.taskId,task.id);
  assert.equal(task.workerId,worker.id);
  assert.equal(worker.status,'walking');
  assert.equal(planner.routePoints(initial.routeHandle),null,
   'the outdated handle was invalidated');
  assert(Math.hypot(worker.path.at(-1).x-crate.x,
   worker.path.at(-1).z-crate.z)<.01);
  assert.equal(planner.metrics(0).nativePlanningCalls,1,
   'the crate event reroutes without another global task-selection pass');
  crate.delivered=true;
  emit(game,'CrateDelivered',{workerId:worker.id,targetId:crate.id});
  planner.flushWorldEvents();
  planner.reconcileWorkerRoutes(game,{navVersion:nav.version});
  assert.equal(worker.taskId,null,'a delivered target releases its worker');
  assert.equal(worker.status,'idle');
  assert(!game.tasks.some(item=>item.id===task.id),
   'the obsolete task is removed at the same confirmed event boundary');
  planner.flushTaskEvents();
  const plant=game.plants.filter(item=>item.alive&&item.centerId===worker.centerId)
   .sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-
     Math.hypot(b.x-worker.x,b.z-worker.z))[0];
  const watering=enqueue(game,worker.centerId,'water',plant.id);
  assert(watering);
  const nextPlan=planner.planIfNeeded(1);
  assert(nextPlan.some(row=>row.status===1&&row.taskId===Number(watering.id.split('-').at(-1))));
  planner.commitTaskBatchToState(game,nextPlan,{navVersion:nav.version});
  planner.flushTaskEvents();planner.intentChanges();
  plant.alive=false;cropBecameInactive(game.plants);
  emit(game,'CropDestroyed',{targetId:plant.id});
  planner.flushWorldEvents();
  planner.reconcileWorkerRoutes(game,{navVersion:nav.version});
  assert.equal(worker.taskId,null,'a destroyed crop releases its assigned worker');
  assert(!game.tasks.some(item=>item.id===watering.id));
  stopTasks();stopWorld();
 }finally{session.dispose();}
});

test('native whole-queue assignments match JS on controlled real Desert and Canyon states',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const probe=fileURLToPath(new URL('../tools/experiments/probe-native-intent-queue.mjs',
  import.meta.url));
 for(const [fixture,workers,tasks] of [
  ['desierto983-d15-partial-state.json.gz',15,115],
  ['watering-gran-canon-saheliana-detour-10.json.gz',3,19]]){
  const path=fileURLToPath(new URL(`./fixtures/${fixture}`,import.meta.url));
  const report=JSON.parse(execFileSync(process.execPath,
   [probe,path,String(workers),String(tasks),'--summary'],{
    env:process.env,encoding:'utf8',timeout:30000}));
  assert.equal(report.mismatches,0,`${fixture}: differing native assignment`);
  assert.equal(report.jsCandidates,report.nativeQueries,
   `${fixture}: unexpected candidate route-query count`);
  assert(report.jsCandidates>0);
 }
});
