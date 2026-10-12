import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {hostileFailureInventories,verifyHostileFailureSources} from '../tools/reviewed-hostile-failure-sources.mjs';import {hostileFailureOptions,hostileFailureProvenance} from '../tools/plan-hostile-failure-campaign.mjs';import {reviewedRecoveryOptions} from '../tools/run-reviewed-recovery-comparison.mjs';
const input={seed:123,biome:'sabana',culture:'mapungubwe',out:'.cache/not-launched-hostile-witness'};
test('All 468 reviewed runtime inputs match the materialized candidate',()=>{const {candidate}=hostileFailureInventories();const actual=Object.fromEntries(Object.keys(candidate).map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));assert.equal(verifyHostileFailureSources(actual).militaryCandidate,5);});
test('Technical navigation is shared by both military recipes and arbitrary drift is rejected',()=>{
 const {candidate,control}=hostileFailureInventories();assert.equal(verifyHostileFailureSources(control).militaryCandidate,4);
 for(const edit of [x=>x['src/world/reverse-failure-certificate.js']='0'.repeat(64),x=>delete x['src/world/navigation.js'],x=>x['extra.js']='0'.repeat(64),x=>x['src/simulation/raid-pressure-budget.js']=control['src/simulation/raid-pressure-budget.js']]){const x={...candidate};edit(x);assert.throws(()=>verifyHostileFailureSources(x));}
 assert.equal(verifyHostileFailureSources(candidate).acceptancePending,true);
});
test('Frozen policies and 100-day horizon cannot change under the technical planner',()=>{
 for(const p of ['good','normal','bad']){const {'stop-file':stop,...actual}=hostileFailureOptions(p,input);assert.deepEqual(actual,reviewedRecoveryOptions(p,input));assert.equal(actual.days,100);assert(stop.endsWith('stop-requested'));}
 const options=hostileFailureOptions('good',input);for(const edit of [{days:7},{defenseStartDay:1},{strategy:'perfect'},{'stop-file':'arbitrary'}])assert.throws(()=>hostileFailureProvenance({...options,...edit}),/frozen player profiles/);
});
