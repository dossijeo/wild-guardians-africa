import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {walkTo} from '../src/simulation/game.js';

const fixture=new URL('../docs/qa/retreat-recovery-episode/sabana712-v1-cheap-thorn-day34-partial-state.json.gz',import.meta.url);
const wasm=new WebAssembly.Module(readFileSync(new URL(
 '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

test('day-34 exhausted animal recovers a native route around a false direct connector',()=>{
 // This is the saved state from a real 60-night balance run stopped by an
 // unfinished raid. The balance candidate only changes thorn prices; this
 // test exercises the unchanged native geometry and continuous movement.
 const state=JSON.parse(gunzipSync(readFileSync(fixture)));
 const actor=state.raid.animals.find(a=>a.id==='animal-40506');
 assert(actor&&actor.status==='retreating'&&actor.hitsRemaining===0);
 const loaded=new Map();
 const session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const cx=Math.floor((actor.x+24)/48),cz=Math.floor((actor.z+24)/48);
  for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state),end=actor.exit;
  const destination={...end,id:`exit-${actor.id}`};
  const length=Math.hypot(end.x-actor.x,end.z-actor.z);
  const firstStep={x:actor.x+(end.x-actor.x)*.38/length,
   z:actor.z+(end.z-actor.z)*.38/length};
  assert(nav.segmentClear(actor,end,actor.radius,null,false));
  assert.equal(nav.walkable(firstStep.x,firstStep.z,actor.radius,null,false),false,
   'the direct connector has an invalid fractional landing');
  actor.path=null;actor.exitRouteRecovery.version=nav.version;
  actor.mobileRecoveryVersion=nav.version;actor.pathVersion=nav.version;
  let done=false,steps=0;
  for(;steps<100&&!done;steps++){
   const before={x:actor.x,z:actor.z};state.elapsed+=.1;
   done=walkTo(state,actor,destination,.1,nav,
    {speed:3.8,worker:false,expandRoute:true,routeVia:actor.spawn});
   assert(nav.segmentClear(before,actor,actor.radius,null,false),
    'the retreat must satisfy native static swept collision on every step');
  }
  assert(done,'the existing native route should reach the exit');
  assert.equal(Math.hypot(actor.x-end.x,actor.z-end.z),0);
  assert.equal(actor.exitRouteRecovery,undefined);
  assert(!state.events.some(e=>e.type==='AnimalRetreatExitAbandoned'&&
   e.actorId===actor.id));
 }finally{session.dispose();}
});
