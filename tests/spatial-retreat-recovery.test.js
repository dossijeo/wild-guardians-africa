import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';

const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const snapshot=gunzipSync(readFileSync(new URL(
  '../docs/qa/hierarchical-navigation/spatial-sabana-seed123-enclosure-30nights-state.json.gz',
  import.meta.url))).toString();

function loadNavigation(state){
  const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  return {session,nav:createSpatialNavigationMovement(session,state)};
}

for(const reload of [false,true])test(`blocked retreat uses a physical exit${reload?' after save/load':''}`,()=>{
  let state=deserialize(snapshot),{session,nav}=loadNavigation(state),
    animal=state.raid.animals.find(a=>a.id==='animal-10819');
  try{
    assert.equal(animal.status,'retreating');
    let checkedRecoverySave=false;
    for(let i=0;i<400&&state.raid;i++){
      const before={x:animal.x,z:animal.z};
      Game.tick(state,1,nav);
      if(Math.hypot(animal.x-before.x,animal.z-before.z)>1e-7)
        assert(nav.segmentClear(before,animal,animal.radius,null,false),
          'every retreat step must satisfy native static collision');
      if(!checkedRecoverySave&&animal.exitRouteRecovery){
        const restored=deserialize(serialize(state));
        assert.deepEqual(restored.raid.animals.find(a=>a.id===animal.id).exitRouteRecovery,
          animal.exitRouteRecovery);
        checkedRecoverySave=true;
        if(reload){
          session.dispose();
          state=restored;
          ({session,nav}=loadNavigation(state));
          animal=state.raid.animals.find(a=>a.id==='animal-10819');
        }
      }
    }
    assert(checkedRecoverySave,'the stale static connector must trigger recovery');
    assert(state.events.some(e=>e.type==='AnimalExitRouteRecovery'&&
      e.actorId===animal.id));
    assert.equal(animal.status,'gone');
    assert(Math.hypot(animal.x-animal.exit.x,animal.z-animal.exit.z)<1e-6);
  }finally{session.dispose();}
});
