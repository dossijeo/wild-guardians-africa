import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid,reachableApproach} from '../src/simulation/raids.js';
import {Navigation} from '../src/world/navigation.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
function enterFirstNight(s,nav){
 const center=s.structures[0];let planted=false;
 for(let radius=5;radius<=12&&!planted;radius++)for(let i=0;i<16&&!planted;i++){
  const x=center.x+Math.sin(i*Math.PI/8)*radius,z=center.z+Math.cos(i*Math.PI/8)*radius;
  if(nav.placement(x,z,.4).valid){Game.plant(s,'first-seed','mijo',x,z,nav);planted=true;}
 }
 assert.ok(planted);Game.openInitialHiring(s);Game.hire(s,'first-night-zero-workers',{});Game.tick(s,300-s.time,nav);Game.tick(s,s.nightPlan.at-s.time,nav);
}

// A new platform connects different land than the archived island regression.
// Exercise actual entry, collision-safe movement, reload, hits and departure
// without assuming that the seed still has an unreachable center.
for(const terrainVersion of [undefined,'legacy'])for(const culture of Game.CULTURES)test(`Manglares/${culture}/${terrainVersion??'current'}: walkable water supports a complete first-night raid and saved navigation`,()=>{
 let {s,nav}=createOpeningWorld({biome:'manglares',culture,seed:712,terrainVersion});
 if(!terrainVersion){assert.equal(s.terrainVersion,'4.1.10.3');assert.ok(s.villages[0].terrainSite);}
 enterFirstNight(s,nav);
 assert.ok(s.raid);const born=s.raid.animals[0],exit={...born.exit};let last={x:born.x,z:born.z},departed=null;
 s=deserialize(serialize(s));nav.setState(s);assert.deepEqual(s.raid.animals[0].exit,exit);
 for(let elapsed=0;s.raid&&!s.result&&elapsed<250;elapsed+=.1){
   const animal=s.raid.animals[0];Game.tick(s,.1,nav);
   assert.ok(nav.segmentClear(last,animal,animal.radius,null,false),'movement must respect the padded native terrain');
   last={x:animal.x,z:animal.z};if(animal.status==='gone')departed={...last};
 }
 assert.equal(s.result,null);assert.equal(s.raid,null);assert.ok(departed);assert.ok(Math.hypot(departed.x-exit.x,departed.z-exit.z)<.25);
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

test('an unreachable target causes a physical retreat after reload without consuming hits',()=>{
 const {s,nav}=clearWorld();
 // An explicit unreachable target keeps this lifecycle regression independent
 // of whether a particular biome's water happens to block movement.
 nav.path=(start,end)=>Math.hypot(end.x,end.z)<20?null:[{x:end.x,z:end.z}];
 spawnRaid(s,{group:['warthog']},nav);
 assert(s.raid);const born=s.raid.animals[0],exit={...born.exit};
 assert.equal(reachableApproach(born,s.structures[0],nav),null);
 const hits=born.hitsRemaining,hp=s.structures[0].hp;
 const loaded=deserialize(serialize(s));nav.setState(loaded);
 let departed=null,moved=false;
 for(let elapsed=0;loaded.raid&&elapsed<10;elapsed+=.05){
  const animal=loaded.raid.animals[0],before={x:animal.x,z:animal.z};
  Game.tick(loaded,.05,nav);
  assert(nav.segmentClear(before,animal,animal.radius,null,false));
  assert.equal(animal.hitsRemaining,hits);
  moved||=Math.hypot(animal.x-born.x,animal.z-born.z)>.1;
  if(animal.status==='gone')departed={x:animal.x,z:animal.z};
 }
 assert.equal(loaded.raid,null);assert(moved);assert(departed);
 assert(Math.hypot(departed.x-exit.x,departed.z-exit.z)<.25);
 assert.equal(loaded.structures[0].hp,hp);
 assert.equal(loaded.events.filter(e=>e.type==='StructureHit').length,0);
 assert.equal(loaded.events.filter(e=>e.type==='RaidEnded').length,1);
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
