import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

test('guardian metadata failure is diagnosed in the rejection without stopping the authority',async()=>{
 const opening=await createSpatialCampaignOpening({seed:712,biome:'manglares',culture:'suajili',slotId:'guardian-metadata-error'});
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const authority=createSimulationAuthority(module,serialize(opening.state),[...opening.loaded.keys()]);
 try{authority.setGuardianMetadataFailure('missing crop metadata (503)');
  const result=authority.execute({kind:'qaGuardianOrigin',sequence:1,epoch:'e',publication:{},camera:{},targetId:'target'});
  assert.equal(result.value,false);assert.match(result.rejection,/Guardian metadata unavailable: missing crop metadata \(503\)/);
  assert.equal(authority.execute({kind:'snapshot',sequence:2}).sequence,2);
 }finally{authority.dispose();opening.session.dispose();}
});
