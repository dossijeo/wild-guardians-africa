import test from 'node:test';
import assert from 'node:assert/strict';
import {updateWorkerEncounters,pushWorker,sweptDistance} from '../src/simulation/encounters.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {LOCOMOTION as L} from '../src/simulation/locomotion-calibration.js';
import {updateRaid} from '../src/simulation/raids.js';
const nav={walkable:()=>true};
function fixture(){
  const s=Game.newGame({seed:712,slotId:'encounters'});s.pauses=[];
  s.people=[{id:'person-a',profile:'olderMale',recoveryUntil:0},{id:'person-b',profile:'olderMale',recoveryUntil:0}];
  const worker={id:'worker-a',personId:'person-a',profile:'olderMale',x:0,z:1,hits:0,status:'fleeing',incapacitated:false};
  const animal={id:'animal-a',species:'warthog',x:0,z:0,radius:.45,heading:0,hitsRemaining:4,status:'walking'};
  s.workers=[worker];s.raid={id:'raid',animals:[animal],encounters:[],reservations:{}};
  return {s,worker,animal};
}
test('A rejected frontal encounter rolls once, but later physical overlap makes the hit mandatory',()=>{
  const {s,worker,animal}=fixture();s.rng=123456789;
  updateWorkerEncounters(s,nav);assert.equal(worker.hits,0);const rng=s.rng;
  for(let i=0;i<100;i++)updateWorkerEncounters(s,nav);
  assert.equal(s.rng,rng);assert.equal(animal.hitsRemaining,4);
  worker.z=.3;updateWorkerEncounters(s,nav);
  assert.equal(worker.hits,1);assert.equal(animal.hitsRemaining,3);
  const event=s.events.at(-1);assert.ok(event.pushed>=1.5&&event.pushed<=2);
});
test('A non-overlapping passage behind the animal never rolls or spends a hit',()=>{
  const {s,worker,animal}=fixture();worker.z=-1;const rng=s.rng;
  updateWorkerEncounters(s,nav);assert.equal(s.rng,rng);assert.equal(worker.hits,0);assert.equal(animal.hitsRemaining,4);
});
test('One continuing encounter hits once; leaving and returning permits the second hit of the same animal',()=>{
  const {s,worker,animal}=fixture();updateWorkerEncounters(s,nav);
  assert.equal(worker.hits,1);assert.equal(worker.fallRemaining,L.sources.find(p=>p.profile===worker.profile).fallSeconds);
  for(let i=0;i<20;i++)updateWorkerEncounters(s,nav);
  assert.equal(worker.hits,1);assert.equal(animal.hitsRemaining,3);
  worker.z=5;updateWorkerEncounters(s,nav);worker.z=1;updateWorkerEncounters(s,nav);
  assert.equal(worker.hits,2);assert.equal(worker.incapacitated,true);assert.equal(worker.status,'incapacitated');
  assert.equal(animal.hitsRemaining,2);assert.equal(s.people[0].recoveryUntil,2);assert.equal(s.people[1].recoveryUntil,0);
  for(let i=0;i<20;i++)updateWorkerEncounters(s,nav);assert.equal(animal.hitsRemaining,2);
});
test('Saving inside a rejected encounter preserves its roll and resumes without frame-by-frame retries',()=>{
  const {s}=fixture();s.rng=123456789;updateWorkerEncounters(s,nav);
  const loaded=deserialize(serialize(s)),rng=loaded.rng;
  for(let i=0;i<20;i++)updateWorkerEncounters(loaded,nav);
  assert.equal(loaded.rng,rng);assert.equal(loaded.workers[0].hits,0);
});
test('Continuous relative trajectories detect an overlap even when both endpoints lie outside the encounter radius',()=>{
  const {s,worker,animal}=fixture();worker.x=2;worker.z=0;
  s.raid.encounterPositions={[animal.id]:{x:0,z:0},[worker.id]:{x:-2,z:0}};
  assert.equal(sweptDistance(animal,worker,{x:0,z:0},{x:-2,z:0}),0);
  updateWorkerEncounters(s,nav);assert.equal(worker.hits,1);assert.equal(animal.hitsRemaining,3);
});
test('Physical pushes check their whole path and turn along a wall instead of crossing it',()=>{
  const animal={x:0,z:0},worker={x:.2,z:0,path:[{x:10,z:0}]},samples=[];
  const obstacleNav={walkable:(x,z)=>{samples.push({x,z});return x<.6;}};
  const pushed=pushWorker(animal,worker,1.75,obstacleNav);
  assert.ok(Math.abs(pushed-1.75)<1e-12);assert.ok(worker.x<.6);assert.equal(worker.path,null);
  assert.ok(samples.some(p=>p.x>=.6),'The direct push should encounter the wall');
  assert.ok(Math.abs(Math.hypot(worker.x-.2,worker.z)-pushed)<1e-12);
});
test('A completely blocked push keeps the worker on valid terrain and does not jump to a valid far endpoint',()=>{
  const animal={x:0,z:0},worker={x:.2,z:0};
  const pushed=pushWorker(animal,worker,1.75,{walkable:(x,z)=>Math.hypot(x-.2,z)<.35||Math.hypot(x-.2,z)>1});
  assert.ok(pushed<=.3+1e-12);assert.ok(Math.hypot(worker.x-.2,worker.z)<=.3+1e-12);
});
test('Retreating animals and exhausted hit budgets cannot create a free worker hit',()=>{
  for(const [status,hitsRemaining] of [['retreating',4],['walking',0],['gone',4]]){
    const {s,worker,animal}=fixture();worker.z=.1;Object.assign(animal,{status,hitsRemaining});const rng=s.rng;
    updateWorkerEncounters(s,nav);assert.equal(worker.hits,0);assert.equal(s.rng,rng);assert.equal(animal.hitsRemaining,hitsRemaining);
  }
});
test('Recovery remains attached to the injured person during re-hiring and clears on the following day',()=>{
  const {s,worker}=fixture();s.people[0].recoveryUntil=2;s.raid=null;
  for(const [day,recovering] of [[2,true],[3,false]]){
    s.day=day;s.hiringPaidDay=null;s.pauses=['hiring'];Game.hire(s,'hire-'+day,{olderMale:2});
    const injured=s.workers.find(w=>w.personId===worker.personId),other=s.workers.find(w=>w.personId!==worker.personId);
    assert.equal(injured.recovering,recovering);assert.equal(other.recovering,false);
  }
});
test('Valid frontal encounters preserve the approved sixty-percent probability across a reproducible sample',()=>{
  let hits=0,rng=918271;
  for(let i=0;i<5000;i++){
    const {s,worker}=fixture();s.rng=rng;updateWorkerEncounters(s,nav);rng=s.rng;hits+=worker.hits;
  }
  assert.ok(hits/5000>.57&&hits/5000<.63,`Observed frontal hit fraction ${hits/5000}`);
});
test('Raid survivors return walking even with urgent tasks, and resume ordinary running only after arrival',()=>{
  const {s,worker,animal}=fixture();
  const world={placement:()=>({valid:true}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[b]};
  const raid=s.raid;s.raid=null;
  Game.placeStructure(s,'center',{x:20,z:0},world);const center=s.structures[0];
  for(let i=0;i<3;i++)Game.plant(s,'plant-'+i,'mijo',24+i*1.5,0,world);
  s.raid=raid;
  Object.assign(worker,{x:2,z:0,centerId:center.id,villageId:s.villages[0].id,runRemaining:50});
  s.initialPreparation=false;s.time=100;animal.status='gone';updateRaid(s,.1,world);
  assert.equal(s.raid,null);assert.equal(worker.status,'arriving');assert.equal(worker.raidReturn,true);
  Game.tick(s,1,world);assert.ok(Math.abs(worker.x-2.72)<1e-9);assert.equal(worker.runRemaining,50);assert.equal(worker.running,false);
  while(worker.status==='arriving')Game.tick(s,.1,world);
  assert.equal(worker.raidReturn,false);assert.equal(worker.runRemaining,50);
  Game.tick(s,.2,world);assert.ok(worker.runRemaining<50);assert.equal(worker.running,true);
});
