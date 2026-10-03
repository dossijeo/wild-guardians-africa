import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid,reachableApproach} from '../src/simulation/raids.js';
import {Navigation} from '../src/world/navigation.js';
import {simulateOpening} from '../tools/check_opening.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

for(const culture of Game.CULTURES)test(`Manglares/${culture}: guaranteed second-night animal spawns, reloads and physically exits when the island has no reachable target`,()=>{
 let {state:s,nav}=simulateOpening('olderMale',1,{biome:'manglares',culture,seed:712});
 Game.hire(s,'night-two-zero-workers',{});Game.tick(s,300-s.time,nav);Game.tick(s,s.nightPlan.at-s.time,nav);
 assert.ok(s.raid);assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);assert.equal(s.raid.animals.length,1);
 const animal=s.raid.animals[0];assert.equal(animal.species,'warthog');assert.equal(reachableApproach(animal,s.structures[0],nav),null);
 assert.ok(nav.walkable(animal.x,animal.z,animal.radius,null,false));assert.ok(nav.segmentClear(animal,animal.exit,animal.radius,null,false));
 const born={x:animal.x,z:animal.z},exit={...animal.exit},hits=animal.hitsRemaining,centerHp=s.structures[0].hp;
 s=deserialize(serialize(s));nav.setState(s);assert.deepEqual(s.raid.animals[0].exit,exit);
 let moved=false,departed=null;
 for(let elapsed=0;s.raid&&elapsed<10;elapsed+=.05){
  const a=s.raid.animals[0],before={x:a.x,z:a.z};Game.tick(s,.05,nav);
  assert.ok(nav.segmentClear(before,a,a.radius,null,false));assert.equal(a.hitsRemaining,hits);
  moved||=Math.hypot(a.x-born.x,a.z-born.z)>.1;if(a.status==='gone')departed={x:a.x,z:a.z};
 }
 assert.equal(s.raid,null);assert.ok(moved);assert.ok(Math.hypot(departed.x-exit.x,departed.z-exit.z)<.25);
 assert.equal(s.structures[0].hp,centerHp);assert.equal(s.events.filter(e=>e.type==='StructureHit').length,0);
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});

function clearWorld(){
 const nav={placement:()=>({valid:true}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}],segmentClear:()=>true};
 const s=Game.newGame({seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);s.initialPreparation=false;s.time=400;s.nightPlan={done:true};return {s,nav};
}

test('entry searches the full active edge when only a distant corner admits the body and its exit',()=>{
 const {s,nav}=clearWorld();nav.walkable=(x,z)=>x>100&&z>80;spawnRaid(s,{group:['warthog']},nav);
 assert.ok(s.raid);const a=s.raid.animals[0];assert.ok(a.x>100&&a.z>80);assert.ok(nav.walkable(a.exit.x,a.exit.z));
});

test('a blocked entry-to-exit corridor cancels the entire group without allocating animals',()=>{
 const {s,nav}=clearWorld(),id=s.nextId;nav.segmentClear=()=>false;
 spawnRaid(s,{group:['warthog','buffalo']},nav);assert.equal(s.raid,null);assert.equal(s.nextId,id);
});

test('native reverse approach search preserves endpoints and swept collision on a real detour',()=>{
 const nav=new Navigation(712,'sabana',{});nav.terrainValid=()=>true;nav.propsAt=()=>[];
 nav.obstacles=[{id:'wall',footprint:[{x:-1,z:-2},{x:1,z:-2},{x:1,z:4},{x:-1,z:4}]}];
 const start={x:-8.4,z:1.2},end={x:8.2,z:2.3},radius=.9,route=nav.approachPath(start,end,radius);
 assert.ok(route?.length>1);assert.deepEqual(route.at(-1),end);
 for(let i=0;i<route.length;i++)assert.ok(nav.segmentClear(i?route[i-1]:start,route[i],radius,null,false));
 assert.ok(nav.path(start,end,radius,null,false));
});

test('legacy snapshots retain the original spawn as their exit; malformed new exit positions are rejected',()=>{
 const {s,nav}=clearWorld();spawnRaid(s,{group:['warthog']},nav);const a=s.raid.animals[0];
 const original=serialize(s);a.exit.x=NaN;assert.throws(()=>serialize(s),/Salida de animal/);
 const old=deserialize(original);delete old.raid.animals[0].exit;const loaded=deserialize(serialize(old)),animal=loaded.raid.animals[0];
 animal.status='retreating';animal.hitsRemaining=0;animal.x-=3;
 for(let elapsed=0;loaded.raid&&elapsed<10;elapsed+=.05)Game.tick(loaded,.05,nav);
 assert.equal(loaded.raid,null);assert.ok(Math.hypot(animal.x-animal.spawn.x,animal.z-animal.spawn.z)<.25);
});
