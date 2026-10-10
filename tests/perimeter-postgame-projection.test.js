import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectPerimeter} from '../tools/project-perimeter-postgame.mjs';
const raw=readFileSync(new URL('../docs/qa/campaign-100-day-mathematical-projection/projection.json',import.meta.url)),input=JSON.parse(raw);
test('finite walls conserve stock, replacement debt and paid cash; never purchase beyond footprint',()=>{
 const before=JSON.stringify(input),result=projectPerimeter(input);
 for(const rows of Object.values(result.cases)) {
  let cash=695,walls=0,debt=0,peak=1;
  for(const r of rows){
   assert.equal(r.status,'estimate');
   assert.equal(r.cash,cash-r.wages+r.income-r.seeds-r.wallSpend-r.repairs);
   assert.equal(r.walls,walls+r.newWalls-r.wallsDestroyed);
   assert.equal(r.replacementDebt,debt-r.replacements+r.wallsDestroyed);
   assert.equal(r.replacements,Math.min(r.newWalls,debt));
   peak=Math.max(peak,r.openingPlants-r.harvested);
   const quota=Math.ceil(8*Math.ceil((Math.sqrt(peak*2.25)/2+3)/6)*6/2.18);
   assert.ok(r.newWalls<=Math.max(0,quota-walls));
   assert.equal(r.wallSpend,r.newWalls*3);assert.ok(Number.isInteger(r.repairs));
   assert.ok(r.wallHPRemaining<=r.walls*100+1e-7);
   if(r.day>=101){assert.equal(r.animals,0);assert.equal(r.wallDamage,0);assert.equal(r.wallsDestroyed,0);}
   peak=Math.max(peak,r.plants+r.killed);cash=r.cash;walls=r.walls;debt=r.replacementDebt;
  }
  assert.ok(rows.some(r=>r.day>101&&r.newWalls===0&&r.repairs===0));
 }
 assert.equal(JSON.stringify(input),before);
});
test('postgame strategies share the campaign and save only by choosing to limit reinvestment',()=>{
 const r=projectPerimeter(input);
 for(const k of ['base','scarcity']){
  assert.deepEqual(r.cases[k+'Hold'].slice(0,100),r.cases[k+'Expand'].slice(0,100));
  const limit=r.cases[k+'Hold'][99].plants;
  for(const day of r.cases[k+'Hold'].slice(100))assert.ok(day.plants<=limit);
 }
 assert.equal(r.postgame.scarcityHold.affordability.find(a=>a.price===50000).firstDay,137);
 assert.equal(r.postgame.scarcityExpand.affordability.find(a=>a.price===50000).firstDay,null);
 for(const [name,v] of Object.entries(r.postgame))for(const a of v.affordability)if(a.firstDay){
  const eligible=d=>d.day>=101&&d.cash-Math.ceil(d.plants/6)*30>=a.price;
  assert.equal(r.cases[name].find(eligible).day,a.firstDay);
 }
});
test('perimeter/postgame evidence and source hashes reproduce exactly',()=>{
 const saved=JSON.parse(readFileSync(new URL('../docs/qa/perimeter-postgame-projection/projection.json',import.meta.url))),actual=projectPerimeter(input);
 for(const key of Object.keys(actual))assert.deepEqual(saved[key],actual[key]);
 assert.equal(saved.inputSHA256,createHash('sha256').update(raw).digest('hex'));
 for(const [name,sha] of Object.entries(saved.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../tools/'+name,import.meta.url))).digest('hex'),sha);
});
