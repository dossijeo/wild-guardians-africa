import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {emit,rebuildTasks,walkTo,tick} from '../src/simulation/game.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {canWaterFrom} from '../src/world/work-points.js';
import {cropBecameInactive} from '../src/simulation/active-crops.js';
import {createSpatialIntentBridge,createEventDrivenTaskPlanner} from
 '../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {enqueue,notifyWorkerPlanningChange,replaceTasks} from '../src/simulation/tasks.js';
import {wallCollisionFrame} from '../src/world/wall-collision-frame.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;

test('the intent bridge projects a scaled gate using the physical wall frame',()=>{
 const memory={buffer:new ArrayBuffer(2048)},batches=[];
 const wasm=new Proxy({memory,
  nav_intent_changes_ptr:()=>8,
  nav_intent_apply_changes:(sequence,count)=>{
   const values=new Float64Array(memory.buffer,8,count*10);
   batches.push({sequence,rows:Array.from({length:count},(_,index)=>
     Array.from(values.slice(index*10,index*10+10)))});
   return 1;
  }},{get:(target,key)=>key in target?target[key]:()=>0});
 const state={workers:[],tasks:[],plants:[],crates:[],structures:[{
  id:'structure-9100',kind:'wall',material:'adobe',status:'intact',
  x:2,z:3,yaw:.3,gate:true,baseScaleX:.8,hp:80,maxHp:100}]};
 const bridge=createSpatialIntentBridge({core:{wasm}});
 bridge.resetFromState(state);
 const wall=state.structures[0],frame=wallCollisionFrame(wall);
 const row=batches[0].rows.find(item=>item[1]===2);
 assert.equal(row[2],9100);
 assert.equal(row[7],140,'the gate depth scale reaches the native read model');
 assert.equal(row[8],frame.yaw);
 assert(Math.abs(row[9]-frame.width/1.09)<1e-12,
  'the full base width and gate scale reach native service routing');
});

test('loading an active raid restores distinct routes and reservations for eight animals',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-d6-native-multi-reservation.json.gz',import.meta.url))).toString());
 const uninterrupted=gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-d6-native-multi-reservation-after-raid.json.gz',
  import.meta.url))).toString();
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const planner=createEventDrivenTaskPlanner(session);
  const restored=planner.resetFromState(game);
  assert.equal(restored.restoredAnimalRoutes,8);
  assert.equal(restored.invalidSavedAnimalRoutes,0);
  const nav=createSpatialNavigationMovement(session,game);
  const stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);
  nav.intentTaskPlanner=planner;
  try{
   const actors=game.raid.animals.filter(animal=>animal.targetId);
   assert.equal(actors.length,8);
   const initial=new Map(actors.map(animal=>[animal.id,{x:animal.x,z:animal.z,
    targetId:animal.targetId,reservation:animal.reservation,
    hitsRemaining:animal.hitsRemaining}]));
   assert.equal(new Set(actors.map(animal=>animal.reservation)).size,8);
   for(let step=0;step<5;step++){
    tick(game,.1,nav);
    nav.serviceRaidConnectivityDemand?.();
   }
   for(const animal of actors){
    const before=initial.get(animal.id);
    assert.equal(animal.targetId,before.targetId);
    assert.equal(animal.reservation,before.reservation);
    assert.equal(game.raid.reservations[before.reservation],animal.id);
    assert.equal(animal.hitsRemaining,before.hitsRemaining);
    assert.equal(planner.attackRoutePending(animal.id),false);
   }
   assert(actors.some(animal=>{
    const before=initial.get(animal.id);
    return Math.hypot(animal.x-before.x,animal.z-before.z)>.1;
   }),'at least one restored route advances physically');
   let remainingTicks=0;
   while(game.raid&&remainingTicks<1000){
    tick(game,.1,nav);
    nav.serviceRaidConnectivityDemand?.();
    remainingTicks++;
   }
   assert.equal(game.raid,null,'the restored multi-animal raid ends');
   const hits=game.events.filter(event=>event.type==='AnimalLogicalHit');
   assert.equal(hits.length,24,'the eight animals spend their actual hit budgets');
   assert.equal(new Set(hits.map(event=>event.attackId)).size,hits.length,
    'no committed attack applies its damage twice');
   assert.equal(game.events.filter(event=>event.type==='RaidEnded').length,1);
   assert.equal(serialize(game),uninterrupted,
    'the restored raid matches the uninterrupted confirmed state exactly');
  }finally{stopTasks();stopWorld();}
 }finally{session.dispose();}
});

