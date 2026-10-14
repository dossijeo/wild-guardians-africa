import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {installSparseWasmCampaignHook} from './sparse-wasm-campaign-hook.mjs';

const [daysArg='14',biome='sabana',seedArg='712',strategy='good',out='docs/qa/hierarchical-navigation/campaign.json',probeArg='']=process.argv.slice(2);
const days=Number(daysArg),seed=Number(seedArg),started=performance.now(),rows=[],navigationByDay=[];
if(!Number.isInteger(days)||days<1||days>100||!Number.isInteger(seed))throw Error('Invalid campaign parameters');
const path=resolve(out);mkdirSync(resolve(path,'..'),{recursive:true});
const hook=probeArg==='--wasm-probe'?
  installSparseWasmCampaignHook(new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/lazy-sectors.wasm'))):null;
try{
  const result=await simulateNativeCampaign({days,biome,seed,strategy,culture:'mapungubwe',nativeEvidence:false,
    onDay:row=>{rows.push(row);if(hook)navigationByDay.push({day:row.day,...hook.metrics()});
      console.log(JSON.stringify({day:row.day,elapsedSeconds:+((performance.now()-started)/1000).toFixed(2),money:row.money,living:row.livingPlants}));}});
  const report={status:'completed',parameters:{days,biome,seed,strategy,wasmProbe:!!hook},elapsedSeconds:(performance.now()-started)/1000,completedNights:result.completedNights,result:result.result,rows,navigationProbe:hook?.metrics(),navigationByDay};
  writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,completedNights:report.completedNights,elapsedSeconds:report.elapsedSeconds}));
}catch(error){
  const report={status:'error',parameters:{days,biome,seed,strategy,wasmProbe:!!hook},elapsedSeconds:(performance.now()-started)/1000,message:error.message,day:error.nativeCampaignPartial?.day,rows,navigationProbe:hook?.metrics(),navigationByDay};
  writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;
}
