import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {simulateNativeCampaign} from './native-campaign-runner.mjs';
import {runNativeCampaignCase,calibrationStop} from './run_native_campaign.mjs';
import {recoveryPerfComparisonOptions,recoveryPerfComparisonProvenance} from './run-reviewed-recovery-perf-comparison.mjs';
export function technicalWindowRun(nativeRun,nights){
 if(!Number.isSafeInteger(nights)||nights<1||nights>21)throw Error('Technical window must be 1..21 completed nights');
 return options=>nativeRun({...options,onDay:row=>{
  options.onDay?.(row);
  if(row.day>=nights)throw calibrationStop('Technical observation window completed; not native defeat or victory');
 }});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [profile,seed,biome,culture,out,limit='7',...extra]=process.argv.slice(2);
  if(extra.length)throw Error('Use good|normal|bad SEED BIOME CULTURE NEW_OUT [1..21 nights]');
  const nights=Number(limit),run=technicalWindowRun(simulateNativeCampaign,nights);
  const options=recoveryPerfComparisonOptions(profile,{seed:Number(seed),biome,culture,out});
  const provenance=options=>{
   const p=recoveryPerfComparisonProvenance(options),path='tools/check-recovery-perf-native-window.mjs';
   p.sourceHashes[path]=createHash('sha256').update(readFileSync(new URL('./check-recovery-perf-native-window.mjs',import.meta.url))).digest('hex');
   return {...p,technicalWindow:{nights,configuredCampaignDays:options.days,countsAsFullCampaign:false,scope:'Observer stop after completed native day; player policy and configured horizon unchanged'}};
  };
  const at=performance.now(),result=await runNativeCampaignCase(options,{run,provenance});
  const summary={observedAt:new Date().toISOString(),wallMilliseconds:performance.now()-at,requestedObservationNights:nights,configuredCampaignDays:options.days,countsAsFullCampaign:false,receipt:result.receipt};
  writeFileSync(join(options.out,'technical-window.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify(summary));process.exitCode=result.exitCode===3?0:result.exitCode;
 }catch(error){console.error(error.stack);process.exitCode=1;}
}