test('a topology change after restoring concurrent raid routes preserves live leases',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-d6-native-multi-reservation.json.gz',import.meta.url))).toString());
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const planner=createEventDrivenTaskPlanner(session);
  assert.equal(planner.resetFromState(game).restoredAnimalRoutes,8);
  const nav=createSpatialNavigationMovement(session,game);
  const actors=game.raid.animals.filter(animal=>animal.targetId);
  const saved=actors.map(animal=>({id:animal.id,targetId:animal.targetId,
   reservation:animal.reservation,hitsRemaining:animal.hitsRemaining}));
  const longRoute=actors.find(animal=>animal.path?.length>30);
  assert(longRoute);
  const point=longRoute.path[Math.floor(longRoute.path.length/2)];
  assert(session.core.addWall(point.x,point.z,.3,.3)>0);
  assert(planner.reconcileNavigationRevision(game,nav.version+1)>0,
   'the new physical barrier invalidates at least one restored route');
  planner.reconcileWorkerRoutes(game,{navVersion:nav.version+1});
  for(const before of saved){
   const animal=actors.find(item=>item.id===before.id);
   assert.equal(animal.targetId,before.targetId);
   assert.equal(animal.reservation,before.reservation);
   assert.equal(game.raid.reservations[before.reservation],animal.id);
   assert.equal(animal.hitsRemaining,before.hitsRemaining);
  }
  assert.equal(new Set(Object.values(game.raid.reservations)).size,8);
  assert.doesNotThrow(()=>serialize(game));
 }finally{session.dispose();}
});

test('a saved native animal route resumes movement with its original lease',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-d1-native-active-raid.json.gz',import.meta.url))).toString());
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const planner=createEventDrivenTaskPlanner(session);
  const restored=planner.resetFromState(game);
  assert.equal(restored.restoredAnimalRoutes,1);
  assert.equal(restored.invalidSavedAnimalRoutes,0);
  const nav=createSpatialNavigationMovement(session,game);
  const stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);
  nav.intentTaskPlanner=planner;
  try{
   const animal=game.raid.animals.find(item=>item.targetId);
   const {targetId,reservation,hitsRemaining,z}=animal;
   assert.equal(game.raid.reservations[reservation],animal.id);
   for(let step=0;step<5;step++){
    tick(game,.1,nav);
    nav.serviceRaidConnectivityDemand?.();
   }
   assert(animal.z<z-1.5,'the restored route advances physically');
   assert.equal(animal.targetId,targetId);
   assert.equal(animal.reservation,reservation);
   assert.equal(game.raid.reservations[reservation],animal.id);
   assert.equal(animal.hitsRemaining,hitsRemaining);
   assert.equal(planner.attackRoutePending(animal.id),false);
   assert(animal.path?.length>0);
   assert.doesNotThrow(()=>serialize(game));
  }finally{stopTasks();stopWorld();}
 }finally{session.dispose();}
});

test('loading during a committed strike applies its damage frame exactly once',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-d1-native-committed-attack.json.gz',import.meta.url))).toString());
 const expected=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-d1-native-committed-attack-after-hit.json.gz',
   import.meta.url))).toString());
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const planner=createEventDrivenTaskPlanner(session);
  const restored=planner.resetFromState(game);
  assert.equal(restored.restoredAnimalAttacks,1);
  assert.equal(restored.restoredAnimalRoutes,0);
  const nav=createSpatialNavigationMovement(session,game);
  const stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);
  nav.intentTaskPlanner=planner;
  try{
   for(let step=0;step<4;step++){
    tick(game,1,nav);
    nav.serviceRaidConnectivityDemand?.();
   }
   const actor=game.raid.animals.find(item=>item.id==='animal-396');
   assert.equal(actor.hitsRemaining,1);
   assert.equal(game.events.filter(event=>
    event.type==='AnimalLogicalHit'&&event.attackId==='attack-662').length,1);
   const actual=JSON.parse(serialize(game));
   const reference=JSON.parse(serialize(expected));
   // A restored session has a fresh navigation revision. Those counters are
   // internal; the confirmed world, event order and RNG must still match.
   for(const state of [actual,reference])for(const animal of state.raid.animals){
    delete animal.pathVersion;
    delete animal.mobileRecoveryVersion;
   }
   assert.deepEqual(actual,reference);
  }finally{stopTasks();stopWorld();}
 }finally{session.dispose();}
});

