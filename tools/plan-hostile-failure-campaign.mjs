import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';import {isDeepStrictEqual} from 'node:util';
import {reviewedRecoveryOptions} from './run-reviewed-recovery-comparison.mjs';import {frozenPolicies} from './run-military-only-calibration.mjs';import {nativeCampaignProvenance} from './run_native_campaign.mjs';import {verifyHostileFailureSources} from './reviewed-hostile-failure-sources.mjs';
const root=new URL('../',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const shared=['tools/run-reviewed-recovery-comparison.mjs','tools/run-military-only-calibration.mjs','docs/qa/integrated-spiritual-survival/military-only-policy-freeze-v1.json'];
const metadata=['tools/plan-hostile-failure-campaign.mjs','tools/reviewed-hostile-failure-sources.mjs','docs/qa/hostile-approach-cache/campaign-source-review.json.gz'];
export function hostileFailureOptions(profile,input){const options=reviewedRecoveryOptions(profile,input);return {...options,'stop-file':resolve(options.out,'stop-requested')};}
export function hostileFailureProvenance(options){
 const playerProfile=Object.keys(frozenPolicies.profiles).find(p=>isDeepStrictEqual(options,hostileFailureOptions(p,{seed:options.seed,biome:options.biome,culture:options.culture,out:options.out})));
 if(!playerProfile)throw Error('Options differ from frozen player profiles');
 const source=nativeCampaignProvenance(options);if(source.trackedChanges.length)throw Error('Freeze tracked sources before planning');
 for(const p of shared)source.sourceHashes[p]=hash(readFileSync(new URL(p,root)));
 const classification=verifyHostileFailureSources(source.sourceHashes);
 for(const p of metadata)source.sourceHashes[p]=hash(readFileSync(new URL(p,root)));
 return {...source,comparison:{...classification,playerProfile,policyFreeze:frozenPolicies.id,scope:'Planning only: native full-tick baseline equality and performance qualification pending. This tool cannot launch a campaign.'}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [mode,profile,seed,biome,culture,out,...extra]=process.argv.slice(2);if(mode!=='--plan'||extra.length)throw Error('Only --plan good|normal|bad SEED BIOME CULTURE NEW_OUT is allowed');const options=hostileFailureOptions(profile,{seed:Number(seed),biome,culture,out});console.log(JSON.stringify({profile,options,source:hostileFailureProvenance(options)},null,2));}catch(error){console.error(error.stack);process.exitCode=1;}
}
