import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {createWallRouteWitness} from '../src/simulation/raid-wall-route-witness.js';

test('frozen Desert wall side lends one native route only across seven legal animal prefixes',()=>{
  const fixture='docs/qa/desert-raid-pressure-audit/desierto123-d17-waiting-state.json.gz';
  const state=deserialize(gunzipSync(readFileSync(fixture)).toString());
  const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const village=state.villages[0],cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);
    for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state),radius=state.raid.animals[0].radius;
    createEventDrivenTaskPlanner(session).resetFromState(state);
    assert(state.raid.animals.every(animal=>animal.radius===radius));
    const side=nav.spatialWallApproachSides(radius).find(candidate=>
      Math.abs(candidate.x-70.5)<.01&&Math.abs(candidate.z-10.42)<.01);
    assert(side,'the frozen positive native wall side must remain available');
    const births=state.raid.animals.map(animal=>animal.spawn);
    assert(births.every(point=>nav.spatialRouteStatus(point,side,radius)==='found'));
    for(const point of births.slice(1))
      assert(nav.segmentClear(point,births[0],radius,null,false));
    const nativeRoute=nav.spatialRouteStatus;
    let routeCalls=0;
    nav.spatialRouteStatus=(...args)=>{routeCalls++;return nativeRoute(...args);};
    const status=createWallRouteWitness(nav);
    assert(births.every(point=>status(point,side,radius)==='found'));
    assert.equal(routeCalls,1);
  }finally{session.dispose();}
});
