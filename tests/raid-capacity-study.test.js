import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {capacityCandidateStudy} from '../tools/study_native_raid_capacity_candidates.mjs';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/raid-pressure-v2-native-study.json',import.meta.url),'utf8'));
test('joint candidate envelopes are deterministic, bounded and leave the native observation unchanged',()=>{
 const input=fixture(),before=JSON.stringify(input),one=capacityCandidateStudy(input),two=capacityCandidateStudy(input);
 assert.deepEqual(one,two);assert.equal(JSON.stringify(input),before);assert.equal(one.length,18);
 for(const row of one){assert(row.animals<=34);assert(row.referenceMaximumHp<=row.q+1e-9);assert(row.maximumConfiguredHp>=row.referenceMaximumHp);}
 const baseline=one.find(r=>r.night===14&&r.countPower===1&&r.hitSteps===2);
 assert.equal(baseline.animals,14);assert.equal(baseline.referenceMeanHp,68.5);assert.equal(baseline.observedBaselineCropHp,60);
 const candidate=one.find(r=>r.night===14&&r.countPower===.5&&r.hitSteps===4);
 assert.equal(candidate.animals,21);assert.equal(candidate.referenceMeanHp,129.5);assert(candidate.passesOptimisticCapacityScreen);
 assert.equal(one.find(r=>r.night===6&&r.countPower===.5&&r.hitSteps===4).animals,8);
});
test('unobserved, unfinished or misidentified baseline evidence is rejected',()=>{
 for(const mutate of [r=>r.raidEvidence.coverageLost=true,r=>r.raidEvidence.raids[0].ended=false,r=>r.raidEvidence.raids[0].pressureFacts.candidateVersion=1,r=>r.raidEvidence.raids[0].pressureFacts.budget++,r=>r.raidEvidence.raids[0].exposureStatus='estimated']){
  const input=fixture();mutate(input);assert.throws(()=>capacityCandidateStudy(input));
 }
});
