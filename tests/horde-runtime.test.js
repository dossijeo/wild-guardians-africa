import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE as B} from '../src/simulation/balance.js';
import {compositions,attraction} from '../src/simulation/rules.js';
import {planNight,planDay} from '../src/simulation/raids.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {enumerateProposal,HORDE_STAGES} from '../tools/horde-proposal.mjs';

test('Candidate economics honour immutable audio prices and original attraction',()=>{
 assert.equal(B.work_center.cost,800);assert.equal(B.workers.older_wage,30);assert.equal(B.workers.young_wage,40);assert.equal(B.workers.daily_run_distance_long_trips,4);
 assert.deepEqual(B.crops.map(c=>c.base_attraction_value),[11,36,13,17,23,178,32,267]);
 for(const c of B.crops)assert.equal(c.base_harvest_value,c.base_attraction_value*3);
 assert.deepEqual(B.animals.map(a=>a.structure_hit_damage),[10,12.5,17.5,20,30]);
 const mixed=B.crops.flatMap(c=>[{species:c.id,alive:true,multiplyHarvest:true},{species:c.id,alive:false}]);
 assert.equal(attraction(mixed),577);
});

test('Default compositions preserve original order and remain immutable and cached',()=>{
 for(const tier of B.threat_tiers)for(let budget=tier.threat_min;budget<=tier.threat_max;budget++){
  const groups=compositions(budget,tier.unlocked_species);assert.deepEqual(groups,enumerateProposal(budget,tier.unlocked_species).groups);
  assert.equal(compositions(budget,tier.unlocked_species),groups);assert.ok(Object.isFrozen(groups));
  for(const group of groups)assert.ok(Object.isFrozen(group));assert.throws(()=>groups.push([]),TypeError);
 }
 assert.throws(()=>compositions(42,B.animals.map(a=>a.id),{maxAnimals:13}));
 assert.throws(()=>compositions(42,B.animals.map(a=>a.id),{maxAnimals:12,speciesCaps:[1]}));
});

test('Runtime stages equal reviewed recipe and accept budget-limited minima without empty groups',()=>{
 assert.deepEqual(B.raids.night_horde_stages,HORDE_STAGES.map(s=>({first:s.first,last:s.last,max_animals:s.maxAnimals,min_animals:s.minAnimals,budget_scale:s.budgetScale,species_caps:s.speciesCaps})));
 for(const stage of B.raids.night_horde_stages)for(const tier of B.threat_tiers)for(let b=tier.threat_min;b<=tier.threat_max;b++){
  const budget=Math.ceil(b*stage.budget_scale),groups=compositions(budget,tier.unlocked_species,{maxAnimals:stage.max_animals,minAnimals:stage.min_animals,speciesCaps:stage.species_caps});
  assert.ok(groups.length);assert.ok(groups.every(g=>g.length>=Math.min(stage.min_animals,budget)&&g.length<=stage.max_animals));
 }
 assert.deepEqual(compositions(3,['warthog'],{maxAnimals:12,minAnimals:6,speciesCaps:[8,5,4,3,2]}),[['warthog','warthog','warthog']]);
});

test('Composition cache evicts old entries while preserving exact immutable results',()=>{
 const ids=B.animals.map(a=>a.id),first=compositions(1,ids);
 for(let budget=2;budget<=131;budget++)compositions(budget,ids);
 const regenerated=compositions(1,ids);assert.notEqual(regenerated,first);assert.deepEqual(regenerated,first);assert.ok(Object.isFrozen(regenerated));
});

test('Selected night group and planning night survive saves with no RNG reroll; legacy plans are untouched',()=>{
 for(const day of [1,5,6,10,11,20,21,40,41,100]){
  const s=Game.newGame({seed:712});s.day=day;planNight(s);const original=serialize(s),restored=deserialize(original);
  assert.equal(restored.nightPlan.plannedNight,day);assert.deepEqual(restored.nightPlan,s.nightPlan);assert.equal(restored.rng,s.rng);assert.equal(serialize(restored),original);
  // Crossing a stage boundary cannot alter an already chosen group.
  restored.day=day+1;assert.deepEqual(restored.nightPlan.group,s.nightPlan.group);
 }
 const legacy=Game.newGame({seed:712});legacy.day=41;legacy.nightPlan={at:400,group:['rhino'],done:false};
 const snapshot=serialize(legacy);assert.equal(serialize(deserialize(snapshot)),snapshot);
});

test('Day planning does not consult horde stages and original daytime constraints stay unchanged',()=>{
 const s=Game.newGame({seed:712}),reference=structuredClone(s);planDay(s);reference.day=100;planDay(reference);
 assert.deepEqual(s.dayPlan,reference.dayPlan);assert.equal(s.rng,reference.rng);assert.equal(B.raids.max_animals,5);assert.deepEqual(B.raids.day_threat,[7,10]);
});
