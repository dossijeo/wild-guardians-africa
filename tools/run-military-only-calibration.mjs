import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runNativeCampaignCase,nativeCampaignProvenance} from './run_native_campaign.mjs';

const root=new URL('../',import.meta.url);
const manifestPath='docs/qa/integrated-spiritual-survival/military-only-policy-freeze-v1.json';
export const frozenPolicies=JSON.parse(readFileSync(new URL(manifestPath,root),'utf8'));
export function frozenMilitaryOptions(profile,{seed,biome,culture,out}={}){
 if(!Object.hasOwn(frozenPolicies.profiles,profile))throw Error('Unknown frozen profile');
 if(!Number.isSafeInteger(seed)||seed<0||!biome||!culture||!out)throw Error('Explicit seed, biome, culture and new output directory required');
 return {...frozenPolicies.common,...frozenPolicies.profiles[profile],seed,biome,culture,out:resolve(out)};
}
export function frozenMilitaryProvenance(options){
 const p=nativeCampaignProvenance(options);
 const original=JSON.parse(readFileSync(new URL('docs/qa/integrated-spiritual-survival/'+frozenPolicies.baselineCampaign+'/source.json',root),'utf8'));
 const differences=Object.entries(original.sourceHashes).filter(([path,hash])=>p.sourceHashes[path]!==hash).map(([path])=>path);
 // Later candidates need a separate explicit military-only diff review. This
 // baseline launcher deliberately rejects every alteration to frozen sources.
 if(differences.length)throw Error('Frozen baseline source differs: '+differences.join(', '));
 for(const path of [manifestPath,'tools/run-military-only-calibration.mjs'])p.sourceHashes[path]=createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex');
 return {...p,policyFreeze:frozenPolicies.id,baselineSourceVerified:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [mode,profile,seed,biome,culture,out,...extra]=process.argv.slice(2);
  if(!['--plan','--run'].includes(mode)||extra.length)throw Error('Use --plan|--run good|normal|bad SEED BIOME CULTURE OUT');
  const options=frozenMilitaryOptions(profile,{seed:Number(seed),biome,culture,out});
  if(mode==='--plan')console.log(JSON.stringify({profile,options,source:frozenMilitaryProvenance(options)},null,2));
  else {const r=await runNativeCampaignCase(options,{provenance:frozenMilitaryProvenance});console.log(JSON.stringify(r.receipt));process.exitCode=r.exitCode;}
 }catch(e){console.error(e.stack);process.exitCode=1;}
}
