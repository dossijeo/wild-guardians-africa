import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {reviewedRecoveryOptions} from './run-reviewed-recovery-comparison.mjs';
import {frozenPolicies} from './run-military-only-calibration.mjs';
import {nativeCampaignProvenance,runNativeCampaignCase} from './run_native_campaign.mjs';
import {verifyRecoveryPerfSources} from './reviewed-recovery-perf-sources.mjs';
const root=new URL('../',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const sharedMetadata=['tools/run-reviewed-recovery-comparison.mjs','tools/run-military-only-calibration.mjs','docs/qa/integrated-spiritual-survival/military-only-policy-freeze-v1.json'];
const familyMetadata=['tools/run-reviewed-recovery-perf-comparison.mjs','tools/reviewed-recovery-perf-sources.mjs','docs/qa/integrated-spiritual-survival/recovery-perf-preparation/complete-source.json.gz','docs/qa/integrated-spiritual-survival/recovery-integration-source-review/source-review.json.gz'];
export function recoveryPerfComparisonOptions(profile,input){return reviewedRecoveryOptions(profile,input);}
export function recoveryPerfComparisonProvenance(options){
 const playerProfile=Object.keys(frozenPolicies.profiles).find(profile=>isDeepStrictEqual(options,recoveryPerfComparisonOptions(profile,{seed:options.seed,biome:options.biome,culture:options.culture,out:options.out})));
 if(!playerProfile)throw Error('Recovery perf options differ from frozen player profiles');
 const p=nativeCampaignProvenance(options);
 if(p.trackedChanges.length)throw Error('Freeze tracked sources before recovery perf planning or launch');
 for(const path of sharedMetadata)p.sourceHashes[path]=hash(readFileSync(new URL(path,root)));
 const classification=verifyRecoveryPerfSources(p.sourceHashes);
 for(const path of familyMetadata)p.sourceHashes[path]=hash(readFileSync(new URL(path,root)));
 return {...p,comparison:{...classification,playerProfile,policyFreeze:frozenPolicies.id,
  completeSourceManifestSha256:p.sourceHashes[familyMetadata[2]],originalReviewSha256:p.sourceHashes[familyMetadata[3]],
  scope:'New technical runtime family, separate from original campaigns; matched arms share worker/watering changes and differ only in three military files. Source verification does not certify performance or campaign completion.'}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [mode,profile,seed,biome,culture,out,...extra]=process.argv.slice(2);
  if(!['--plan','--run'].includes(mode)||extra.length)throw Error('Use --plan|--run good|normal|bad SEED BIOME CULTURE NEW_OUT');
  const options=recoveryPerfComparisonOptions(profile,{seed:Number(seed),biome,culture,out});
  if(mode==='--plan')console.log(JSON.stringify({profile,options,source:recoveryPerfComparisonProvenance(options)},null,2));
  else {const result=await runNativeCampaignCase(options,{provenance:recoveryPerfComparisonProvenance});console.log(JSON.stringify(result.receipt));process.exitCode=result.exitCode;}
 }catch(error){console.error(error.stack);process.exitCode=1;}
}
