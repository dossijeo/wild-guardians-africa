import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {frozenMilitaryOptions,frozenPolicies} from './run-military-only-calibration.mjs';
import {nativeCampaignProvenance,runNativeCampaignCase} from './run_native_campaign.mjs';
const root=new URL('../',import.meta.url);
const reviewPath='docs/qa/integrated-spiritual-survival/recovery-integration-source-review/source-review.json.gz';
const reviewBytes=readFileSync(new URL(reviewPath,root));
const review=JSON.parse(gunzipSync(reviewBytes));
const military=['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js','src/simulation/raid-pressure-plan.js'].sort();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyReviewedRecoverySources(actual){
 const expected=review.current.sourceHashes;
 if(JSON.stringify(Object.keys(actual).sort())!==JSON.stringify(Object.keys(expected).sort()))throw Error('Reviewed dependency inventory differs');
 const changed=Object.keys(expected).filter(path=>actual[path]!==expected[path]).sort();
 if(!changed.length)return {arm:'recovery',militaryCandidate:4,changed};
 if(JSON.stringify(changed)!==JSON.stringify(military))throw Error('Unreviewed runtime differences: '+changed.join(', '));
 for(const path of military)if(actual[path]!==review.changed.find(row=>row.path===path).before)throw Error('Unreviewed military recipe: '+path);
 return {arm:'reference',militaryCandidate:3,changed};
}
export function reviewedRecoveryOptions(profile,input){
 if(JSON.stringify(frozenPolicies)!==JSON.stringify(review.frozenPolicies))throw Error('Frozen player policies changed');
 const options=frozenMilitaryOptions(profile,input);
 // This changes certification cost only, not a player choice or game rule.
 return {...options,gateAnimationInvariant:true};
}
export function reviewedRecoveryProvenance(options){
 const playerProfile=Object.keys(frozenPolicies.profiles).find(profile=>isDeepStrictEqual(options,reviewedRecoveryOptions(profile,{seed:options.seed,biome:options.biome,culture:options.culture,out:options.out})));
 if(!playerProfile)throw Error('Comparison options differ from frozen player profiles');
 const p=nativeCampaignProvenance(options),arm=verifyReviewedRecoverySources(p.sourceHashes);
 if(options.gateAnimationInvariant!==true||options.perimeterQa!=='stable-plan-v5')throw Error('Reviewed comparison requires explicit gate-invariant QA');
 for(const path of ['tools/run-reviewed-recovery-comparison.mjs','tools/run-military-only-calibration.mjs','docs/qa/integrated-spiritual-survival/military-only-policy-freeze-v1.json'])p.sourceHashes[path]=hash(readFileSync(new URL(path,root)));
 return {...p,comparison:{...arm,playerProfile,reviewSha256:hash(reviewBytes),policyFreeze:frozenPolicies.id,scope:'Corrected runtime shared by both arms; candidate quantity is the only military difference. Historical runtime comparisons remain separately classified.'}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [mode,profile,seed,biome,culture,out,...extra]=process.argv.slice(2);
  if(!['--plan','--run'].includes(mode)||extra.length)throw Error('Use --plan|--run good|normal|bad SEED BIOME CULTURE NEW_OUT');
  const options=reviewedRecoveryOptions(profile,{seed:Number(seed),biome,culture,out});
  if(mode==='--plan')console.log(JSON.stringify({profile,options,source:reviewedRecoveryProvenance(options)},null,2));
  else {const result=await runNativeCampaignCase(options,{provenance:reviewedRecoveryProvenance});console.log(JSON.stringify(result.receipt));process.exitCode=result.exitCode;}
 }catch(error){console.error(error.stack);process.exitCode=1;}
}
