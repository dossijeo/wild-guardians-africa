import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyMilitaryCase,summarizeMilitaryCases,wilsonInterval,auditNativeMilitaryCase} from '../tools/summarize-military-only-cohort.mjs';
import {fileURLToPath} from 'node:url';
test('fragility, timeout and short completed horizons never count as defeats or wins',()=>{
 assert.equal(classifyMilitaryCase({status:'running'},{money:0,completedNights:12}),'running');
 assert.equal(classifyMilitaryCase({status:'incomplete-harness-error'},{result:null,completedNights:99}),'incomplete-review-required');
 assert.equal(classifyMilitaryCase({status:'observed-horizon'},{completedNights:21}),'incomplete-review-required');
 assert.equal(classifyMilitaryCase({status:'observed-native-defeat'},null),'incomplete-review-required');
 assert.equal(classifyMilitaryCase({status:'observed-native-defeat'},{result:'economic',completedNights:30}),'native-defeat');
 assert.equal(classifyMilitaryCase({status:'observed-horizon'},{completedNights:100}),'survived-100');
 assert.equal(classifyMilitaryCase({status:'observed-horizon'},{completedNights:100,result:'economic'}),'incomplete-review-required');
 assert.equal(classifyMilitaryCase({status:'observed-native-defeat'},{completedNights:100,result:'victory'}),'incomplete-review-required');
});
test('read-only audit validates preserved native defeat and rejects absent terminal evidence',()=>{
 const directory=fileURLToPath(new URL('../docs/qa/integrated-spiritual-survival/campaign-v116-q15-good-sabana-123-hundred',import.meta.url));
 const r=auditNativeMilitaryCase(directory);
 assert.equal(r.status,'verified',r.message);assert.equal(r.facts.result,'defeat');
 assert.equal(r.facts.completedNights,30);assert.equal(r.facts.money,32);
 assert.equal(r.facts.ledgerAndDeliveryMatch,true);
 assert.equal(auditNativeMilitaryCase(directory+'/missing-terminal-evidence').status,'failed');
});
test('mixed censored evidence is excluded from denominators, not treated as losing seeds',()=>{
 const r=summarizeMilitaryCases([{profile:'good',status:'survived-100'},{profile:'good',status:'native-defeat'},{profile:'good',status:'running'},{profile:'good',status:'incomplete-review-required'}]);
 assert.equal(r.good.completed,2);assert.equal(r.good.unresolved,2);assert.equal(r.good.winRate,.5);assert.equal(r.good.accepted,false);
 assert.equal(r.normal.winRate,null);assert.equal(r.normal.wilson95,null);
 assert.deepEqual(wilsonInterval(0,0),null);
 const [lo,hi]=wilsonInterval(6,6);assert.ok(lo<.85);assert.equal(hi,1);
});
