import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {tick} from '../src/simulation/game.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const snapshot=gunzipSync(readFileSync(new URL(
  './fixtures/watering-gran-canon-saheliana-detour-10.json.gz',import.meta.url))).toString();

function simulate(candidatePolling){
  const state=deserialize(snapshot),loaded=new Map();
  const session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const village=state.villages[0],cx=Math.floor((village.x+24)/48),
      cz=Math.floor((village.z+24)/48);
    for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([(cx-4)*48-24,(cz-4)*48-24,
      (cx+4)*48+24,(cz+4)*48+24]);
    nav.forceTaskCandidatePoll=candidatePolling;
    let candidates=0,deferred=0,routes=0;
    nav.planningObserver=event=>{
      if(event.kind==='taskCandidate')candidates++;
      if(event.kind==='taskCandidateDeferred')deferred++;
    };
    const routeActor=session.routeActor;
    session.routeActor=(...args)=>{routes++;return routeActor(...args);};
    const hashes=[];
    for(let index=0;index<200&&!state.result;index++){
      tick(state,1,nav);
      hashes.push(createHash('sha256').update(serialize(state)).digest('hex'));
    }
    return {snapshot:serialize(state),hashes,candidates,deferred,routes};
  }finally{session.dispose();}
}

test('failed candidate routes wait for relevant changes without changing 200 ticks',()=>{
  const polling=simulate(true),waiting=simulate(false);
  assert.equal(waiting.snapshot,polling.snapshot);
  assert.deepEqual(waiting.hashes,polling.hashes,
    'a deferred candidate must preserve every observed gameplay tick');
  assert(waiting.candidates<polling.candidates/2,
    `candidate plans: ${polling.candidates} vs ${waiting.candidates}`);
  assert(waiting.routes<polling.routes/2,
    `native route requests: ${polling.routes} vs ${waiting.routes}`);
  assert(waiting.deferred>0);
});
