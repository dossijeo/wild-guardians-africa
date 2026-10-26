import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {placeStructure} from '../src/simulation/game.js';
import {transact,rational} from '../src/simulation/money.js';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
test('reloading an expanded estuary preserves the channels between village and remote center',async()=>{
 const opening=await createSpatialCampaignOpening({seed:37,biome:'manglares',mangroveNetwork:true});let restored;
 try{
  const {state,nav,session}=opening,wanted=new Map();for(let z=-2;z<=2;z++)for(let x=-1;x<=4;x++)wanted.set(`${x},${z}`,{cx:x,cz:z,score:0});session.stream.plan(wanted);await session.stream.whenIdle();
  transact(state.ledger,'qa-funds',rational(1000));assert(placeStructure(state,'expansion',{x:124,z:0,yaw:0},nav));
  const probes=[];for(let z=-24;z<=24;z+=2)for(let x=48;x<=144;x+=2)probes.push({x,z,height:nav.field.surface(x,z),water:nav.field.waterInfo(x,z).inside});
  assert(probes.some(p=>p.water),'Fixture must include channels');
  const loaded=new Map();restored=createSpatialGameSession(module,deserialize(serialize(state)),{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)});restored.stream.plan(wanted);await restored.stream.whenIdle();
  for(const p of probes){assert.equal(restored.field.waterInfo(p.x,p.z).inside,p.water,`water changed at ${p.x},${p.z}`);assert(Math.abs(restored.field.surface(p.x,p.z)-p.height)<1e-5,`height changed at ${p.x},${p.z}`);}
 }finally{restored?.dispose();opening.dispose();}
});
