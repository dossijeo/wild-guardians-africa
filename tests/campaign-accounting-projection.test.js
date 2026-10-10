import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compositionExpectation,nightlyExpectation,project} from '../tools/project-campaign-accounting.mjs';
const data=JSON.parse(readFileSync(new URL('../docs/qa/campaign-100-day-mathematical-projection/projection.json',import.meta.url)));
const B=data.referenceBalance;
test('opening uses one pre-existing seed and agrees with retained original money and crop stock',()=>{
 const first=project(B,data.calibration)[0];
 assert.equal(first.cash,data.calibration.opening.money);assert.equal(first.plants,data.calibration.opening.living);
 assert.equal(first.planted,data.calibration.opening.planted);assert.equal(first.harvested,data.calibration.opening.delivered);
 assert.equal(first.staff,data.calibration.opening.staff);assert.equal(first.wages,210);assert.equal(first.seeds,585);
});
test('each of 100 accounting rows reconciles money and aggregate crop stocks in both scenarios',()=>{
 for(const arm of ['responsible','neglect']){
  const rows=project(B,data.calibration,{arm});assert.equal(rows.length,100);
  let cash=700,plants=1,walls=0;
  for(const r of rows){
   assert.equal(r.cash,cash+r.income-r.wages-r.seeds-r.wallCost-r.repairs);
   assert.equal(r.plants,plants+r.planted-r.harvested-r.killed);
   assert.equal(r.walls,walls+r.newWalls);assert.ok(r.cash>=0&&r.plants>=0);
   assert.ok(r.planted<=280&&r.animals>=r.animalMin&&r.animals<=r.animalMax);
   assert.ok(r.targets>=1&&r.targets<=7);assert.ok(r.force===1||r.force===2);
   cash=r.cash;plants=r.plants;walls=r.walls;
  }
 }
});
test('intro species hit budget is the native minimum, and impossible preferred minimum falls back legally',()=>{
 assert.equal(nightlyExpectation(B,1,1000000).hits,B.animals[0].hit_budget_min);
 const e=compositionExpectation(B,1,['warthog'],{min_animals:6,max_animals:12,species_caps:[8,5,4,3,2]});
 assert.deepEqual({animals:e.animals,min:e.min,max:e.max},{animals:1,min:1,max:1});
});
