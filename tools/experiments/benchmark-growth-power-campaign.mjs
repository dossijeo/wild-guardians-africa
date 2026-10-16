import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';

const [checkoutArg,daysArg='10',biome='sabana',seedArg='712',outArg]=process.argv.slice(2);
if(!checkoutArg||!outArg)throw Error('Usage: benchmark-growth-power-campaign.mjs CHECKOUT DAYS BIOME SEED REPORT.json');
const checkout=resolve(checkoutArg),days=Number(daysArg),seed=Number(seedArg),out=resolve(outArg);
if(!Number.isSafeInteger(days)||days<1||days>100||!Number.isSafeInteger(seed))
  throw RangeError('Invalid campaign arguments');
const hash=data=>createHash('sha256').update(data).digest('hex');
const source=execFileSync('git',['rev-parse','HEAD'],{cwd:checkout,encoding:'utf8'}).trim();
const powerSource=hash(readFileSync(resolve(checkout,'src/simulation/agricultural-power.js')));
const wasm=hash(readFileSync(resolve(checkout,'src/world/hierarchical-wasm/spatial-savanna.wasm')));
const {simulateNativeCampaign}=await import(pathToFileURL(resolve(checkout,'tools/native-campaign-runner.mjs')));
const {serialize}=await import(pathToFileURL(resolve(checkout,'src/persistence/snapshots.js')));
const started=performance.now(),rows=[];
mkdirSync(dirname(out),{recursive:true});
try{
  const result=await simulateNativeCampaign({days,biome,seed,strategy:'good',culture:'mapungubwe',nativeEvidence:false,
    onDay:row=>{rows.push(row);console.log(JSON.stringify({day:row.day,
      elapsedSeconds:+((performance.now()-started)/1000).toFixed(2),
      money:row.money,living:row.living}));}});
  const report={status:'completed',source,powerSource,wasm,parameters:{days,biome,seed,strategy:'good'},
    elapsedSeconds:(performance.now()-started)/1000,completedNights:result.completedNights,
    result:result.result,finalStateSha256:hash(serialize(result.state)),
    gameTickMs:rows.reduce((sum,row)=>sum+row.wallTime.gameTickMs,0),rows};
  writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,completedNights:report.completedNights,
    elapsedSeconds:report.elapsedSeconds,finalStateSha256:report.finalStateSha256}));
}catch(error){
  const report={status:'error',source,powerSource,wasm,parameters:{days,biome,seed,strategy:'good'},
    elapsedSeconds:(performance.now()-started)/1000,message:error.message,
    day:error.nativeCampaignPartial?.day,rows};
  writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify({status:'error',message:error.message,day:report.day}));
  process.exitCode=1;
}
