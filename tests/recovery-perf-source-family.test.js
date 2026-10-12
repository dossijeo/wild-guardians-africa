import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {recoveryPerfSourceInventories,verifyRecoveryPerfSources} from '../tools/reviewed-recovery-perf-sources.mjs';
const different='0'.repeat(64);
test('actual materialized technical runtime matches its exact declared military arm',()=>{
 const {recovery}=recoveryPerfSourceInventories();
 const actual=Object.fromEntries(Object.keys(recovery).map(path=>[path,createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex')]));
 const config=JSON.parse(readFileSync(new URL('../content/balance/raid_pressure_candidate.json',import.meta.url)));
 assert([3,4].includes(config.version));
 const result=verifyRecoveryPerfSources(actual);
 assert.equal(result.militaryCandidate,config.version);assert.equal(result.arm,config.version===4?'recovery':'reference');
});
test('prospective matched reference differs only in the three original military files',()=>{
 const {recovery,reference}=recoveryPerfSourceInventories(),result=verifyRecoveryPerfSources(reference);
 assert.equal(result.arm,'reference');assert.equal(result.militaryCandidate,3);
 assert.deepEqual(result.changed,['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js','src/simulation/raid-pressure-plan.js']);
 for(const path of Object.keys(recovery))if(!result.changed.includes(path))assert.equal(reference[path],recovery[path]);
});
test('mixed recipes, common-code changes, missing and extra inputs are rejected',()=>{
 const {recovery,reference}=recoveryPerfSourceInventories();
 for(const edit of [x=>{x['src/simulation/game.js']=different;},x=>{x['src/simulation/raid-pressure-plan.js']=reference['src/simulation/raid-pressure-plan.js'];},x=>{x['content/balance/raid_pressure_candidate.json']=different;},x=>{delete x['src/world/watering-route-cache.js'];},x=>{x['undeclared.js']=different;}]){
  const candidate={...recovery};edit(candidate);assert.throws(()=>verifyRecoveryPerfSources(candidate));
 }
 for(const invalid of [null,[],undefined])assert.throws(()=>verifyRecoveryPerfSources(invalid));
});
test('caller edits cannot mutate the expected family',()=>{
 const {recovery}=recoveryPerfSourceInventories();recovery['src/simulation/game.js']=different;
 assert.throws(()=>verifyRecoveryPerfSources(recovery));assert.equal(verifyRecoveryPerfSources(recoveryPerfSourceInventories().recovery).arm,'recovery');
});
