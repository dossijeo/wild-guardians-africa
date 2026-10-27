import {createHash} from 'node:crypto';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {serialize} from '../../src/persistence/snapshots.js';

const days=Number(process.argv[2]??14),seed=Number(process.argv[3]??712);
const result=await simulateNativeCampaign({days,seed,strategy:'good',
  biome:'sabana',culture:'mapungubwe',slotId:`native-good-${seed}`,
  openingFactory:createSpatialCampaignOpening,spatialAdvice:true,
  nativeIntents:true,nativeWallPlans:true,reloadRaids:false});
console.log(JSON.stringify({days,seed,completedNights:result.completedNights,
  result:result.result,money:result.money,
  living:result.daily.at(-1)?.living,delivered:result.counts.CrateDelivered,
  recoveries:result.counts.ActorMobileCollisionRecovery,
  gameTickMs:result.daily.reduce((total,day)=>total+(day.wallTime?.gameTickMs??0),0),
  stateSha256:createHash('sha256').update(serialize(result.state)).digest('hex')}));
