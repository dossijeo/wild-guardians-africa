import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {reviewedRecoveryOptions} from '../tools/run-reviewed-recovery-comparison.mjs';
import {frozenPolicies} from '../tools/run-military-only-calibration.mjs';
import {reviewedRecoveryIdentityIssues,summarizeReviewedRecoveryCases,observeReviewedRecoveryCases} from '../tools/summarize-reviewed-recovery.mjs';
const bytes=readFileSync(new URL('../docs/qa/integrated-spiritual-survival/recovery-integration-source-review/source-review.json.gz',import.meta.url));
const review=JSON.parse(gunzipSync(bytes));
const hash=b=>createHash('sha256').update(b).digest('hex');
// Metadata fixtures exercise evidence rejection, never substitute for native QA.
function fixture(arm){
 const info={profile:'good',seed:123,biome:'sabana',culture:'mapungubwe',arm};
 const options=reviewedRecoveryOptions(info.profile,{...info,out:'fixture'});
 const hashes={...review.current.sourceHashes};
 if(arm==='reference')for(const path of ['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js','src/simulation/raid-pressure-plan.js'])hashes[path]=review.changed.find(r=>r.path===path).before;
 for(const path of ['tools/run-reviewed-recovery-comparison.mjs','tools/run-military-only-calibration.mjs','docs/qa/integrated-spiritual-survival/military-only-policy-freeze-v1.json'])hashes[path]=hash(readFileSync(new URL('../'+path,import.meta.url)));
 const source={arguments:options,protocol:{cropHitPoints:1},sourceHashes:hashes,comparison:{arm,militaryCandidate:arm==='reference'?3:4,playerProfile:'good',policyFreeze:frozenPolicies.id,reviewSha256:hash(bytes)}};
 const report={seed:'123',biome:info.biome,culture:info.culture,strategy:options.strategy,labourPolicy:options.labourPolicy,policy:options,protocol:{gateAnimationInvariant:true}};
 return {info,source,report,receipt:{options:{days:100}}};
}
test('both reviewed arms pass metadata identity; drift rejects before inclusion',()=>{
 for(const arm of ['reference','recovery']){
  const f=fixture(arm);assert.deepEqual(reviewedRecoveryIdentityIssues(f.info,f.receipt,f.report,f.source),[]);
  const mutations=[
   x=>x.info.arm=arm==='reference'?'recovery':'reference',
   x=>x.source.arguments.days=14,
   x=>x.source.sourceHashes['src/simulation/crops.js']='changed',
   x=>delete x.source.sourceHashes['src/simulation/crops.js'],
   x=>x.source.sourceHashes['unreviewed.js']='new',
   x=>x.source.comparison.policyFreeze='different',
   x=>x.source.comparison.reviewSha256='different',
   x=>x.report.protocol.gateAnimationInvariant=false,
  ];
  for(const mutate of mutations){const changed=structuredClone(f);mutate(changed);assert.ok(reviewedRecoveryIdentityIssues(changed.info,changed.receipt,changed.report,changed.source).length);}
 }
});
test('arms never pool denominators and incomplete outcomes never count as defeats',()=>{
 const summary=summarizeReviewedRecoveryCases([
  {arm:'reference',profile:'good',status:'native-defeat'},
  {arm:'recovery',profile:'good',status:'survived-100'},
  {arm:'recovery',profile:'good',status:'running'},
  {arm:'recovery',profile:'good',status:'incomplete-review-required'},
 ]);
 assert.equal(summary.reference.good.winRate,0);assert.equal(summary.recovery.good.winRate,1);
 assert.equal(summary.recovery.good.completed,1);assert.equal(summary.recovery.good.unresolved,2);
 assert.equal(summary.recovery.good.accepted,false);assert.ok(summary.recovery.good.wilson95[0]<.85);
});
test('running receipt remains censored and unauditable terminal report is excluded',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wg-recovery-summary-'));
 try{
  const f=fixture('recovery');const info={...f.info,directory:dir};
  writeFileSync(join(dir,'receipt.json'),JSON.stringify({status:'running'}));
  const running=observeReviewedRecoveryCases([info]);assert.equal(running.cases[0].status,'running');assert.equal(running.arms.recovery.good.completed,0);
  writeFileSync(join(dir,'receipt.json'),JSON.stringify({status:'observed-native-defeat'}));
  writeFileSync(join(dir,'report.json'),JSON.stringify({...f.report,result:'defeat'}));
  writeFileSync(join(dir,'source.json'),JSON.stringify(f.source));
  const invalid=observeReviewedRecoveryCases([info]);assert.equal(invalid.cases[0].status,'incomplete-review-required');assert.equal(invalid.cases[0].terminalAudit.status,'failed');assert.equal(invalid.arms.recovery.good.completed,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
