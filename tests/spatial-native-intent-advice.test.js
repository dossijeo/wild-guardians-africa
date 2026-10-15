import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateNativeCampaign} from '../tools/native-campaign-runner.mjs';

test('one Wild Engine index serves persistent intentions and spatial advice',
 {skip:!process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM&&
   'Build and select the spatial-services WASM first'},async()=>{
  const {createSpatialCampaignOpening}=await import(
    '../tools/experiments/spatial-campaign-opening.mjs');
  const result=await simulateNativeCampaign({days:1,seed:712,biome:'sabana',
    culture:'mapungubwe',strategy:'good',nativeIntents:true,spatialAdvice:true,
    defensePolicy:'legacy',reloadRaids:false,nativeEvidence:false,
    openingFactory:createSpatialCampaignOpening,
    entryDriverFactory:()=>({
      async advancePresentation(){},async waitForEntry(){},
      report(){return {mode:'test'};},async dispose(){}
    })});
  assert.equal(result.completedNights,1);
  assert.equal(result.result,null);
  assert.equal(result.raidEvidence.status,'verified');
  assert.equal(result.raidEvidence.coverageLost,false);
  assert.deepEqual(result.raidEvidence.issues,[]);
  assert(result.spatialSite.found>0,'native planting advice selected legal sites');
  assert(result.spatialSync.events>0,'confirmed game events reached the shared index');
  assert(result.nativeIntent.nativePlanningCalls>0,
    'workers used persistent native task intentions');
});
