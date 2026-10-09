import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {attraction,threatTier,compositions} from '../src/simulation/rules.js';
import {planNight} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Independent contract table: do not derive the expected values from BALANCE.
const species=['warthog','hyena','buffalo','lion','rhino'],costs=[1,3,5,7,10],caps=[3,2,2,2,1];
const tiers=[
 [0,100,1,1,2,1], [100,300,1,3,4,2],
 [300,800,1,5,7,3], [800,2000,1,7,10,4],
 [2000,null,1,10,14,5],
].map(([min,max,p,lo,hi,n])=>({attraction_min:min,attraction_max_exclusive:max,night_attack_probability:p,threat_min:lo,threat_max:hi,unlocked_species:species.slice(0,n)}));
const signature=group=>species.map(id=>group.filter(x=>x===id).length).join(',');
function expectedCompositions(budget,unlocked){
 let vectors=[[]];
 for(let i=0;i<species.length;i++)vectors=vectors.flatMap(v=>Array.from({length:unlocked.includes(species[i])?caps[i]+1:1},(_,n)=>[...v,n]));
 return vectors.filter(v=>{const count=v.reduce((a,b)=>a+b,0),spent=v.reduce((a,n,i)=>a+n*costs[i],0);return count>0&&count<=5&&spent*4>=budget*3&&spent<=budget;}).map(v=>v.join(',')).sort();
}
function fixture(){const s=Game.newGame({seed:712,slotId:'raid-planning'});s.day=6;s.plants=Array.from({length:111},(_,i)=>({id:'crop-'+i,species:'mijo',alive:true,growth:0}));return s;}
function permutations(list){return list.length?list.flatMap((x,i)=>permutations(list.filter((_,j)=>j!==i)).map(rest=>[x,...rest])):[[]];}

test('QA-087: all ten attraction boundaries select the exact confirmed tier',()=>{
 for(const [value,index] of [[0,0],[1,0],[99,0],[100,1],[299,1],[300,2],[799,2],[800,3],[1999,3],[2000,4]])assert.deepEqual(threatTier(value),index<0?null:tiers[index],String(value));
});

test('QA-087: actual living plant base values drive night planning independently of cash, crates, maturity and yield bonuses',()=>{
 const s=fixture();s.plants.push({id:'dead',species:'platano',alive:false,growth:999});assert.equal(attraction(s.plants),1554);
 const empty=Game.newGame({seed:712});empty.day=6;empty.ledger.balance=rational(999999999);empty.crates=[{value:rational(999999999),delivered:false}];planNight(empty);assert.equal(empty.nightPlan.attraction,0);assert.ok(empty.nightPlan.group.length>0);
 const reference=structuredClone(s);planNight(reference);
 for(const balance of [0,100,999999999]){
  const other=structuredClone(s);other.ledger.balance=rational(balance);other.crates=[{value:rational(999999999),delivered:false}];
  for(const plant of other.plants){plant.growth=999999;plant.harvestBonus=30;plant.harvestRequested=true;}
  other.spells=[{kind:'multiply',remaining:15,x:0,z:0,radius:1000}];planNight(other);
  assert.deepEqual(other.nightPlan,reference.nightPlan);assert.equal(other.rng,reference.rng);
 }
});

test('QA-088 revised: the first-night clock spawns one mandatory warthog with zero attraction and preserves its plan on reload',()=>{
 const nav={placement:()=>({valid:true}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
 let s=Game.newGame({seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);s.initialPreparation=false;
 Game.tick(s,300.01,nav);assert.equal(s.day,1);assert.equal(s.nightPlan.attraction,0);assert.deepEqual(s.nightPlan.group,['warthog']);
 assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,0);
 s=deserialize(serialize(s));Game.tick(s,s.nightPlan.at-s.time+.01,nav);
 assert.deepEqual(s.raid.animals.map(a=>a.species),['warthog']);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);
 assert.equal(s.raid.animals[0].hitsRemaining,2);
 s=deserialize(serialize(s));Game.tick(s,.1,nav);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);
 const ordinary=Game.newGame({seed:712});ordinary.day=2;planNight(ordinary);assert.deepEqual(ordinary.nightPlan.group,['hyena']);
});

test('QA-089 revised: a thousand guaranteed nightly plans use fresh independent timing and composition draws',()=>{
 const s=fixture();let oracle=s.rng;const groups=new Set();
 const draw=()=>{oracle^=oracle<<13;oracle^=oracle>>>17;oracle^=oracle<<5;oracle>>>=0;return oracle/4294967296;};
 for(let i=0;i<1000;i++){
  const when=draw();draw();draw();
  s.day=6+i;s.completedNights=5+i;planNight(s);
  assert.equal(s.nightPlan.at,323+when*225);assert.ok(s.nightPlan.group.length>0);assert.equal(s.rng,oracle);
  groups.add(signature(s.nightPlan.group));s.nightPlan.done=true;
 }
 assert.ok(groups.size>1,'Composition remains random while the nightly incursion is guaranteed');
});

test('QA-090: budget three chooses precisely three warthogs or one unlocked hyena',()=>{
 assert.deepEqual(compositions(3,['warthog','hyena']),[['hyena'],['warthog','warthog','warthog']]);
});

test('QA-091: sixteen night and four daytime budgets exactly match an independent Cartesian count oracle',()=>{
 let checked=0;
 const contexts=[...tiers,{attraction_min:'daytime',threat_min:7,threat_max:10,unlocked_species:species}];
 for(const tier of contexts)for(let budget=tier.threat_min;budget<=tier.threat_max;budget++){
  const groups=compositions(budget,tier.unlocked_species),keys=groups.map(signature).sort();
  assert.ok(groups.length);assert.equal(new Set(keys).size,keys.length);
  assert.deepEqual(keys,expectedCompositions(budget,tier.unlocked_species),`budget ${budget} / ${tier.attraction_min}`);checked++;
 }
 assert.equal(checked,20);
});

test('QA-092: all 120 unlocked-order permutations and repeated IDs preserve the same unweighted composition list',()=>{
 const canonical=compositions(14,species);
 for(const order of permutations(species))assert.deepEqual(compositions(14,[...order,...order]),canonical);
 assert.equal(new Set(canonical.map(signature)).size,canonical.length);
});

test('QA-093: affordable locked lions and rhinos cannot enter the legal composition pool',()=>{
 for(const [budget,unlocked,locked] of [[7,species.slice(0,3),'lion'],[10,species.slice(0,4),'rhino']]){
  const groups=compositions(budget,unlocked);assert.ok(groups.length);assert.ok(costs[species.indexOf(locked)]<=budget);
  assert.ok(groups.every(g=>!g.includes(locked)));assert.ok(compositions(budget,[...unlocked,locked]).some(g=>g.includes(locked)));
 }
});
