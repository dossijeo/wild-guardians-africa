import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {frozenMilitaryOptions,frozenPolicies} from './run-military-only-calibration.mjs';
import {runNativeCampaignCase,nativeCampaignProvenance} from './run_native_campaign.mjs';

const root=new URL('../',import.meta.url);
const militaryChanges=['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js','src/simulation/raid-pressure-plan.js'].sort();
export function recoveryProvenance(options){
 const p=nativeCampaignProvenance(options);
 const original=JSON.parse(readFileSync(new URL('docs/qa/integrated-spiritual-survival/'+frozenPolicies.baselineCampaign+'/source.json',root),'utf8'));
 const changed=Object.entries(original.sourceHashes).filter(([path,hash])=>p.sourceHashes[path]!==hash).map(([path])=>path).sort();
 if(JSON.stringify(changed)!==JSON.stringify(militaryChanges))throw Error('Unexpected change to frozen baseline: '+changed.join(', '));
 for(const path of ['docs/qa/integrated-spiritual-survival/military-only-policy-freeze-v1.json','tools/run-raid-recovery-calibration.mjs','tools/run-military-only-calibration.mjs'])p.sourceHashes[path]=createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex');
 return {...p,policyFreeze:frozenPolicies.id,militaryCandidate:4,militaryOnlyChanges:changed,baselineSourceVerified:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [mode,profile,seed,biome,culture,out,...extra]=process.argv.slice(2);
  if(!['--plan','--run'].includes(mode)||extra.length)throw Error('Use --plan|--run good|normal|bad SEED BIOME CULTURE NEW_OUT');
  const options=frozenMilitaryOptions(profile,{seed:Number(seed),biome,culture,out});
  if(mode==='--plan')console.log(JSON.stringify({profile,options,source:recoveryProvenance(options)},null,2));
  else {const r=await runNativeCampaignCase(options,{provenance:recoveryProvenance});console.log(JSON.stringify(r.receipt));process.exitCode=r.exitCode;}
 }catch(e){console.error(e.stack);process.exitCode=1;}
}
