// Counterfactual planning only: no RNG draws, movement, damage or state edits.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {planRaidProductComposition,raidPressureCandidateForVersion,validateRaidPressureSource} from '../src/simulation/raid-pressure-budget.js';
import {threatTier} from '../src/simulation/rules.js';
const [directory,prefix]=process.argv.slice(2);
if(!directory||!prefix||existsSync(prefix+'.json')||existsSync(prefix+'.csv'))throw Error('Requires terminal native input and fresh output prefix');
const receipt=JSON.parse(readFileSync(directory+'/receipt.json'));
if(!['observed-horizon','observed-native-defeat'].includes(receipt.status))throw Error('Incomplete campaign');
const raw=readFileSync(directory+'/report.json'),report=JSON.parse(raw);
if(report.raidEvidence.status!=='verified'||report.raidEvidence.coverageLost)throw Error('Incomplete encounter evidence');
validateRaidPressureSource();
const rows=[];
for(const raid of report.raidEvidence.raids){
 const f=raid.pressureFacts;if(f.introductory)continue;
 const config=raidPressureCandidateForVersion(f.candidateVersion);
 if(!raid.ended)throw Error('Incomplete encounter');
 let baseline=null;
 for(const multiplier of [1,1.25,1.5,2]){
  const plan=planRaidProductComposition(f.targetAnimals,f.pressure,threatTier(f.effectiveValue).unlocked_species,{...config,qMeanMultiplier:multiplier});
  assert.equal(plan.status,'planned');assert(plan.maximumProduct<=plan.q+1e-9);
  if(multiplier===config.qMeanMultiplier){assert.deepEqual(plan.counts,f.composition,'Saved candidate planner must reproduce the recorded native composition');assert.equal(plan.q,f.budget,'Saved candidate budget must match recorded native budget');}
  assert.equal(Object.values(plan.counts).reduce((n,v)=>n+v,0),f.targetAnimals);
  baseline??=plan.envelope.mean;
  rows.push({night:raid.day,pressure:f.pressure,observedCandidateVersion:config.version,nativeBaselineMultiplier:config.qMeanMultiplier,multiplier,animals:f.targetAnimals,
   q:plan.q,referenceMean:plan.envelope.mean,referenceMin:plan.envelope.min,referenceMax:plan.envelope.max,
   relativeReferenceMean:plan.envelope.mean/baseline,adjustments:plan.adjustments.length,...plan.counts});
 }
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=['tools/study_native_raid_budget.mjs','src/simulation/raid-pressure-budget.js','src/simulation/rules.js'];
const sourceHashes=Object.fromEntries(sourcePaths.map(p=>[p,hash(readFileSync(p))]));
const scope='Counterfactual composition planning at recorded native pressure/value. Original quantity, hit ranges, damage/radii and unlocks remain fixed. No RNG roll, physical simulation, casualty forecast, ledger change or approved runtime configuration. Larger Q may have no effect once the original composition fits.';
writeFileSync(prefix+'.json',JSON.stringify({input:directory,reportSha256:hash(raw),sourceHashes,rows,scope},null,2)+'\n');
const keys=rows.length?Object.keys(rows[0]):['night'];
writeFileSync(prefix+'.csv',keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n');
console.log(JSON.stringify({rows:rows.length,scope}));
