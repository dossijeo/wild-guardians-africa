import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {TerrainField} from '../src/world/terrain.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {centerServicePoint} from '../src/world/centers.js';

for(const biome of ['gran-rio','manglares','volcanes','desierto','gran-canon'])
  test(`${biome} opens a paid center and a worker-reachable crop on the C++ world`,async()=>{
    const {state,nav,session,start,loaded}=await createSpatialCampaignOpening({biome});
    try{
      assert.equal(nav.field,session.field);
      assert.equal(loaded.size,9);
      const crop=start.farm[0],center=state.structures.find(item=>item.kind==='center');
      assert(center);
      assert.equal(Game.plant(state,`spatial-${biome}-crop`,'mijo',
        crop.x,crop.z,nav),true);
      const departure=centerServicePoint(center,state,.8);
      assert(nav.path(departure,crop,.28,null,true));
    }finally{session.dispose();}
  });

test('a real first day and introductory raid run on one C++ spatial world',async()=>{
  const {state,nav,session,start,loaded}=await createSpatialCampaignOpening();
  try{
    assert.equal(nav.field instanceof TerrainField,false);
    assert.equal(nav.field,session.field);
    assert.equal(loaded.size,9);
    assert.equal(state.structures.filter(item=>item.kind==='center').length,1);
    const crop=start.farm[0];
    assert.equal(Game.plant(state,'spatial-first-crop','mijo',crop.x,crop.z,nav),true);
    Game.openInitialHiring(state);
    Game.hire(state,'spatial-first-hire',{olderFemale:1});
    assert.equal(state.workers.length,1);
    for(let step=0;step<1500&&state.day===1&&!state.result;step++)
      Game.tick(state,.5,nav);
    assert.equal(state.day,2);
    assert.equal(state.result,null);
    assert.equal(state.raid,null);
    assert(state.events.some(event=>event.type==='RaidSpawned'));
    assert(state.events.some(event=>event.type==='RaidEnded'));
  }finally{session.dispose();}
});

test('a native wall enclosure still admits a physical introductory raid',async()=>{
  const {state,nav,session,start}=await createSpatialCampaignOpening();
  try{
    const center=start.site.center;
    const x0=center.x-10,x1=center.x+22,
      z0=Math.min(...start.farm.map(point=>point.z))-10,z1=center.z+10;
    assert.equal(Game.buildWallChain(state,'spatial-campaign-ring','zarzas',
      [[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],nav,
      {smooth:false,snap:false}),true);
    assert(state.structures.some(item=>item.kind==='wall'&&item.gate));
    for(const [i,point] of start.farm.slice(0,10).entries())
      assert.equal(Game.plant(state,`spatial-ring-crop-${i}`,'mijo',
        point.x,point.z,nav),true);
    Game.openInitialHiring(state);
    Game.hire(state,'spatial-ring-hire',{olderFemale:1});
    for(let step=0;step<1500&&state.day===1&&!state.result;step++)
      Game.tick(state,.5,nav);
    assert.equal(state.day,2,'a failed exterior entry must not freeze the night');
    const spawned=state.events.find(event=>event.type==='RaidSpawned');
    assert(spawned);
    for(const actor of spawned.raidFacts.actors){
      const point=actor.spawn;
      assert(point.x<x0||point.x>x1||point.z<z0||point.z>z1,
        'native births must be outside the constructed enclosure');
    }
    assert(state.events.some(event=>event.type==='RaidEnded'));
  }finally{session.dispose();}
});

test('a Desert raider completes its physical retreat after spending both hits',async()=>{
  const {state,nav,session,start}=await createSpatialCampaignOpening({biome:'desierto'});
  try{
    for(const [i,point] of start.farm.slice(0,10).entries())
      assert.equal(Game.plant(state,`desert-retreat-crop-${i}`,'mijo',
        point.x,point.z,nav),true);
    Game.openInitialHiring(state);
    Game.hire(state,'desert-retreat-hire',{olderFemale:1});
    for(let step=0;step<1500&&state.day===1&&!state.result;step++)
      Game.tick(state,.5,nav);
    assert.equal(state.day,2);
    assert.equal(state.raid,null);
    const events=state.events;
    assert(events.some(event=>event.type==='AnimalRetreating'&&
      event.reason==='budget-exhausted'));
    assert(events.some(event=>event.type==='RaidEnded'));
  }finally{session.dispose();}
});

for(const biome of ['sabana','desierto'])test(`${biome} grid routes have physically clear movement segments`,async()=>{
  const {nav,session,start}=await createSpatialCampaignOpening({biome});
  try{
    const center=start.site.center,points=[];
    for(let z=center.z-15;z<=center.z+15;z+=5)
      for(let x=center.x-15;x<=center.x+15;x+=5)
        if(nav.walkable(x,z,1.1,null,false))points.push({x,z});
    let routes=0;
    for(let i=0;i<points.length;i+=3)for(let j=1;j<points.length;j+=5){
      let path;
      try{path=nav.path(points[i],points[j],1.1,null,false);}
      catch(error){if(error?.name==='SpatialChunkUnavailable')continue;throw error;}
      if(!path)continue;
      routes++;
      let from=points[i];
      for(const to of path){
        assert(nav.segmentClear(from,to,1.1,null,false),
          `route contains an impassable ${biome} segment ${JSON.stringify({from,to})}`);
        from=to;
      }
    }
    assert(routes>20,'the sample should exercise more than direct local routes');
  }finally{session.dispose();}
});
