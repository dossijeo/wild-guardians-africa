import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {ANIMAL_SPATIAL_PROFILES} from '../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import {chooseRaidEntry,reachableApproach} from '../src/simulation/raids.js';
import {raidWallEnvelope} from '../src/simulation/raid-exterior-entry.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
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
