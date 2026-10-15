// Replays one native matched arm with QA-only enclosure sampling at raid/topology events.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {evaluateOne} from './run-ga.mjs';
import {DEFAULT_GENES} from './policy-genes.mjs';
import {EnclosureBalanceObserver} from '../experiments/enclosure-balance-observer.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const physicalRows=rows=>rows.map(({wallTime,...rest})=>rest);
export async function replayObserved({configPath,strategy,baselinePath,outputPath}){
 const input=JSON.parse(readFileSync(resolve(configPath),'utf8'));
 const config=input.config??input;
 const original=readFileSync(resolve(baselinePath));
 const baseline=JSON.parse(gunzipSync(original));
 const observer=new EnclosureBalanceObserver();
 const report=await evaluateOne({biome:config.biome,seed:config.seed},config.days,strategy,
  config.genes??DEFAULT_GENES,undefined,true,(state,nav)=>observer.observe(state,nav));
 const checks={
  status:report.status===baseline.status,
  result:report.result===baseline.result,
  completedNights:report.completedNights===baseline.completedNights,
  physicalRows:JSON.stringify(physicalRows(report.rows??[]))===JSON.stringify(physicalRows(baseline.rows??[])),
  raids:JSON.stringify(report.raid)===JSON.stringify(baseline.raid),
  financeReconciled:report.rows?.every(row=>row.reconciled)??false
 };
 const result={sourceHash:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  baselineArchiveSha256:sha(original),strategy,biome:config.biome,seed:config.seed,
  checks,observer:observer.report(),
  replay:{status:report.status,result:report.result,completedNights:report.completedNights,
   finalCash:report.rows?.at(-1)?.money??null,finalLiving:report.rows?.at(-1)?.living??null}};
 writeFileSync(resolve(outputPath),JSON.stringify(result,null,2)+'\n');
 if(Object.values(checks).some(value=>!value))throw Error(`Observed replay differs from baseline: ${JSON.stringify(checks)}`);
 return result;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/observe-matched-defense.mjs')){
 const [configPath,strategy,baselinePath,outputPath]=process.argv.slice(2);
 if(!outputPath)throw Error('Usage: node observe-matched-defense.mjs <config> <strategy> <baseline.gz> <output.json>');
 replayObserved({configPath,strategy,baselinePath,outputPath}).then(x=>
  console.log(JSON.stringify({checks:x.checks,samples:x.observer.counters.samples})),e=>{console.error(e);process.exitCode=1;});
}
