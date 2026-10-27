import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import * as Game from '../src/simulation/game.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
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
    let nativeRoutes=0,tick=0;
    const queried=new Set(),secondQueries=[],secondEvents=[];
    const routeActor=session.routeActor;
    session.routeActor=(start,end,...args)=>{
      nativeRoutes++;
      const key=`${start.x},${start.z}|${end.x},${end.z}`;
      if(tick===2)secondQueries.push(key);
      else queried.add(key);
      return routeActor(start,end,...args);
    };
    nav.planningObserver=event=>{if(tick===2)secondEvents.push(event.kind);};
    tick=1;
    Game.tick(state,1,nav);
    const firstTickRoutes=nativeRoutes;
    tick=2;
    Game.tick(state,1,nav);
    return {state:serialize(state),nativeRoutes,
      firstTickRoutes,secondTickRoutes:nativeRoutes-firstTickRoutes,
      repeatedSecondQueries:secondQueries.filter(key=>queried.has(key)).length,
      secondRouteRefreshes:secondEvents.filter(kind=>kind==='routeRefresh').length,
      secondRecoverySteps:secondEvents.filter(kind=>kind==='routeRecoveryStep').length};
  }finally{session.dispose();}
}

test('blocked proofs are reused while fractional worker recovery advances across ticks',()=>{
  const baseline=simulate(false),cached=simulate(true);
  assert.equal(cached.state,baseline.state);
  assert(baseline.firstTickRoutes>0,'the fixture must exercise route planning');
  assert.equal(baseline.secondTickRoutes,0,'unchanged tasks must not be replanned');
  assert.equal(cached.secondRouteRefreshes,0,'ordinary routes must not be replanned');
  assert(cached.secondRecoverySteps>0,'the fixture must exercise pending fractional recovery');
  assert(cached.secondTickRoutes<=cached.secondRecoverySteps,
    'native work must belong to bounded recovery steps');
  assert.equal(cached.repeatedSecondQueries,0,
    'a blocked native tail must be reused rather than queried again');
  assert(cached.nativeRoutes<=baseline.nativeRoutes*.9,
    `native route calls: ${baseline.nativeRoutes} vs ${cached.nativeRoutes}`);
});
