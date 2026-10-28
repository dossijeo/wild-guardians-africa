import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {wallsContiguous} from '../src/simulation/blessed-walls.js';
import * as Game from '../src/simulation/game.js';

const snapshot=JSON.parse(gunzipSync(readFileSync(new URL(
  './fixtures/raid-desert-983/day6-defended.json.gz',import.meta.url))));
const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function replay(blessedId=null){
  const state=deserialize(JSON.stringify(snapshot.state));
  if(blessedId){
    // Prescribed QA charge, before restoring the actual saved combat clock.
    const {time,raid}=state;state.time=0;state.raid=null;awakeningState(state).progress=100;
    Game.bless(state,'native-wall-qa',blessedId);state.time=time;state.raid=raid;
  }
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const hits=[],stop=Game.observeGameEvents(state,e=>{if(e.type==='StructureHit')hits.push(e);});
  try{
    const bounds=snapshot.activeBounds,chunk=x=>Math.floor((x+24)/48);
    for(let z=chunk(bounds[1]);z<=chunk(bounds[3]);z++)for(let x=chunk(bounds[0]);x<=chunk(bounds[2]);x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);nav.raidView=snapshot.raidView;
    for(let i=0;i<40;i++)Game.tick(state,1,nav);
    assert.doesNotThrow(()=>serialize(state));
    return {hits,state};
  }finally{stop();session.dispose();}
}
test('real Wild Engine contact preserves target selection and applies own/adjacent wall protection to the actual attack',()=>{
  const baseline=replay(),first=baseline.hits[0];assert.ok(first?.structureHit?.kind==='wall');
  const original=snapshot.state.structures.find(w=>w.id===first.targetId);
  const adjacent=snapshot.state.structures.find(w=>wallsContiguous(original,w));assert.ok(adjacent);
  const own=replay(original.id),near=replay(adjacent.id);
  for(const [result,factor] of [[own,.75],[near,.9]]){
    const observed=result.hits[0];assert.equal(observed.targetId,first.targetId);
    const damage=h=>h.structureHit.previousHp-h.structureHit.hp;
    assert.ok(Math.abs(damage(observed)-damage(first)*factor)<1e-8);
    assert.deepEqual(result.state.structures.map(w=>[w.id,w.x,w.z,w.yaw,w.gate,w.material,w.baseScaleX]),
      snapshot.state.structures.map(w=>[w.id,w.x,w.z,w.yaw,w.gate,w.material,w.baseScaleX]));
  }
});
