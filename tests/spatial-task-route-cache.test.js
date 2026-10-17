import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import * as Game from '../src/simulation/game.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const snapshot=gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString();

function simulate(cache){
  const state=deserialize(snapshot),loaded=new Map();
  const session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=-1;z<=1;z++)for(let x=0;x<=2;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-24,-72,120,72]);
    if(!cache)nav.workerPath=undefined;
    let nativeRoutes=0;
    const routeActor=session.routeActor;
    session.routeActor=(...args)=>{nativeRoutes++;return routeActor(...args);};
    Game.tick(state,1,nav);
    const firstTickRoutes=nativeRoutes;
    Game.tick(state,1,nav);
    return {state:serialize(state),nativeRoutes,
      firstTickRoutes,secondTickRoutes:nativeRoutes-firstTickRoutes};
  }finally{session.dispose();}
}

test('task reservation reuses blocked proofs and does not poll on the next tick',()=>{
  const baseline=simulate(false),cached=simulate(true);
  assert.equal(cached.state,baseline.state);
  assert(baseline.firstTickRoutes>0,'the fixture must exercise route planning');
  assert.equal(baseline.secondTickRoutes,0,'unchanged tasks must not be replanned');
  assert.equal(cached.secondTickRoutes,0,'cached tasks must not poll the navigator');
  assert(cached.nativeRoutes<=baseline.nativeRoutes*.9,
    `native route calls: ${baseline.nativeRoutes} vs ${cached.nativeRoutes}`);
});
