import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {centerServicePoint} from '../src/world/centers.js';
import {prepareVillageIsolated,applyVillageIsolatedPlan} from '../src/simulation/isolated-village-preflight.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const payload=JSON.parse(readFileSync(new URL(
  '../public/content/villages.json',import.meta.url),'utf8'))
  .find(item=>item.id==='suajili');

test('native suppression cannot be rolled back by restoring the game state',async()=>{
  const {state,nav,session,start}=await createSpatialCampaignOpening({seed:712,biome:'desierto',culture:'suajili',slotId:'village-suppression-proof'});
  try{
    state.tutorial.step='done';state.initialPreparation=false;state.day=101;state.completedNights=100;state.result='victory';state.ledger.balance=rational(200000);
    Game.continuePostgame(state);Game.hire(state,'native-postgame-hire',{});
    const {x,z}=start.site.center,cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48),jobs=new Map();
    for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++)jobs.set(`${cx+dx},${cz+dz}`,{cx:cx+dx,cz:cz+dz,score:Math.hypot(dx,dz)});
    session.stream.plan(jobs);await session.stream.whenIdle();nav.setActiveBounds([x-120,z-120,x+120,z+120]);
    const preview=Game.previewVillage(state,'suajili',94.64685702961343,43.466662183008076,payload,nav);
    assert.ok(preview.valid&&preview.suppress.length,'fixture must suppress native props');
    const count=state.suppressed.length;state.suppressed.push(...preview.suppress);nav.setState(state);state.suppressed.length=count;
    assert.throws(()=>nav.setState(state),/suppression cannot be undone/);
  }finally{session.dispose();}
});