test('restoring a committed animal strike uses the live target index, not crop history',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 const plant=game.plants.find(item=>item.alive);
 assert(plant);
 const session=createSpatialGameSession(module,game,{
  loaded:()=>new Map(),onData:()=>{}});
 try{
  const bridge=createSpatialIntentBridge(session);
  bridge.resetFromState(game);
  const animal={id:'animal-999999',species:'hyena',status:'attacking',
    targetId:plant.id,reservation:'crop:999999',x:plant.x+1,z:plant.z,
    radius:.28,approach:{x:plant.x+1,z:plant.z}};
  game.raid={animals:[animal],reservations:{[animal.reservation]:animal.id}};
  Object.defineProperty(game.plants,Symbol.iterator,{value:()=>{
    throw Error('historical crops must not be scanned per animal');
  }});
  assert.equal(bridge.restoreAttackIntents(game).restoredAnimalAttacks,1);
  assert.equal(session.core.wasm.nav_intent_actor(999999),1);
  const native=new Float64Array(session.core.wasm.memory.buffer,
    session.core.wasm.nav_intent_actor_ptr(),10);
  assert.equal(native[3],Number(plant.id.split('-').at(-1)));
 }finally{session.dispose();}
});

test('a confirmed ruin cancels travelling animal leases but defers committed strikes',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 const walls=game.structures.filter(item=>item.kind==='wall'&&item.status==='intact');
 assert(walls.length>=2);
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(const wall of walls.slice(0,2)){
   const cx=Math.floor((wall.x+24)/48),cz=Math.floor((wall.z+24)/48);
   for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
   }
  }
  const nav=createSpatialNavigationMovement(session,game);
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(game);
  const stop=planner.observeWorld(game),wasm=session.core.wasm;
  session.actorSectorRevision({worker:false,species:'hyena'});
  const actor=900001,wall=walls[0],wallId=Number(wall.id.split('-').at(-1));
  assert.equal(wasm.nav_intent_register_attack(actor,wallId,
   wall.x+3,wall.z+3,0),1);
  const beforeHpRepair=planner.metrics(0).nativeTopologyReconciliations;
  const originalRevision=session.actorSectorRevision.bind(session);
  let revisionChecks=0;
  session.actorSectorRevision=(...args)=>{
    revisionChecks++;return originalRevision(...args);
  };
  const repairNavigationVersion=nav.version;
  wall.hp=wall.maxHp;nav.setState(game);
  assert.equal(nav.version,repairNavigationVersion,
   'repairing HP on an intact wall does not alter the physical graph');
  emit(game,'RepairApplied',{targetId:wall.id,
    repair:{previousStatus:'intact',previousHp:wall.maxHp-1,
      restoredHp:wall.maxHp}});
  assert.equal(planner.flushWorldEvents(),1);
  assert.equal(revisionChecks,0,
   'an HP-only repair does not wake topology or route reconciliation');
  assert.equal(planner.metrics(0).nativeTopologyReconciliations,beforeHpRepair);
  assert.equal(wasm.nav_intent_actor(actor),1);
  wall.status='ruined';wall.hp=0;nav.setState(game);
  emit(game,'StructureRuined',{targetId:wall.id});
  assert.equal(planner.flushWorldEvents(),1);
  assert(revisionChecks>0,'a ruin still wakes topology reconciliation');
  assert(planner.metrics(0).nativeTopologyReconciliations>beforeHpRepair);
  assert.equal(wasm.nav_intent_actor(actor),0,
   'a confirmed ruin releases an uncommitted wall intention');
  session.actorSectorRevision({worker:false,species:'hyena'});
  assert.equal(wasm.nav_intent_register_attack(actor+1,wallId,
   wall.x+3,wall.z+3,0),-2,
   'the ruined structure remains indexed but cannot receive a new attack');
  const committed=walls[1],committedId=Number(committed.id.split('-').at(-1));
  assert.equal(wasm.nav_intent_register_attack(actor+2,committedId,
   committed.x+3,committed.z+3,0),1);
  assert.equal(wasm.nav_intent_attack_action_active(actor+2),1);
  committed.status='ruined';committed.hp=0;nav.setState(game);
  emit(game,'StructureRuined',{targetId:committed.id});
  assert.equal(planner.flushWorldEvents(),1);
  assert.equal(wasm.nav_intent_actor(actor+2),1);
  assert.equal(new Float64Array(wasm.memory.buffer,
   wasm.nav_intent_actor_ptr(),10)[1],2,
   'the committed clip keeps its original logical damage frame');
  assert.equal(wasm.nav_intent_attack_finished(actor+2),1);
  assert.equal(wasm.nav_intent_attack_finished(actor+2),-1);
  const beforeRebuild=revisionChecks;
  wall.status='intact';wall.hp=wall.maxHp;nav.setState(game);
  emit(game,'RepairApplied',{targetId:wall.id,
    repair:{previousStatus:'ruined',previousHp:0,restoredHp:wall.maxHp}});
  assert.equal(planner.flushWorldEvents(),1);
  assert(revisionChecks>beforeRebuild,
   'rebuilding a ruined wall still wakes topology reconciliation');
  stop();
 }finally{session.dispose();}
});

