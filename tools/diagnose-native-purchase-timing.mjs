// Observes existing scalar callbacks; never injects or overrides player actions.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parseNativeCampaignArgs,runNativeCampaignCase,nativeCampaignProvenance} from './run_native_campaign.mjs';
import {simulateNativeCampaign} from './native-campaign-runner.mjs';
const options=parseNativeCampaignArgs(process.argv.slice(2)),decisions=[];
const provenance=o=>{
 const p=nativeCampaignProvenance(o);
 p.sourceHashes['tools/diagnose-native-purchase-timing.mjs']=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
 return p;
};
const run=async o=>{
 try{return await simulateNativeCampaign({...o,onDecision:row=>{
  if(row.day>=6&&row.time<300)decisions.push(row);
 }});}finally{
  writeFileSync(resolve(options.out,'purchase-decisions.json'),JSON.stringify({scope:'Post-decision scalar telemetry for days six onward during daylight. Does not change strategy, reconstruct pre-decision cash, measure human activity or establish performance.',decisions},null,2)+'\n');
 }
};
const r=await runNativeCampaignCase(options,{run,provenance});
console.log(JSON.stringify(r.receipt));process.exitCode=r.exitCode;
