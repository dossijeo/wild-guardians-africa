import {simulateNativeCampaign} from '../native-campaign-runner.mjs';

const days=process.argv[2]===undefined?14:Number(process.argv[2]);
const allowed=['good','no-walls'];
const selected=process.argv[3];
const continuous=process.argv[4]==='--continuous';
if(!Number.isSafeInteger(days)||days<1||days>180||
 (selected&&!allowed.includes(selected))||
 (process.argv[4]!==undefined&&!continuous)||process.argv.length>5)
 throw new Error('Usage: node compare-active-farm-14-nights.mjs [days] [good|no-walls] [--continuous]');
const strategies=selected?[selected]:allowed;
for(const strategy of strategies){
 const result=await simulateNativeCampaign({
  days,strategy,seed:712,biome:'sabana',culture:'mapungubwe',
  reloadRaids:!continuous,
  onDay:day=>console.log(JSON.stringify({type:'day',strategy,day:day.day,
   result:day.result,living:day.living,money:day.money,centerHp:day.centerHp,
   planted:day.planted,destroyed:day.destroyed,
   decisionMs:day.wallTime.decisionMs,gameTickMs:day.wallTime.gameTickMs,
   ...(continuous?{mode:'continuous'}:{})}))
 });
 console.log(JSON.stringify({type:'final',strategy,result:result.result,
  completedNights:result.completedNights,money:result.money,
  ...(continuous?{mode:'continuous',reloads:result.reloads}:{}),
  maximumLiving:result.maximumLiving,
  wallOrders:result.nativeEvidence?.daily?.map(day=>({day:day.day,
   wallOrders:day.wallOrders,wallPieces:day.wallPieces})),counts:result.counts}));
}
