// Read-only timing of the unchanged virtual-player policy. No native advice is
// substituted here; the resulting profile is the A arm for spatial services.
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';

const days=Number(process.argv[2]??14);
const output=process.argv[3]??'.cache/spatial-player-decisions-baseline.json';
if(!Number.isSafeInteger(days)||days<1||days>100)throw Error('Invalid days');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const daily=[];
try{
 const result=await simulateNativeCampaign({days,seed:712,biome:'sabana',
  culture:'mapungubwe',strategy:'good',decisionProfile:true,nativeEvidence:false,
  onDay:row=>{
   const item={day:row.day,living:row.living,planted:row.planted,
    money:row.money,wallTime:row.wallTime,phases:row.decisionPhases};
   daily.push(item);console.log(JSON.stringify(item));
  }});
 const report={source,daysRequested:days,completedNights:result.completedNights,
  result:result.result,biome:result.biome,seed:result.seed,strategy:result.strategy,
  policy:result.policy,daily};
 mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
}catch(error){
 mkdirSync(dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify({source,daysRequested:days,daily,
  error:error.message,partialDay:error.nativeCampaignPartial?.day},null,2));
 throw error;
}
