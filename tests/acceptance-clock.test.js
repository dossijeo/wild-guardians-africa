import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize} from '../src/persistence/snapshots.js';
import {close,nativeRaidClockFixture as fixture,prepareNativeRaidEntry as prepare} from './helpers/native-raid-entry.js';

test('QA-011: accelerated night splits at raid arrival before moving the animal at normal speed',async()=>{
 const {s,nav}=fixture();s.time=399.95;const p=await prepare(s,nav);try{
  Game.advanceReal(s,.01,nav);close(s.time,400);close(s.elapsed,.05);assert.equal(p.stats.used,1);
  const a=s.raid.animals[0];close(Math.hypot(a.x-a.spawn.x,a.z-a.spawn.z),0);
  Game.advanceReal(s,.01,nav);close(s.time,400.01);close(s.elapsed,.06);close(Math.hypot(a.x-a.spawn.x,a.z-a.spawn.z),.038);
 }finally{p.dispose();}
});
test('QA-011: one real frame straddling raid arrival matches two frames split at its boundary',async()=>{
 const a=fixture(),b=fixture();a.s.time=b.s.time=399.95;const pa=await prepare(a.s,a.nav),pb=await prepare(b.s,b.nav);try{
  Game.advanceReal(a.s,.02,a.nav);Game.advanceReal(b.s,.01,b.nav);Game.advanceReal(b.s,.01,b.nav);
  close(a.s.time,b.s.time);close(a.s.elapsed,b.s.elapsed);close(a.s.raid.animals[0].x,b.s.raid.animals[0].x);close(a.s.raid.animals[0].z,b.s.raid.animals[0].z);assert.deepEqual(a.s.events,b.s.events);
 }finally{pa.dispose();pb.dispose();}
});
test('QA-009/010/015: 300 real daytime seconds and 60 calm-night seconds reach one blocked dawn',()=>{
 const {s,nav}=fixture();s.nightPlan=null;assert.equal(Game.clockLabel(s),'07:05');Game.advanceReal(s,300,nav);close(s.time,300);close(s.elapsed,300);assert.equal(Game.clockLabel(s),'19:05');assert.equal(s.events.filter(e=>e.type==='NightStarted').length,1);
 // Explicit calm-clock fixture, not a claim that guaranteed production raids are absent.
 // Oversized real-time request must stop after the 60-second calm night at
 // mandatory hiring, without consuming the remaining request as free time.
 s.nightPlan={at:Infinity,done:true,group:[]};Game.advanceReal(s,600,nav);assert.equal(s.day,2);assert.equal(s.completedNights,1);close(s.time,0);close(s.elapsed,600);assert.equal(Game.clockLabel(s),'07:05');assert.deepEqual(s.pauses,['hiring']);assert.equal(s.events.filter(e=>e.type==='Dawn').length,1);
 const frozen=serialize(s);Game.advanceReal(s,600,nav);assert.equal(serialize(s),frozen);
});
test('QA-009/010: fractional daylight-to-night frame uses each side of the boundary at its own speed',()=>{
 const {s,nav}=fixture();s.time=299.99;Game.advanceReal(s,.02,nav);close(s.time,300.05);close(s.elapsed,.06);assert.equal(s.raid,null);
});
test('QA-010: a full calm night preserves growth and remaining water tolerance',()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana'}),c=s.structures[0];assert.equal(Game.plant(s,'banana-clock','platano',c.x+5,c.z+6,nav),true);
 const p=s.plants[0];p.growth=p.water[1].at;p.water[0].status='manual';p.water[1].status='due';p.water[1].wait=13.75;
 s.initialPreparation=false;s.tutorial.step='done';s.time=300;s.dayPlan={done:true};s.nightPlan={at:Infinity,done:true,group:[]};const before=JSON.stringify(p);Game.advanceReal(s,60,nav);assert.equal(s.day,2);assert.equal(JSON.stringify(p),before);
});
test('QA-012/013: only the last animal leaving restores accelerated night and emits one end',async()=>{
 const {s,nav}=fixture(['warthog','lion']);s.time=400;const p=await prepare(s,nav);try{
  assert.equal(spawnRaid(s,s.nightPlan,nav),'spawned');const actors=[...s.raid.animals];let steps=0,sawOneGone=false;
  while(s.raid){const time=s.time;Game.advanceReal(s,.01,nav);close(s.time-time,.01);assert.ok(++steps<5000);
   if(s.raid){assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,0);if(actors.some(a=>a.status==='gone'))sawOneGone=true;}
  }
  assert.ok(sawOneGone);for(const a of actors){assert.equal(a.status,'gone');close(Math.hypot(a.x-a.exit.x,a.z-a.exit.z),0);}assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
  const time=s.time;Game.advanceReal(s,.02,nav);close(s.time-time,.1);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
 }finally{p.dispose();}
});
test('QA-007/014: blocked real-time advances preserve every field until all pause causes clear',()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana'});s.initialPreparation=false;s.tutorial.step='done';Game.pause(s,'menu');Game.pause(s,'hidden');let before=serialize(s);Game.advanceReal(s,1800,nav);assert.equal(serialize(s),before);
 Game.resume(s,'hidden');before=serialize(s);Game.advanceReal(s,1800,nav);assert.equal(serialize(s),before);Game.resume(s,'menu');Game.advanceReal(s,.02,nav);close(s.time,.02);close(s.elapsed,.02);
});
