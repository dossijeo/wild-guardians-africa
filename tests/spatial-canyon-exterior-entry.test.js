import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {ANIMAL_SPATIAL_PROFILES} from '../src/world/wild-engine/spatial-movement-profiles.js';
import {chooseRaidEntry,reachableApproach} from '../src/simulation/raids.js';
import {raidWallEnvelope} from '../src/simulation/raid-exterior-entry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {rational} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const snapshot=new URL('../docs/qa/hierarchical-navigation/spatial-virtual-gran-canon-14-state.json',import.meta.url);

test('Canyon curved-bank exterior entry reaches the farm without crossing water or walls',()=>{
  const state=deserialize(readFileSync(snapshot,'utf8'));
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  try{
    for(let z=0;z<=8;z++)for(let x=-4;x<=4;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      session.core.selectChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state),bounds=[-120,72,120,312];
    nav.setActiveBounds(bounds);
    nav.setRaidView({x:-18,z:204.33851813332714},{x:-18,z:169.5});
    const radius=ANIMAL_SPATIAL_PROFILES.rhino.radius;
    const entry=chooseRaidEntry(state,[{radius}],bounds,0,nav);
    assert(entry,'the intact horde must have a physically valid land entry');
    const point=entry.entries[0],exit=entry.exits[0];
    const center=state.structures.find(s=>s.kind==='center'&&s.hp>0);
    const farmBank=Math.sign(center.x-nav.field.riverX(center.z));
    assert.equal(Math.sign(point.x-nav.field.riverX(point.z)),farmBank,
      'the animal must enter on the same river bank as the farm');
    assert.equal(Math.sign(exit.x-nav.field.riverX(exit.z)),farmBank,
      'the retreat must stay on the farm bank');
    assert(nav.walkable(point.x,point.z,radius,null,false));
    assert(nav.walkable(exit.x,exit.z,radius,null,false));
    assert(nav.segmentClear(point,exit,radius,null,false));
    assert(nav.spatialExteriorWitness(point,radius,raidWallEnvelope(state,nav)));
    const targets=[...state.structures.filter(s=>s.hp>0),...state.plants.filter(p=>p.alive)];
    assert(targets.some(target=>reachableApproach({...point,radius},target,nav)),
      'the entry must have a route to an actual target');
  }finally{session.dispose();}
});

test('a full mixed Canyon wave keeps a physical bank entry beside a closed farm',async()=>{
  const {state,nav,session,start}=await createSpatialCampaignOpening({
    seed:712,biome:'gran-canon',slotId:'canyon-closed-mixed-entry'});
  try{
    state.tutorial.step='done';state.initialPreparation=false;
    state.ledger.balance=rational(1000000);
    const {x:cx,z:cz}=start.site.center,
      x0=cx-10,x1=cx+22,z0=Math.min(...start.farm.map(point=>point.z))-10,z1=cz+10;
    assert.equal(Game.buildWallChain(state,'mixed-entry-ring','zarzas',
      [[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],nav,
      {smooth:false,snap:false}),true);
    let planted=0;
    for(let dz=-54;dz<=54&&planted<40;dz+=2)
      for(let dx=-54;dx<=54&&planted<40;dx+=2){
        const x=cx+dx,z=cz+dz;
        if(x<=x0+2||x>=x1-2||z<=z0+2||z>=z1-2||
          !nav.placement(x,z,.4).valid)continue;
        if(Game.plant(state,`closed-${planted}`,'mijo',x,z,nav))planted++;
      }
    assert.equal(planted,40);
    const mixed=[...Array(3).fill('warthog'),...Array(4).fill('hyena'),
      ...Array(4).fill('buffalo'),...Array(3).fill('lion'),
      ...Array(2).fill('rhino')];
    for(const group of [mixed,Array(16).fill('warthog')]){
      const specs=group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
      const entry=chooseRaidEntry(state,specs,nav.activeBounds,0,nav);
      assert(entry,`full ${group.at(-1)} formation needs a valid bank entry`);
      const bounds=entry.selectionBounds??nav.activeBounds;
      for(let i=0;i<group.length;i++){
        const point=entry.entries[i],exit=entry.exits[i],radius=specs[i].radius;
        assert(point.x-radius>=bounds[0]&&point.x+radius<=bounds[2]&&
          point.z-radius>=bounds[1]&&point.z+radius<=bounds[3]);
        assert(nav.walkable(point.x,point.z,radius,null,false));
        assert(nav.segmentClear(point,exit,radius,null,false));
        for(let j=0;j<i;j++)assert(Math.hypot(point.x-entry.entries[j].x,
          point.z-entry.entries[j].z)>radius+specs[j].radius+1);
      }
    }
  }finally{session.dispose();}
});
