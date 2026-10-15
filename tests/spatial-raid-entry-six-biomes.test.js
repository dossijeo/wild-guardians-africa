import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {centerDeliveryPoint} from '../src/world/centers.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

const species=[...Array(5).fill('warthog'),...Array(4).fill('hyena'),
  ...Array(3).fill('buffalo'),...Array(2).fill('lion'),...Array(2).fill('rhino')];
const specs=species.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));

test('full mixed native waves have exterior, reachable entries in every biome',async()=>{
  for(const biome of Game.BIOMES){
    const {state,nav,session,start}=await createSpatialCampaignOpening({
      seed:712,biome,slotId:`entry-${biome}`});
    try{
      state.tutorial.step='done';state.initialPreparation=false;
      let planted=0;
      for(const point of start.farm){
        if(planted>=8)break;
        if(Game.plant(state,`entry-${planted}`,'mijo',point.x,point.z,nav))planted++;
      }
      assert.equal(planted,8,`${biome}: the entry must be tested with crops`);
      const entry=chooseRaidEntry(state,specs,nav.activeBounds,0,nav);
      assert(entry,`${biome}: all animals need an entry`);
      assert.equal(entry.entries.length,specs.length);
      const center=state.structures.find(structure=>structure.kind==='center');
      const envelope=raidWallEnvelope(state,nav);
      for(const [i,point] of entry.entries.entries()){
        const radius=specs[i].radius,exit=entry.exits[i];
        assert(exteriorRaidWitness(point,radius,envelope,nav),`${biome}: animal ${i} spawned inside`);
        assert(nav.segmentClear(point,exit,radius,null,false),`${biome}: animal ${i} cannot retreat`);
        const service=centerDeliveryPoint(center,point,state,radius+.5);
        assert.equal(nav.regionConnected(point,service,radius,null,false),true,
          `${biome}: animal ${i} has no proven native access`);
        for(let j=0;j<i;j++)assert(Math.hypot(point.x-entry.entries[j].x,
          point.z-entry.entries[j].z)>radius+specs[j].radius+1,
        `${biome}: animals ${i} and ${j} overlap`);
      }
    }finally{session.dispose();}
  }
});
