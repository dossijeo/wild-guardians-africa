import assert from 'node:assert/strict';
import test from 'node:test';
import {BALANCE} from '../src/simulation/balance.js';
import {attraction} from '../src/simulation/rules.js';
const baseline={mijo:11,girasol:36,sorgo:13,maiz:17,batata:23,algodon:178,yuca:32,platano:267};
test('attraction is explicit and independent of income, growth and magic state',()=>{
 for(const crop of BALANCE.crops){
  assert.ok(Number.isSafeInteger(crop.base_attraction_value)&&crop.base_attraction_value>0);
  for(const flags of [{},{growth:0},{growth:crop.growth_seconds},{multiplyHarvest:true},{toleranceBonus:.3},{water:[{status:'due',wait:0}]},{shield:true,growthMagic:true}]){
   const p={alive:true,species:crop.id,...flags};
   assert.equal(attraction([p]),crop.base_attraction_value);
   assert.equal(attraction([{...p,alive:false}]),0);
  }
 }
});
test('E2/F preserve baseline attraction for every species independently of receipts',()=>{
 for(const c of BALANCE.crops){assert.equal(c.base_attraction_value,baseline[c.id]);assert.ok([2,3].includes(c.base_harvest_value/baseline[c.id]),'Isolated E2/F harvest candidate');}
 const plants=BALANCE.crops.flatMap(c=>Array.from({length:3},()=>({species:c.id,alive:true,multiplyHarvest:true})));
 assert.equal(attraction(plants),3*Object.values(baseline).reduce((a,b)=>a+b,0));
});
