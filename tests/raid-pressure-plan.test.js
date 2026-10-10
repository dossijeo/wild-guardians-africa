import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePressureNight,nextPressureWave} from '../src/simulation/raid-pressure-plan.js';
const state=(day=6)=>({day,rng:712,plants:Array.from({length:1000},()=>({alive:true,species:'platano'})),postgame:false});
test('night preparation is pure, deterministic, cash-independent and bounded into physical cohorts',()=>{
 const s=state(100),before=JSON.stringify(s),a=preparePressureNight(s);
 assert.equal(JSON.stringify(s),before);assert.deepEqual(a,preparePressureNight({...s,cash:999999}));
 assert.equal(a.plan.pressureFacts.pressure,1);assert.equal(a.plan.waves.flat().length,34);
 assert.deepEqual(a.plan.waves.map(w=>w.length),[16,16,2]);
 assert.ok(a.plan.pressureFacts.potential<=a.plan.pressureFacts.budget);
 assert.ok(a.plan.waves.flat().every(a=>a.damageProfile.areaCap===7));
});
test('initial five species preserve original single-target profiles',()=>{
 const ids=['warthog','hyena','buffalo','lion','rhino'];
 for(let day=1;day<=5;day++){const a=preparePressureNight(state(day));assert.deepEqual(a.plan.group,[ids[day-1]]);assert.equal(a.plan.actors.length,1);assert.equal(a.plan.actors[0].damageProfile,undefined);}
});
test('committed plan survives retry and JSON reload without advancing RNG or EMA',()=>{
 const s=state(),a=preparePressureNight(s),committed={...s,rng:a.rng,nightPlan:a.plan,raidPressureMemory:a.memory};
 const retry=preparePressureNight(JSON.parse(JSON.stringify(committed)));
 assert.equal(retry.reused,true);assert.equal(retry.rng,a.rng);assert.deepEqual(retry.plan,a.plan);assert.deepEqual(retry.memory,a.memory);
 const tomorrow=preparePressureNight({...committed,day:7,nightPlan:null,plants:[]});assert.ok(tomorrow.memory.ema>0);
});
test('postgame permanently produces no actors and does not advance agricultural EMA',()=>{
 const s={...state(180),postgame:true,raidPressureMemory:{version:1,lastDay:100,sample:10,ema:20}},a=preparePressureNight(s);
 assert.deepEqual(a.plan.waves,[]);assert.deepEqual(a.plan.group,[]);assert.deepEqual(a.memory,s.raidPressureMemory);
});
test('pending waves wait for actual departure and copy immutable descriptors',()=>{
 const p=preparePressureNight(state(100)).plan,raid={waveIndex:0,waves:p.waves,animals:[{status:'exiting'}]};
 assert.equal(nextPressureWave(raid,599),null);raid.animals[0].status='gone';
 const next=nextPressureWave(raid,601);assert.equal(next.index,1);assert.equal(next.at,601);assert.equal(next.actors.length,16);
 next.actors[0].hits=0;assert.notEqual(raid.waves[1][0].hits,0);
 raid.waveIndex=2;assert.equal(nextPressureWave(raid,602),null);
});
