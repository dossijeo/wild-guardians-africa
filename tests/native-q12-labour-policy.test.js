import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {createQ12LabourPolicy} from '../tools/native-q12-labour-policy.mjs';
import {auditNativeWorkerThroughput} from '../tools/audit-native-worker-throughput.mjs';
import {parseNativeCampaignArgs,nativeCampaignProvenance} from '../tools/run_native_campaign.mjs';

const raw=gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/pilot-v46-passive-q10-young-female-empalizada-sabana-712-fourteen/partial-state.json.gz',import.meta.url))).toString();
test('retained native 39-coin state can settle a real elder contract rather than false insolvency',()=>{
 const s=deserialize(raw),before=serialize(s),policy=createQ12LabourPolicy({profile:'youngFemale'});
 assert.equal(numberOf(s.ledger.balance),39);assert.equal(s.result,null);assert.ok(s.pauses.includes('hiring'));
 const plan=policy.dawn(s,{pendingRepair:0,seedCost:5});
 assert.equal(serialize(s),before);assert.equal(plan.preferredAffordableStaff,0);
 assert.equal(plan.profile,'olderFemale');assert.equal(plan.staff,1);assert.equal(plan.cost,30);assert.equal(plan.fallbackUsed,true);
 Game.hire(s,'q12-retained-real-contract',plan.selection);policy.hired(s,plan.staff,{daily:true});
 assert.equal(numberOf(s.ledger.balance),9);assert.equal(policy.reserve(),30);
 assert.equal(s.workers.filter(w=>w.contractDay===s.day&&w.profile==='olderFemale').length,1);
 assert.equal(s.ledger.entries['q12-retained-real-contract'].n,'-30');
 const loaded=deserialize(serialize(s)),saved=serialize(loaded);
 assert.equal(Game.hire(loaded,'q12-retained-real-contract',plan.selection),false);assert.equal(serialize(loaded),saved);
});

test('preferred payable contracts remain preferred; fallback is limited to real affordability',()=>{
 for(const cash of [29,30,39,40,332]){
  const s=deserialize(raw);s.ledger.balance={n:String(cash),d:'1'};
  const p=createQ12LabourPolicy({profile:'youngFemale'}),plan=p.dawn(s,{seedCost:5});
  assert.equal(plan.profile,cash>=30&&cash<40?'olderFemale':'youngFemale');
  assert.equal(plan.staff>0,cash>=30);assert.equal(plan.cost,plan.staff*(plan.profile==='olderFemale'?30:40));
 }
 const elder=createQ12LabourPolicy({profile:'olderFemale'});assert.equal(elder.report().fallbackProfile,null);
});

test('native wage audit uses explicit contract profiles and rejects falsified fallback',()=>{
 const report={policy:{profile:'youngFemale'},daily:[{day:10,delivered:0,finance:{wages:30,income:0,net:-30,seeds:0,repairs:0,entries:[{id:'hire',category:'wages',coins:-30}]}}],labourHistory:[{day:10,time:0,id:'hire',kind:'daily',staff:1,profile:'olderFemale',selection:{olderFemale:1},paidCoins:30}],labourObservations:[],nativeEvidence:{deliveries:[]}};
 const r=auditNativeWorkerThroughput(report);assert.equal(r.daily[0].profile,'olderFemale');assert.equal(r.daily[0].paidContractSeconds,300);
 report.labourHistory[0].selection={youngFemale:1};assert.throws(()=>auditNativeWorkerThroughput(report),/contradicts/);
});

test('explicit Q12 launch is documented and hashes its entire policy chain',()=>{
 const args=parseNativeCampaignArgs(['--out','unused-q12-test','--labour-policy','q12','--profile','youngFemale']);assert.equal(args.labourPolicy,'q12');
 const p=nativeCampaignProvenance(args);for(const file of ['tools/native-q10-labour-policy.mjs','tools/native-q12-labour-policy.mjs'])assert.match(p.sourceHashes[file],/^[a-f0-9]{64}$/);
});
