import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {centerServicePoint} from '../src/world/centers.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {wallStroke,wallStrokeLine} from '../src/world/wall-layout.js';
import {rational,numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const snapshot=gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString();

async function resident(state){
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const desired=new Map();
  for(let z=-2;z<=2;z++)for(let x=-1;x<=3;x++)desired.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-1)+Math.abs(z)});
  session.stream.plan(desired);
  await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds([-72,-120,168,120]);
  return {session,nav};
}

test('closing an incremental compound perimeter adds a usable third gate',async()=>{
  const state=deserialize(snapshot);
  const finalWalls=state.structures.filter(s=>s.kind==='wall'&&s.created>=27114);
  assert.equal(finalWalls.length,5);
  state.structures=state.structures.filter(s=>!finalWalls.includes(s));
  state.ledger.balance=rational(10000);
  const workers=state.workers.filter(w=>w.status==='fleeing'||w.status==='arriving');
  assert.equal(workers.length,42);
  const center=state.structures.find(s=>s.kind==='center'&&s.status!=='ruined');
  const target=w=>w.status==='fleeing'?state.villages[0].entry:
    centerServicePoint(center,state,.8);
  const {session,nav}=await resident(state);
  try{
    assert(workers.every(w=>nav.path(w,target(w),.28,null,true)),
      'all 42 routes exist before the last paid stroke');
    const stroke=[[66,-7.18],[66,-18]],options={smooth:false,snap:false};
    const frozen=serialize(state);
    const plan=Game.quoteWallChain(state,'zarzas',stroke,nav,options);
    assert.equal(serialize(state),frozen,'the quote must leave state unchanged');
    const localOverlay=nav.wallLocalOverlay;
    nav.wallLocalOverlay=()=>null;
    const fullPreviewPlan=Game.quoteWallChain(state,'zarzas',stroke,nav,options);
    nav.wallLocalOverlay=localOverlay;
    assert.deepEqual({pieces:plan.pieces,gates:plan.gates,cost:plan.cost},
      {pieces:fullPreviewPlan.pieces,gates:fullPreviewPlan.gates,
        cost:fullPreviewPlan.cost},'read-only and full-preview planning agree');
    assert.equal(plan.pieces.length,5);
    assert.equal(plan.gates,1);
    assert.equal(plan.cost,50);
    assert(plan.pieces.some(p=>p.gate&&p.x===66&&p.z< -9&&p.z> -15),
      'the new gate crosses the component cut, not an obstructed endpoint');
    const sealed=nav.withWallPreview(plan.pieces.map(p=>({...p,gate:false})),plan.suppressed,
      draft=>workers.filter(w=>draft.path(w,target(w),.28,null,true)).length);
    assert.equal(sealed,0,'the same five solid wall modules trap all workers');
    const before=numberOf(state.ledger.balance);
    assert(Game.buildWallChain(state,'desert-compound-close','zarzas',stroke,nav,options));
    assert.equal(before-numberOf(state.ledger.balance),50);
    assert.equal(state.structures.filter(s=>s.kind==='wall').length,117);
    assert.equal(state.structures.filter(s=>s.kind==='wall'&&s.gate).length,3);
    assert(workers.every(w=>nav.path(w,target(w),.28,null,true)));
    const gate=state.structures.find(s=>s.id===plan.pieces.find(p=>p.gate).id);
    const [a,b]=gatePortalPoints(gate,.28);
    assert(nav.path(a,b,.28,null,true));
    assert.equal(nav.path(a,b,1.1,null,false),null,
      'the worker gate must remain closed to large animals');
    const saved=serialize(state),reloaded=deserialize(saved);
    const second=await resident(reloaded);
    try{
      const reloadedCenter=reloaded.structures.find(s=>s.id===center.id);
      assert(reloaded.workers.filter(w=>w.status==='fleeing'||w.status==='arriving')
        .every(w=>second.nav.path(w,w.status==='fleeing'?reloaded.villages[0].entry:
          centerServicePoint(reloadedCenter,reloaded,.8),.28,null,true)));
    }finally{second.session.dispose();}
    const beforePositions=new Map(workers.map(w=>[w.id,{x:w.x,z:w.z}]));
    Game.tick(state,1,nav);
    assert(workers.every(w=>Math.hypot(w.x-beforePositions.get(w.id).x,
      w.z-beforePositions.get(w.id).z)>.05),'all 42 workers actually move');
  }finally{session.dispose();}
});

