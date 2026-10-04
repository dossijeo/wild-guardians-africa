import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {planNight,spawnRaid} from '../src/simulation/raids.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const species=['warthog','hyena','buffalo','lion','rhino'];
function navigation(s){const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-48,-48,48,48];n.setState(s);return n;}
function until(s,nav,check){for(let i=0;!check()&&i<6000&&!s.pauses.length;i++)Game.tick(s,.05,nav);assert.ok(check());}
test('all 100 campaign nights have animals even with no crops, for 30 seeds',()=>{
 for(let seed=1;seed<=30;seed++){
  const s=Game.newGame({seed});
  for(let day=1;day<=100;day++){s.day=day;planNight(s);assert.ok(s.nightPlan.group.length>=1&&s.nightPlan.group.length<=5);if(day<=5)assert.deepEqual(s.nightPlan.group,[species[day-1]]);}
  s.postgame=true;planNight(s);assert.deepEqual(s.nightPlan.group,[]);
 }
});
test('five introductory nights spawn their planned new species with a progressive real strike budget, including saved plans',()=>{
 for(let day=1;day<=5;day++){
  let s=Game.newGame({slotId:'intro-'+day});Game.resume(s,'intro');const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);
  s.day=day;s.time=320;s.initialPreparation=false;s.dayPlan={done:true};planNight(s);s=deserialize(serialize(s));nav.setState(s);
  spawnRaid(s,s.nightPlan,nav);assert.deepEqual(s.raid.animals.map(a=>a.species),[species[day-1]]);assert.equal(s.raid.animals[0].hitsRemaining,[2,3,4,4,5][day-1]);
 }
});
for(const id of species)test(`${id}: first physical crop hit survives reload; second hit destroys exactly once`,()=>{
 let s=Game.newGame({slotId:'two-hits-'+id});Game.resume(s,'intro');let nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);
 s.day=6;s.time=320;s.initialPreparation=false;s.dayPlan={done:true};s.nightPlan={done:true};spawnRaid(s,{group:[id]},nav);
 until(s,nav,()=>s.plants[0].attackHits===1);assert.equal(s.plants[0].alive,true);assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,0);
 s=deserialize(serialize(s));nav=navigation(s);until(s,nav,()=>!s.plants[0].alive);
 assert.equal(s.plants[0].attackHits,2);assert.equal(s.events.filter(e=>e.type==='CropHit').length,2);assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,1);
});
test('saved damage cannot be fractional, exceed two strikes or leave a living crop with two strikes',()=>{
 const s=Game.newGame();Game.resume(s,'intro');const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'seed','mijo',8,4,nav);
 for(const hits of [-1,.5,3,2]){s.plants[0].attackHits=hits;assert.throws(()=>serialize(s));}s.plants[0].attackHits=1;assert.doesNotThrow(()=>serialize(s));
});

for(const [index,id] of species.entries())for(const count of [1,2,5,10,20,50])test(`introductory ${id} threatens crops and buildings but cannot destroy all ${count} starting plants`,()=>{
 const s=Game.newGame({slotId:'intro-quota-'+count});Game.resume(s,'intro');const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);
 for(let i=0;i<count;i++)Game.plant(s,'seed-'+i,'mijo',8+(i%5)*2,4+Math.floor(i/5)*2,nav);
 s.day=index+1;s.time=320;s.initialPreparation=false;s.dayPlan={done:true};planNight(s);s.nightPlan.done=true;spawnRaid(s,s.nightPlan,nav);
 const raid=s.raid,budget=[2,3,4,4,5][index];assert.equal(raid.animals[0].hitsRemaining,budget);const initial=serialize(s),restored=deserialize(initial),fresh=navigation(restored);
 until(s,nav,()=>!s.raid);until(restored,fresh,()=>!restored.raid);
 assert.equal(serialize(restored),serialize(s));assert.ok(s.plants.some(p=>p.alive));
 const lost=s.plants.filter(p=>!p.alive).length;assert.ok(lost<=Math.min(count-1,Math.ceil(count*.2)));assert.equal(raid.introCropsDestroyed,lost);
 if(count>1)assert.ok(lost>0,'an unshielded introductory animal can destroy a plant');
 assert.equal(raid.animals[0].hitsRemaining,0);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,budget);
});

for(const [index,id] of species.entries())test(`introductory ${id}: damaged crops respect the destruction quota after a mid-attack save`,()=>{
 let s=Game.newGame({slotId:'damaged-intro-'+id});Game.resume(s,'intro');let nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);
 for(let i=0;i<10;i++){Game.plant(s,'seed-'+i,'mijo',8+(i%5)*2,4+Math.floor(i/5)*2,nav);s.plants.at(-1).attackHits=1;}
 s.day=index+1;s.time=320;s.initialPreparation=false;s.dayPlan={done:true};planNight(s);s.nightPlan.done=true;spawnRaid(s,s.nightPlan,nav);
 until(s,nav,()=>s.raid.introCropsDestroyed===1);
 const restored=deserialize(serialize(s)),fresh=navigation(restored);
 assert.equal(restored.raid.introCropsDestroyed,1);assert.equal(restored.raid.introCropLimit,2);
 until(s,nav,()=>!s.raid);until(restored,fresh,()=>!restored.raid);
 assert.equal(serialize(restored),serialize(s));
 assert.equal(s.plants.filter(p=>!p.alive).length,2);
 assert.equal(s.plants.filter(p=>p.alive).length,8);
 assert.equal(s.events.filter(e=>e.type==='CropDestroyed').length,2);
});
