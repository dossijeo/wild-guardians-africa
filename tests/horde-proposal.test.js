import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE as B} from '../src/simulation/balance.js';
import {compositions,attraction,animalSpec,wallSpec} from '../src/simulation/rules.js';
import {planNight} from '../src/simulation/raids.js';
import * as Game from '../src/simulation/game.js';
import {HORDE_STAGES,stageFor,economicProposal,proposalAttraction,enumerateProposal,proposalGroups} from '../tools/horde-proposal.mjs';

test('Economic arithmetic honours tutorial800/minwage30, triples sales and preserves base attraction including magic',()=>{
 const original=JSON.stringify(B),copy=economicProposal();assert.equal(copy.work_center.cost,800);assert.equal(copy.workers.older_wage,30);assert.equal(copy.workers.young_wage,40);assert.equal(copy.workers.daily_run_distance_long_trips,4);
 const plants=B.crops.flatMap(c=>[{species:c.id,alive:true},{species:c.id,alive:true,multiplyHarvest:true},{species:c.id,alive:false}]);
 for(let i=0;i<B.crops.length;i++){assert.equal(copy.crops[i].base_harvest_value,B.crops[i].base_harvest_value*3);assert.equal(copy.crops[i].base_attraction_value,B.crops[i].base_harvest_value);}
 assert.equal(proposalAttraction(plants,copy),attraction(plants));assert.equal(JSON.stringify(B),original);
});
test('Bounded composition model reproduces every native original tier/budget exactly at cap5',()=>{
 for(const tier of B.threat_tiers)for(let budget=tier.threat_min;budget<=tier.threat_max;budget++)assert.deepEqual(enumerateProposal(budget,tier.unlocked_species).groups,compositions(budget,tier.unlocked_species));
});
test('Stage boundaries and native first-five single-animal introductions remain intact',()=>{
 for(const day of [1,2,3,4,5]){
  assert.equal(stageFor(day),null);const s=Game.newGame({seed:712});s.day=day;planNight(s);assert.deepEqual(s.nightPlan.group,[B.animals[day-1].id]);assert.equal(s.nightPlan.introductory,true);
  assert.throws(()=>proposalGroups(day,14,B.animals.map(a=>a.id)),/native single/);
 }
 for(const stage of HORDE_STAGES){assert.equal(stageFor(stage.first),stage);assert.equal(stageFor(stage.last),stage);}
 assert.throws(()=>stageFor(101));assert.throws(()=>stageFor(0));
});
test('All proposed tier-budget compositions have legal unlocked species, cost, counts and bounded enumeration',()=>{
 let cases=0,maximumVisited=0;
 for(const stage of HORDE_STAGES)for(const tier of B.threat_tiers)for(let budget=Math.ceil(tier.threat_min*stage.budgetScale);budget<=Math.ceil(tier.threat_max*stage.budgetScale);budget++){
  const {groups,visited}=proposalGroups(stage.first,budget,tier.unlocked_species);assert.ok(groups.length,`stage${stage.first}/budget${budget}`);maximumVisited=Math.max(maximumVisited,visited);cases++;
  for(const group of groups){assert.ok(group.length>=Math.min(stage.minAnimals,budget)&&group.length<=stage.maxAnimals);const counts=new Map();let cost=0;
   for(const id of group){assert.ok(tier.unlocked_species.includes(id));counts.set(id,(counts.get(id)??0)+1);cost+=animalSpec(id).threat_cost;}
   assert.ok(cost>=Math.ceil(.75*budget)&&cost<=budget);for(const [id,count]of counts)assert.ok(count<=stage.speciesCaps[B.animals.findIndex(a=>a.id===id)]);
  }
 }
 assert.ok(cases>50);assert.ok(maximumVisited<5000,'Diagnostic combinatorial guard, not a nightly performance acceptance claim');
});
test('No new damage or hit budget is smuggled into the arithmetic proposal, and actual wall costs remain paid design values',()=>{
 assert.deepEqual(economicProposal().animals,B.animals);assert.equal(wallSpec('zarzas').cost,10);assert.equal(wallSpec('adobe').cost,35);assert.equal(wallSpec('piedra').cost,80);
});
