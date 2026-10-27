import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {rational} from '../src/simulation/money.js';
import {centerServicePoint} from '../src/world/centers.js';
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

test('a center quote checks both worker directions for each eligible village',async()=>{
  const {state,nav,session}=await createSpatialCampaignOpening({
    seed:712,biome:'sabana',slotId:'native-multiple-village-center-preview'});
  try{
    const center=state.structures.find(item=>item.kind==='center');
    let point=null,entry=null;
    for(let dz=-24;dz<=24&&!point;dz+=6)for(let dx=-24;dx<=24&&!point;dx+=6){
      if(Math.hypot(dx,dz)<8)continue;
      const candidate={x:center.x+dx,z:center.z+dz};
      if(!Game.previewCenter(state,candidate,nav).valid)continue;
      for(const [ex,ez] of [[12,0],[-12,0],[0,12],[0,-12]]){
        const nearby={x:candidate.x+ex,z:candidate.z+ez};
        if(!nav.walkable(nearby.x,nearby.z,.28,null,true))continue;
        point=candidate;entry=nearby;break;
      }
    }
    assert(point&&entry,'expected a second constructible center site');
    state.villages.push({...state.villages[0],id:'village-secondary',
      x:entry.x,z:entry.z,entry,buildings:[]});
    const stamp=session.routeStamp(),revision=session.core.wasm.lazy_route_revision();
    const quote=Game.previewCenter(state,point,nav);
    assert.equal(quote.valid,true,quote.reason);
    assert.equal(quote.villageId,'village-secondary');
    assert.deepEqual(session.routeStamp(),stamp);
    assert.equal(session.core.wasm.lazy_route_revision(),revision);
    const departure=centerServicePoint(quote,state,.8),costs=new Map();
    nav.withWallPreview([],quote.suppress??[],()=>{
      const id=session.core.addPolygon(quote.footprint.footprint,0);
      try{
        for(const village of state.villages){
          const destination=village.entry??village;
          const route=nav.path(departure,destination,.28,null,true);
          if(!route)continue;
          let length=0,previous=departure;
          for(const waypoint of route){
            length+=Math.hypot(previous.x-waypoint.x,previous.z-waypoint.z);
            previous=waypoint;
          }
          costs.set(village.id,length);
        }
      }finally{session.core.removePolygon(id);}
    });
    assert(costs.has(quote.villageId));
    assert(costs.get(quote.villageId)<=Math.min(...costs.values())+1e-6,
      JSON.stringify([...costs]));
    assert.deepEqual(session.routeStamp(),stamp);
    assert.equal(session.core.wasm.lazy_route_revision(),revision);
    const barrier=session.core.addWall(77,-12,.4,18);
    try{
      assert(barrier>0);
      assert.equal(nav.segmentClear({x:76,z:-12},entry,.28,null,true),false);
      const nativeRevision=session.core.wasm.lazy_route_revision();
      const obstructed=Game.previewCenter(state,point,nav);
      assert.equal(obstructed.valid,true);
      const lengths=new Map(),from=centerServicePoint(obstructed,state,.8);
      nav.withWallPreview([],obstructed.suppress??[],()=>{
        const polygon=session.core.addPolygon(obstructed.footprint.footprint,0);
        try{
          for(const village of state.villages){
            const destination=village.entry??village;
            const route=nav.path(from,destination,.28,null,true);
            if(!route)continue;
            let length=0,previous=from;
            for(const waypoint of route){
              length+=Math.hypot(previous.x-waypoint.x,previous.z-waypoint.z);
              previous=waypoint;
            }
            lengths.set(village.id,length);
          }
        }finally{session.core.removePolygon(polygon);}
      });
      assert(lengths.get('village-1')+10<lengths.get('village-secondary'),
        'the wall creates a materially longer route to the closer village');
      assert.equal(obstructed.villageId,'village-1',
        'the selected center must avoid the longer physically valid worker commute');
      assert.equal(session.core.wasm.lazy_route_revision(),nativeRevision);
    }finally{session.core.removeWall(barrier);}
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
