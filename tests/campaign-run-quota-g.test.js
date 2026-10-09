import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {BALANCE as B} from '../src/simulation/balance.js';
import {LOCOMOTION as L} from '../src/simulation/locomotion-calibration.js';
import {dailyRunMetres,moveWorker} from '../src/simulation/locomotion.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';
const baseline='83b1c1eaa0235f9a9b34966f88b496f42eeb161b';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const actor=()=>({x:0,z:0,path:[{x:1000,z:0}],runRemaining:dailyRunMetres(),profile:'olderFemale',status:'walking'});

test('G changes only the canonical daily running quota relative to frozen F',()=>{
  const old=JSON.parse(execFileSync('git',['show',`${baseline}:content/balance/balance_confirmado.json`],{encoding:'utf8'}));
  const current=JSON.parse(readFileSync(new URL('../content/balance/balance_confirmado.json',import.meta.url),'utf8'));
  assert.equal(old.workers.daily_run_distance_long_trips,3);
  assert.equal(current.workers.daily_run_distance_long_trips,4);
  old.workers.daily_run_distance_long_trips=4;assert.deepEqual(current,old);
  const prior=execFileSync('git',['show',`${baseline}:src/simulation/balance.js`],{encoding:'utf8'});
  const expected=JSON.parse(prior.slice(prior.indexOf('= ')+2).trim().replace(/;$/,''));
  expected.workers.daily_run_distance_long_trips=4;assert.deepEqual(B,expected);
  near(dailyRunMetres(),4*L.longTripMetres);
});

test('The native four-trip quota exhausts exactly and subsequent urgent movement walks',()=>{
  const w=actor(),quota=dailyRunMetres(),seconds=quota/2.4;
  moveWorker(w,seconds,{urgent:true});near(w.x,quota);assert.equal(w.runRemaining,0);assert.equal(w.running,true);
  moveWorker(w,1,{urgent:true});near(w.x,quota+1.08);assert.equal(w.running,false);assert.equal(w.runRemaining,0);
  const mixed=actor();moveWorker(mixed,seconds+.5,{urgent:true});near(mixed.x,quota+.54);assert.equal(mixed.running,false);assert.equal(mixed.runRemaining,0);
});

test('Flight bypasses an exhausted quota without replenishing it; carrying never runs',()=>{
  const w=actor();w.runRemaining=0;moveWorker(w,1,{flight:true});near(w.x,2.4);assert.equal(w.running,true);assert.equal(w.runRemaining,0);
  const carrying=actor();moveWorker(carrying,2,{urgent:true,flight:true,carrying:true});near(carrying.x,2.16);
  assert.equal(carrying.running,false);near(carrying.runRemaining,dailyRunMetres());near(carrying.carryPhase,3);
});

test('A genuinely hired worker preserves consumed four-trip quota through pause and save restoration',()=>{
  const nav={placement:()=>({valid:true}),setState:()=>{},path:(_a,b)=>[b]};
  const s=Game.newGame({seed:712,slotId:'quota-g'});Game.resume(s,'intro');
  Game.placeStructure(s,'center',{x:20,z:0},nav);Game.plant(s,'crop','mijo',24,0,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});assert.equal(s.workers.length,1);
  const w=s.workers[0];near(w.runRemaining,dailyRunMetres());w.path=[{x:w.x+1000,z:w.z}];
  moveWorker(w,3,{urgent:true});const remaining=dailyRunMetres()-7.2;near(w.runRemaining,remaining);
  Game.pause(s,'manual');Game.tick(s,120,nav);near(w.runRemaining,remaining);
  const restored=deserialize(serialize(s));near(restored.workers[0].runRemaining,remaining);
  assert.equal(Game.hire(restored,'duplicate',{olderFemale:1}),false);near(restored.workers[0].runRemaining,remaining);
  const before=restored.workers[0].x;moveWorker(restored.workers[0],1,{urgent:true});near(restored.workers[0].x,before+2.4);near(restored.workers[0].runRemaining,remaining-2.4);
});
