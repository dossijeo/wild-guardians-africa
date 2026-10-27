import {writeFileSync} from 'node:fs';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [biome='gran-canon',daysText='7',seedText='712',output]=process.argv.slice(2);
const days=Number(daysText),seed=Number(seedText);
if(!Number.isInteger(days)||days<1||days>100||!Number.isInteger(seed))
  throw TypeError('Usage: run-topological-defense-campaign.mjs BIOME DAYS SEED [OUTPUT]');
const started=performance.now();
const report=await simulateNativeCampaign({days,seed,biome,
  strategy:'good',culture:'mapungubwe',defend:true,
  defensePolicy:'topological',spatialAdvice:true,decisionProfile:true,
  nativeIntents:true,nativeWallPlans:true,reloadRaids:false,
  openingFactory:createSpatialCampaignOpening,
  onDay:row=>console.log(JSON.stringify({day:row.day,living:row.living,
    money:row.money,destroyed:row.destroyed,
    decisionMs:row.wallTime.decisionMs,gameTickMs:row.wallTime.gameTickMs}))});
const {state,nav,...summary}=report;
const result={biome,days,seed,elapsedMs:performance.now()-started,
  completedNights:report.completedNights,result:report.result,
  defense:report.defense,rows:report.rows,raidEvidence:report.raidEvidence};
if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({completedNights:result.completedNights,
  result:result.result,elapsedMs:result.elapsedMs,
  paidPieces:result.defense?.paidPieces,
  decisions:result.defense?.history?.length}));
