import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {centerServicePoint} from '../src/world/centers.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const payload=JSON.parse(readFileSync(new URL(
  '../public/content/villages.json',import.meta.url),'utf8'))
  .find(item=>item.id==='suajili');

test('a paid native postgame village gets a valid entry and survives reload',async()=>{
  const {state,nav,session,loaded,start}=await createSpatialCampaignOpening({
    seed:712,biome:'desierto',culture:'mapungubwe',slotId:'spatial-postgame-village'});
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
    const before=numberOf(state.ledger.balance);
    assert.equal(Game.foundVillage(state,'native-second-village','suajili',
      site.x,site.z,payload,nav),true);
    assert.equal(state.villages.length,2);
    assert.equal(before-numberOf(state.ledger.balance),50000);
    assert.equal(state.villages[1].entry.x,preview.entry.x);
    assert.equal(state.villages[1].entry.z,preview.entry.z);
    assert.equal(state.events.filter(event=>event.type==='VillageFounded').length,1);
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
