import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {animalPose} from '../src/rendering/animal-actions.js';
import {edgeDistance} from '../src/world/footprints.js';
import {sweptDistance} from '../src/simulation/encounters.js';
const species=['warthog','hyena','buffalo','lion','rhino'];
function navigation(s){const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-48,-48,48,48];n.setState(s);return n;}
function fixture(id,culture){const s=Game.newGame({seed:712,culture,slotId:`motion-${id}-${culture}`});Game.resume(s,'intro');s.ledger.balance=rational(10000);const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'crop','mijo',8,4,nav);s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';s.time=400;s.dayPlan={done:true};s.nightPlan={done:true};spawnRaid(s,{group:[id]},nav);assert.ok(s.raid);return {s,nav,a:s.raid.animals[0]};}
function saved(s){const map=new Map(),r=new SaveRepository({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});r.save(s);return r.load(s.slotId);}
function until(s,nav,predicate){for(let i=0;!predicate()&&s.raid&&i<3000;i++)Game.tick(s,.05,nav);assert.ok(predicate());}
for(const culture of Game.CULTURES)for(const id of species)test(`QA-098: ${culture}/${id} actual approach and exit use calibrated speed and native gaits`,()=>{
 const {s,nav,a}=fixture(id,culture),samples={entering:0,walking:0,retreating:0},calibrated={entering:0,walking:0,retreating:0};let steps=0;
 while(s.raid&&steps++<3000){
  const status=a.status,mode=status==='walking'&&a.hitsRemaining<=0?'retreating':status,p={x:a.x,z:a.z},phase=a.motionPhase??0;
  if(Object.hasOwn(samples,status))assert.equal(animalPose(a,s.elapsed).name,status==='walking'?'Walking':'Running');
  Game.tick(s,.05,nav);
  if(Object.hasOwn(samples,mode)){
   const speed=mode==='walking'?1.5:3.8,moved=Math.hypot(a.x-p.x,a.z-p.z),dt=(a.motionPhase??0)-phase;
   assert.ok(moved<=speed*.05+1e-8);assert.ok(dt>=-1e-8&&dt<=.05+1e-8);assert.ok(moved<=speed*dt+1e-8);
   if(moved>0)samples[mode]++;if(Math.abs(moved-speed*.05)<1e-8)calibrated[mode]++;assert.ok(nav.segmentClear(p,a,a.radius,null,false));
  }
 }
 assert.equal(s.raid,null);for(const count of [...Object.values(samples),...Object.values(calibrated)])assert.ok(count>=2);assert.equal(a.status,'gone');assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});
for(const culture of Game.CULTURES)test(`QA-100: ${culture} actual last worker hit exhausts the budget and the saved exit keeps physical separation`,()=>{
 const s=Game.newGame({seed:21,culture,slotId:'last-hit-'+culture});Game.resume(s,'intro');s.ledger.balance=rational(10000);const nav=navigation(s);nav.activeBounds=[-24,-24,24,24];
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'crop','mijo',20,0,nav);s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';Game.pause(s,'hiring');Game.hire(s,'hire',{olderFemale:1});s.dayPlan={done:true};s.nightPlan={done:true};
 for(let i=0;s.workers[0].status!=='acting'&&i<2000;i++)Game.tick(s,.05,nav);assert.equal(s.workers[0].status,'acting');spawnRaid(s,{group:['warthog']},nav);const a=s.raid.animals[0],w=s.workers[0];assert.equal(a.hitsRemaining,2);
 until(s,nav,()=>a.hitsRemaining===0);assert.equal(w.hits,2);assert.equal(w.incapacitated,true);assert.equal(a.status,'attacking');assert.ok(a.attackRemaining>0);
 const loaded=saved(s),fresh=navigation(loaded);fresh.activeBounds=[-24,-24,24,24];let steps=0,retreatFrames=0;
 while((s.raid||loaded.raid)&&steps++<3000){
  const pa={x:a.x,z:a.z},pw={x:w.x,z:w.z};Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));
  assert.equal(a.hitsRemaining,0);assert.equal(w.hits,2);assert.ok(sweptDistance(a,w,pa,pw)>=a.radius+.28-1e-8);
  if(a.status==='retreating'){assert.equal(animalPose(a,s.elapsed).name,'Running');retreatFrames++;}
 }
 assert.equal(s.raid,null);assert.equal(loaded.raid,null);assert.ok(retreatFrames>2);assert.equal(s.plants[0].alive,true);
 assert.equal(s.events.filter(e=>['AnimalLogicalHit','AnimalLogicalMiss','CropDestroyed','StructureHit'].includes(e.type)).length,0);
 assert.equal(s.events.filter(e=>e.type==='WorkerHit').length,1);assert.equal(s.events.filter(e=>e.type==='WorkerIncapacitated').length,1);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
});
for(const culture of Game.CULTURES)for(const id of species)test(`QA-101: ${culture}/${id} legal Shield stops the native body at its border and consumes one protected hit after reload`,()=>{
 const {s,nav,a}=fixture(id,culture),crop=s.plants[0],radius=Game.spellRadius('shield');
 until(s,nav,()=>Math.hypot(a.x-crop.x,a.z-crop.z)<radius+a.radius+5);assert.notEqual(a.status,'attacking');
 const budget=a.hitsRemaining;Game.cast(s,'shield','shield',crop.x,crop.z,nav);const shield=s.spells[0];
 assert.equal(shield.remaining,20);assert.equal(s.cooldowns.shield,90);
 for(let i=0;a.status!=='attacking'&&i<500;i++){const before={x:a.x,z:a.z};Game.tick(s,.05,nav);assert.ok(edgeDistance(before,a,shield.x,shield.z)>=radius+a.radius-1e-8);assert.ok(nav.segmentClear(before,a,a.radius,null,false));}
 assert.equal(a.status,'attacking');assert.equal(a.approachShieldId,shield.id);assert.ok(Math.hypot(a.x-shield.x,a.z-shield.z)>=radius+a.radius+.1-1e-8);
 const loaded=saved(s),fresh=navigation(loaded);assert.equal(serialize(loaded),serialize(s));
 Game.pause(loaded,'qa');const frozen=serialize(loaded);Game.tick(loaded,30,fresh);assert.equal(serialize(loaded),frozen);Game.resume(loaded,'qa');
 let steps=0;
 while(!s.events.some(e=>e.type==='AnimalLogicalHit')&&steps++<500){
  const before={x:a.x,z:a.z};Game.tick(s,.05,nav);Game.tick(loaded,.05,fresh);assert.equal(serialize(loaded),serialize(s));
  assert.ok(Math.hypot(a.x-shield.x,a.z-shield.z)>=radius+a.radius+.1-1e-8);assert.ok(nav.segmentClear(before,a,a.radius,null,false));
 }
 const hit=s.events.find(e=>e.type==='AnimalLogicalHit');assert.ok(hit);assert.equal(hit.presentation.shield.id,shield.id);assert.equal(a.hitsRemaining,budget-1);assert.equal(s.spells[0].id,shield.id);assert.ok(shield.remaining>0);
 assert.equal(crop.alive,true);assert.equal(s.structures[0].hp,s.structures[0].maxHp);assert.equal(s.events.filter(e=>['CropDestroyed','StructureHit'].includes(e.type)).length,0);
 assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,1);assert.deepEqual(animalPose(loaded.raid.animals[0],loaded.elapsed),animalPose(a,s.elapsed));
});
