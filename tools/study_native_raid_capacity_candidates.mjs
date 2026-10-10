// Read-only counterfactual envelopes; no RNG draws, damage or economic actions.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {BALANCE as B} from '../src/simulation/balance.js';
import {planRaidProductComposition,raidPressureCandidateForVersion,validateRaidPressureSource} from '../src/simulation/raid-pressure-budget.js';
import {threatTier} from '../src/simulation/rules.js';
export function capacityCandidateStudy(report){
 validateRaidPressureSource();
 assert.equal(report.raidEvidence.status,'verified');assert.equal(report.raidEvidence.coverageLost,false);
 const original=JSON.stringify(B),config=raidPressureCandidateForVersion(2),rows=[];
 for(const raid of report.raidEvidence.raids){
  const f=raid.pressureFacts;if(f.introductory)continue;
  assert(raid.ended);assert.equal(f.candidateVersion,2);assert.equal(raid.exposureStatus,'exact-native-spawn');
  const unlocked=threatTier(f.effectiveValue).unlocked_species;
  const baseline=planRaidProductComposition(f.targetAnimals,f.pressure,unlocked,config);
  assert.deepEqual(baseline.counts,f.composition);assert.equal(baseline.q,f.budget);
  for(const countPower of [1,.75,.5])for(const hitSteps of [2,4,6]){
   const unchanged=countPower===1&&hitSteps===2;
   const rawCount=Math.round(4+30*Math.pow(f.pressure,countPower));
   // Candidate warm-up only: 8 bodies on night 6, +2/night, until raw count fits.
   const count=unchanged?rawCount:Math.min(rawCount,8+2*(f.night-6));
   const extraHits=Math.floor(hitSteps*f.pressure)-Math.floor(2*f.pressure),balance=structuredClone(B);
   for(const animal of balance.animals){animal.hit_budget_min+=extraHits;animal.hit_budget_max+=extraHits;}
   const plan=planRaidProductComposition(count,f.pressure,unlocked,config,balance);
   assert.equal(plan.status,'planned');assert(plan.maximumProduct<=plan.q+1e-9);assert.equal(Object.values(plan.counts).reduce((a,b)=>a+b,0),count);
   let maximumAssignedHits=0,maximumConfiguredHp=0;
   for(const spec of plan.envelope.rows){
    const hits=spec.count*spec.maxHits;maximumAssignedHits+=hits;
    maximumConfiguredHp+=hits*(Math.min(2,spec.cropDamage)+(spec.areaCap-1)*Math.min(2,spec.cropDamage*.5));
   }
   const orientativeLoss=raid.exposedLivingAtSpawn*(.2057+.0007*(f.night-1));
   const optimisticLossUpper=Math.min(raid.exposedLivingAtSpawn,raid.exposedWoundedAtSpawn+Math.floor(maximumConfiguredHp/2));
   rows.push({night:f.night,pressure:f.pressure,countPower,hitSteps,warmup:!unchanged,animals:count,
    additionalHitsPerAnimal:extraHits,q:plan.q,referenceMeanHp:plan.envelope.mean,referenceMinimumHp:plan.envelope.min,
    referenceMaximumHp:plan.envelope.max,relativeReferenceMean:plan.envelope.mean/baseline.envelope.mean,
    meanAllHitsOnStructures:plan.envelope.structure.mean,relativeStructureMean:plan.envelope.structure.mean/baseline.envelope.structure.mean,
    maximumAssignedHits,maximumConfiguredHp,optimisticLossUpper,orientativeLoss,
    passesOptimisticCapacityScreen:optimisticLossUpper>=orientativeLoss,
    observedBaselineCropHp:raid.effectiveAgriculturalHp,observedBaselineReferenceHp:raid.potentialAgriculturalHp,
    ...plan.counts});
  }
 }
 assert.equal(JSON.stringify(B),original);return rows;
}
export function writeStudy(directory,prefix){
 assert(!existsSync(prefix+'.json')&&!existsSync(prefix+'.csv'),'Refusing to replace retained evidence');
 const receipt=JSON.parse(readFileSync(directory+'/receipt.json'));assert(['observed-horizon','observed-native-defeat'].includes(receipt.status));
 const raw=readFileSync(directory+'/report.json'),report=JSON.parse(raw),rows=capacityCandidateStudy(report);
 const hash=b=>createHash('sha256').update(b).digest('hex');
 const files=['tools/study_native_raid_capacity_candidates.mjs','src/simulation/raid-pressure-budget.js','src/simulation/rules.js','src/simulation/balance.js'];
 const scope='Counterfactual composition/hit-envelope planning at recorded candidate-2 pressures, species unlocks and spawn census. No RNG, movement, physical impacts, casualties, ledger or runtime mutation. Hypothetical hit-range changes exist only in cloned planning input. Maximum-cap bounds assume perfect contacts; passing is necessary screening, never survival/defeat prediction. No agricultural prices are changed.';
 writeFileSync(prefix+'.json',JSON.stringify({input:directory,reportSha256:hash(raw),sourceHashes:Object.fromEntries(files.map(f=>[f,hash(readFileSync(f))])),rows,scope},null,2)+'\n');
 const keys=rows.length?Object.keys(rows[0]):['night'];writeFileSync(prefix+'.csv',keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n');
 return {rows:rows.length,scope};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [directory,prefix]=process.argv.slice(2);assert(directory&&prefix);console.log(JSON.stringify(writeStudy(directory,prefix)));}