test('an unhostable extra gate leaves the closing module unbuilt and charges only built walls',async()=>{
  const state=deserialize(snapshot);
  state.structures=state.structures.filter(s=>!(s.kind==='wall'&&s.created>=27114));
  state.ledger.balance=rational(10000);
  const workers=state.workers.filter(w=>w.status==='fleeing'||w.status==='arriving');
  const {session,nav}=await resident(state);
  try{
    const original=nav.wallPlacement;
    nav.wallPlacement=piece=>piece.gate?{valid:false,reason:'fixture blocked gate'}:original(piece);
    const stroke=[[66,-7.18],[66,-18]],options={smooth:false,snap:false};
    const before=serialize(state),plan=Game.quoteWallChain(state,'zarzas',stroke,nav,options);
    assert.equal(serialize(state),before);
    assert.equal(plan.pieces.length,3);
    assert.equal(plan.gates,0);
    assert.equal(plan.cost,30);
    const balance=numberOf(state.ledger.balance);
    assert(Game.buildWallChain(state,'blocked-extra-gate','zarzas',stroke,nav,options));
    assert.equal(balance-numberOf(state.ledger.balance),30);
    assert.equal(state.structures.filter(s=>s.kind==='wall').length,115);
    assert(workers.every(w=>nav.path(w,state.villages[0].entry,.28,null,true)));
  }finally{session.dispose();}
});

test('closing a compound perimeter one paid module at a time preserves worker exit',async()=>{
  const state=deserialize(snapshot);
  state.structures=state.structures.filter(s=>!(s.kind==='wall'&&s.created>=27114));
  state.ledger.balance=rational(10000);
  const workers=state.workers.filter(w=>w.status==='fleeing'||w.status==='arriving');
  const center=state.structures.find(s=>s.kind==='center'&&s.status!=='ruined');
  const target=w=>w.status==='fleeing'?state.villages[0].entry:
    centerServicePoint(center,state,.8);
  const {session,nav}=await resident(state);
  try{
    const initialGates=state.structures.filter(s=>s.kind==='wall'&&s.autoGate).length;
    const slots=wallStroke([[66,-7.18],[66,-18]],state.structures,
      {smooth:false,snap:false});
    assert.equal(slots.length,5);
    assert(workers.every(w=>nav.path(w,target(w),.28,null,true)));
    for(const [i,slot] of slots.entries()){
      const stroke=wallStrokeLine([slot]),before=numberOf(state.ledger.balance);
      assert(Game.buildWallChain(state,`incremental-gate-${i}`,'zarzas',stroke,nav,
        {smooth:false,snap:false,maxPieces:1}));
      assert.equal(before-numberOf(state.ledger.balance),10);
      assert(workers.every(w=>nav.path(w,target(w),.28,null,true)),
        `paid module ${i+1} trapped a worker`);
    }
    assert(state.structures.filter(s=>s.kind==='wall'&&s.autoGate).length>initialGates);
    const reloaded=deserialize(serialize(state)),second=await resident(reloaded);
    try{
      const reloadedCenter=reloaded.structures.find(s=>s.id===center.id);
      assert(reloaded.workers.filter(w=>w.status==='fleeing'||w.status==='arriving')
        .every(w=>second.nav.path(w,w.status==='fleeing'?reloaded.villages[0].entry:
          centerServicePoint(reloadedCenter,reloaded,.8),.28,null,true)));
    }finally{second.session.dispose();}
    const beforePositions=new Map(workers.map(w=>[w.id,{x:w.x,z:w.z}]));
    Game.tick(state,1,nav);
    assert(workers.every(w=>Math.hypot(w.x-beforePositions.get(w.id).x,
      w.z-beforePositions.get(w.id).z)>.05),'all workers resume physical movement');
  }finally{session.dispose();}
});
