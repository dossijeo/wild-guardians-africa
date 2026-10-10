import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {BALANCE as B} from '../src/simulation/balance.js';
import {nightThreatBudget} from '../src/simulation/raid-threat-budget.js';
import {planNight} from '../src/simulation/raids.js';
import {attraction,threatTier,randomInt,nextRandom} from '../src/simulation/rules.js';
import {createRaidCompositionIndex} from '../src/simulation/raid-composition-index.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
test('canonical calendar has exact boundary ranges and native tier fallback',()=>{
 const tier=B.threat_tiers.at(-1);
 for(const [day,min,max] of [[1,10,14],[5,10,14],[6,24,36],[15,24,36],[16,48,72],[30,48,72],[31,72,96],[100,72,96],[101,10,14]])assert.deepEqual(nightThreatBudget(day,tier),{min,max});
 for(let i=0;i<4;i++)assert.deepEqual(nightThreatBudget(99,B.threat_tiers[i]),{min:[1,3,6,12][i],max:[2,4,9,18][i]});
 assert.deepEqual(nightThreatBudget(99,tier,true),{min:10,max:14});
 const original=structuredClone(B);delete original.raids.night_budget_calendar;
 assert.deepEqual(nightThreatBudget(99,tier,false,original),{min:10,max:14});
});
test('first five introductions and postgame keep exact single timing draw',()=>{
 for(let day=1;day<=5;day++){
  const s=Game.newGame({seed:712});s.day=day;
  const oracle=structuredClone(s),at=323+nextRandom(oracle)*225;planNight(s);
  assert.deepEqual(s.nightPlan,{at,attraction:0,group:[B.animals[day-1].id],done:false,introductory:true});assert.equal(s.rng,oracle.rng);
 }
 const s=Game.newGame({seed:712});s.day=44;s.postgame=true;
 const oracle=structuredClone(s),at=323+nextRandom(oracle)*225;planNight(s);
 assert.deepEqual(s.nightPlan,{at,attraction:0,group:[],done:false});assert.equal(s.rng,oracle.rng);
});
test('ordinary plans use one budget and one uniform rank draw, independent of cash and spells',()=>{
 for(const day of [6,15,16,30,31,100]){
  const s=Game.newGame({seed:712});s.day=day;
  s.plants=Array.from({length:220},(_,i)=>({id:'plant'+i,species:'mijo',alive:true,x:i*1.5,z:0}));
  const oracle=structuredClone(s),at=323+nextRandom(oracle)*225,tier=threatTier(attraction(s.plants)),range=nightThreatBudget(day,tier);
  const budget=randomInt(oracle,range.min,range.max),index=createRaidCompositionIndex(budget,tier.unlocked_species),group=index.at(randomInt(oracle,0,index.count-1));
  planNight(s);assert.deepEqual(s.nightPlan,{at,attraction:2420,group,done:false});assert.equal(s.rng,oracle.rng);
  const loaded=deserialize(serialize(s));assert.deepEqual(loaded.nightPlan,s.nightPlan);assert.equal(loaded.rng,s.rng);
  const other=structuredClone(oracle);other.nightPlan=null;other.rng=Game.newGame({seed:712}).rng;other.ledger.balance={n:'99999999',d:'1'};other.spells=[{kind:'shield',remaining:999},{kind:'multiply',remaining:999}];
  planNight(other);assert.deepEqual(other.nightPlan,s.nightPlan);assert.equal(other.rng,s.rng);
 }
});
