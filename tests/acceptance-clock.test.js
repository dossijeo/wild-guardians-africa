import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resume,pause,placeStructure,advanceReal,clockLabel} from '../src/simulation/game.js';
import {rational} from '../src/simulation/money.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {createPlant} from '../src/simulation/crops.js';

const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(_start,end)=>[{x:end.x,z:end.z}]};
function fixture(){
  const s=newGame({seed:712,slotId:'acceptance-clock'});resume(s,'intro');s.tutorial.step='center';
  placeStructure(s,'centre',{x:4,z:0},nav);s.initialPreparation=false;s.ledger.balance=rational(1000);
  return s;
}
function scheduledRaid(){const s=fixture();s.time=399.95;s.nightPlan={at:400,done:false,group:['warthog']};return s;}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('QA-011: accelerated night splits at raid arrival before moving the animal at normal speed',()=>{
  const s=scheduledRaid();advanceReal(s,.01,nav);
  close(s.time,400);close(s.elapsed,.05);
  const a=s.raid.animals[0];close(Math.hypot(a.x-a.spawn.x,a.z-a.spawn.z),0);
  advanceReal(s,.01,nav);close(s.time,400.01);close(s.elapsed,.06);
  close(Math.hypot(a.x-a.spawn.x,a.z-a.spawn.z),.038);
});

test('QA-011: one real frame straddling raid arrival matches two frames split at its boundary',()=>{
  const whole=scheduledRaid(),split=scheduledRaid();advanceReal(whole,.02,nav);
  advanceReal(split,.01,nav);advanceReal(split,.01,nav);
  close(whole.time,split.time);close(whole.elapsed,split.elapsed);
  close(whole.raid.animals[0].x,split.raid.animals[0].x);
  close(whole.raid.animals[0].z,split.raid.animals[0].z);
  assert.deepEqual(whole.events,split.events);
});

test('QA-009/010/015: 300 real daytime seconds and 60 calm-night seconds reach one blocked dawn',()=>{
  const s=fixture();assert.equal(clockLabel(s),'07:05');advanceReal(s,300,nav);
  close(s.time,300);close(s.elapsed,300);assert.equal(clockLabel(s),'19:05');
  assert.equal(s.events.filter(e=>e.type==='NightStarted').length,1);
  advanceReal(s,600,nav);assert.equal(s.day,2);assert.equal(s.completedNights,1);
  close(s.time,0);close(s.elapsed,600);assert.equal(clockLabel(s),'07:05');
  assert.deepEqual(s.pauses,['hiring']);assert.equal(s.events.filter(e=>e.type==='Dawn').length,1);
  const frozen=JSON.stringify(s);advanceReal(s,600,nav);assert.equal(JSON.stringify(s),frozen);
});

test('QA-009/010: fractional daylight-to-night frame uses each side of the boundary at its own speed',()=>{
  const s=fixture();s.time=299.99;advanceReal(s,.02,nav);
  close(s.time,300.05);close(s.elapsed,.06);assert.equal(s.raid,null);
});

test('QA-010: a full calm night preserves growth and remaining water tolerance',()=>{
  const s=fixture();s.time=300;s.nightPlan={at:Infinity,done:true,group:[]};
  const p=createPlant('banana','platano',8,0,s.structures[0].id);
  p.growth=p.water[1].at;p.water[0].status='manual';p.water[1].status='due';p.water[1].wait=13.75;
  s.plants.push(p);const before=JSON.stringify(p);advanceReal(s,60,nav);
  assert.equal(s.day,2);assert.equal(JSON.stringify(p),before);
});

test('QA-012/013: only the last animal leaving restores accelerated night and emits one end',()=>{
  const s=fixture();s.time=400;s.nightPlan={done:true,at:400};spawnRaid(s,{group:['warthog','lion']},nav);
  const [first,last]=s.raid.animals;first.status='gone';last.status='retreating';last.spawn={x:last.x+100,z:last.z};
  advanceReal(s,.02,nav);close(s.time,400.02);assert.ok(s.raid);
  assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,0);
  last.spawn={x:last.x,z:last.z};last.path=null;advanceReal(s,.02,nav);
  assert.equal(s.raid,null);close(s.time,400.04);
  advanceReal(s,.02,nav);close(s.time,400.14);
  assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});

test('QA-007/014: blocked real-time advances preserve every field until all pause causes clear',()=>{
  const s=fixture();pause(s,'menu');pause(s,'hidden');let before=JSON.stringify(s);
  advanceReal(s,1800,nav);assert.equal(JSON.stringify(s),before);
  resume(s,'hidden');before=JSON.stringify(s);advanceReal(s,1800,nav);assert.equal(JSON.stringify(s),before);
  resume(s,'menu');advanceReal(s,.02,nav);close(s.time,.02);close(s.elapsed,.02);
});