test('a paid native postgame village gets a valid entry and survives reload',async()=>{
  const {state,nav,session,loaded,start}=await createSpatialCampaignOpening({
    seed:712,biome:'desierto',culture:'suajili',slotId:'spatial-postgame-village'});
  try{
    state.tutorial.step='done';state.initialPreparation=false;
    state.day=101;state.completedNights=100;state.result='victory';
    state.ledger.balance=rational(200000);
    Game.continuePostgame(state);
    Game.hire(state,'native-postgame-hire',{});
    const {x,z}=start.site.center,cx=Math.floor((x+24)/48),
      cz=Math.floor((z+24)/48),jobs=new Map();
    for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){
      const px=cx+dx,pz=cz+dz;
      jobs.set(`${px},${pz}`,{cx:px,cz:pz,score:Math.hypot(dx,dz)});
    }
    session.stream.plan(jobs);await session.stream.whenIdle();
    nav.setActiveBounds([x-120,z-120,x+120,z+120]);
    // This location passed native terrain and prop checks but previously
    // threw when the entry search tried to assign nav.obstacles.
    const site={x:94.64685702961343,z:43.466662183008076};
    const preview=Game.previewVillage(state,'suajili',site.x,site.z,payload,nav);
    assert.equal(preview.valid,true);
    assert.equal(preview.cost,50000);
    const house=preview.buildings.find(building=>building.kind!=='Zona común');
    assert(nav.walkable(house.x,house.z,.28,null,true),
      'the provisional building barrier is removed after preview');
    const source=serialize(state);
    // A failure after native mutation is materially different from a missing
    // chunk during preview: the purchase is already partly applied and a
    // blind retry cannot safely reconstruct the original command.
    const partialState=deserialize(source),partialLoaded=new Map(),partialSession=createSpatialGameSession(module,partialState,{loaded:()=>partialLoaded,onData:data=>partialLoaded.set(`${data.cx},${data.cz}`,data)});
    try{
      for(const key of loaded.keys()){const [px,pz]=key.split(',').map(Number);partialSession.core.addChunk(px,pz);partialLoaded.set(key,{...partialSession.core.chunkPayload(),terrainRevision:0});}
      const partialNav=createSpatialNavigationMovement(partialSession,partialState);partialNav.setActiveBounds([x-120,z-120,x+120,z+120]);
      const setState=partialNav.setState.bind(partialNav),path=partialNav.path.bind(partialNav);let committed=false;
      partialNav.setState=s=>{const result=setState(s);committed=true;return result;};
      partialNav.path=(a,b,...args)=>{if(committed)throw new SpatialChunkUnavailable(a,b,[{cx:999,cz:999}]);return path(a,b,...args);};
      const balance=numberOf(partialState.ledger.balance),count=partialState.villages.length;
      assert.throws(()=>Game.foundVillage(partialState,'partial-village','suajili',site.x,site.z,payload,partialNav),SpatialChunkUnavailable);
      assert.equal(partialState.villages.length,count+1);assert.equal(numberOf(partialState.ledger.balance),balance-50000);
      assert.equal(partialState.commandIds.includes('partial-village'),false);assert.equal(partialState.events.some(e=>e.type==='VillageFounded'&&e.targetId===partialState.villages.at(-1).id),false);
      assert.equal(serialize(state),source,'a partial isolated commit must not mutate the live authority');
    }finally{partialSession.dispose();}
    const sparseState=deserialize(source),sparseLoaded=new Map(),sparse=createSpatialGameSession(module,sparseState,{loaded:()=>sparseLoaded,onData:data=>sparseLoaded.set(`${data.cx},${data.cz}`,data)});
    try{
      const sparseNav=createSpatialNavigationMovement(sparse,sparseState);sparseNav.setActiveBounds([x-120,z-120,x+120,z+120]);
      assert.throws(()=>Game.foundVillage(sparseState,'native-second-village','suajili',site.x,site.z,payload,sparseNav),SpatialChunkUnavailable);
      assert.equal(serialize(state),source,'a failed isolated attempt cannot modify the authoritative state');
      assert(nav.walkable(house.x,house.z,.28,null,true),'a failed isolated attempt cannot alter live geometry');
    }finally{sparse.dispose();}
    const started=performance.now(),prepared=prepareVillageIsolated(module,source,[...loaded.keys()],{id:'native-second-village',culture:'suajili',...site,payload},{bounds:[x-120,z-120,x+120,z+120]}),preparationMs=performance.now()-started;
    assert.equal(prepared.value,true);assert.deepEqual(prepared.addedChunks,[]);
    const authority=createSimulationAuthority(module,source,[...loaded.keys()],{navigationView:{bounds:[x-120,z-120,x+120,z+120],eye:{x:0,z:0},target:{x:0,z:0}}});
    try{
      const draft=authority.execute({sequence:1,kind:'previewVillage',culture:'suajili',...site,payload});assert.deepEqual(draft.value,preview);assert.equal(draft.snapshot,source);assert.deepEqual(draft.events,[]);
      const result=authority.execute({sequence:2,kind:'foundVillage',id:'native-second-village',culture:'suajili',...site,payload});
      assert.equal(result.value,true);assert.equal(result.snapshot,prepared.snapshot);assert.deepEqual(result.events,prepared.events);
      const replay=authority.execute({sequence:3,kind:'foundVillage',id:'native-second-village',culture:'suajili',...site,payload});assert.equal(replay.value,false);assert.equal(replay.snapshot,result.snapshot);assert.deepEqual(replay.events,[]);
      const wrong=authority.execute({sequence:4,kind:'foundVillage',id:'wrong-culture',culture:'mapungubwe',...site,payload});assert.equal(wrong.value,false);assert.match(wrong.rejection,/cultura de la partida/);assert.equal(wrong.snapshot,result.snapshot);assert.deepEqual(wrong.events,[]);
    }finally{authority.dispose();}
    const siteChunk=`${Math.floor((site.x+24)/48)},${Math.floor((site.z+24)/48)}`;
    const retried=prepareVillageIsolated(module,source,[...loaded.keys()].filter(key=>key!==siteChunk),{id:'native-second-village',culture:'suajili',...site,payload},{bounds:[x-120,z-120,x+120,z+120]});
    assert.ok(retried.addedChunks.includes(siteChunk),'preflight loads the missing site region');assert.equal(retried.snapshot,prepared.snapshot);assert.deepEqual(retried.events,prepared.events);
    const sparseAuthority=createSimulationAuthority(module,source,[...loaded.keys()].filter(key=>key!==siteChunk),{navigationView:{bounds:[x-120,z-120,x+120,z+120],eye:{x:0,z:0},target:{x:0,z:0}}});
    try{const result=sparseAuthority.execute({sequence:1,kind:'foundVillage',id:'native-second-village',culture:'suajili',...site,payload});assert.equal(result.value,true);assert.equal(result.snapshot,prepared.snapshot);assert.deepEqual(result.events,prepared.events);assert.ok(result.commandLoadedChunks.includes(siteChunk));}finally{sparseAuthority.dispose();}
    const plannedState=deserialize(source),plannedLoaded=new Map(),plannedSession=createSpatialGameSession(module,plannedState,{loaded:()=>plannedLoaded,onData:data=>plannedLoaded.set(`${data.cx},${data.cz}`,data)});
    try{
      for(const key of loaded.keys()){const [px,pz]=key.split(',').map(Number);plannedSession.core.addChunk(px,pz);plannedLoaded.set(key,{...plannedSession.core.chunkPayload(),terrainRevision:0});}
      const plannedNav=createSpatialNavigationMovement(plannedSession,plannedState);plannedNav.setActiveBounds([x-120,z-120,x+120,z+120]);
      const residentChunks=[...plannedLoaded.keys()],stale=deserialize(source);stale.elapsed+=.1;assert.throws(()=>applyVillageIsolatedPlan(stale,plannedNav,prepared,{residentChunks}),/Stale/);
      assert.throws(()=>applyVillageIsolatedPlan(plannedState,plannedNav,prepared,{residentChunks:residentChunks.slice(1)}),/Stale/);
      assert.throws(()=>applyVillageIsolatedPlan(plannedState,plannedNav,prepared,{residentChunks:[...residentChunks,'999,999']}),/Stale/);
      const altered=structuredClone(prepared);altered.preparedCenters[0].villageId='forged';assert.throws(()=>applyVillageIsolatedPlan(plannedState,plannedNav,altered,{residentChunks}),/Invalid village preparation/);
      assert.equal(serialize(plannedState),source,'rejected plans must not mutate the authority');
      const setState=plannedNav.setState.bind(plannedNav),path=plannedNav.path.bind(plannedNav);let committed=false;
      plannedNav.setState=s=>{const result=setState(s);committed=true;return result;};plannedNav.path=(a,b,...args)=>{if(committed)throw Error('Unexpected post-commit route');return path(a,b,...args);};
      const events=[],stop=Game.observeGameEvents(plannedState,event=>events.push(structuredClone(event)));
      try{assert.equal(applyVillageIsolatedPlan(plannedState,plannedNav,prepared,{residentChunks}),true);}finally{stop();}
      assert.equal(serialize(plannedState),prepared.snapshot);assert.deepEqual(events,prepared.events);
      const savedCommitted=serialize(plannedState);assert.equal(applyVillageIsolatedPlan(plannedState,plannedNav,prepared,{residentChunks:[]}),false);assert.equal(serialize(plannedState),savedCommitted,'a repeated plan never pays or changes the village twice');
    }finally{plannedSession.dispose();}
    assert.throws(()=>prepareVillageIsolated(module,source,[...loaded.keys()].filter(key=>key!==siteChunk),{id:'native-second-village',culture:'suajili',...site,payload},{bounds:[x-120,z-120,x+120,z+120],maxAdded:0}),SpatialChunkUnavailable,'preflight respects the missing-region limit');
    const poor=deserialize(source);poor.ledger.balance=rational(1);
    assert.throws(()=>prepareVillageIsolated(module,serialize(poor),[...loaded.keys()],{id:'no-funds',culture:'suajili',...site,payload},{bounds:[x-120,z-120,x+120,z+120]}),error=>error.code==='hiring-reserve');
    assert.throws(()=>prepareVillageIsolated(module,source,[...loaded.keys()],{id:'other-culture',culture:'mapungubwe',...site,payload},{bounds:[x-120,z-120,x+120,z+120]}),/cultura de la partida/);
    const duplicate=prepareVillageIsolated(module,prepared.snapshot,[...loaded.keys()],{id:'native-second-village',culture:'suajili',...site,payload},{bounds:[x-120,z-120,x+120,z+120]});
    assert.equal(duplicate.value,false);assert.equal(duplicate.snapshot,prepared.snapshot,'replayed command does not charge twice');assert.deepEqual(duplicate.events,[]);
    assert.equal(serialize(state),source,'isolated preparation leaves the authoritative state untouched');
    assert(nav.walkable(house.x,house.z,.28,null,true),'isolated preparation does not install a live barrier');
    const before=numberOf(state.ledger.balance);
    const emitted=[],stopEvents=Game.observeGameEvents(state,event=>emitted.push(structuredClone(event)));
    try{assert.equal(Game.foundVillage(state,'native-second-village','suajili',site.x,site.z,payload,nav),true);}finally{stopEvents();}
    assert.equal(state.villages.length,2);
    assert.equal(before-numberOf(state.ledger.balance),50000);
    assert.equal(state.villages[1].entry.x,preview.entry.x);
    assert.equal(state.villages[1].entry.z,preview.entry.z);
    assert.equal(state.events.filter(event=>event.type==='VillageFounded').length,1);
    assert.deepEqual(prepared.events,emitted,'isolated founding preserves ordered emitted events');
    assert.equal(serialize(state),prepared.snapshot,'isolated and authoritative founding produce the same snapshot');
    console.log('Isolated village preparation ms:',preparationMs.toFixed(1));
    assert.equal(nav.walkable(house.x,house.z,.28,null,true),false,
      'the paid village installs its permanent native building barrier');
    const saved=serialize(state),restored=deserialize(saved);
    assert.equal(serialize(restored),saved);
    const resident=new Map(),reloaded=createSpatialGameSession(module,restored,{
      loaded:()=>resident,onData:data=>resident.set(`${data.cx},${data.cz}`,data)});
    try{
      reloaded.stream.plan(jobs);await reloaded.stream.whenIdle();
      const fresh=createSpatialNavigationMovement(reloaded,restored);
      fresh.setActiveBounds([x-120,z-120,x+120,z+120]);
      assert(fresh.walkable(restored.villages[1].entry.x,
        restored.villages[1].entry.z,.28,null,true));
      const center=restored.structures.find(item=>item.kind==='center');
      assert(fresh.workerPath(restored.villages[1].entry,
        centerServicePoint(center,restored),.28),
      'the founded village retains a worker route to the paid work center');
      assert.equal(reloaded.core.terrainState().settlements.length,2);
      Game.tick(restored,30,fresh);
      assert(Math.abs(restored.time-30)<1e-8);
      assert.equal(restored.raid,null);
    }finally{reloaded.dispose();}
  }finally{session.dispose();}
});
