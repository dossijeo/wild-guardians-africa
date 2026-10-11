// Synthetic parser fixtures only; these tests are not campaign acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
function run(change=()=>{}){
 const parent=resolve(tmpdir()),dir=mkdtempSync(join(parent,'wild-guardians-audit-test-'));
 assert.equal(dirname(resolve(dir)),parent);
 const finance={opening:100,closing:105,income:10,refunds:0,wages:5,seeds:0,walls:0,centers:0,villages:0,repairs:0,otherCredits:0,otherDebits:0,reconciliationDifference:0,entries:[{id:'deliver:crate-1',coins:10,category:'income'},{id:'hire-1',coins:-5,category:'wages'}]};
 const fixture={receipt:{status:'observed-horizon',result:null,completedNights:1},source:{sourceHashes:{fixture:'synthetic-unit-data'}},rows:[{day:1,money:105,living:9,centerHp:[600],result:null,finance}],report:{result:null,completedNights:1,money:105,seed:1,strategy:'good',counts:{CropDestroyed:1},nativeEvidence:{status:'verified',coverageLost:false,deliveries:[{paymentId:'deliver:crate-1',coins:10}]},raidEvidence:{status:'verified',coverageLost:false,issues:[],raids:[{day:1,ended:true,exposedLivingAtSpawn:10,cropsDestroyed:1,species:{warthog:{initialHitBudget:1,observedBudgetConsumed:1,unconsumedOrUnobservedBudget:0}}}]},entryTransport:{preparer:{failed:0},workerFailure:null}}};
 try{
  change(fixture);
  fixture.report.daily??=structuredClone(fixture.rows);
  for(const k of ['receipt','source','report'])writeFileSync(join(dir,k+'.json'),JSON.stringify(fixture[k]));
  if(fixture.state)writeFileSync(join(dir,'state.json.gz'),gzipSync(JSON.stringify(fixture.state)));
  writeFileSync(join(dir,'days.jsonl'),fixture.rows.map(d=>JSON.stringify(d)).join('\n')+'\n');
  return spawnSync(process.execPath,['tools/audit-native-terminal-campaigns.mjs',dir],{encoding:'utf8'});
 }finally{
  // Only this invocation's newly created direct temporary child is removed.
  assert.equal(dirname(resolve(dir)),parent);assert.ok(dir.startsWith(join(parent,'wild-guardians-audit-test-')));
  rmSync(dir,{recursive:true});
 }
}
test('accepts consistent fixture and rejects subtotal corruption despite unchanged saldo',()=>{
 assert.equal(run().status,0);
 const r=run(f=>{f.rows[0].finance.wages=4;});assert.notEqual(r.status,0);assert.match(r.stderr,/Incorrect wages subtotal/);
});
test('rejects missing physical-delivery observation, duplicate entry and incorrect credit sign',()=>{
 assert.notEqual(run(f=>{f.report.nativeEvidence.deliveries=[];}).status,0);
 assert.notEqual(run(f=>{f.rows[0].finance.entries[1].id='deliver:crate-1';}).status,0);
 assert.notEqual(run(f=>{f.rows[0].finance.entries[1].category='refunds';}).status,0);
});
test('rejects transport failures and incomplete native strike accounting',()=>{
 assert.notEqual(run(f=>{f.report.entryTransport.preparer.failed=1;}).status,0);
 assert.notEqual(run(f=>{f.report.raidEvidence.raids[0].species.warthog.observedBudgetConsumed=0;}).status,0);
});
test('accepts terminal defeat row without inventing an extra completed night',()=>{
 assert.equal(run(f=>{f.receipt.status='observed-native-defeat';f.receipt.result='defeat';f.receipt.completedNights=0;f.report.result='defeat';f.report.completedNights=0;f.rows[0].result='defeat';}).status,0);
 assert.notEqual(run(f=>{f.receipt.status='incomplete-harness-error';}).status,0);
});

test('accepts dawn economic defeat only with consistent native terminal snapshot evidence',()=>{
 const dawn=f=>{f.receipt.status='observed-native-defeat';f.receipt.result='defeat';f.report.result='defeat';f.rows[0].result='defeat';f.state={result:'defeat',day:2,time:0,completedNights:1,raid:null,ledger:{balance:{n:'105',d:'1'}},events:[{type:'RaidEnded'},{type:'GameOver'}]};};
 const valid=run(dawn);assert.equal(valid.status,0);assert.match(valid.stdout,/dawn-after-completed-night/);
 assert.notEqual(run(f=>{dawn(f);delete f.state;}).status,0);
 assert.notEqual(run(f=>{dawn(f);f.state.raid={};}).status,0);
 assert.notEqual(run(f=>{dawn(f);f.state.time=600;}).status,0);
 assert.notEqual(run(f=>{dawn(f);f.state.ledger.balance.n='106';}).status,0);
 assert.notEqual(run(f=>{dawn(f);f.state.events.reverse();}).status,0);
});


function hundredNightVictory(f){
 const row=f.rows[0],raid=f.report.raidEvidence.raids[0];
 f.rows=Array.from({length:100},(_,i)=>({...structuredClone(row),day:i+1,money:105+i*5,result:i===99?'victory':null,finance:{...structuredClone(row.finance),opening:100+i*5,closing:105+i*5,entries:[{id:'deliver:crate-'+(i+1),coins:10,category:'income'},{id:'hire-'+(i+1),coins:-5,category:'wages'}]}}));
 f.receipt.result=f.report.result='victory';f.receipt.completedNights=f.report.completedNights=100;f.report.money=600;
 f.report.nativeEvidence.deliveries=f.rows.map(d=>({paymentId:d.finance.entries[0].id,coins:10}));
 f.report.raidEvidence.raids=f.rows.map(d=>({...structuredClone(raid),day:d.day}));
 f.state={result:'victory',postgame:false,day:101,time:0,completedNights:100,raid:null,ledger:{balance:{n:'600',d:'1'}},events:[{type:'RaidEnded'},{type:'CampaignWon'}]};
}

test('accepts hundred-night victory only with complete ledgers and the native victory snapshot',()=>{
 const valid=run(hundredNightVictory);assert.equal(valid.status,0,valid.stderr);assert.match(valid.stdout,/dawn-after-hundredth-night/);
 for(const mutate of [f=>{delete f.state;},f=>{f.receipt.completedNights=99;},f=>{f.rows.pop();},f=>{f.state.raid={};},f=>{f.state.events.reverse();},f=>{f.state.events.push({type:'GameOver'});},f=>{f.state.ledger.balance.n='601';},f=>{f.state.postgame=true;},f=>{f.state.time=600;}]){
  const rejected=run(f=>{hundredNightVictory(f);mutate(f);});assert.notEqual(rejected.status,0);
 }
});


test('rejects a report whose daily observations differ from the preserved ledger rows',()=>{
 const inconsistent=run(f=>{f.report.daily=structuredClone(f.rows);f.report.daily[0].living=8;});
 assert.notEqual(inconsistent.status,0);assert.match(inconsistent.stderr,/preserved daily ledger rows differ/);
});
