import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {centerServicePoint} from '../src/world/centers.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from '../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import * as Game from '../src/simulation/game.js';

const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;
const load=()=>deserialize(gunzipSync(readFileSync(new URL(
 './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());

test('native planting advice reserves legal bidirectional sites and confirms paid planting',
 {skip:!module&&'Build and select the spatial-services WASM first'},async()=>{
 const game=load(),loaded=new Map(),session=createSpatialGameSession(module,game,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const jobs=new Map();
  for(let cz=-1;cz<=1;cz++)for(let cx=0;cx<=2;cx++)
   jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx-1,cz)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,game);
  const bridge=createSpatialIntentBridge(session);
  bridge.resetFromState(game);
  const center=game.structures.find(item=>item.kind==='center');
  let first;
  for(let i=0;i<100;i++){
   first=bridge.findPlantingSite(center.id,{budget:64});
   if(first.status!=='pending')break;
  }
  assert.equal(first.status,'found',JSON.stringify(first));
  assert(first.reservationId);
  assert.equal(nav.placement(first.point.x,first.point.z,.4).valid,true);
  assert(game.plants.filter(item=>item.alive).every(item=>
   Math.hypot(item.x-first.point.x,item.z-first.point.z)>=1.1));
  const service=centerServicePoint(center,game,.8);
  assert(nav.path(service,first.point,.28,null,true));
  assert(nav.path(first.point,service,.28,null,true));
  const second=bridge.findPlantingSite(center.id,{budget:64});
  assert.equal(second.status,'found',JSON.stringify(second));
  assert.notDeepEqual(second.point,first.point);
  assert.equal(bridge.releasePlantingSite(second.reservationId),true);
  assert.equal(Game.plant(game,'native-site-paid-mijo','mijo',
   first.point.x,first.point.z,nav),true);
  const planted=game.plants.at(-1);
  bridge.applyEvents(game,[{type:'target',entity:planted}]);
  assert.equal(bridge.releasePlantingSite(first.reservationId,{committed:true}),true);
  const third=bridge.findPlantingSite(center.id,{budget:64});
  assert.equal(third.status,'found',JSON.stringify(third));
  assert.notDeepEqual(third.point,first.point);
  assert.equal(bridge.releasePlantingSite(third.reservationId),true);
  planted.alive=false;
  bridge.applyCommittedEvents(game,[{type:'CropPicked',targetId:planted.id}]);
  const replanted=bridge.findPlantingSite(center.id,{budget:64});
  assert.equal(replanted.status,'found');
  assert.deepEqual(replanted.point,first.point,
   'a harvested crop frees its original site in the native occupancy index');
  assert.equal(bridge.releasePlantingSite(replanted.reservationId),true);
  const restored=deserialize(serialize(game));
  bridge.resetFromState(restored);
  const replay=bridge.findPlantingSite(center.id,{budget:64});
  assert.equal(replay.status,'found');
  bridge.resetFromState(restored);
  const repeated=bridge.findPlantingSite(center.id,{budget:64});
  assert.deepEqual(repeated.point,replay.point,
   'the same restored spatial state yields the same next legal site');
 }finally{session.dispose();}
});
