import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {planRepairAccess,requestRepair,tick} from '../src/simulation/game.js';
import {createSpatialGameSession} from
  '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from
  '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from
  '../src/world/hierarchical-wasm/spatial-intent-bridge.js';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const snapshot=gunzipSync(readFileSync(new URL(
  '../docs/qa/wild-engine-intent-lifecycle/sabana17-wall-capture-day17-raid-state.json.gz',
  import.meta.url))).toString();

async function open(game){
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const desired=new Map();
  for(let z=-2;z<=2;z++)for(let x=0;x<=4;x++)
    desired.set(`${x},${z}`,{cx:x,cz:z,score:0});
  session.stream.plan(desired);
  await session.stream.whenIdle();
  return {session,nav:createSpatialNavigationMovement(session,game)};
}

test('repairing the last physical gap creates a worker-access gate before payment',
 {skip:!module&&'Build and select the experimental WASM first'},async()=>{
  const game=deserialize(snapshot),target=game.structures.find(
    piece=>piece.id==='structure-11838');
  target.status='ruined';target.hp=0;
  game.raid=null;game.time=100;game.pauses=[];
  const {session,nav}=await open(game);
  try{
    const workerIds=['worker-14351','worker-14352','worker-14353'];
    const workers=workerIds.map(id=>game.workers.find(worker=>worker.id===id));
    const home=game.villages[0].entry;
    for(const worker of workers)
      assert.equal(session.routeActorNative(worker,home,
        {worker:true,cached:false}).status,'found');
    const bridge=createSpatialIntentBridge(session);
    bridge.resetFromState(game);
    const pinned=bridge.planHomeRoute(workers[0],home);
    assert.equal(pinned.status,'found');
    const beforeMoney=numberOf(game.ledger.balance);
    const plan=planRepairAccess(game,target,nav);
    assert.equal(plan.status,'safe');
    assert(plan.updates.some(update=>update.gate),
      'a separate wall may need to become the automatic gate');
    assert.equal(target.status,'ruined','the preview must not commit the repair');
    assert.equal(numberOf(game.ledger.balance),beforeMoney);
    assert(bridge.routePoints(pinned.routeHandle)?.length,
      'speculative wall swaps must not release a confirmed route handle');
    for(const worker of workers)
      assert.equal(session.routeActorNative(worker,home,
        {worker:true,cached:false}).status,'found',
      'the preview must restore confirmed topology');

    requestRepair(game,'qa-repair-11838',target.id);
    const task=game.tasks.find(item=>item.kind==='repair'&&
      item.targetId===target.id);
    assert(task);
    workers[0].status='acting';workers[0].taskId=task.id;
    workers[0].actionRemaining=0;
    tick(game,.1,nav);
    assert.equal(target.status,'intact');
    assert.equal(numberOf(game.ledger.balance),beforeMoney-10);
    assert(game.structures.some(piece=>piece.gate&&piece.autoGate));
    assert.equal(game.tasks.some(item=>item.id===task.id),false);
    for(const worker of workers)
      assert.equal(session.routeActorNative(worker,home,
        {worker:true,cached:false}).status,'found');
    const restored=deserialize(serialize(game));
    const reopened=await open(restored);
    try{
      assert(restored.structures.some(piece=>piece.gate&&piece.autoGate));
      for(const id of workerIds){
        const worker=restored.workers.find(item=>item.id===id);
        assert.equal(reopened.session.routeActorNative(worker,home,
          {worker:true,cached:false}).status,'found');
      }
    }finally{reopened.session.dispose();}
  }finally{session.dispose();}
});
