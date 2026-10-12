import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewedRecoveryOptions,reviewedRecoveryProvenance} from '../tools/run-reviewed-recovery-comparison.mjs';
import {recoveryPerfComparisonOptions,recoveryPerfComparisonProvenance} from '../tools/run-reviewed-recovery-perf-comparison.mjs';
const input={seed:123,biome:'sabana',culture:'mapungubwe',out:'.cache/not-launched-launcher-test'};
test('all three policies retain their exact original options',()=>{
 for(const profile of ['good','normal','bad'])assert.deepEqual(recoveryPerfComparisonOptions(profile,input),reviewedRecoveryOptions(profile,input));
 assert.throws(()=>recoveryPerfComparisonOptions('perfect',input));
});
test('new provenance names its family and hashes the validator, launcher and review inputs',()=>{
 const source=recoveryPerfComparisonProvenance(recoveryPerfComparisonOptions('normal',input));
 assert.equal(source.comparison.family,'recovery-perf-preparation-v1');assert.equal(source.comparison.arm,'recovery');
 assert.equal(source.comparison.playerProfile,'normal');assert.equal(Object.keys(source.sourceHashes).length,470);
 for(const path of ['tools/run-reviewed-recovery-perf-comparison.mjs','tools/reviewed-recovery-perf-sources.mjs','docs/qa/integrated-spiritual-survival/recovery-perf-preparation/complete-source.json.gz'])assert.equal(source.sourceHashes[path],createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'));
});
test('policy overrides and old-family relabeling remain rejected',()=>{
 const options=recoveryPerfComparisonOptions('good',input);
 for(const edit of [{days:7},{defenseStartDay:1},{reserveMaintenance:false},{gateAnimationInvariant:false}])assert.throws(()=>recoveryPerfComparisonProvenance({...options,...edit}),/frozen player profiles/);
 // A complete switch to another frozen policy is valid and must be labeled
 // according to its actual options, never counted as the original good policy.
 assert.equal(recoveryPerfComparisonProvenance({...options,strategy:'bad'}).comparison.playerProfile,'bad');
 assert.throws(()=>reviewedRecoveryProvenance(options),/Reviewed dependency inventory differs/);
});
