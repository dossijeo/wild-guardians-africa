import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {estimate,seedQuote,seedPurchaseReserve} from '../tools/campaign-cohort-estimate.mjs';
import {projectControlled} from '../tools/project-policy-controlled-scarcity.mjs';
const raw=readFileSync(new URL('../docs/qa/campaign-100-day-mathematical-projection/projection.json',import.meta.url)),input=JSON.parse(raw);
test('controlled investment preserves next-day staffing on purchases and bounds perimeter budget',()=>{
 const original=JSON.stringify(input),result=projectControlled(input);
 for(const rows of [result.baseline,result.inflated]) {
  let cash=695,plants=1,walls=0,peak=1;
  for(const r of rows) {
   assert.equal(r.status,'estimate');assert.equal(r.cash,cash-r.wages+r.income-r.seeds-r.wallSpend);
   assert.equal(r.plants,plants+r.planted-r.harvested-r.killed);
   if(r.planted)assert.ok(r.cash>=Math.ceil((r.plants+r.killed)/6)*30);
   peak=Math.max(peak,r.openingPlants-r.harvested);
   const target=Math.ceil(8*Math.ceil((Math.sqrt(peak*2.25)/2+3)/6)*6/2.18);
   assert.ok(r.newWalls<=Math.max(0,target-walls));
   peak=Math.max(peak,r.plants+r.killed);cash=r.cash;plants=r.plants;walls=r.walls;
  }
 }
 assert.equal(JSON.stringify(input),original);
 // The bounded purchasing policy must not silently buy 32 pieces forever.
 assert.ok(result.inflated.some(r=>r.day>20&&r.newWalls===0));
 assert.throws(()=>estimate(input,{policy:{reserveDays:-1,walls:'perimeter-budget'}}));
});
test('empty-farm recovery at the real 35-coin minimum does not demand a future reserve',()=>{
 const policy={reserveDays:1,walls:'perimeter-budget',deliveryBand:'calendar'};
 assert.equal(seedPurchaseReserve(0,policy),0);
 assert.ok(35-30>=seedQuote(5,0)+seedPurchaseReserve(0,policy));
 assert.equal(seedPurchaseReserve(6,policy),60);
});
test('controlled projection, sensitivity and source hashes are reproducible',()=>{
 const actual=projectControlled(input),saved=JSON.parse(readFileSync(new URL('../docs/qa/seed-scarcity-policy-controlled/projection.json',import.meta.url)));
 for(const k of Object.keys(actual))assert.deepEqual(saved[k],actual[k]);
 assert.equal(saved.inputSHA256,createHash('sha256').update(raw).digest('hex'));
 for(const [name,sha] of Object.entries(saved.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../tools/'+name,import.meta.url))).digest('hex'),sha);
 assert.equal(actual.sensitivity.length,15);assert.equal(actual.productivity.length,3);
 for(const r of actual.seedBreakEven){assert.ok(seedQuote(r.seedBase,r.firstUnprofitableLivingPlants,actual.scarcity)>r.payout);assert.ok(seedQuote(r.seedBase,r.firstUnprofitableLivingPlants-1,actual.scarcity)<=r.payout);}
});
