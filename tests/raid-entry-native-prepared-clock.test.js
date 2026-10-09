import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {raidEntryKey} from '../src/world/raid-entry-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {animalSpec,randomInt} from '../src/simulation/rules.js';
import {serialize} from '../src/persistence/snapshots.js';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
function fixture(group=['warthog']){
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',slotId:'native-prepared-clock'}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
 nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.initialPreparation=false;s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={at:400,group:[...group],done:false};return {s,nav,eye};
}
async function prepare(s,nav){
 const before=serialize(s),preparer=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('Explicit worker-disabled fixture');}});
 try{let slices=0;while(!preparer.ready){preparer.update(s);assert.ok(++slices<20000);assert.equal(preparer.cooperativeError,undefined);await new Promise(resolve=>setImmediate(resolve));}
  assert.ok(preparer.ready.entry);assert.equal(preparer.ready.key,raidEntryKey(s,nav,s.nightPlan.group));assert.equal(serialize(s),before);return preparer;
 }catch(error){preparer.dispose();throw error;}
}
test('Native prepared QA-011 arrival preserves exact accelerated boundary and normal movement',async()=>{
 const {s,nav}=fixture();s.time=399.95;const p=await prepare(s,nav);try{
  Game.advanceReal(s,.01,nav);close(s.time,400);close(s.elapsed,.05);assert.equal(p.stats.used,1);
  const a=s.raid.animals[0];close(Math.hypot(a.x-a.spawn.x,a.z-a.spawn.z),0);
  Game.advanceReal(s,.01,nav);close(s.time,400.01);close(s.elapsed,.06);close(Math.hypot(a.x-a.spawn.x,a.z-a.spawn.z),.038);
 }finally{p.dispose();}
});
test('Native prepared QA-011 one frame equals two frames split exactly at arrival',async()=>{
 const a=fixture(),b=fixture();a.s.time=b.s.time=399.95;const pa=await prepare(a.s,a.nav),pb=await prepare(b.s,b.nav);try{
  Game.advanceReal(a.s,.02,a.nav);Game.advanceReal(b.s,.01,b.nav);Game.advanceReal(b.s,.01,b.nav);
  close(a.s.time,b.s.time);close(a.s.elapsed,b.s.elapsed);close(a.s.raid.animals[0].x,b.s.raid.animals[0].x);close(a.s.raid.animals[0].z,b.s.raid.animals[0].z);assert.deepEqual(a.s.events,b.s.events);
 }finally{pa.dispose();pb.dispose();}
});
test('Native QA-009/010/015 explicit calm night reaches one blocked dawn without free time',()=>{
 const {s,nav}=fixture();s.nightPlan=null;assert.equal(Game.clockLabel(s),'07:05');Game.advanceReal(s,300,nav);close(s.time,300);close(s.elapsed,300);assert.equal(Game.clockLabel(s),'19:05');assert.equal(s.events.filter(e=>e.type==='NightStarted').length,1);
 // Explicit calm-clock fixture, not a claim that guaranteed production raids are absent.
 s.nightPlan={at:Infinity,done:true,group:[]};Game.advanceReal(s,60,nav);assert.equal(s.day,2);assert.equal(s.completedNights,1);close(s.time,0);close(s.elapsed,600);assert.equal(Game.clockLabel(s),'07:05');assert.deepEqual(s.pauses,['hiring']);assert.equal(s.events.filter(e=>e.type==='Dawn').length,1);
 const frozen=serialize(s);Game.advanceReal(s,600,nav);assert.equal(serialize(s),frozen);
});
test('Native QA-009/010 fractional daylight/night uses each boundary speed',()=>{
 const {s,nav}=fixture();s.time=299.99;Game.advanceReal(s,.02,nav);close(s.time,300.05);close(s.elapsed,.06);assert.equal(s.raid,null);
});
test('Native prepared QA-012/013 actual last physical exit alone restores night acceleration',async()=>{
 const {s,nav}=fixture(['warthog','lion']);s.time=400;const p=await prepare(s,nav);try{
  assert.equal(spawnRaid(s,s.nightPlan,nav),'spawned');const actors=[...s.raid.animals];let steps=0,sawOneGone=false;
  while(s.raid){const time=s.time;Game.advanceReal(s,.01,nav);close(s.time-time,.01);assert.ok(++steps<5000);
   if(s.raid){assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,0);if(actors.some(a=>a.status==='gone'))sawOneGone=true;}
  }
  assert.ok(sawOneGone);for(const a of actors){assert.equal(a.status,'gone');close(Math.hypot(a.x-a.exit.x,a.z-a.exit.z),0);}assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
  const time=s.time;Game.advanceReal(s,.02,nav);close(s.time-time,.1);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
 }finally{p.dispose();}
});
test('Native prepared first spawn retains side-plus-strikes original RNG order',async()=>{
 const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'],{s,nav}=fixture(group),expected=structuredClone(s),side=randomInt(expected,0,3),strikes=group.map(id=>{const spec=animalSpec(id);return randomInt(expected,spec.hit_budget_min,spec.hit_budget_max);});
 s.time=400;const p=await prepare(s,nav);try{assert.equal(spawnRaid(s,s.nightPlan,nav),'spawned');assert.ok(s.raid);assert.equal(s.nightPlan.entryPreferredSide,side);assert.deepEqual(s.raid.animals.map(a=>a.hitsRemaining),strikes);assert.equal(s.rng,expected.rng);assert.equal(p.stats.used,1);}finally{p.dispose();}
});
test('Native prepared retry at600 retains selected side, freezes until ready and allocates only successful strikes',async()=>{
 const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'],{s,nav,eye}=fixture(group),c=s.structures[0];
 s.day=100;s.completedNights=99;s.time=599.95;nav.setActiveBounds([c.x-.01,c.z-.01,c.x+.01,c.z+.01]);Game.tick(s,.05,nav);assert.equal(s.time,600);assert.equal(s.raid,null);assert.equal(s.result,null);assert.equal(s.completedNights,99);
 const frozen=serialize(s),expected=structuredClone(s),selected=s.nightPlan.entryPreferredSide,strikes=group.map(id=>{const spec=animalSpec(id);return randomInt(expected,spec.hit_budget_min,spec.hit_budget_max);});Game.tick(s,5,nav);Game.advanceReal(s,5,nav);assert.equal(serialize(s),frozen);
 nav.setActiveBounds(activeChunkRegion(eye).bounds);const p=await prepare(s,nav);try{const elapsed=s.elapsed;Game.tick(s,.001,nav);assert.equal(s.time,600);close(s.elapsed-elapsed,.001);assert.equal(s.raid.animals.length,12);assert.equal(s.nightPlan.entryPreferredSide,selected);assert.equal(s.rng,expected.rng);assert.deepEqual(s.raid.animals.map(a=>a.hitsRemaining),strikes);assert.equal(s.nightPlan.done,true);assert.equal(s.completedNights,99);assert.equal(s.result,null);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);}finally{p.dispose();}
});
