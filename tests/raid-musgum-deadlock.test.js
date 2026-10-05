import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tick} from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';

test('recorded day-32 Musgum incursion physically finishes on native terrain after reload',()=>{
 const state=deserialize(readFileSync(new URL('../docs/qa/raid-musgum-deadlock/state-before.json',import.meta.url),'utf8'));
 const pack=JSON.parse(readFileSync(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
 const nav=new Navigation(state.seed,state.biome,pack.profile);nav.setState(state);
 const original=state.raid.animals.map(actor=>({id:actor.id,exit:{...actor.exit},start:{x:actor.x,z:actor.z}}));
 assert.equal(state.day,32);assert.equal(state.raid.animals.length,5);
 const beforeEnded=state.events.filter(event=>event.type==='RaidEnded').length;
 let moved=false,seconds=0;
 for(;state.raid&&!state.result&&seconds<240;seconds+=.1){
  const actors=state.raid.animals,before=actors.map(actor=>({x:actor.x,z:actor.z}));
  tick(state,.1,nav);
  for(let i=0;i<actors.length;i++){
   const actor=actors[i],travel=Math.hypot(actor.x-before[i].x,actor.z-before[i].z);
   moved||=travel>1e-8;assert.ok(travel<=.38+1e-8,'No teleport or speed increase');
   assert.ok(nav.segmentClear(before[i],actor,actor.radius,null,false),'Native terrain and buildings remain solid');
  }
  const present=actors.filter(actor=>actor.status!=='gone');
  for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++)assert.ok(Math.hypot(present[i].x-present[j].x,present[i].z-present[j].z)>=present[i].radius+present[j].radius-1e-8,'Native bodies remain disjoint');
  for(const actor of actors.filter(actor=>actor.status==='gone')){
   const saved=original.find(row=>row.id===actor.id);
   assert.ok(Math.hypot(actor.x-saved.exit.x,actor.z-saved.exit.z)<1e-8,'Every animal walks to its original exit');
  }
 }
 assert.ok(moved);assert.equal(state.result,null);assert.equal(state.raid,null);
 assert.equal(state.events.filter(event=>event.type==='RaidEnded').length,beforeEnded+1);
 assert.equal(state.day,33);assert.deepEqual(state.pauses,['hiring']);
 assert.equal(serialize(deserialize(serialize(state))),serialize(state));
});
