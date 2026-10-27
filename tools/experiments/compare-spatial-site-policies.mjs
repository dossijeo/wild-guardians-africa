import {performance} from 'node:perf_hooks';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {centerServicePoint} from '../../src/world/centers.js';

const days=Number(process.argv[2]??1);
if(!Number.isSafeInteger(days)||days<1||days>14)
  throw RangeError('Expected 1–14 nights');
const entryDriverFactory=nav=>({
  async advancePresentation(){if(nav.raidEntryFailure)throw Error(JSON.stringify(nav.raidEntryFailure));},
  async waitForEntry(){if(nav.raidEntryFailure)throw Error(JSON.stringify(nav.raidEntryFailure));},
  report(){return {mode:'same-session-native-entry'};},async dispose(){}
});
const rows=[];
for(const spatialAdvice of [false,true]){
 const started=performance.now();
 const result=await simulateNativeCampaign({days,seed:712,biome:'sabana',
  culture:'mapungubwe',strategy:'good',nativeEvidence:false,spatialAdvice,
  openingFactory:createSpatialCampaignOpening,entryDriverFactory,reloadRaids:false,
  onTick:(_state,nav)=>nav.serviceRaidConnectivityDemand?.()});
 const center=result.state.structures.find(item=>item.kind==='center');
 const plants=result.state.plants.filter(item=>item.alive);
 rows.push({spatialAdvice,seconds:(performance.now()-started)/1000,
  completedNights:result.completedNights,result:result.result,
  center:{x:center.x,z:center.z},
  servicePoint:centerServicePoint(center,result.state,.8),
  nativeSite:result.spatialSite,initializationMs:result.spatialAdviceInitMs,
  sync:result.spatialSync,
  days:result.daily.map(row=>({day:row.day,living:row.living,
   planted:row.planted,destroyed:row.destroyed,delivered:row.delivered,
   staff:row.staff,wages:row.wages,money:row.money,
   decisionMs:row.wallTime.decisionMs,tickMs:row.wallTime.gameTickMs})),
  meanCropDistance:plants.length?plants.reduce((sum,plant)=>sum+
   Math.hypot(plant.x-center.x,plant.z-center.z),0)/plants.length:null,
  cropQuadrants:plants.reduce((bins,plant)=>{
   const side=`${plant.x<center.x?'west':'east'}-${plant.z<center.z?'south':'north'}`;
   bins[side]=(bins[side]??0)+1;return bins;
  },{}),
  cropBounds:plants.length?plants.reduce((bounds,plant)=>[
   Math.min(bounds[0],plant.x),Math.min(bounds[1],plant.z),
   Math.max(bounds[2],plant.x),Math.max(bounds[3],plant.z)],
   [Infinity,Infinity,-Infinity,-Infinity]):null});
}
console.log(JSON.stringify(rows,null,2));
