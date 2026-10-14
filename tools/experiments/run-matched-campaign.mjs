import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

const [checkout,daysArg='7',biome='sabana',seedArg='712',strategy='good',out='docs/qa/hierarchical-navigation/matched-campaign.json']=process.argv.slice(2);
if(!checkout)throw Error('Usage: run-matched-campaign.mjs checkout days biome seed strategy output.json');
const days=Number(daysArg),seed=Number(seedArg);
if(!Number.isInteger(days)||days<1||days>100||!Number.isInteger(seed))throw Error('Invalid campaign parameters');
const output=resolve(out),checkoutPath=resolve(checkout);
process.chdir(checkoutPath);
const runner=pathToFileURL(resolve(checkoutPath,'tools/native-campaign-runner.mjs')).href;
const {simulateNativeCampaign}=await import(runner);
const started=performance.now(),rows=[];
mkdirSync(dirname(output),{recursive:true});
try{
  const result=await simulateNativeCampaign({days,biome,seed,strategy,culture:'mapungubwe',nativeEvidence:false,
    onDay:row=>{rows.push(row);console.log(JSON.stringify({day:row.day,elapsedSeconds:+((performance.now()-started)/1000).toFixed(2),money:row.money,living:row.livingPlants}));}});
  const report={status:'completed',checkout:checkoutPath,parameters:{days,biome,seed,strategy},
    elapsedSeconds:(performance.now()-started)/1000,completedNights:result.completedNights,result:result.result,rows};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,completedNights:report.completedNights,elapsedSeconds:report.elapsedSeconds}));
}catch(error){
  const report={status:'error',checkout:checkoutPath,parameters:{days,biome,seed,strategy},
    elapsedSeconds:(performance.now()-started)/1000,message:error.message,day:error.nativeCampaignPartial?.day,rows};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify(report));process.exitCode=1;
}
