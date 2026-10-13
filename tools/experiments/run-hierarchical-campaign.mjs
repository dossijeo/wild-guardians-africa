import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';

const [daysArg='14',biome='sabana',seedArg='712',strategy='good',out='docs/qa/hierarchical-navigation/campaign.json']=process.argv.slice(2);
const days=Number(daysArg),seed=Number(seedArg),started=performance.now(),rows=[];
if(!Number.isInteger(days)||days<1||days>100||!Number.isInteger(seed))throw Error('Invalid campaign parameters');
const path=resolve(out);mkdirSync(resolve(path,'..'),{recursive:true});
try{
  const result=await simulateNativeCampaign({days,biome,seed,strategy,culture:'mapungubwe',nativeEvidence:false,
    onDay:row=>{rows.push(row);console.log(JSON.stringify({day:row.day,elapsedSeconds:+((performance.now()-started)/1000).toFixed(2),money:row.money,living:row.livingPlants}));}});
  const report={status:'completed',parameters:{days,biome,seed,strategy},elapsedSeconds:(performance.now()-started)/1000,completedNights:result.completedNights,result:result.result,rows};
  writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,completedNights:report.completedNights,elapsedSeconds:report.elapsedSeconds}));
}catch(error){
  const report={status:'error',parameters:{days,biome,seed,strategy},elapsedSeconds:(performance.now()-started)/1000,message:error.message,day:error.nativeCampaignPartial?.day,rows};
  writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;
}
