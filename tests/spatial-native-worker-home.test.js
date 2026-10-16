import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {walkTo} from '../src/simulation/game.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from
 '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialIntentBridge,createEventDrivenTaskPlanner} from
 '../src/world/hierarchical-wasm/spatial-intent-bridge.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;

test('native worker home route keeps a task-free handle across save restoration',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const game=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    let start,home;
    for(let z=-10;z<=10&&!home;z++)for(let x=-10;x<=10;x++){
      const from={x:x+.2,z:z+.2},to={x:x+1.2,z:z+.2};
      if(session.routeActor(from,to,{worker:true}).status==='found'){
        start=from;home=to;break;
      }
    }
    assert(home,'fixture needs a physically reachable worker home');
    Object.assign(game.workers[0],start);
    const bridge=createSpatialIntentBridge(session);
    bridge.resetFromState(game);
    const worker=game.workers[0];
    const result=bridge.planHomeRoute(worker,home);
    assert.equal(result.status,'found');
    assert(result.path.length>0);
    assert(Math.hypot(result.path.at(-1).x-home.x,
      result.path.at(-1).z-home.z)<.01);
    assert.equal(session.core.wasm.nav_intent_actor(Number(worker.id.split('-').at(-1))),1);
    const record=new Float64Array(session.core.wasm.memory.buffer,
      session.core.wasm.nav_intent_actor_ptr(),10);
    assert.equal(record[2],0,'returning home has no task');
    assert.equal(record[3],0,'returning home has no target lease');
    assert(bridge.cancelHomeIntent(worker.id));
    assert.equal(bridge.routePoints(result.routeHandle),null);
    bridge.resetFromState(game);
    const pointer=session.core.wasm.nav_intent_attack_route_input_ptr(
      result.path.length);
    new Float32Array(session.core.wasm.memory.buffer,pointer,
      result.path.length*2).set(result.path.flatMap(point=>[point.x,point.z]));
    assert.equal(session.core.wasm.nav_intent_restore_home(
      Number(worker.id.split('-').at(-1)),start.x,start.z,
      home.x,home.z,result.path.length),1);
    assert.equal(bridge.routePoints(result.routeHandle),null,
      'an old session handle never becomes valid after restoration');
    assert.equal(session.core.wasm.nav_intent_actor(Number(worker.id.split('-').at(-1))),1);
    const restored=new Float64Array(session.core.wasm.memory.buffer,
      session.core.wasm.nav_intent_actor_ptr(),10);
    const restoredHandle={session:restored[4],slot:restored[5],generation:restored[6]};
    const wallId=session.core.addWall(home.x,home.z,.3,.3);
    assert(wallId>0);
    session.actorSectorRevision({worker:true});
    assert(session.core.wasm.nav_intent_reconcile_topology()>0);
    assert.equal(bridge.routePoints(restoredHandle),null,
      'a wall on the return endpoint invalidates the pinned home handle');
    assert(session.core.removeWall(wallId)>0);
    assert.equal(bridge.planHomeRoute(worker,home).status,'found');
  }finally{session.dispose();}
});

test('saving during worker flight restores native home routes without new plans',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const initial=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  initial.workers=initial.workers.slice(0,1);
  initial.raid=null;
  const open=(game,prepare=false)=>{
    const loaded=new Map(),session=createSpatialGameSession(module,game,{
      loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    if(prepare){
      let start,home;
      for(let z=-10;z<=10&&!home;z++)for(let x=-10;x<=10;x++){
        const from={x:x+.2,z:z+.2},to={x:x+3.2,z:z+.2};
        if(session.routeActor(from,to,{worker:true}).status==='found'){
          start=from;home=to;break;
        }
      }
      assert(home,'fixture needs a reachable home corridor');
      Object.assign(game.workers[0],start);
      game.villages[0].entry=home;
    }
    const planner=createEventDrivenTaskPlanner(session),restored=planner.resetFromState(game);
    const nav=createSpatialNavigationMovement(session,game);
    const stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);
    nav.intentTaskPlanner=planner;
    return {game,session,planner,restored,nav,
      close:()=>{stopTasks();stopWorld();session.dispose();}};
  };
  const continuous=open(initial,true);
  let resumed;
  try{
    const worker=continuous.game.workers[0],home={
      ...continuous.game.villages[0].entry,id:`home-${worker.villageId}`};
    const planned=continuous.planner.planHomeRoute(continuous.game,worker,home,
      continuous.nav.version);
    assert.equal(planned.status,'found');
    worker.path=planned.path;worker.destinationId=home.id;
    worker.pathVersion=continuous.nav.version;
    continuous.game.elapsed+=.05;
    walkTo(continuous.game,worker,home,.05,continuous.nav,
      {externallyPlanned:true});
    resumed=open(deserialize(serialize(continuous.game)));
    assert.deepEqual(resumed.restored.restoredHomeRouteIds,[worker.id]);
    const before=resumed.planner.metrics(resumed.game.elapsed).nativeHomePlanAttempts;
    for(let step=0;step<20;step++){
      for(const run of [continuous,resumed]){
        run.game.elapsed+=.05;
        const actor=run.game.workers[0];
        walkTo(run.game,actor,home,.05,run.nav,{externallyPlanned:true});
      }
    }
    assert.equal(serialize(resumed.game),serialize(continuous.game));
    assert.equal(resumed.planner.metrics(resumed.game.elapsed).nativeHomePlanAttempts,
      before,'restored workers keep their home routes during ordinary movement');
  }finally{resumed?.close();continuous.close();}
});

test('a confirmed wall invalidates a worker home route and reopening replans it',
 {skip:!module&&'Build and select the experimental WASM first'},()=>{
  const game=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
  game.workers=game.workers.slice(0,1);
  game.raid=null;
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    let start,home;
    for(let z=-10;z<=10&&!home;z++)for(let x=-10;x<=10;x++){
      const from={x:x+.2,z:z+.2},to={x:x+2.2,z:z+.2};
      if(session.routeActor(from,to,{worker:true}).status==='found'){
        start=from;home=to;break;
      }
    }
    assert(home,'fixture needs a reachable worker home');
    const worker=game.workers[0];
    Object.assign(worker,start,{status:'fleeing',taskId:null});
    game.villages[0].entry=home;
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(game);
    const nav=createSpatialNavigationMovement(session,game);
    const stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);
    try{
      const planned=planner.planHomeRoute(game,worker,home,nav.version);
      assert.equal(planned.status,'found');
      worker.path=planned.path;
      worker.destinationId=`home-${worker.villageId}`;
      worker.pathVersion=nav.version;
      const wallId=session.core.addWall(home.x,home.z,.4,.4);
      assert(wallId>0);
      assert(planner.reconcileNavigationRevision(game,nav.version+1)>0);
      planner.reconcileWorkerRoutes(game,{navVersion:nav.version+1});
      assert.equal(planner.homeRouteActive(worker.id),false);
      assert.equal(worker.path,null);
      assert.equal(planner.metrics(game.elapsed).nativeHomePlanFallbacks,1);
      assert(session.core.removeWall(wallId)>0);
      planner.reconcileNavigationRevision(game,nav.version+2);
      assert.equal(planner.planHomeRoute(game,worker,home,nav.version+2).status,
        'found');
      assert(planner.homeRouteActive(worker.id));
    }finally{stopTasks();stopWorld();}
  }finally{session.dispose();}
});
