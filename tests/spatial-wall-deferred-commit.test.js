import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {rational} from '../src/simulation/money.js';
import {centerServicePoint} from '../src/world/centers.js';
import {wallCollisionBounds} from '../src/world/wall-collision-frame.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {createSpatialWallMirror} from '../src/world/hierarchical-wasm/spatial-wall-mirror.js';
import {clearNavigation} from './clear-navigation.js';

test('a topological revision retains a physically clear active route',()=>{
  const state=Game.newGame({seed:712,slotId:'route-revision'});
  const destination={id:'destination',x:10,z:0};
  const actor={id:'worker-1',x:0,z:0,radius:.28,status:'walking',
    path:[{x:10,z:0}],pathVersion:1,destinationId:destination.id};
  state.workers=[actor];
  let routes=0,refreshes=0,dependencyChecks=0;
  const nav={...clearNavigation(),version:1,
    workerPath:()=>{routes++;return [{x:10,z:0}];},
    ownsRoute:route=>route===actor.path,
    routeStamp:()=>({wall:nav.version}),
    routeUnaffectedByWalls:()=>{dependencyChecks++;return true;},
    workerMotionClear:()=>true,
    planningObserver:event=>{if(event.kind==='routeRefresh')refreshes++;}};
  Game.walkTo(state,actor,destination,0,nav);
  nav.version=2;
  Game.walkTo(state,actor,destination,.1,nav);
  assert.equal(actor.pathVersion,2);
  assert.equal(routes,0);
  assert.equal(refreshes,0);
  assert.equal(dependencyChecks,1);
  assert(actor.x>0,'the actor advances on its retained route');
});

test('a newly blocked active route is replanned before the actor moves',()=>{
  const state=Game.newGame({seed:712,slotId:'blocked-revision'});
  const destination={id:'destination',x:10,z:0};
  const actor={id:'worker-1',x:0,z:0,radius:.28,status:'walking',
    path:[{x:10,z:0}],pathVersion:1,destinationId:destination.id};
  state.workers=[actor];
  let routes=0;
  const nav={...clearNavigation(),version:1,
    workerPath:()=>{routes++;return [{x:0,z:2},{x:10,z:0}];},
    ownsRoute:route=>route===actor.path,
    routeStamp:()=>({wall:nav.version}),
    routeUnaffectedByWalls:()=>false,
    workerMotionClear:()=>true};
  Game.walkTo(state,actor,destination,0,nav);
  nav.version=2;
  Game.walkTo(state,actor,destination,.1,nav);
  assert.equal(routes,1);
  assert.equal(actor.pathVersion,2);
  assert.equal(actor.x,0,'the worker must not continue through the new wall');
  assert(actor.z>0,'the worker must follow the newly planned detour');
});

test('a restored route from another session cannot use this wall journal',()=>{
  const state=Game.newGame({seed:712,slotId:'restored-route'});
  const destination={id:'destination',x:10,z:0};
  const actor={id:'worker-1',x:0,z:0,radius:.28,status:'walking',
    path:[{x:10,z:0}],pathVersion:1,destinationId:destination.id};
  state.workers=[actor];
  let routes=0,certificates=0;
  const nav={...clearNavigation(),version:1,
    workerPath:()=>{routes++;return [{x:10,z:0}];},
    ownsRoute:()=>false,routeStamp:()=>({wall:nav.version}),
    routeUnaffectedByWalls:()=>{certificates++;return true;},
    workerMotionClear:()=>true};
  Game.walkTo(state,actor,destination,0,nav);
  nav.version=2;
  Game.walkTo(state,actor,destination,.1,nav);
  assert.equal(certificates,0,'foreign routes have no trusted dependency stamp');
  assert.equal(routes,1,'a new session must establish its own physical route');
});

test('an expired wall-change history cannot certify an old route',()=>{
  let nextId=1;
  const core={applyBarrierChanges:(_removed,added)=>added.map(()=>nextId++)};
  const mirror=createSpatialWallMirror(core);
  const far=[{x:0,z:100},{x:10,z:100}];
  for(let i=0;i<65;i++)mirror.sync([{id:'wall-1',kind:'wall',
    material:'zarzas',status:'intact',x:i*3,z:0,yaw:0,baseScaleX:1}]);
  assert.equal(mirror.routeUnaffectedSince(0,far,.28),false);
  assert.equal(mirror.routeUnaffectedSince(64,far,.28),true);
  assert.equal(mirror.routeUnaffectedSince(64,
    [{x:191,z:0},{x:193,z:0}],.28),false);
});

