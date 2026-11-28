import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

test('raid camera focus is validated and persisted by the authority',async()=>{
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const opening=await createSpatialCampaignOpening({seed:716,biome:'sabana',culture:'suajili',slotId:'camera-authority'});
 opening.state.time=400;opening.state.elapsed=400;opening.state.initialPreparation=false;opening.state.nightPlan={at:400,done:false,group:['warthog']};
 const authority=createSimulationAuthority(module,serialize(opening.state),[...opening.loaded.keys()]);let sequence=0;
 try{
  let raid;for(let i=0;i<25&&!raid?.animals?.length;i++){const result=authority.execute({kind:'advance',sequence:++sequence,seconds:.05,nightFastForward:true});raid=JSON.parse(result.snapshot).raid;}
  assert.ok(raid?.animals?.length);const animalId=raid.animals[0].id;
  const stale=authority.execute({kind:'raidCameraFocus',sequence:++sequence,raidId:'stale',animalId});assert.equal(stale.value,false);assert.equal(JSON.parse(stale.snapshot).raid.cameraFocusedAnimalId,undefined);
  const confirmed=authority.execute({kind:'raidCameraFocus',sequence:++sequence,raidId:raid.id,animalId});assert.equal(confirmed.value,true);assert.equal(JSON.parse(confirmed.snapshot).raid.cameraFocusedAnimalId,animalId);
  const save=authority.execute({kind:'snapshot',sequence:++sequence});assert.equal(JSON.parse(save.snapshot).raid.cameraFocusedAnimalId,animalId);
 }finally{authority.dispose();opening.session.dispose();}
});
