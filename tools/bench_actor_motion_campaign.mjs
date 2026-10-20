// Run on both revisions in alternating order; this is an opt-in campaign
// benchmark, not part of the regular test suite.
import {createHash} from 'node:crypto';
import {serialize} from '../src/persistence/snapshots.js';
import {simulateNativeCampaign} from './native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './experiments/spatial-campaign-opening.mjs';

const result=await simulateNativeCampaign({
  days:8,strategy:'good',seed:712,biome:'sabana',culture:'mapungubwe',
  slotId:'native-good-712',openingFactory:createSpatialCampaignOpening,
  spatialAdvice:true,nativeIntents:true,nativeWallPlans:true,reloadRaids:false
});
console.log(JSON.stringify({
  completedNights:result.completedNights,
  result:result.result,money:result.money,living:result.daily.at(-1)?.living,
  stateSha256:createHash('sha256').update(serialize(result.state)).digest('hex'),
  rng:result.state.rng,
  gameTickMs:result.daily.reduce((sum,day)=>sum+day.wallTime.gameTickMs,0)
}));