test('a paid 20-wall transaction changes topology without planning actor routes',async()=>{
  const {state,nav,session,start}=await createSpatialCampaignOpening({
    seed:983,biome:'desierto'});
  try{
    state.ledger.balance=rational(10000);
    const center=start.site.center;
    const stroke=[[center.x-30,center.z-30],[center.x+12,center.z-30]];
    const options={smooth:false,snap:false};
    const before=serialize(state);
    const plan=Game.previewWallChain(state,'zarzas',stroke,nav,options);
    assert.equal(plan.pieces.length,20);
    assert.equal(plan.blockedPieces.length,0);
    assert.equal(serialize(state),before,'a quote must not mutate the game');
    const workCenter=state.structures.find(item=>item.kind==='center');
    const village=state.villages.find(item=>item.id===workCenter.villageId);
    const servicePoint=centerServicePoint(workCenter,state,.8);
    const serviceRoute=nav.path(village.entry??village,servicePoint,.28,null,true);
    assert(serviceRoute?.length);
    const routeStamp=session.routeStamp();

    let paths=0,previews=0,barrierTransactions=0;
    const originalPath=nav.path,originalPreview=session.withWallPreview;
    const originalBarriers=session.core.applyBarrierChanges;
    nav.path=(...args)=>{paths++;return originalPath(...args);};
    session.withWallPreview=(...args)=>{previews++;return originalPreview(...args);};
    session.core.applyBarrierChanges=(...args)=>{
      barrierTransactions++;return originalBarriers(...args);
    };
    const sectorsBefore=session.core.wasm.lazy_sector_updates();
    assert.equal(Game.buildWallChain(state,'deferred-commit-20','zarzas',stroke,
      nav,{...options,preparedPlan:plan}),true);
    assert.equal(paths,0,'the topology change must not plan actor routes');
    assert.equal(previews,0,'a prepared quote must not repeat its preview');
    assert.equal(barrierTransactions,1,'the paid stroke uses one topology transaction');
    assert.equal(state.structures.filter(item=>item.kind==='wall').length,20);
    const sectorUpdates=session.core.wasm.lazy_sector_updates()-sectorsBefore;
    assert(sectorUpdates>0&&sectorUpdates<64,
      'the paid stroke must update a bounded set of local sectors');
    assert(session.routeUnaffectedByWalls(routeStamp,
      [village.entry??village,...serviceRoute],.28),
    'the native wall-change footprint must leave a distant route valid');
    assert.equal(session.routeUnaffectedByWalls(routeStamp,
      [{x:plan.pieces[0].x-2,z:plan.pieces[0].z},
        {x:plan.pieces[0].x+2,z:plan.pieces[0].z}],.28),false,
    'a crossing route must be invalidated conservatively');
    const middle=plan.pieces[10],nearZ=wallCollisionBounds(middle,0)[3]+.8;
    const nearWall=[{x:middle.x-.5,z:nearZ},{x:middle.x+.5,z:nearZ}];
    assert(session.routeUnaffectedByWalls(routeStamp,nearWall,.28),
      'a worker-sized route outside the changed footprint remains valid');
    assert.equal(session.routeUnaffectedByWalls(routeStamp,nearWall,1.55),false,
      'a larger animal radius must expand the invalidation footprint');
    assert(nav.path(village.entry??village,
      servicePoint,.28,null,true),
    'a later request must use the new topology and retain center access');
    const beforeRemoval=session.routeStamp();
    assert(Game.removeWall(state,'deferred-remove-one',plan.pieces[0].id,nav));
    assert(session.routeUnaffectedByWalls(beforeRemoval,
      [village.entry??village,...serviceRoute],.28),
    'a distant route remains valid after local wall removal');
    assert.equal(session.routeUnaffectedByWalls(beforeRemoval,
      [{x:plan.pieces[0].x-2,z:plan.pieces[0].z},
        {x:plan.pieces[0].x+2,z:plan.pieces[0].z}],.28),false,
    'removal must also appear in the conservative wall-change journal');
    const afterRemoval=session.routeStamp();
    const {cx,cz}={cx:Math.floor((center.x+24)/48)+1,
      cz:Math.floor((center.z+24)/48)+1};
    if(session.core.selectChunk(cx,cz)>=0){
      assert(session.core.removeChunk(cx,cz));
      assert.equal(session.routeUnaffectedByWalls(afterRemoval,
        [village.entry??village,...serviceRoute],.28),false,
      'sector residency changes cannot be certified by the wall journal');
    }
  }finally{session.dispose();}
});

test('a new native wall replans a crossing worker route before movement',async()=>{
  const {state,nav,session,start}=await createSpatialCampaignOpening({
    seed:983,biome:'desierto'});
  try{
    const center=start.site.center,stroke=[[center.x-30,center.z-30],
      [center.x+12,center.z-30]];
    const plan=Game.quoteWallChain(state,'zarzas',stroke,nav,
      {smooth:false,snap:false});
    const crossing=plan.pieces.map(piece=>({piece,
      from:{x:piece.x,z:piece.z-3},to:{x:piece.x,z:piece.z+3}}))
      .find(({from,to})=>nav.walkable(from.x,from.z,.28,null,true)&&
        nav.walkable(to.x,to.z,.28,null,true)&&
        nav.segmentClear(from,to,.28,null,true));
    assert(crossing,'fixture needs a clear route across a legal wall site');
    const destination={...crossing.to,id:'crossing-destination'};
    const path=nav.path(crossing.from,destination,.28,null,true);
    assert(path?.length);
    const worker={id:'crossing-worker',...crossing.from,status:'returning',
      radius:.28,path,pathVersion:nav.version,destinationId:destination.id};
    state.workers=[worker];
    Game.walkTo(state,worker,destination,0,nav);
    const stamp=session.routeStamp();
    state.structures.push(crossing.piece);
    nav.setState(state);
    assert.equal(session.routeUnaffectedByWalls(stamp,[worker,...path],.28),false);
    let routes=0;
    const original=nav.workerPath;
    nav.workerPath=(...args)=>{routes++;return original(...args);};
    const before={x:worker.x,z:worker.z};
    Game.walkTo(state,worker,destination,.1,nav);
    assert.equal(routes,1,'the affected actor must request a new route');
    assert(nav.walkable(worker.x,worker.z,.28,null,true));
    assert(nav.workerMotionClear(before,worker,.28),
      'the actor must not cross the new wall on its first movement step');
  }finally{session.dispose();}
});
