import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {hire,openInitialHiring,placeStructure,planRepairAccess,plant,
  repairCost,requestRepair,tick} from '../src/simulation/game.js';
import {createSpatialGameSession} from
  '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from
  '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from
  '../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {centerServicePoint} from '../src/world/centers.js';
import {applyBalanceCandidate} from '../tools/experiments/balance-candidate.mjs';

const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const snapshot=gunzipSync(readFileSync(new URL(
  '../docs/qa/wild-engine-intent-lifecycle/sabana17-wall-capture-day17-raid-state.json.gz',
  import.meta.url))).toString();
const canyonSnapshot=readFileSync(new URL(
  '../docs/qa/hierarchical-navigation/spatial-virtual-gran-canon-14-farm-bank-seed123-state.json',
  import.meta.url),'utf8');
const overlapSnapshot=gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-day15-repair-overlap.json.gz',import.meta.url))).toString();
const nearGateUnknownSnapshot=gunzipSync(readFileSync(new URL(
  './fixtures/sabana123-day83-repair-near-gate-unknown.json.gz',import.meta.url))).toString();

async function open(game){
  const loaded=new Map(),session=createSpatialGameSession(module,game,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const desired=new Map();
  const points=[...game.structures.filter(piece=>piece.kind==='wall'||piece.kind==='center'),
    ...game.workers,...game.villages.map(village=>village.entry??village)];
  const chunk=value=>Math.floor((value+24)/48),margin=48;
  for(let z=chunk(Math.min(...points.map(point=>point.z))-margin);
    z<=chunk(Math.max(...points.map(point=>point.z))+margin);z++)
    for(let x=chunk(Math.min(...points.map(point=>point.x))-margin);
      x<=chunk(Math.max(...points.map(point=>point.x))+margin);x++)
      desired.set(`${x},${z}`,{cx:x,cz:z,score:0});
  session.stream.plan(desired);
  await session.stream.whenIdle();
  return {session,nav:createSpatialNavigationMovement(session,game)};
}

test('Sabana day 15: occupied repair footprints defer without speculative routes',
 {skip:!module&&'Build and select the experimental WASM first'},async()=>{
  const game=deserialize(overlapSnapshot),{session,nav}=await open(game);
  try{
    let routes=0,previews=0;
    const physical=nav.workerPhysicalRoute,preview=nav.withWallStatePreview;
    nav.workerPhysicalRoute=(...args)=>{routes++;return physical(...args);};
    nav.withWallStatePreview=(...args)=>{previews++;return preview(...args);};
    for(const id of ['structure-2327','structure-11377']){
      const target=game.structures.find(piece=>piece.id===id);
      assert.equal(target.status,'ruined');
      assert.equal(planRepairAccess(game,target,nav).status,'blocked');
    }
    assert.equal(routes,0);assert.equal(previews,0);
  }finally{session.dispose();}
});

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

test('Gran Cañón repairs retain existing worker routes without unnecessary gates',
 {skip:!module&&'Build and select the experimental WASM first'},async()=>{
  const game=deserialize(canyonSnapshot);
  game.raid=null;game.time=100;game.pauses=[];
  const {session,nav}=await open(game);
  try{
    const home=game.villages[0].entry;
    let legacyRoutes=0,legacyPreviews=0;
    const oldRoute=nav.workerPhysicalRoute,oldPreview=nav.withWallStatePreview;
    nav.workerPhysicalRoute=(...args)=>{legacyRoutes++;return oldRoute(...args);};
    nav.withWallStatePreview=(...args)=>{legacyPreviews++;return oldPreview(...args);};
    for(const id of ['structure-549','structure-862']){
      const target=game.structures.find(piece=>piece.id===id);
      assert.equal(target.status,'ruined');
      const before=game.workers.filter(worker=>worker.status!=='home'&&
        session.routeActorNative(worker,home,{worker:true,cached:false}).status==='found');
      legacyRoutes=0;legacyPreviews=0;
      const plan=planRepairAccess(game,target,nav);
      assert.equal(plan.status,'safe');
      assert.equal(plan.updates.length,0,'the repair must not create an unneeded gate');
      assert.equal(legacyRoutes,0,'native connectivity should avoid speculative worker routes');
      assert.equal(legacyPreviews,0,'native connectivity should avoid provisional wall swaps');
      assert.equal(target.status,'ruined','the preview must not mutate the game');
      const restored={...target,status:'intact',hp:target.maxHp};
      const simulated=game.structures.map(piece=>piece.id===id?restored:piece);
      session.withWallStatePreview(simulated,()=>{
        for(const worker of before)
          assert.equal(session.routeActorNative(worker,home,
            {worker:true,cached:false}).status,'found');
      });
    }
    const target=game.structures.find(piece=>piece.id==='structure-549');
    const beforeMoney=numberOf(game.ledger.balance);
    const expectedCost=numberOf(repairCost(target));
    const beforeGates=game.structures.filter(piece=>piece.gate).length;
    requestRepair(game,'qa-canyon-repair-549',target.id);
    const task=game.tasks.find(item=>item.kind==='repair'&&
      item.targetId===target.id);
    assert(task);
    const worker=game.workers.find(item=>item.centerId===task.centerId);
    assert(worker);
    worker.status='acting';worker.taskId=task.id;worker.actionRemaining=0;
    tick(game,.1,nav);
    assert.equal(target.status,'intact');
    assert.equal(numberOf(game.ledger.balance),beforeMoney-expectedCost);
    assert.equal(game.structures.filter(piece=>piece.gate).length,beforeGates);
  }finally{session.dispose();}
});

for(const biome of ['manglares','gran-rio','desierto','volcanes'])
  test(`${biome}: a paid repair keeps native worker access without an unnecessary gate`,
    {skip:!module&&'Build and select the experimental WASM first'},async()=>{
      const {s:game,nav:placement}=createOpeningWorld({seed:123,biome,
        slotId:`repair-access-${biome}`});
      const center=game.structures[0];
      let built=false;
      for(let d=8;d<=25&&!built;d+=2)
        for(const [dx,dz] of [[d,0],[-d,0],[0,d],[0,-d],[d,d],[-d,-d]]){
          const x=center.x+dx,z=center.z+dz;
          if(!placement.wallPlacement({kind:'wall',material:'zarzas',gate:false,
            x,z,yaw:0}).valid)continue;
          if(placeStructure(game,'qa-wall',{kind:'wall',material:'zarzas',
            x,z,yaw:0},placement)){built=true;break;}
        }
      assert(built,'the fixture must construct a legal wall on real terrain');
      let planted=false;
      for(let d=5;d<=18&&!planted;d+=1.5)
        for(const [dx,dz] of [[d,4],[-d,4],[d,-4],[-d,-4]]){
          const x=center.x+dx,z=center.z+dz;
          if(!placement.placement(x,z,.4).valid)continue;
          planted=!!plant(game,'qa-seed','mijo',x,z,placement);
          if(planted)break;
        }
      assert(planted,'the fixture must plant legally before hiring');
      openInitialHiring(game);
      hire(game,'qa-hire',{olderFemale:1});
      assert.equal(game.workers.length,1);
      const target=game.structures.find(piece=>piece.kind==='wall');
      assert(target&&!target.gate);
      target.status='ruined';target.hp=0;
      const {session,nav}=await open(game);
      try{
        const worker=game.workers[0],home=game.villages[0].entry;
        assert.equal(session.routeActorNative(worker,home,
          {worker:true,cached:false}).status,'found');
        const plan=planRepairAccess(game,target,nav);
        assert.equal(plan.status,'safe');
        assert.equal(plan.updates.length,0);
        const beforeMoney=numberOf(game.ledger.balance);
        const expectedCost=numberOf(repairCost(target));
        requestRepair(game,'qa-repair',target.id);
        const task=game.tasks.find(item=>item.kind==='repair'&&
          item.targetId===target.id);
        assert(task);
        worker.status='acting';worker.taskId=task.id;worker.actionRemaining=0;
        tick(game,.1,nav);
        assert.equal(target.status,'intact');
        assert.equal(numberOf(game.ledger.balance),beforeMoney-expectedCost);
        assert.equal(game.structures.filter(piece=>piece.autoGate).length,0);
        assert.equal(session.routeActorNative(worker,home,
          {worker:true,cached:false}).status,'found');
        const restored=deserialize(serialize(game));
        const reopened=await open(restored);
        try{
          assert.equal(reopened.session.routeActorNative(restored.workers[0],
            restored.villages[0].entry,
            {worker:true,cached:false}).status,'found');
        }finally{reopened.session.dispose();}
        if(biome==='manglares'){
          target.status='ruined';target.hp=0;nav.setState(game);
          const repaired={...target,status:'intact',hp:target.maxHp};
          const before=nav.wallLocalOverlay([],[]),solid=nav.wallLocalOverlay([repaired],[]),
            gate=nav.wallLocalOverlay([{...repaired,gate:true,autoGate:true}],[]);
          const occupiedPoint=[-.95,-.85,-.75,.75,.85,.95].map(dx=>({x:target.x+dx,z:target.z}))
            .find(point=>before.walkable(point.x,point.z)===true&&
              solid.walkable(point.x,point.z)===false&&
              gate.walkable(point.x,point.z)===false);
          assert(occupiedPoint,'fixture needs a physically blocked gate-post position');
          worker.x=occupiedPoint.x;worker.z=occupiedPoint.z;worker.status='idle';
          assert.equal(session.routeActorNative(worker,home,
            {worker:true,cached:false}).status,'found');
          let routes=0,previews=0;
          const physical=nav.workerPhysicalRoute,preview=nav.withWallStatePreview;
          nav.workerPhysicalRoute=(...args)=>{routes++;return physical(...args);};
          nav.withWallStatePreview=(...args)=>{previews++;return preview(...args);};
          const occupied=planRepairAccess(game,target,nav);
          assert.equal(occupied.status,'blocked',
            'a worker inside the restored wall footprint must move first');
          assert.equal(routes,0);assert.equal(previews,0);
          worker.x=home.x;worker.z=home.z;
          const unoccupied=planRepairAccess(game,target,nav);
          assert.equal(unoccupied.status,'safe',
            'the deferred repair should become legal after the worker leaves');
        }
      }finally{session.dispose();}
    });

test('a worker beside a ruined gate defers an inconclusive repair without speculative previews',
 {skip:!module&&'Build and select the experimental WASM first'},async()=>{
  applyBalanceCandidate(JSON.parse(readFileSync(new URL(
    '../tools/experiments/balance-candidates/v1-pressure.json',import.meta.url))));
  const game=deserialize(nearGateUnknownSnapshot),target=game.structures.find(
    piece=>piece.id==='structure-1655');
  const {session,nav}=await open(game);
  try{
    const village=game.villages[0],entry=village.entry??village;
    const witnesses=[...game.structures.filter(piece=>piece.kind==='center'&&
      piece.status==='intact').map(piece=>centerServicePoint(piece,game,.8)),
      ...game.workers];
    const before=nav.wallWorkerReachability(entry,witnesses,[],[],true);
    assert(before.every(status=>status==='found'));
    const restored={...target,status:'intact',hp:target.maxHp};
    const after=nav.wallWorkerReachability(entry,witnesses,[restored],[],true);
    assert.equal(after[witnesses.findIndex(point=>point.id==='worker-85017')],
      'unknown');
    assert(after.every(status=>status==='found'||status==='unknown'));
    let routes=0,previews=0;
    const physical=nav.workerPhysicalRoute,preview=nav.withWallStatePreview;
    nav.workerPhysicalRoute=(...args)=>{routes++;return physical(...args);};
    nav.withWallStatePreview=(...args)=>{previews++;return preview(...args);};
    const saved=serialize(game);
    assert.deepEqual(planRepairAccess(game,target,nav),
      {status:'unknown',updates:[]});
    assert.equal(routes,0);assert.equal(previews,0);
    assert.equal(serialize(game),saved,'an inconclusive quote must not mutate the game');
    const worker=game.workers.find(item=>item.id==='worker-85017');
    worker.x=84;worker.z=-2.83;
    assert.deepEqual(planRepairAccess(game,target,nav),
      {status:'safe',updates:[]},'the same repair becomes legal after the worker moves');
    target.status='intact';target.hp=target.maxHp;nav.setState(game);
    assert(nav.wallWorkerReachability(entry,witnesses,[],[],true)
      .every(status=>status==='found'),
    'committing the formerly deferred gate must preserve every worker access');
  }finally{session.dispose();}
});
