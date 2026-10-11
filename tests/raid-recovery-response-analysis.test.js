import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeRaidRecoveryResponse} from '../tools/analyze-raid-recovery-response.mjs';
test('late shrinking-farm quantity analysis retains actual losses separately from counterfactual counts',()=>{
 const report={raidEvidence:{raids:[{pressureFacts:{candidateVersion:3,night:36,pressure:.24624502862469372,observedValue:295,effectiveValue:675.7898549476145,targetAnimals:19},actors:Array(19).fill({}),exposedLivingAtSpawn:23,cropsDestroyed:23,potentialAgriculturalHp:78,effectiveAgriculturalHp:23}]}};
 const before=structuredClone(report),[row]=analyzeRaidRecoveryResponse(report);
 assert.deepEqual(report,before);assert.equal(row.originalAnimals,19);assert.equal(row.counterfactualRecoveryAnimals,4);assert.equal(row.originalDestroyed,23);assert.equal(row.originalEffectiveHp,23);
 assert.equal(row.quantityRatio,4/19);
 for(const mutate of [r=>r.raidEvidence.raids[0].pressureFacts.candidateVersion=4,r=>r.raidEvidence.raids[0].actors.pop(),r=>r.raidEvidence.raids[0].pressureFacts.targetAnimals=18]){
  const bad=structuredClone(report);mutate(bad);assert.throws(()=>analyzeRaidRecoveryResponse(bad));
 }
 assert.throws(()=>analyzeRaidRecoveryResponse({}),/Native raid/);
});