test('an attack plan sees a crop destroyed earlier in the same event boundary',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 const crop=game.plants.find(plant=>plant.alive);
 assert(crop);
 game.raid={animals:[],reservations:{}};
 const animal={id:'animal-1000002',species:'hyena',status:'walking',
  x:crop.x+2,z:crop.z+2,radius:.34,hitsRemaining:1};
 game.raid.animals.push(animal);
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const cx=Math.floor((crop.x+24)/48),cz=Math.floor((crop.z+24)/48);
  for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(game);
  const stop=planner.observeWorld(game),wasm=session.core.wasm;
  try{
   const count=wasm.nav_intent_target_count();
   crop.alive=false;
   emit(game,'CropDestroyed',{targetId:crop.id,animalId:'animal-older'});
   assert.equal(wasm.nav_intent_target_count(),count,
    'confirmed event is queued until the deterministic planning boundary');
   planner.planAttackCrop(game,animal);
   assert.equal(wasm.nav_intent_target_count(),count-1,
    'the native selector must not see a crop destroyed earlier in this tick');
  }finally{stop();}
 }finally{session.dispose();}
});

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
  assert.notEqual(bridge.planTasks()[0].status,1,
   'busy worker has no provisional lease');
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
  session.actorSectorRevision({worker:true});
  const priorTopology=wasm.nav_intent_topology_revision();
  const unrelatedWall=session.core.addWall(worker.x+25,worker.z+25,.35,.35);
  assert(unrelatedWall>0);
  assert.notEqual(wasm.nav_intent_topology_revision(),priorTopology);
  assert.equal(bridge.reconcileTopology(),0,
   'a remote topological event preserves a physically valid active route');
  assert(bridge.routePoints(assigned.routeHandle)?.length>0,
   'the same pinned route handle survives an unrelated wall');
  assert.deepEqual(bridge.intentChanges(),[],
   'an unchanged route emits no redundant planning notification');
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
  assert.equal(planner.metrics(10).nativeLifecycleInvalidations,
   wasm.nav_intent_invalidation_count());
  assert.equal(planner.metrics(10).nativeTopologyRouteInvalidations,0);
  assert.equal(planner.metrics(10).perWorkerPerMinute[9263],1);
  assert.equal(planner.metrics(61).perWorkerPerMinute[9263],0,
   'the rolling minute expires even when no new planning occurs');
  assert.equal(planner.metrics(61).workerPlansByActor[9263],1,
   'the session total remains visible in end-of-day reports');
  assert.equal(planner.metrics(61).workerPeakPlansPerMinute[9263],1);
  assert.equal(planner.metrics(10).nativeTaskRouteQueries,routeQueries);
  assert(planner.metrics(10).nativeTaskCandidates>0);
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
  const priorStatuses=new Map(game.workers.map(item=>[item.id,item.status]));
  for(const item of game.workers)item.status='acting';
  planner.resetFromState(game);
  assert.deepEqual(planner.planIfNeeded(0),[],
    'a task cannot trigger a route search while no worker is eligible');
  assert.equal(planner.metrics(0).nativePlanningCalls,0);
  assert.equal(planner.metrics(0).nativeTaskRouteQueries,0);
  assert.equal(planner.planIfNeeded(.1),null,
    'an unchanged roster does not retry an empty planning batch');
  worker.status='idle';
  planner.applyEvents(game,[{type:'worker',entity:worker}]);
  assert.equal(planner.planIfNeeded(.2)[0].status,1,
    'an eligibility event wakes the pending task');
  planner.discard();
  for(const item of game.workers)item.status=priorStatuses.get(item.id);
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
  assert.equal(planner.flushTaskEvents(),0,
   'the committed JS assignment already projected its task and worker changes');
  assert(planner.routePoints(committedIntent.routeHandle)?.length>0,
   'projecting the confirmed assignment preserves its active native route');
  stopCommitObserver();
  const restored=deserialize(serialize(game));
  const restoredWorker=restored.workers.find(item=>item.id===worker.id);
  assert.equal(restoredWorker.taskId,task.id);
  assert.deepEqual(restoredWorker.path,worker.path,
   'a saved action preserves the physical path without serializing its native handle');
  const restoredIndex=planner.resetFromState(restored);
  assert.equal(restoredIndex.restored,1,
   'a saved worker assignment is reconstructed as a native intention');
  assert.equal(restoredIndex.routed,1,
   'the restored worker receives a fresh native route from its saved position');
  assert.equal(planner.routePoints(committedIntent.routeHandle),null,
   'a restored session rejects its former route handle');
  assert.equal(wasm.nav_intent_actor(9263),1);
  const restoredNative=Array.from(new Float64Array(wasm.memory.buffer,
   wasm.nav_intent_actor_ptr(),10));
  assert.equal(restoredNative[3],Number(plant.id.split('-').at(-1)));
  const restoredHandle={session:restoredNative[4],slot:restoredNative[5],
   generation:restoredNative[6]};
  assert(planner.routePoints(restoredHandle)?.length>0);
  assert.throws(()=>planner.commitTaskBatchToState(game,nativePlan,{navVersion:nav.version}),
   /current planning batch/,'the same native proposal cannot be committed twice');
  const restoredNav=createSpatialNavigationMovement(session,restored);
  planner.reconcileWorkerRoutes(restored,{navVersion:restoredNav.version});
  const restoredPlant=restored.plants.find(item=>item.id===plant.id);
  let previous={x:restoredWorker.x,z:restoredWorker.z};
  for(const point of restoredWorker.path){
   assert(restoredNav.segmentClear(previous,point,.28,null,true),
    'the committed route respects native static worker clearance');
   previous=point;
  }
  const workerPath=restoredNav.workerPath.bind(restoredNav);
  restoredNav.workerPath=(actor,...args)=>{
   if(actor.id===restoredWorker.id)
    throw Error('restored intention unexpectedly used the legacy planner');
   return workerPath(actor,...args);
  };
  let reached=false;
  for(let step=0;step<1000&&!reached;step++){
   restored.elapsed+=.2;
   reached=walkTo(restored,restoredWorker,restoredWorker.taskApproach.destination,.2,restoredNav);
  }
  assert(reached,'the continuous movement controller completes the native route');
  assert(canWaterFrom(restoredWorker,restoredPlant,restoredNav),
   'the reached interaction point permits the actual watering action');
  restoredWorker.status='acting';restoredWorker.actionRemaining=1;
  const activeAction=planner.resetFromState(restored);
  assert.deepEqual([activeAction.restored,activeAction.routed],[1,0],
   'an action already in progress is restored without another route search');
  assert.equal(wasm.nav_intent_actor(9263),1);
  const actingNative=new Float64Array(wasm.memory.buffer,
   wasm.nav_intent_actor_ptr(),10);
  assert.equal(actingNative[1],2,'the committed action retains its logical phase');
  assert.equal(actingNative[6],0,'no stale route handle survives the restore');
  const stopRestoredTasks=planner.observeTasks(restored);
  const stopRestoredWorld=planner.observeWorld(restored);
  restoredNav.intentTaskPlanner=planner;
  tick(restored,.6,restoredNav);tick(restored,.6,restoredNav);
  assert.notEqual(restoredWorker.taskId,task.id,
   'the restored committed action completes without restarting its route');
  assert(!restored.tasks.some(item=>item.id===task.id),
   'the completed saved task cannot remain reserved or run twice');
  if(wasm.nav_intent_actor(9263)){
   const nextIntent=new Float64Array(wasm.memory.buffer,
    wasm.nav_intent_actor_ptr(),10);
   assert.notEqual(nextIntent[2],999999,
    'a newly assigned task has a distinct native intention');
  }
  stopRestoredTasks();stopRestoredWorld();
 }finally{session.dispose();}
});

