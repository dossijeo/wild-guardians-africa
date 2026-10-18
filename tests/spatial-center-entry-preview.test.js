import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {rational} from '../src/simulation/money.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

test('a paid native center preview cannot obstruct its village worker entry',async()=>{
  const {state,nav,session}=await createSpatialCampaignOpening({
    seed:712,biome:'sabana',slotId:'native-center-entry-preview'});
  try{
    state.tutorial.step='done';state.initialPreparation=false;
    state.ledger.balance=rational(1000000);
    const entry=state.villages[0].entry;
    assert(nav.walkable(entry.x,entry.z,.28,null,true));
    const preview=Game.previewCenter(state,{x:entry.x-1,z:entry.z},nav);
    assert.equal(preview.valid,false,
      'the candidate footprint covers the only worker departure point');
    assert(nav.walkable(entry.x,entry.z,.28,null,true),
      'provisional center barriers must be removed after inspection');
    assert.throws(()=>Game.placeStructure(state,'paid-entry-blocker',{
      kind:'center',x:entry.x-1,z:entry.z},nav));
    assert.equal(state.structures.filter(item=>item.kind==='center').length,1);
  }finally{session.dispose();}
});

test('village and center quotes leave confirmed native topology untouched',async()=>{
  const {state,nav,session}=await createSpatialCampaignOpening({
    seed:712,biome:'sabana',slotId:'native-read-only-building-preview'});
  try{
    const building=state.villages[0].buildings.find(item=>
      item.kind!=='Zona común');
    assert(building);
    const point={x:building.x,z:building.z};
    const baseline=session.actorCanStand(point,{worker:true});
    const stamp=session.routeStamp();
    const updates=session.core.wasm.lazy_sector_updates();
    const routeRevision=session.core.wasm.lazy_route_revision();
    const gameState=serialize(state);
    for(let i=0;i<100;i++)
      nav.withVillageEntryPreview([building],draft=>{
        assert.equal(draft.walkable(point),false);
      });
    const entry=state.villages[0].entry;
    Game.previewCenter(state,{x:entry.x-1,z:entry.z},nav);
    assert.deepEqual(session.routeStamp(),stamp);
    assert.equal(session.core.wasm.lazy_sector_updates(),updates);
    assert.equal(session.core.wasm.lazy_route_revision(),routeRevision);
    assert.equal(serialize(state),gameState);
    assert.equal(session.actorCanStand(point,{worker:true}),baseline);
  }finally{session.dispose();}
});

test('read-only polygon occupancy matches the native confirmed polygon',async()=>{
  const {state,session}=await createSpatialCampaignOpening({
    seed:123,biome:'sabana',slotId:'native-polygon-overlay-differential'});
  try{
    const entry=state.villages[0].entry;
    const footprint=[[-1.5,-1.5],[1.5,-1.5],[1.5,1.5],[-1.5,1.5]]
      .map(([dx,dz])=>({x:entry.x+dx,z:entry.z+dz}));
    const polygon={footprint};
    const samples=[[0,0],[1.7,0],[2.2,0],[-2.2,0],[0,2.2]]
      .map(([dx,dz])=>({x:entry.x+dx,z:entry.z+dz}));
    session.actorCanStand(entry,{worker:true});
    const overlay=samples.map(point=>session.core.overlayLocalClear(
      point,point,[],[],[],[polygon]));
    const id=session.core.addPolygon(footprint,0);
    try{
      const confirmed=samples.map(point=>session.core.localClear(point,point));
      assert.deepEqual(overlay,confirmed);
    }finally{assert.equal(session.core.removePolygon(id),1);}
  }finally{session.dispose();}
});
