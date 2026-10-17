import {simulateNativeCampaign} from '../native-campaign-runner.mjs';

const strategies=['good','no-walls'];
for(const strategy of strategies){
 const result=await simulateNativeCampaign({
  days:14,strategy,seed:712,biome:'sabana',culture:'mapungubwe',
  onDay:day=>console.log(JSON.stringify({type:'day',strategy,day:day.day,
   result:day.result,living:day.living,money:day.money,centerHp:day.centerHp,
   planted:day.planted,destroyed:day.destroyed,
   decisionMs:day.wallTime.decisionMs,gameTickMs:day.wallTime.gameTickMs}))
 });
 console.log(JSON.stringify({type:'final',strategy,result:result.result,
  completedNights:result.completedNights,money:result.money,
  maximumLiving:result.maximumLiving,
  wallOrders:result.nativeEvidence?.daily?.map(day=>({day:day.day,
   wallOrders:day.wallOrders,wallPieces:day.wallPieces})),counts:result.counts}));
}