test('opt-in Game.tick keeps one native task intention across ordinary movement ticks',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
 const game=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
 const worker=game.workers.find(item=>item.id==='worker-9263');
 const plant=game.plants.filter(item=>item.alive&&item.centerId===worker.centerId)
  .sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-
   Math.hypot(b.x-worker.x,b.z-worker.z))[0];
 assert(plant);
 worker.status='idle';worker.taskId=null;worker.contractDay=game.day;
 game.workers=[worker];game.plants=[plant];game.crates=[];
 game.tasks=[{id:'task-999999',created:1,centerId:worker.centerId,
  kind:'water',targetId:plant.id,workerId:null,blocked:false}];
 plant.harvestRequested=true;
 game.time=100;game.pauses=[];game.raid=null;
 const loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const village=game.villages[0],cx=Math.floor((village.x+24)/48),
   cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,game);
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(game);
  const stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);
  nav.intentTaskPlanner=planner;
  tick(game,.1,nav);
  assert.equal(worker.taskId,'task-999999');
  assert.equal(worker.status,'walking');
  assert.equal(planner.metrics(game.elapsed).nativePlanningCalls,1);
  const nativeActorId=Number(worker.id.split('-').at(-1));
  const plannedBefore=session.core.wasm.nav_intent_actor_planning_calls(nativeActorId);
  const priorVersion=nav.version;
  assert(session.core.addWall(worker.x+25,worker.z+25,.35,.35)>0);
  Object.defineProperty(nav,'version',{configurable:true,get:()=>priorVersion+1});
  nav.workerPath=()=>{throw Error('native task movement entered the legacy route planner');};
  tick(game,.1,nav);
  assert.equal(session.core.wasm.nav_intent_actor_planning_calls(nativeActorId),plannedBefore,
   'a remote topology event keeps the assigned route without replanning the actor');
  worker.path=null;
  tick(game,.1,nav);
  assert(['walking','waiting-task'].includes(worker.status),
   'an exceptional lost route keeps its task during native same-task recovery');
  tick(game,.1,nav);
  assert.equal(worker.taskId,'task-999999');
  assert(worker.path?.length>0,
   'the event-driven native recovery returns a route without the legacy planner');
  const start={x:worker.x,z:worker.z};
  // Drain the route-recovery notification at its event boundary before
  // measuring movement with no pending native change.
  planner.flushTaskEvents();
  planner.reconcileWorkerRoutes(game,{navVersion:nav.version});
  let reconciliations=0;
  const reconcile=planner.reconcileWorkerRoutes;
  planner.reconcileWorkerRoutes=(...args)=>{
   if(worker.status==='walking')reconciliations++;
   return reconcile(...args);
  };
  let walkingTicks=0;
  for(let i=0;i<2;i++){
   if(worker.status==='walking')walkingTicks++;
   tick(game,.1,nav);
  }
  assert(walkingTicks>0);
  assert.equal(reconciliations,0,
   'ordinary route movement does not poll native intention changes');
  for(let i=0;i<7;i++)tick(game,.1,nav);
  assert.equal(planner.metrics(game.elapsed).nativePlanningCalls,1,
   'ordinary movement does not rerun global task selection');
  assert(Math.hypot(worker.x-start.x,worker.z-start.z)>0,
   'the worker progresses along its committed native route');
  plant.alive=false;cropBecameInactive(game.plants);
  emit(game,'CropDestroyed',{targetId:plant.id});
  tick(game,.1,nav);
  assert.equal(worker.taskId,null,
   'a confirmed target destruction releases the active task at the next event boundary');
  assert(!game.tasks.some(item=>item.id==='task-999999'));
  stopTasks();stopWorld();
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
  const unchanged=Object.create(game);
  for(const field of ['workers','tasks','plants','crates','structures','raid'])
    Object.defineProperty(unchanged,field,{get(){
      throw Error(`idle reconciliation read ${field}`);
    }});
  assert.deepEqual(planner.reconcileWorkerRoutes(unchanged,
    {navVersion:nav.version}),[],
  'ordinary ticks must not enumerate entities without native intent changes');
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
   [probe,path,String(workers),String(tasks),'--summary','--route-diagnostics'],{
    env:process.env,encoding:'utf8',timeout:30000}));
  assert.equal(report.mismatches,0,`${fixture}: differing native assignment`);
  assert(report.nativeQueries>0&&report.nativeQueries<=report.jsCandidates*8,
   `${fixture}: native service-point search exceeded its bounded alternatives`);
  assert(report.jsCandidates>0);
  if(fixture.startsWith('desierto')){
   const corner=report.routeComparisons.find(row=>row.taskId==='task-10189');
   assert(corner&&corner.jsLength!==null);
   assert(corner.nativeLength<=corner.jsLength+1,
    'native watering route must use a physically clear corner near the center');
  }
 }
});
