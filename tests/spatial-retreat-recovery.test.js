import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';

const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
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
    let checkedReload=false;
    for(let i=0;i<400&&state.raid;i++){
      const before={x:animal.x,z:animal.z};
      Game.tick(state,1,nav);
      if(Math.hypot(animal.x-before.x,animal.z-before.z)>1e-7)
        assert(nav.segmentClear(before,animal,animal.radius,null,false),
          'every retreat step must satisfy native static collision');
      if(reload&&!checkedReload&&i===5){
        const restored=deserialize(serialize(state));
        session.dispose();
        state=restored;
        ({session,nav}=loadNavigation(state));
        animal=state.raid.animals.find(a=>a.id==='animal-10819');
        checkedReload=true;
      }
    }
    if(reload)assert(checkedReload);
    assert.equal(animal.status,'gone');
    assert(Math.hypot(animal.x-animal.exit.x,animal.z-animal.exit.z)<1e-6);
  }finally{session.dispose();}
});

test('a genuinely stale static retreat segment still triggers route recovery',()=>{
 const state=deserialize(snapshot),animal=state.raid.animals.find(a=>a.id==='animal-10819'),
  destination={...animal.exit,id:`exit-${animal.id}`};
 animal.path=[{x:animal.x+1,z:animal.z}];
 animal.destinationId=destination.id;animal.pathVersion=1;
 animal.mobileRecoveryDestinationId=destination.id;
 animal.mobileRecoveryVersion=1;animal.mobileRecoveryAttempts=0;
 animal.mobileProgressAt=state.elapsed-13;
 animal.mobileProgressDistance=Math.hypot(animal.x-destination.x,animal.z-destination.z);
 const nav={version:1,segmentClear:()=>false};
 assert.equal(Game.walkTo(state,animal,destination,1,nav,
  {worker:false,expandRoute:true}),false);
 assert.equal(animal.path,null);
 assert.equal(animal.exitRouteRecovery?.destinationId,destination.id);
 assert(state.events.some(e=>e.type==='AnimalExitRouteRecovery'&&
  e.actorId===animal.id&&e.reason==='stale-static-connector'));
});

test('an exhausted exit search survives save/load and remains an audited retreat',()=>{
  const state=deserialize(snapshot),animal=state.raid.animals.find(a=>a.id==='animal-10819'),
    destination={...animal.exit,id:`exit-${animal.id}`},nav={version:1,
      walkable:()=>false,segmentClear:()=>false};
  animal.path=null;animal.hitsRemaining=0;
  animal.exitRouteRecovery={destinationId:destination.id,version:1,
    startedAt:state.elapsed-1};
  animal.exitConnectorSearch={key:JSON.stringify([1,animal.x,animal.z,
    destination.x,destination.z,animal.radius]),next:192,exhausted:true};
  const restored=deserialize(serialize(state)),retreat=restored.raid.animals.find(a=>a.id===animal.id);
  assert.equal(Game.walkTo(restored,retreat,destination,1,nav,
    {worker:false,expandRoute:true}),true);
  assert(restored.events.some(e=>e.type==='AnimalRetreatExitAbandoned'&&
    e.actorId===animal.id&&e.reason==='bounded-search-exhausted'&&
    e.hitsRemaining===0));
  assert.equal(retreat.x,animal.x);assert.equal(retreat.z,animal.z);
});
