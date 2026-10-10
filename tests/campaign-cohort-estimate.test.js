import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {estimate} from '../tools/campaign-cohort-estimate.mjs';
import {dawnMinimum} from '../src/simulation/rules.js';
const input=JSON.parse(readFileSync(new URL('../docs/qa/campaign-100-day-mathematical-projection/projection.json',import.meta.url)));
test('an empty intact farm with 154 coins exceeds the native recovery minimum',()=>{
 const minimum=dawnMinimum({structures:[{kind:'center',status:'intact'}],plants:[],crates:[]});
 assert.equal(minimum,35);assert.ok(154>=minimum);
 const old=JSON.parse(readFileSync(new URL('../docs/qa/campaign-accounting-mathematical-screen/conditional-draft.json',import.meta.url))).neglect;
 assert.equal(old.find(r=>r.day===50).cash,154);
 for(let day=51;day<=55;day++) {
  const r=old.find(r=>r.day===day);assert.equal(r.plants,0);assert.equal(r.planted,0);assert.equal(r.income,0);assert.equal(r.wages,30);
 }
});
test('cohort estimate conserves cash and stock without selling same-day seedlings',()=>{
 const original=JSON.stringify(input);
 for(const options of [{},{defend:false,exposure:.9}]) {
  const rows=estimate(input,options);assert.equal(rows.length,100);
  assert.equal(rows[0].harvested,0);assert.equal(rows[0].income,0);
  let cash=695,plants=1;
  for(const r of rows) {
   if(r.status==='estimate') {
    assert.equal(r.cash,cash-r.wages+r.income-r.seeds-r.wallSpend);
    assert.equal(r.plants,plants+r.planted-r.harvested-r.killed);
    assert.ok(r.wages<=cash);assert.equal(r.wages,r.staff*30);
   }else {assert.equal(r.cash,cash);assert.equal(r.plants,plants);}
   assert.ok(Number.isSafeInteger(r.cash)&&r.cash>=0);cash=r.cash;plants=r.plants;
  }
 }
 assert.equal(JSON.stringify(input),original);
});
test('saved cohort table is reproducible in both conditional scenarios',()=>{
 const saved=JSON.parse(readFileSync(new URL('../docs/qa/campaign-accounting-mathematical-screen/cohort-estimate.json',import.meta.url)));
 const hash=path=>createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
 assert.equal(saved.sourceSHA256,hash('../tools/campaign-cohort-estimate.mjs'));
 assert.equal(saved.inputSHA256,hash('../docs/qa/campaign-100-day-mathematical-projection/projection.json'));
 assert.deepEqual(saved.scenarios.conditionalDefense,estimate(input));
 assert.deepEqual(saved.scenarios.unprotected,estimate(input,{defend:false,exposure:.9}));
 assert.deepEqual(saved.scenarios.full100Hypothesis,estimate(input,{scale:.6}));
 assert.ok(saved.scenarios.full100Hypothesis.every(r=>r.status==='estimate'));
});
