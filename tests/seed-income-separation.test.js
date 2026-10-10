import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {auditSeparation} from '../tools/audit-seed-income-separation.mjs';
const raw=readFileSync(new URL('../docs/qa/campaign-100-day-mathematical-projection/projection.json',import.meta.url)),input=JSON.parse(raw);
const refRaw=readFileSync(new URL('../docs/qa/seed-scarcity-income-separation/reference-0e13f056.json',import.meta.url)),reference=JSON.parse(refRaw);
test('the prior comparison already separated seed quotes and preserves all 200 published rows',()=>{
 const before=JSON.stringify(input),result=auditSeparation(input,reference);
 assert.equal(result.previouslySeparated,true);assert.equal(result.replayMatchesAll200OriginalRows,true);
 assert.deepEqual(result.exact.without.rows,reference.baseline);assert.deepEqual(result.exact.with.rows,reference.inflated);
 assert.equal(result.exact.without.day100.cash,90);assert.equal(result.exact.with.day100.cash,117);
 assert.equal(JSON.stringify(input),before);
});
test('every delivery uses fixed species payout while seed quotes may change',()=>{
 const result=auditSeparation(input,reference);
 for(const cases of [result.exact,result.originalPayouts]) {
  assert.deepEqual(cases.with.payouts,cases.without.payouts);
  let quotedAboveBase=false;
  for(const arm of ['without','with'])for(const r of cases[arm].daily)for(const [species,e] of Object.entries(r.bySpecies)) {
   assert.equal(e.unitPayout,cases[arm].payouts[species]);assert.equal(e.income,e.harvested*cases[arm].payouts[species]);
   if(e.planted&&arm==='without')assert.equal(e.minSeedQuote,cases[arm].seedBases[species]);
   if(e.planted&&arm==='with'&&e.maxSeedQuote>cases[arm].seedBases[species])quotedAboveBase=true;
  }
  assert.ok(quotedAboveBase);
 }
});
test('all 400 daily ledgers reconcile net cash and one-time initial costs',()=>{
 const result=auditSeparation(input,reference);
 for(const cases of [result.exact,result.originalPayouts])for(const scenario of Object.values(cases)) {
  let net=0,expenses=0,income=0;
  assert.equal(scenario.daily.length,100);
  for(const r of scenario.daily) {
   assert.equal(r.expenses.center,r.day===1?800:0);assert.equal(r.expenses.seeds,r.seeds+(r.day===1?5:0));
   assert.equal(r.expenses.total,Object.entries(r.expenses).filter(([key])=>key!=='total').reduce((n,[,value])=>n+value,0));
   net+=r.income-r.expenses.total;expenses+=r.expenses.total;income+=r.income;
   assert.equal(r.netCumulative,net);assert.equal(r.expenseCumulative,expenses);assert.equal(r.incomeCumulative,income);assert.equal(r.cash,1500+net);
  }
  assert.equal(scenario.day100.netCumulative,scenario.day100.cash-1500);
  assert.equal(Object.values(scenario.day100.livingBySpecies).reduce((n,v)=>n+v,0),scenario.day100.plants);
 }
});
test('audited report and frozen reference are reproducible with verified source hashes',()=>{
 const saved=JSON.parse(readFileSync(new URL('../docs/qa/seed-scarcity-income-separation/audit.json',import.meta.url))),actual=auditSeparation(input,reference),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 for(const key of Object.keys(actual))assert.deepEqual(saved[key],actual[key]);
 assert.equal(saved.referenceSHA256,hash(refRaw));assert.equal(saved.inputSHA256,hash(raw));
 for(const [name,sha] of Object.entries(saved.sourceHashes))assert.equal(hash(readFileSync(new URL('../tools/'+name,import.meta.url))),sha);
 assert.deepEqual(saved.originalPayouts.with.payouts,Object.fromEntries(input.referenceBalance.crops.map(c=>[c.id,c.base_harvest_value])));
});
