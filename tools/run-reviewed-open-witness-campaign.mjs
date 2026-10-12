import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {reviewedRecoveryOptions} from './run-reviewed-recovery-comparison.mjs';
import {frozenPolicies} from './run-military-only-calibration.mjs';
import {nativeCampaignProvenance,runNativeCampaignCase} from './run_native_campaign.mjs';
import {verifyOpenWitnessSources} from './reviewed-open-witness-sources.mjs';
const root=new URL('../',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const shared=['tools/run-reviewed-recovery-comparison.mjs','tools/run-military-only-calibration.mjs','docs/qa/integrated-spiritual-survival/military-only-policy-freeze-v1.json'];
const metadata=['tools/run-reviewed-open-witness-campaign.mjs','tools/reviewed-open-witness-sources.mjs','docs/qa/static-open-route-cache/campaign-source-review.json.gz'];
export function openWitnessCampaignOptions(profile,input){
 const options=reviewedRecoveryOptions(profile,input);
 // An explicit, case-local cooperative stop remains available for technical
 // failure or disproportionate computation; no economic early-stop threshold.
 return {...options,'stop-file':resolve(options.out,'stop-requested')};
}
export function openWitnessCampaignProvenance(options){
 const playerProfile=Object.keys(frozenPolicies.profiles).find(profile=>isDeepStrictEqual(options,openWitnessCampaignOptions(profile,{seed:options.seed,biome:options.biome,culture:options.culture,out:options.out})));
 if(!playerProfile)throw Error('Loss-pressure options differ from frozen player profiles');
 const source=nativeCampaignProvenance(options);
 if(source.trackedChanges.length)throw Error('Freeze tracked sources before loss-pressure planning or launch');
 for(const p of shared)source.sourceHashes[p]=hash(readFileSync(new URL(p,root)));
 const classification=verifyOpenWitnessSources(source.sourceHashes);
 for(const p of metadata)source.sourceHashes[p]=hash(readFileSync(new URL(p,root)));
 return {...source,comparison:{...classification,playerProfile,policyFreeze:frozenPolicies.id,reviewSha256:source.sourceHashes[metadata[2]],scope:'Frozen 100-night policies and economics; Same candidate5/candidate4 military recipes; shared open-route QA cache and repaired retreat/worker/watering runtime. No survival acceptance inferred from source verification.'}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [mode,profile,seed,biome,culture,out,...extra]=process.argv.slice(2);
  if(!['--plan','--run'].includes(mode)||extra.length)throw Error('Use --plan|--run good|normal|bad SEED BIOME CULTURE NEW_OUT');
  const options=openWitnessCampaignOptions(profile,{seed:Number(seed),biome,culture,out});
  if(mode==='--plan')console.log(JSON.stringify({profile,options,source:openWitnessCampaignProvenance(options)},null,2));
  else {const result=await runNativeCampaignCase(options,{provenance:openWitnessCampaignProvenance});console.log(JSON.stringify({exitCode:result.exitCode,status:result.receipt.status,result:result.receipt.result,completedNights:result.receipt.completedNights,completedDailyRows:result.receipt.completedDailyRows,finishedAt:result.receipt.finishedAt}));process.exitCode=result.exitCode;}
 }catch(error){console.error(error.stack);process.exitCode=1;}
}
