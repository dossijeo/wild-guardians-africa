import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {verifyReviewedRecoverySources,reviewedRecoveryOptions,reviewedRecoveryProvenance} from '../tools/run-reviewed-recovery-comparison.mjs';
import {frozenMilitaryOptions} from '../tools/run-military-only-calibration.mjs';
const review=JSON.parse(gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/recovery-integration-source-review/source-review.json.gz',import.meta.url))));
const paths=['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js','src/simulation/raid-pressure-plan.js'];
test('guard accepts only exact reviewed recovery or exact historical quantity on identical corrected dependencies',()=>{
 const actual={...review.current.sourceHashes};assert.equal(verifyReviewedRecoverySources(actual).militaryCandidate,4);
 for(const path of paths)actual[path]=review.changed.find(row=>row.path===path).before;
 assert.equal(verifyReviewedRecoverySources(actual).militaryCandidate,3);
 actual[paths[0]]='different';assert.throws(()=>verifyReviewedRecoverySources(actual),/Unreviewed military/);
});
test('economic, navigation, policy, missing and new dependency drift all reject',()=>{
 for(const path of ['src/simulation/crops.js','src/simulation/actor-motion.js','tools/native-q15-labour-policy.mjs'])assert.throws(()=>verifyReviewedRecoverySources({...review.current.sourceHashes,[path]:'changed'}),/Unreviewed runtime/);
 assert.throws(()=>verifyReviewedRecoverySources({...review.current.sourceHashes,newDependency:'x'}),/inventory/);
 const missing={...review.current.sourceHashes};delete missing[paths[0]];assert.throws(()=>verifyReviewedRecoverySources(missing),/inventory/);
 const partial={...review.current.sourceHashes,[paths[0]]:review.changed.find(row=>row.path===paths[0]).before};assert.throws(()=>verifyReviewedRecoverySources(partial),/Unreviewed runtime/);
});
test('all three player profiles preserve every frozen decision and the 100-night horizon',()=>{
 for(const profile of ['good','normal','bad']){
  const input={seed:712,biome:'sabana',culture:'mapungubwe',out:'fixture'};
  const expected=frozenMilitaryOptions(profile,input),actual=reviewedRecoveryOptions(profile,input);
  assert.deepEqual(actual,{...expected,gateAnimationInvariant:true});assert.equal(actual.days,100);
 }
 const options=reviewedRecoveryOptions('good',{seed:712,biome:'sabana',culture:'mapungubwe',out:'fixture'});
 const provenance=reviewedRecoveryProvenance(options);assert.match(provenance.comparison.reviewSha256,/^[a-f0-9]{64}$/);
 assert.equal(provenance.protocol.gateAnimationInvariant,true);
 assert.equal(provenance.comparison.playerProfile,'good');
 for(const change of [{days:14},{plantsPerWorker:100},{reserveMaintenance:false},{strategy:'expansive'}])assert.throws(()=>reviewedRecoveryProvenance({...options,...change}),/differ from frozen/);
});
