import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {serialize} from '../src/persistence/snapshots.js';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';

test('native authority timestamps resident terrain captures and checkpoints at its simulation boundary',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'sabana',culture:'suajili',slotId:'terrain-time'}),snapshot=serialize(opening.state),initial=opening.state.elapsed;
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),captures=[];
 const keys=[...opening.loaded.keys()],authority=createSimulationAuthority(module,snapshot,keys,{onTerrainChunk:(chunk,at)=>captures.push({cx:chunk.cx,cz:chunk.cz,at})});
 try{
  assert.ok(captures.length);assert.ok(captures.every(item=>item.at===initial));
  const later=authority.execute({kind:'advance',sequence:1,seconds:.1,nightFastForward:false});
  let x=0;while(keys.includes(`${x},0`))x++;authority.execute({kind:'addChunk',sequence:2,key:`${x},0`});assert.equal(captures.at(-1).at,later.elapsed);
  const checkpoint=authority.execute({kind:'snapshot',sequence:3,visualTerrain:true});
  assert.ok(checkpoint.terrainCheckpoint.chunks.length);assert.ok(checkpoint.terrainCheckpoint.chunks.every(item=>item.capturedAt===checkpoint.elapsed));
  const bootstrap=[];authority.publishResidentTerrainForQa((chunk,at)=>bootstrap.push(at));assert.ok(bootstrap.length);assert.ok(bootstrap.every(at=>at===checkpoint.elapsed));
 }finally{authority.dispose();opening.session.dispose();}
});
