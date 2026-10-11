import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyMilitaryCase,summarizeMilitaryCases,wilsonInterval,auditNativeMilitaryCase,frozenMilitaryIdentityIssues} from '../tools/summarize-military-only-cohort.mjs';
import {frozenMilitaryOptions} from '../tools/run-military-only-calibration.mjs';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
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
test('a good execution cannot be relabeled normal merely because both use strategy good',()=>{
 const site={seed:123,biome:'sabana',culture:'mapungubwe'},o=frozenMilitaryOptions('good',{...site,out:'.cache-config-fixture'});
 // Configuration fixture only, not a campaign or a native outcome.
 const report={...site,strategy:o.strategy,labourPolicy:o.labourPolicy,policy:o};
 const receipt={options:o},reference={'src/runtime.js':'frozen'},source={arguments:o,protocol:{cropHitPoints:1},sourceHashes:reference};
 assert.deepEqual(frozenMilitaryIdentityIssues('good',site,receipt,report,source,reference),[]);
 const mislabeled=frozenMilitaryIdentityIssues('normal',site,receipt,report,source,reference);
 assert(mislabeled.includes('report.policy.defenseStartDay'));assert(mislabeled.includes('report.policy.reserveMaintenance'));
 assert(frozenMilitaryIdentityIssues('good',site,receipt,report,{...source,sourceHashes:{'src/runtime.js':'different'}},reference).includes('frozen-source:src/runtime.js'));
 assert(frozenMilitaryIdentityIssues('good',site,receipt,report,{...source,protocol:{cropHitPoints:2}},reference).includes('source.protocol.cropHitPoints'));
});

test('real terminal receipt and canonical textual seed retain frozen launch identity',()=>{
 const root=new URL('../docs/qa/integrated-spiritual-survival/campaign-v118-q15-good-sabana-123-hundred/',import.meta.url);
 const read=name=>JSON.parse(readFileSync(new URL(name,root),'utf8').replace(/^\uFEFF/,''));
 const receipt=read('receipt.json'),report=read('report.json'),source=read('source.json');
 const site={seed:123,biome:'sabana',culture:'mapungubwe'},reference=source.sourceHashes;
 assert.equal(receipt.status,'observed-native-defeat');assert.equal(receipt.options,undefined);
 assert.equal(report.seed,'123');assert.equal(source.arguments.days,100);
 assert.deepEqual(frozenMilitaryIdentityIssues('good',site,receipt,report,source,reference),[]);
 for(const seed of ['0123','123x',124,null])assert(frozenMilitaryIdentityIssues('good',site,receipt,{...report,seed},source,reference).includes('report.seed'));
 for(const days of [21,99,undefined])assert(frozenMilitaryIdentityIssues('good',site,receipt,report,{...source,arguments:{...source.arguments,days}},reference).includes('source.arguments.days'));
 assert(frozenMilitaryIdentityIssues('good',site,{...receipt,options:{days:21}},report,source,reference).includes('receipt.options.days'));
});
test('mixed censored evidence is excluded from denominators, not treated as losing seeds',()=>{
 const r=summarizeMilitaryCases([{profile:'good',status:'survived-100'},{profile:'good',status:'native-defeat'},{profile:'good',status:'running'},{profile:'good',status:'incomplete-review-required'}]);
 assert.equal(r.good.completed,2);assert.equal(r.good.unresolved,2);assert.equal(r.good.winRate,.5);assert.equal(r.good.accepted,false);
 assert.equal(r.normal.winRate,null);assert.equal(r.normal.wilson95,null);
 assert.deepEqual(wilsonInterval(0,0),null);
 const [lo,hi]=wilsonInterval(6,6);assert.ok(lo<.85);assert.equal(hi,1);
});
