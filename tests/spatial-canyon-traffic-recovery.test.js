import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deserialize} from '../src/persistence/snapshots.js';
import {updateRaid} from '../src/simulation/raids.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';

const binary=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const snapshot=readFileSync(new URL(
  '../docs/qa/hierarchical-navigation/spatial-virtual-gran-canon-14-farm-bank-seed123-state.json',
  import.meta.url),'utf8');

test('Canyon animal traffic clears after reload without crossing static barriers',()=>{
  const state=deserialize(snapshot),animals=state.raid.animals;
  const loaded=new Map(),session=createSpatialGameSession(binary,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  try{
    const points=[...animals.flatMap(a=>[a,a.spawn,a.exit]),...state.structures];
    const bounds=[Math.min(...points.map(p=>p.x))-64,Math.min(...points.map(p=>p.z))-64,
      Math.max(...points.map(p=>p.x))+64,Math.max(...points.map(p=>p.z))+64];
    for(let z=Math.floor((bounds[1]+24)/48);z<=Math.floor((bounds[3]+24)/48);z++)
      for(let x=Math.floor((bounds[0]+24)/48);x<=Math.floor((bounds[2]+24)/48);x++){
        if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
        session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());
      }
    const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);
    const dt=.1;let elapsed=0;
    for(;elapsed<180&&state.raid;elapsed+=dt){
      const previous=new Map(animals.map(a=>[a.id,{x:a.x,z:a.z}]));
      state.elapsed+=dt;updateRaid(state,dt,nav);
      for(const animal of animals){
        const before=previous.get(animal.id),step=Math.hypot(animal.x-before.x,animal.z-before.z);
        assert(step<=3.8*dt+1e-7,`${animal.id}: movement speed`);
        if(step>1e-8)assert(nav.segmentClear(before,animal,animal.radius,null,false),
          `${animal.id}: static barrier crossed`);
      }
    }
    assert.equal(state.raid,null,'the raid must finish after the mobile jam clears');
    assert(state.events.some(e=>e.type==='ActorMobileCollisionRecovery'));
  }finally{session.dispose();}
});
